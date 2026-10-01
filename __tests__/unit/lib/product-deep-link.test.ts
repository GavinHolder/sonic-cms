import { describe, it, expect } from 'vitest'
import {
  groupProductPackages,
  resolveDeepLinkSelection,
  parseProductLinkValue,
  composeProductLinkValue,
  findProductTemplateScope,
  sectionIdFromValue,
  resolveBareSectionIdMatch,
  type DeepLinkPackage,
} from '@/lib/product-deep-link'

function pkg(overrides: Partial<DeepLinkPackage>): DeepLinkPackage {
  return {
    productTypeSlug: null,
    productTypeName: null,
    serviceCategorySlug: null,
    serviceCategoryName: null,
    ...overrides,
  }
}

describe('groupProductPackages', () => {
  it('groups by serviceCategorySlug (Level 1) then productTypeSlug (Level 2)', () => {
    const packages = [
      pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'sub-offering-a', productTypeName: 'Sub Offering A' }),
      pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'sub-offering-a', productTypeName: 'Sub Offering A' }),
      pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'standard-wireless', productTypeName: 'Standard Wireless' }),
      pkg({ serviceCategorySlug: 'fibre', serviceCategoryName: 'Fibre', productTypeSlug: 'fibre-home', productTypeName: 'Fibre Home' }),
    ]

    const groups = groupProductPackages(packages)

    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({
      key: 'wireless',
      name: 'Fixed Wireless',
      subTypes: [
        { key: 'sub-offering-a', name: 'Sub Offering A' },
        { key: 'standard-wireless', name: 'Standard Wireless' },
      ],
    })
    expect(groups[1]).toEqual({
      key: 'fibre',
      name: 'Fibre',
      subTypes: [{ key: 'fibre-home', name: 'Fibre Home' }],
    })
  })

  it('falls back to productTypeSlug for Level 1 when serviceCategorySlug is null', () => {
    const packages = [pkg({ productTypeSlug: 'voice', productTypeName: 'Voice' })]
    const groups = groupProductPackages(packages)
    expect(groups).toEqual([{ key: 'voice', name: 'Voice', subTypes: [{ key: 'voice', name: 'Voice' }] }])
  })

  it('skips a package with no resolvable Level 1 key (no category, no product type)', () => {
    const packages = [pkg({}), pkg({ productTypeSlug: 'fibre' })]
    const groups = groupProductPackages(packages)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('fibre')
  })

  it('returns [] for an empty packages array', () => {
    expect(groupProductPackages([])).toEqual([])
  })
})

describe('resolveDeepLinkSelection', () => {
  const groups = groupProductPackages([
    pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'sub-offering-a', productTypeName: 'Sub Offering A' }),
    pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'standard-wireless', productTypeName: 'Standard Wireless' }),
    pkg({ serviceCategorySlug: 'fibre', serviceCategoryName: 'Fibre', productTypeSlug: 'fibre-home', productTypeName: 'Fibre Home' }),
  ])

  it('matches Level 2 (sub-type) first when the slug identifies one, opening its parent category too', () => {
    expect(resolveDeepLinkSelection(groups, 'sub-offering-a')).toEqual({ top: 'wireless', type: 'sub-offering-a' })
  })

  it('falls back to Level 1 when the slug only identifies a top category', () => {
    expect(resolveDeepLinkSelection(groups, 'fibre')).toEqual({ top: 'fibre', type: null })
  })

  it('matches nothing for an unknown slug', () => {
    expect(resolveDeepLinkSelection(groups, 'nonexistent')).toEqual({ top: null, type: null })
  })

  it('matches nothing for a null slug', () => {
    expect(resolveDeepLinkSelection(groups, null)).toEqual({ top: null, type: null })
  })
})

describe('parseProductLinkValue / composeProductLinkValue round-trip', () => {
  it('composes a Level 1-only deep link', () => {
    expect(composeProductLinkValue('/products#pricing-1', 'wireless')).toBe(
      '/products?product=wireless#pricing-1'
    )
  })

  it('parses a composed value back into base + product', () => {
    expect(parseProductLinkValue('/products?product=sub-offering-a#pricing-1')).toEqual({
      base: '/products#pricing-1',
      product: 'sub-offering-a',
    })
  })

  it('round-trips compose -> parse for the home page (path "/")', () => {
    const composed = composeProductLinkValue('/#hero-1', 'fibre')
    expect(composed).toBe('/?product=fibre#hero-1')
    expect(parseProductLinkValue(composed)).toEqual({ base: '/#hero-1', product: 'fibre' })
  })

  it('leaves a plain (non-product) value untouched by parse', () => {
    expect(parseProductLinkValue('/products#pricing-1')).toEqual({
      base: '/products#pricing-1',
      product: null,
    })
  })

  it('returns the base unchanged when composing with a null/empty slug', () => {
    expect(composeProductLinkValue('/products#pricing-1', null)).toBe('/products#pricing-1')
    expect(composeProductLinkValue('/products#pricing-1', '')).toBe('/products#pricing-1')
  })

  it('percent-encodes a slug containing special characters and decodes it back', () => {
    const composed = composeProductLinkValue('/products#pricing-1', 'a b&c')
    expect(composed).toBe('/products?product=a%20b%26c#pricing-1')
    expect(parseProductLinkValue(composed).product).toBe('a b&c')
  })
})

