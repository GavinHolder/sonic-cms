import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { generateRefreshToken, verifyAccessToken } from '@/lib/auth'
import { POST } from '@/app/api/auth/refresh/route'

const testPayload = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  role: UserRole.EDITOR,
}

// Helper: get all Set-Cookie header values from a response
function getSetCookies(res: Response): string[] {
  if (typeof (res.headers as unknown as Record<string, unknown>)['getSetCookie'] === 'function') {
    return (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie()
  }
  const raw = res.headers.get('set-cookie') ?? ''
  return raw ? raw.split(/,\s*(?=[a-zA-Z_-]+=)/) : []
}

function makeRequest(cookieHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (cookieHeader) headers['cookie'] = cookieHeader
  return new NextRequest('http://localhost/api/auth/refresh', { method: 'POST', headers })
}

describe('POST /api/auth/refresh', () => {
  it('returns 401 when no refresh_token cookie present', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('NO_REFRESH_TOKEN')
  })

  it('returns 401 for an invalid refresh token', async () => {
    const res = await POST(makeRequest('refresh_token=invalid.garbage.token'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('returns 200 and sets a new access_token cookie for a valid refresh token', async () => {
    const refreshToken = generateRefreshToken(testPayload)
    const res = await POST(makeRequest(`refresh_token=${refreshToken}`))
    expect(res.status).toBe(200)
    const cookies = getSetCookies(res)
    expect(cookies.some(c => c.startsWith('access_token='))).toBe(true)
  })

  it('new access token contains the same user payload as the refresh token', async () => {
    const refreshToken = generateRefreshToken(testPayload)
    const res = await POST(makeRequest(`refresh_token=${refreshToken}`))
    const cookies = getSetCookies(res)
    const accessCookie = cookies.find(c => c.startsWith('access_token='))
    const tokenValue = accessCookie?.split(';')[0].replace('access_token=', '')
    expect(tokenValue).toBeDefined()
    const decoded = verifyAccessToken(tokenValue!)
    expect(decoded?.userId).toBe(testPayload.userId)
    expect(decoded?.role).toBe(testPayload.role)
  })
})
