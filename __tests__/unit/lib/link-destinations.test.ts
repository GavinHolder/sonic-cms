import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  buildCatalog,
  flattenCatalog,
  loadCatalogRows,
  searchMedia,
  mediaWhere,
  FEATURE_ROUTES,
  NOT_LINKABLE_PUBLIC_ROUTES,
  MAX_CONTENT_ENTRIES,
  MEDIA_MAX_PER_PAGE,
  type CatalogRows,
} from '@/lib/link-destinations'
import { BUILTIN_MANIFESTS } from '@/lib/plugins/manifests'

const empty = (): CatalogRows => ({
  pages: [],
  sections: [],
  plugins: [],
  clientFeatures: [],
  policies: [],
  galleryCategories: [],
  contentTypes: [],
  contentEntries: [],
})

const find = (rows: CatalogRows, value: string, opts = {}) =>
  flattenCatalog(buildCatalog(rows, opts)).find((i) => i.value === value)

describe('buildCatalog - built-ins', () => {
  it('always offers Home and Back to Top, even from an empty database', () => {
    const c = buildCatalog(empty())
    expect(c.groups.map((g) => g.id)).toContain('builtin')
    const values = flattenCatalog(c).map((i) => i.value)
    expect(values).toContain('/')
    expect(values).toContain('#top')
  })

  it('omits empty groups other than built-in', () => {
    const c = buildCatalog(empty())
    expect(c.groups.filter((g) => g.id !== 'builtin' && g.id !== 'features')).toEqual([])
  })
})

describe('buildCatalog - feature route gates (each route uses ITS OWN enable source)', () => {
  it('Coverage Map is selectable only when ClientFeature "coverage-maps" is enabled', () => {
    const on = { ...empty(), clientFeatures: [{ slug: 'coverage-maps', enabled: true }] }
    const off = { ...empty(), clientFeatures: [{ slug: 'coverage-maps', enabled: false }] }
    expect(find(on, '/coverage')?.disabled).toBeUndefined()
    expect(find(on, '/coverage')?.label).toBe('Coverage Map')
    expect(find(off, '/coverage')?.disabled).toBe(true)
    expect(find(off, '/coverage')?.label).toMatch(/feature off/)
  })

  it('a missing ClientFeature row counts as disabled (the route 404s without the row)', () => {
    expect(find(empty(), '/coverage')?.disabled).toBe(true)
    expect(find(empty(), '/calculator')?.disabled).toBe(true)
  })

  it('the Plugin table does NOT open a ClientFeature-gated route (the two sources can disagree)', () => {
    const rows = { ...empty(), plugins: [{ slug: 'coverage-maps', enabled: true }], clientFeatures: [{ slug: 'coverage-maps', enabled: false }] }
    expect(find(rows, '/coverage')?.disabled).toBe(true)
  })

  it('Concrete Calculator follows ClientFeature "concrete-calculator"', () => {
    const rows = { ...empty(), clientFeatures: [{ slug: 'concrete-calculator', enabled: true }] }
    expect(find(rows, '/calculator')?.disabled).toBeUndefined()
  })
})

describe('buildCatalog - policies (gated by Plugin.enabled + Policy.enabled)', () => {
  const policies = [
    { slug: 'privacy', title: 'Privacy Policy', navLabel: null, enabled: true, order: 1 },
    { slug: 'terms', title: 'Terms', navLabel: 'T&Cs', enabled: false, order: 2 },
  ]

  it('plugin on: enabled policy selectable, disabled policy flagged, index selectable', () => {
    const rows = { ...empty(), plugins: [{ slug: 'policies', enabled: true }], policies }
    expect(find(rows, '/policies')?.disabled).toBeUndefined()
    expect(find(rows, '/policies/privacy')?.disabled).toBeUndefined()
    expect(find(rows, '/policies/privacy')?.label).toBe('Privacy Policy')
    const terms = find(rows, '/policies/terms')
    expect(terms?.disabled).toBe(true)
    expect(terms?.label).toBe('T&Cs (disabled)')
  })

  it('plugin off: every policy AND the index are flagged, but still present so saved values preselect', () => {
    const rows = { ...empty(), plugins: [{ slug: 'policies', enabled: false }], policies }
    expect(find(rows, '/policies')?.disabled).toBe(true)
    expect(find(rows, '/policies/privacy')?.disabled).toBe(true)
    expect(find(rows, '/policies/privacy')?.label).toMatch(/plugin off/)
  })

  it('a ClientFeature row named "policies" does not open the route (the route checks Plugin)', () => {
    const rows = { ...empty(), clientFeatures: [{ slug: 'policies', enabled: true }], policies }
    expect(find(rows, '/policies/privacy')?.disabled).toBe(true)
  })

  it('no policies and plugin off -> no Policies group at all', () => {
    const c = buildCatalog(empty())
    expect(c.groups.find((g) => g.id === 'policies')).toBeUndefined()
  })

  it('policies keep their configured order', () => {
    const rows = { ...empty(), plugins: [{ slug: 'policies', enabled: true }], policies: [policies[1], policies[0]] }
    const g = buildCatalog(rows).groups.find((x) => x.id === 'policies')!
    expect(g.items.map((i) => i.value)).toEqual(['/policies', '/policies/privacy', '/policies/terms'])
  })
})

