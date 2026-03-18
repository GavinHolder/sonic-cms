import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/auth'

// Mock prisma before importing the route so vi.mock hoisting intercepts the import
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { POST } from '@/app/api/auth/login/route'
import prisma from '@/lib/prisma'

const mockUser = prisma.user as { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// Helper: get all Set-Cookie header values from a response
function getSetCookies(res: Response): string[] {
  if (typeof (res.headers as unknown as Record<string, unknown>)['getSetCookie'] === 'function') {
    return (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie()
  }
  const raw = res.headers.get('set-cookie') ?? ''
  return raw ? raw.split(/,\s*(?=[a-zA-Z_-]+=)/) : []
}

let validPasswordHash: string

beforeAll(async () => {
  validPasswordHash = await hashPassword('Admin123')
})

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when username is missing', async () => {
    const res = await POST(makeRequest({ password: 'Admin123' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ username: 'alice' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 when user not found', async () => {
    mockUser.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ username: 'nobody', password: 'Admin123' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 403 when user account is inactive', async () => {
    mockUser.findUnique.mockResolvedValue({
      id: 'u1', username: 'alice', email: 'alice@example.com',
      passwordHash: validPasswordHash, isActive: false, role: 'EDITOR',
      firstName: 'Alice', lastName: 'Smith',
    })
    const res = await POST(makeRequest({ username: 'alice', password: 'Admin123' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('USER_INACTIVE')
  })

  it('returns 401 when password does not match', async () => {
    mockUser.findUnique.mockResolvedValue({
      id: 'u1', username: 'alice', email: 'alice@example.com',
      passwordHash: validPasswordHash, isActive: true, role: 'EDITOR',
      firstName: 'Alice', lastName: 'Smith',
    })
    const res = await POST(makeRequest({ username: 'alice', password: 'WrongPass1' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 200 with user data and sets auth cookies on valid login', async () => {
    mockUser.findUnique.mockResolvedValue({
      id: 'u1', username: 'alice', email: 'alice@example.com',
      passwordHash: validPasswordHash, isActive: true, role: 'EDITOR',
      firstName: 'Alice', lastName: 'Smith',
    })
    mockUser.update.mockResolvedValue({})

    const res = await POST(makeRequest({ username: 'alice', password: 'Admin123' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.user.username).toBe('alice')
    expect(body.data.accessToken).toBeDefined()

    const cookies = getSetCookies(res)
    expect(cookies.some(c => c.startsWith('access_token='))).toBe(true)
    expect(cookies.some(c => c.startsWith('refresh_token='))).toBe(true)
  })

  it('calls prisma.user.update with lastLoginAt on successful login', async () => {
    mockUser.findUnique.mockResolvedValue({
      id: 'u1', username: 'alice', email: 'alice@example.com',
      passwordHash: validPasswordHash, isActive: true, role: 'EDITOR',
      firstName: 'Alice', lastName: 'Smith',
    })
    mockUser.update.mockResolvedValue({})

    await POST(makeRequest({ username: 'alice', password: 'Admin123' }))
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      })
    )
  })

  it('returns 500 on unexpected DB error', async () => {
    mockUser.findUnique.mockRejectedValue(new Error('DB connection lost'))
    const res = await POST(makeRequest({ username: 'alice', password: 'Admin123' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('SERVER_ERROR')
  })
})
