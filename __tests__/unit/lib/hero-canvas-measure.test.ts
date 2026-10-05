import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ALIGN_H,
  ALIGN_V,
  ALIGN_VISIBLE_MARGIN_PCT,
  DRAG_THRESHOLD_PX,
  MIN_HANDLE_PX,
  NO_GUIDES,
  SNAP_PX,
  alignTargets,
  centreOf,
  centrePct,
  clampPct,
  computeDragStep,
  distributeValues,
  effectivePos,
  handleRect,
  isUsableRect,
  makeRect,
  pctToPx,
  pxToPct,
  rectsEqual,
  scaleRect,
  translateRect,
  visibleRangePct,
  type DragStart,
  type Rect,
} from '@/lib/hero/hero-canvas-measure'
import { HERO_CANVAS_FREEZE_CSS, HERO_FRAME_DEFAULT_NAVBAR_PX, heroFrameCss } from '@/lib/hero/hero-frame'

// Real-page frame, measured live (same at every breakpoint): the freeform layer starts at
// top = navbar height (100px) and is exactly one viewport tall; the hero clips the rest.
const TABLET_VIEW = { w: 768, h: 1024 }
const TABLET_LAYER: Rect = { x: 0, y: 100, w: 768, h: 1024 }
const MOBILE_VIEW = { w: 375, h: 812 }
const MOBILE_LAYER: Rect = { x: 0, y: 100, w: 375, h: 812 }

describe('rect helpers', () => {
  it('isUsableRect needs finite coordinates and positive size', () => {
    expect(isUsableRect(TABLET_LAYER)).toBe(true)
    expect(isUsableRect({ x: 0, y: 0, w: 0, h: 10 })).toBe(false)
    expect(isUsableRect({ x: 0, y: 0, w: 10, h: -1 })).toBe(false)
    expect(isUsableRect({ x: NaN, y: 0, w: 10, h: 10 })).toBe(false)
    expect(isUsableRect({ x: 0, y: 0, w: Infinity, h: 10 })).toBe(false)
    expect(isUsableRect(null)).toBe(false)
    expect(isUsableRect(undefined)).toBe(false)
  })

  it('makeRect rejects non-finite input and negative sizes (zero size is allowed - it is "not laid out", callers filter it)', () => {
    expect(makeRect(1, 2, 3, 4)).toEqual({ x: 1, y: 2, w: 3, h: 4 })
    expect(makeRect(NaN, 0, 1, 1)).toBeNull()
    expect(makeRect(0, 0, -1, 1)).toBeNull()
    expect(makeRect(0, 0, 0, 0)).toEqual({ x: 0, y: 0, w: 0, h: 0 })
  })

  it('rectsEqual tolerates sub-pixel jitter only', () => {
    expect(rectsEqual({ x: 1, y: 1, w: 10, h: 10 }, { x: 1.2, y: 1, w: 10, h: 10.1 })).toBe(true)
    expect(rectsEqual({ x: 1, y: 1, w: 10, h: 10 }, { x: 1.6, y: 1, w: 10, h: 10 })).toBe(false)
    expect(rectsEqual(null, null)).toBe(true)
    expect(rectsEqual(null, TABLET_LAYER)).toBe(false)
  })

  it('scaleRect / translateRect do plain arithmetic', () => {
    expect(scaleRect({ x: 10, y: 20, w: 100, h: 40 }, 0.5)).toEqual({ x: 5, y: 10, w: 50, h: 20 })
    expect(translateRect({ x: 10, y: 20, w: 100, h: 40 }, -3, 4)).toEqual({ x: 7, y: 24, w: 100, h: 40 })
  })

  it('handleRect scales, and grows tiny elements about their centre to the minimum hit size', () => {
    expect(handleRect({ x: 100, y: 200, w: 200, h: 80 }, 0.5)).toEqual({ x: 50, y: 100, w: 100, h: 40 })
    const tiny = handleRect({ x: 100, y: 200, w: 4, h: 4 }, 0.5) // scaled 2x2 -> min 16x16 around the same centre
    expect(tiny.w).toBe(MIN_HANDLE_PX)
    expect(tiny.h).toBe(MIN_HANDLE_PX)
    expect(tiny.x + tiny.w / 2).toBeCloseTo(51, 6)
    expect(tiny.y + tiny.h / 2).toBeCloseTo(101, 6)
  })
})

