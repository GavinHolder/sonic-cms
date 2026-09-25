/**
 * SSRF-guarded outbound webhook POST (used by /api/forms/submit).
 *
 * The webhook URL is an admin-configured value (see lib/form-routing.ts), but it is still fetched
 * through this guard so a compromised/low-privilege editor account or a stale DNS record cannot
 * point the server at internal services (Traefik :8080, Portainer :9000, docker/LAN hosts,
 * cloud metadata 169.254.169.254, loopback).
 *
 * ASSUMPTIONS:
 *   1. The caller has already restricted the URL to a configured value (allowlist); this module is
 *      defence in depth and never widens what is reachable.
 *   2. Node's WHATWG URL parser canonicalises IPv4 spellings (decimal 2130706433, hex 0x7f000001,
 *      octal 017700000001, short 127.1) to dotted quads and IPv6 to compressed hextets.
 *
 * FAILURE MODES / MITIGATIONS:
 *   - Internal/private target in URL literal  -> rejected before any DNS or socket work.
 *   - Hostname resolving (even partly) to a non-public address -> rejected (ALL answers checked).
 *   - DNS rebinding (resolve public, connect private) -> the socket is pinned to the address we
 *     validated via a custom `lookup`; there is no second resolution. TLS SNI + certificate check
 *     still use the hostname.
 *   - Redirect to an internal host -> redirects are NEVER followed (a 3xx counts as failure).
 *   - Slowloris / huge response -> total timeout (TIMEOUT_MS) and body read cap (MAX_RESPONSE_BYTES).
 *   - Cookie/auth leakage -> only Content-Type/Content-Length/User-Agent/Accept are sent.
 *
 * Only ports 80/443/8443 are allowed (Traefik's dashboard :8080 and Portainer :9000 stay out of reach
 * even if one of our own public addresses were named). Plain http is allowed only when explicitly
 * enabled by the caller and is logged as a warning.
 */

import { isIP } from 'node:net'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'

export class WebhookBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebhookBlockedError'
  }
}

export const WEBHOOK_TIMEOUT_MS = 8_000
export const WEBHOOK_MAX_RESPONSE_BYTES = 64 * 1024
const ALLOWED_PORTS = new Set([80, 443, 8443])

// ── IP classification ────────────────────────────────────────────────────────

function parseIPv4(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s)
  if (!m) return null
  const o = m.slice(1).map(Number)
  return o.every((n) => n >= 0 && n <= 255) ? o : null
}

function isBlockedIPv4(o: number[]): boolean {
  const [a, b, c] = o
  if (a === 0) return true // 0.0.0.0/8 ("this network", 0.0.0.0)
  if (a === 10) return true // private
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64/10
  if (a === 127) return true // loopback
  if (a === 169 && b === 254) return true // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true // private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true // IETF protocol / TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true // 6to4 relay anycast
  if (a === 192 && b === 168) return true // private
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a === 198 && b === 51 && c === 100) return true // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true // TEST-NET-3
  if (a >= 224) return true // multicast, reserved, broadcast
  return false
}