describe('buildCatalog - pages', () => {
  const page = (o: Partial<CatalogRows['pages'][number]>) => ({ slug: 'about', title: 'About', type: 'FULL_PAGE', enabled: true, status: 'PUBLISHED', ...o })

  it('published+enabled routable page: selectable, value is /slug', () => {
    const i = find({ ...empty(), pages: [page({})] }, '/about')
    expect(i?.disabled).toBeUndefined()
    expect(i?.group).toBe('pages')
    expect(i?.hint).toBe('/about')
  })

  it('disabled page and draft page are flagged, not dropped', () => {
    const d = find({ ...empty(), pages: [page({ enabled: false })] }, '/about')
    expect(d?.disabled).toBe(true)
    expect(d?.label).toBe('About (disabled)')
    const dr = find({ ...empty(), pages: [page({ status: 'DRAFT' })] }, '/about')
    expect(dr?.disabled).toBe(true)
    expect(dr?.label).toBe('About (draft)')
  })

  it('forms and PDF pages are linkable as soon as they are enabled (no publish flow) and land in their own groups', () => {
    const rows = { ...empty(), pages: [page({ slug: 'contact', title: 'Contact', type: 'FORM', status: 'DRAFT' }), page({ slug: 'brochure', title: 'Brochure', type: 'PDF', status: 'DRAFT' })] }
    expect(find(rows, '/contact')).toMatchObject({ group: 'forms' })
    expect(find(rows, '/contact')?.disabled).toBeUndefined()
    expect(find(rows, '/brochure')).toMatchObject({ group: 'documents' })
    expect(find(rows, '/brochure')?.disabled).toBeUndefined()
  })

  it('landing / tab / gallery page types 404 on the public route -> flagged "not linkable"', () => {
    const rows = { ...empty(), pages: [page({ slug: 'tabby', title: 'Tabby', type: 'TAB_PAGE' }), page({ slug: 'lp', title: 'LP', type: 'LANDING' }), page({ slug: 'gal', title: 'Gal', type: 'GALLERY' })] }
    for (const v of ['/tabby', '/lp', '/gal']) {
      expect(find(rows, v)?.disabled).toBe(true)
      expect(find(rows, v)?.label).toMatch(/not linkable/)
    }
  })

  it('designer and standalone pages are routable', () => {
    const rows = { ...empty(), pages: [page({ slug: 'd', title: 'D', type: 'DESIGNER' }), page({ slug: 's', title: 'S', type: 'STANDALONE' })] }
    expect(find(rows, '/d')?.disabled).toBeUndefined()
    expect(find(rows, '/s')?.disabled).toBeUndefined()
  })

  it('the homepage row (slug "/") is not duplicated as a page; Home stays the built-in', () => {
    const rows = { ...empty(), pages: [page({ slug: '/', title: 'Landing', type: 'LANDING' })] }
    const flat = flattenCatalog(buildCatalog(rows))
    expect(flat.filter((i) => i.value === '/')).toHaveLength(1)
    expect(flat.find((i) => i.value === '/')?.group).toBe('builtin')
  })

  it('a slug that already starts with "/" is not double-slashed', () => {
    expect(find({ ...empty(), pages: [page({ slug: '/x' })] }, '/x')).toBeTruthy()
  })

  it('pages are sorted by title', () => {
    const rows = { ...empty(), pages: [page({ slug: 'z', title: 'Zeta' }), page({ slug: 'a', title: 'Alpha' })] }
    const g = buildCatalog(rows).groups.find((x) => x.id === 'pages')!
    expect(g.items.map((i) => i.label)).toEqual(['Alpha', 'Zeta'])
  })
})

