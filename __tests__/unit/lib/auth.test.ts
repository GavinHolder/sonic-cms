import { describe, it, expect, beforeAll } from 'vitest'
import { UserRole } from '@prisma/client'
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hasRole,
  validatePassword,
  validateEmail,
  generateRandomPassword,
} from '@/lib/auth'

// ── hashPassword / verifyPassword ────────────────────────────────────────────

describe('hashPassword / verifyPassword', () => {
  it('produces a bcrypt hash string', async () => {
    const hash = await hashPassword('Admin123')
    expect(hash).toMatch(/^\$2[ab]\$/)
  })

  it('verifies correct password', async () => {
    const hash = await hashPassword('Admin123')
    expect(await verifyPassword('Admin123', hash)).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('Admin123')
    expect(await verifyPassword('Wrong456', hash)).toBe(false)
  })
})

// ── generateAccessToken / verifyAccessToken ───────────────────────────────────

describe('generateAccessToken / verifyAccessToken', () => {
  const payload = {
    userId: 'user-1',
    email: 'alice@example.com',
    username: 'alice',
    role: UserRole.EDITOR,
  }

  it('generates a three-part JWT string', () => {
    const token = generateAccessToken(payload)
    expect(token.split('.')).toHaveLength(3)
  })

  it('decodes back to the original payload fields', () => {
    const token = generateAccessToken(payload)
    const decoded = verifyAccessToken(token)
    expect(decoded?.userId).toBe(payload.userId)
    expect(decoded?.email).toBe(payload.email)
    expect(decoded?.username).toBe(payload.username)
    expect(decoded?.role).toBe(payload.role)
  })

  it('returns null for a tampered token', () => {
    const token = generateAccessToken(payload)
    expect(verifyAccessToken(token + 'x')).toBeNull()
  })

  it('returns null for a token signed with the wrong secret', () => {
    // A real token but signed with a different key
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ4In0.bad_sig'
    expect(verifyAccessToken(fakeToken)).toBeNull()
  })
})

// ── generateRefreshToken / verifyRefreshToken ─────────────────────────────────

describe('generateRefreshToken / verifyRefreshToken', () => {
  const payload = {
    userId: 'user-2',
    email: 'bob@example.com',
    username: 'bob',
    role: UserRole.PUBLISHER,
  }

  it('generates a three-part JWT string', () => {
    const token = generateRefreshToken(payload)
    expect(token.split('.')).toHaveLength(3)
  })

  it('decodes back to the original payload', () => {
    const token = generateRefreshToken(payload)
    const decoded = verifyRefreshToken(token)
    expect(decoded?.userId).toBe(payload.userId)
    expect(decoded?.role).toBe(payload.role)
  })

  it('access token cannot be verified as a refresh token', () => {
    const accessToken = generateAccessToken(payload)
    expect(verifyRefreshToken(accessToken)).toBeNull()
  })

  it('refresh token cannot be verified as an access token', () => {
    const refreshToken = generateRefreshToken(payload)
    expect(verifyAccessToken(refreshToken)).toBeNull()
  })
})

// ── hasRole ───────────────────────────────────────────────────────────────────

describe('hasRole', () => {
  it('SUPER_ADMIN passes every role check', () => {
    expect(hasRole(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)).toBe(true)
    expect(hasRole(UserRole.SUPER_ADMIN, UserRole.PUBLISHER)).toBe(true)
    expect(hasRole(UserRole.SUPER_ADMIN, UserRole.EDITOR)).toBe(true)
    expect(hasRole(UserRole.SUPER_ADMIN, UserRole.VIEWER)).toBe(true)
  })

  it('PUBLISHER passes PUBLISHER, EDITOR, VIEWER but not SUPER_ADMIN', () => {
    expect(hasRole(UserRole.PUBLISHER, UserRole.PUBLISHER)).toBe(true)
    expect(hasRole(UserRole.PUBLISHER, UserRole.EDITOR)).toBe(true)
    expect(hasRole(UserRole.PUBLISHER, UserRole.VIEWER)).toBe(true)
    expect(hasRole(UserRole.PUBLISHER, UserRole.SUPER_ADMIN)).toBe(false)
  })

  it('EDITOR passes EDITOR and VIEWER but not PUBLISHER', () => {
    expect(hasRole(UserRole.EDITOR, UserRole.EDITOR)).toBe(true)
    expect(hasRole(UserRole.EDITOR, UserRole.VIEWER)).toBe(true)
    expect(hasRole(UserRole.EDITOR, UserRole.PUBLISHER)).toBe(false)
  })

  it('VIEWER passes only VIEWER', () => {
    expect(hasRole(UserRole.VIEWER, UserRole.VIEWER)).toBe(true)
    expect(hasRole(UserRole.VIEWER, UserRole.EDITOR)).toBe(false)
  })
})

// ── validatePassword ──────────────────────────────────────────────────────────

describe('validatePassword', () => {
  it('returns null for a valid password', () => {
    expect(validatePassword('Admin123')).toBeNull()
  })

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('Ab1')).not.toBeNull()
  })

  it('rejects passwords missing uppercase letter', () => {
    expect(validatePassword('admin123')).not.toBeNull()
  })

  it('rejects passwords missing lowercase letter', () => {
    expect(validatePassword('ADMIN123')).not.toBeNull()
  })

  it('rejects passwords missing a number', () => {
    expect(validatePassword('AdminAdmin')).not.toBeNull()
  })
})

// ── validateEmail ─────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('accepts a valid email address', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('rejects an address missing the @', () => {
    expect(validateEmail('userexample.com')).toBe(false)
  })

  it('rejects an address with no domain after @', () => {
    expect(validateEmail('user@')).toBe(false)
  })
})

// ── generateRandomPassword ────────────────────────────────────────────────────

describe('generateRandomPassword', () => {
  it('defaults to 12 characters', () => {
    expect(generateRandomPassword()).toHaveLength(12)
  })

  it('respects a custom length', () => {
    expect(generateRandomPassword(20)).toHaveLength(20)
  })
})
