import { describe, it, expect, afterEach, vi } from 'vitest'
import { normalizeIp, resolveClientIp, getClientIp, checkRateLimit } from '@/lib/rate-limit'

const req = (headers: Record<string, string>) =>
  new Request('http://localhost/api/contact', { method: 'POST', headers })

describe('resolveClientIp — trust the proxy-added LAST X-Forwarded-For entry', () => {
  it('single IP', () => {
    expect(resolveClientIp(req({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7')
  })

  it('list of IPs: uses the last (proxy-added) value, ignoring a spoofed first value', () => {
    expect(resolveClientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }))).toBe('203.0.113.7')
    expect(resolveClientIp(req({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2,203.0.113.7' }))).toBe('203.0.113.7')
  })

  it('a client rotating its own XFF prefix always resolves to the same proxy-added address', () => {
    const seen = new Set(
      ['1.1.1.1', '2.2.2.2', '8.8.8.8, 9.9.9.9', 'x'].map((spoof) =>
        resolveClientIp(req({ 'x-forwarded-for': `${spoof}, 203.0.113.7` }))
      )
    )
    expect([...seen]).toEqual(['203.0.113.7'])
  })

  it('missing header: null (getClientIp keeps its legacy 127.0.0.1 fallback)', () => {
    expect(resolveClientIp(req({}))).toBeNull()
    expect(getClientIp(req({}))).toBe('127.0.0.1')
  })

  it('falls back to X-Real-IP only when XFF is absent or its last entry is invalid', () => {
    expect(resolveClientIp(req({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
    expect(
      resolveClientIp(req({ 'x-forwarded-for': '1.1.1.1, not-an-ip', 'x-real-ip': '198.51.100.4' }))
    ).toBe('198.51.100.4')
  })

  it('IPv6: bare, uppercase, expanded, bracketed with port, IPv4-mapped, zone id', () => {
    expect(resolveClientIp(req({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1')
    expect(resolveClientIp(req({ 'x-forwarded-for': '2001:DB8::1' }))).toBe('2001:db8::1')
    expect(
      resolveClientIp(req({ 'x-forwarded-for': '2001:0db8:0000:0000:0000:0000:0000:0001' }))
    ).toBe('2001:db8::1')
    expect(resolveClientIp(req({ 'x-forwarded-for': '[2001:db8::1]:443' }))).toBe('2001:db8::1')
    expect(resolveClientIp(req({ 'x-forwarded-for': '::ffff:203.0.113.7' }))).toBe('203.0.113.7')
    expect(resolveClientIp(req({ 'x-forwarded-for': '1.1.1.1, 2001:db8::1' }))).toBe('2001:db8::1')
    expect(resolveClientIp(req({ 'x-forwarded-for': 'fe80::1%eth0' }))).toBe('fe80::1')
  })

  it('IPv4 with a port', () => {
    expect(resolveClientIp(req({ 'x-forwarded-for': '203.0.113.7:51234' }))).toBe('203.0.113.7')
  })

  it('malformed values never resolve to an attacker-chosen earlier entry', () => {
    expect(resolveClientIp(req({ 'x-forwarded-for': '6.6.6.6, garbage' }))).toBeNull()
    expect(resolveClientIp(req({ 'x-forwarded-for': 'garbage' }))).toBeNull()
    expect(resolveClientIp(req({ 'x-forwarded-for': '999.1.1.1' }))).toBeNull()
    expect(resolveClientIp(req({ 'x-forwarded-for': '' }))).toBeNull()
    expect(resolveClientIp(req({ 'x-forwarded-for': ',,' }))).toBeNull()
    expect(resolveClientIp(req({ 'x-forwarded-for': '[::1' }))).toBeNull()
    expect(resolveClientIp(req({ 'x-forwarded-for': '1.2.3.4; DROP TABLE' }))).toBeNull()
  })

  it('tolerates whitespace and a trailing comma', () => {
    expect(resolveClientIp(req({ 'x-forwarded-for': '  6.6.6.6 ,   203.0.113.7  ,' }))).toBe('203.0.113.7')
  })

  it('normalizeIp rejects non-IPs', () => {
    for (const bad of ['', ' ', 'abc', 'abc:80', '1.2.3', '1.2.3.4.5', 'g::1', ':']) {
      expect(normalizeIp(bad)).toBeNull()
    }
  })
})

describe('checkRateLimit store', () => {
  afterEach(() => vi.unstubAllEnvs())

  it("'form' preset defaults to 5 per 600s and honours env overrides (invalid values ignored)", () => {
    vi.stubEnv('NODE_ENV', 'production')
    const hits = (id: string) => {
      let n = 0
      while (checkRateLimit(id, 'form').allowed) n++
      return n
    }
    expect(hits('preset-default')).toBe(5)
    vi.stubEnv('FORM_RATE_LIMIT_MAX', '2')
    expect(hits('preset-override')).toBe(2)
    vi.stubEnv('FORM_RATE_LIMIT_MAX', 'banana')
    expect(hits('preset-invalid')).toBe(5)
    vi.stubEnv('FORM_RATE_LIMIT_MAX', '-3')
    expect(hits('preset-negative')).toBe(5)
  })

  it('is bounded: once the key cap is reached the oldest entries are evicted', () => {
    vi.stubEnv('NODE_ENV', 'production')
    while (checkRateLimit('victim', 'form').allowed) {
      /* exhaust */
    }
    expect(checkRateLimit('victim', 'form').allowed).toBe(false)
    for (let i = 0; i < 50_010; i++) checkRateLimit(`flood-${i}`, 'form')
    // 'victim' was the oldest live key, so it was evicted to make room -> a fresh window
    expect(checkRateLimit('victim', 'form').allowed).toBe(true)
  })

  it('is disabled under NODE_ENV=test', () => {
    for (let i = 0; i < 20; i++) expect(checkRateLimit('test-env', 'form').allowed).toBe(true)
  })
})
