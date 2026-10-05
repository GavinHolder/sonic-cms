import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  fitDeviceViewport,
  fitDevice,
  fitForBreakpoint,
  deviceViewportFor,
  isDeviceFitBreakpoint,
  MOBILE_VIEWPORT,
  TABLET_VIEWPORT,
  DEVICE_FIT_CHROME_PX,
  DEVICE_FIT_MIN_AVAILABLE_H,
} from '@/lib/hero/hero-device-fit'

const base = { viewportW: 375, viewportH: 812 }
const tablet = { viewportW: 768, viewportH: 1024 }

describe('device constants', () => {
  it('are the real reference sizes, exported from the one module', () => {
    expect(MOBILE_VIEWPORT).toEqual({ w: 375, h: 812 })
    expect(TABLET_VIEWPORT).toEqual({ w: 768, h: 1024 })
  })

  it('deviceViewportFor maps breakpoints to those exact constants (null for desktop)', () => {
    expect(deviceViewportFor('mobile')).toBe(MOBILE_VIEWPORT)
    expect(deviceViewportFor('tablet')).toBe(TABLET_VIEWPORT)
    expect(deviceViewportFor('desktop')).toBeNull()
  })

  it('isDeviceFitBreakpoint is true for mobile + tablet only', () => {
    expect(isDeviceFitBreakpoint('mobile')).toBe(true)
    expect(isDeviceFitBreakpoint('tablet')).toBe(true)
    expect(isDeviceFitBreakpoint('desktop')).toBe(false)
  })

  it('the fit helper boxes the exported constants (never exceeding them)', () => {
    const m = fitForBreakpoint('mobile', 5000, 5000)!
    expect(m.width).toBe(MOBILE_VIEWPORT.w)
    expect(m.height).toBe(MOBILE_VIEWPORT.h)
    const t = fitForBreakpoint('tablet', 5000, 5000)!
    expect(t.width).toBe(TABLET_VIEWPORT.w)
    expect(t.height).toBe(TABLET_VIEWPORT.h)
  })

  it('the editor surfaces import the constants instead of keeping their own copies', () => {
    const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf8')
    for (const file of ['components/admin/HeroCarouselEditor.tsx', 'components/admin/SlideEditor.tsx']) {
      const src = read(file)
      expect(src).toContain('@/lib/hero/hero-device-fit')
      expect(src).not.toMatch(/w:\s*768,\s*h:\s*1024/)
      expect(src).not.toMatch(/w:\s*375,\s*h:\s*812/)
      expect(src).not.toMatch(/TABLET_V[WH]\s*=|MOBILE_V[WH]\s*=/)
    }
  })
})