describe('buildCatalog - sections', () => {
  const home = { slug: '/', title: 'Landing', type: 'LANDING', enabled: true }
  const about = { slug: 'about', title: 'About Us', type: 'FULL_PAGE', enabled: true }
  const sec = (id: string, page = home, o = {}) => ({ id, type: 'FLEXIBLE', displayName: `S-${id}`, navLabel: null, enabled: true, order: 1, page, ...o })

  it('without a current page every section is page-qualified; home sections use "/#id" and keep the legacy "#id" as alias', () => {
    const rows = { ...empty(), sections: [sec('h1'), sec('a1', about)] }
    const h = find(rows, '/#h1')
    expect(h?.alts).toEqual(['#h1'])
    expect(h?.group).toBe('sections:/')
    expect(find(rows, '/about#a1')?.alts).toEqual(['#a1'])
    expect(buildCatalog(rows).groups.find((g) => g.id === 'sections:/')?.label).toBe('Sections - Home page')
  })

  it('with currentPage the page\'s own sections use the plain in-page "#id" form and sort first', () => {
    const rows = { ...empty(), sections: [sec('h1'), sec('a1', about)] }
    const c = buildCatalog(rows, { currentPage: 'about' })
    const ids = c.groups.map((g) => g.id).filter((x) => x.startsWith('sections'))
    expect(ids[0]).toBe('sections-this')
    expect(find(rows, '#a1', { currentPage: 'about' })?.alts).toBeUndefined()
    expect(find(rows, '/#h1', { currentPage: 'about' })).toBeTruthy()
    expect(c.meta.currentPage).toBe('about')
  })

  it('currentPage "/" (or "/about") is normalised', () => {
    const rows = { ...empty(), sections: [sec('h1')] }
    expect(find(rows, '#h1', { currentPage: '/' })).toBeTruthy()
    expect(buildCatalog({ ...empty(), sections: [sec('a1', about)] }, { currentPage: '/about' }).meta.currentPage).toBe('about')
  })

  it('label falls back navLabel -> displayName -> type', () => {
    const rows = {
      ...empty(),
      sections: [sec('n', home, { navLabel: 'Nav', displayName: 'Disp' }), sec('d', home, { navLabel: null, displayName: 'Disp' }), sec('t', home, { navLabel: null, displayName: null, type: 'HERO' })],
    }
    const labels = buildCatalog(rows).groups.find((g) => g.id === 'sections:/')!.items.map((i) => i.label)
    expect(labels).toEqual(['Nav', 'Disp', 'Hero'])
  })

  it('disabled sections / sections on a disabled page are flagged, not dropped', () => {
    const rows = { ...empty(), sections: [sec('x', home, { enabled: false }), sec('y', { ...about, enabled: false })] }
    expect(find(rows, '/#x')).toMatchObject({ disabled: true })
    expect(find(rows, '/#x')?.label).toMatch(/disabled/)
    expect(find(rows, '/about#y')).toMatchObject({ disabled: true })
    expect(find(rows, '/about#y')?.label).toMatch(/page disabled/)
  })

  it('sections on tab / form / pdf pages are not anchor targets', () => {
    const rows = { ...empty(), sections: [sec('tabsec', { slug: 'tab', title: 'Tab', type: 'TAB_PAGE', enabled: true })] }
    expect(flattenCatalog(buildCatalog(rows)).some((i) => i.value.includes('#tabsec'))).toBe(false)
  })

  it('sections keep their order inside a page', () => {
    const rows = { ...empty(), sections: [sec('b', home, { order: 2 }), sec('a', home, { order: 1 })] }
    const g = buildCatalog(rows).groups.find((x) => x.id === 'sections:/')!
    expect(g.items.map((i) => i.value)).toEqual(['/#a', '/#b'])
  })
})

