import { describe, it, expect } from 'vitest'
import {
  BUTTON_DEFAULT_PX,
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  fontSizeEditPatch,
  fontSizeOwnFieldName,
  fontSizeResetPatch,
  legacyFontSizePx,
  legacyFontSizeThreshold,
  parseFontSizeInput,
  pickFontSizeFields,
  referenceViewportW,
  resolveFreeformFontSizeCss,
  resolveFreeformFontSizePx,
  type FontSizeOwnFields,
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

/**
 * INDEPENDENT ORACLE: the strings HeroCarousel.tsx emitted on origin/main, as verbatim templates.
 * `s` is the raw saved `fontSize` (any JSON value, incl. null / NaN / a string).
 */
const OLD_DESKTOP: Record<FreeformFontKind, (s: unknown) => string> = {
  heading: (s) => `clamp(32px, 8vw, ${s}px)`,
  legacyHeading: (s) => `clamp(28px, 7vw, ${s}px)`,
  subheading: (s) => `clamp(16px, 4vw, ${s}px)`,
  button: (s) => `clamp(14px, 3.5vw, ${s ?? 18}px)`,
}
const OLD_MOBILE: Record<FreeformFontKind, (s: unknown) => string> = {
  heading: (s) => `clamp(20px, 7.5vw, ${Math.min(s as number, 44)}px)`,
  legacyHeading: (s) => `clamp(20px, 7vw, ${Math.min(s as number, 44)}px)`,
  subheading: (s) => `clamp(16px, 4vw, ${s}px)`,
  button: (s) => `clamp(14px, 3.5vw, ${s ?? 18}px)`,
}
const oldString = (kind: FreeformFontKind, bp: HeroEditBreakpoint, s: unknown) => (bp === 'mobile' ? OLD_MOBILE[kind](s) : OLD_DESKTOP[kind](s))

const KINDS: FreeformFontKind[] = ['heading', 'legacyHeading', 'subheading', 'button']
const BPS: HeroEditBreakpoint[] = ['desktop', 'tablet', 'mobile']
const FIELD = { desktop: 'sizeDesktop', tablet: 'sizeTablet', mobile: 'sizeMobile' } as const
const WIDTHS = [320, 360, 375, 414, 500, 600, 700, 767, 768, 800, 900, 991, 992, 1100, 1280, 1366, 1440, 1536, 1680, 1920, 2200, 2560]
const GRID = Array.from({ length: 113 }, (_, i) => 320 + i * 20) // 320..2560
// every legacy size the reviewer's identity sweep used, incl. non-numbers a JSON column can hold
const LEGACY_SIZES: unknown[] = [undefined, null, NaN, 0, -5, 6, 10, 18, 22, 56, 100, 130, 150, 153.6, 153.7, 200, 400, 1e9, '100']
const UNUSABLE_OWN: unknown[] = [undefined, null, NaN, 0, -5, Infinity, '77']

const input = (kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: unknown, extra: Partial<FreeformFontSizeInput> = {}): FreeformFontSizeInput =>
  ({ kind, breakpoint, size: size as number | undefined, ...extra })
const px = (i: FreeformFontSizeInput, w: number) => resolveFreeformFontSizePx(i, w)

describe('(1) IDENTITY - an element with no usable own size renders byte-identically to origin/main', () => {
  it('every kind x breakpoint x legacy size: same CSS string as the origin/main oracle (also with unusable own values present)', () => {
    const mismatches: string[] = []
    let compared = 0
    for (const kind of KINDS) {
      for (const bp of BPS) {
        for (const s of LEGACY_SIZES) {
          const expected = oldString(kind, bp, s)
          // no own fields at all, then every unusable own value in every own field
          const variants: Partial<FreeformFontSizeInput>[] = [{}]
          for (const bad of UNUSABLE_OWN) {
            variants.push({ sizeDesktop: bad as number, sizeTablet: bad as number, sizeMobile: bad as number })
          }
          for (const v of variants) {
            compared++
            const got = resolveFreeformFontSizeCss(input(kind, bp, s, v))
            if (got !== expected) mismatches.push(`${kind}/${bp}/${String(s)}/${JSON.stringify(v)}: ${got} != ${expected}`)
          }
        }
      }
    }
    expect(compared).toBe(4 * 3 * LEGACY_SIZES.length * (1 + UNUSABLE_OWN.length))
    expect(mismatches).toEqual([])
  })

  it('the numeric twin equals the origin/main clamp at widths 320..2560', () => {
    let worst = 0
    for (const kind of KINDS) {
      for (const bp of BPS) {
        for (const s of LEGACY_SIZES) {
          if (typeof s !== 'number' || !Number.isFinite(s)) continue
          for (const w of WIDTHS) worst = Math.max(worst, Math.abs(px(input(kind, bp, s), w) - evalCss(oldString(kind, bp, s), w)))
        }
      }
    }
    expect(worst).toBeLessThan(1e-9)
  })

  it('the saved-data case that motivated this: rows saved at 400 / 200 render exactly as before (8vw cap, 153.6px @1920)', () => {
    for (const s of [200, 400]) {
      expect(resolveFreeformFontSizeCss(input('heading', 'desktop', s))).toBe(`clamp(32px, 8vw, ${s}px)`)
      expect(px(input('heading', 'desktop', s), 1920)).toBeCloseTo(153.6, 9)
      expect(resolveFreeformFontSizeCss(input('heading', 'tablet', s))).toBe(`clamp(32px, 8vw, ${s}px)`)
      expect(resolveFreeformFontSizeCss(input('heading', 'mobile', s))).toBe('clamp(20px, 7.5vw, 44px)')
    }
  })

  it('a button with no fontSize keeps the old default of 18', () => {
    expect(BUTTON_DEFAULT_PX).toBe(18)
    for (const bp of BPS) expect(resolveFreeformFontSizeCss(input('button', bp, undefined))).toBe('clamp(14px, 3.5vw, 18px)')
  })

  it('thresholds are vw * 1920 / 100', () => {
    expect(legacyFontSizeThreshold('heading')).toBeCloseTo(153.6, 9)
    expect(legacyFontSizeThreshold('legacyHeading')).toBeCloseTo(134.4, 9)
    expect(legacyFontSizeThreshold('subheading')).toBeCloseTo(76.8, 9)
    expect(legacyFontSizeThreshold('button')).toBeCloseTo(67.2, 9)
  })
})

describe('own fields fall back to legacy(fontSize) ONLY - never to another breakpoint\'s own field', () => {
  it('a breakpoint without a usable own value ignores the other two breakpoints\' own values entirely', () => {
    const mismatches: string[] = []
    for (const kind of KINDS) {
      for (const s of [undefined, 6, 22, 100, 400, NaN] as const) {
        for (const bp of BPS) {
          // hand-edited / partial data: this breakpoint's own field missing or garbage, the other two set to wild values
          const others = BPS.filter((b) => b !== bp)
          for (const own of UNUSABLE_OWN) {
            const i = input(kind, bp, s, { [FIELD[bp]]: own, [FIELD[others[0]]]: 123, [FIELD[others[1]]]: 45 })
            const got = resolveFreeformFontSizeCss(i)
            if (got !== oldString(kind, bp, s)) mismatches.push(`${kind}/${bp}/${String(s)}/${String(own)}: ${got}`)
          }
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})

describe('(2) OWN fields are exact at the reference widths', () => {
  it('Desktop own S is the rendered size at 1920 (also above the old 153.6px ceiling) and proportional below it', () => {
    for (const kind of KINDS) {
      for (const s of [40, 56, 100, 150, 153.6, 154, 200, 300, 400]) {
        expect(px(input(kind, 'desktop', 56, { sizeDesktop: s }), 1920)).toBeCloseTo(s, 6)
      }
    }
    const at = (w: number) => px(input('heading', 'desktop', 56, { sizeDesktop: 200 }), w)
    expect(at(1440)).toBeCloseTo(150, 6)
    expect(at(1280)).toBeCloseTo(133.3333, 3)
    expect(at(2560)).toBe(200)
  })

  it('Desktop own S <= the old threshold is the legacy string with S; above it the scaled max() rule', () => {
    for (const kind of KINDS) {
      const t = legacyFontSizeThreshold(kind)
      for (const s of [40, 56, 100, t].filter((n) => n <= t)) {
        expect(resolveFreeformFontSizeCss(input(kind, 'desktop', 999, { sizeDesktop: s }))).toBe(OLD_DESKTOP[kind](s))
      }
    }
    expect(resolveFreeformFontSizeCss(input('heading', 'desktop', 56, { sizeDesktop: 200 }))).toBe('clamp(32px, max(8vw, 10.416667vw), 200px)')
    expect(resolveFreeformFontSizeCss(input('legacyHeading', 'desktop', 56, { sizeDesktop: 200 }))).toBe('clamp(28px, max(7vw, 10.416667vw), 200px)')
    expect(resolveFreeformFontSizeCss(input('subheading', 'desktop', 22, { sizeDesktop: 100 }))).toBe('clamp(16px, max(4vw, 5.208333vw), 100px)')
    expect(resolveFreeformFontSizeCss(input('button', 'desktop', 18, { sizeDesktop: 100 }))).toBe('clamp(14px, max(3.5vw, 5.208333vw), 100px)')
  })

  it('a larger Desktop own size never renders smaller than a smaller one (monotonic)', () => {
    let violations = 0
    for (const kind of KINDS) {
      for (const w of WIDTHS) {
        let prev = 0
        for (let s = 8; s <= 400; s += 8) {
          const v = px(input(kind, 'desktop', 56, { sizeDesktop: s }), w)
          if (v < prev - 1e-9) violations++
          prev = v
        }
      }
    }
    expect(violations).toBe(0)
  })

  it('Tablet / Mobile own X: clamp(10px, X/REF*100vw, 1.25Xpx), EXACTLY X at 768 / 375, proportional between, capped at 1.25X', () => {
    expect(resolveFreeformFontSizeCss(input('heading', 'tablet', 100, { sizeTablet: 80 }))).toBe('clamp(10px, 10.416667vw, 100px)')
    expect(resolveFreeformFontSizeCss(input('subheading', 'mobile', 22, { sizeMobile: 30 }))).toBe('clamp(10px, 8vw, 37.5px)')
    const off: string[] = []
    for (const kind of KINDS) {
      for (const X of [10, 24, 60, 100, 250]) {
        const tab = (w: number) => px(input(kind, 'tablet', 999, { sizeTablet: X }), w)
        const mob = (w: number) => px(input(kind, 'mobile', 999, { sizeMobile: X }), w)
        const check = (label: string, got: number, want: number) => { if (Math.abs(got - want) > 1e-4) off.push(`${kind}/${label}/${X}: ${got} != ${want}`) }
        check('tab768', tab(768), X)
        check('tab960', tab(960), X * 1.25)
        check('tab991', tab(991), X * 1.25)
        check('mob375', mob(375), X)
        check('mob468', mob(468.75), X * 1.25)
        check('mob767', mob(767), X * 1.25)
      }
    }
    expect(off).toEqual([])
  })

  it('an own Tablet/Mobile value never goes below 10px', () => {
    expect(px(input('subheading', 'mobile', 22, { sizeMobile: 8 }), 320)).toBe(10)
    expect(px(input('subheading', 'mobile', 22, { sizeMobile: 3 }), 375)).toBe(10)
  })

  it('representative editor reference renders (Desktop 1920 / Tablet 768 / Mobile 375)', () => {
    const at = (i: FreeformFontSizeInput) => px(i, referenceViewportW(i.breakpoint))
    expect(referenceViewportW('desktop')).toBe(1920)
    expect(referenceViewportW('tablet')).toBe(768)
    expect(referenceViewportW('mobile')).toBe(375)
    for (const s of [100, 150, 200, 300]) expect(at(input('heading', 'desktop', 56, { sizeDesktop: s }))).toBeCloseTo(s, 6)
    for (const x of [40, 90, 150]) expect(at(input('heading', 'tablet', 100, { sizeTablet: x }))).toBeCloseTo(x, 4)
    for (const x of [36, 64]) expect(at(input('heading', 'mobile', 100, { sizeMobile: x }))).toBeCloseTo(x, 4)
    expect(at(input('button', 'mobile', 18, { sizeMobile: 22 }))).toBeCloseTo(22, 4)
    // no own value: the legacy rendering
    expect(at(input('heading', 'tablet', 100))).toBeCloseTo(61.44, 6)
    expect(at(input('heading', 'mobile', 100))).toBeCloseTo(28.125, 6)
    expect(at(input('button', 'mobile', 18))).toBe(14)
  })

  it('changing a mobile own value changes the rendered size on a phone (the original bug: it did nothing past 28px)', () => {
    const phone = (m: number) => px(input('heading', 'mobile', 100, { sizeMobile: m }), 375)
    expect(phone(30)).toBeCloseTo(30, 4)
    expect(phone(60)).toBeCloseTo(60, 4)
    expect(phone(90)).toBeCloseTo(90, 4)
    expect(evalCss(OLD_MOBILE.heading(30), 375)).toBeCloseTo(evalCss(OLD_MOBILE.heading(90), 375), 6)
  })
})

describe('(3) ISOLATION - setting/clearing ONE breakpoint\'s own field changes ONLY that breakpoint, at every width', () => {
  // Every combination of "which of the three own fields are already set", on every legacy size, with the
  // edit applied to each breakpoint in turn (set A, set B, clear). The other two breakpoints must be
  // byte-identical (CSS) and Object.is-identical (px) at every width 320..2560.
  const legacySizes: unknown[] = [undefined, 6, 22, 100, 150, 400, NaN]
  const stateValue: Record<HeroEditBreakpoint, number> = { desktop: 90, tablet: 90, mobile: 90 }

  it('the other two breakpoints are unchanged at ALL widths; the edited one changes', () => {
    const leaked: string[] = []
    const unchangedEdited: string[] = []
    let pairs = 0
    for (const kind of KINDS) {
      for (const s of legacySizes) {
        for (let mask = 0; mask < 8; mask++) {
          const before: FreeformFontSizeInput = input(kind, 'desktop', s)
          BPS.forEach((b, idx) => { if (mask & (1 << idx)) (before as unknown as Record<string, number>)[FIELD[b]] = stateValue[b] })
          for (const edited of BPS) {
            for (const op of [55.5, 133.3, null] as const) {
              const after = { ...before } as unknown as Record<string, unknown>
              if (op === null) delete after[FIELD[edited]]
              else after[FIELD[edited]] = op
              const afterInput = after as unknown as FreeformFontSizeInput
              if (JSON.stringify(before) === JSON.stringify(afterInput)) continue // clearing an already-absent field is a no-op
              pairs++
              for (const bp of BPS) {
                const a = { ...before, breakpoint: bp }
                const b = { ...afterInput, breakpoint: bp }
                const cssSame = resolveFreeformFontSizeCss(a) === resolveFreeformFontSizeCss(b)
                let pxSame = true
                for (const w of GRID) if (!Object.is(px(a, w), px(b, w))) { pxSame = false; break }
                if (bp === edited) {
                  if (cssSame || pxSame) unchangedEdited.push(`${kind}/${String(s)}/mask${mask}/${edited}/${String(op)}`)
                } else if (!cssSame || !pxSame) {
                  leaked.push(`${kind}/${String(s)}/mask${mask}/edit ${edited} (${String(op)}) leaked into ${bp}`)
                }
              }
            }
          }
        }
      }
    }
    expect(pairs).toBeGreaterThan(1500)
    expect(leaked).toEqual([])
    expect(unchangedEdited).toEqual([])
  })

  it('editing Mobile on a legacy S=400 heading leaves Desktop and Tablet identical at every width 320..2560', () => {
    const base = input('heading', 'desktop', 400)
    const edited = { ...base, sizeMobile: 40 }
    for (const bp of ['desktop', 'tablet'] as const) {
      expect(resolveFreeformFontSizeCss({ ...edited, breakpoint: bp })).toBe(`clamp(32px, 8vw, 400px)`)
      for (const w of GRID) expect(Object.is(px({ ...edited, breakpoint: bp }, w), px({ ...base, breakpoint: bp }, w))).toBe(true)
    }
    expect(px({ ...edited, breakpoint: 'mobile' }, 375)).toBeCloseTo(40, 4)
  })

  it('the legacy base `fontSize` is never part of a freeform edit patch', () => {
    for (const bp of BPS) {
      const patch = fontSizeEditPatch(bp, 70)
      expect(Object.keys(patch)).toEqual([fontSizeOwnFieldName(bp)])
      expect('fontSize' in patch).toBe(false)
    }
  })
})

describe('(4) editor patch helpers', () => {
  it('write ONLY the edited breakpoint\'s own field', () => {
    expect(fontSizeEditPatch('desktop', 120)).toEqual({ fontSizeDesktop: 120 })
    expect(fontSizeEditPatch('tablet', 70)).toEqual({ fontSizeTablet: 70 })
    expect(fontSizeEditPatch('mobile', 40.5)).toEqual({ fontSizeMobile: 40.5 })
  })

  it('return fresh objects and never mutate the element they are merged into', () => {
    const el = Object.freeze({ text: 'R', fontSize: 400, fontSizeTablet: 90 })
    const frozen = JSON.stringify(el)
    const a = fontSizeEditPatch('mobile', 40)
    const b = fontSizeEditPatch('mobile', 40)
    expect(a).not.toBe(b)
    const merged = { ...el, ...a }
    expect(JSON.stringify(el)).toBe(frozen)
    expect(merged).toEqual({ text: 'R', fontSize: 400, fontSizeTablet: 90, fontSizeMobile: 40 })
    expect(merged.fontSize).toBe(400) // the legacy base is untouched
    const reset = { ...merged, ...fontSizeResetPatch('tablet') }
    expect(JSON.stringify(el)).toBe(frozen)
    expect(JSON.parse(JSON.stringify(reset))).toEqual({ text: 'R', fontSize: 400, fontSizeMobile: 40 })
  })

  it('reset DELETES the own field (the key is gone after JSON, the breakpoint is back on legacy)', () => {
    for (const bp of BPS) {
      const patch = fontSizeResetPatch(bp)
      expect(Object.keys(patch)).toEqual([fontSizeOwnFieldName(bp)])
      expect(Object.values(patch)).toEqual([undefined])
      const el = { fontSize: 100, fontSizeDesktop: 90, fontSizeTablet: 80, fontSizeMobile: 70 }
      const after = JSON.parse(JSON.stringify({ ...el, ...patch }))
      expect(fontSizeOwnFieldName(bp) in after).toBe(false)
      expect(Object.keys(after).sort()).toEqual(Object.keys(el).filter((k) => k !== fontSizeOwnFieldName(bp)).sort())
    }
  })

  it('edit then reset restores the original serialisation exactly (a touched-then-cleared element is as if never touched)', () => {
    const original = { text: 'R', fontSize: 400 }
    for (const bp of BPS) {
      const edited = { ...original, ...fontSizeEditPatch(bp, 77) }
      const cleared = { ...edited, ...fontSizeResetPatch(bp) }
      expect(JSON.stringify(cleared)).toBe(JSON.stringify(original))
    }
  })

  it('parseFontSizeInput (the one input guard): 0.1px precision, strict while typing, clamped on blur, never NaN', () => {
    expect(parseFontSizeInput('56')).toBe(56)
    expect(parseFontSizeInput(' 56.6 ')).toBe(56.6)
    expect(parseFontSizeInput('56.64')).toBe(56.6)
    expect(parseFontSizeInput('3')).toBe(FONT_SIZE_MIN_PX)
    expect(parseFontSizeInput('9999')).toBe(FONT_SIZE_MAX_PX)
    expect(parseFontSizeInput('3', 'strict')).toBeUndefined() // a half-typed "1" on the way to "100" is not a size
    expect(parseFontSizeInput('9999', 'strict')).toBeUndefined()
    expect(parseFontSizeInput('8', 'strict')).toBe(8)
    expect(parseFontSizeInput('400', 'strict')).toBe(400)
    for (const raw of ['', '   ', 'abc', 'NaN', 'Infinity', '-Infinity', '1e999', '--5']) {
      expect(parseFontSizeInput(raw)).toBeUndefined()
      expect(parseFontSizeInput(raw, 'strict')).toBeUndefined()
    }
    for (const raw of ['0', '-40', '7.96', '400.04', '5e2']) {
      for (const mode of ['clamp', 'strict'] as const) {
        const v = parseFontSizeInput(raw, mode)
        expect(v === undefined || Number.isFinite(v)).toBe(true)
      }
    }
  })

  it('legacyFontSizePx - the "Auto" / "Legacy" size shown for a breakpoint with no own value', () => {
    expect(legacyFontSizePx('heading', 'tablet', 100)).toBeCloseTo(61.44, 6)
    expect(legacyFontSizePx('heading', 'mobile', 100)).toBeCloseTo(28.125, 6)
    expect(legacyFontSizePx('button', 'mobile', undefined)).toBe(14)
    expect(legacyFontSizePx('heading', 'desktop', 400)).toBeCloseTo(153.6, 9)
    expect(legacyFontSizePx('heading', 'tablet', NaN)).toBeUndefined()
    expect(legacyFontSizePx('heading', 'tablet', undefined)).toBeUndefined()
  })
})

describe('(5) CSS string and numeric twin agree', () => {
  it('for every kind, breakpoint, legacy size and own value, at widths 320..2560 (one aggregated assertion)', () => {
    const sizes = [undefined, 8, 18, 56, 100, 153.6, 154, 200, 400]
    const owns = [undefined, 8, 20, 40, 100, 154, 300]
    let worst = 0
    for (const kind of KINDS) {
      for (const bp of BPS) {
        for (const size of sizes) {
          if (size === undefined && kind !== 'button') continue
          for (const own of owns) {
            const inp = input(kind, bp, size, { [FIELD[bp]]: own })
            const css = resolveFreeformFontSizeCss(inp)
            for (let w = 320; w <= 2560; w += 80) worst = Math.max(worst, Math.abs(px(inp, w) - evalCss(css, w)))
          }
        }
      }
    }
    // CSS vw is emitted with 6 decimals, so allow a hair of rounding (< 0.0001px).
    expect(worst).toBeLessThan(1e-4)
  })
})

describe('(6) save path - JSON round trip of the own fields', () => {
  // The Section API stores `content` wholesale (its only server-side check is "plain JSON object"), and the
  // client serialises with JSON.stringify - so this checks the shapes the editor actually produces survive that.
  const own: FontSizeOwnFields = { fontSizeDesktop: 120, fontSizeTablet: 90.5, fontSizeMobile: 36 }

  it('own fields on rows, heading, subheading and buttons survive the round trip and still render identically', async () => {
    const { validateSectionContentFields } = await import('@/lib/section-content-validation')
    const slide = {
      overlay: {
        layoutMode: 'freeform',
        heading: { text: 'H', fontSize: 100, ...own },
        headingRows: [{ text: 'R', fontSize: 150, ...own }],
        subheading: { text: 'S', fontSize: 22, ...own },
        buttons: [{ text: 'B', fontSize: 18, ...own }],
      },
    }
    expect(validateSectionContentFields({ content: { slides: [slide] } })).toBeNull()
    const loaded = JSON.parse(JSON.stringify({ content: { slides: [slide] } })).content.slides[0].overlay
    for (const el of [loaded.heading, loaded.headingRows[0], loaded.subheading, loaded.buttons[0]]) expect(el).toMatchObject(own)
    expect(loaded.headingRows[0].fontSize).toBe(150) // the legacy base is untouched
    const render = (o: { fontSize: number } & FontSizeOwnFields, bp: HeroEditBreakpoint) =>
      resolveFreeformFontSizeCss(input('heading', bp, o.fontSize, { sizeDesktop: o.fontSizeDesktop, sizeTablet: o.fontSizeTablet, sizeMobile: o.fontSizeMobile }))
    for (const bp of BPS) expect(render(loaded.headingRows[0], bp)).toBe(render(slide.overlay.headingRows[0], bp))
  })

  it('a never-touched element serialises with none of the new keys, also after a field-by-field rebuild', () => {
    const untouched = { text: 'R', fontSize: 400, fontWeight: 800, fontFamily: 'inherit', color: '#fff' }
    expect(JSON.stringify(untouched)).not.toMatch(/fontSizeDesktop|fontSizeTablet|fontSizeMobile/)
    expect(pickFontSizeFields(untouched)).toEqual({})
    expect(JSON.stringify({ ...untouched, ...pickFontSizeFields(untouched) })).toBe(JSON.stringify(untouched))
    expect(Object.keys({ ...untouched, ...pickFontSizeFields(untouched) })).toEqual(Object.keys(untouched))
  })

  it('rebuilds that go field-by-field (classic heading -> stacked row, subheading text edit) carry the own fields', () => {
    const el = { text: 'H', fontSize: 100, ...own }
    expect(pickFontSizeFields(el)).toEqual(own)
    const rebuilt = { text: el.text, fontSize: el.fontSize, ...pickFontSizeFields(el) }
    expect(JSON.parse(JSON.stringify(rebuilt))).toMatchObject({ fontSize: 100, ...own })
    expect(Object.keys(pickFontSizeFields({ fontSizeTablet: 50 }))).toEqual(['fontSizeTablet'])
    expect(pickFontSizeFields(undefined)).toEqual({})
  })
})
