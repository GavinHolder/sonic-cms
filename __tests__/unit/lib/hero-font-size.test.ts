import { describe, it, expect } from 'vitest'
import {
  BUTTON_DEFAULT_PX,
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  fontSizeEditPatch,
  fontSizeResetPatch,
  legacyFontSizePx,
  legacyFontSizeThreshold,
  materializeFontSizes,
  parseFontSizeInput,
  pickFontSizeFields,
  referenceViewportW,
  resolveFreeformFontSizeCss,
  resolveFreeformFontSizePx,
  type FreeformFontKind,
  type FreeformFontSizeInput,
} from '@/lib/hero/hero-font-size'
import type { HeroEditBreakpoint } from '@/lib/hero/hero-device-fit'

/** Tiny evaluator for the CSS the resolver emits: clamp()/min()/max() over px and vw terms. */
function evalCss(expr: string, viewportW: number): number {
  const s = expr.replace(/\s+/g, '')
  let i = 0
  const expectCh = (ch: string) => {
    if (s[i] !== ch) throw new Error(`expected "${ch}" at ${i} in ${expr}`)
    i++
  }
  const args = (): number[] => {
    const out = [value()]
    while (s[i] === ',') {
      i++
      out.push(value())
    }
    expectCh(')')
    return out
  }
  function value(): number {
    if (s.startsWith('clamp(', i)) {
      i += 6
      const [min, val, max] = args()
      return Math.max(min, Math.min(val, max))
    }
    if (s.startsWith('min(', i)) {
      i += 4
      return Math.min(...args())
    }
    if (s.startsWith('max(', i)) {
      i += 4
      return Math.max(...args())
    }
    const m = /^(-?\d+(?:\.\d+)?)(px|vw)/.exec(s.slice(i))
    if (!m) throw new Error(`cannot parse "${s.slice(i)}" in ${expr}`)
    i += m[0].length
    return m[2] === 'vw' ? (Number(m[1]) / 100) * viewportW : Number(m[1])
  }
  const result = value()
  if (i !== s.length) throw new Error(`trailing input in ${expr}`)
  return result
}

/** The strings HeroCarousel.tsx emitted on origin/main (verbatim templates), before this feature existed. */
const OLD_DESKTOP: Record<FreeformFontKind, (s: number | undefined) => string> = {
  heading: (s) => `clamp(32px, 8vw, ${s}px)`,
  legacyHeading: (s) => `clamp(28px, 7vw, ${s}px)`,
  subheading: (s) => `clamp(16px, 4vw, ${s}px)`,
  button: (s) => `clamp(14px, 3.5vw, ${s ?? 18}px)`,
}
const OLD_MOBILE: Record<FreeformFontKind, (s: number) => string> = {
  heading: (s) => `clamp(20px, 7.5vw, ${Math.min(s, 44)}px)`,
  legacyHeading: (s) => `clamp(20px, 7vw, ${Math.min(s, 44)}px)`,
  subheading: (s) => `clamp(16px, 4vw, ${s}px)`,
  button: (s) => `clamp(14px, 3.5vw, ${s ?? 18}px)`,
}
const oldString = (kind: FreeformFontKind, bp: HeroEditBreakpoint, s: number) => (bp === 'mobile' ? OLD_MOBILE[kind](s) : OLD_DESKTOP[kind](s))

const KINDS: FreeformFontKind[] = ['heading', 'legacyHeading', 'subheading', 'button']
const BPS: HeroEditBreakpoint[] = ['desktop', 'tablet', 'mobile']
const WIDTHS = [320, 360, 375, 414, 500, 600, 700, 767, 768, 800, 900, 991, 992, 1100, 1280, 1366, 1440, 1536, 1680, 1920, 2200, 2560]
const GRID = Array.from({ length: 113 }, (_, i) => 320 + i * 20) // 320..2560
const IDENTITY_SIZES = [6, 10, 18, 22, 56, 100, 130, 150, 200, 400]
const input = (kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: number | undefined, extra: Partial<FreeformFontSizeInput> = {}): FreeformFontSizeInput => ({ kind, breakpoint, size, ...extra })
const flagged = (kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: number | undefined, extra: Partial<FreeformFontSizeInput> = {}) =>
  input(kind, breakpoint, size, { independent: true, ...extra })