describe('clampPct', () => {
  it('rounds to whole % and clamps to 0..100', () => {
    expect(clampPct(22.949)).toBe(23)
    expect(clampPct(-5)).toBe(0)
    expect(clampPct(101.4)).toBe(100)
    expect(clampPct(50.5)).toBe(51)
  })

  it('never leaks NaN / Infinity into saved data', () => {
    expect(clampPct(NaN)).toBe(50)
    expect(clampPct(Infinity)).toBe(50)
    expect(clampPct(-Infinity)).toBe(50)
    expect(clampPct(NaN, 0, 40)).toBe(20)
  })
})

describe('measured px <-> layer % (real page numbers)', () => {
  it('tablet 768x1024: "BUILT" at y 306 h 58 -> centre 335 -> 22.95% (stored as 23)', () => {
    const built: Rect = { x: 234, y: 306, w: 300, h: 58 }
    expect(centreOf(built)).toEqual({ x: 384, y: 335 })
    const c = centrePct(built, TABLET_LAYER)!
    expect(c.x).toBeCloseTo(50, 6)
    expect(c.y).toBeCloseTo(22.949, 3)
    expect(clampPct(c.y)).toBe(23)
  })

  it('mobile 375x812: layer at 0,100 - an element centred 100 + 0.5*812 down is y 50%', () => {
    const c = pxToPct({ x: 187.5, y: 100 + 406 }, MOBILE_LAYER)!
    expect(c.x).toBeCloseTo(50, 6)
    expect(c.y).toBeCloseTo(50, 6)
  })

  it('has NO navbar assumption: the same screen px map differently when the layer starts at 0', () => {
    const p = { x: 384, y: 335 }
    expect(pxToPct(p, TABLET_LAYER)!.y).toBeCloseTo(22.949, 3)
    expect(pxToPct(p, { ...TABLET_LAYER, y: 0 })!.y).toBeCloseTo(32.715, 3)
  })

  it('pctToPx is the inverse of pxToPct', () => {
    const px = pctToPx({ x: 50, y: 23 }, TABLET_LAYER)!
    expect(px.x).toBeCloseTo(384, 6)
    expect(px.y).toBeCloseTo(100 + 0.23 * 1024, 6)
    const back = pxToPct(px, TABLET_LAYER)!
    expect(back.x).toBeCloseTo(50, 6)
    expect(back.y).toBeCloseTo(23, 6)
  })

  it('returns null (never NaN) for zero / NaN / missing layers and non-finite points', () => {
    expect(pxToPct({ x: 1, y: 1 }, { x: 0, y: 0, w: 0, h: 100 })).toBeNull()
    expect(pxToPct({ x: 1, y: 1 }, { x: 0, y: 0, w: 100, h: NaN })).toBeNull()
    expect(pxToPct({ x: 1, y: 1 }, null)).toBeNull()
    expect(pxToPct({ x: NaN, y: 1 }, TABLET_LAYER)).toBeNull()
    expect(pctToPx({ x: 50, y: 50 }, { x: 0, y: 0, w: 0, h: 0 })).toBeNull()
    expect(centrePct({ x: 0, y: 0, w: 0, h: 0 }, TABLET_LAYER)).toBeNull()
    expect(centrePct(null, TABLET_LAYER)).toBeNull()
  })
})

describe('visibleRangePct', () => {
  it('tablet: the navbar offset makes the layer taller than what the hero shows (bottom clipped)', () => {
    const r = visibleRangePct(TABLET_LAYER, TABLET_VIEW)
    expect(r.min).toEqual({ x: 0, y: 0 })
    expect(r.max.x).toBe(100)
    expect(r.max.y).toBeCloseTo(((1024 - 100) / 1024) * 100, 6) // 90.23
  })

  it('mobile: 375x812', () => {
    const r = visibleRangePct(MOBILE_LAYER, MOBILE_VIEW)
    expect(r.max.y).toBeCloseTo(((812 - 100) / 812) * 100, 6) // 87.68
  })

  it('a layer that starts at 0 (no navbar offset) is fully visible', () => {
    expect(visibleRangePct({ x: 0, y: 0, w: 375, h: 812 }, MOBILE_VIEW).max).toEqual({ x: 100, y: 100 })
  })

  it('falls back to the full range when the layer or view is unusable', () => {
    expect(visibleRangePct(null, MOBILE_VIEW)).toEqual({ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } })
    expect(visibleRangePct(TABLET_LAYER, { w: 0, h: 0 })).toEqual({ min: { x: 0, y: 0 }, max: { x: 100, y: 100 } })
  })
})

