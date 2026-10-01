import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { generateAccessToken } from '@/lib/auth'

// Mock prisma before importing the route — each model method is an independent vi.fn()
// so a single group's query can be made to reject without affecting the others.
//
// The route now calls prisma.page.findMany TWICE with different `select` shapes: once
// for the "pages" group (flat page rows) and once for the "sections" group (pages with
// a nested `sections` select, spanning every enabled page — see route.ts's "SECTIONS
// GROUP" doc comment). Both calls share the same mocked fn, so tests that care about
// one call shape without the other use mockPageFindManyImpl() below to branch on
// `args.select.sections` the same way this file already branches mockMediaAsset by
// `args.where.mimeType`.
vi.mock('@/lib/prisma', () => ({
  default: {
    page: {
      findMany: vi.fn(),
    },
    mediaAsset: {
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

const mockPage = prisma.page as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockMediaAsset = prisma.mediaAsset as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockClientFeature = prisma.clientFeature as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockPolicy = prisma.policy as unknown as { findMany: ReturnType<typeof vi.fn> }
const mockGetPlugin = getPlugin as unknown as ReturnType<typeof vi.fn>

function makeRequest(role?: UserRole): NextRequest {
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
  return new NextRequest('http://localhost/api/link-catalog', { headers })
}

type PageFindManyArgs = { select?: { sections?: unknown } }

/**
 * Wires prisma.page.findMany to branch on its `select` shape, mirroring how the route
 * itself distinguishes its two independent page queries (see route.ts's "SECTIONS
 * GROUP" doc comment) — same pattern mockMediaAsset.findMany already uses to branch on
 * `args.where.mimeType` below.
 */
function mockPageFindManyImpl(flatPages: unknown[], pagesWithSections: unknown[]) {
  mockPage.findMany.mockImplementation(async (args: PageFindManyArgs) => {
    return args?.select?.sections ? pagesWithSections : flatPages
  })
}

/** Default happy-path mocks: every group's query succeeds with a small non-empty result. */
function mockAllGroupsHealthy() {
  mockPageFindManyImpl(
    [{ slug: 'about', title: 'About Us', type: 'PAGE', enabled: true, status: 'PUBLISHED' }],
    [] // no section anchors needed for these tests
  )
  mockMediaAsset.findMany.mockImplementation(async (args: { where?: { mimeType?: unknown } }) => {
    if (args?.where?.mimeType === 'application/pdf') {
      return [{ url: '/media/doc.pdf', originalName: 'Doc.pdf', filename: 'doc.pdf' }]
    }
    return [{ url: '/media/pic.png', originalName: null, filename: 'pic.png', altText: 'A picture' }]
  })
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
    const res = await GET(makeRequest(UserRole.VIEWER))
    expect(res.status).toBe(200)
    const body = await res.json()
    const keys = body.data.groups.map((g: { key: string }) => g.key)
    expect(keys).toEqual(
      expect.arrayContaining(['pages', 'documents', 'images', 'features', 'policies'])
    )
  })

  // ── Cross-page Sections (the pre-existing gap this feature closes) ───────
  it('returns sections from EVERY enabled page, each value carrying its owning page path', async () => {
    mockAllGroupsHealthy()
    mockPageFindManyImpl(
      [{ slug: 'about', title: 'About Us', type: 'PAGE', enabled: true, status: 'PUBLISHED' }],
      [
        {
          slug: '/',
          title: 'Home',
          sections: [{ id: 'hero-1', navLabel: 'Hero', displayName: null, type: 'HERO', content: {} }],
        },
        {
          slug: 'products',
          title: 'Products',
          sections: [
            { id: 'pricing-1', navLabel: null, displayName: 'Pricing', type: 'FLEXIBLE', content: {} },
          ],
        },
      ]
    )

    const res = await GET(makeRequest(UserRole.VIEWER))
    expect(res.status).toBe(200)
    const body = await res.json()
    const groups: Array<{ key: string; options: Array<{ value: string; label: string }> }> = body.data.groups
    const sections = groups.find((g) => g.key === 'sections')

    expect(sections?.options).toEqual(
      expect.arrayContaining([
        { value: '/#hero-1', label: 'Home: Hero' },
        { value: '/products#pricing-1', label: 'Products: Pricing' },
      ])
    )
  })

  // ── Product deep-link detection (structural, not tied to any template id) ─
  it('annotates a section option with productScope when its content has a bound "template" block', async () => {
    mockAllGroupsHealthy()
    mockPageFindManyImpl(
      [{ slug: 'about', title: 'About Us', type: 'PAGE', enabled: true, status: 'PUBLISHED' }],
      [
        {
          slug: 'products',
          title: 'Products',
          sections: [
            {
              id: 'pricing-1',
              navLabel: null,
              displayName: 'Pricing',
              type: 'FLEXIBLE',
              content: {
                designerData: {
                  blocks: [
                    { id: 1, type: 'template', props: { productTypeSlugs: ['fibre', 'voice'] } },
                  ],
                },
              },
            },
          ],
        },
      ]
    )

    const res = await GET(makeRequest(UserRole.VIEWER))
    const body = await res.json()
    const groups: Array<{ key: string; options: Array<{ value: string; productScope?: unknown }> }> =
      body.data.groups
    const option = groups.find((g) => g.key === 'sections')?.options[0]

    expect(option?.productScope).toEqual({ productTypeSlugs: ['fibre', 'voice'] })
  })

  it('leaves productScope unset for an ordinary section with no bound template block', async () => {
    mockAllGroupsHealthy()
    mockPageFindManyImpl(
      [{ slug: 'about', title: 'About Us', type: 'PAGE', enabled: true, status: 'PUBLISHED' }],
      [
        {
          slug: '/',
          title: 'Home',
          sections: [{ id: 'hero-1', navLabel: 'Hero', displayName: null, type: 'HERO', content: {} }],
        },
      ]
    )

    const res = await GET(makeRequest(UserRole.VIEWER))
    const body = await res.json()
    const groups: Array<{ key: string; options: Array<{ value: string; productScope?: unknown }> }> =
      body.data.groups
    const option = groups.find((g) => g.key === 'sections')?.options[0]

    expect(option?.productScope).toBeUndefined()
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

    const res = await GET(makeRequest(UserRole.VIEWER))

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

  it('degrades the pages group alone when its query throws, sections/media/policy groups unaffected', async () => {
    mockAllGroupsHealthy()
    // Both the "pages" and "sections" groups now share the same prisma.page.findMany fn
    // (see mockPageFindManyImpl) — rejecting only the flat-page-shaped call (and letting
    // the sections-shaped call keep succeeding) demonstrates the two queries still
    // degrade independently, same as any other two groups in this route.
    mockPage.findMany.mockImplementation(async (args: PageFindManyArgs) => {
      if (args?.select?.sections) return []
      throw new Error('simulated page DB failure')
    })

    const res = await GET(makeRequest(UserRole.VIEWER))

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

  it('degrades the sections group alone when its query throws, pages group unaffected', async () => {
    mockAllGroupsHealthy()
    mockPage.findMany.mockImplementation(async (args: PageFindManyArgs) => {
      if (args?.select?.sections) throw new Error('simulated sections DB failure')
      return [{ slug: 'about', title: 'About Us', type: 'PAGE', enabled: true, status: 'PUBLISHED' }]
    })

    const res = await GET(makeRequest(UserRole.VIEWER))

    expect(res.status).toBe(200)
    const body = await res.json()
    const groups: Array<{ key: string; options: unknown[] }> = body.data.groups
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g]))

    expect(byKey.sections).toBeUndefined()
    expect(byKey.pages?.options).toEqual([{ value: '/about', label: 'About Us' }])
  })

  it('still 200s with only builtins when every group throws (never the old whole-request 500)', async () => {
    mockPage.findMany.mockRejectedValue(new Error('down'))
    mockMediaAsset.findMany.mockRejectedValue(new Error('down'))
    mockClientFeature.findMany.mockRejectedValue(new Error('down'))
    mockGetPlugin.mockRejectedValue(new Error('down')) // caught by the route's own getPlugin(...).catch()

    const res = await GET(makeRequest(UserRole.VIEWER))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.groups).toEqual([])
    expect(body.data.builtins).toEqual([{ value: '/', label: 'Home' }])
  })
})
