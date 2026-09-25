import { describe, it, expect } from 'vitest'
import { freeformStackOrders } from '@/types/section'
import { HERO_FONT_WEIGHTS, heroFontHref, heroFontStack } from '@/lib/hero/hero-fonts'
import { googleFontStack } from '@/lib/fonts/google-font-stack'

type Ov = Parameters<typeof freeformStackOrders>[0]
const pos = (y: number) => ({ x: 50, y })
const overlay = (o: Partial<Ov> = {}): Ov => ({ headingRows: [], buttons: [], images: [], ...o } as Ov)
// the visible top-to-bottom sequence implied by the orders (undefined map = plain DOM order)
const sequence = (keys: string[], orders: Record<string, number> | null) =>
  orders ? [...keys].sort((a, b) => orders[a] - orders[b]) : keys

describe('freeformStackOrders — mobile stack reading order (only dragged elements take part)', () => {
  it("a logo dragged to the top leads the column; the rows dragged below follow in design order", () => {
    const ov = overlay({
      headingRows: [27, 37, 56, 67].map((y) => ({ pos: pos(y) })) as never,
      images: [{ pos: pos(8) }] as never,
    })
    const o = freeformStackOrders(ov, false)
    expect(sequence(['row-0', 'row-1', 'row-2', 'row-3', 'img-0'], o)).toEqual(['img-0', 'row-0', 'row-1', 'row-2', 'row-3'])
  })

  it('a slide where NOTHING was dragged is untouched (null => no order styles at all), whatever elements it has', () => {
    const ov = overlay({
      eyebrowPos: undefined,
      headingRows: [{}, {}] as never,
      subheading: { text: 's' } as never,
      buttons: [{}, {}] as never,
      images: [{}, {}] as never,
    })
    expect(freeformStackOrders(ov, true)).toBeNull()
  })

  it('an undragged image stays LAST even when the rows above it were dragged (defaults never influence the order)', () => {
    const ov = overlay({ headingRows: [{ pos: pos(60) }, { pos: pos(20) }] as never, images: [{}] as never })
    const o = freeformStackOrders(ov, false)
    expect(sequence(['row-0', 'row-1', 'img-0'], o)).toEqual(['row-1', 'row-0', 'img-0'])
  })

  it('mixed pos / no-pos with every kind present: only the dragged elements permute among their own slots', () => {
    // DOM: eyebrow(U) row-0(P y70) row-1(U) subheading(P y10) btn-0(U) btn-1(P y40) img-0(U)
    const ov = overlay({
      eyebrowPos: undefined,
      headingRows: [{ pos: pos(70) }, {}] as never,
      subheading: { text: 's' } as never,
      subheadingPos: pos(10),
      buttons: [{}, { pos: pos(40) }] as never,
      images: [{}] as never,
    })
    const keys = ['eyebrow', 'row-0', 'row-1', 'subheading', 'btn-0', 'btn-1', 'img-0']
    const o = freeformStackOrders(ov, true)!
    // P slots (DOM order): row-0=1, subheading=3, btn-1=5 -> refilled by y asc: subheading(10)->1, btn-1(40)->3, row-0(70)->5
    expect(sequence(keys, o)).toEqual(['eyebrow', 'subheading', 'row-1', 'btn-1', 'btn-0', 'row-0', 'img-0'])
    // undragged elements kept their exact slots
    expect(o.eyebrow).toBe(0); expect(o['row-1']).toBe(2); expect(o['btn-0']).toBe(4); expect(o['img-0']).toBe(6)
  })

  it('ties are stable (equal y keeps DOM order) and an already-in-design-order slide returns null', () => {
    expect(freeformStackOrders(overlay({ headingRows: [{ pos: pos(38) }, { pos: pos(38) }] as never }), false)).toBeNull()
    expect(freeformStackOrders(overlay({ headingRows: [{ pos: pos(10) }, { pos: pos(20) }] as never, images: [{ pos: pos(80) }] as never }), false)).toBeNull()
  })

  it('a single dragged element has nothing to reorder against (null) — e.g. only a logo was dragged', () => {
    expect(freeformStackOrders(overlay({ headingRows: [{}, {}] as never, images: [{ pos: pos(8) }] as never }), false)).toBeNull()
  })

  it('elements with a posMobile are out of the flow and ignored (they neither move nor take a slot)', () => {
    const ov = overlay({
      headingRows: [{ pos: pos(60) }, { pos: pos(20), posMobile: pos(50) }, { pos: pos(30) }] as never,
    })
    const o = freeformStackOrders(ov, false)! // flow = row-0 (y60), row-2 (y30) -> row-2 first
    expect(o['row-2']).toBeLessThan(o['row-0'])
    expect(o['row-1']).toBeUndefined()
  })

  it('an eyebrow that is not rendered (hidden or empty) does not occupy a slot; legacy single heading is keyed "heading"', () => {
    const hidden = freeformStackOrders(overlay({ eyebrowHidden: true, eyebrowPos: pos(5), headingRows: [], headingPos: pos(50), images: [{ pos: pos(8) }] as never }), true)!
    expect(hidden.eyebrow).toBeUndefined()
    expect(hidden['img-0']).toBeLessThan(hidden.heading)
    expect(freeformStackOrders(overlay({ headingRows: [], headingPos: pos(50), images: [{ pos: pos(8) }] as never }), false)!.heading).toBe(1)
  })

  it('malformed pos (NaN / missing y) is treated as not dragged', () => {
    expect(freeformStackOrders(overlay({ headingRows: [{ pos: { x: 50, y: NaN } }, { pos: pos(10) }] as never, images: [{ pos: { x: 50 } }] as never }), false)).toBeNull()
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
