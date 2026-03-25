import { describe, it, expect } from 'vitest'
import {
  DEFAULT_BRAND_TOKENS,
  brandTokensToCss,
  brandTokensToFontUrl,
} from '@/lib/brand-tokens'
import type { BrandTokens } from '@/lib/brand-tokens'

describe('brandTokensToCss', () => {
  it('generates CSS with all custom properties', () => {
    const css = brandTokensToCss(DEFAULT_BRAND_TOKENS)
    expect(css).toContain('--cms-primary: #2563eb')
    expect(css).toContain('--cms-secondary: #7c3aed')
    expect(css).toContain('--cms-accent: #f59e0b')
    expect(css).toContain('--cms-background: #ffffff')
    expect(css).toContain('--cms-text: #0f172a')
    expect(css).toContain('--cms-heading-font')
    expect(css).toContain('--cms-body-font')
    expect(css).toContain('--cms-section-padding: 80px')
    expect(css).toContain('--cms-radius: 8px')
  })

  it('includes Bootstrap overrides', () => {
    const css = brandTokensToCss(DEFAULT_BRAND_TOKENS)
    expect(css).toContain('--bs-primary: #2563eb')
    expect(css).toContain('--bs-primary-rgb: 37, 99, 235')
    expect(css).toContain('--bs-body-font-family')
    expect(css).toContain('--bs-body-color: #0f172a')
  })

  it('applies custom colours', () => {
    const tokens: BrandTokens = {
      ...DEFAULT_BRAND_TOKENS,
      colors: { ...DEFAULT_BRAND_TOKENS.colors, primary: '#ff0000', text: '#111111' },
    }
    const css = brandTokensToCss(tokens)
    expect(css).toContain('--cms-primary: #ff0000')
    expect(css).toContain('--bs-primary: #ff0000')
    expect(css).toContain('--bs-primary-rgb: 255, 0, 0')
    expect(css).toContain('--cms-text: #111111')
  })

  it('includes body and heading font declarations', () => {
    const css = brandTokensToCss(DEFAULT_BRAND_TOKENS)
    expect(css).toContain('html body')
    expect(css).toContain('font-family: var(--cms-body-font)')
    expect(css).toContain('html h1')
    expect(css).toContain('font-family: var(--cms-heading-font)')
  })

  it('handles custom font names with quotes', () => {
    const tokens: BrandTokens = {
      ...DEFAULT_BRAND_TOKENS,
      typography: { ...DEFAULT_BRAND_TOKENS.typography, headingFont: 'Playfair Display', bodyFont: 'Open Sans' },
    }
    const css = brandTokensToCss(tokens)
    expect(css).toContain("'Playfair Display'")
    expect(css).toContain("'Open Sans'")
  })
})

describe('brandTokensToFontUrl', () => {
  it('returns Google Fonts URL for non-system fonts', () => {
    const url = brandTokensToFontUrl(DEFAULT_BRAND_TOKENS)
    expect(url).toBeTruthy()
    expect(url).toContain('fonts.googleapis.com')
    expect(url).toContain('Inter')
  })

  it('returns null for system-only fonts', () => {
    const tokens: BrandTokens = {
      ...DEFAULT_BRAND_TOKENS,
      typography: { ...DEFAULT_BRAND_TOKENS.typography, headingFont: 'Arial', bodyFont: 'Georgia' },
    }
    const url = brandTokensToFontUrl(tokens)
    expect(url).toBeNull()
  })

  it('deduplicates when heading and body font are the same', () => {
    const tokens: BrandTokens = {
      ...DEFAULT_BRAND_TOKENS,
      typography: { ...DEFAULT_BRAND_TOKENS.typography, headingFont: 'Roboto', bodyFont: 'Roboto' },
    }
    const url = brandTokensToFontUrl(tokens)!
    const matches = url.match(/family=/g)
    expect(matches).toHaveLength(1)
  })

  it('includes both fonts when different', () => {
    const tokens: BrandTokens = {
      ...DEFAULT_BRAND_TOKENS,
      typography: { ...DEFAULT_BRAND_TOKENS.typography, headingFont: 'Roboto', bodyFont: 'Lato' },
    }
    const url = brandTokensToFontUrl(tokens)!
    expect(url).toContain('Roboto')
    expect(url).toContain('Lato')
  })

  it('includes weight range in URL', () => {
    const url = brandTokensToFontUrl(DEFAULT_BRAND_TOKENS)!
    expect(url).toContain('wght@300;400;500;600;700;800;900')
  })
})
