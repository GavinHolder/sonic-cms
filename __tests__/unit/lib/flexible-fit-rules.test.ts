import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

// The shared rule modules are plain UMD scripts in /public (also loaded by <script> in the Designer),
// so they are required rather than imported.
const require = createRequire(import.meta.url)
const R = require('../../../public/flexible-render-rules.js')
const B = require('../../../public/flexible-breakpoint-rules.js')

describe('computeStageFit', () => {
  it('single: contain-fits uniformly, top-anchored, horizontally centred', () => {
    const f = R.computeStageFit({ cw: 1440, ch: 900, vw: 1920, vh: 1080, mode: 'single' })
    expect(f.scale).toBeCloseTo(1.2, 4) // height-constrained (1080/900) < width (1920/1440)
    expect(f.contentLeft).toBeCloseTo((1920 - 1440 * 1.2) / 2, 1)
    expect(f.contentTop).toBe(0)
  })

  it('single: width-constrained (portrait tablet) leaves the gap at the bottom, no horizontal offset', () => {
    const f = R.computeStageFit({ cw: 768, ch: 900, vw: 800, vh: 1280, mode: 'single' })
    expect(f.scale).toBeCloseTo(800 / 768, 4)
    expect(f.contentLeft).toBeCloseTo(0, 1)
    expect(f.contentH).toBeLessThan(1280)
  })

  it('tablet/mobile background plate is UNIFORM and covers the whole fitted box (never scale(sx, sy))', () => {
    for (const breakpoint of ['tablet', 'mobile'] as const) {
      for (const [vw, vh] of [[800, 1280], [768, 1024], [820, 1180], [390, 844]]) {
        const f = R.computeStageFit({ cw: 1440, ch: 900, vw, vh, mode: 'single', breakpoint })
        // a single scale factor is applied to the bg plate ...
        expect(f.bg.scaleX).toBe(f.bg.scaleY)
        expect(f.bg.transform).toBe(`scale(${f.scale})`)
        // ... and the plate, once scaled, is exactly the box.
        expect(f.bg.width * f.bg.scale).toBeCloseTo(vw, 1)
        expect(f.bg.height * f.bg.scale).toBeCloseTo(vh, 1)
        expect(f.bg.scale).toBe(f.scale)
      }
    }
  })

  it('tablet/mobile content plate is centred; a multi maxScale clamp centres it instead of hugging the left edge', () => {
    const f = R.computeStageFit({ cw: 375, ch: 900, vw: 767, vh: 5000, mode: 'multi', maxScale: 1.15, breakpoint: 'mobile' })
    expect(f.scale).toBe(1.15)
    expect(f.contentLeft).toBeCloseTo((767 - 375 * 1.15) / 2, 1)
    // the uniform cover plate is used for multi too: it spans the whole stage box
    expect(f.bg.width * f.bg.scale).toBeCloseTo(767, 1)
    expect(f.bg.height * f.bg.scale).toBeCloseTo(5000, 1)
  })

  it('the breakpoint never changes the content scale', () => {
    for (const mode of ['single', 'multi'] as const) {
      const base = { cw: 1440, ch: 900, vw: 1114, vh: 765, mode }
      const d = R.computeStageFit({ ...base, breakpoint: 'desktop' }).scale
      expect(R.computeStageFit({ ...base, breakpoint: 'tablet' }).scale).toBe(d)
      expect(R.computeStageFit({ ...base, breakpoint: 'mobile' }).scale).toBe(d)
      expect(R.computeStageFit(base).scale).toBe(d)
    }
  })

  it('never returns NaN/0/Infinity for degenerate input', () => {
    for (const opts of [{}, { cw: 0, ch: 0, vw: 0, vh: 0 }, { cw: NaN, ch: -5, vw: Infinity, vh: NaN }]) {
      const f = R.computeStageFit(opts)
      expect(Number.isFinite(f.scale) && f.scale > 0).toBe(true)
      expect(Number.isFinite(f.contentLeft)).toBe(true)
      expect(Number.isFinite(f.bg.width) && Number.isFinite(f.bg.height)).toBe(true)
    }
  })
})

/**
 * Fix A (2026-09-30) — navbar-guide-drift. computeStageFit's opts.navGuide/opts.navCover:
 * when the natural scale would put navGuide (canvas px) under the live navbar's real bottom
 * edge (navCover, CSS px), shrink the stage (never grow it) and shift the plate down so the
 * guide lands exactly on navCover instead.
 */
