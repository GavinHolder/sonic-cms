import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Per-IP limit on the two public form endpoints. Fresh module graph (=> fresh in-memory
// store, fresh mocks) per test; the limiter is bypassed under NODE_ENV=test so we stub it.

vi.mock('@/lib/email', () => ({
  getEmailConfig: vi.fn(async () => ({})),
  sendSubmissionEmail: vi.fn(async () => undefined),
}))
vi.mock('@/lib/prisma', () => {
  const prisma = {
    page: { findFirst: vi.fn(async () => null), findUnique: vi.fn(async () => null) },
    section: { findMany: vi.fn(async () => []) },
    formSubmission: { create: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({})) },
  }
  return { prisma, default: prisma }
})

const MSG = 'Too many submissions. Please try again in a few minutes.'

type Mock = ReturnType<typeof vi.fn>

async function load() {
  vi.clearAllMocks() // mock instances survive resetModules; drop their call history
  vi.resetModules()
  const email = await import('@/lib/email')
  const prismaMod = await import('@/lib/prisma')
  const contact = (await import('@/app/api/contact/route')).POST
  const submit = (await import('@/app/api/forms/submit/route')).POST
  return {
    email: email as unknown as { sendSubmissionEmail: Mock },
    prisma: prismaMod.prisma as unknown as { page: { findFirst: Mock; findUnique: Mock } },
    contact,
    submit,
  }
}

const post = (path: string, body: unknown, xff?: string) =>
  new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(xff ? { 'x-forwarded-for': xff } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const contactReq = (xff?: string) => post('/api/contact', { email: 'lead@example.com', name: 'Lead' }, xff)
const submitReq = (xff?: string) =>
  post(
    '/api/forms/submit',
    { fields: [{ label: 'Name', value: 'Lead' }], userEmail: 'lead@example.com', source: 'x' },
    xff
  )

describe.each([
  ['/api/contact', 'contact', contactReq],
  ['/api/forms/submit', 'submit', submitReq],
] as const)('%s rate limit', (path, which, mk) => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('allows 5, then 429 + Retry-After + RATE_LIMITED for the 6th, with no email or DB work', async () => {
    const m = await load()
    const handler = m[which]
    for (let i = 0; i < 5; i++) {
      const res = await handler(mk('203.0.113.10'))
      expect(res.status).toBe(200)
    }
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(5)
    const lookups = () => m.prisma.page.findFirst.mock.calls.length + m.prisma.page.findUnique.mock.calls.length
    const before = lookups()

    const res = await handler(mk('203.0.113.10'))
    expect(res.status).toBe(429)
    const retry = Number(res.headers.get('Retry-After'))
    expect(retry).toBeGreaterThan(0)
    expect(retry).toBeLessThanOrEqual(600)
    expect(await res.json()).toEqual({ error: MSG, code: 'RATE_LIMITED' })
    // limit check ran BEFORE any email and before any DB work
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(5)
    expect(lookups()).toBe(before)
  })

  it('blocks before the body is parsed (invalid JSON still gets 429, not 400/500)', async () => {
    const m = await load()
    const handler = m[which]
    for (let i = 0; i < 5; i++) await handler(mk('203.0.113.11'))
    const res = await handler(post(path, '{not json', '203.0.113.11'))
    expect(res.status).toBe(429)
  })

  it('keeps a separate counter per client IP', async () => {
    const m = await load()
    const handler = m[which]
    for (let i = 0; i < 5; i++) await handler(mk('203.0.113.12'))
    expect((await handler(mk('203.0.113.12'))).status).toBe(429)
    expect((await handler(mk('203.0.113.13'))).status).toBe(200)
  })

  it('a client-supplied X-Forwarded-For prefix does not bypass the limit', async () => {
    const m = await load()
    const handler = m[which]
    // the proxy-added (last) entry is always 203.0.113.14; the attacker rotates the front
    for (let i = 0; i < 5; i++) expect((await handler(mk(`10.0.0.${i}, 203.0.113.14`))).status).toBe(200)
    expect((await handler(mk('10.9.9.9, 203.0.113.14'))).status).toBe(429)
    expect((await handler(mk('203.0.113.14'))).status).toBe(429)
  })

  it('a fresh window opens after windowSec', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const m = await load()
    const handler = m[which]
    for (let i = 0; i < 5; i++) await handler(mk('203.0.113.15'))
    expect((await handler(mk('203.0.113.15'))).status).toBe(429)
    vi.setSystemTime(new Date('2026-01-01T00:09:59Z'))
    expect((await handler(mk('203.0.113.15'))).status).toBe(429)
    vi.setSystemTime(new Date('2026-01-01T00:10:01Z'))
    expect((await handler(mk('203.0.113.15'))).status).toBe(200)
  })

  it('FORM_RATE_LIMIT_MAX overrides the default', async () => {
    vi.stubEnv('FORM_RATE_LIMIT_MAX', '2')
    const m = await load()
    const handler = m[which]
    expect((await handler(mk('203.0.113.16'))).status).toBe(200)
    expect((await handler(mk('203.0.113.16'))).status).toBe(200)
    expect((await handler(mk('203.0.113.16'))).status).toBe(429)
  })

  it('fails open (one warning) when no client IP is determinable, instead of locking everyone out', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const m = await load()
    const handler = m[which]
    for (let i = 0; i < 8; i++) expect((await handler(mk())).status).toBe(200)
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('[form-rate-limit]')).length).toBe(1)
    warn.mockRestore()
  })
})

describe('the two endpoints do not share a counter', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'))
  afterEach(() => vi.unstubAllEnvs())

  it('exhausting /api/contact leaves /api/forms/submit open for the same IP (and vice versa)', async () => {
    const m = await load()
    for (let i = 0; i < 5; i++) await m.contact(contactReq('203.0.113.20'))
    expect((await m.contact(contactReq('203.0.113.20'))).status).toBe(429)
    for (let i = 0; i < 5; i++) expect((await m.submit(submitReq('203.0.113.20'))).status).toBe(200)
    expect((await m.submit(submitReq('203.0.113.20'))).status).toBe(429)
  })
})
