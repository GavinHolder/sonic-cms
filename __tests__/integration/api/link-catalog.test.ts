import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { generateAccessToken } from '@/lib/auth'

// Mock prisma before importing the route — each model method is an independent vi.fn()
// so a single group's query can be made to reject without affecting the others.
vi.mock('@/lib/prisma', () => ({
  default: {
    page: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    mediaAsset: {
      findMany: vi.fn(),
    },
    section: {
      findMany: vi.fn(),
    },
    clientFeature: {
      findMany: vi.fn(),
    },
    policy: {
      findMany: vi.fn(),
    },
  },
}))

// getPlugin talks to prisma.plugin internally; mock the registry function directly
// rather than adding a prisma.plugin mock, matching how the route itself only
// depends on this function's return value.
vi.mock('@/lib/plugins/registry', () => ({
  getPlugin: vi.fn(),
}))

import { GET } from '@/app/api/link-catalog/route'
import prisma from '@/lib/prisma'
import { getPlugin } from '@/lib/plugins/registry'

const mockPage = prisma.page as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
}
const mockMediaAsset = prisma.mediaAsset as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockSection = prisma.section as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockClientFeature = prisma.clientFeature as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockPolicy = prisma.policy as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockGetPlugin = getPlugin as unknown as ReturnType<typeof vi.fn>

function makeRequest(pageSlug?: string, role?: UserRole): NextRequest {
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
  const url = pageSlug
    ? `http://localhost/api/link-catalog?pageSlug=${encodeURIComponent(pageSlug)}`
    : 'http://localhost/api/link-catalog'
  return new NextRequest(url, { headers })
}

/** Default happy-path mocks: every group's query succeeds with a small non-empty result. */
function mockAllGroupsHealthy() {
  mockPage.findMany.mockResolvedValue([
    { slug: 'about', title: 'About Us', type: 'PAGE', enabled: true, status: 'PUBLISHED' },
  ])
  mockPage.findUnique.mockResolvedValue(null) // no section anchors needed for these tests
  mockMediaAsset.findMany.mockImplementation(async (args: { where?: { mimeType?: unknown } }) => {
    if (args?.where?.mimeType === 'application/pdf') {
      return [{ url: '/media/doc.pdf', originalName: 'Doc.pdf', filename: 'doc.pdf' }]
    }
    return [{ url: '/media/pic.png', originalName: null, filename: 'pic.png', altText: 'A picture' }]
  })
  mockSection.findMany.mockResolvedValue([])
  mockClientFeature.findMany.mockResolvedValue([{ slug: 'coverage-map', name: 'Coverage Map' }])
  mockPolicy.findMany.mockResolvedValue([{ slug: 'privacy', title: 'Privacy Policy', navLabel: null }])
  mockGetPlugin.mockResolvedValue({ enabled: true })
}

describe('GET /api/link-catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 with no auth token', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns every non-empty group when all data sources succeed', async () => {
    mockAllGroupsHealthy()
    const res = await GET(makeRequest(undefined, UserRole.VIEWER))
    expect(res.status).toBe(200)
    const body = await res.json()
    const keys = body.data.groups.map((g: { key: string }) => g.key)
    expect(keys).toEqual(
      expect.arrayContaining(['pages', 'documents', 'images', 'features', 'policies'])
    )
  })

  // ── The regression this test guards against ──────────────────────────────
  // Before the per-group try/catch, ANY single group's query throwing (most
  // commonly: an expired admin session hitting a downstream check, or any
  // other transient DB hiccup) rejected the whole Promise.all and the route's
  // outer catch turned the ENTIRE request into a 500 — collapsing every
  // picker group (pages, sections, documents, images, policies) at once, not
  // just the failing one. That's the exact user-visible symptom LinkPicker
  // was built to avoid (see app/api/link-catalog/route.ts FAILURE MODES).
  it('degrades only the failing group to empty when one data source throws, others stay populated', async () => {
    mockAllGroupsHealthy()
    mockClientFeature.findMany.mockRejectedValue(new Error('simulated clientFeature DB failure'))

    const res = await GET(makeRequest(undefined, UserRole.VIEWER))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const groups: Array<{ key: string; options: unknown[] }> = body.data.groups
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g]))

    // The failing group is silently omitted (route filters empty-options groups)...
    expect(byKey.features).toBeUndefined()

    // ...but every other, independently-fetched group is still fully populated.
    expect(byKey.pages?.options).toEqual([{ value: '/about', label: 'About Us' }])
    expect(byKey.documents?.options.length).toBeGreaterThan(0)
    expect(byKey.images?.options.length).toBeGreaterThan(0)
    expect(byKey.policies?.options.length).toBeGreaterThan(0)
  })

  it('degrades the pages group alone when prisma.page.findMany throws, media/policy groups unaffected', async () => {
    mockAllGroupsHealthy()
    mockPage.findMany.mockRejectedValue(new Error('simulated page DB failure'))

    const res = await GET(makeRequest(undefined, UserRole.VIEWER))

    expect(res.status).toBe(200)
    const body = await res.json()
    const groups: Array<{ key: string; options: unknown[] }> = body.data.groups
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g]))

    expect(byKey.pages).toBeUndefined()
    expect(byKey.forms).toBeUndefined()
    expect(byKey.images?.options.length).toBeGreaterThan(0)
    expect(byKey.features?.options.length).toBeGreaterThan(0)
    expect(byKey.policies?.options.length).toBeGreaterThan(0)
  })

  it('still 200s with only builtins when every group throws (never the old whole-request 500)', async () => {
    mockPage.findMany.mockRejectedValue(new Error('down'))
    mockPage.findUnique.mockRejectedValue(new Error('down'))
    mockMediaAsset.findMany.mockRejectedValue(new Error('down'))
    mockClientFeature.findMany.mockRejectedValue(new Error('down'))
    mockGetPlugin.mockRejectedValue(new Error('down')) // caught by the route's own getPlugin(...).catch()

    const res = await GET(makeRequest(undefined, UserRole.VIEWER))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.groups).toEqual([])
    expect(body.data.builtins).toEqual([{ value: '/', label: 'Home' }])
  })
})