describe('computeStageFit navGuide/navCover (Fix A — navbar-guide-drift)', () => {
  it('omitting navGuide/navCover is a no-op: output is byte-identical to before this fix existed', () => {
    const cases = [
      { cw: 1440, ch: 900, vw: 1366, vh: 657, mode: 'single' as const },
      { cw: 1440, ch: 900, vw: 1920, vh: 1080, mode: 'single' as const },
      { cw: 768, ch: 900, vw: 800, vh: 1280, mode: 'single' as const, breakpoint: 'mobile' as const },
      { cw: 1440, ch: 2700, vw: 1366, vh: 657, mode: 'multi' as const, maxScale: 1.15 },
    ]
    for (const base of cases) {
      const before = R.computeStageFit(base)
      // Explicit zero/undefined navGuide/navCover must behave identically to omitting them.
      expect(R.computeStageFit({ ...base, navGuide: 0, navCover: 0 })).toEqual(before)
      expect(R.computeStageFit({ ...base, navGuide: undefined, navCover: undefined })).toEqual(before)
      // A navGuide with no navCover (or vice versa) is also inert — both must be > 0 to apply.
      expect(R.computeStageFit({ ...base, navGuide: 100 })).toEqual(before)
      expect(R.computeStageFit({ ...base, navCover: 100 })).toEqual(before)
    }
  })

  it('reproduces the reported case: 1366x657 laptop, 1440x900 canvas — guide was landing ~27px under the navbar', () => {
    const cw = 1440, ch = 900, vw = 1366, vh = 657
    const before = R.computeStageFit({ cw, ch, vw, vh, mode: 'single' })
    const naturalGuideY = 100 * before.scale
    expect(naturalGuideY).toBeLessThan(100) // confirms the bug precondition: guide lands above the real navbar edge
    const after = R.computeStageFit({ cw, ch, vw, vh, mode: 'single', navGuide: 100, navCover: 100 })
    expect(after.scale).toBeLessThan(before.scale) // shrunk, never grown
    expect(after.contentTop + 100 * after.scale).toBeCloseTo(100, 6) // guide now lands exactly on the navbar's bottom edge
    expect(after.contentTop + ch * after.scale).toBeLessThanOrEqual(vh + 1e-6) // bottom never pushed past the box
  })

  /**
   * HAND-COMPUTED, implementation-independent expected values (round-2 adversarial review,
   * HIGH #1: mutation testing showed the pre-existing tests above only check internal
   * self-consistency — e.g. "guide lands on navCover" is trivially true for ANY scale, because
   * contentTop is DEFINED as cover - guide*scale — so a deliberately-wrong ~28% over-shrink
   * mutation to the scale formula (line ~1116: `((vh-cover)/ch)*0.8` instead of the correct
   * `(vh-cover)/(ch-guide)`) still passed all 48 existing tests. These values were derived by
   * hand from the documented requirement, independent of the implementation:
   *   scale = floor(((vh-cover)/(ch-guide)) * 1e4) / 1e4 = floor((557/800)*10000)/10000 = 0.6962
   *   contentTop = cover - guide*scale = 100 - 100*0.6962 = 30.38
   *   bottom = contentTop + ch*scale = 30.38 + 900*0.6962 = 656.96
   *   contentLeft = (vw - cw*scale) / 2 = (1366 - 1440*0.6962) / 2 = 181.736 (scale < scaleX, so centred)
   */
  it('hand-computed exact values for the reported case (independent of the implementation)', () => {
    const cw = 1440, ch = 900, vw = 1366, vh = 657
    const after = R.computeStageFit({ cw, ch, vw, vh, mode: 'single', navGuide: 100, navCover: 100 })
    expect(after.scale).toBeCloseTo(0.6962, 4)
    expect(after.contentTop).toBeCloseTo(30.38, 2)
    expect(after.contentTop + ch * after.scale).toBeCloseTo(656.96, 2) // bottom
    expect(after.contentLeft).toBeCloseTo(181.736, 2)
  })

  /**
   * HIGH #1 (continued): an INDEPENDENT proof that the shrink uses the LARGEST valid scale, not
   * merely "a" valid one. A mutation that over-shrinks (e.g. the 0.8-factor mutation above) still
   * satisfies "guide lands on navCover" and "bottom <= vh" (both trivially/weakly true regardless
   * of how much extra the scale shrinks) — but it must leave the plate's bottom edge visibly
   * SHORT of vh, unless the fix didn't need to shrink at all (scale unchanged from pre-fix). This
   * is the discriminating check the mutation fails.
   */
  it('proves the LARGEST valid scale is used: whenever the fix triggers, either scale is unchanged or bottom snugly reaches vh', () => {
    const cases = [
      { cw: 1440, ch: 900, vw: 1366, vh: 657 },
      { cw: 1440, ch: 900, vw: 800, vh: 500 },
      { cw: 1920, ch: 1200, vw: 1024, vh: 480 },
      { cw: 768, ch: 1400, vw: 700, vh: 400 },
      { cw: 1440, ch: 900, vw: 1200, vh: 300 },
    ]
    for (const opts of cases) {
      const before = R.computeStageFit({ ...opts, mode: 'single' as const })
      const after = R.computeStageFit({ ...opts, mode: 'single' as const, navGuide: 100, navCover: 100 })
      const applicable = 100 < opts.ch && opts.vh > 100 && 100 * before.scale < 100
      if (!applicable) continue
      const bottom = after.contentTop + opts.ch * after.scale
      const scaleUnchanged = Math.abs(after.scale - before.scale) < 1e-9
      const bottomSnug = Math.abs(bottom - opts.vh) <= opts.ch * 1e-4
      expect(scaleUnchanged || bottomSnug).toBe(true)
    }
  })

  it('multi mode is completely unaffected, even with navGuide/navCover set', () => {
    const opts = { cw: 1440, ch: 900, vw: 1366, vh: 657, mode: 'multi' as const, maxScale: Infinity }
    const before = R.computeStageFit(opts)
    const after = R.computeStageFit({ ...opts, navGuide: 100, navCover: 100 })
    expect(after).toEqual(before)
  })

  it('vh <= navCover (guide impossible to satisfy) falls back to the unmodified result', () => {
    const opts = { cw: 1440, ch: 900, vw: 1366, vh: 90, mode: 'single' as const }
    const before = R.computeStageFit(opts)
    const after = R.computeStageFit({ ...opts, navGuide: 100, navCover: 100 })
    expect(after).toEqual(before)
  })

  it('a guide already clear of the navbar (tall viewport) needs no adjustment', () => {
    const opts = { cw: 1440, ch: 900, vw: 1920, vh: 1080, mode: 'single' as const }
    const before = R.computeStageFit(opts)
    const after = R.computeStageFit({ ...opts, navGuide: 100, navCover: 100 })
    expect(after).toEqual(before)
  })

  it('a section with a CMS Section Header (navCover already 0) is unaffected', () => {
    // navCover = max(0, navH - headerOffset); a heading tall enough to clear the navbar
    // entirely means the caller passes navCover: 0 — confirmed inert, same as omitting it.
    const opts = { cw: 1440, ch: 900, vw: 1366, vh: 657, mode: 'single' as const }
    const before = R.computeStageFit(opts)
    const after = R.computeStageFit({ ...opts, navGuide: 100, navCover: 0 })
    expect(after).toEqual(before)
  })

  // Deterministic PRNG (mulberry32) so failures are reproducible without a fuzzing dependency.
  function mulberry32(seed: number) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('property test: guide/bottom/scale invariants hold across 500 randomized single-mode stages', () => {
    const rand = mulberry32(20260930)
    const between = (lo: number, hi: number) => lo + rand() * (hi - lo)
    let triggeredCount = 0
    for (let i = 0; i < 500; i++) {
      const cw = between(300, 2000)
      const ch = between(400, 3000)
      const vw = between(300, 2000)
      const vh = between(200, 1200)
      const navGuide = between(40, 200)
      const navCover = between(40, 200)
      const opts = { cw, ch, vw, vh, mode: 'single' as const }
      const before = R.computeStageFit(opts)
      const after = R.computeStageFit({ ...opts, navGuide, navCover })

      // Invariant: scale never grows.
      expect(after.scale).toBeLessThanOrEqual(before.scale + 1e-9)

      const applicable = navGuide > 0 && navCover > 0 && navGuide < ch && vh > navCover && navGuide * before.scale < navCover
      if (applicable) {
        triggeredCount++
        // Invariant: guide's on-screen position lands exactly on navCover.
        expect(after.contentTop + navGuide * after.scale).toBeCloseTo(navCover, 4)
        // Invariant: resulting bottom never exceeds the box.
        expect(after.contentTop + ch * after.scale).toBeLessThanOrEqual(vh + 1e-6)
        // Invariant (round-2 review, HIGH #1): proves LARGEST valid scale, not just "a" valid
        // one — an over-shrink mutation still satisfies the two checks above (both trivially/
        // weakly true for any smaller scale) but leaves bottom visibly short of vh unless the
        // fix didn't need to shrink at all.
        const bottom = after.contentTop + ch * after.scale
        const scaleUnchanged = Math.abs(after.scale - before.scale) < 1e-9
        const bottomSnug = Math.abs(bottom - vh) <= ch * 1e-4
        expect(scaleUnchanged || bottomSnug).toBe(true)
      } else if (vh <= navCover) {
        // Invariant: an impossible-to-satisfy guide falls back to the unmodified result.
        expect(after).toEqual(before)
      }
    }
    // Sanity: the randomized ranges actually exercise the shrink path at least sometimes,
    // so this test would fail loudly (not vacuously pass) if the trigger condition broke.
    expect(triggeredCount).toBeGreaterThan(0)
  })

  it('contentLeft centering uses the FINAL (possibly shrunk) scale, not the pre-shrink scaleY', () => {
    const cw = 1440, ch = 900, vw = 1366, vh = 657
    const after = R.computeStageFit({ cw, ch, vw, vh, mode: 'single', navGuide: 100, navCover: 100 })
    const scaleX = Math.round((vw / cw) * 10000) / 10000
    if (after.scale < scaleX) {
      expect(after.contentLeft).toBeCloseTo(Math.max(0, (vw - cw * after.scale) / 2), 6)
    } else {
      expect(after.contentLeft).toBe(0)
    }
  })
})

