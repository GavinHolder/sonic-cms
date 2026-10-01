import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { generateAccessToken } from '@/lib/auth'

// Mock prisma before importing the route
vi.mock('@/lib/prisma', () => ({
  default: {
    page: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    section: { update: vi.fn(), updateMany: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}))

import { POST } from '@/app/api/pages/[slug]/publish/route'
import prisma from '@/lib/prisma'

const mockPage = prisma.page as {
  findUnique: ReturnType<typeof vi.fn>
  updateMany: ReturnType<typeof vi.fn>
}
const mockSection = prisma.section as unknown as {
  update: ReturnType<typeof vi.fn>
  updateMany: ReturnType<typeof vi.fn>
}
const mockExecuteRaw = prisma.$executeRaw as unknown as ReturnType<typeof vi.fn>

// Builds a request + params pair for the route handler
function makeRequest(slug: string, role?: UserRole): {
  req: NextRequest
  params: Promise<{ slug: string }>
} {
  const headers: Record<string, string> = {}
  if (role) {
    const token = generateAccessToken({
      userId: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      role,
    })
    headers['cookie'] = `access_token=${token}`
  }
  return {
    req: new NextRequest(`http://localhost/api/pages/${encodeURIComponent(slug)}/publish`, {
      method: 'POST',
      headers,
    }),
    params: Promise.resolve({ slug }),
  }
}

describe('POST /api/pages/[slug]/publish', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 with no auth token', async () => {
    const { req, params } = makeRequest('test-page')
    const res = await POST(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as EDITOR (requires PUBLISHER)', async () => {
    const { req, params } = makeRequest('test-page', UserRole.EDITOR)
    const res = await POST(req, { params })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns 400 for slug containing invalid characters', async () => {
    const { req, params } = makeRequest('<script>xss</script>', UserRole.PUBLISHER)
    const res = await POST(req, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_SLUG')
  })

  it('returns 404 when page does not exist', async () => {
    mockPage.updateMany.mockResolvedValue({ count: 0 })
    mockPage.findUnique.mockResolvedValue(null)
    const { req, params } = makeRequest('missing-page', UserRole.PUBLISHER)
    const res = await POST(req, { params })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('PAGE_NOT_FOUND')
  })

  it('returns 400 when page is already published', async () => {
    mockPage.updateMany.mockResolvedValue({ count: 0 })
    mockPage.findUnique.mockResolvedValue({ id: 'p1' })
    const { req, params } = makeRequest('my-page', UserRole.PUBLISHER)
    const res = await POST(req, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('ALREADY_PUBLISHED')
  })

  it('returns 200 and flips status only for a draft page (no raw SQL, no section writes)', async () => {
    mockPage.updateMany.mockResolvedValue({ count: 1 })
    mockPage.findUnique.mockResolvedValue({
      id: 'p1',
      slug: 'my-page',
      title: 'My Page',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      sections: [],
      createdByUser: { username: 'admin' },
    })

    const { req, params } = makeRequest('my-page', UserRole.PUBLISHER)
    const res = await POST(req, { params })
    expect(res.status).toBe(200)
    expect(mockPage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slug: 'my-page' }),
        data: expect.objectContaining({ status: 'PUBLISHED', publishedBy: 'user-1' }),
      })
    )
    expect(mockExecuteRaw).not.toHaveBeenCalled()
    expect(mockSection.update).not.toHaveBeenCalled()
    expect(mockSection.updateMany).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.page.slug).toBe('my-page')
    expect(body.data.page.status).toBe('PUBLISHED')
  })

  it('returns 500 on unexpected DB error', async () => {
    mockPage.updateMany.mockRejectedValue(new Error('DB connection lost'))
    const { req, params } = makeRequest('my-page', UserRole.PUBLISHER)
    const res = await POST(req, { params })
    expect(res.status).toBe(500)
  })
})
