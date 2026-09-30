import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  ENTRANCE_OBSERVER_THRESHOLDS,
  createEntranceObserver,
  isEntranceVisible,
  type EntranceEntry,
} from '@/lib/entrance-observer'
import { ENTRANCE_VISIBILITY_THRESHOLD } from '@/lib/animation-constants'

const VIEWPORT_H = 800
const VIEWPORT_W = 400

/** Builds an entry for a target of targetW x targetH with visW x visH of it on screen. */
function entry(
  targetH: number,
  visH: number,
  opts: { targetW?: number; visW?: number; rootH?: number | null; target?: Element } = {},
): EntranceEntry & { target: Element } {
  const targetW = opts.targetW ?? VIEWPORT_W
  const visW = opts.visW ?? targetW
  const area = targetW * targetH
  const visArea = visW * visH
  const rootH = opts.rootH === undefined ? VIEWPORT_H : opts.rootH
  return {
    isIntersecting: visH > 0 || targetH === 0,
    intersectionRatio: area === 0 ? 1 : visArea / area,
    intersectionRect: { height: visH, width: visW } as DOMRectReadOnly,
    boundingClientRect: { height: targetH, width: targetW } as DOMRectReadOnly,
    rootBounds: rootH === null ? null : ({ height: rootH, width: VIEWPORT_W } as DOMRectReadOnly),
    target: opts.target ?? ({} as Element),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isEntranceVisible: identical to the plain 0.5 threshold for ordinary targets', () => {
  it('is false when not intersecting', () => {
    expect(isEntranceVisible(entry(100, 0))).toBe(false)
  })

  it('crosses exactly at half of a target no taller than the viewport', () => {
    expect(isEntranceVisible(entry(100, 49))).toBe(false)
    expect(isEntranceVisible(entry(100, 50))).toBe(true)
    expect(isEntranceVisible(entry(VIEWPORT_H, 399))).toBe(false)
    expect(isEntranceVisible(entry(VIEWPORT_H, 400))).toBe(true)
  })

  it('matches ratio >= 0.5 across a sweep of unclipped targets up to one viewport tall', () => {
    for (let h = 10; h <= VIEWPORT_H; h += 10) {
      for (let v = 0; v <= h; v += 5) {
        const e = entry(h, v)
        expect(isEntranceVisible(e)).toBe(e.isIntersecting && e.intersectionRatio >= ENTRANCE_VISIBILITY_THRESHOLD)
      }
    }
  })

  it('is never later than the plain threshold: ratio >= 0.5 always counts as visible', () => {
    for (const h of [50, 400, 800, 1200, 2400, 8000]) {
      for (const w of [100, 400, 900]) {
        for (let v = 0; v <= Math.min(h, VIEWPORT_H); v += 25) {
          for (const vw of [w * 0.5, w]) {
            const e = entry(h, v, { targetW: w, visW: vw })
            if (e.isIntersecting && e.intersectionRatio >= ENTRANCE_VISIBILITY_THRESHOLD) {
              expect(isEntranceVisible(e)).toBe(true)
            }
          }
        }
      }
    }
  })

  it('treats an intersecting zero-height target as visible (spec reports ratio 1)', () => {
    expect(isEntranceVisible(entry(0, 0))).toBe(true)
  })
})

describe('isEntranceVisible: targets the plain 0.5 threshold could never fire for', () => {
  it('a 3-screen section (multi/dynamic/phone natural-height) fires once half the viewport is covered', () => {
    const h = VIEWPORT_H * 3
    // Fully covering the viewport is only ratio 0.333, so the plain 0.5 threshold never fires.
    expect(entry(h, VIEWPORT_H).intersectionRatio).toBeLessThan(ENTRANCE_VISIBILITY_THRESHOLD)
    expect(isEntranceVisible(entry(h, VIEWPORT_H))).toBe(true)
    expect(isEntranceVisible(entry(h, VIEWPORT_H / 2))).toBe(true)
    expect(isEntranceVisible(entry(h, VIEWPORT_H / 2 - 1))).toBe(false)
  })

  it('a target clipped sideways to 40% fires once half of its height is on screen', () => {
    expect(isEntranceVisible(entry(200, 200, { targetW: 1000, visW: 400 }))).toBe(true)
    expect(isEntranceVisible(entry(200, 100, { targetW: 1000, visW: 400 }))).toBe(true)
    expect(isEntranceVisible(entry(200, 99, { targetW: 1000, visW: 400 }))).toBe(false)
  })

  it('falls back to window.innerHeight when rootBounds is null', () => {
    vi.stubGlobal('window', { innerHeight: VIEWPORT_H })
    expect(isEntranceVisible(entry(VIEWPORT_H * 3, VIEWPORT_H, { rootH: null }))).toBe(true)
  })

  it('without rootBounds or window, degrades to half of the target height', () => {
    expect(typeof window).toBe('undefined')
    expect(isEntranceVisible(entry(VIEWPORT_H * 3, VIEWPORT_H, { rootH: null }))).toBe(false)
    expect(isEntranceVisible(entry(VIEWPORT_H * 3, VIEWPORT_H * 1.5, { rootH: null }))).toBe(true)
  })
})