/**
 * Desktop background/content geometry must stay BYTE-IDENTICAL to commit c4535fa (before the stage-fit work).
 * `legacyPlate` is that commit's plate code transcribed from components/sections/FlexibleSectionRenderer.tsx
 * (DesignerBlocksRenderer, the `bgTransform` / `contentTransform` / `contentLeft` block) — independent of
 * computeStageFit, so this can actually fail.
 */
function legacyPlate(cw: number, chTotal: number, sw: number, sh: number, isMulti: boolean, plateMaxScale: number) {
  const roundScale = (n: number) => Math.round(n * 10000) / 10000
  let bgTransform: string
  let contentTransform: string
  let contentLeft = 0
  if (isMulti) {
    const scale = roundScale(Math.min(sw / cw, plateMaxScale))
    bgTransform = `scale(${scale})`
    contentTransform = `scale(${scale})`
  } else {
    const scaleX = roundScale(Math.min(sw / cw, plateMaxScale))
    const scaleY = roundScale(Math.min(sh / chTotal, plateMaxScale))
    bgTransform = `scale(${scaleX}, ${scaleY})`
    const scale = Math.min(scaleX, scaleY)
    contentTransform = `scale(${scale})`
    if (scaleY < scaleX) contentLeft = Math.max(0, (sw - cw * scale) / 2)
  }
  return { bgTransform, contentTransform, contentLeft, bgBox: { left: 0, top: 0, width: cw, height: chTotal } }
}

