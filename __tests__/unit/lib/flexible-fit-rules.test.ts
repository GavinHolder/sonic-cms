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

  it('background plate is UNIFORM and covers the whole fitted box (never scale(sx, sy))', () => {
    for (const [vw, vh] of [[800, 1280], [768, 1024], [1114, 765], [1920, 1080], [1440, 900]]) {
      const f = R.computeStageFit({ cw: 1440, ch: 900, vw, vh, mode: 'single' })
      // a single scale factor is applied to the bg plate ...
      expect(typeof f.bg.scale).toBe('number')
      // ... and the plate, once scaled, is exactly the box.
      expect(f.bg.width * f.bg.scale).toBeCloseTo(vw, 1)
      expect(f.bg.height * f.bg.scale).toBeCloseTo(vh, 1)
      expect(f.bg.scale).toBe(f.scale)
    }
  })

  it('multi: width-fit only; a maxScale clamp centres the plate instead of hugging the left edge', () => {
    const f = R.computeStageFit({ cw: 375, ch: 900, vw: 767, vh: 5000, mode: 'multi', maxScale: 1.15 })
    expect(f.scale).toBe(1.15)
    expect(f.contentLeft).toBeCloseTo((767 - 375 * 1.15) / 2, 1)
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

  it('does not mutate its input', () => {
    const r = { desktop: blob(1), tablet: null, mobile: null }
    const snap = JSON.stringify(r)
    B.pickLiveVariant(r, 'tablet', 'none')
    B.pickLiveVariant(r, 'mobile', 'desktop')
    expect(JSON.stringify(r)).toBe(snap)
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