describe('(a) LEGACY element (no fontSizeIndependent flag) — byte-identical to origin/main for every size and breakpoint', () => {
  for (const kind of KINDS) {
    it(`${kind}: S in {${IDENTITY_SIZES.join(',')}} on desktop, tablet and mobile equals the OLD string, ignoring any tablet/mobile values`, () => {
      for (const bp of BPS) {
        for (const s of IDENTITY_SIZES) {
          const expected = oldString(kind, bp, s)
          expect(resolveFreeformFontSizeCss(input(kind, bp, s))).toBe(expected)
          // stray per-breakpoint values on an unflagged element are ignored
          expect(resolveFreeformFontSizeCss(input(kind, bp, s, { sizeTablet: 77, sizeMobile: 33 }))).toBe(expected)
          expect(resolveFreeformFontSizeCss(input(kind, bp, s, { sizeTablet: 77, sizeMobile: 33, independent: false }))).toBe(expected)
          // only a literal `true` switches an element over (JSON garbage must not)
          expect(resolveFreeformFontSizeCss(input(kind, bp, s, { sizeTablet: 77, sizeMobile: 33, independent: 1 as unknown as boolean }))).toBe(expected)
          expect(resolveFreeformFontSizeCss(input(kind, bp, s, { sizeTablet: 77, independent: 'true' as unknown as boolean }))).toBe(expected)
        }
      }
    })

    it(`${kind}: numeric twin equals the OLD clamp at widths 320..2560`, () => {
      for (const bp of BPS) {
        for (const s of IDENTITY_SIZES) {
          for (const w of WIDTHS) {
            expect(resolveFreeformFontSizePx(input(kind, bp, s, { sizeTablet: 77, sizeMobile: 33 }), w)).toBeCloseTo(evalCss(oldString(kind, bp, s), w), 9)
          }
        }
      }
    })
  }

  it('the saved-data case that motivated this: a heading row saved at 400 / 200 renders exactly as before (capped at 8vw, 153.6px @1920)', () => {
    for (const s of [200, 400]) {
      expect(resolveFreeformFontSizeCss(input('heading', 'desktop', s))).toBe(`clamp(32px, 8vw, ${s}px)`)
      expect(resolveFreeformFontSizePx(input('heading', 'desktop', s), 1920)).toBeCloseTo(153.6, 9)
      expect(resolveFreeformFontSizeCss(input('heading', 'mobile', s))).toBe('clamp(20px, 7.5vw, 44px)')
    }
  })

  it('button with no fontSize keeps the old default of 18', () => {
    expect(BUTTON_DEFAULT_PX).toBe(18)
    for (const bp of BPS) expect(resolveFreeformFontSizeCss(input('button', bp, undefined))).toBe('clamp(14px, 3.5vw, 18px)')
  })

  it('a non-numeric authored size reproduces the old (invalid) string instead of being "fixed"', () => {
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', NaN))).toBe('clamp(32px, 8vw, NaNpx)')
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', undefined))).toBe('clamp(32px, 8vw, undefinedpx)')
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', null as unknown as number))).toBe('clamp(32px, 8vw, nullpx)')
    expect(resolveFreeformFontSizeCss(input('heading', 'mobile', null as unknown as number))).toBe('clamp(20px, 7.5vw, 0px)')
    expect(resolveFreeformFontSizeCss(input('button', 'desktop', null as unknown as number))).toBe('clamp(14px, 3.5vw, 18px)')
  })

  it('thresholds are vw * 1920 / 100', () => {
    expect(legacyFontSizeThreshold('heading')).toBeCloseTo(153.6, 9)
    expect(legacyFontSizeThreshold('legacyHeading')).toBeCloseTo(134.4, 9)
    expect(legacyFontSizeThreshold('subheading')).toBeCloseTo(76.8, 9)
    expect(legacyFontSizeThreshold('button')).toBeCloseTo(67.2, 9)
  })
})