describe('computeStageFit on DESKTOP == commit c4535fa geometry (byte-identical)', () => {
  const canvases: Array<[number, number]> = [[1440, 900], [1440, 1000], [1920, 1080], [1280, 720], [768, 900], [375, 800]]
  const boxes: Array<[number, number]> = [[1440, 900], [1920, 950], [1920, 1080], [1114, 765], [2560, 1300], [992, 600], [1366, 657]]

  it.each([['single', false], ['multi', true]] as const)('%s mode: bg box, bg transform, content transform and content left match the old code', (_name, isMulti) => {
    for (const [cw, ch] of canvases) {
      for (const bands of isMulti ? [1, 2, 3] : [1]) {
        const chTotal = ch * bands
        for (const [sw, sh] of boxes) {
          for (const bp of [undefined, 'desktop'] as const) {
            const f = R.computeStageFit({ cw, ch: chTotal, vw: sw, vh: sh, mode: isMulti ? 'multi' : 'single', maxScale: Infinity, breakpoint: bp })
            const old = legacyPlate(cw, chTotal, sw, sh, isMulti, Infinity)
            expect(f.bg.transform).toBe(old.bgTransform)
            expect(`scale(${f.scale})`).toBe(old.contentTransform)
            expect(f.contentLeft).toBe(old.contentLeft)
            expect({ left: f.bg.left, top: f.bg.top, width: f.bg.width, height: f.bg.height }).toEqual(old.bgBox)
          }
        }
      }
    }
  })

  it('reproduces the reported case: 1920x950 window, 1440x900 canvas -> canvas-sized plate stretched to the box, whole image visible', () => {
    const f = R.computeStageFit({ cw: 1440, ch: 900, vw: 1920, vh: 950, mode: 'single', breakpoint: 'desktop' })
    expect(f.bg.transform).toBe('scale(1.3333, 1.0556)')
    expect({ w: f.bg.width, h: f.bg.height }).toEqual({ w: 1440, h: 900 })
    // and NOT the uniform cover geometry that cropped ~21% of the photo
    expect(f.bg.scaleX).not.toBe(f.bg.scaleY)
  })
})

