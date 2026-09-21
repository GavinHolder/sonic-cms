/**
 * Unit tests for public/flexible-render-rules.js — pure rules shared by the Designer
 * canvas and the live renderer (one source of truth per concern).
 */
import { createRequire } from 'module'
import path from 'path'
import { describe, it, expect } from 'vitest'

const require = createRequire(import.meta.url)
const RR = require(path.resolve(__dirname, '../../../public/flexible-render-rules.js'))

describe('resolveBgPositionCss', () => {
  it('formats 0-100 pairs as CSS percentages and clamps out-of-range values', () => {
    expect(RR.resolveBgPositionCss(22, 39)).toBe('22% 39%')
    expect(RR.resolveBgPositionCss(-10, 250)).toBe('0% 100%')
  })
  it.each([[null, 5], [5, null], [undefined, undefined], [NaN, 1], ['x', 1]])('%s,%s -> center', (x, y) => {
    expect(RR.resolveBgPositionCss(x, y)).toBe('center')
  })
})

describe('resolveBackgroundPosForBreakpoint (per-breakpoint section background, #209)', () => {
  const bp = { desktop: { x: 22, y: 39 }, tablet: { x: 60, y: 10 }, mobile: null }
  it('a breakpoint own override wins', () => {
    expect(RR.resolveBackgroundPosForBreakpoint(bp, 'tablet', 1, 2)).toEqual({ x: 60, y: 10 })
    expect(RR.resolveBackgroundPosForBreakpoint(bp, 'desktop', 1, 2)).toEqual({ x: 22, y: 39 })
  })
  it('tablet/mobile without an override inherit Desktop own override', () => {
    expect(RR.resolveBackgroundPosForBreakpoint(bp, 'mobile', 1, 2)).toEqual({ x: 22, y: 39 })
    expect(RR.resolveBackgroundPosForBreakpoint({ desktop: { x: 5, y: 6 }, tablet: null, mobile: null }, 'tablet', null, null)).toEqual({ x: 5, y: 6 })
  })
  it('desktop never inherits from tablet/mobile', () => {
    expect(RR.resolveBackgroundPosForBreakpoint({ desktop: null, tablet: { x: 1, y: 1 }, mobile: { x: 2, y: 2 } }, 'desktop', null, null)).toEqual({ x: null, y: null })
  })
  it('legacy flat pair applies to every breakpoint when no backgroundPos exists (pre-#209 sections unchanged)', () => {
    for (const b of ['desktop', 'tablet', 'mobile']) {
      expect(RR.resolveBackgroundPosForBreakpoint(undefined, b, 30, 70)).toEqual({ x: 30, y: 70 })
    }
  })
  it('nothing set -> null pair (renders center); invalid points are ignored', () => {
    expect(RR.resolveBackgroundPosForBreakpoint(null, 'mobile', null, null)).toEqual({ x: null, y: null })
    expect(RR.resolveBackgroundPosForBreakpoint({ desktop: { x: NaN, y: 1 } }, 'desktop', 3, 4)).toEqual({ x: 3, y: 4 })
  })
})

describe('eyebrow sub-element rule (#199) — previously rendered nothing on the live page', () => {
  it('has designer-parity defaults', () => {
    expect(RR.computeSubElementStyle('eyebrow', {}, {})).toMatchObject({
      fontSize: '13px', fontWeight: '700', color: '#0d6efd', textAlign: 'left',
      textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.4,
    })
  })
  it('honours explicit props', () => {
    expect(RR.computeSubElementStyle('eyebrow', { color: '#111', letterSpacing: 4, fontSize: 16 }, {})).toMatchObject({ color: '#111', letterSpacing: '4px', fontSize: '16px' })
  })
  it('unknown types produce an empty style object (no throw)', () => {
    expect(RR.computeSubElementStyle('nope', {}, {})).toEqual({})
  })
})
