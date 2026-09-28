import { describe, it, expect, vi } from 'vitest'

// Route-level proof that a client can no longer pick its own email recipient or webhook target.
// NODE_ENV is left at vitest's default ('test'), under which lib/rate-limit.ts's checkRateLimit
// always returns { allowed: true } — these tests are about routing, not the rate limiter (see
// __tests__/unit/api/form-rate-limit.test.ts for that).

vi.mock('@/lib/email', () => ({
  getEmailConfig: vi.fn(async () => ({ admin_email: 'admin@example.com' })),
  sendSubmissionEmail: vi.fn(async () => undefined),
}))

vi.mock('@/lib/safe-webhook', () => ({
  postWebhook: vi.fn(async () => ({ status: 200 })),
}))

vi.mock('@/lib/prisma', () => {
  const prisma = {
    page: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => [] as unknown[]),
    },
    section: { findMany: vi.fn(async () => [] as unknown[]) },
    formSubmission: { create: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({})) },
  }
  return { prisma, default: prisma }
})

type Mock = ReturnType<typeof vi.fn>

async function load() {
  vi.clearAllMocks()
  vi.resetModules()
  const email = await import('@/lib/email')
  const safeWebhook = await import('@/lib/safe-webhook')
  const prismaMod = await import('@/lib/prisma')
  const submit = (await import('@/app/api/forms/submit/route')).POST
  return {
    email: email as unknown as { sendSubmissionEmail: Mock; getEmailConfig: Mock },
    safeWebhook: safeWebhook as unknown as { postWebhook: Mock },
    prisma: prismaMod.prisma as unknown as {
      page: { findMany: Mock; findUnique: Mock }
      section: { findMany: Mock }
    },
    submit,
  }
}

const post = (body: unknown) =>
  new Request('http://localhost/api/forms/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const configuredWebhookPage = {
  formConfig: { submitAction: 'webhook', submitConfig: { webhookUrl: 'https://hooks.example.com/real' } },
  customHtml: null,
}
const configuredEmailPage = {
  formConfig: { submitAction: 'email', submitConfig: { emailTo: 'sales@example.com' } },
  customHtml: null,
}

describe('POST /api/forms/submit — server-side recipient/webhook allowlist', () => {
  it('ignores a forged emailTo + webhookUrl, never calls the webhook, and still succeeds via the email fallback', async () => {
    const m = await load()
    const res = await m.submit(
      post({
        fields: [{ label: 'Name', value: 'Lead' }],
        userEmail: 'lead@example.com',
        source: 'x',
        emailTo: 'attacker@evil.com',
        submitAction: 'webhook',
        webhookUrl: 'http://127.0.0.1:8080/steal',
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(m.safeWebhook.postWebhook).not.toHaveBeenCalled()
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(1)
    expect(m.email.sendSubmissionEmail.mock.calls[0][4]).toBeUndefined() // emailTo arg: forged value dropped
  })

  it('a normal submission with neither emailTo nor webhookUrl still works and never queries the routing tables', async () => {
    const m = await load()
    const res = await m.submit(
      post({ fields: [{ label: 'Name', value: 'Lead' }], userEmail: 'lead@example.com', source: 'CTA Section' })
    )
    expect(res.status).toBe(200)
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledWith(
      expect.anything(),
      'lead@example.com',
      expect.anything(),
      'CTA Section',
      undefined
    )
    expect(m.prisma.page.findMany).not.toHaveBeenCalled()
    expect(m.prisma.section.findMany).not.toHaveBeenCalled()
  })

  it('honours an emailTo that exactly matches an admin-configured value', async () => {
    const m = await load()
    m.prisma.page.findMany.mockResolvedValueOnce([configuredEmailPage])
    const res = await m.submit(
      post({
        fields: [{ label: 'Name', value: 'Lead' }],
        userEmail: 'lead@example.com',
        source: 'x',
        emailTo: 'sales@example.com',
      })
    )
    expect(res.status).toBe(200)
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledWith(
      expect.anything(),
      'lead@example.com',
      expect.anything(),
      'x',
      'sales@example.com'
    )
  })

  it('fires the webhook when webhookUrl exactly matches an admin-configured value (positive wiring proof)', async () => {
    const m = await load()
    m.prisma.page.findMany.mockResolvedValueOnce([configuredWebhookPage])
    const res = await m.submit(
      post({
        fields: [{ label: 'Name', value: 'Lead' }],
        userEmail: 'lead@example.com',
        source: 'x',
        submitAction: 'webhook',
        webhookUrl: 'https://hooks.example.com/real',
      })
    )
    expect(res.status).toBe(200)
    expect(m.safeWebhook.postWebhook).toHaveBeenCalledWith(
      'https://hooks.example.com/real',
      expect.objectContaining({ userEmail: 'lead@example.com' })
    )
    expect(m.email.sendSubmissionEmail).not.toHaveBeenCalled()
  })

  it('falls back to email (does not drop the submission) when a configured webhook fails or is SSRF-blocked', async () => {
    const m = await load()
    m.prisma.page.findMany.mockResolvedValueOnce([configuredWebhookPage])
    m.safeWebhook.postWebhook.mockRejectedValueOnce(new Error('host resolves to a non-public address'))
    const res = await m.submit(
      post({
        fields: [{ label: 'Name', value: 'Lead' }],
        userEmail: 'lead@example.com',
        source: 'x',
        submitAction: 'webhook',
        webhookUrl: 'https://hooks.example.com/real',
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(1)
  })

  it('still 400s when submitAction is webhook and no URL is supplied at all (unchanged behaviour)', async () => {
    const m = await load()
    const res = await m.submit(
      post({ fields: [{ label: 'Name', value: 'Lead' }], userEmail: 'lead@example.com', source: 'x', submitAction: 'webhook' })
    )
    expect(res.status).toBe(400)
    expect(m.safeWebhook.postWebhook).not.toHaveBeenCalled()
    expect(m.email.sendSubmissionEmail).not.toHaveBeenCalled()
  })
})