describe('isVariantAuthored / pickLiveVariant', () => {
  const blob = (n: number) => ({ blocks: Array.from({ length: n }, (_, i) => ({ id: `b${i}` })) })

  it('authored means >= 1 block — not "exists"', () => {
    expect(B.isVariantAuthored(null)).toBe(false)
    expect(B.isVariantAuthored(blob(0))).toBe(false)
    expect(B.isVariantAuthored(blob(1))).toBe(true)
  })

  it('desktop is always itself', () => {
    const r = { desktop: blob(2), tablet: null, mobile: null }
    expect(B.pickLiveVariant(r, 'desktop', 'desktop')).toMatchObject({ data: r.desktop, isFallback: false, blank: false })
  })

  it('an EMPTY saved tablet variant falls back to desktop (the accidental Designer tab-click case)', () => {
    const r = { desktop: blob(2), tablet: blob(0), mobile: null }
    const t = B.pickLiveVariant(r, 'tablet', 'desktop')
    expect(t.data).toBe(r.desktop)
    expect(t.isFallback).toBe(true)
    expect(B.pickLiveVariant(r, 'mobile', 'desktop').isFallback).toBe(true)
  })

  it('an authored variant is used as-is', () => {
    const r = { desktop: blob(2), tablet: blob(3), mobile: null }
    expect(B.pickLiveVariant(r, 'tablet', 'desktop')).toMatchObject({ data: r.tablet, isFallback: false, blank: false })
  })

  it('fallback mode "none" shows nothing where the breakpoint is not designed', () => {
    const r = { desktop: { positionMode: 'free', designerCanvasW: 1440, blocks: [{ id: 'a' }] }, tablet: null, mobile: null }
    const t = B.pickLiveVariant(r, 'tablet', 'none')
    expect(t.blank).toBe(true)
    expect(t.isFallback).toBe(false)
    expect(t.data.blocks).toEqual([])
  })

  it('fallback mode "off" (non-free sections) is exactly pickActiveVariant: never blank, never borrows through an empty variant', () => {
    const emptyTablet = { desktop: blob(2), tablet: blob(0), mobile: null }
    // a saved-but-empty Tablet variant is used AS IS (the pre-fallback rule), unlike the "desktop" mode
    expect(B.pickLiveVariant(emptyTablet, 'tablet', 'off')).toEqual({ ...B.pickActiveVariant(emptyTablet, 'tablet'), blank: false })
    expect(B.pickLiveVariant(emptyTablet, 'tablet', 'off').data).toBe(emptyTablet.tablet)
    // a missing variant falls back to Desktop with isFallback true (again exactly pickActiveVariant)
    const noTablet = { desktop: blob(2), tablet: null, mobile: null }
    expect(B.pickLiveVariant(noTablet, 'tablet', 'off')).toEqual({ ...B.pickActiveVariant(noTablet, 'tablet'), blank: false })
    // "none" must not blank an "off" section
    expect(B.pickLiveVariant(noTablet, 'mobile', 'off').blank).toBe(false)
  })

  it('does not mutate its input', () => {
    const r = { desktop: blob(1), tablet: null, mobile: null }
    const snap = JSON.stringify(r)
    B.pickLiveVariant(r, 'tablet', 'none')
    B.pickLiveVariant(r, 'mobile', 'desktop')
    expect(JSON.stringify(r)).toBe(snap)
  })
})

describe('usesReflowLayout (undesigned Tablet/Mobile -> single-column reflow; everything else -> plate)', () => {
  it('desktop never reflows, whatever the flag', () => {
    expect(B.usesReflowLayout('desktop', false)).toBe(false)
    expect(B.usesReflowLayout('desktop', true)).toBe(false)
  })

  it('an UNDESIGNED tablet and mobile (Desktop shown as a fallback) reflow', () => {
    expect(B.usesReflowLayout('tablet', true)).toBe(true)
    expect(B.usesReflowLayout('mobile', true)).toBe(true)
  })

  it('an AUTHORED tablet / mobile variant keeps its own plate (no reflow)', () => {
    expect(B.usesReflowLayout('tablet', false)).toBe(false)
    expect(B.usesReflowLayout('mobile', false)).toBe(false)
  })

  it('composes with pickLiveVariant: empty tablet variant reflows, authored one does not, "none" is blank not reflow', () => {
    const blob = (n: number) => ({ blocks: Array.from({ length: n }, (_, i) => ({ id: `b${i}` })) })
    const emptyTab = { desktop: blob(2), tablet: blob(0), mobile: null }
    expect(B.usesReflowLayout('tablet', B.pickLiveVariant(emptyTab, 'tablet', 'desktop').isFallback)).toBe(true)
    const authoredTab = { desktop: blob(2), tablet: blob(1), mobile: null }
    expect(B.usesReflowLayout('tablet', B.pickLiveVariant(authoredTab, 'tablet', 'desktop').isFallback)).toBe(false)
    expect(B.usesReflowLayout('tablet', B.pickLiveVariant(emptyTab, 'tablet', 'none').isFallback)).toBe(false)
  })

  it('an unknown breakpoint never reflows', () => {
    expect(B.usesReflowLayout('' as never, true)).toBe(false)
  })
})

