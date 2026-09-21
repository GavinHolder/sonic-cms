/**
 * Unit tests for public/flexible-breakpoint-rules.js — the shared per-breakpoint
 * variant resolution module consumed by BOTH the Flexible Designer (plain
 * <script>) and FlexibleSectionRenderer / FlexibleSectionEditorModal (ES import).
 *
 * Invariants asserted here:
 *  - a legacy flat designerData blob is read as desktop-only (no migration)
 *  - breakpoint boundaries match the live renderer (>=992 desktop, >=768 tablet)
 *  - pickActiveVariant falls back to Desktop when a breakpoint has no variant
 *  - seed helpers never mutate their inputs
 */
import { createRequire } from 'module'
import path from 'path'
import { describe, it, expect } from 'vitest'

const require = createRequire(import.meta.url)
const R = require(path.resolve(__dirname, '../../../public/flexible-breakpoint-rules.js'))

const flat = () => ({ positionMode: 'free', blocks: [{ id: 1, x: 10, y: 10, w: 100, h: 50 }] })

describe('resolveVariants', () => {
  it('reads a legacy flat blob as desktop-only', () => {
    const d = flat()
    expect(R.resolveVariants(d)).toEqual({ desktop: d, tablet: null, mobile: null })
  })
  it('parses a JSON string', () => {
    expect(R.resolveVariants(JSON.stringify(flat())).desktop).toEqual(flat())
  })
  it('passes a per-breakpoint envelope through', () => {
    const env = { variant: 'per-breakpoint', desktop: flat(), tablet: { positionMode: 'free', blocks: [] }, mobile: null }
    const r = R.resolveVariants(env)
    expect(r.desktop).toEqual(flat())
    expect(r.tablet).toEqual({ positionMode: 'free', blocks: [] })
    expect(r.mobile).toBeNull()
  })
  it('never throws on null / malformed / non-object input', () => {
    const empty = { desktop: null, tablet: null, mobile: null }
    expect(R.resolveVariants(null)).toEqual(empty)
    expect(R.resolveVariants(undefined)).toEqual(empty)
    expect(R.resolveVariants('{not json')).toEqual(empty)
    expect(R.resolveVariants(42)).toEqual(empty)
  })
})

describe('pickBreakpointForWidth', () => {
  it.each([
    [1920, 'desktop'], [992, 'desktop'], [991, 'tablet'], [768, 'tablet'],
    [767, 'mobile'], [375, 'mobile'], [0, 'mobile'], [NaN, 'mobile'], [undefined, 'mobile'],
  ])('width %s -> %s', (w, bp) => {
    expect(R.pickBreakpointForWidth(w)).toBe(bp)
  })
})

describe('pickActiveVariant', () => {
  const r = { desktop: { id: 'D' }, tablet: { id: 'T' }, mobile: null }
  it('returns the breakpoint own variant when present', () => {
    expect(R.pickActiveVariant(r, 'tablet')).toEqual({ data: { id: 'T' }, isFallback: false })
    expect(R.pickActiveVariant(r, 'desktop')).toEqual({ data: { id: 'D' }, isFallback: false })
  })
  it('falls back to Desktop (isFallback) when the breakpoint has no variant', () => {
    expect(R.pickActiveVariant(r, 'mobile')).toEqual({ data: { id: 'D' }, isFallback: true })
  })
  it('tolerates an empty resolved object', () => {
    expect(R.pickActiveVariant(null, 'mobile')).toEqual({ data: null, isFallback: true })
  })
})

describe('duplicateVariant', () => {
  it('deep-clones (no shared references)', () => {
    const src = flat()
    const copy = R.duplicateVariant(src)
    expect(copy).toEqual(src)
    expect(copy.blocks).not.toBe(src.blocks)
    expect(copy.blocks[0]).not.toBe(src.blocks[0])
  })
  it('returns null for null', () => { expect(R.duplicateVariant(null)).toBeNull() })
})

describe('clampBlocksToCanvas (seed-time only)', () => {
  it('shrinks then repositions oversize / off-canvas blocks inside the canvas, without mutating input', () => {
    const blocks = [{ id: 1, x: 900, y: 700, w: 1000, h: 400 }, { id: 2, x: 20, y: 20, w: 100, h: 50 }]
    const snapshot = JSON.parse(JSON.stringify(blocks))
    const out = R.clampBlocksToCanvas(blocks, 375, 600)
    expect(blocks).toEqual(snapshot)
    expect(out[0]).toMatchObject({ x: 0, w: 375, y: 200, h: 400 })
    expect(out[1]).toEqual(blocks[1])
    expect(out[0]).not.toBe(blocks[0])
  })
  it('is a no-op for a non-array or a zero-size canvas', () => {
    expect(R.clampBlocksToCanvas(null, 375, 600)).toBeNull()
    const b = [{ x: 1, y: 1, w: 1, h: 1 }]
    expect(R.clampBlocksToCanvas(b, 0, 0)).toBe(b)
  })
})

describe('serializeVariants', () => {
  it('wraps the three variants in the per-breakpoint envelope', () => {
    const s = R.serializeVariants({ desktop: flat(), tablet: null })
    expect(s).toEqual({ variant: 'per-breakpoint', desktop: flat(), tablet: null, mobile: null })
  })
  it('round-trips through resolveVariants', () => {
    const v = { desktop: flat(), tablet: { positionMode: 'free', blocks: [] }, mobile: null }
    expect(R.resolveVariants(JSON.stringify(R.serializeVariants(v)))).toEqual(v)
  })
})
