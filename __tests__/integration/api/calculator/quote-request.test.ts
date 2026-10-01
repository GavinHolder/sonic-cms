import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the mailer so no real email is ever sent, and capture what sendMail() was called with.
// vi.mock() factories are hoisted above imports/const declarations, so the mock fn must be
// created via vi.hoisted() to be safely referenced inside the factory below.
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/email', () => ({
  createTransporter: vi.fn().mockResolvedValue({ sendMail }),
  getEmailConfig: vi.fn().mockResolvedValue({ admin_email: 'admin@example.com', smtp_from: 'noreply@example.com' }),
}))

vi.mock('@/lib/email-settings', () => ({
  DEFAULT_EMAIL_SETTINGS: { showLogo: true, showCompanyName: true, brandColor: '#e31e24', headerBg: '#ffffff', pageBg: '#eef0f3' },
  getEmailSettings: vi.fn().mockResolvedValue({ showLogo: true, showCompanyName: true, brandColor: '#e31e24', headerBg: '#ffffff', pageBg: '#eef0f3' }),
}))

import { POST } from '@/app/api/calculator/quote-request/route'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/calculator/quote-request', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const baseBody = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '0821234567',
  notes: 'Please call before delivery',
  calcType: 'slab',
  strength: '25 MPa',
  dimensions: { length: 3, width: 2, depth: 0.1 },
  result: { volumeM3: 0.6, weightKg: 1440, cementBags: 5, estimatedCost: 850 },
  currency: 'R',
  refNumber: 'QR-1001',
}

describe('POST /api/calculator/quote-request — HTML injection + header injection hardening', () => {
  beforeEach(() => vi.clearAllMocks())

  it('escapes a <script> payload in "name" so it renders as literal text, not live HTML/script', async () => {
    const payload = '<script>alert(1)</script>'
    const res = await POST(makeRequest({ ...baseBody, name: payload }))
    expect(res.status).toBe(200)

    expect(sendMail).toHaveBeenCalledTimes(1)
    const html: string = sendMail.mock.calls[0][0].html

    expect(html).not.toContain(payload)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes an <img onerror=...> payload in "notes" so it renders as literal text', async () => {
    const payload = '<img src=x onerror=alert(1)>'
    const res = await POST(makeRequest({ ...baseBody, notes: payload }))
    expect(res.status).toBe(200)

    const html: string = sendMail.mock.calls[0][0].html
    expect(html).not.toContain(payload)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('does not let extra fake table rows survive unescaped via "name"', async () => {
    const payload = '<tr><td>Injected</td><td>Row</td></tr>'
    const res = await POST(makeRequest({ ...baseBody, name: payload }))
    const html: string = sendMail.mock.calls[0][0].html
    expect(html).not.toContain(payload)
    expect(html).toContain('&lt;tr&gt;&lt;td&gt;Injected&lt;/td&gt;&lt;td&gt;Row&lt;/td&gt;&lt;/tr&gt;')
  })

  it('strips CRLF from a name containing a fake Bcc header, leaving no CR/LF in the Subject', async () => {
    const res = await POST(
      makeRequest({ ...baseBody, name: 'Evil\r\nBcc: attacker@evil.com' })
    )
    expect(res.status).toBe(200)

    const subject: string = sendMail.mock.calls[0][0].subject
    // The security property: no CR/LF survives, so "Bcc: attacker@evil.com" can never become
    // a second SMTP header — it collapses into inert text on the single Subject line instead.
    expect(subject).not.toMatch(/[\r\n]/)
    expect(subject).toContain('Evil Bcc: attacker@evil.com')
  })

  it('strips CRLF injected via refNumber and calcType from the Subject', async () => {
    const res = await POST(
      makeRequest({
        ...baseBody,
        refNumber: 'QR\r\nBcc:attacker@evil.com',
        calcType: 'slab\r\nX-Injected:1',
      })
    )
    expect(res.status).toBe(200)
    const subject: string = sendMail.mock.calls[0][0].subject
    expect(subject).not.toMatch(/[\r\n]/)
  })

  it('strips CRLF from the client-supplied email before using it as replyTo', async () => {
    const res = await POST(
      makeRequest({ ...baseBody, email: 'jane@example.com\r\nBcc: attacker@evil.com' })
    )
    expect(res.status).toBe(200)
    const replyTo: string = sendMail.mock.calls[0][0].replyTo
    expect(replyTo).not.toMatch(/[\r\n]/)
  })

  it('renders normal, benign input unescaped-looking (no double-escaping) and sends successfully', async () => {
    const res = await POST(makeRequest(baseBody))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const html: string = sendMail.mock.calls[0][0].html
    expect(html).toContain('Jane Doe')
    expect(html).toContain('jane@example.com')
  })
})
