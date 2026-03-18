import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { generateAccessToken } from '@/lib/auth'
import {
  authenticate,
  requireAuth,
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-middleware'

// Helper: build a NextRequest with an optional Cookie header
function makeRequest(cookieHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (cookieHeader) headers['cookie'] = cookieHeader
  return new NextRequest('http://localhost/test', { headers })
}

const testPayload = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  role: UserRole.PUBLISHER,
}

// ── authenticate ──────────────────────────────────────────────────────────────

describe('authenticate', () => {
  it('returns null when no access_token cookie', () => {
    expect(authenticate(makeRequest())).toBeNull()
  })

  it('returns null for an invalid token value', () => {
    expect(authenticate(makeRequest('access_token=not.a.jwt'))).toBeNull()
  })

  it('returns the decoded payload for a valid access token', () => {
    const token = generateAccessToken(testPayload)
    const result = authenticate(makeRequest(`access_token=${token}`))
    expect(result?.userId).toBe(testPayload.userId)
    expect(result?.role).toBe(UserRole.PUBLISHER)
  })
})

// ── requireAuth ───────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('returns a 401 response when no token present', async () => {
    const result = requireAuth(makeRequest())
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(401)
    const body = await (result as Response).json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns the user payload when authenticated', () => {
    const token = generateAccessToken(testPayload)
    const result = requireAuth(makeRequest(`access_token=${token}`))
    expect(result).not.toBeInstanceOf(Response)
    expect((result as typeof testPayload).userId).toBe('user-1')
  })
})

// ── requireRole ───────────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('returns 401 when no token present', () => {
    const result = requireRole(makeRequest(), UserRole.VIEWER)
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(401)
  })

  it('returns 403 when role is insufficient', async () => {
    const viewerToken = generateAccessToken({ ...testPayload, role: UserRole.VIEWER })
    const result = requireRole(makeRequest(`access_token=${viewerToken}`), UserRole.PUBLISHER)
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(403)
    const body = await (result as Response).json()
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns the user payload when role is sufficient', () => {
    const token = generateAccessToken(testPayload) // PUBLISHER
    const result = requireRole(makeRequest(`access_token=${token}`), UserRole.EDITOR) // PUBLISHER >= EDITOR
    expect(result).not.toBeInstanceOf(Response)
    expect((result as typeof testPayload).userId).toBe('user-1')
  })
})

// ── successResponse ───────────────────────────────────────────────────────────

describe('successResponse', () => {
  it('returns 200 with success:true and data', async () => {
    const res = successResponse({ id: 42 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(42)
  })

  it('accepts a custom status code and meta', async () => {
    const res = successResponse({ ok: true }, 201, { total: 5 })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.meta.total).toBe(5)
  })
})

// ── errorResponse ─────────────────────────────────────────────────────────────

describe('errorResponse', () => {
  it('returns the given status and error code', async () => {
    const res = errorResponse('NOT_FOUND', 'Not found', 404)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('Not found')
  })

  it('includes field when provided', async () => {
    const res = errorResponse('VALIDATION_ERROR', 'Invalid email', 400, 'email')
    const body = await res.json()
    expect(body.error.field).toBe('email')
  })

  it('omits field when not provided', async () => {
    const res = errorResponse('SERVER_ERROR', 'Oops', 500)
    const body = await res.json()
    expect(body.error.field).toBeUndefined()
  })
})

// ── handleApiError ────────────────────────────────────────────────────────────

describe('handleApiError', () => {
  it('maps Prisma P2002 (duplicate) to 409', async () => {
    const res = handleApiError({ code: 'P2002' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('DUPLICATE_ENTRY')
  })

  it('maps Prisma P2025 (not found) to 404', async () => {
    const res = handleApiError({ code: 'P2025' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('maps ZodError to 400 with field', async () => {
    const zodError = {
      name: 'ZodError',
      errors: [{ message: 'Invalid email', path: ['email'] }],
    }
    const res = handleApiError(zodError)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.field).toBe('email')
  })

  it('maps unknown errors to 500', async () => {
    const res = handleApiError(new Error('Something unexpected'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('SERVER_ERROR')
  })
})
