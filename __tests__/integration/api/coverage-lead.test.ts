import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { kvRows } from '@/lib/email/layout'

// POST /api/coverage/lead — public, unauthenticated lead capture (Level 3).
// Proves: per-IP rate limit, field validation, header-injection guard, server-side
// network/package authority, and that store/email failures are logged (without personal
// data) and only reported as success when the lead actually landed somewhere.

vi.mock('@/lib/email', () => ({
  getEmailConfig: vi.fn(async () => ({ admin_email: 'admin@example.com' })),
  sendSubmissionEmail: vi.fn(async () => undefined),
}))

vi.mock('@/lib/prisma', () => {
  const prisma = {
    network: { findUnique: vi.fn() },
    package: { findUnique: vi.fn(), findMany: vi.fn() },
    page: { findFirst: vi.fn() },
    formSubmission: { create: vi.fn() },
  }
  return { prisma, default: prisma }
})

type Mock = ReturnType<typeof vi.fn>
interface Db {
  network: { findUnique: Mock }
  package: { findUnique: Mock; findMany: Mock }
  page: { findFirst: Mock }
  formSubmission: { create: Mock }
}
type Field = { label: string; value: string }

const NET = { name: 'Openserve', category: 'FNO', isActive: true }
const PKG = { name: 'Fibre 50', term: '24-Month', price: 'R699', period: '/month', isActive: true, networkId: 'net1', category: { name: 'Data' } }

async function load() {
  vi.clearAllMocks()
  vi.resetModules()
  const email = (await import('@/lib/email')) as unknown as { sendSubmissionEmail: Mock; getEmailConfig: Mock }
  const db = (await import('@/lib/prisma')).default as unknown as Db
  db.network.findUnique.mockResolvedValue(NET)
  db.package.findUnique.mockResolvedValue(PKG)
  db.package.findMany.mockResolvedValue([{ name: 'Voice Line', term: 'Month-to-Month' }])
  db.page.findFirst.mockResolvedValue({ id: 'page1', slug: 'coverage' })
  db.formSubmission.create.mockResolvedValue({})
  email.getEmailConfig.mockResolvedValue({ admin_email: 'admin@example.com' })
  email.sendSubmissionEmail.mockResolvedValue(undefined)
  const POST = (await import('@/app/api/coverage/lead/route')).POST
  return { email, db, POST }
}

let ipSeq = 0
const nextIp = () => `203.0.113.${(ipSeq++ % 200) + 1}`

const post = (body: unknown, ip: string = nextIp()) =>
  new NextRequest('http://localhost/api/coverage/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const base = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '082 123 4567',
  address: '1 Main Rd, Springfield',
  mapSlug: 'main',
  networkId: 'net1',
  packageId: 'pkg1',
  addonIds: ['addon1'],
  miss: false,
}

const valueOf = (fields: Field[], label: string) => fields.find((f) => f.label === label)?.value

