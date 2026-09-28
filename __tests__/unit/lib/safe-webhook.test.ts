import { describe, it, expect, vi } from 'vitest'
import {
  isBlockedIp,
  checkWebhookUrl,
  postWebhook,
  WebhookBlockedError,
  type LookupAll,
} from '@/lib/safe-webhook'

// A `lookup` stub factory: resolves a hostname to one or more addresses, or throws NXDOMAIN-style
// for anything not in the map — mirrors what dns.promises.lookup would do for an unmapped name.
function stubLookup(map: Record<string, { address: string; family: 4 | 6 }[]>): LookupAll {
  return async (hostname: string) => {
    const hit = map[hostname]
    if (!hit) throw new Error(`ENOTFOUND ${hostname}`)
    return hit
  }
}

describe('isBlockedIp — classification table', () => {
  const blocked = [
    ['127.0.0.1', 'loopback'],
    ['127.255.255.255', 'loopback range'],
    ['0.0.0.0', 'this-network'],
    ['10.0.0.1', 'RFC1918 10/8'],
    ['10.255.255.255', 'RFC1918 10/8 edge'],
    ['100.64.0.1', 'CGNAT 100.64/10'],
    ['100.127.255.255', 'CGNAT edge'],
    ['169.254.169.254', 'link-local / cloud metadata'],
    ['169.254.0.1', 'link-local'],
    ['172.16.0.1', 'RFC1918 172.16/12 low edge'],
    ['172.31.255.255', 'RFC1918 172.16/12 high edge'],
    ['192.0.0.1', 'IETF protocol assignments'],
    ['192.0.2.1', 'TEST-NET-1'],
    ['192.88.99.1', '6to4 relay anycast'],
    ['192.168.1.1', 'RFC1918 192.168/16'],
    ['198.18.0.1', 'benchmarking'],
    ['198.19.255.255', 'benchmarking edge'],
    ['198.51.100.1', 'TEST-NET-2'],
    ['203.0.113.1', 'TEST-NET-3'],
    ['224.0.0.1', 'multicast'],
    ['255.255.255.255', 'broadcast'],
    ['::1', 'IPv6 loopback'],
    ['::', 'IPv6 unspecified'],
    ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
    ['::ffff:10.0.0.1', 'IPv4-mapped private'],
    ['64:ff9b::1', 'NAT64 well-known prefix'],
    ['fc00::1', 'unique local (ULA)'],
    ['fd00::1', 'unique local (ULA)'],
    ['fe80::1', 'link-local'],
    ['2001:db8::1', 'documentation range'],
    ['2001::1', 'Teredo/IETF 2001::/23'],
    ['2002:7f00:0001::', '6to4 embedding 127.0.0.1'],
    ['3fff::1', 'documentation range 3fff::/20'],
    ['not-an-ip', 'unparseable input treated as blocked'],
    ['', 'empty string treated as blocked'],
  ] as const

  it.each(blocked)('blocks %s (%s)', (ip) => {
    expect(isBlockedIp(ip)).toBe(true)
  })

  const allowed = [
    ['8.8.8.8', 'public (Google DNS)'],
    ['1.1.1.1', 'public (Cloudflare)'],
    ['172.32.0.1', 'just outside RFC1918 172.16/12'],
    ['172.15.255.255', 'just outside RFC1918 172.16/12'],
    ['100.63.255.255', 'just outside CGNAT range'],
    ['100.128.0.1', 'just outside CGNAT range'],
    ['9.9.9.9', 'public'],
    ['2001:4860:4860::8888', 'public IPv6 (Google DNS)'],
    ['2606:4700:4700::1111', 'public IPv6 (Cloudflare)'],
  ] as const

  it.each(allowed)('allows %s (%s)', (ip) => {
    expect(isBlockedIp(ip)).toBe(false)
  })
})