describe('computeDragStep', () => {
  const builtCentre = { x: 50, y: ((335 - 100) / 1024) * 100 } // 22.949
  const start: DragStart = { pointer: { x: 200, y: 300 }, startPos: { x: 50, y: 23 }, startCentre: builtCentre }
  const base = { scale: 0.5, layer: TABLET_LAYER, view: TABLET_VIEW, snapEnabled: false, others: [] as { x: number; y: number }[] }

  it('is a no-op when the pointer has not moved', () => {
    const r = computeDragStep({ ...base, start, pointer: { x: 200, y: 300 } })
    expect(r.pos).toEqual({ x: 50, y: 23 })
    expect(r.guides).toEqual(NO_GUIDES)
  })

  it('converts outer px -> frame px (/scale) -> layer % and shifts the stored pos by that delta', () => {
    // down 100 outer px at scale 0.5 = 200 frame px = 19.53% of the 1024px-tall layer
    const r = computeDragStep({ ...base, start, pointer: { x: 200, y: 400 } })
    expect(r.pos.x).toBe(50)
    expect(r.pos.y).toBe(Math.round(23 + (200 / 1024) * 100)) // 43
    expect(r.centre.y).toBeCloseTo(builtCentre.y + (r.pos.y - 23), 6)
  })

  it('x travel is relative to the layer WIDTH, y travel to the layer HEIGHT', () => {
    // right 38.4 outer px = 76.8 frame px = 10% of 768
    const r = computeDragStep({ ...base, start, pointer: { x: 200 + 38.4, y: 300 } })
    expect(r.pos.x).toBe(60)
    expect(r.pos.y).toBe(23)
  })

  it('does not teleport: grabbing an element off its centre keeps the grab offset', () => {
    // pointer starts 30 outer px right of the element centre; a 0-travel "drag" must not move it
    const grabbed: DragStart = { ...start, pointer: { x: 230, y: 310 } }
    const r = computeDragStep({ ...base, start: grabbed, pointer: { x: 230, y: 310 } })
    expect(r.pos).toEqual({ x: 50, y: 23 })
  })

  it('clamps the centre to the VISIBLE device area, so an element can never be dropped where it cannot be re-grabbed', () => {
    const r = computeDragStep({ ...base, start, pointer: { x: 200, y: 300 + 100000 } })
    const maxY = ((1024 - 100) / 1024) * 100
    // rounding to a whole % never pushes the centre back outside the visible area
    expect(r.centre.y).toBeLessThanOrEqual(maxY + 1e-9)
    expect(r.centre.y).toBeGreaterThan(maxY - 1)
    expect(r.pos.y).toBe(Math.floor(23 + (maxY - builtCentre.y)))
    const up = computeDragStep({ ...base, start, pointer: { x: 200, y: 300 - 100000 } })
    expect(up.pos.y).toBeGreaterThanOrEqual(0)
    expect(up.pos.y).toBeLessThanOrEqual(1) // centre pinned to the layer top (below the navbar band)
  })

  it('a mobile element still in the auto stack uses its MEASURED centre as the start (not a stale fallback pos)', () => {
    const stackedCentre = { x: 50, y: 61.3 }
    const stackedStart: DragStart = { pointer: { x: 100, y: 100 }, startPos: stackedCentre, startCentre: stackedCentre }
    const r = computeDragStep({ ...base, layer: MOBILE_LAYER, view: MOBILE_VIEW, start: stackedStart, pointer: { x: 100, y: 100 + 40.6 } })
    // 40.6 outer px at 0.5 = 81.2 frame px = 10% of 812
    expect(r.pos.y).toBe(Math.round(61.3 + 10))
  })

  it('an anchor that is not the centre (eyebrow aligned left/right) moves by the same delta', () => {
    const eyebrow: DragStart = { pointer: { x: 0, y: 0 }, startPos: { x: 60, y: 22 }, startCentre: { x: 45, y: 22 } }
    const r = computeDragStep({ ...base, start: eyebrow, pointer: { x: 38.4, y: 0 } }) // +10% x
    expect(r.pos).toEqual({ x: 70, y: 22 })
  })

  describe('snapping', () => {
    const snap = { ...base, snapEnabled: true }
    it('snaps to the layer centre within SNAP_PX screen px and reports a canvas guide', () => {
      // centre starts at x=48; move +0.5% -> 48.5 raw; threshold = 8 / 0.5 / 768 = 2.08%
      const s: DragStart = { pointer: { x: 0, y: 0 }, startPos: { x: 48, y: 30 }, startCentre: { x: 48, y: 30 } }
      const r = computeDragStep({ ...snap, start: s, pointer: { x: ((0.5 / 100) * 768) * 0.5, y: 0 } })
      expect(r.pos.x).toBe(50)
      expect(r.guides.vCanvas).toEqual([50])
      expect(r.guides.vElement).toEqual([])
    })

    it('does not snap outside the threshold', () => {
      const s: DragStart = { pointer: { x: 0, y: 0 }, startPos: { x: 40, y: 30 }, startCentre: { x: 40, y: 30 } }
      const r = computeDragStep({ ...snap, start: s, pointer: { x: 0, y: 0 } })
      expect(r.pos).toEqual({ x: 40, y: 30 })
      expect(r.guides).toEqual({ vCanvas: [], vElement: [], hCanvas: [], hElement: [] })
    })

    it('snaps to a sibling centre and reports an element guide', () => {
      const s: DragStart = { pointer: { x: 0, y: 0 }, startPos: { x: 20, y: 30 }, startCentre: { x: 20, y: 30 } }
      const r = computeDragStep({ ...snap, start: s, pointer: { x: 0, y: 0 }, others: [{ x: 21, y: 70 }] })
      expect(r.pos.x).toBe(21)
      expect(r.guides.vElement).toEqual([21])
      expect(r.guides.vCanvas).toEqual([])
    })

    it('snap threshold is in SCREEN px: a smaller scale makes the same % travel cover more % per screen px', () => {
      expect(SNAP_PX).toBe(8)
      const s: DragStart = { pointer: { x: 0, y: 0 }, startPos: { x: 47, y: 30 }, startCentre: { x: 47, y: 30 } }
      // 3% away from the centre: outside the threshold at scale 1 (1.04%), inside at scale 0.25 (4.17%)
      expect(computeDragStep({ ...snap, scale: 1, start: s, pointer: { x: 0, y: 0 } }).pos.x).toBe(47)
      expect(computeDragStep({ ...snap, scale: 0.25, start: s, pointer: { x: 0, y: 0 } }).pos.x).toBe(50)
    })
  })

  it('never emits NaN: unusable layer, zero scale or a bad pointer leave the position unchanged', () => {
    const bad = [
      computeDragStep({ ...base, start, layer: { x: 0, y: 0, w: 0, h: 0 }, pointer: { x: 500, y: 500 } }),
      computeDragStep({ ...base, start, scale: 0, pointer: { x: 500, y: 500 } }),
      computeDragStep({ ...base, start, scale: NaN, pointer: { x: 500, y: 500 } }),
      computeDragStep({ ...base, start, pointer: { x: NaN, y: 500 } }),
    ]
    for (const r of bad) {
      expect(r.pos).toEqual({ x: 50, y: 23 })
      expect(Number.isFinite(r.centre.x) && Number.isFinite(r.centre.y)).toBe(true)
    }
  })

  it('keeps the shared interaction constants', () => {
    expect(DRAG_THRESHOLD_PX).toBe(3)
    expect(ALIGN_H).toEqual({ left: 6, center: 50, right: 94 })
    expect(ALIGN_V).toEqual({ top: 8, middle: 50, bottom: 92 })
  })
})

