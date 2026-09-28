import { describe, it, expect, vi, beforeEach } from 'vitest'

// lib/email.ts imports @/lib/prisma (directly, and transitively via brand-tokens/email-settings);
// none of these tests need a real DB, so a minimal mock keeps module import safe in this environment.
vi.mock('@/lib/prisma', () => {
  const prisma = { siteConfig: { findFirst: vi.fn(async () => null) } }
  return { prisma, default: prisma }
})

import { sanitizeRecipient, sanitizeRecipientList, extractAddress, sendSubmissionEmail } from '@/lib/email'

describe('extractAddress', () => {
  it('pulls the address out of a "Display Name <addr>" wrapper', () => {
    expect(extractAddress('Ops Team <ops@example.com>')).toBe('ops@example.com')
  })

  it('returns the trimmed input unchanged when there is no wrapper', () => {
    expect(extractAddress('  plain@example.com  ')).toBe('plain@example.com')
  })
})

describe('sanitizeRecipient (single address — visitor-supplied fields like Reply-To)', () => {
  it('accepts a bare address', () => {
    expect(sanitizeRecipient('a@example.com')).toBe('a@example.com')
  })

  it('accepts and unwraps a "Display Name <addr>" address', () => {
    expect(sanitizeRecipient('Jane Doe <jane@example.com>')).toBe('jane@example.com')
  })

  it('strips embedded CR/LF (header injection attempt)', () => {
    expect(sanitizeRecipient('a@example.com\r\nBcc: evil@evil.com')).toBe('')
  })

  it('rejects a comma-separated multi-address string (single-address contract)', () => {
    expect(sanitizeRecipient('a@x.com,b@y.com')).toBe('')
  })

  it('rejects non-string and malformed input', () => {
    expect(sanitizeRecipient(undefined)).toBe('')
    expect(sanitizeRecipient(null)).toBe('')
    expect(sanitizeRecipient(42)).toBe('')
    expect(sanitizeRecipient('not-an-email')).toBe('')
    expect(sanitizeRecipient('')).toBe('')
  })
})

describe('sanitizeRecipientList (admin-configured recipients — supports multiple)', () => {
  it('accepts a bare single address', () => {
    expect(sanitizeRecipientList('boss@example.com')).toBe('boss@example.com')
  })

  it('accepts and unwraps a single "Display Name <addr>" address', () => {
    expect(sanitizeRecipientList('Boss Person <boss@example.com>')).toBe('boss@example.com')
  })

  it('accepts a comma-separated list, unwrapping display names on each entry', () => {
    expect(sanitizeRecipientList('Ops <ops@example.com>, boss@example.com')).toBe('ops@example.com, boss@example.com')
  })

  it('accepts a semicolon-separated list', () => {
    expect(sanitizeRecipientList('a@example.com; b@example.com')).toBe('a@example.com, b@example.com')
  })

  it('accepts a semicolon-separated list with a "Display Name <addr>" entry mixed in', () => {
    expect(sanitizeRecipientList('Ops Team <ops@example.com>; boss@example.com')).toBe(
      'ops@example.com, boss@example.com'
    )
  })

  it('accepts a mix of commas and semicolons as separators', () => {
    expect(sanitizeRecipientList('a@example.com, b@example.com; c@example.com')).toBe(
      'a@example.com, b@example.com, c@example.com'
    )
  })

  it('drops invalid entries but keeps the valid ones, logging a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(sanitizeRecipientList('good@example.com, not-an-email, also-good@example.com')).toBe(
      'good@example.com, also-good@example.com'
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dropping invalid recipient'))
    warn.mockRestore()
  })

  it('strips embedded CR/LF (header injection collapses into the adjacent entry and is rejected, not smuggled through)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = sanitizeRecipientList('a@example.com\r\nBcc: evil@evil.com, b@example.com')
    expect(result).toBe('b@example.com') // the CRLF-joined garbage entry is dropped, not a valid recipient
    expect(result).not.toContain('\r')
    expect(result).not.toContain('\n')
    warn.mockRestore()
  })

  it('returns "" when every entry is invalid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(sanitizeRecipientList('not-an-email, also-bad')).toBe('')
    warn.mockRestore()
  })

  it('the CRLF-injection guard still holds with a semicolon separator: garbage is dropped, not smuggled through', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = sanitizeRecipientList('a@b.com; evil\r\nBcc:x')
    expect(result).toBe('a@b.com')
    expect(result).not.toContain('\r')
    expect(result).not.toContain('\n')
    warn.mockRestore()
  })

  it('returns "" for non-string and empty input', () => {
    expect(sanitizeRecipientList(undefined)).toBe('')
    expect(sanitizeRecipientList('')).toBe('')
  })
})

describe('sendSubmissionEmail — empty-recipient path is loud, not silent', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('logs console.error and sends nothing when emailTo and admin_email are both unusable', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await sendSubmissionEmail(
      [{ label: 'Name', value: 'Lead' }],
      'lead@example.com',
      { admin_email: 'not-an-email' }, // misconfigured
      'Smoke Source',
      'also-not-an-email' // forged/misconfigured emailTo
    )
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining('no usable recipient after sanitization'),
      expect.objectContaining({ emailToRaw: 'also-not-an-email', adminEmailRaw: 'not-an-email' })
    )
    err.mockRestore()
  })

  it('does not log an error when a usable admin_email fallback exists', async () => {
    // recipient resolves via admin_email, so createTransporter() runs next and throws (no SMTP
    // configured in this unit test) — that's expected and unrelated to the assertion below.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await sendSubmissionEmail(
      [{ label: 'Name', value: 'Lead' }],
      'lead@example.com',
      { admin_email: 'admin@example.com' },
      'Smoke Source'
    ).catch(() => {})
    expect(err).not.toHaveBeenCalledWith(expect.stringContaining('no usable recipient after sanitization'), expect.anything())
    err.mockRestore()
  })
})
