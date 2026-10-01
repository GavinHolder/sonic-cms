import { describe, it, expect } from 'vitest'
import {
  groupProductPackages,
  resolveDeepLinkSelection,
  parseProductLinkValue,
  composeProductLinkValue,
  findProductTemplateScope,
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
      pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'kuluntu-connect', productTypeName: 'Kuluntu Connect' }),
      pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'kuluntu-connect', productTypeName: 'Kuluntu Connect' }),
      pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'standard-wireless', productTypeName: 'Standard Wireless' }),
      pkg({ serviceCategorySlug: 'fibre', serviceCategoryName: 'Fibre', productTypeSlug: 'fibre-home', productTypeName: 'Fibre Home' }),
    ]

    const groups = groupProductPackages(packages)

    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({
      key: 'wireless',
      name: 'Fixed Wireless',
      subTypes: [
        { key: 'kuluntu-connect', name: 'Kuluntu Connect' },
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
    pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'kuluntu-connect', productTypeName: 'Kuluntu Connect' }),
    pkg({ serviceCategorySlug: 'wireless', serviceCategoryName: 'Fixed Wireless', productTypeSlug: 'standard-wireless', productTypeName: 'Standard Wireless' }),
    pkg({ serviceCategorySlug: 'fibre', serviceCategoryName: 'Fibre', productTypeSlug: 'fibre-home', productTypeName: 'Fibre Home' }),
  ])

  it('matches Level 2 (sub-type) first when the slug identifies one, opening its parent category too', () => {
    expect(resolveDeepLinkSelection(groups, 'kuluntu-connect')).toEqual({ top: 'wireless', type: 'kuluntu-connect' })
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
    expect(parseProductLinkValue('/products?product=kuluntu-connect#pricing-1')).toEqual({
      base: '/products#pricing-1',
      product: 'kuluntu-connect',
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