function parseIPv6(input: string): number[] | null {
  let s = input.toLowerCase()
  const zone = s.indexOf('%')
  if (zone !== -1) s = s.slice(0, zone)
  if (isIP(s) !== 6) return null
  const lastColon = s.lastIndexOf(':')
  const tail = s.slice(lastColon + 1)
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail)
    if (!v4) return null
    s = `${s.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null
  const parts = [...head, ...Array<string>(fill).fill('0'), ...rest].map((h) => parseInt(h, 16))
  return parts.length === 8 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff) ? parts : null
}

function isBlockedIPv6(h: number[]): boolean {
  // Allow-list, not deny-list: only global unicast 2000::/3 can ever be a public target. This alone
  // rejects ::, ::1, ::ffff:0:0/96 (IPv4-mapped), 64:ff9b::/96 (NAT64), fc00::/7 (ULA),
  // fe80::/10 (link-local), fec0::/10 and ff00::/8 (multicast).
  if ((h[0] & 0xe000) !== 0x2000) return true
  if (h[0] === 0x2001 && (h[1] & 0xfe00) === 0) return true // 2001::/23 (IETF, Teredo, ORCHID)
  if (h[0] === 0x2001 && h[1] === 0x0db8) return true // documentation
  if (h[0] === 0x2002) return isBlockedIPv4([h[1] >> 8, h[1] & 0xff, h[2] >> 8, h[2] & 0xff]) // 6to4 embeds an IPv4
  if (h[0] === 0x3fff && (h[1] & 0xf000) === 0) return true // 3fff::/20 documentation
  return false
}

/** True when the address is not a public unicast address. Unparseable input is treated as blocked. */
export function isBlockedIp(ip: string): boolean {
  const s = ip.trim().replace(/^\[|\]$/g, '')
  const v4 = parseIPv4(s)
  if (v4) return isBlockedIPv4(v4)
  const v6 = parseIPv6(s)
  return v6 ? isBlockedIPv6(v6) : true
}

// ── URL validation + DNS pinning ─────────────────────────────────────────────

export interface ResolvedAddress {
  address: string
  family: 4 | 6
}
export type LookupAll = (hostname: string) => Promise<ResolvedAddress[]>

const defaultLookup: LookupAll = async (hostname) => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new WebhookBlockedError('DNS lookup timed out')), WEBHOOK_TIMEOUT_MS).unref?.()
  )
  const res = await Promise.race([dns.promises.lookup(hostname, { all: true, verbatim: true }), timeout])
  return res.map((r) => ({ address: r.address, family: r.family === 6 ? 6 : 4 }))
}

export interface CheckedTarget extends ResolvedAddress {
  url: URL
}

/**
 * Validate a webhook URL and resolve it to ONE public address to pin the connection to.
 * Throws WebhookBlockedError for anything not safely public.
 */
export async function checkWebhookUrl(
  raw: string,
  opts: { allowHttp?: boolean; lookup?: LookupAll } = {}
): Promise<CheckedTarget> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new WebhookBlockedError('invalid URL')
  }
  const isHttps = url.protocol === 'https:'
  if (!isHttps && !(opts.allowHttp && url.protocol === 'http:')) throw new WebhookBlockedError('scheme not allowed')
  if (url.username || url.password) throw new WebhookBlockedError('credentials in URL not allowed')
  const port = url.port ? Number(url.port) : isHttps ? 443 : 80
  if (!ALLOWED_PORTS.has(port)) throw new WebhookBlockedError('port not allowed')

  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
  const literal = isIP(host)
  if (!literal) {
    // Names that never legitimately identify a public webhook receiver (docker service names, mDNS, split-horizon).
    if (!host.includes('.') || host === 'localhost' || /\.(localhost|local|internal|lan|home|corp|intranet)$/.test(host)) {
      throw new WebhookBlockedError('internal hostname')
    }
  }

  const addrs: ResolvedAddress[] = literal
    ? [{ address: host, family: literal === 6 ? 6 : 4 }]
    : await (opts.lookup ?? defaultLookup)(host)
  if (addrs.length === 0) throw new WebhookBlockedError('host did not resolve')
  // Reject if ANY answer is non-public: a round-robin answer must not smuggle in an internal address.
  if (addrs.some((a) => isBlockedIp(a.address))) throw new WebhookBlockedError('host resolves to a non-public address')

  if (!isHttps) console.warn('[safe-webhook] plain-http webhook target (flagged): traffic is unencrypted')
  return { url, address: addrs[0].address, family: addrs[0].family }
}

// ── Transport ────────────────────────────────────────────────────────────────

export interface PinnedRequest {
  url: URL
  address: string
  family: 4 | 6
  body: string
  timeoutMs?: number
  maxBytes?: number
}
export type SendPinned = (req: PinnedRequest) => Promise<{ status: number }>

/** POST `body` to url, connecting ONLY to `address`. No redirects, capped body read, total timeout. */
export const sendPinned: SendPinned = ({ url, address, family, body, timeoutMs = WEBHOOK_TIMEOUT_MS, maxBytes = WEBHOOK_MAX_RESPONSE_BYTES }) =>
  new Promise((resolve, reject) => {
    let settled = false
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(
      {
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        agent: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'cms-form-webhook/1',
          Accept: '*/*',
        },
        // Pin to the validated address (defeats DNS rebinding). Node may ask for one address or all.
        lookup: ((_h: string, options: { all?: boolean }, cb: (...a: unknown[]) => void) =>
          options?.all ? cb(null, [{ address, family }]) : cb(null, address, family)) as never,
      },
      (res) => {
        const status = res.statusCode ?? 0
        let received = 0
        res.on('data', (chunk: Buffer) => {
          received += chunk.length
          if (received > maxBytes) res.destroy()
        })
        res.on('end', () => done(() => resolve({ status })))
        res.on('close', () => done(() => resolve({ status })))
        res.on('error', () => done(() => resolve({ status })))
      }
    )
    const timer = setTimeout(() => req.destroy(new Error('Webhook timed out')), timeoutMs)
    req.on('error', (err) => done(() => reject(err)))
    req.end(body)
  })

export interface WebhookDeps {
  lookup?: LookupAll
  send?: SendPinned
}

/** Validate, pin and POST. Resolves on any 2xx; throws WebhookBlockedError (guard) or Error (delivery). */
export async function postWebhook(rawUrl: string, payload: unknown, deps: WebhookDeps = {}): Promise<{ status: number }> {
  const target = await checkWebhookUrl(rawUrl, { allowHttp: true, lookup: deps.lookup })
  const res = await (deps.send ?? sendPinned)({
    url: target.url,
    address: target.address,
    family: target.family,
    body: JSON.stringify(payload),
  })
  if (res.status < 200 || res.status >= 300) throw new Error(`Webhook responded with ${res.status}`)
  return res
}