describe('resolveLiveBackgroundBundle', () => {
  const legacy = { backgroundType: 'solid', background: '#123456', bgImageUrl: '/legacy.png', bgImageSize: 'cover', bgImageRepeat: 'no-repeat', bgImageOpacity: 100 }
  const desk = { backgroundType: 'solid', background: 'white', bgImageUrl: '/desk.png', bgImageSize: 'cover', bgImageRepeat: 'no-repeat', bgImageOpacity: 100 }
  const own = { backgroundType: 'solid', background: 'transparent', bgImageUrl: '/tab.png', bgImageSize: 'cover', bgImageRepeat: 'no-repeat', bgImageOpacity: 100 }
  const blank = { backgroundType: 'solid', background: 'transparent', bgImageUrl: '', bgImageSize: 'cover', bgImageRepeat: 'no-repeat', bgImageOpacity: 100 }

  it('legacy section, un-authored tablet: shows the legacy/desktop background (was blank white)', () => {
    expect(R.resolveLiveBackgroundBundle(null, 'tablet', legacy, false, 'desktop')).toBe(legacy)
    expect(R.resolveLiveBackgroundBundle(null, 'mobile', legacy, false, 'desktop')).toBe(legacy)
  })

  it('un-authored tablet with a Desktop bundle uses Desktop\'s bundle', () => {
    expect(R.resolveLiveBackgroundBundle({ desktop: desk }, 'tablet', legacy, false, 'desktop')).toBe(desk)
  })

  it('un-authored tablet keeps a deliberately configured own bundle', () => {
    expect(R.resolveLiveBackgroundBundle({ desktop: desk, tablet: own }, 'tablet', legacy, false, 'desktop')).toBe(own)
  })

  it('un-authored tablet with an explicitly BLANK bundle (modal writes the active tab on every save) still falls back', () => {
    expect(R.resolveLiveBackgroundBundle({ desktop: desk, tablet: blank }, 'tablet', legacy, false, 'desktop')).toBe(desk)
  })

  it('AUTHORED tablet is isolated: never inherits Desktop\'s background', () => {
    expect(R.resolveLiveBackgroundBundle({ desktop: desk }, 'tablet', legacy, true, 'desktop')).toEqual(R.getUnsetBackgroundBundle())
    expect(R.resolveLiveBackgroundBundle({ desktop: desk, tablet: own }, 'tablet', legacy, true, 'desktop')).toBe(own)
  })

  it('fallback mode "none" never borrows Desktop\'s background', () => {
    expect(R.resolveLiveBackgroundBundle({ desktop: desk }, 'tablet', legacy, false, 'none')).toEqual(R.getUnsetBackgroundBundle())
  })

  it('fallback mode "off" (non-free sections) keeps strict isolation: an un-configured Tablet/Mobile background stays neutral', () => {
    expect(R.resolveLiveBackgroundBundle({ desktop: desk }, 'tablet', legacy, false, 'off')).toEqual(R.getUnsetBackgroundBundle())
    expect(R.resolveLiveBackgroundBundle(null, 'mobile', legacy, false, 'off')).toEqual(R.getUnsetBackgroundBundle())
    // ... which is exactly what the isolation resolver returns (i.e. what these sections rendered before the fallback existed)
    expect(R.resolveLiveBackgroundBundle({ desktop: desk }, 'tablet', legacy, false, 'off'))
      .toEqual(R.resolveBackgroundBundleForBreakpoint({ desktop: desk }, 'tablet', legacy))
    expect(R.resolveLiveBackgroundBundle({ desktop: desk, tablet: own }, 'tablet', legacy, false, 'off')).toBe(own)
  })

  it('desktop resolves exactly like the existing resolver', () => {
    expect(R.resolveLiveBackgroundBundle({ desktop: desk }, 'desktop', legacy, true, 'desktop'))
      .toBe(R.resolveBackgroundBundleForBreakpoint({ desktop: desk }, 'desktop', legacy))
    expect(R.resolveLiveBackgroundBundle(null, 'desktop', legacy, true, 'desktop')).toBe(legacy)
  })

  it('leaves the isolation resolver untouched (the Designer relies on it)', () => {
    expect(R.resolveBackgroundBundleForBreakpoint(null, 'tablet', legacy)).toEqual(R.getUnsetBackgroundBundle())
  })
})