describe('buildCatalog - galleries and content', () => {
  it('active gallery selectable; inactive flagged; index disabled when nothing is active', () => {
    const rows = { ...empty(), galleryCategories: [{ slug: 'g1', name: 'Projects', isActive: true, order: 1 }, { slug: 'g2', name: 'Old', isActive: false, order: 2 }] }
    expect(find(rows, '/gallery/g1')?.disabled).toBeUndefined()
    expect(find(rows, '/gallery/g2')?.disabled).toBe(true)
    expect(find(rows, '/gallery')?.disabled).toBeUndefined()
    const none = { ...empty(), galleryCategories: [{ slug: 'g2', name: 'Old', isActive: false, order: 2 }] }
    expect(find(none, '/gallery')?.disabled).toBe(true)
  })

  const types = [{ slug: 'blog', name: 'Post', pluralName: 'Posts', hasPublicListing: true, hasPublicDetail: true }]
  it('content listing + published entry selectable; draft and scheduled flagged', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    const rows = {
      ...empty(),
      contentTypes: types,
      contentEntries: [
        { typeSlug: 'blog', slug: 'live', title: 'Live', status: 'published', publishedAt: '2026-01-01T00:00:00Z' },
        { typeSlug: 'blog', slug: 'soon', title: 'Soon', status: 'published', publishedAt: '2026-12-01T00:00:00Z' },
        { typeSlug: 'blog', slug: 'wip', title: 'WIP', status: 'draft', publishedAt: null },
      ],
    }
    expect(find(rows, '/content/blog', { now })?.disabled).toBeUndefined()
    expect(find(rows, '/content/blog/live', { now })?.disabled).toBeUndefined()
    expect(find(rows, '/content/blog/soon', { now })?.label).toMatch(/scheduled/)
    expect(find(rows, '/content/blog/wip', { now })?.label).toMatch(/draft/)
  })

  it('a type without a public listing is flagged; entries of unknown types are ignored', () => {
    const rows = { ...empty(), contentTypes: [{ ...types[0], hasPublicListing: false }], contentEntries: [{ typeSlug: 'ghost', slug: 'x', title: 'X', status: 'published', publishedAt: '2020-01-01' }] }
    expect(find(rows, '/content/blog')?.disabled).toBe(true)
    expect(find(rows, '/content/ghost/x')).toBeUndefined()
  })

  it('caps content entries and reports truncation', () => {
    const many = Array.from({ length: MAX_CONTENT_ENTRIES + 5 }, (_, i) => ({ typeSlug: 'blog', slug: `e${i}`, title: `E${i}`, status: 'published', publishedAt: '2020-01-01' }))
    const c = buildCatalog({ ...empty(), contentTypes: types, contentEntries: many })
    expect(c.meta.truncated).toBe(true)
    expect(c.groups.find((g) => g.id === 'content')!.items.length).toBe(MAX_CONTENT_ENTRIES + 1) // + the listing
  })
})

describe('buildCatalog - value formats and invariants', () => {
  it('no item value is empty and none is a client-only sentinel', () => {
    const rows: CatalogRows = {
      ...empty(),
      pages: [{ slug: 'p', title: 'P', type: 'FULL_PAGE', enabled: true, status: 'PUBLISHED' }],
      sections: [{ id: 's', type: 'FLEXIBLE', displayName: 'S', navLabel: null, enabled: true, order: 1, page: { slug: '/', title: 'L', type: 'LANDING', enabled: true } }],
      plugins: [{ slug: 'policies', enabled: true }],
      clientFeatures: [{ slug: 'coverage-maps', enabled: true }],
      policies: [{ slug: 'privacy', title: 'Privacy', enabled: true, order: 1 }],
    }
    for (const i of flattenCatalog(buildCatalog(rows))) {
      expect(i.value).toBeTruthy()
      expect(['custom', 'tel', 'mailto']).not.toContain(i.value)
      expect(i.value.startsWith('/') || i.value.startsWith('#')).toBe(true)
    }
  })

  it('every item.group matches its group id', () => {
    const rows = { ...empty(), pages: [{ slug: 'p', title: 'P', type: 'FULL_PAGE', enabled: true, status: 'PUBLISHED' }] }
    for (const g of buildCatalog(rows).groups) for (const i of g.items) expect(i.group).toBe(g.id)
  })

  it('mediaPrefix defaults to /uploads/ and honours an absolute MEDIA_URL', () => {
    expect(buildCatalog(empty(), { mediaPrefix: '/uploads' }).meta.mediaPrefix).toBe('/uploads/')
    expect(buildCatalog(empty(), { mediaPrefix: 'https://cdn.example.com/media/' }).meta.mediaPrefix).toBe('https://cdn.example.com/media/')
  })
})

describe('route-gate table stays in sync with the plugin manifests', () => {
  const manifestPublic = (id: string) => BUILTIN_MANIFESTS.find((m) => m.id === id)?.routes.public ?? []

  it.each(FEATURE_ROUTES.map((f) => [f.id, f.path] as const))('%s: %s is declared in its manifest routes.public', (id, path) => {
    expect(manifestPublic(id)).toContain(path)
  })

  it('every manifest public route is either a catalog destination or explicitly marked not-linkable', () => {
    const handled = new Set<string>([...FEATURE_ROUTES.map((f) => f.path), ...Object.keys(NOT_LINKABLE_PUBLIC_ROUTES)])
    const unhandled = BUILTIN_MANIFESTS.flatMap((m) => m.routes.public.map((r) => `${m.id}:${r}`)).filter((k) => !handled.has(k.slice(k.indexOf(':') + 1)))
    expect(unhandled, `New plugin public routes must be added to FEATURE_ROUTES (with the route's real gate) or NOT_LINKABLE_PUBLIC_ROUTES: ${unhandled.join(', ')}`).toEqual([])
  })

  it('every NOT_LINKABLE entry carries a reason', () => {
    for (const reason of Object.values(NOT_LINKABLE_PUBLIC_ROUTES)) expect(reason.length).toBeGreaterThan(5)
  })
})