describe('checkWebhookUrl — hostile URL table (must be rejected)', () => {
  const cases: Array<[string, string, LookupAll?]> = [
    ['http://localhost/hook', 'bare localhost hostname'],
    ['https://foo.localhost/hook', '.localhost suffix'],
    ['https://service.internal/hook', '.internal suffix'],
    ['https://box.lan/hook', '.lan suffix'],
    ['https://127.0.0.1/hook', 'loopback literal'],
    ['https://0.0.0.0/hook', 'this-network literal'],
    ['https://10.1.2.3/hook', 'RFC1918 10/8 literal'],
    ['https://172.16.5.5/hook', 'RFC1918 172.16/12 literal'],
    ['https://192.168.0.5/hook', 'RFC1918 192.168/16 literal'],
    ['https://169.254.169.254/latest/meta-data/', 'cloud metadata literal'],
    ['https://[::1]/hook', 'IPv6 loopback literal'],
    ['https://[::ffff:127.0.0.1]/hook', 'IPv4-mapped loopback literal'],
    ['https://user:pass@example.com/hook', 'credentials in URL'],
    ['http://attacker.example@169.254.169.254/hook', 'userinfo decoy hiding real internal host'],
    ['https://example.com:8080/hook', 'Traefik dashboard port not allowlisted'],
    ['https://example.com:9000/hook', 'Portainer port not allowlisted'],
    ['ftp://example.com/hook', 'disallowed scheme'],
    ['not a url', 'unparseable URL'],
    // Encoded-IP tricks: none of these parse as a literal IP and none contain a dot,
    // so they are rejected as "internal hostname" before any DNS work.
    ['https://2130706433/hook', 'decimal-encoded 127.0.0.1'],
    ['https://0x7f000001/hook', 'hex-encoded 127.0.0.1'],
    ['https://017700000001/hook', 'octal-encoded 127.0.0.1'],
  ]

  it.each(cases)('rejects %s (%s)', async (url) => {
    await expect(checkWebhookUrl(url, { allowHttp: true })).rejects.toBeInstanceOf(WebhookBlockedError)
  })

  it('rejects a hostname that resolves to a public AND a private address (round-robin smuggling)', async () => {
    const lookup = stubLookup({
      'sneaky.example.com': [
        { address: '8.8.8.8', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ],
    })
    await expect(
      checkWebhookUrl('https://sneaky.example.com/hook', { allowHttp: true, lookup })
    ).rejects.toBeInstanceOf(WebhookBlockedError)
  })

  it('rejects a hostname that resolves entirely to private addresses (DNS-rebinding-style answer)', async () => {
    const lookup = stubLookup({
      'rebind.example.com': [{ address: '169.254.169.254', family: 4 }],
    })
    await expect(
      checkWebhookUrl('https://rebind.example.com/hook', { allowHttp: true, lookup })
    ).rejects.toBeInstanceOf(WebhookBlockedError)
  })

  it('rejects "127.1" shorthand even if a (misconfigured/attacker) resolver answers with 127.0.0.1', async () => {
    // "127.1" is not a literal IP per Node's parser and contains a dot, so it is treated as an
    // ordinary hostname needing DNS resolution — the real defense is that the RESOLVED address is
    // checked, not the literal spelling.
    const lookup = stubLookup({ '127.1': [{ address: '127.0.0.1', family: 4 }] })
    await expect(
      checkWebhookUrl('https://127.1/hook', { allowHttp: true, lookup })
    ).rejects.toBeInstanceOf(WebhookBlockedError)
  })

  it('rejects when the hostname resolves to zero addresses', async () => {
    const lookup: LookupAll = async () => []
    await expect(
      checkWebhookUrl('https://nowhere.example.com/hook', { allowHttp: true, lookup })
    ).rejects.toBeInstanceOf(WebhookBlockedError)
  })

  it('propagates (rather than silently swallowing) a hard DNS failure for an unresolvable hostname', async () => {
    // The real dns.promises.lookup rejects (e.g. ENOTFOUND) instead of resolving to []. postWebhook
    // does not need to reclassify this as WebhookBlockedError — the route's catch-all already
    // treats any thrown error from the webhook path as "fall back to email", so this fails safe
    // either way. This test pins that the failure is NOT silently swallowed into a false success.
    const lookup = stubLookup({})
    await expect(checkWebhookUrl('https://nowhere.example.com/hook', { allowHttp: true, lookup })).rejects.toThrow(
      /ENOTFOUND/
    )
  })

  it('rejects plain http when allowHttp is not set (default posture)', async () => {
    await expect(checkWebhookUrl('http://8.8.8.8/hook')).rejects.toBeInstanceOf(WebhookBlockedError)
  })
})

describe('checkWebhookUrl — legitimate URL table (must pass)', () => {
  it('accepts a literal public IPv4 address', async () => {
    const target = await checkWebhookUrl('https://8.8.8.8/hook', { allowHttp: true })
    expect(target.address).toBe('8.8.8.8')
    expect(target.family).toBe(4)
  })

  it('accepts a literal public IPv6 address', async () => {
    const target = await checkWebhookUrl('https://[2001:4860:4860::8888]/hook', { allowHttp: true })
    expect(target.family).toBe(6)
  })

  it('accepts a public hostname resolving to a public address', async () => {
    const lookup = stubLookup({ 'hooks.example.com': [{ address: '93.184.216.34', family: 4 }] })
    const target = await checkWebhookUrl('https://hooks.example.com/hook', { allowHttp: true, lookup })
    expect(target.address).toBe('93.184.216.34')
  })

  it('accepts an explicit default port (443)', async () => {
    await expect(checkWebhookUrl('https://8.8.8.8:443/hook', { allowHttp: true })).resolves.toBeTruthy()
  })

  it('accepts the allowlisted alternate HTTPS port 8443', async () => {
    await expect(checkWebhookUrl('https://8.8.8.8:8443/hook', { allowHttp: true })).resolves.toBeTruthy()
  })

  it('accepts plain http only when explicitly enabled', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(checkWebhookUrl('http://8.8.8.8/hook', { allowHttp: true })).resolves.toBeTruthy()
    warn.mockRestore()
  })
})