describe('measuredLineCount / heading line guard', () => {
  it('decodes the Designer-measured line count from the stored wrapper height', () => {
    // 80px heading: 1 line = 96 + 14 (wrapper) + 8 (Designer .hN margin) = 118
    expect(R.measuredLineCount('heading', { fontSize: 80 }, 118)).toBe(1)
    expect(R.measuredLineCount('heading', { fontSize: 80 }, 214)).toBe(2)
    // eyebrow 13px/1.4: 18.2 + 14
    expect(R.measuredLineCount('eyebrow', { fontSize: 13 }, 32)).toBe(1)
    expect(R.measuredLineCount('paragraph', { fontSize: 15 }, 62)).toBeNull()
    expect(R.measuredLineCount('heading', { fontSize: 80 }, undefined)).toBeNull()
  })

  it('exact heading measured as ONE line is forced onto one line; two-line and unmeasured headings keep normal wrapping', () => {
    expect(R.computeSubElementStyle('heading', { fontSize: 80 }, { exact: true, measuredH: 118 }).whiteSpace).toBe('nowrap')
    expect(R.computeSubElementStyle('heading', { fontSize: 80 }, { exact: true, measuredH: 214 }).whiteSpace).toBe('normal')
    expect(R.computeSubElementStyle('heading', { fontSize: 80 }, { exact: true }).whiteSpace).toBe('normal')
  })

  it('a heading whose measurement the Designer stamped as fonts-settled is trusted: the one-line guard stays off', () => {
    expect(R.computeSubElementStyle('heading', { fontSize: 80 }, { exact: true, measuredH: 118, measurementSettled: true }).whiteSpace).toBe('normal')
    // ... while the same unstamped (legacy) data keeps the guard
    expect(R.computeSubElementStyle('heading', { fontSize: 80 }, { exact: true, measuredH: 118, measurementSettled: false }).whiteSpace).toBe('nowrap')
  })

  it('a tiny line height makes the stored height ambiguous: no line count, so no forced one-line layout', () => {
    // 22px at line-height 0.5 = an 11px line. Two lines with NO heading margin = 36px stored: the +8px-margin decode
    // would read that as ONE line and (before this guard) force nowrap on a heading that really wraps.
    expect(R.measuredLineCount('heading', { fontSize: 22, lineHeight: 0.5 }, 36)).toBeNull()
    expect(R.computeSubElementStyle('heading', { fontSize: 22, lineHeight: 0.5 }, { exact: true, measuredH: 36 }).whiteSpace).toBe('normal')
    // the boundary: a 16px line is still ambiguous (8px = half a line), a 17px line is not
    expect(R.measuredLineCount('heading', { fontSize: 16, lineHeight: 1 }, 16 + 22)).toBeNull()
    expect(R.measuredLineCount('heading', { fontSize: 17, lineHeight: 1 }, 17 + 22)).toBe(1)
    // an eyebrow has no margin in the decode, so it is not affected
    expect(R.measuredLineCount('eyebrow', { fontSize: 10, lineHeight: 1 }, 24)).toBe(1)
  })

  it('never applies without exact mode, with a fixed authored height, or over an explicit textWrap', () => {
    expect(R.computeSubElementStyle('heading', { fontSize: 80 }, { mobile: true, measuredH: 118 }).whiteSpace).toBeUndefined()
    expect(R.computeSubElementStyle('heading', { fontSize: 80 }, { exact: true, measuredH: 118, fixedHeight: true }).whiteSpace).toBe('normal')
    expect(R.computeSubElementStyle('heading', { fontSize: 80, textWrap: 'pre-line' }, { exact: true, measuredH: 118 }).whiteSpace).toBe('pre-line')
  })
})

describe('shared font helpers', () => {
  it('maps the Google category words the Designer appends (not valid CSS generics) to real generics', () => {
    expect(R.normalizeFontStack("'Archivo Black', display")).toBe("'Archivo Black', sans-serif")
    expect(R.normalizeFontStack("'Pacifico', handwriting")).toBe("'Pacifico', cursive")
    expect(R.normalizeFontStack("'Inter', sans-serif")).toBe("'Inter', sans-serif")
    expect(R.normalizeFontStack(undefined)).toBeUndefined()
  })

  it('applies the normalised stack through computeSubElementStyle for all text types', () => {
    for (const t of ['heading', 'paragraph', 'eyebrow']) {
      expect(R.computeSubElementStyle(t, { fontFamily: "'Anton', display" }, { exact: true }).fontFamily).toBe("'Anton', sans-serif")
    }
  })

  it('extracts family names and skips generics', () => {
    expect(R.extractFontFamilyName("'Archivo Black', display")).toBe('Archivo Black')
    expect(R.extractFontFamilyName('"Open Sans", sans-serif')).toBe('Open Sans')
    expect(R.extractFontFamilyName('inherit')).toBe('')
    expect(R.extractFontFamilyName('sans-serif')).toBe('')
  })

  it('collects the UNION of weights actually used per family (400/700 always included), across every variant', () => {
    const desktop = [{ props: { fontFamily: "'Poppins', sans-serif", fontWeight: '300' }, subElements: [{ props: { fontFamily: "'Poppins', sans-serif", fontWeight: 'bold' } }] }]
    const tablet = [{ subElements: [{ props: { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } }, { props: { fontFamily: "'Anton', display" } }] }]
    const req = R.collectFontRequests([desktop, tablet])
    expect(req.find((r: { family: string }) => r.family === 'Poppins').weights).toEqual([300, 400, 600, 700])
    expect(req.find((r: { family: string }) => r.family === 'Anton').weights).toEqual([400, 700])
  })

  it('builds one Google Fonts URL for both consumers', () => {
    expect(R.buildGoogleFontHref('Archivo Black', [400, 700]))
      .toBe('https://fonts.googleapis.com/css2?family=Archivo+Black:wght@400;700&display=swap')
  })
})

