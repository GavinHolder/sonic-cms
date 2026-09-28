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

describe('freeformStackOrders — mobile stack reading order (RUNNING-MAX: a dragged element sorts by its own y; an undragged element takes the key of the highest dragged y seen so far in DOM order, so it can only be pushed LATER, never earlier, than a dragged element already seen)', () => {
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

  it('THIRD-REVIEW counter-example: a later dragged row with a SMALLER y must not leave a stale key that lets undragged elements after it leapfrog an earlier, higher-y dragged row (eyebrow undragged, ALPHA y=40, BETA y=30, subheading undragged, button undragged, Logo y=8 -> EYEBROW, Logo, BETA, ALPHA, Subheading, Button)', () => {
    // DOM order: eyebrow, row-0 (ALPHA, dragged y=40), row-1 (BETA, dragged y=30), subheading (undragged), btn-0 (undragged), img-0 (Logo, dragged y=8).
    // The old "inherit the immediate predecessor's key" model carried BETA's smaller y=30 forward onto subheading/btn-0, which then
    // sorted BEFORE ALPHA (key=40) even though ALPHA appeared earlier in DOM — scattering ALPHA to the very end. RUNNING-MAX never lets
    // the carried key decrease: after ALPHA (y=40), runningMax stays 40 through BETA (y=30), so subheading/btn-0 correctly key at 40,
    // tying with (and sorting after, by DOM index) ALPHA — never before it.
    const ov = overlay({
      headingRows: [{ pos: pos(40) }, { pos: pos(30) }] as never, // row-0 = ALPHA, row-1 = BETA
      subheading: { text: 's' } as never, // undragged (no subheadingPos)
      buttons: [{}] as never, // undragged
      images: [{ pos: pos(8) }] as never, // Logo, dragged
    })
    const o = freeformStackOrders(ov, true) // hasEyebrow=true, no eyebrowPos -> eyebrow undragged
    expect(sequence(['eyebrow', 'row-0', 'row-1', 'subheading', 'btn-0', 'img-0'], o))
      .toEqual(['eyebrow', 'img-0', 'row-1', 'row-0', 'subheading', 'btn-0'])
  })

  it('FOURTH-REVIEW counter-example: an undragged element between two dragged elements is unchanged when the LATER dragged y is already >= the running max at that point (row-0 y=10, subheading undragged, img-0 y=90 -> byte-identical to DOM order, null). A "clamp the undragged key to +Infinity once any dragged element precedes it" bug would wrongly push subheading after img-0.', () => {
    const ov = overlay({ headingRows: [{ pos: pos(10) }] as never, subheading: { text: 's' } as never, images: [{ pos: pos(90) }] as never })
    expect(freeformStackOrders(ov, false)).toBeNull()
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

  it('an undragged image after a dragged logo does NOT leapfrog an earlier, higher-y dragged row (corrected expectation — the row\'s running max is still in effect when the image is reached)', () => {
    // DOM order: row-0 (dragged y=50), img-0 (dragged y=8), img-1 (undragged). runningMax after row-0 is 50; img-0 (y=8) does not
    // lower it; img-1 keys at 50, tying with row-0 — DOM index breaks the tie (row-0's index 0 < img-1's index 2), so row-0 stays
    // before img-1. (Previously this test asserted img-1 leapfrogged row-0 — that was the same bug class as the THIRD-REVIEW case.)
    const ov = overlay({ headingRows: [{ pos: pos(50) }] as never, images: [{ pos: pos(8) }, {}] as never })
    expect(sequence(['row-0', 'img-0', 'img-1'], freeformStackOrders(ov, false))).toEqual(['img-0', 'row-0', 'img-1'])
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

  it('property: random mixed slides satisfy the real semantic invariants directly (not a re-derivation of the implementation — this is exactly why the previous property test, which rebuilt the same "carried" model as the code under test, did not catch the THIRD-REVIEW bug)', () => {
    let seed = 20260926
    const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    const pick = (a: number[]) => a[Math.floor(rnd() * a.length)]
    // Deliberately includes duplicates AND a non-monotonic mix (small values after large ones commonly occur), so the generator
    // regularly produces the exact "later dragged element has a smaller y" shape the THIRD-REVIEW bug needed.
    const YS = [0, 5, 8, 10, 20, 20, 30, 40, 40, 50, 80, 100]
    let reordered = 0
    let sawLeapfrogRisk = 0 // slides where a later dragged y < an earlier dragged y AND an undragged element sits between/after them
    let sawFifthInvariantRisk = 0 // slides where invariant (5) actually constrains something (a later dragged y >= an undragged element's running max)
    for (let n = 0; n < 500; n++) {
      const el = (): any => {
        const e: any = {}
        if (rnd() < 0.55) e.pos = pos(pick(YS))
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

      // The same element list freeformStackOrders itself builds, in DOM order — used only to describe positions/keys for
      // assertions, never to re-derive the ordering algorithm.
      const all: Array<{ key: string; pos?: { x: number; y: number }; posMobile?: { x: number; y: number } }> = []
      if (hasEyebrow) all.push({ key: 'eyebrow', ...eyebrow })
      if (rows.length) rows.forEach((r: any, i: number) => all.push({ key: `row-${i}`, ...r })); else all.push({ key: 'heading', ...legacy })
      if (hasSub) all.push({ key: 'subheading', ...sub })
      btns.forEach((b: any, i: number) => all.push({ key: `btn-${i}`, ...b }))
      imgs.forEach((im: any, i: number) => all.push({ key: `img-${i}`, ...im }))
      const flow = all.filter((e) => !e.posMobile)
      const isDragged = (e: (typeof flow)[number]) => !!e.pos && Number.isFinite(e.pos.y)

      const o = freeformStackOrders(ov, hasEyebrow)
      for (const e of all.filter((x) => x.posMobile)) expect(o?.[e.key]).toBeUndefined() // posMobile always excluded

      // (2) nothing dragged -> null AND the final order is the original DOM order, byte-identical to no ordering logic at all
      if (!flow.some(isDragged)) {
        expect(o).toBeNull()
        continue
      }
      if (o) reordered++

      // visual (final) order as a list of `flow` indices, DOM order when o is null
      const finalOrder = o ? flow.map((_, i) => i).sort((a, b) => o[flow[a].key] - o[flow[b].key]) : flow.map((_, i) => i)
      const finalIndexOf = new Map(finalOrder.map((domIdx, visualIdx) => [domIdx, visualIdx]))
      expect([...finalIndexOf.values()].sort((a, b) => a - b)).toEqual(flow.map((_, i) => i)) // a real permutation, each rank used once

      // (1) among dragged elements only, final relative order == ascending pos.y, ties by original DOM index
      const draggedIdx = flow.map((_, i) => i).filter((i) => isDragged(flow[i]))
      const draggedInFinalOrder = [...draggedIdx].sort((a, b) => finalIndexOf.get(a)! - finalIndexOf.get(b)!)
      const expectedDraggedOrder = [...draggedIdx].sort((a, b) => flow[a].pos!.y - flow[b].pos!.y || a - b)
      expect(draggedInFinalOrder).toEqual(expectedDraggedOrder)

      // (3) an undragged element must never appear before a dragged element that preceded it in DOM order
      for (let x = 0; x < flow.length; x++) {
        if (isDragged(flow[x])) continue
        for (let d = 0; d < x; d++) {
          if (!isDragged(flow[d])) continue
          sawLeapfrogRisk++
          expect(finalIndexOf.get(x)!).toBeGreaterThan(finalIndexOf.get(d)!)
        }
      }

      // (4) two undragged elements with no dragged element between them in DOM order keep their relative DOM order
      for (let x = 0; x < flow.length; x++) {
        if (isDragged(flow[x])) continue
        for (let y = x + 1; y < flow.length; y++) {
          if (isDragged(flow[y])) break // a dragged element sits between x and y -> invariant (4) doesn't apply past it
          expect(finalIndexOf.get(x)!).toBeLessThan(finalIndexOf.get(y)!)
        }
      }

      // (5) an undragged element must sort before every LATER dragged element whose y is >= the running max at the point the
      // undragged element was keyed — i.e. it must never get pushed past a later dragged element it should still precede. This
      // is NOT jointly implied by (1)-(4): a buggy "clamp the undragged key to +Infinity once any dragged element precedes it"
      // implementation satisfies all four of those yet fails this one (FOURTH-REVIEW).
      for (let x = 0; x < flow.length; x++) {
        if (isDragged(flow[x])) continue
        const runningMaxAtX = flow.slice(0, x).reduce((m, e) => (isDragged(e) ? Math.max(m, e.pos!.y) : m), -Infinity)
        for (let d = x + 1; d < flow.length; d++) {
          if (!isDragged(flow[d])) continue
          if (flow[d].pos!.y >= runningMaxAtX) {
            sawFifthInvariantRisk++
            expect(finalIndexOf.get(x)!).toBeLessThan(finalIndexOf.get(d)!)
          }
        }
      }
    }
    expect(reordered).toBeGreaterThan(50) // the generator really produced reorderings
    expect(sawLeapfrogRisk).toBeGreaterThan(50) // and really exercised invariant (3) — the exact shape the THIRD-REVIEW bug broke
    expect(sawFifthInvariantRisk).toBeGreaterThan(50) // and really exercised invariant (5) — the exact shape the FOURTH-REVIEW bug broke
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