describe('postWebhook — transport-level guarantees', () => {
  it('resolves on a 2xx from the pinned send function', async () => {
    const send = vi.fn(async () => ({ status: 200 }))
    await expect(postWebhook('https://8.8.8.8/hook', { a: 1 }, { send })).resolves.toEqual({ status: 200 })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatchObject({ address: '8.8.8.8', family: 4 })
  })

  it('never calls send for a blocked target (guard runs before transport)', async () => {
    const send = vi.fn(async () => ({ status: 200 }))
    await expect(postWebhook('https://127.0.0.1/hook', { a: 1 }, { send })).rejects.toBeInstanceOf(
      WebhookBlockedError
    )
    expect(send).not.toHaveBeenCalled()
  })

  it('treats a 3xx as a failure instead of following the redirect (no second request is made)', async () => {
    const send = vi.fn(async () => ({ status: 302 }))
    await expect(postWebhook('https://8.8.8.8/hook', { a: 1 }, { send })).rejects.toThrow(/302/)
    expect(send).toHaveBeenCalledTimes(1) // never a follow-up request to a Location header
  })

  it('treats a non-2xx as a failure', async () => {
    const send = vi.fn(async () => ({ status: 500 }))
    await expect(postWebhook('https://8.8.8.8/hook', { a: 1 }, { send })).rejects.toThrow(/500/)
  })

  it('pins the connection to the address resolved at validation time, decoupled from hostname re-resolution', async () => {
    // Simulates DNS rebinding: the hostname resolved to a public address for the guard check, and
    // `send` receives that exact pinned address rather than the hostname (so a later, different
    // answer for the same hostname can never be reached).
    const lookup = stubLookup({ 'rebinder.example.com': [{ address: '93.184.216.34', family: 4 }] })
    const send = vi.fn(async (req: { address: string }) => ({ status: 200 }))
    await postWebhook('https://rebinder.example.com/hook', {}, { lookup, send })
    expect(send.mock.calls[0][0].address).toBe('93.184.216.34')
  })
})
