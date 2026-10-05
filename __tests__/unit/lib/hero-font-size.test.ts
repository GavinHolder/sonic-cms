import { describe, it, expect } from 'vitest'
import {
  autoFontSizePx,
  BUTTON_DEFAULT_PX,
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  legacyFontSizeThreshold,
  parseFontSizeInput,
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

/** The strings HeroCarousel.tsx emitted BEFORE this module existed (verbatim templates). */
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

const KINDS: FreeformFontKind[] = ['heading', 'legacyHeading', 'subheading', 'button']
const WIDTHS = [320, 360, 375, 414, 500, 600, 700, 767, 768, 800, 900, 991, 992, 1100, 1280, 1366, 1440, 1536, 1680, 1920, 2200, 2560]
const input = (kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: number | undefined, extra: Partial<FreeformFontSizeInput> = {}): FreeformFontSizeInput => ({ kind, breakpoint, size, ...extra })

describe('resolveFreeformFontSizeCss — legacy identity (no per-breakpoint value, size <= threshold)', () => {
  it('thresholds are vw * 1920 / 100', () => {
    expect(legacyFontSizeThreshold('heading')).toBeCloseTo(153.6, 9)
    expect(legacyFontSizeThreshold('legacyHeading')).toBeCloseTo(134.4, 9)
    expect(legacyFontSizeThreshold('subheading')).toBeCloseTo(76.8, 9)
    expect(legacyFontSizeThreshold('button')).toBeCloseTo(67.2, 9)
  })

  for (const kind of KINDS) {
    it(`${kind}: desktop and tablet emit the OLD string byte-for-byte for every size <= threshold`, () => {
      const t = legacyFontSizeThreshold(kind)
      const sizes = [1, 8, 12, 18, 24, 31, 32, 40, 56, 60, 80, 100, 110, 150, Math.floor(t), t].filter((n) => n <= t)
      for (const s of sizes) {
        for (const bp of ['desktop', 'tablet'] as const) {
          expect(resolveFreeformFontSizeCss(input(kind, bp, s))).toBe(OLD_DESKTOP[kind](s))
        }
      }
    })

    it(`${kind}: numerically identical to the OLD clamp at every width 320..2560 (desktop + tablet, size <= threshold)`, () => {
      const t = legacyFontSizeThreshold(kind)
      for (const s of [12, 24, 56, 100, 150].filter((n) => n <= t)) {
        for (const w of WIDTHS) {
          for (const bp of ['desktop', 'tablet'] as const) {
            expect(resolveFreeformFontSizePx(input(kind, bp, s), w)).toBeCloseTo(evalCss(OLD_DESKTOP[kind](s), w), 9)
          }
        }
      }
    })

    it(`${kind}: mobile with no mobile value emits the OLD mobile string for ANY size (no threshold)`, () => {
      for (const s of [8, 18, 28, 44, 56, 100, 150, 200, 400]) {
        expect(resolveFreeformFontSizeCss(input(kind, 'mobile', s))).toBe(OLD_MOBILE[kind](s))
        // a tablet-only value must not leak into mobile
        expect(resolveFreeformFontSizeCss(input(kind, 'mobile', s, { sizeTablet: 77 }))).toBe(OLD_MOBILE[kind](s))
      }
    })

    it(`${kind}: desktop ignores tablet/mobile values; tablet ignores a mobile-only value`, () => {
      expect(resolveFreeformFontSizeCss(input(kind, 'desktop', 40, { sizeTablet: 99, sizeMobile: 33 }))).toBe(OLD_DESKTOP[kind](40))
      expect(resolveFreeformFontSizeCss(input(kind, 'tablet', 40, { sizeMobile: 33 }))).toBe(OLD_DESKTOP[kind](40))
    })
  }

  it('button with no fontSize keeps the old default of 18', () => {
    expect(BUTTON_DEFAULT_PX).toBe(18)
    expect(resolveFreeformFontSizeCss(input('button', 'desktop', undefined))).toBe('clamp(14px, 3.5vw, 18px)')
    expect(resolveFreeformFontSizeCss(input('button', 'mobile', undefined))).toBe('clamp(14px, 3.5vw, 18px)')
    expect(resolveFreeformFontSizeCss(input('button', 'tablet', undefined))).toBe('clamp(14px, 3.5vw, 18px)')
  })

  it('a non-numeric authored size reproduces the old (invalid) string instead of being "fixed"', () => {
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', NaN))).toBe('clamp(32px, 8vw, NaNpx)')
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', undefined))).toBe('clamp(32px, 8vw, undefinedpx)')
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', null as unknown as number))).toBe('clamp(32px, 8vw, nullpx)')
    expect(resolveFreeformFontSizeCss(input('heading', 'mobile', null as unknown as number))).toBe('clamp(20px, 7.5vw, 0px)')
    expect(resolveFreeformFontSizeCss(input('button', 'desktop', null as unknown as number))).toBe('clamp(14px, 3.5vw, 18px)')
  })
})

describe('resolveFreeformFontSizeCss — Desktop/Tablet scaled rule above the old ceiling', () => {
  it('emits max(VWvw, S/1920*100vw) above the threshold, keeping the floor and S as the cap', () => {
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', 200))).toBe('clamp(32px, max(8vw, 10.416667vw), 200px)')
    expect(resolveFreeformFontSizeCss(input('legacyHeading', 'desktop', 200))).toBe('clamp(28px, max(7vw, 10.416667vw), 200px)')
    expect(resolveFreeformFontSizeCss(input('subheading', 'desktop', 100))).toBe('clamp(16px, max(4vw, 5.208333vw), 100px)')
    expect(resolveFreeformFontSizeCss(input('button', 'desktop', 100))).toBe('clamp(14px, max(3.5vw, 5.208333vw), 100px)')
  })

  it('S=200 heading honours 200px at 1920, 150px at 1440, 133.3px at 1280 and never exceeds S', () => {
    const at = (w: number) => resolveFreeformFontSizePx(input('heading', 'desktop', 200), w)
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
          const px = resolveFreeformFontSizePx(input(kind, 'desktop', s), w)
          expect(px).toBeGreaterThanOrEqual(prev - 1e-9)
          prev = px
        }
      }
    }
  })

  it('tablet without a tablet value uses the same rule as desktop', () => {
    expect(resolveFreeformFontSizeCss(input('heading', 'tablet', 200))).toBe(resolveFreeformFontSizeCss(input('heading', 'desktop', 200)))
  })
})

