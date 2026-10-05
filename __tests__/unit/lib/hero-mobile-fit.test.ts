import { describe, it, expect } from 'vitest'
import {
  fitPhoneViewport,
  fitMobilePhone,
  MOBILE_FIT_CHROME_PX,
  MOBILE_FIT_MIN_AVAILABLE_H,
} from '@/lib/hero/hero-mobile-fit'

const base = { viewportW: 375, viewportH: 812 }

describe('fitPhoneViewport', () => {
  it('height-limited: tall budget is the binding constraint, aspect ratio preserved', () => {
    const f = fitPhoneViewport({ ...base, availableW: 900, availableH: 600 })
    expect(f.scale).toBeCloseTo(600 / 812, 6)
    expect(f.width).toBeCloseTo(375 * (600 / 812), 6)
    expect(f.height).toBeCloseTo(600, 6)
    expect(f.width / f.height).toBeCloseTo(375 / 812, 6)
  })

  it('width-limited: narrow column is the binding constraint', () => {
    const f = fitPhoneViewport({ ...base, availableW: 250, availableH: 2000 })
    expect(f.scale).toBeCloseTo(250 / 375, 6)
    expect(f.width).toBeCloseTo(250, 6)
    expect(f.height).toBeCloseTo(812 * (250 / 375), 6)
  })

  it('never scales above 1, even with a huge column and budget', () => {
    const f = fitPhoneViewport({ ...base, availableW: 5000, availableH: 5000 })
    expect(f.scale).toBe(1)
    expect(f.width).toBe(375)
    expect(f.height).toBe(812)
  })

  it('tiny availableH is clamped up to minH (default and custom)', () => {
    const d = fitPhoneViewport({ ...base, availableW: 900, availableH: 50 })
    expect(d.scale).toBeCloseTo(MOBILE_FIT_MIN_AVAILABLE_H / 812, 6)
    expect(d.height).toBeCloseTo(MOBILE_FIT_MIN_AVAILABLE_H, 6)

    const c = fitPhoneViewport({ ...base, availableW: 900, availableH: -300, minH: 500 })
    expect(c.height).toBeCloseTo(500, 6)
  })

  it('availableW <= 0 or NaN falls back to unconstrained width (height budget decides)', () => {
    const expected = 600 / 812
    for (const w of [0, -10, NaN, Infinity]) {
      const f = fitPhoneViewport({ ...base, availableW: w, availableH: 600 })
      expect(f.scale).toBeCloseTo(expected, 6)
      expect(Number.isFinite(f.width)).toBe(true)
    }
  })

  it('NaN availableH falls back to minH rather than producing NaN', () => {
    const f = fitPhoneViewport({ ...base, availableW: 900, availableH: NaN })
    expect(f.scale).toBeCloseTo(MOBILE_FIT_MIN_AVAILABLE_H / 812, 6)
  })

  it('scale is always within (0, 1]', () => {
    for (const aw of [1, 50, 375, 692, 4000]) {
      for (const ah of [0, 300, 700, 3000]) {
        const f = fitPhoneViewport({ ...base, availableW: aw, availableH: ah })
        expect(f.scale).toBeGreaterThan(0)
        expect(f.scale).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('fitMobilePhone', () => {
  it('uses windowInnerHeight minus the chrome budget against the 375x812 phone', () => {
    const f = fitMobilePhone(900, 900)
    const budget = 900 - MOBILE_FIT_CHROME_PX
    expect(f.scale).toBeCloseTo(budget / 812, 6)
    expect(f.height).toBeCloseTo(budget, 6)
  })

  it('matches fitPhoneViewport for the same inputs (single shared rule)', () => {
    const a = fitMobilePhone(300, 1000)
    const b = fitPhoneViewport({ viewportW: 375, viewportH: 812, availableW: 300, availableH: 1000 - MOBILE_FIT_CHROME_PX })
    expect(a).toEqual(b)
  })

  it('NaN window height still yields a sane box', () => {
    const f = fitMobilePhone(900, NaN)
    expect(f.scale).toBeCloseTo(MOBILE_FIT_MIN_AVAILABLE_H / 812, 6)
  })
})