describe('ENTRANCE_OBSERVER_THRESHOLDS', () => {
  it('is ascending, within [0, 1], starts at 0 and ends at the shared 0.5 threshold', () => {
    const t = [...ENTRANCE_OBSERVER_THRESHOLDS]
    expect(t[0]).toBe(0)
    expect(t[t.length - 1]).toBe(ENTRANCE_VISIBILITY_THRESHOLD)
    expect([...t].sort((a, b) => a - b)).toEqual(t)
    t.forEach((v) => expect(v >= 0 && v <= 1).toBe(true))
  })

  it('reaches a step soon after a 3-screen section covers half the viewport', () => {
    const needed = ENTRANCE_VISIBILITY_THRESHOLD / 3
    const next = ENTRANCE_OBSERVER_THRESHOLDS.find((v) => v >= needed) as number
    expect(next * 3 * VIEWPORT_H).toBeLessThanOrEqual(VIEWPORT_H * 0.65)
  })
})

describe('createEntranceObserver: forwards only first observations and visibility flips', () => {
  class FakeIO {
    static last: FakeIO | null = null
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: number[]
    constructor(public cb: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
      this.thresholds = (options?.threshold as number[]) ?? []
      FakeIO.last = this
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
    fire(entries: Array<EntranceEntry & { target: Element }>) {
      this.cb(entries as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
    }
  }

  function setup() {
    vi.stubGlobal('IntersectionObserver', FakeIO)
    const calls: boolean[][] = []
    createEntranceObserver((entries) => {
      calls.push(entries.map((e) => isEntranceVisible(e)))
    })
    return { io: FakeIO.last as FakeIO, calls }
  }

  it('creates the observer with the shared threshold steps', () => {
    const { io } = setup()
    expect(io.thresholds).toEqual([...ENTRANCE_OBSERVER_THRESHOLDS])
  })

  it('forwards the first observation even when not visible (MotionElementRenderer initial exit path)', () => {
    const { io, calls } = setup()
    const target = {} as Element
    io.fire([entry(800, 0, { target })])
    expect(calls).toEqual([[false]])
  })

  it('suppresses repeat steps with unchanged visibility and forwards each flip once', () => {
    const { io, calls } = setup()
    const target = {} as Element
    // Ordinary 100vh section snapping in (0, 10, 30, 50, 80, 100 percent) then back out to 40 percent.
    for (const v of [0, 80, 240, 400, 640, 800, 320]) io.fire([entry(800, v, { target })])
    expect(calls).toEqual([[false], [true], [false]])
  })

  it('fires for a 3-screen section that the plain 0.5 threshold never would', () => {
    const { io, calls } = setup()
    const target = {} as Element
    const h = VIEWPORT_H * 3
    for (const ratio of [0, 0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 1 / 3]) {
      io.fire([entry(h, ratio * h, { target })])
    }
    expect(calls).toEqual([[false], [true]])
  })

  it('tracks each observed target independently and forwards only the changed entries', () => {
    const { io, calls } = setup()
    const a = {} as Element
    const b = {} as Element
    io.fire([entry(100, 0, { target: a }), entry(100, 0, { target: b })])
    io.fire([entry(100, 60, { target: a }), entry(100, 10, { target: b })])
    expect(calls).toEqual([[false, false], [true]])
  })
})