describe('resolveFreeformFontSizeCss — per-breakpoint value ("own")', () => {
  it('emits clamp(10px, X/REF*100vw, X*1.25px) for tablet (REF 768) and mobile (REF 375)', () => {
    expect(resolveFreeformFontSizeCss(input('heading', 'tablet', 100, { sizeTablet: 80 }))).toBe('clamp(10px, 10.416667vw, 100px)')
    expect(resolveFreeformFontSizeCss(input('subheading', 'mobile', 22, { sizeMobile: 30 }))).toBe('clamp(10px, 8vw, 37.5px)')
  })

  it('is EXACTLY X at the reference device, proportional between, capped at 1.25X above', () => {
    for (const kind of KINDS) {
      for (const X of [10, 24, 60, 100, 250]) {
        const tab = (w: number) => resolveFreeformFontSizePx(input(kind, 'tablet', 999, { sizeTablet: X }), w)
        expect(tab(768)).toBeCloseTo(X, 4)
        expect(tab(960)).toBeCloseTo(X * 1.25, 4)
        expect(tab(991)).toBeCloseTo(X * 1.25, 4)
        const mob = (w: number) => resolveFreeformFontSizePx(input(kind, 'mobile', 999, { sizeMobile: X }), w)
        expect(mob(375)).toBeCloseTo(X, 4)
        expect(mob(468.75)).toBeCloseTo(X * 1.25, 4)
        expect(mob(767)).toBeCloseTo(X * 1.25, 4)
      }
    }
  })

  it('never goes below 10px, even for a tiny value on a narrow phone', () => {
    expect(resolveFreeformFontSizePx(input('subheading', 'mobile', 22, { sizeMobile: 8 }), 320)).toBe(10)
    expect(resolveFreeformFontSizePx(input('subheading', 'mobile', 22, { sizeMobile: 3 }), 375)).toBe(10)
  })

  it('a value for another breakpoint never applies, and an unusable value counts as "not set"', () => {
    expect(resolveFreeformFontSizeCss(input('heading', 'mobile', 100, { sizeTablet: 80 }))).toBe(OLD_MOBILE.heading(100))
    for (const bad of [0, -5, NaN, Infinity, null as unknown as number]) {
      expect(resolveFreeformFontSizeCss(input('heading', 'tablet', 100, { sizeTablet: bad }))).toBe(OLD_DESKTOP.heading(100))
      expect(resolveFreeformFontSizeCss(input('heading', 'mobile', 100, { sizeMobile: bad }))).toBe(OLD_MOBILE.heading(100))
    }
  })

  it('changing a mobile value changes the rendered size on a phone (the original bug: it did nothing past 28px)', () => {
    const phone = (m: number) => resolveFreeformFontSizePx(input('heading', 'mobile', 100, { sizeMobile: m }), 375)
    expect(phone(30)).toBeCloseTo(30, 4)
    expect(phone(60)).toBeCloseTo(60, 4)
    expect(phone(90)).toBeCloseTo(90, 4)
    // ...and the old rule really was inert past 28.1px
    expect(evalCss(OLD_MOBILE.heading(30), 375)).toBeCloseTo(evalCss(OLD_MOBILE.heading(90), 375), 6)
  })
})