// ── Loaders with a fake client ──────────────────────────────────────────────

describe('loadCatalogRows', () => {
  const ok = <T>(v: T) => vi.fn().mockResolvedValue(v)
  const fakeDb = (over: Record<string, unknown> = {}) =>
    ({
      page: { findMany: ok([{ slug: 'about', title: 'About', type: 'FULL_PAGE', enabled: true, status: 'PUBLISHED' }]) },
      section: { findMany: ok([]) },
      plugin: { findMany: ok([{ slug: 'policies', enabled: true }]) },
      clientFeature: { findMany: ok([]) },
      policy: { findMany: ok([]) },
      galleryCategory: { findMany: ok([]) },
      contentType: { findMany: ok([]) },
      contentEntry: { findMany: ok([]) },
      ...over,
    }) as unknown as PrismaClient

  it('one failing source degrades to an empty group; the others still load', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rows = await loadCatalogRows(fakeDb({ policy: { findMany: vi.fn().mockRejectedValue(new Error('boom')) } }))
    expect(rows.policies).toEqual([])
    expect(rows.pages).toHaveLength(1)
    expect(rows.plugins).toEqual([{ slug: 'policies', enabled: true }])
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })

  it('maps content entries to their type slug', async () => {
    const rows = await loadCatalogRows(
      fakeDb({ contentEntry: { findMany: ok([{ slug: 'hi', title: 'Hi', status: 'published', publishedAt: null, contentType: { slug: 'blog' } }]) } }),
    )
    expect(rows.contentEntries).toEqual([{ typeSlug: 'blog', slug: 'hi', title: 'Hi', status: 'published', publishedAt: null }])
  })
})

describe('searchMedia', () => {
  const makeDb = (rows: unknown[], total: number) => {
    const findMany = vi.fn().mockResolvedValue(rows)
    const count = vi.fn().mockResolvedValue(total)
    return { db: { mediaAsset: { findMany, count } } as unknown as PrismaClient, findMany, count }
  }

  it('documents -> application/pdf, images -> image/*, url returned exactly as stored', async () => {
    const { db, findMany } = makeDb([{ originalName: 'Price List.pdf', filename: 'x.pdf', url: 'https://cdn.example.com/uploads/x.pdf', thumbnailUrl: null, mimeType: 'application/pdf', fileSize: 2048 }], 1)
    const r = await searchMedia(db, { type: 'document' })
    expect(findMany.mock.calls[0][0].where.mimeType).toBe('application/pdf')
    expect(r.items[0]).toMatchObject({ label: 'Price List.pdf', value: 'https://cdn.example.com/uploads/x.pdf', hint: 'application/pdf · 2 KB' })
    expect(mediaWhere({ type: 'image' }).mimeType).toEqual({ startsWith: 'image/' })
  })

  it('search term matches filename / original name / alt text (case-insensitive)', () => {
    const w = mediaWhere({ type: 'document', q: '  price ' })
    expect(w.OR).toHaveLength(3)
    expect(JSON.stringify(w.OR)).toContain('"contains":"price"')
    expect(JSON.stringify(w.OR)).toContain('insensitive')
  })

  it('clamps perPage to 100 and page to >= 1; reports totalPages', async () => {
    const { db, findMany } = makeDb([], 250)
    const r = await searchMedia(db, { type: 'image', page: -3, perPage: 5000 })
    expect(findMany.mock.calls[0][0].take).toBe(MEDIA_MAX_PER_PAGE)
    expect(findMany.mock.calls[0][0].skip).toBe(0)
    expect(r.totalPages).toBe(3)
  })

  it('folder filter mirrors /api/media (uncategorised -> null, all -> none)', () => {
    expect(mediaWhere({ type: 'image', folderId: 'uncategorised' }).folderId).toBeNull()
    expect(mediaWhere({ type: 'image', folderId: 'all' }).folderId).toBeUndefined()
    expect(mediaWhere({ type: 'image', folderId: 'abc' }).folderId).toBe('abc')
  })

  it('an over-long query is truncated, never unbounded', () => {
    const w = mediaWhere({ type: 'image', q: 'x'.repeat(500) })
    expect(JSON.stringify(w.OR).match(/x+/)![0].length).toBe(100)
  })
})