describe('POST /api/coverage/lead', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    errorSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('stores the lead with the right fields and emails every field once', async () => {
    const m = await load()
    const res = await m.POST(post(base))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(m.db.formSubmission.create).toHaveBeenCalledTimes(1)
    const stored = m.db.formSubmission.create.mock.calls[0][0].data
    expect(stored).toMatchObject({
      pageId: 'page1',
      pageSlug: 'coverage',
      userEmail: 'jane@example.com',
      status: 'received',
      source: 'coverage_check',
      leadCategory: 'FNO',
      networkName: 'Openserve',
      packageName: 'Fibre 50',
      addressChecked: '1 Main Rd, Springfield',
    })

    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(1)
    const [fields, replyTo, , source] = m.email.sendSubmissionEmail.mock.calls[0] as [Field[], string, unknown, string]
    expect(replyTo).toBe('jane@example.com')
    expect(source).toBe('Coverage Lead')
    expect(valueOf(fields, 'Name')).toBe('Jane Doe')
    expect(valueOf(fields, 'Email')).toBe('jane@example.com')
    expect(valueOf(fields, 'Phone')).toBe('082 123 4567')
    expect(valueOf(fields, 'Address checked')).toBe('1 Main Rd, Springfield')
    expect(valueOf(fields, 'Network')).toBe('Openserve')
    expect(valueOf(fields, 'Package')).toBe('Fibre 50 (24-Month)')
    expect(valueOf(fields, 'Add-ons')).toBe('Voice Line (Month-to-Month)')
    expect(stored.data).toEqual(fields)
  })

  it.each([
    ['empty name', { name: '' }],
    ['whitespace name', { name: '   ' }],
    ['invalid email', { email: 'not-an-email' }],
    ['missing email', { email: undefined }],
    ['missing phone', { phone: undefined }],
    ['invalid phone', { phone: 'call me maybe' }],
    ['CR/LF in name', { name: 'Jane\r\nBcc: x@evil.test' }],
    ['CR/LF in email', { email: 'jane@example.com\nBcc: x@evil.test' }],
    ['CR/LF in phone', { phone: '0821234567\r\n0' }],
    ['oversized name', { name: 'a'.repeat(101) }],
    ['oversized email', { email: `${'a'.repeat(250)}@b.co` }],
    ['oversized address', { address: 'a'.repeat(301) }],
    ['more than 20 add-ons', { addonIds: Array.from({ length: 21 }, (_, i) => `a${i}`) }],
    ['oversized package id', { packageId: 'p'.repeat(65) }],
    ['non-string network id', { networkId: 12 }],
  ])('rejects %s with 400 and neither stores nor emails', async (_label, patch) => {
    const m = await load()
    const res = await m.POST(post({ ...base, ...patch }))
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string }
    expect(typeof json.error).toBe('string')
    expect(json.error.length).toBeGreaterThan(0)
    expect(m.db.formSubmission.create).not.toHaveBeenCalled()
    expect(m.email.sendSubmissionEmail).not.toHaveBeenCalled()
  })

  it('rejects an invalid JSON body with 400', async () => {
    const m = await load()
    const res = await m.POST(post('{not json'))
    expect(res.status).toBe(400)
    expect(m.db.formSubmission.create).not.toHaveBeenCalled()
  })

  it('passes HTML through as data, and the shared layout escapes it', async () => {
    const m = await load()
    const payload = '<script>alert(1)</script>'
    const res = await m.POST(post({ ...base, name: payload, address: '<img src=x onerror=alert(1)>' }))
    expect(res.status).toBe(200)
    const fields = m.email.sendSubmissionEmail.mock.calls[0][0] as Field[]
    expect(valueOf(fields, 'Name')).toBe(payload)
    const html = kvRows(fields)
    expect(html).not.toContain(payload)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<img src=x')
  })

  it.each([
    ['unknown network', (db: Db) => db.network.findUnique.mockResolvedValue(null)],
    ['inactive network', (db: Db) => db.network.findUnique.mockResolvedValue({ ...NET, isActive: false })],
    ['unknown package', (db: Db) => db.package.findUnique.mockResolvedValue(null)],
    ['inactive package', (db: Db) => db.package.findUnique.mockResolvedValue({ ...PKG, isActive: false })],
    ['package from another network', (db: Db) => db.package.findUnique.mockResolvedValue({ ...PKG, networkId: 'other' })],
  ])('rejects %s with 400', async (_label, arrange) => {
    const m = await load()
    arrange(m.db)
    const res = await m.POST(post(base))
    expect(res.status).toBe(400)
    expect(m.db.formSubmission.create).not.toHaveBeenCalled()
    expect(m.email.sendSubmissionEmail).not.toHaveBeenCalled()
  })

  it('rejects a package sent without a network', async () => {
    const m = await load()
    const res = await m.POST(post({ ...base, networkId: null }))
    expect(res.status).toBe(400)
    expect(m.db.formSubmission.create).not.toHaveBeenCalled()
  })

  it('only resolves add-ons that are active and on the same network', async () => {
    const m = await load()
    await m.POST(post(base))
    expect(m.db.package.findMany.mock.calls[0][0].where).toMatchObject({ id: { in: ['addon1'] }, networkId: 'net1', isActive: true })
  })

  it('accepts a covered address with no package picked (network only)', async () => {
    const m = await load()
    const res = await m.POST(post({ ...base, packageId: null, addonIds: [] }))
    expect(res.status).toBe(200)
    expect(m.db.package.findUnique).not.toHaveBeenCalled()
    expect(m.db.formSubmission.create.mock.calls[0][0].data).toMatchObject({ leadCategory: 'FNO', networkName: 'Openserve', packageName: null })
  })

  it('keeps the miss / notify-me path: no network lookups, lead type "miss"', async () => {
    const m = await load()
    const res = await m.POST(post({ name: 'Jane Doe', email: 'jane@example.com', phone: '0821234567', address: '9 Far Rd', networkId: null, packageId: null, addonIds: [], miss: true }))
    expect(res.status).toBe(200)
    expect(m.db.network.findUnique).not.toHaveBeenCalled()
    expect(m.db.package.findUnique).not.toHaveBeenCalled()
    expect(m.db.formSubmission.create.mock.calls[0][0].data).toMatchObject({ leadCategory: 'miss', networkName: null, packageName: null, addressChecked: '9 Far Rd' })
    const [fields, , , source] = m.email.sendSubmissionEmail.mock.calls[0] as [Field[], string, unknown, string]
    expect(source).toBe('Coverage Miss — Notify Request')
    expect(valueOf(fields, 'Lead type')).toBe('miss')
    expect(valueOf(fields, 'Phone')).toBe('0821234567')
  })

  it('still requires a phone on the miss path', async () => {
    const m = await load()
    const res = await m.POST(post({ name: 'Jane Doe', email: 'jane@example.com', miss: true }))
    expect(res.status).toBe(400)
  })

  it('store throws but email succeeds: 200, and the failure is logged', async () => {
    const m = await load()
    m.db.formSubmission.create.mockRejectedValue(new Error('db down for jane@example.com'))
    const res = await m.POST(post(base))
    expect(res.status).toBe(200)
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(errorSpy.mock.calls)).toContain('store')
  })

  it('email throws but store succeeds: 200, and the failure is logged', async () => {
    const m = await load()
    m.email.sendSubmissionEmail.mockRejectedValue(new Error('smtp refused Jane Doe'))
    const res = await m.POST(post(base))
    expect(res.status).toBe(200)
    expect(m.db.formSubmission.create).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(errorSpy.mock.calls)).toContain('email')
  })

  it('both store and email fail: honest error status, not success', async () => {
    const m = await load()
    m.db.formSubmission.create.mockRejectedValue(new Error('db down'))
    m.email.sendSubmissionEmail.mockRejectedValue(new Error('smtp down'))
    const res = await m.POST(post(base))
    expect(res.status).toBeGreaterThanOrEqual(500)
    const json = (await res.json()) as { error: string; ok?: boolean }
    expect(json.ok).toBeUndefined()
    expect(json.error).toMatch(/not received/i)
    expect(json.error).not.toMatch(/db down|smtp down/)
  })

  it('store fails and no admin recipient is configured: not reported as success', async () => {
    const m = await load()
    m.db.formSubmission.create.mockRejectedValue(new Error('db down'))
    m.email.getEmailConfig.mockResolvedValue({})
    const res = await m.POST(post(base))
    expect(res.status).toBeGreaterThanOrEqual(500)
  })

  it('no page to attach the submission to counts as a store failure, email still goes', async () => {
    const m = await load()
    m.db.page.findFirst.mockResolvedValue(null)
    const res = await m.POST(post(base))
    expect(res.status).toBe(200)
    expect(m.db.formSubmission.create).not.toHaveBeenCalled()
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('a failing network lookup returns an honest 5xx and is logged', async () => {
    const m = await load()
    m.db.network.findUnique.mockRejectedValue(new Error('db down'))
    const res = await m.POST(post(base))
    expect(res.status).toBeGreaterThanOrEqual(500)
    expect(m.email.sendSubmissionEmail).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('never writes personal data to the log', async () => {
    const m = await load()
    const leak = 'Jane Doe jane@example.com 082 123 4567 1 Main Rd, Springfield'
    m.db.formSubmission.create.mockRejectedValue(new Error(`Invalid invocation: ${leak}`))
    m.email.sendSubmissionEmail.mockRejectedValue(new Error(`Recipient rejected: ${leak}`))
    await m.POST(post(base))
    const logged = JSON.stringify(errorSpy.mock.calls.map((c) => c.map((a) => (a instanceof Error ? `${a.name} ${a.message} ${a.stack}` : a))))
    for (const secret of ['Jane', 'jane@example.com', '082 123 4567', 'Main Rd']) {
      expect(logged).not.toContain(secret)
    }
  })

  it('the 6th request in the window from one IP gets 429 with Retry-After', async () => {
    const m = await load()
    const ip = '198.51.100.7'
    for (let i = 0; i < 5; i++) expect((await m.POST(post(base, ip))).status).toBe(200)
    const blocked = await m.POST(post(base, ip))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(m.email.sendSubmissionEmail).toHaveBeenCalledTimes(5)
    expect((await m.POST(post(base, '198.51.100.8'))).status).toBe(200)
  })

  it('the rate limit runs before body parsing', async () => {
    const m = await load()
    const ip = '198.51.100.9'
    for (let i = 0; i < 5; i++) await m.POST(post(base, ip))
    expect((await m.POST(post('{not json', ip))).status).toBe(429)
  })
})