describe('FLAGGED element — Desktop honours the size above the old cap', () => {
  it('S <= threshold is the old string; above it the scaled max() rule with the same floor and S as the cap', () => {
    for (const kind of KINDS) {
      const t = legacyFontSizeThreshold(kind)
      for (const s of [8, 24, 56, 100, t].filter((n) => n <= t)) {
        expect(resolveFreeformFontSizeCss(flagged(kind, 'desktop', s))).toBe(OLD_DESKTOP[kind](s))
      }
    }
    expect(resolveFreeformFontSizeCss(flagged('heading', 'desktop', 200))).toBe('clamp(32px, max(8vw, 10.416667vw), 200px)')
    expect(resolveFreeformFontSizeCss(flagged('legacyHeading', 'desktop', 200))).toBe('clamp(28px, max(7vw, 10.416667vw), 200px)')
    expect(resolveFreeformFontSizeCss(flagged('subheading', 'desktop', 100))).toBe('clamp(16px, max(4vw, 5.208333vw), 100px)')
    expect(resolveFreeformFontSizeCss(flagged('button', 'desktop', 100))).toBe('clamp(14px, max(3.5vw, 5.208333vw), 100px)')
  })

  it('S=200 heading honours 200px at 1920, 150px at 1440, 133.3px at 1280 and never exceeds S', () => {
    const at = (w: number) => resolveFreeformFontSizePx(flagged('heading', 'desktop', 200), w)
    expect(at(1920)).toBeCloseTo(200, 6)
    expect(at(1440)).toBeCloseTo(150, 6)
    expect(at(1280)).toBeCloseTo(133.3333, 3)
    expect(at(2560)).toBe(200)
    expect(at(3840)).toBe(200)
  })

  it('a larger size always renders at least as large as a smaller one (the Size field is monotonic)', () => {
    for (const kind of KINDS) {
      for (const w of WIDTHS) {
        let prev = 0
        for (let s = 8; s <= 400; s += 8) {
          const px = resolveFreeformFontSizePx(flagged(kind, 'desktop', s), w)
          expect(px).toBeGreaterThanOrEqual(prev - 1e-9)
          prev = px
        }
      }
    }
  })
})

describe('FLAGGED element — Tablet and Mobile render ONLY from their own value', () => {
  it('emits clamp(10px, X/REF*100vw, X*1.25px) for tablet (REF 768) and mobile (REF 375)', () => {
    expect(resolveFreeformFontSizeCss(flagged('heading', 'tablet', 100, { sizeTablet: 80 }))).toBe('clamp(10px, 10.416667vw, 100px)')
    expect(resolveFreeformFontSizeCss(flagged('subheading', 'mobile', 22, { sizeMobile: 30 }))).toBe('clamp(10px, 8vw, 37.5px)')
  })

  it('is EXACTLY X at the reference device, proportional between, capped at 1.25X above', () => {
    for (const kind of KINDS) {
      for (const X of [10, 24, 60, 100, 250]) {
        const tab = (w: number) => resolveFreeformFontSizePx(flagged(kind, 'tablet', 999, { sizeTablet: X }), w)
        expect(tab(768)).toBeCloseTo(X, 4)
        expect(tab(960)).toBeCloseTo(X * 1.25, 4)
        expect(tab(991)).toBeCloseTo(X * 1.25, 4)
        const mob = (w: number) => resolveFreeformFontSizePx(flagged(kind, 'mobile', 999, { sizeMobile: X }), w)
        expect(mob(375)).toBeCloseTo(X, 4)
        expect(mob(468.75)).toBeCloseTo(X * 1.25, 4)
        expect(mob(767)).toBeCloseTo(X * 1.25, 4)
      }
    }
  })

  it('never goes below 10px, even for a tiny value on a narrow phone', () => {
    expect(resolveFreeformFontSizePx(flagged('subheading', 'mobile', 22, { sizeMobile: 8 }), 320)).toBe(10)
    expect(resolveFreeformFontSizePx(flagged('subheading', 'mobile', 22, { sizeMobile: 3 }), 375)).toBe(10)
  })

  it('Tablet never reads Desktop or Mobile; Mobile never reads Desktop or Tablet; a missing/unusable own value falls back to the LEGACY string', () => {
    for (const kind of KINDS) {
      // tablet value missing, mobile + desktop present -> legacy tablet string (not the mobile value)
      expect(resolveFreeformFontSizeCss(flagged(kind, 'tablet', 100, { sizeMobile: 33 }))).toBe(OLD_DESKTOP[kind](100))
      // mobile value missing, tablet present -> legacy mobile string (not the tablet value)
      expect(resolveFreeformFontSizeCss(flagged(kind, 'mobile', 100, { sizeTablet: 80 }))).toBe(OLD_MOBILE[kind](100))
      for (const bad of [0, -5, NaN, Infinity, null as unknown as number]) {
        expect(resolveFreeformFontSizeCss(flagged(kind, 'tablet', 100, { sizeTablet: bad }))).toBe(OLD_DESKTOP[kind](100))
        expect(resolveFreeformFontSizeCss(flagged(kind, 'mobile', 100, { sizeMobile: bad }))).toBe(OLD_MOBILE[kind](100))
      }
    }
  })

  it('changing a mobile value changes the rendered size on a phone (the original bug: it did nothing past 28px)', () => {
    const phone = (m: number) => resolveFreeformFontSizePx(flagged('heading', 'mobile', 100, { sizeMobile: m }), 375)
    expect(phone(30)).toBeCloseTo(30, 4)
    expect(phone(60)).toBeCloseTo(60, 4)
    expect(phone(90)).toBeCloseTo(90, 4)
    expect(evalCss(OLD_MOBILE.heading(30), 375)).toBeCloseTo(evalCss(OLD_MOBILE.heading(90), 375), 6)
  })
})

