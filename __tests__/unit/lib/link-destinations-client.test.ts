import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { buildCatalog, flattenCatalog, type CatalogRows } from '@/lib/link-destinations'

// public/link-destinations.js is a UMD-lite script (also loaded by <script> in the Designer), so it is required.
const require = createRequire(import.meta.url)
const LD = require('../../../public/link-destinations.js')

const rows: CatalogRows = {
  pages: [
    { slug: 'about', title: 'About <Us>', type: 'FULL_PAGE', enabled: true, status: 'PUBLISHED' },
    { slug: 'draft-page', title: 'Draft', type: 'FULL_PAGE', enabled: true, status: 'DRAFT' },
  ],
  sections: [
    { id: 'aaaa-1111', type: 'FLEXIBLE', displayName: 'Hero', navLabel: null, enabled: true, order: 1, page: { slug: '/', title: 'Landing', type: 'LANDING', enabled: true } },
    { id: 'bbbb-2222', type: 'FLEXIBLE', displayName: 'Team', navLabel: null, enabled: true, order: 1, page: { slug: 'about', title: 'About', type: 'FULL_PAGE', enabled: true } },
  ],
  plugins: [{ slug: 'policies', enabled: true }],
  clientFeatures: [{ slug: 'coverage-maps', enabled: false }],
  policies: [{ slug: 'privacy', title: 'Privacy', navLabel: null, enabled: true, order: 1 }],
  galleryCategories: [],
  contentTypes: [],
  contentEntries: [],
}
const catalog = buildCatalog(rows, { currentPage: '/', mediaPrefix: '/uploads' })

describe('classify - every stored format resolves and round-trips', () => {
  const roundTrip = (v: string) => LD.classify(v, catalog)

  it.each([
    ['', 'none'],
    ['/', 'item'],
    ['#top', 'item'],
    ['/about', 'item'],
    ['/policies', 'item'],
    ['/policies/privacy', 'item'],
    ['/coverage', 'item'], // disabled item still preselects
    ['#aaaa-1111', 'item'], // this page's section (current page = home): bare anchor, the format links always used
    ['/about#bbbb-2222', 'item'],
    ['#bbbb-2222', 'item'], // legacy bare anchor to a section on another page: alias of '/about#bbbb-2222'
    ['tel:+27821234567', 'tel'],
    ['TEL:0821234567', 'tel'],
    ['mailto:info@example.com', 'mailto'],
    ['https://example.com/x?y=1', 'custom'],
    ['/coverage?package=abc', 'custom'],
    ['/contactus', 'custom'], // page deleted / not in catalog -> Custom URL pre-filled, never "No link"
    ['#gone-section', 'custom'],
    ['/uploads/price-list-123.pdf', 'media'],
    ['/images/uploads/photo.webp', 'media'],
  ])('%j -> %s, canonical === stored', (value, mode) => {
    const st = roundTrip(value)
    expect(st.mode).toBe(mode)
    expect(st.canonical).toBe(value)
  })

  it('legacy literals custom/tel/mailto resolve to "#" (they were persisted by a bug and point nowhere)', () => {
    for (const v of ['custom', 'tel', 'mailto']) {
      const st = roundTrip(v)
      expect(st.legacy).toBe(true)
      expect(st.canonical).toBe('#')
      expect(st.mode).toBe('custom')
    }
  })

  it('a saved custom URL is NOT reported as "No link" (the old picker did that)', () => {
    expect(roundTrip('https://www.facebook.com/wifisonic/').mode).toBe('custom')
    expect(roundTrip('https://www.facebook.com/wifisonic/').text).toBe('https://www.facebook.com/wifisonic/')
  })

  it('media is typed by extension', () => {
    expect(roundTrip('/uploads/a.PDF').mediaType).toBe('document')
    expect(roundTrip('/uploads/a.png').mediaType).toBe('image')
  })

  it('an absolute CDN media prefix from the server is recognised', () => {
    const cdn = buildCatalog(rows, { mediaPrefix: 'https://cdn.example.com/m' })
    expect(LD.classify('https://cdn.example.com/m/x.pdf', cdn).mode).toBe('media')
    expect(LD.classify('https://other.example.com/x.pdf', cdn).mode).toBe('custom')
  })

  it('built-ins classify even against the offline fallback catalog', () => {
    expect(LD.classify('/', LD.FALLBACK_CATALOG).mode).toBe('item')
    expect(LD.classify('#top', LD.FALLBACK_CATALOG).mode).toBe('item')
    expect(LD.classify('/about', LD.FALLBACK_CATALOG).mode).toBe('custom')
  })

  it('every catalog item value round-trips to itself, and every alias round-trips to the alias', () => {
    for (const it of flattenCatalog(catalog)) {
      expect(LD.classify(it.value, catalog).canonical).toBe(it.value)
      for (const alt of it.alts ?? []) {
        const st = LD.classify(alt, catalog)
        expect(st.mode).toBe('item')
        expect(st.optionValue).toBe(alt)
      }
    }
  })

  it('tolerates undefined / null', () => {
    expect(LD.classify(undefined, catalog)).toMatchObject({ mode: 'none', canonical: '' })
    expect(LD.classify(null, catalog)).toMatchObject({ mode: 'none', canonical: '' })
  })
})