describe('fitDeviceViewport (mobile 375x812)', () => {
  it('height-limited: tall budget is the binding constraint, aspect ratio preserved', () => {
    const f = fitDeviceViewport({ ...base, availableW: 900, availableH: 600 })
    expect(f.scale).toBeCloseTo(600 / 812, 6)
    expect(f.width).toBeCloseTo(375 * (600 / 812), 6)
    expect(f.height).toBeCloseTo(600, 6)
    expect(f.width / f.height).toBeCloseTo(375 / 812, 6)
  })

  it('width-limited: narrow column is the binding constraint', () => {
    const f = fitDeviceViewport({ ...base, availableW: 250, availableH: 2000 })
    expect(f.scale).toBeCloseTo(250 / 375, 6)
    expect(f.width).toBeCloseTo(250, 6)
    expect(f.height).toBeCloseTo(812 * (250 / 375), 6)
  })

  it('never scales above 1, even with a huge column and budget', () => {
    const f = fitDeviceViewport({ ...base, availableW: 5000, availableH: 5000 })
    expect(f.scale).toBe(1)
    expect(f.width).toBe(375)
    expect(f.height).toBe(812)
  })

  it('tiny availableH is clamped up to minH (default and custom)', () => {
    const d = fitDeviceViewport({ ...base, availableW: 900, availableH: 50 })
    expect(d.scale).toBeCloseTo(DEVICE_FIT_MIN_AVAILABLE_H / 812, 6)
    expect(d.height).toBeCloseTo(DEVICE_FIT_MIN_AVAILABLE_H, 6)

    const c = fitDeviceViewport({ ...base, availableW: 900, availableH: -300, minH: 500 })
    expect(c.height).toBeCloseTo(500, 6)
  })

  it('availableW <= 0 or NaN falls back to unconstrained width (height budget decides)', () => {
    const expected = 600 / 812
    for (const w of [0, -10, NaN, Infinity]) {
      const f = fitDeviceViewport({ ...base, availableW: w, availableH: 600 })
      expect(f.scale).toBeCloseTo(expected, 6)
      expect(Number.isFinite(f.width)).toBe(true)
    }
  })

  it('NaN availableH falls back to minH rather than producing NaN', () => {
    const f = fitDeviceViewport({ ...base, availableW: 900, availableH: NaN })
    expect(f.scale).toBeCloseTo(DEVICE_FIT_MIN_AVAILABLE_H / 812, 6)
  })

  it('scale is always within (0, 1]', () => {
    for (const aw of [1, 50, 375, 692, 4000]) {
      for (const ah of [0, 300, 700, 3000]) {
        const f = fitDeviceViewport({ ...base, availableW: aw, availableH: ah })
        expect(f.scale).toBeGreaterThan(0)
        expect(f.scale).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('fitDeviceViewport (tablet 768x1024)', () => {
  it('width-limited: a ~450px column decides, aspect ratio preserved', () => {
    const f = fitDeviceViewport({ ...tablet, availableW: 450, availableH: 2000 })
    expect(f.scale).toBeCloseTo(450 / 768, 6)
    expect(f.width).toBeCloseTo(450, 6)
    expect(f.height).toBeCloseTo(1024 * (450 / 768), 6)
    expect(f.width / f.height).toBeCloseTo(768 / 1024, 6)
  })

  it('height-limited: wide column, the height budget decides', () => {
    const f = fitDeviceViewport({ ...tablet, availableW: 2000, availableH: 600 })
    expect(f.scale).toBeCloseTo(600 / 1024, 6)
    expect(f.height).toBeCloseTo(600, 6)
    expect(f.width).toBeCloseTo(768 * (600 / 1024), 6)
  })

  it('min clamp: tiny availableH is floored to 420', () => {
    const f = fitDeviceViewport({ ...tablet, availableW: 2000, availableH: 10 })
    expect(f.scale).toBeCloseTo(420 / 1024, 6)
    expect(f.height).toBeCloseTo(420, 6)
  })

  it('never scales above 1, even with a huge column and budget', () => {
    const f = fitDeviceViewport({ ...tablet, availableW: 100000, availableH: 100000 })
    expect(f.scale).toBe(1)
    expect(f.width).toBe(768)
    expect(f.height).toBe(1024)
  })

  it('scale is always within (0, 1]', () => {
    for (const aw of [1, 50, 450, 768, 5000]) {
      for (const ah of [0, 300, 700, 3000]) {
        const f = fitDeviceViewport({ ...tablet, availableW: aw, availableH: ah })
        expect(f.scale).toBeGreaterThan(0)
        expect(f.scale).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('fitDevice / fitForBreakpoint', () => {
  it('mobile: uses windowInnerHeight minus the chrome budget against the 375x812 phone', () => {
    const f = fitForBreakpoint('mobile', 900, 900)!
    const budget = 900 - DEVICE_FIT_CHROME_PX
    expect(f.scale).toBeCloseTo(budget / 812, 6)
    expect(f.height).toBeCloseTo(budget, 6)
  })

  it('tablet: height-limited at a 783px window -> budget 523 -> scale 0.5107', () => {
    const f = fitForBreakpoint('tablet', 900, 783)!
    expect(DEVICE_FIT_CHROME_PX).toBe(260)
    expect(f.scale).toBeCloseTo(523 / 1024, 6)
    expect(f.scale).toBeCloseTo(0.5107, 4)
    expect(f.height).toBeCloseTo(523, 6)
    expect(f.width).toBeCloseTo(768 * (523 / 1024), 6)
  })

  it('tablet: width-limited when the column is narrower than the height budget implies', () => {
    const f = fitForBreakpoint('tablet', 400, 1200)!
    expect(f.scale).toBeCloseTo(400 / 768, 6)
    expect(f.width).toBeCloseTo(400, 6)
  })

  it('tablet: short window is clamped to the 420 budget', () => {
    const f = fitForBreakpoint('tablet', 2000, 300)!
    expect(f.scale).toBeCloseTo(420 / 1024, 6)
    expect(f.height).toBeCloseTo(420, 6)
  })

  it('tablet: never above 1 with a huge column and window', () => {
    const f = fitForBreakpoint('tablet', 99999, 99999)!
    expect(f.scale).toBe(1)
  })

  it('desktop returns null so callers keep their existing Desktop path', () => {
    expect(fitForBreakpoint('desktop', 900, 900)).toBeNull()
  })

  it('matches fitDeviceViewport for the same inputs (single shared rule)', () => {
    const a = fitForBreakpoint('mobile', 300, 1000)
    const b = fitDeviceViewport({ viewportW: 375, viewportH: 812, availableW: 300, availableH: 1000 - DEVICE_FIT_CHROME_PX })
    expect(a).toEqual(b)
    const c = fitDevice(TABLET_VIEWPORT, 300, 1000)
    const d = fitDeviceViewport({ viewportW: 768, viewportH: 1024, availableW: 300, availableH: 1000 - DEVICE_FIT_CHROME_PX })
    expect(c).toEqual(d)
    expect(fitForBreakpoint('tablet', 300, 1000)).toEqual(d)
  })

  it('NaN window height still yields a sane box for both devices', () => {
    const m = fitForBreakpoint('mobile', 900, NaN)!
    expect(m.scale).toBeCloseTo(DEVICE_FIT_MIN_AVAILABLE_H / 812, 6)
    const t = fitForBreakpoint('tablet', 900, NaN)!
    expect(t.scale).toBeCloseTo(DEVICE_FIT_MIN_AVAILABLE_H / 1024, 6)
  })
})