describe('CSS string and numeric twin agree (viewport widths 320..2560)', () => {
  const sizes = [undefined, 8, 12, 18, 24, 56, 100, 150, 153.6, 154, 200, 400]
  const ownValues = [undefined, 8, 20, 40, 100, 300]
  it('for every kind, breakpoint, size, per-breakpoint value and flag state', () => {
    for (const kind of KINDS) {
      for (const bp of BPS) {
        for (const size of sizes) {
          if (size === undefined && kind !== 'button') continue
          for (const own of ownValues) {
            for (const independent of [undefined, false, true]) {
              const inp = input(kind, bp, size, { sizeTablet: own, sizeMobile: own, independent })
              const css = resolveFreeformFontSizeCss(inp)
              for (let w = 320; w <= 2560; w += 40) {
                // CSS vw is emitted with 6 decimals, so allow a hair of rounding (< 0.0001px).
                expect(Math.abs(resolveFreeformFontSizePx(inp, w) - evalCss(css, w))).toBeLessThan(1e-4)
              }
            }
          }
        }
      }
    }
  })
})

describe('(b) materialization — snapshot of what the legacy element renders at 1920 / 768 / 375', () => {
  const sizes = [...IDENTITY_SIZES, 77, 100.55, 153.6]

  it('after materializing, the three reference-width renderings equal the legacy ones (0.1px) for all kinds', () => {
    for (const kind of KINDS) {
      for (const s of sizes) {
        const m = materializeFontSizes(kind, s)
        expect(m.fontSizeIndependent).toBe(true)
        const el = { size: m.fontSize, sizeTablet: m.fontSizeTablet, sizeMobile: m.fontSizeMobile, independent: true }
        for (const bp of BPS) {
          const w = referenceViewportW(bp)
          const after = resolveFreeformFontSizePx(input(kind, bp, el.size, el), w)
          const before = resolveFreeformFontSizePx(input(kind, bp, s), w)
          expect(Math.abs(after - before)).toBeLessThanOrEqual(0.1)
        }
      }
    }
  })

  it('Desktop renders identically to before at EVERY width <= 1920 (so touching another breakpoint never changes the Desktop look)', () => {
    for (const kind of KINDS) {
      for (const s of sizes) {
        const m = materializeFontSizes(kind, s)
        for (const w of GRID.filter((x) => x <= 1920)) {
          const after = resolveFreeformFontSizePx(flagged(kind, 'desktop', m.fontSize), w)
          const before = resolveFreeformFontSizePx(input(kind, 'desktop', s), w)
          expect(Math.abs(after - before)).toBeLessThanOrEqual(0.1)
        }
      }
    }
  })

  it('legacy S=400 heading materializes Desktop=153.6; the stored values are rounded to 0.1px', () => {
    expect(materializeFontSizes('heading', 400)).toEqual({ fontSize: 153.6, fontSizeTablet: 61.4, fontSizeMobile: 28.1, fontSizeIndependent: true })
    expect(materializeFontSizes('heading', 200).fontSize).toBe(153.6)
    expect(materializeFontSizes('heading', 150)).toEqual({ fontSize: 150, fontSizeTablet: 61.4, fontSizeMobile: 28.1, fontSizeIndependent: true })
    expect(materializeFontSizes('heading', 100)).toEqual({ fontSize: 100, fontSizeTablet: 61.4, fontSizeMobile: 28.1, fontSizeIndependent: true })
    expect(materializeFontSizes('subheading', 22)).toEqual({ fontSize: 22, fontSizeTablet: 22, fontSizeMobile: 16, fontSizeIndependent: true })
    expect(materializeFontSizes('button', 18)).toEqual({ fontSize: 18, fontSizeTablet: 18, fontSizeMobile: 14, fontSizeIndependent: true })
    for (const kind of KINDS) {
      const m = materializeFontSizes(kind, 100.55)
      for (const v of [m.fontSize, m.fontSizeTablet, m.fontSizeMobile]) expect(Math.round(v * 10) / 10).toBe(v)
    }
  })

  it('never produces NaN, even from an unusable desktop size', () => {
    for (const kind of KINDS) {
      for (const bad of [undefined, NaN, 0, -5, Infinity, null as unknown as number]) {
        const m = materializeFontSizes(kind, bad)
        for (const v of [m.fontSize, m.fontSizeTablet, m.fontSizeMobile]) expect(Number.isFinite(v)).toBe(true)
      }
    }
  })
})

