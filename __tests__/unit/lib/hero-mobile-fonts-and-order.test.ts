import { describe, it, expect } from 'vitest'
import { defaultFreeformPos, freeformStackOrder } from '@/types/section'
import { HERO_FONT_WEIGHTS, heroFontHref, heroFontStack } from '@/lib/hero/hero-fonts'
import { googleFontStack } from '@/lib/fonts/google-font-stack'

describe('freeformStackOrder — mobile stack reading order', () => {
  it('orders by ascending desktop pos.y so a logo authored at the top leads', () => {
    const logo = freeformStackOrder({ x: 50, y: 8 }, defaultFreeformPos('image', 0))
    const rows = [27, 37, 56, 67].map((y, i) => freeformStackOrder({ x: 50, y }, defaultFreeformPos('heading', i)))
    expect(logo).toBeLessThan(rows[0])
    expect([...rows].sort((a, b) => a - b)).toEqual(rows)
  })

  it('an element without pos uses its kind default (heading rows keep DOM order, images default below the headings)', () => {
    const heading0 = freeformStackOrder(undefined, defaultFreeformPos('heading', 0))
    const heading1 = freeformStackOrder(undefined, defaultFreeformPos('heading', 1))
    const image0 = freeformStackOrder(undefined, defaultFreeformPos('image', 0))
    expect(heading0).toBeLessThan(heading1)
    expect(image0).toBeLessThan(heading0) // default image y (30) sits above default heading y (38)
    expect(freeformStackOrder(undefined, defaultFreeformPos('button', 0))).toBeGreaterThan(heading1)
  })

  it('equal y gives equal order (ties fall back to stable DOM order in CSS)', () => {
    expect(freeformStackOrder({ x: 18, y: 38 }, defaultFreeformPos('heading', 0))).toBe(freeformStackOrder({ x: 76, y: 38 }, defaultFreeformPos('heading', 1)))
  })

  it('never returns NaN for a malformed pos (falls back to the default)', () => {
    const def = defaultFreeformPos('subheading')
    expect(freeformStackOrder({ x: 50, y: NaN }, def)).toBe(Math.round(def.y * 100))
    expect(freeformStackOrder({ x: 50, y: Infinity }, def)).toBe(Math.round(def.y * 100))
    expect(freeformStackOrder({ x: 50 } as never, def)).toBe(Math.round(def.y * 100))
  })

  it('boundaries: y = 0, negative and > 100 are ordered numerically', () => {
    const d = defaultFreeformPos('image', 0)
    expect(freeformStackOrder({ x: 50, y: 0 }, d)).toBe(0)
    expect(freeformStackOrder({ x: 50, y: -5 }, d)).toBeLessThan(0)
    expect(freeformStackOrder({ x: 50, y: 105 }, d)).toBeGreaterThan(freeformStackOrder({ x: 50, y: 100 }, d))
  })
})

describe('hero font helpers', () => {
  it('heroFontHref always requests weight 400 (a list without 400 makes Google Fonts answer HTTP 400 and load nothing)', () => {
    expect(HERO_FONT_WEIGHTS).toContain(400)
    expect(heroFontHref('Archivo Black')).toBe('https://fonts.googleapis.com/css2?family=Archivo+Black:wght@400;700;800;900&display=swap')
    expect(heroFontHref('Some Family')).toMatch(/wght@400;/)
  })

  it('heroFontStack replaces a trailing Google category word with a real generic and leaves everything else alone', () => {
    expect(heroFontStack("'Archivo Black', display")).toBe("'Archivo Black', sans-serif")
    expect(heroFontStack("'Pacifico', handwriting")).toBe("'Pacifico', cursive")
    expect(heroFontStack("'Inter', sans-serif")).toBe("'Inter', sans-serif")
    expect(heroFontStack('inherit')).toBe('inherit')
    expect(heroFontStack(undefined)).toBeUndefined()
  })

  it('all four hero rows resolve to the same fallback generic whichever way they were stored', () => {
    const stored = ["'Archivo Black', sans-serif", "'Archivo Black', sans-serif", "'Archivo Black', display", "'Archivo Black', display"]
    const generics = stored.map((s) => heroFontStack(s).split(',').pop()!.trim())
    expect(new Set(generics)).toEqual(new Set(['sans-serif']))
  })

  it('googleFontStack never stores a Google category word', () => {
    expect(googleFontStack('Archivo Black', 'display')).toBe("'Archivo Black', sans-serif")
    expect(googleFontStack('Pacifico', 'handwriting')).toBe("'Pacifico', cursive")
    expect(googleFontStack('Lora', 'serif')).toBe("'Lora', serif")
    expect(googleFontStack('Inter', 'sans-serif')).toBe("'Inter', sans-serif")
  })
})
