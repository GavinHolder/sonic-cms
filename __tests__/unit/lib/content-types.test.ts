import { describe, it, expect } from 'vitest'
import { generateSlug, FIELD_TYPES } from '@/lib/content-types'

describe('generateSlug', () => {
  it('converts text to lowercase kebab-case', () => {
    expect(generateSlug('Blog Posts')).toBe('blog-posts')
  })

  it('removes special characters', () => {
    expect(generateSlug('FAQ & Help Items!')).toBe('faq-help-items')
  })

  it('handles leading/trailing hyphens', () => {
    expect(generateSlug('--hello world--')).toBe('hello-world')
  })

  it('collapses multiple hyphens', () => {
    expect(generateSlug('a   b   c')).toBe('a-b-c')
  })

  it('truncates to 80 characters', () => {
    const long = 'a'.repeat(100)
    expect(generateSlug(long).length).toBeLessThanOrEqual(80)
  })

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  it('handles unicode by removing non-ascii', () => {
    expect(generateSlug('café résumé')).toBe('caf-r-sum')
  })
})

describe('FIELD_TYPES', () => {
  it('has at least 10 field types', () => {
    expect(FIELD_TYPES.length).toBeGreaterThanOrEqual(10)
  })

  it('includes essential types', () => {
    const values = FIELD_TYPES.map(ft => ft.value)
    expect(values).toContain('text')
    expect(values).toContain('richtext')
    expect(values).toContain('image')
    expect(values).toContain('date')
    expect(values).toContain('number')
    expect(values).toContain('boolean')
    expect(values).toContain('select')
    expect(values).toContain('url')
  })

  it('has label and icon for every type', () => {
    for (const ft of FIELD_TYPES) {
      expect(ft.label).toBeTruthy()
      expect(ft.icon).toMatch(/^bi-/)
    }
  })
})