describe('buildOptionsHtml', () => {
  it('escapes labels and values (a page titled with markup cannot inject HTML)', () => {
    const html = LD.buildOptionsHtml(catalog, LD.classify('', catalog))
    expect(html).toContain('About &lt;Us&gt;')
    expect(html).not.toContain('<Us>')
    const evil = buildCatalog({ ...rows, pages: [{ slug: 'x"><script>alert(1)</script>', title: '"><img src=x onerror=alert(1)>', type: 'FULL_PAGE', enabled: true, status: 'PUBLISHED' }] })
    const eh = LD.buildOptionsHtml(evil, LD.classify('', evil))
    expect(eh).not.toMatch(/<script>|<img /)
    expect(eh).toContain('&quot;&gt;&lt;img')
  })

  it('offers pages, sections, forms, features, policies and the library/custom entries', () => {
    const html = LD.buildOptionsHtml(catalog, LD.classify('', catalog))
    for (const label of ['Pages', 'Sections - This page', 'Plugins &amp; Features', 'Policies', 'Media library', 'Other', 'Built-in']) {
      expect(html).toContain(`optgroup label="${label}"`)
    }
    expect(html).toContain('value="/policies/privacy"')
    expect(html).toContain('value="__doc__"')
    expect(html).toContain('value="__img__"')
  })

  it('a disabled destination is not pickable...', () => {
    const html = LD.buildOptionsHtml(catalog, LD.classify('', catalog))
    expect(html).toMatch(/<option value="\/coverage" disabled[^>]*>Coverage Map \(feature off\)/)
    expect(html).toMatch(/<option value="\/draft-page" disabled[^>]*>Draft \(draft\)/)
  })

  it('...unless it is the saved value, which must still preselect', () => {
    const html = LD.buildOptionsHtml(catalog, LD.classify('/coverage', catalog))
    expect(html).toMatch(/<option value="\/coverage" selected[^>]*>Coverage Map \(feature off\)/)
    expect(html).not.toMatch(/value="\/coverage" selected disabled/)
  })

  it('an alias match emits the STORED value as the option value, so re-selecting never rewrites it', () => {
    const html = LD.buildOptionsHtml(catalog, LD.classify('#bbbb-2222', catalog))
    expect(html).toMatch(/<option value="#bbbb-2222" selected[^>]*>/)
    expect(html).not.toContain('value="/about#bbbb-2222"')
  })

  it('exactly one option is selected for every state', () => {
    for (const v of ['', '/', '/about', '#aaaa-1111', 'tel:1', 'mailto:a@b.c', 'https://x.y', '/uploads/a.pdf', '/uploads/a.png', 'custom']) {
      const html = LD.buildOptionsHtml(catalog, LD.classify(v, catalog))
      expect((html.match(/ selected/g) ?? []).length, `value ${JSON.stringify(v)}`).toBe(1)
    }
  })

  it('allowNone:false drops the empty option', () => {
    const html = LD.buildOptionsHtml(catalog, LD.classify('/coverage', catalog), { allowNone: false })
    expect(html).not.toContain('value=""')
  })

  it('UI sentinels are never item values', () => {
    const values = flattenCatalog(catalog).map((i) => i.value)
    for (const s of Object.values(LD.SENTINELS)) expect(values).not.toContain(s)
  })
})

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters and tolerates null', () => {
    expect(LD.escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
    expect(LD.escapeHtml(null)).toBe('')
    expect(LD.escapeHtml(0)).toBe('0')
  })
})