describe('CSS string and numeric twin agree (viewport widths 320..2560)', () => {
  const sizes = [undefined, 8, 12, 18, 24, 56, 100, 150, 153.6, 154, 200, 400]
  const ownValues = [undefined, 8, 20, 40, 100, 300]
  it('for every kind, breakpoint, size and per-breakpoint value', () => {
    for (const kind of KINDS) {
      for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
        for (const size of sizes) {
          if (size === undefined && kind !== 'button') continue
          for (const own of ownValues) {
            const inp = input(kind, bp, size, { sizeTablet: own, sizeMobile: own })
            const css = resolveFreeformFontSizeCss(inp)
            for (let w = 320; w <= 2560; w += 20) {
              const a = resolveFreeformFontSizePx(inp, w)
              const b = evalCss(css, w)
              // CSS vw is emitted with 6 decimals, so allow a hair of rounding (< 0.0001px).
              expect(Math.abs(a - b)).toBeLessThan(1e-4)
            }
          }
        }
      }
    }
  })
})

describe('editor reference widths (Desktop 1920 / Tablet 768 / Mobile 375) — what the canvas, Live Preview and page all render', () => {
  const px = (i: FreeformFontSizeInput) => resolveFreeformFontSizePx(i, referenceViewportW(i.breakpoint))

  it('reference widths come from the shared device constants', () => {
    expect(referenceViewportW('desktop')).toBe(1920)
    expect(referenceViewportW('tablet')).toBe(768)
    expect(referenceViewportW('mobile')).toBe(375)
  })

  it('Desktop 1920: the typed size is the rendered size, including above the old 153.6px ceiling', () => {
    expect(px(input('heading', 'desktop', 100))).toBeCloseTo(100, 6)
    expect(px(input('heading', 'desktop', 150))).toBeCloseTo(150, 6)
    expect(px(input('heading', 'desktop', 200))).toBeCloseTo(200, 6)
    expect(px(input('heading', 'desktop', 300))).toBeCloseTo(300, 6)
    expect(px(input('subheading', 'desktop', 100))).toBeCloseTo(100, 6)
    expect(px(input('button', 'desktop', 90))).toBeCloseTo(90, 6)
  })

  it('Tablet 768: no tablet value -> the desktop rule at 768 (61.44px for the default 100/150 headings); a tablet value is exact', () => {
    expect(px(input('heading', 'tablet', 100))).toBeCloseTo(61.44, 6)
    expect(px(input('heading', 'tablet', 150))).toBeCloseTo(61.44, 6)
    expect(px(input('heading', 'tablet', 100, { sizeTablet: 40 }))).toBeCloseTo(40, 4)
    expect(px(input('heading', 'tablet', 100, { sizeTablet: 90 }))).toBeCloseTo(90, 4)
    expect(px(input('heading', 'tablet', 100, { sizeTablet: 150 }))).toBeCloseTo(150, 4)
    expect(px(input('subheading', 'tablet', 22, { sizeTablet: 28 }))).toBeCloseTo(28, 4)
    expect(px(input('button', 'tablet', 18, { sizeTablet: 24 }))).toBeCloseTo(24, 4)
  })

  it('Mobile 375: no mobile value -> the old fit rule (28.125px for a 100px heading, 44 max); a mobile value is exact', () => {
    expect(px(input('heading', 'mobile', 100))).toBeCloseTo(28.125, 6)
    expect(px(input('heading', 'mobile', 20))).toBeCloseTo(20, 6)
    expect(px(input('button', 'mobile', 18))).toBe(14)
    expect(px(input('heading', 'mobile', 100, { sizeMobile: 36 }))).toBeCloseTo(36, 4)
    expect(px(input('heading', 'mobile', 100, { sizeMobile: 64 }))).toBeCloseTo(64, 4)
    expect(px(input('button', 'mobile', 18, { sizeMobile: 18 }))).toBeCloseTo(18, 4)
    expect(px(input('button', 'mobile', 18, { sizeMobile: 22 }))).toBeCloseTo(22, 4)
  })
})

