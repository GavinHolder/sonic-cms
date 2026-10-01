import { describe, it, expect, afterEach, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/lib/brand-tokens', () => ({ getBrandTokens: vi.fn() }))

import { renderEmailLayout, kvRows, otpBox, bulletproofButton, buildEmailTheme } from '@/lib/email/layout'
import { resolveEmailLogo, resolveEmailBaseUrl } from '@/lib/email/assets'
import { buildOtpEmailHtml, buildSubmissionEmailHtml } from '@/lib/email'
import { DEFAULT_EMAIL_SETTINGS } from '@/lib/email-settings'

const tokens = { colors: {} } as never
const site = { companyName: 'Sonic <b>', logoUrl: '/images/uploads/x.webp', copyrightText: '' }
const evil = '<script>alert(1)</script>'

const samples = (): string[] => [
  buildOtpEmailHtml('123456', tokens, DEFAULT_EMAIL_SETTINGS, site),
  buildSubmissionEmailHtml([{ label: evil, value: evil }], 'a@b.co', evil, tokens, DEFAULT_EMAIL_SETTINGS, site),
  renderEmailLayout({ title: evil, bodyHtml: kvRows([{ label: 'x', value: evil }]), cta: { label: evil, href: 'mailto:a@b.co' } }),
]

describe('email layout', () => {
  const OLD = process.env.NEXT_PUBLIC_API_URL
  afterEach(() => { process.env.NEXT_PUBLIC_API_URL = OLD })

  it('never contains localhost or a relative img src, even when NEXT_PUBLIC_API_URL is localhost', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
    for (const html of samples()) {
      expect(html).not.toMatch(/localhost/i)
      for (const m of html.matchAll(/<img[^>]*\ssrc="([^"]*)"/g)) expect(m[1]).toMatch(/^(https:\/\/|cid:)/)
    }
  })

  it('every <td> carries a bgcolor attribute', () => {
    for (const html of samples()) {
      for (const m of html.matchAll(/<td\b[^>]*>/g)) expect(m[0]).toMatch(/bgcolor="#[0-9a-fA-F]{6}"/)
    }
    expect(otpBox('1')).toMatch(/<td[^>]*bgcolor/)
  })

  it('escapes every user-supplied field', () => {
    for (const html of samples()) expect(html).not.toContain('<script>')
    for (const html of samples().slice(1)) expect(html).toContain('&lt;script&gt;')
    expect(samples()[0]).toContain('Sonic &lt;b&gt;')
  })

  it('button has inline background and text colours and a safe href', () => {
    const b = bulletproofButton('Go', 'javascript:alert(1)')
    expect(b).toMatch(/background-color:#e31e24/)
    expect(b).toMatch(/color:#ffffff/)
    expect(b).toContain('<font color="#ffffff"')
    expect(b).toContain('href="#"')
  })

  it('invalid theme colours fall back to defaults', () => {
    expect(buildEmailTheme({ brand: 'red;"><x' }).brand).toBe('#e31e24')
  })

  it('logo and base url are absolute https, never localhost', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
    expect(resolveEmailBaseUrl()).toMatch(/^https:\/\//)
    expect(resolveEmailLogo().url).toMatch(/^https:\/\/.+\.png$/)
  })
})