describe('(c) ISOLATION — on a flagged element changing ONE breakpoint changes ONLY that breakpoint', () => {
  const bases = [
    { S: 60, T: 40, M: 30 },
    { S: 150, T: 100, M: 60 },
    { S: 22, T: 26, M: 18 },
    { S: 200, T: 150, M: 80 },
  ]
  const next: Record<HeroEditBreakpoint, number[]> = { desktop: [90, 250], tablet: [70, 200], mobile: [50, 120] }
  const field = { desktop: 'size', tablet: 'sizeTablet', mobile: 'sizeMobile' } as const

  it('the other two breakpoints keep the same CSS string and the same px at every width 320..2560', () => {
    for (const kind of KINDS) {
      for (const { S, T, M } of bases) {
        const a = flagged(kind, 'desktop', S, { sizeTablet: T, sizeMobile: M })
        for (const edited of BPS) {
          for (const value of next[edited]) {
            const b = { ...a, [field[edited]]: value } as FreeformFontSizeInput
            for (const bp of BPS) {
              const ia = { ...a, breakpoint: bp }
              const ib = { ...b, breakpoint: bp }
              if (bp === edited) {
                expect(resolveFreeformFontSizeCss(ib)).not.toBe(resolveFreeformFontSizeCss(ia))
                const maxDiff = Math.max(...GRID.map((w) => Math.abs(resolveFreeformFontSizePx(ib, w) - resolveFreeformFontSizePx(ia, w))))
                expect(maxDiff).toBeGreaterThan(0.5)
              } else {
                expect(resolveFreeformFontSizeCss(ib)).toBe(resolveFreeformFontSizeCss(ia))
                for (const w of GRID) expect(resolveFreeformFontSizePx(ib, w)).toBe(resolveFreeformFontSizePx(ia, w))
              }
            }
          }
        }
      }
    }
  })

  it('the editor patch of a flagged element writes ONLY the edited breakpoint field (and never the flag-less legacy fields)', () => {
    for (const kind of KINDS) {
      const target = { size: 100, independent: true }
      expect(fontSizeEditPatch(kind, 'desktop', target, 120)).toEqual({ fontSize: 120 })
      expect(fontSizeEditPatch(kind, 'tablet', target, 70)).toEqual({ fontSizeTablet: 70 })
      expect(fontSizeEditPatch(kind, 'mobile', target, 40)).toEqual({ fontSizeMobile: 40 })
    }
  })

  it('reset (x) re-snapshots the legacy-equivalent of the CURRENT Desktop number, as a copied value', () => {
    expect(fontSizeResetPatch('heading', 'tablet', { size: 100, independent: true })).toEqual({ fontSizeTablet: 61.4 })
    expect(fontSizeResetPatch('heading', 'mobile', { size: 100, independent: true })).toEqual({ fontSizeMobile: 28.1 })
    expect(fontSizeResetPatch('button', 'mobile', { size: 18, independent: true })).toEqual({ fontSizeMobile: 14 })
    // a copy, not a link: it is a plain number computed once; changing Desktop afterwards is a patch that touches fontSize only
    expect(fontSizeEditPatch('heading', 'desktop', { size: 100, independent: true }, 150)).toEqual({ fontSize: 150 })
    // nothing to reset on Desktop or on a legacy element
    expect(fontSizeResetPatch('heading', 'desktop', { size: 100, independent: true })).toBeUndefined()
    expect(fontSizeResetPatch('heading', 'tablet', { size: 100, independent: false })).toBeUndefined()
    expect(fontSizeResetPatch('heading', 'tablet', { size: NaN, independent: true })).toBeUndefined()
  })
})

