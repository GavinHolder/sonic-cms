import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/logout/route'

// Helper: get all Set-Cookie header values from a response
function getSetCookies(res: Response): string[] {
  if (typeof (res.headers as unknown as Record<string, unknown>)['getSetCookie'] === 'function') {
    return (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie()
  }
  const raw = res.headers.get('set-cookie') ?? ''
  return raw ? raw.split(/,\s*(?=[a-zA-Z_-]+=)/) : []
}

describe('POST /api/auth/logout', () => {
  it('returns 200 with a success message', async () => {
    const req = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.message.toLowerCase()).toContain('logged out')
  })

  it('sends Set-Cookie headers deleting both auth cookies', async () => {
    const req = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' })
    const res = await POST(req)
    const cookies = getSetCookies(res)
    // Cookie deletion = cookie name present in Set-Cookie with Max-Age=0 or empty value
    const accessDeleted = cookies.some(c =>
      c.startsWith('access_token=') &&
      (c.includes('Max-Age=0') || c.includes('max-age=0') || c.includes('Expires='))
    )
    const refreshDeleted = cookies.some(c =>
      c.startsWith('refresh_token=') &&
      (c.includes('Max-Age=0') || c.includes('max-age=0') || c.includes('Expires='))
    )
    expect(accessDeleted).toBe(true)
    expect(refreshDeleted).toBe(true)
  })
})
