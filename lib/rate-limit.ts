/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window counter per IP address.
 * For single-instance deployments (no Redis needed).
 */

import { isIP } from 'node:net'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/** Hard cap so a flood of distinct keys (e.g. rotating IPv6) can never grow the map without bound. */
const MAX_STORE_KEYS = 50_000

function sweepExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

// Clean expired entries every 5 minutes (the store is per-process and resets on restart)
setInterval(() => sweepExpired(Date.now()), 5 * 60 * 1000)

interface RateLimitConfig {
  /** Max requests per window */
  max: number
  /** Window duration in seconds */
  windowSec: number
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  login:   { max: 5,   windowSec: 60 },   // 5 attempts per minute
  api:     { max: 100, windowSec: 60 },   // 100 requests per minute
  upload:  { max: 10,  windowSec: 60 },   // 10 uploads per minute
  otp:     { max: 3,   windowSec: 600 },  // 3 OTP sends per 10 minutes
  // Public form endpoints (/api/forms/submit, /api/contact): 5 submissions per 10 minutes per IP per endpoint.
  // Override at runtime with FORM_RATE_LIMIT_MAX / FORM_RATE_LIMIT_WINDOW_SEC (positive integers).
  form:    { max: 5,   windowSec: 600 },
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function resolveConfig(name: keyof typeof DEFAULTS): RateLimitConfig {
  const base = DEFAULTS[name] ?? DEFAULTS.api
  if (name !== 'form') return base
  return {
    max: positiveInt(process.env.FORM_RATE_LIMIT_MAX, base.max),
    windowSec: positiveInt(process.env.FORM_RATE_LIMIT_WINDOW_SEC, base.windowSec),
  }
}

/**
 * Check rate limit for a given key (e.g., IP address + route).
 * Returns { allowed: true } or { allowed: false, retryAfterSec }.
 */
export function checkRateLimit(
  identifier: string,
  configName: keyof typeof DEFAULTS = 'api'
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  // Disable rate limiting in test environment
  if (process.env.NODE_ENV === 'test') return { allowed: true }
  const config = resolveConfig(configName)
  const key = `${configName}:${identifier}`
  const now = Date.now()

  const entry = store.get(key)
  if (!entry || entry.resetAt < now) {
    if (store.size >= MAX_STORE_KEYS) {
      sweepExpired(now)
      // Still full of live entries: drop the oldest-inserted one (Map iterates in insertion order).
      if (store.size >= MAX_STORE_KEYS) store.delete(store.keys().next().value as string)
    }
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 })
    return { allowed: true }
  }

  if (entry.count >= config.max) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  entry.count++
  return { allowed: true }
}

/**
 * Normalise one address token taken from a proxy header.
 * Handles "1.2.3.4", "1.2.3.4:5678", "[::1]:443", bare IPv6, IPv6 zone ids and IPv4-mapped IPv6
 * ("::ffff:1.2.3.4" -> "1.2.3.4"). Returns null when the token is not a valid IP address.
 */
export function normalizeIp(raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  if (s.startsWith('[')) {
    const end = s.indexOf(']')
    if (end === -1) return null
    s = s.slice(1, end)
  } else if (s.indexOf(':') !== -1 && s.indexOf(':') === s.lastIndexOf(':')) {
    s = s.slice(0, s.indexOf(':')) // IPv4 with a port
  }
  const zone = s.indexOf('%')
  if (zone !== -1) s = s.slice(0, zone)
  const kind = isIP(s)
  if (kind === 4) return s
  if (kind !== 6) return null
  const lower = s.toLowerCase()
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower)
  if (mapped && isIP(mapped[1]) === 4) return mapped[1]
  try {
    return new URL(`http://[${lower}]`).hostname.slice(1, -1) // canonical compressed form
  } catch {
    return null
  }
}

/**
 * Resolve the client IP, or null when it cannot be determined.
 *
 * TRUST MODEL: the site runs behind Traefik, which appends the address of the connection it
 * accepted to X-Forwarded-For (and, with no trustedIPs configured, discards any client-supplied
 * X-Forwarded-* first). So the LAST entry is the one our proxy wrote; earlier entries are
 * client-controlled and are never used. If the last entry is not a valid IP we fall back to
 * X-Real-IP, and never to an earlier XFF entry.
 */
export function resolveClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const entries = forwarded.split(',').map((e) => e.trim()).filter(Boolean)
    const last = entries[entries.length - 1]
    const ip = last ? normalizeIp(last) : null
    if (ip) return ip
  }
  const real = request.headers.get('x-real-ip')
  return real ? normalizeIp(real) : null
}

/**
 * Get IP address from request headers (handles proxies). Falls back to 127.0.0.1 when unknown;
 * callers that must not share a bucket across visitors should use resolveClientIp instead.
 */
export function getClientIp(request: Request): string {
  return resolveClientIp(request) ?? '127.0.0.1'
}
