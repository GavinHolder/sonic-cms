import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// HIGH-2 fix (2026-09-28 security review): /api/otp/send previously had no per-IP rate limit and
// accepted any string as `email`/`purpose`, letting an attacker vary `purpose` per request to
// dodge the existing per-email+purpose DB throttle, and pass a comma-separated address list
// straight to nodemailer. These tests prove the new per-IP limit, email-format validation, and
// purpose allowlist.

vi.mock('@/lib/email', () => ({
  getEmailConfig: vi.fn(async () => ({})),
  sendOtpEmail: vi.fn(async () => undefined),
}))

vi.mock('@/lib/prisma', () => {
  const prisma = {
    otpToken: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      count: vi.fn(async () => 0), // per-email+purpose DB throttle never trips in these tests
      create: vi.fn(async () => ({})),
    },
  }
  return { prisma, default: prisma }
})

type Mock = ReturnType<typeof vi.fn>

async function load() {
  vi.clearAllMocks()
  vi.resetModules()
  const email = await import('@/lib/email')
  const send = (await import('@/app/api/otp/send/route')).POST
  return { email: email as unknown as { sendOtpEmail: Mock; getEmailConfig: Mock }, send }
}

const post = (body: unknown, xff?: string) =>
  new Request('http://localhost/api/otp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(xff ? { 'x-forwarded-for': xff } : {}) },
    body: JSON.stringify(body),
  })

describe('POST /api/otp/send', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'))
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('rejects a comma-separated multi-address email with 400 and never calls sendOtpEmail', async () => {
    const m = await load()
    const res = await m.send(post({ email: 'v1@a.com,v2@b.com', purpose: 'cta-form' }, '203.0.113.40'))
    expect(res.status).toBe(400)
    expect(m.email.sendOtpEmail).not.toHaveBeenCalled()
  })

  it('rejects a purpose outside the shipped-client allowlist with 400', async () => {
    const m = await load()
    const res = await m.send(post({ email: 'visitor@example.com', purpose: 'anything-goes' }, '203.0.113.41'))
    expect(res.status).toBe(400)
    expect(m.email.sendOtpEmail).not.toHaveBeenCalled()
  })

  it('rejects a malformed email with 400', async () => {
    const m = await load()
    const res = await m.send(post({ email: 'not-an-email', purpose: 'form-page' }, '203.0.113.42'))
    expect(res.status).toBe(400)
  })

  it('accepts every purpose the shipped client code actually sends', async () => {
    const m = await load()
    for (const [i, purpose] of ['cta-form', 'form-page', 'verification'].entries()) {
      const res = await m.send(post({ email: 'visitor@example.com', purpose }, `203.0.113.5${i}`))
      expect(res.status).toBe(200)
    }
  })

  it('varying purpose across requests does NOT bypass the new per-IP rate limit', async () => {
    const m = await load()
    const purposes = ['cta-form', 'form-page', 'verification', 'cta-form', 'form-page']
    for (const purpose of purposes) {
      const res = await m.send(post({ email: 'attacker@example.com', purpose }, '203.0.113.60'))
      expect(res.status).toBe(200)
    }
    // 6th request, yet another purpose value, same IP — must still be blocked
    const blocked = await m.send(post({ email: 'attacker@example.com', purpose: 'form-page' }, '203.0.113.60'))
    expect(blocked.status).toBe(429)
    expect(m.email.sendOtpEmail).toHaveBeenCalledTimes(5)
  })

  it('keeps a separate per-IP bucket from a different client', async () => {
    const m = await load()
    for (let i = 0; i < 5; i++) await m.send(post({ email: 'a@example.com', purpose: 'form-page' }, '203.0.113.61'))
    expect((await m.send(post({ email: 'a@example.com', purpose: 'form-page' }, '203.0.113.61'))).status).toBe(429)
    expect((await m.send(post({ email: 'a@example.com', purpose: 'form-page' }, '203.0.113.62'))).status).toBe(200)
  })

  it('a legitimate single-purpose flow still succeeds end-to-end', async () => {
    const m = await load()
    const res = await m.send(post({ email: 'legit@example.com', purpose: 'form-page' }, '203.0.113.70'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(m.email.sendOtpEmail).toHaveBeenCalledWith('legit@example.com', expect.any(String), expect.anything())
  })

  it('the per-IP limit runs before body parsing (rate-limited even on invalid JSON)', async () => {
    const m = await load()
    for (let i = 0; i < 5; i++) await m.send(post({ email: 'x@example.com', purpose: 'form-page' }, '203.0.113.80'))
    const res = await m.send(
      new Request('http://localhost/api/otp/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.80' },
        body: '{not json',
      })
    )
    expect(res.status).toBe(429)
  })
})