describe('autoFontSizePx — the "Auto" the editor shows', () => {
  it('is the unset rendering at the breakpoint reference device', () => {
    expect(autoFontSizePx('heading', 'tablet', 100)).toBeCloseTo(61.44, 6)
    expect(autoFontSizePx('heading', 'mobile', 100)).toBeCloseTo(28.125, 6)
    expect(autoFontSizePx('button', 'mobile', undefined)).toBe(14)
    expect(autoFontSizePx('heading', 'desktop', 200)).toBeCloseTo(200, 6)
  })
  it('is undefined when the authored size is not a number', () => {
    expect(autoFontSizePx('heading', 'tablet', NaN)).toBeUndefined()
    expect(autoFontSizePx('heading', 'tablet', undefined)).toBeUndefined()
  })
})

describe('parseFontSizeInput — never returns NaN', () => {
  it('rounds valid input and clamps into [8, 400]', () => {
    expect(parseFontSizeInput('56')).toBe(56)
    expect(parseFontSizeInput(' 56.6 ')).toBe(57)
    expect(parseFontSizeInput('3')).toBe(FONT_SIZE_MIN_PX)
    expect(parseFontSizeInput('0')).toBe(FONT_SIZE_MIN_PX)
    expect(parseFontSizeInput('-40')).toBe(FONT_SIZE_MIN_PX)
    expect(parseFontSizeInput('9999')).toBe(FONT_SIZE_MAX_PX)
  })
  it('returns undefined (nothing to store) for empty / non-numeric / non-finite input', () => {
    for (const raw of ['', '   ', 'abc', 'NaN', 'Infinity', '-Infinity', '1e999', '--5']) {
      const r = parseFontSizeInput(raw)
      expect(r).toBeUndefined()
    }
  })
})

describe('save path — per-breakpoint sizes survive the section save/load round trip', () => {
  // The Section API stores `content` wholesale (the only server-side check is "plain JSON object"),
  // and the client serialises with JSON.stringify — so the new optional fields persist, and an
  // override cleared in the editor (set to undefined) disappears from the saved JSON.
  const slide = {
    id: 's1',
    overlay: {
      layoutMode: 'freeform',
      heading: { text: 'H', fontSize: 100, fontSizeTablet: 70, fontSizeMobile: 40 },
      headingRows: [{ text: 'R', fontSize: 150, fontSizeTablet: 90, fontSizeMobile: 36 }],
      subheading: { text: 'S', fontSize: 22, fontSizeTablet: 26, fontSizeMobile: 18 },
      buttons: [{ text: 'B', fontSize: 18, fontSizeTablet: 20, fontSizeMobile: 16 }],
    },
  }

  it('keeps fontSizeTablet / fontSizeMobile on rows, heading, subheading and buttons', async () => {
    const { validateSectionContentFields } = await import('@/lib/section-content-validation')
    const content = { slides: [slide] }
    expect(validateSectionContentFields({ content })).toBeNull()
    const loaded = JSON.parse(JSON.stringify({ content })).content
    expect(loaded.slides[0].overlay.headingRows[0]).toMatchObject({ fontSize: 150, fontSizeTablet: 90, fontSizeMobile: 36 })
    expect(loaded.slides[0].overlay.heading).toMatchObject({ fontSizeTablet: 70, fontSizeMobile: 40 })
    expect(loaded.slides[0].overlay.subheading).toMatchObject({ fontSizeTablet: 26, fontSizeMobile: 18 })
    expect(loaded.slides[0].overlay.buttons[0]).toMatchObject({ fontSizeTablet: 20, fontSizeMobile: 16 })
  })

  it('a cleared override (undefined) is absent after the round trip, i.e. back to Auto', () => {
    const row = { ...slide.overlay.headingRows[0], fontSizeTablet: undefined }
    const loaded = JSON.parse(JSON.stringify(row))
    expect('fontSizeTablet' in loaded).toBe(false)
    expect(resolveFreeformFontSizeCss(input('heading', 'tablet', loaded.fontSize, { sizeTablet: loaded.fontSizeTablet, sizeMobile: loaded.fontSizeMobile }))).toBe(OLD_DESKTOP.heading(150))
  })
})
