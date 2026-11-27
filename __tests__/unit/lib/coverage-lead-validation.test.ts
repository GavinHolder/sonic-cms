import { describe, it, expect } from 'vitest'
import {
  validateLeadContact,
  validateLeadPayload,
  describeLeadFailure,
  LEAD_NOT_RECEIVED_MESSAGE,
} from '@/lib/coverage/lead-validation'

const good = { name: 'Jane Doe', email: 'jane@example.com', phone: '082 123 4567' }

describe('validateLeadContact', () => {
  it('accepts and trims a valid contact', () => {
    const r = validateLeadContact({ name: '  Jane Doe ', email: ' jane@example.com ', phone: ' +27 (82) 123-4567 ' })
    expect(r).toEqual({ ok: true, value: { name: 'Jane Doe', email: 'jane@example.com', phone: '+27 (82) 123-4567' } })
  })

  it('reports every invalid field and the first one in form order', () => {
    const r = validateLeadContact({ name: '', email: 'nope', phone: '' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['email', 'name', 'phone'])
    expect(r.firstInvalid).toBe('name')
    expect(r.message).toBe(r.errors.name)
  })

  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['one character', 'J'],
    ['101 characters', 'a'.repeat(101)],
    ['non-string', 42],
    ['CR/LF', 'Jane\r\nBcc: x@evil.test'],
    ['trailing LF', 'Jane Doe\n'],
  ])('rejects a name that is %s', (_label, name) => {
    const r = validateLeadContact({ ...good, name })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.firstInvalid).toBe('name')
  })

  it('accepts a 2 and a 100 character name', () => {
    expect(validateLeadContact({ ...good, name: 'Jo' }).ok).toBe(true)
    expect(validateLeadContact({ ...good, name: 'a'.repeat(100) }).ok).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['no @', 'jane.example.com'],
    ['no domain dot', 'jane@example'],
    ['two addresses', 'a@b.com,c@d.com'],
    ['semicolon list', 'a@b.com;c@d.com'],
    ['inner space', 'ja ne@example.com'],
    ['CR/LF', 'jane@example.com\r\nBcc: x@evil.test'],
    ['over 254 characters', `${'a'.repeat(250)}@b.co`],
    ['non-string', null],
  ])('rejects an email that is %s', (_label, email) => {
    const r = validateLeadContact({ ...good, email })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.firstInvalid).toBe('email')
  })

  it.each([
    ['empty', ''],
    ['too short', '12345'],
    ['letters', '082 CALL ME'],
    ['over 20 characters', '0'.repeat(21)],
    ['only punctuation', '(((((((('],
    ['CR/LF', '0821234567\n0821234567'],
    ['non-string', undefined],
  ])('rejects a phone that is %s', (_label, phone) => {
    const r = validateLeadContact({ ...good, phone })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.firstInvalid).toBe('phone')
  })

  it('does not mutate its input', () => {
    const input = Object.freeze({ name: ' Jane Doe ', email: 'jane@example.com', phone: '0821234567' })
    expect(() => validateLeadContact(input)).not.toThrow()
    expect(input.name).toBe(' Jane Doe ')
  })
})

describe('validateLeadPayload', () => {
  const body = { ...good, address: '1 Main Rd', networkId: 'net1', packageId: 'pkg1', addonIds: ['a1'], miss: false }

  it('normalises a full payload', () => {
    expect(validateLeadPayload(body)).toEqual({
      ok: true,
      value: { ...good, address: '1 Main Rd', networkId: 'net1', packageId: 'pkg1', addonIds: ['a1'], miss: false },
    })
  })

  it('treats absent optional parts as empty (miss path)', () => {
    const r = validateLeadPayload({ ...good, miss: true, networkId: null, packageId: null })
    expect(r).toEqual({ ok: true, value: { ...good, address: '', networkId: null, packageId: null, addonIds: [], miss: true } })
  })

  it('names the invalid contact field', () => {
    const r = validateLeadPayload({ ...body, phone: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.field).toBe('phone')
  })

  it.each([
    ['null body', null],
    ['array body', []],
    ['string body', 'x'],
    ['address over 300', { ...body, address: 'a'.repeat(301) }],
    ['non-string address', { ...body, address: { a: 1 } }],
    ['more than 20 add-ons', { ...body, addonIds: Array.from({ length: 21 }, (_, i) => `a${i}`) }],
    ['add-ons not an array', { ...body, addonIds: 'a1' }],
    ['non-string add-on id', { ...body, addonIds: [1] }],
    ['add-on id over 64', { ...body, addonIds: ['a'.repeat(65)] }],
    ['network id over 64', { ...body, networkId: 'n'.repeat(65) }],
    ['non-string network id', { ...body, networkId: 7 }],
    ['package id over 64', { ...body, packageId: 'p'.repeat(65) }],
    ['non-string package id', { ...body, packageId: { id: 'x' } }],
  ])('rejects %s', (_label, input) => {
    const r = validateLeadPayload(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0)
  })

  it('accepts exactly 20 add-ons and a 300 character address', () => {
    const r = validateLeadPayload({ ...body, address: 'a'.repeat(300), addonIds: Array.from({ length: 20 }, (_, i) => `a${i}`) })
    expect(r.ok).toBe(true)
  })
})

describe('describeLeadFailure', () => {
  it('shows the server message for a 400', () => {
    expect(describeLeadFailure(400, 'Enter a valid email address.', null)).toBe('Enter a valid email address.')
  })

  it('turns Retry-After seconds into minutes for a 429', () => {
    expect(describeLeadFailure(429, 'Too many submissions.', '540')).toBe('Too many requests. Please try again in 9 minutes.')
    expect(describeLeadFailure(429, null, '30')).toBe('Too many requests. Please try again in 1 minute.')
  })

  it('falls back to a generic wait when Retry-After is missing or junk', () => {
    expect(describeLeadFailure(429, null, null)).toBe('Too many requests. Please try again in a few minutes.')
    expect(describeLeadFailure(429, null, 'soon')).toBe('Too many requests. Please try again in a few minutes.')
  })

  it('is honest that nothing was received for 5xx, never echoing the server text', () => {
    expect(describeLeadFailure(502, 'internal detail', null)).toBe(LEAD_NOT_RECEIVED_MESSAGE)
    expect(describeLeadFailure(500, null, null)).toBe(LEAD_NOT_RECEIVED_MESSAGE)
    expect(LEAD_NOT_RECEIVED_MESSAGE).toMatch(/not received/i)
  })

  it('uses the not-received message for a 400 with no readable body', () => {
    expect(describeLeadFailure(400, null, null)).toBe(LEAD_NOT_RECEIVED_MESSAGE)
  })
})