describe('(d) FIRST EDIT of a legacy element — materialize, then apply, without moving the other breakpoints', () => {
  const TYPED = 37
  for (const kind of KINDS) {
    it(`${kind}: editing any one breakpoint leaves the other two rendering as before`, () => {
      for (const s of IDENTITY_SIZES) {
        for (const edited of BPS) {
          const target = { size: s, independent: undefined }
          const frozen = JSON.stringify(target)
          const patch = fontSizeEditPatch(kind, edited, target, TYPED)
          expect(JSON.stringify(target)).toBe(frozen) // the input is not mutated
          const merged = { fontSize: s, ...patch }
          expect(merged.fontSizeIndependent).toBe(true)
          for (const v of [merged.fontSize, merged.fontSizeTablet, merged.fontSizeMobile]) expect(Number.isFinite(v)).toBe(true)
          const after = (bp: HeroEditBreakpoint, w: number) =>
            resolveFreeformFontSizePx(input(kind, bp, merged.fontSize, { sizeTablet: merged.fontSizeTablet, sizeMobile: merged.fontSizeMobile, independent: merged.fontSizeIndependent }), w)
          const before = (bp: HeroEditBreakpoint, w: number) => resolveFreeformFontSizePx(input(kind, bp, s), w)

          if (edited !== 'desktop') {
            for (const w of GRID.filter((x) => x <= 1920)) expect(Math.abs(after('desktop', w) - before('desktop', w))).toBeLessThanOrEqual(0.1)
          }
          if (edited !== 'tablet') expect(Math.abs(after('tablet', 768) - before('tablet', 768))).toBeLessThanOrEqual(0.1)
          if (edited !== 'mobile') expect(Math.abs(after('mobile', 375) - before('mobile', 375))).toBeLessThanOrEqual(0.1)
          // ...and the edited breakpoint renders exactly what was typed at its reference device
          expect(after(edited, referenceViewportW(edited))).toBeCloseTo(TYPED, 4)
        }
      }
    })
  }

  it('the first edit of Mobile on a legacy S=400 heading: Desktop stays 153.6, Tablet 61.4 (@768), Mobile becomes the typed value', () => {
    const patch = fontSizeEditPatch('heading', 'mobile', { size: 400 }, 40)
    expect(patch).toEqual({ fontSize: 153.6, fontSizeTablet: 61.4, fontSizeMobile: 40, fontSizeIndependent: true })
    expect(resolveFreeformFontSizePx(flagged('heading', 'desktop', patch.fontSize), 1920)).toBeCloseTo(153.6, 6)
    expect(resolveFreeformFontSizePx(flagged('heading', 'mobile', patch.fontSize, { sizeMobile: patch.fontSizeMobile }), 375)).toBeCloseTo(40, 4)
  })

  it('a later edit of an already-flagged element does NOT re-materialize (other breakpoints keep their values)', () => {
    const first = { fontSize: 100, ...fontSizeEditPatch('heading', 'mobile', { size: 100 }, 40) }
    const second = fontSizeEditPatch('heading', 'tablet', { size: first.fontSize, independent: first.fontSizeIndependent }, 90)
    expect(second).toEqual({ fontSizeTablet: 90 })
    expect({ ...first, ...second }).toMatchObject({ fontSize: 100, fontSizeTablet: 90, fontSizeMobile: 40, fontSizeIndependent: true })
  })

  it('a buttons whose fontSize is unset materializes from the default 18', () => {
    expect(fontSizeEditPatch('button', 'tablet', { size: 18 }, 20)).toEqual({ fontSize: 18, fontSizeTablet: 20, fontSizeMobile: 14, fontSizeIndependent: true })
  })
})