describe('resolveVoltFullBleed', () => {
  const CANVAS_W = 1440
  const CANVAS_H = 900
  const coveringBox = { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }
  const smallBox = { x: 100, y: 100, w: 300, h: 180 }

  it('explicit fullBleed:true is always true, regardless of geometry (even a tiny/non-covering box)', () => {
    expect(R.resolveVoltFullBleed(true, smallBox, CANVAS_W, CANVAS_H)).toBe(true)
    expect(R.resolveVoltFullBleed(true, null, CANVAS_W, CANVAS_H)).toBe(true)
    expect(R.resolveVoltFullBleed(true, undefined, 0, 0)).toBe(true)
  })

  it('explicit fullBleed:false is always false, regardless of geometry (even a box that fully covers the canvas)', () => {
    expect(R.resolveVoltFullBleed(false, coveringBox, CANVAS_W, CANVAS_H)).toBe(false)
    expect(R.resolveVoltFullBleed(false, smallBox, CANVAS_W, CANVAS_H)).toBe(false)
  })

  it('fullBleed:undefined with a box that covers the whole canvas falls back to true (the geometry heuristic)', () => {
    expect(R.resolveVoltFullBleed(undefined, coveringBox, CANVAS_W, CANVAS_H)).toBe(true)
  })

  it('fullBleed:undefined with a box clearly smaller/inline than the canvas falls back to false', () => {
    expect(R.resolveVoltFullBleed(undefined, smallBox, CANVAS_W, CANVAS_H)).toBe(false)
    // Large but NOT edge-to-edge (e.g. a big hero image inset by design) must stay false —
    // the geometry check requires covering BOTH width and height within tolerance, not just "big".
    expect(R.resolveVoltFullBleed(undefined, { x: 50, y: 50, w: CANVAS_W - 100, h: CANVAS_H - 100 }, CANVAS_W, CANVAS_H)).toBe(false)
    // Covers width but not height (or vice versa) must also stay false.
    expect(R.resolveVoltFullBleed(undefined, { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H / 2 }, CANVAS_W, CANVAS_H)).toBe(false)
    expect(R.resolveVoltFullBleed(undefined, { x: 0, y: 0, w: CANVAS_W / 2, h: CANVAS_H }, CANVAS_W, CANVAS_H)).toBe(false)
  })

  it('fullBleed:undefined with no box (grid/mosaic block — no free-mode geometry) safely resolves to false', () => {
    expect(R.resolveVoltFullBleed(undefined, null, CANVAS_W, CANVAS_H)).toBe(false)
    expect(R.resolveVoltFullBleed(undefined, undefined, CANVAS_W, CANVAS_H)).toBe(false)
  })

  it('fullBleed:undefined with an unmeasurable canvas (0/NaN) safely resolves to false, never throws', () => {
    expect(R.resolveVoltFullBleed(undefined, coveringBox, 0, 0)).toBe(false)
    expect(R.resolveVoltFullBleed(undefined, coveringBox, NaN, NaN)).toBe(false)
  })

  it('±3px tolerance boundary: exactly 3px short of covering is still full-bleed; more than 3px short is not', () => {
    const TOL = 3
    // Inset by exactly TOL on every edge, sized to land exactly on the tolerance boundary.
    const atBoundary = { x: TOL, y: TOL, w: CANVAS_W - 2 * TOL, h: CANVAS_H - 2 * TOL }
    expect(R.resolveVoltFullBleed(undefined, atBoundary, CANVAS_W, CANVAS_H)).toBe(true)
    // One px past the tolerance on each edge must fail.
    const pastBoundary = { x: TOL + 1, y: TOL + 1, w: CANVAS_W - 2 * (TOL + 1), h: CANVAS_H - 2 * (TOL + 1) }
    expect(R.resolveVoltFullBleed(undefined, pastBoundary, CANVAS_W, CANVAS_H)).toBe(false)
  })
})