describe('effectivePos', () => {
  it('uses the stored pos for an absolutely positioned element', () => {
    expect(effectivePos({ x: 40, y: 85 }, false, { x: 41.2, y: 84.7 })).toEqual({ x: 40, y: 85 })
  })
  it('uses the measured centre (whole %) for a stacked element', () => {
    expect(effectivePos({ x: 40, y: 85 }, true, { x: 50.2, y: 61.6 })).toEqual({ x: 50, y: 62 })
  })
  it('falls back to the stored pos when a stacked element is unmeasured', () => {
    expect(effectivePos({ x: 40, y: 85 }, true, null)).toEqual({ x: 40, y: 85 })
  })
})

describe('alignTargets', () => {
  it('equals the plain constants when the whole layer is visible', () => {
    const t = alignTargets({ x: 0, y: 0, w: 375, h: 812 }, MOBILE_VIEW)
    expect(t.h).toEqual(ALIGN_H)
    expect(t.v).toEqual(ALIGN_V)
  })

  it('pulls the bottom target inside the visible hero when the navbar offset clips the layer (tablet)', () => {
    const t = alignTargets(TABLET_LAYER, TABLET_VIEW)
    const maxY = ((1024 - 100) / 1024) * 100
    expect(t.v.top).toBe(ALIGN_V.top)
    expect(t.v.middle).toBe(ALIGN_V.middle)
    expect(t.v.bottom).toBeCloseTo(maxY - ALIGN_VISIBLE_MARGIN_PCT, 6)
    expect(t.v.bottom).toBeLessThan(ALIGN_V.bottom)
    expect(t.h).toEqual(ALIGN_H)
  })

  it('mobile', () => {
    const t = alignTargets(MOBILE_LAYER, MOBILE_VIEW)
    expect(t.v.bottom).toBeCloseTo(((812 - 100) / 812) * 100 - ALIGN_VISIBLE_MARGIN_PCT, 6)
  })

  it('unmeasured layer -> the plain constants', () => {
    const t = alignTargets(null, MOBILE_VIEW)
    expect(t.h).toEqual(ALIGN_H)
    expect(t.v).toEqual(ALIGN_V)
  })
})