describe('editor reference widths (Desktop 1920 / Tablet 768 / Mobile 375) — what the canvas, Live Preview and page all render', () => {
  const px = (i: FreeformFontSizeInput) => resolveFreeformFontSizePx(i, referenceViewportW(i.breakpoint))

  it('reference widths come from the shared device constants', () => {
    expect(referenceViewportW('desktop')).toBe(1920)
    expect(referenceViewportW('tablet')).toBe(768)
    expect(referenceViewportW('mobile')).toBe(375)
  })

  it('flagged Desktop 1920: the typed size is the rendered size, including above the old 153.6px ceiling', () => {
    for (const s of [100, 150, 200, 300]) expect(px(flagged('heading', 'desktop', s))).toBeCloseTo(s, 6)
    expect(px(flagged('subheading', 'desktop', 100))).toBeCloseTo(100, 6)
    expect(px(flagged('button', 'desktop', 90))).toBeCloseTo(90, 6)
  })

  it('flagged Tablet 768 / Mobile 375: the typed value is the rendered size', () => {
    for (const x of [40, 90, 150]) expect(px(flagged('heading', 'tablet', 100, { sizeTablet: x }))).toBeCloseTo(x, 4)
    expect(px(flagged('subheading', 'tablet', 22, { sizeTablet: 28 }))).toBeCloseTo(28, 4)
    expect(px(flagged('button', 'tablet', 18, { sizeTablet: 24 }))).toBeCloseTo(24, 4)
    for (const x of [36, 64]) expect(px(flagged('heading', 'mobile', 100, { sizeMobile: x }))).toBeCloseTo(x, 4)
    expect(px(flagged('button', 'mobile', 18, { sizeMobile: 22 }))).toBeCloseTo(22, 4)
  })

  it('legacy elements render the old sizes (61.44px tablet heading, 28.125px mobile heading, 14px mobile button)', () => {
    expect(px(input('heading', 'tablet', 100))).toBeCloseTo(61.44, 6)
    expect(px(input('heading', 'tablet', 150))).toBeCloseTo(61.44, 6)
    expect(px(input('heading', 'mobile', 100))).toBeCloseTo(28.125, 6)
    expect(px(input('heading', 'mobile', 20))).toBeCloseTo(20, 6)
    expect(px(input('button', 'mobile', 18))).toBe(14)
  })
})

describe('legacyFontSizePx — the "Auto" the editor shows for a legacy element', () => {
  it('is the legacy rendering at the breakpoint reference device, ignoring any flag/values', () => {
    expect(legacyFontSizePx('heading', 'tablet', 100)).toBeCloseTo(61.44, 6)
    expect(legacyFontSizePx('heading', 'mobile', 100)).toBeCloseTo(28.125, 6)
    expect(legacyFontSizePx('button', 'mobile', undefined)).toBe(14)
    expect(legacyFontSizePx('heading', 'desktop', 400)).toBeCloseTo(153.6, 9)
  })
  it('is undefined when the authored size is not a number', () => {
    expect(legacyFontSizePx('heading', 'tablet', NaN)).toBeUndefined()
    expect(legacyFontSizePx('heading', 'tablet', undefined)).toBeUndefined()
  })
})

describe('parseFontSizeInput — never returns NaN', () => {
  it('rounds to 0.1px and clamps into [8, 400]', () => {
    expect(parseFontSizeInput('56')).toBe(56)
    expect(parseFontSizeInput(' 56.6 ')).toBe(56.6)
    expect(parseFontSizeInput('56.64')).toBe(56.6)
    expect(parseFontSizeInput('3')).toBe(FONT_SIZE_MIN_PX)
    expect(parseFontSizeInput('0')).toBe(FONT_SIZE_MIN_PX)
    expect(parseFontSizeInput('-40')).toBe(FONT_SIZE_MIN_PX)
    expect(parseFontSizeInput('9999')).toBe(FONT_SIZE_MAX_PX)
  })
  it('returns undefined (nothing to store) for empty / non-numeric / non-finite input', () => {
    for (const raw of ['', '   ', 'abc', 'NaN', 'Infinity', '-Infinity', '1e999', '--5']) {
      expect(parseFontSizeInput(raw)).toBeUndefined()
    }
  })
})