describe('findProductTemplateScope', () => {
  it('finds a top-level blocks array with a bound "template" block (productTypeSlugs)', () => {
    const content = {
      designerData: {
        blocks: [
          { id: 1, type: 'hero-text', props: {} },
          { id: 2, type: 'template', props: { productTypeSlugs: ['fibre', 'voice'] } },
        ],
      },
    }
    expect(findProductTemplateScope(content)).toEqual({ productTypeSlugs: ['fibre', 'voice'] })
  })

  it('finds a bound "template" block nested under a per-breakpoint variant', () => {
    const content = {
      designerData: {
        desktop: { blocks: [] },
        mobile: { blocks: [{ id: 1, type: 'template', props: { networkSlug: 'acme-fibre' } }] },
      },
    }
    expect(findProductTemplateScope(content)).toEqual({ networkSlug: 'acme-fibre' })
  })

  it('returns null for a "template" block with neither productTypeSlugs nor networkSlug set', () => {
    const content = { designerData: { blocks: [{ id: 1, type: 'template', props: {} }] } }
    expect(findProductTemplateScope(content)).toBeNull()
  })

  it('returns null for a "template" block with an empty productTypeSlugs array', () => {
    const content = {
      designerData: { blocks: [{ id: 1, type: 'template', props: { productTypeSlugs: [] } }] },
    }
    expect(findProductTemplateScope(content)).toBeNull()
  })

  it('ignores a non-"template" block even if it happens to carry productTypeSlugs-shaped props', () => {
    const content = {
      designerData: { blocks: [{ id: 1, type: 'card-tabs', props: { productTypeSlugs: ['fibre'] } }] },
    }
    expect(findProductTemplateScope(content)).toBeNull()
  })

  it('returns null for an empty/plain section content object', () => {
    expect(findProductTemplateScope({})).toBeNull()
    expect(findProductTemplateScope(null)).toBeNull()
    expect(findProductTemplateScope(undefined)).toBeNull()
  })

  it('prefers productTypeSlugs over networkSlug when a block sets both', () => {
    const content = {
      designerData: {
        blocks: [{ id: 1, type: 'template', props: { productTypeSlugs: ['fibre'], networkSlug: 'acme' } }],
      },
    }
    expect(findProductTemplateScope(content)).toEqual({ productTypeSlugs: ['fibre'] })
  })
})

describe('sectionIdFromValue', () => {
  it('extracts the id portion from a bare "#id" value', () => {
    expect(sectionIdFromValue('#pricing-1')).toBe('pricing-1')
  })

  it('extracts the id portion from a path-prefixed "{path}#id" catalog value', () => {
    expect(sectionIdFromValue('/products#pricing-1')).toBe('pricing-1')
  })

  it('extracts the id portion from a home-page "/#id" catalog value', () => {
    expect(sectionIdFromValue('/#hero-1')).toBe('hero-1')
  })

  it('returns "" for a value with no "#" at all', () => {
    expect(sectionIdFromValue('/products')).toBe('')
    expect(sectionIdFromValue('https://example.com')).toBe('')
    expect(sectionIdFromValue('')).toBe('')
  })
})

describe('resolveBareSectionIdMatch (LinkPicker bare-#id recognition fallback)', () => {
  // Regression coverage: app/api/link-catalog/route.ts's Sections group
  // changed from emitting bare `#{id}` values to `{pagePath}#{id}` (needed
  // for this feature's cross-page deep links). A link stored BEFORE that
  // change — the only format that ever existed previously — is still a bare
  // `#{id}`. Without this fallback, LinkPicker's exact-string catalog match
  // fails for that pre-existing value and the admin UI misidentifies it as
  // "Custom URL" instead of the known Sections option it actually is, for
  // every LinkPicker call site that doesn't pass its own sectionOptions prop
  // (SlideEditor, SectionEditorModal, FlexibleSectionEditorModal).
  it('resolves a pre-existing bare "#id" value to its path-prefixed catalog counterpart', () => {
    const catalogValues = ['/products#pricing-1', '/#hero-1', '/about#team-1']
    expect(resolveBareSectionIdMatch('#pricing-1', catalogValues)).toBe('/products#pricing-1')
  })

  it('matches by section id only, independent of which page the catalog entry belongs to', () => {
    const catalogValues = ['/#hero-1', '/contact#form-1']
    expect(resolveBareSectionIdMatch('#form-1', catalogValues)).toBe('/contact#form-1')
  })

  it('returns null when no catalog entry shares the bare value\'s section id', () => {
    const catalogValues = ['/products#pricing-1']
    expect(resolveBareSectionIdMatch('#nonexistent', catalogValues)).toBeNull()
  })

  it('returns null for a value that is not a bare "#id" (already path-prefixed or a plain URL)', () => {
    const catalogValues = ['/products#pricing-1']
    expect(resolveBareSectionIdMatch('/products#pricing-1', catalogValues)).toBeNull()
    expect(resolveBareSectionIdMatch('https://example.com', catalogValues)).toBeNull()
    expect(resolveBareSectionIdMatch('', catalogValues)).toBeNull()
  })

  it('returns null for a bare "#" with an empty id', () => {
    expect(resolveBareSectionIdMatch('#', ['/products#pricing-1'])).toBeNull()
  })

  it('returns null against an empty catalog', () => {
    expect(resolveBareSectionIdMatch('#pricing-1', [])).toBeNull()
  })
})
