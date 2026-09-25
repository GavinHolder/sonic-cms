import { describe, it, expect } from 'vitest'
import { freeformStackOrders } from '@/types/section'
import { HERO_FONT_WEIGHTS, heroFontHref, heroFontStack } from '@/lib/hero/hero-fonts'
import { googleFontStack } from '@/lib/fonts/google-font-stack'

type Ov = Parameters<typeof freeformStackOrders>[0]
const pos = (y: number) => ({ x: 50, y })
const overlay = (o: Partial<Ov> = {}): Ov => ({ headingRows: [], buttons: [], images: [], ...o } as Ov)
// the visible top-to-bottom sequence implied by the orders (null = plain DOM order)
const sequence = (keys: string[], orders: Record<string, number> | null) =>
  orders ? [...keys].sort((a, b) => orders[a] - orders[b]) : keys

describe('freeformStackOrders — mobile stack reading order (undragged elements travel with the element they follow)', () => {
  it('owner slide: every element dragged -> ascending y, so the logo authored at the top leads', () => {
    const ov = overlay({ headingRows: [27, 37, 56, 67].map((y) => ({ pos: pos(y) })) as never, images: [{ pos: pos(8) }] as never })
    expect(sequence(['row-0', 'row-1', 'row-2', 'row-3', 'img-0'], freeformStackOrders(ov, false))).toEqual(['img-0', 'row-0', 'row-1', 'row-2', 'row-3'])
  })

  it('review example 1: heading + logo dragged, subheading + button not -> logo, heading, subheading, button (heading is NOT scattered to the end)', () => {
    const ov = overlay({ headingRows: [], headingPos: pos(40), subheading: { text: 's' } as never, buttons: [{}] as never, images: [{ pos: pos(8) }] as never })
    expect(sequence(['heading', 'subheading', 'btn-0', 'img-0'], freeformStackOrders(ov, false))).toEqual(['img-0', 'heading', 'subheading', 'btn-0'])
  })

  it('review example 2: row 0 + logo dragged, rows 1-3 not -> logo, row0, row1, row2, row3', () => {
    const ov = overlay({ headingRows: [{ pos: pos(27) }, {}, {}, {}] as never, images: [{ pos: pos(8) }] as never })
    expect(sequence(['row-0', 'row-1', 'row-2', 'row-3', 'img-0'], freeformStackOrders(ov, false))).toEqual(['img-0', 'row-0', 'row-1', 'row-2', 'row-3'])
  })

  it('nothing dragged -> null (no order styles at all), whatever elements the slide has', () => {
    const ov = overlay({ headingRows: [{}, {}] as never, subheading: { text: 's' } as never, buttons: [{}, {}] as never, images: [{}, {}] as never })
    expect(freeformStackOrders(ov, true)).toBeNull()
  })

  it('an undragged eyebrow that is first stays first, even when everything after it is dragged out of order', () => {
    const o = freeformStackOrders(overlay({ headingRows: [{ pos: pos(60) }, { pos: pos(20) }] as never }), true)!
    expect(sequence(['eyebrow', 'row-0', 'row-1'], o)).toEqual(['eyebrow', 'row-1', 'row-0'])
    expect(o.eyebrow).toBe(0)
  })

  it('an undragged button after a dragged heading travels with it', () => {
    const ov = overlay({ headingRows: [{ pos: pos(70) }] as never, buttons: [{}] as never, images: [{ pos: pos(10) }] as never })
    expect(sequence(['row-0', 'btn-0', 'img-0'], freeformStackOrders(ov, false))).toEqual(['img-0', 'row-0', 'btn-0'])
  })

  it('an undragged image after a dragged logo moves up with it (accepted)', () => {
    const ov = overlay({ headingRows: [{ pos: pos(50) }] as never, images: [{ pos: pos(8) }, {}] as never })
    expect(sequence(['row-0', 'img-0', 'img-1'], freeformStackOrders(ov, false))).toEqual(['img-0', 'img-1', 'row-0'])
  })

  it('an undragged image after dragged rows stays last (already in order -> null)', () => {
    expect(freeformStackOrders(overlay({ headingRows: [{ pos: pos(60) }, { pos: pos(80) }] as never, images: [{}] as never }), false)).toBeNull()
  })

  it('ties are stable (equal y keeps DOM order); a lone dragged element that is already in order is null', () => {
    expect(freeformStackOrders(overlay({ headingRows: [{ pos: pos(38) }, { pos: pos(38) }] as never }), false)).toBeNull()
    // undragged rows first (key -Infinity), a dragged logo after them: already in order
    expect(freeformStackOrders(overlay({ headingRows: [{}, {}] as never, images: [{ pos: pos(8) }] as never }), false)).toBeNull()
  })

  it('elements with a posMobile are out of the flow and ignored (no rank, no influence)', () => {
    const o = freeformStackOrders(overlay({ headingRows: [{ pos: pos(60) }, { pos: pos(20), posMobile: pos(50) }, { pos: pos(30) }] as never }), false)!
    expect(o['row-1']).toBeUndefined()
    expect(o['row-2']).toBeLessThan(o['row-0'])
  })

  it('an eyebrow that is not rendered (hidden or empty) takes no place; legacy single heading is keyed "heading"', () => {
    const o = freeformStackOrders(overlay({ eyebrowHidden: true, eyebrowPos: pos(5), headingRows: [], headingPos: pos(50), images: [{ pos: pos(8) }] as never }), true)!
    expect(o.eyebrow).toBeUndefined()
    expect(o['img-0']).toBeLessThan(o.heading)
  })

  it('malformed pos (NaN / Infinity / missing y) counts as undragged', () => {
    const ov = overlay({ headingRows: [{ pos: { x: 50, y: NaN } }, { pos: pos(10) }] as never, images: [{ pos: { x: 50 } }, { pos: { x: 50, y: Infinity } }] as never })
    expect(freeformStackOrders(ov, false)).toBeNull() // keys: -Inf, 10, 10, 10 -> already in order
  })

  it('property: random mixed slides keep the invariants (permutation, null when nothing dragged, undragged directly after its predecessor, sorted, equal keys keep DOM order)', () => {
    let seed = 20260926
    const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    const pick = (a: number[]) => a[Math.floor(rnd() * a.length)]
    const YS = [0, 5, 10, 20, 20, 40, 40, 80, 100]
    let reordered = 0
    for (let n = 0; n < 500; n++) {
      const el = (): any => {
        const e: any = {}
        if (rnd() < 0.5) e.pos = pos(pick(YS))
        if (rnd() < 0.15) e.posMobile = pos(50)
        return e
      }
      const rows = Array.from({ length: Math.floor(rnd() * 5) }, el)
      const btns = Array.from({ length: Math.floor(rnd() * 3) }, el)
      const imgs = Array.from({ length: Math.floor(rnd() * 3) }, el)
      const hasSub = rnd() < 0.6, hasEyebrow = rnd() < 0.5
      const eyebrow = el(), sub = el(), legacy = el()
      const ov = overlay({
        eyebrowPos: eyebrow.pos, eyebrowPosMobile: eyebrow.posMobile,
        headingRows: rows as never, headingPos: legacy.pos, headingPosMobile: legacy.posMobile,
        subheading: hasSub ? ({ text: 's' } as never) : undefined, subheadingPos: sub.pos, subheadingPosMobile: sub.posMobile,
        buttons: btns as never, images: imgs as never,
      })
      // reference model: all elements in DOM order, then the in-flow ones with their (own or inherited) keys
      const all: any[] = []
      if (hasEyebrow) all.push({ key: 'eyebrow', ...eyebrow })
      if (rows.length) rows.forEach((r: any, i: number) => all.push({ key: `row-${i}`, ...r })); else all.push({ key: 'heading', ...legacy })
      if (hasSub) all.push({ key: 'subheading', ...sub })
      btns.forEach((b: any, i: number) => all.push({ key: `btn-${i}`, ...b }))
      imgs.forEach((im: any, i: number) => all.push({ key: `img-${i}`, ...im }))
      const flow = all.filter((e) => !e.posMobile)
      let carried = -Infinity
      const keyOf = flow.map((e) => { if (e.pos && Number.isFinite(e.pos.y)) carried = e.pos.y; return carried })

      const o = freeformStackOrders(ov, hasEyebrow)
      if (!flow.some((e) => e.pos)) { expect(o).toBeNull(); continue } // (b) nothing dragged -> null
      for (const e of all.filter((x) => x.posMobile)) expect(o?.[e.key]).toBeUndefined() // posMobile excluded
      const ranks = o ? flow.map((e) => o[e.key]) : flow.map((_, i) => i)
      if (o) reordered++
      expect([...ranks].sort((a, b) => a - b)).toEqual(flow.map((_, i) => i)) // (d) each rank used exactly once
      flow.forEach((e, i) => {
        if (!e.pos && i > 0) expect(ranks[i]).toBe(ranks[i - 1] + 1) // (a) undragged is directly after its original predecessor
      })
      if (!flow[0].pos) expect(ranks[0]).toBe(0) // an undragged first element stays first
      const seq = flow.map((_, i) => i).sort((a, b) => ranks[a] - ranks[b]) // DOM indices in visual order
      for (let k = 1; k < seq.length; k++) {
        expect(keyOf[seq[k - 1]] <= keyOf[seq[k]]).toBe(true) // sorted by key
        if (keyOf[seq[k - 1]] === keyOf[seq[k]]) expect(seq[k - 1]).toBeLessThan(seq[k]) // (c) equal keys keep DOM order
      }
      if (o === null) expect(seq).toEqual(flow.map((_, i) => i))
    }
    expect(reordered).toBeGreaterThan(50) // the generator really produced reorderings
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