describe('(e) save path — flag and per-breakpoint sizes survive the section save/load round trip; untouched elements gain no keys', () => {
  // The Section API stores `content` wholesale (the only server-side check is "plain JSON object"),
  // and the client serialises with JSON.stringify.
  const flaggedSlide = {
    id: 's1',
    overlay: {
      layoutMode: 'freeform',
      heading: { text: 'H', fontSize: 100, fontSizeTablet: 70, fontSizeMobile: 40, fontSizeIndependent: true },
      headingRows: [{ text: 'R', fontSize: 150, fontSizeTablet: 90, fontSizeMobile: 36, fontSizeIndependent: true }],
      subheading: { text: 'S', fontSize: 22, fontSizeTablet: 26, fontSizeMobile: 18, fontSizeIndependent: true },
      buttons: [{ text: 'B', fontSize: 18, fontSizeTablet: 20, fontSizeMobile: 16, fontSizeIndependent: true }],
    },
  }

  it('keeps the flag and fontSizeTablet / fontSizeMobile on rows, heading, subheading and buttons', async () => {
    const { validateSectionContentFields } = await import('@/lib/section-content-validation')
    const content = { slides: [flaggedSlide] }
    expect(validateSectionContentFields({ content })).toBeNull()
    const loaded = JSON.parse(JSON.stringify({ content })).content
    expect(loaded.slides[0].overlay.headingRows[0]).toMatchObject({ fontSize: 150, fontSizeTablet: 90, fontSizeMobile: 36, fontSizeIndependent: true })
    expect(loaded.slides[0].overlay.heading).toMatchObject({ fontSizeTablet: 70, fontSizeMobile: 40, fontSizeIndependent: true })
    expect(loaded.slides[0].overlay.subheading).toMatchObject({ fontSizeTablet: 26, fontSizeMobile: 18, fontSizeIndependent: true })
    expect(loaded.slides[0].overlay.buttons[0]).toMatchObject({ fontSizeTablet: 20, fontSizeMobile: 16, fontSizeIndependent: true })
  })

  it('a never-touched (legacy) element serialises with none of the new keys, also after a field-by-field rebuild', () => {
    const legacyRow = { text: 'R', fontSize: 400, fontWeight: 800, fontFamily: 'inherit', color: '#fff' }
    expect(JSON.stringify(legacyRow)).not.toMatch(/fontSizeTablet|fontSizeMobile|fontSizeIndependent/)
    // the classic-heading -> stacked-row conversion spreads pickFontSizeFields(existing): nothing is added for a legacy heading
    expect(pickFontSizeFields(legacyRow)).toEqual({})
    expect(JSON.stringify({ ...legacyRow, ...pickFontSizeFields(legacyRow) })).toBe(JSON.stringify(legacyRow))
    expect(Object.keys({ ...legacyRow, ...pickFontSizeFields(legacyRow) })).toEqual(Object.keys(legacyRow))
  })

  it('field-by-field rebuilds (classic heading -> stacked row) carry the flag and values of a flagged element', () => {
    const el = { ...flaggedSlide.overlay.heading }
    expect(pickFontSizeFields(el)).toEqual({ fontSizeIndependent: true, fontSizeTablet: 70, fontSizeMobile: 40 })
    const rebuilt = { text: el.text, fontSize: el.fontSize, ...pickFontSizeFields(el) }
    expect(JSON.parse(JSON.stringify(rebuilt))).toMatchObject({ fontSize: 100, fontSizeTablet: 70, fontSizeMobile: 40, fontSizeIndependent: true })
    // a half-flagged / partly-set element only carries what it has, and a spread never invents `undefined` keys
    expect(pickFontSizeFields({ fontSizeIndependent: false })).toEqual({ fontSizeIndependent: false })
    expect(Object.keys(pickFontSizeFields({ fontSizeTablet: 50 }))).toEqual(['fontSizeTablet'])
    expect(pickFontSizeFields(undefined)).toEqual({})
  })

  it('a flagged element survives a JSON round trip rendering identically', () => {
    const el = JSON.parse(JSON.stringify(flaggedSlide.overlay.headingRows[0]))
    const before = flagged('heading', 'tablet', 150, { sizeTablet: 90 })
    const after = flagged('heading', 'tablet', el.fontSize, { sizeTablet: el.fontSizeTablet, independent: el.fontSizeIndependent })
    expect(resolveFreeformFontSizeCss(after)).toBe(resolveFreeformFontSizeCss(before))
  })
})