describe('distributeValues', () => {
  it('keeps the first/last (by value) fixed and spaces the middle evenly', () => {
    const out = distributeValues([
      { id: 'a', value: 10 },
      { id: 'b', value: 20 },
      { id: 'c', value: 90 },
    ])
    expect(out).toEqual({ b: 50 })
  })
  it('sorts by value, not by input order', () => {
    const out = distributeValues([
      { id: 'c', value: 90 },
      { id: 'a', value: 10 },
      { id: 'b', value: 20 },
      { id: 'd', value: 25 },
    ])
    expect(out).toEqual({ b: 37, d: 63 })
  })
  it('needs 3+ items (with fewer there is nothing between the ends)', () => {
    expect(distributeValues([])).toEqual({})
    expect(distributeValues([{ id: 'a', value: 1 }])).toEqual({})
    expect(distributeValues([{ id: 'a', value: 1 }, { id: 'b', value: 9 }])).toEqual({})
  })
})

describe('heroFrameCss - the frame is EXACTLY the real page (hero = H, never H + navbar)', () => {
  it('pins height and min-height to the viewport height, with no navbar term', () => {
    const css = heroFrameCss(812, 100)
    expect(css).toContain('height: 812px !important')
    expect(css).toContain('min-height: 812px !important')
    expect(css).not.toContain('912px') // the old preview bug: 812 + 100
    expect(css).toContain('--navbar-height: 100px')
  })

  it('does not depend on the navbar height for the hero height (tall navbar too)', () => {
    const css = heroFrameCss(1024, 140)
    expect(css).toContain('height: 1024px !important')
    expect(css).not.toContain('1164px')
    expect(css).toContain('--navbar-height: 140px')
  })

  it('omits the height rule (the mirrored global 100vh rule still applies) for a bad height, and defaults a bad navbar', () => {
    expect(heroFrameCss(NaN, 100)).not.toContain('.hero-carousel')
    expect(heroFrameCss(0, 100)).not.toContain('.hero-carousel')
    expect(heroFrameCss(812, NaN)).toContain(`--navbar-height: ${HERO_FRAME_DEFAULT_NAVBAR_PX}px`)
    expect(heroFrameCss(812, -5)).toContain(`--navbar-height: ${HERO_FRAME_DEFAULT_NAVBAR_PX}px`)
  })

  it('canvas freeze CSS touches the elements INSIDE each freeform wrapper, never the wrapper (its transform is the centre anchor)', () => {
    expect(HERO_CANVAS_FREEZE_CSS).toContain('[data-ff-id] > *')
    expect(HERO_CANVAS_FREEZE_CSS).not.toMatch(/\[data-ff-id\]\s*\{/)
  })
})

describe('one-system wiring (source contracts)', () => {
  const read = (p: string) => readFileSync(resolve(__dirname, '../../../', p), 'utf8').replace(/\r\n/g, '\n')

  it('the renderer marks every freeform wrapper with the ids the editor chips use, and the layer', () => {
    const hero = read('components/sections/HeroCarousel.tsx')
    const slide = read('components/admin/SlideEditor.tsx')
    expect(hero).toContain('data-ff-layer=""')
    for (const id of ['data-ff-id="eyebrow"', 'data-ff-id={`row-${i}`}', 'data-ff-id="heading"', 'data-ff-id="subheading"', 'data-ff-id={`btn-${index}`}', 'data-ff-id={`img-${index}`}']) {
      expect(hero).toContain(id)
    }
    // chip ids built by SlideEditor.buildFreeformChips
    for (const id of ['id: "eyebrow"', 'id: `row-${i}`', 'id: "heading"', 'id: "subheading"', 'id: `btn-${i}`', 'id: `img-${i}`']) {
      expect(slide).toContain(id)
    }
  })

  it('Live Preview and canvas both render through the ONE shared frame (no second iframe/mirroring copy)', () => {
    const editor = read('components/admin/HeroCarouselEditor.tsx')
    const canvas = read('components/admin/hero/HeroRealCanvas.tsx')
    expect(editor).toContain('HeroRealRenderFrame')
    expect(canvas).toContain('HeroRealRenderFrame')
    expect(editor).not.toContain('<iframe')
    expect(editor).not.toContain('data-mirrored-style')
    expect(canvas).not.toContain('<iframe')
  })
})
