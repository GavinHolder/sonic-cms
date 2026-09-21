/**
 * Breakpoint SEED semantics (independent-breakpoints end state).
 *
 * Product decision (permanent): a Tablet/Mobile variant is seeded ONCE as a
 * scale+clamp proportional copy of Desktop and is independent afterwards. There is
 * no ambient/automatic cross-breakpoint reconcile. The ONLY re-sync mechanism is the
 * manual per-block "Reset Size/Position to Match Desktop" button, which calls
 * scaleBlockToCanvas() — the same function the seed uses.
 *
 * These tests pin: the seed math, seed == reset math, purity (no input mutation), and
 * — by scanning the consumer sources — that no other code path calls a reconcile.
 */
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

const require = createRequire(import.meta.url)
const root = path.resolve(__dirname, '../../..')
const R = require(path.join(root, 'public/flexible-breakpoint-rules.js'))
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const desktop = () => ({
  positionMode: 'free', designerCanvasW: 1440, designerCanvasH: 900,
  blocks: [
    { id: 1, type: 'text', x: 720, y: 450, w: 720, h: 300, props: { paddingX: 20 },
      subElements: [{ id: 'se-1', type: 'heading', x: 100, y: 40, w: 400, h: 80 }, { id: 'se-2', type: 'paragraph', x: 0, y: 140, w: 600, h: 60 }] },
    { id: 2, type: 'volt', x: 0, y: 0, w: 1440, h: 900, props: { voltId: 'v' } },
    { id: 3, type: 'hero', x: 1300, y: 850, w: 500, h: 400 }, // starts partly off Desktop's own canvas
  ],
})
const seedInput = (d: any, key: 'tablet' | 'mobile') => ({ desktop: d, [key]: { designerCanvasW: R.variantCanvasDims(null, key).w, designerCanvasH: 900 } })
const seed = (d: any, key: 'tablet' | 'mobile') => R.reconcileVariantBlocks([], seedInput(d, key), key)
const snap = (o: any) => JSON.parse(JSON.stringify(o))

describe('one-time seed = reconcileVariantBlocks([], ...)', () => {
  it('scales x/y/w/h by dstW/srcW (mobile 375/1440) and keeps every block, in Desktop order', () => {
    const d = desktop()
    const out = seed(d, 'mobile')
    expect(out.map((b: any) => b.id)).toEqual([1, 2, 3])
    const r = 375 / 1440
    const w0 = Math.round(720 * r) // 188; x is clamped so the block stays inside the 375px canvas
    expect(out[0]).toMatchObject({ x: Math.min(Math.round(720 * r), 375 - w0), y: Math.round(450 * r), w: w0, h: Math.round(300 * r) })
    expect(out[1]).toMatchObject({ x: 0, y: 0, w: 375, h: Math.min(Math.round(900 * r), 900) })
  })
  it('scales sub-elements by the same ratio', () => {
    const out = seed(desktop(), 'tablet')
    const r = 768 / 1440
    expect(out[0].subElements[0]).toMatchObject({ id: 'se-1', x: Math.round(100 * r), y: Math.round(40 * r), w: Math.round(400 * r), h: Math.round(80 * r) })
  })
  it('clamps every block fully inside the destination canvas', () => {
    for (const key of ['tablet', 'mobile'] as const) {
      const box = R.variantCanvasDims(null, key)
      for (const b of seed(desktop(), key)) {
        expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0)
        expect(b.x + b.w).toBeLessThanOrEqual(box.w); expect(b.y + b.h).toBeLessThanOrEqual(900)
      }
    }
  })
  it('never mutates Desktop and shares no references with it', () => {
    const d = desktop(); const before = snap(d)
    const out = seed(d, 'mobile')
    expect(d).toEqual(before)
    expect(out[0]).not.toBe(d.blocks[0]); expect(out[0].subElements).not.toBe(d.blocks[0].subElements)
    expect(out[0].subElements[0]).not.toBe(d.blocks[0].subElements[0])
  })
  it('handles PERSISTED-shape blocks ({pixelPos}) and keeps that shape', () => {
    const d: any = { designerCanvasW: 1440, designerCanvasH: 900, blocks: [{ id: 9, type: 'text', pixelPos: { x: 144, y: 90, w: 720, h: 200 } }] }
    const out = seed(d, 'tablet')
    expect(out[0].x).toBeUndefined()
    const r = 768 / 1440
    expect(out[0].pixelPos).toEqual({ x: Math.round(144 * r), y: Math.round(90 * r), w: Math.round(720 * r), h: Math.round(200 * r) })
  })
  it('tolerates empty / garbage input without throwing', () => {
    expect(R.reconcileVariantBlocks([], { desktop: null }, 'tablet')).toEqual([])
    expect(R.reconcileVariantBlocks(null, {}, 'mobile')).toEqual([])
    const d: any = { blocks: [null, 5, { id: 1 }, { noId: true }, { id: 2, x: NaN, y: -5, w: 0, h: -1 }] }
    const out = R.reconcileVariantBlocks([], { desktop: d }, 'mobile')
    expect(out.map((b: any) => b.id)).toEqual([1, 2])
    for (const b of out) { expect(b.w).toBeGreaterThan(0); expect(b.h).toBeGreaterThan(0); expect(b.x).toBeGreaterThanOrEqual(0) }
  })
})

describe('scaleBlockToCanvas === the seed path (the manual reset uses the same math)', () => {
  it.each(['tablet', 'mobile'] as const)('per block, %s', (key) => {
    const d = desktop(); const dst = R.variantCanvasDims(null, key)
    const seeded = seed(d, key)
    d.blocks.forEach((b: any, i: number) => {
      expect(R.scaleBlockToCanvas(b, { w: d.designerCanvasW }, dst)).toEqual(seeded[i])
    })
  })
  it('does not mutate the source block, returns a new object', () => {
    const b = desktop().blocks[0]; const before = snap(b)
    const out = R.scaleBlockToCanvas(b, { w: 1440 }, { w: 375, h: 900 })
    expect(b).toEqual(before); expect(out).not.toBe(b)
  })
  it('reset result depends ONLY on the Desktop block + dims (stale Tablet geometry cannot leak in)', () => {
    const d = desktop()
    const reset1 = R.scaleBlockToCanvas(d.blocks[1], { w: 1440 }, { w: 768, h: 900 })
    const stale = { ...d.blocks[1], x: 5, y: 5, w: 760, h: 890 } // badly proportioned Tablet copy
    expect(R.scaleBlockToCanvas(d.blocks[1], { w: 1440 }, { w: 768, h: 900 })).toEqual(reset1)
    expect(stale.w).not.toBe(reset1.w)
  })
  it('missing/zero source width falls back to ratio 1 (no NaN)', () => {
    const out = R.scaleBlockToCanvas({ id: 1, x: 10, y: 10, w: 100, h: 50 }, { w: 0 }, { w: 375, h: 900 })
    expect(out).toMatchObject({ x: 10, y: 10, w: 100, h: 50 })
    expect(Object.values(out).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true)
  })
})

describe('purity of the remaining exports', () => {
  it('reconcileVariantBlocks never mutates its inputs and keeps already-present blocks (same reference when nothing is missing)', () => {
    const d = desktop()
    const tabletBlocks = seed(d, 'tablet')
    const vars = { desktop: d, tablet: { designerCanvasW: 768, designerCanvasH: 900, blocks: tabletBlocks } }
    const before = snap(vars)
    const out = R.reconcileVariantBlocks(tabletBlocks, vars, 'tablet')
    expect(vars).toEqual(before)
    tabletBlocks.forEach((b: any, i: number) => expect(out[i]).toBe(b))
  })
  it('removeBlockId / clampBlocksToCanvas return new arrays and leave inputs alone', () => {
    const blocks = [{ id: 1, x: 0, y: 0, w: 10, h: 10 }, { id: 2, x: 900, y: 900, w: 50, h: 50 }]
    const before = snap(blocks)
    expect(R.removeBlockId(blocks, 1)).toEqual([blocks[1]])
    R.clampBlocksToCanvas(blocks, 375, 600)
    expect(blocks).toEqual(before)
  })
})

describe('#208 guard: no ambient cross-breakpoint reconcile anywhere in the consumers', () => {
  const designer = read('public/flexible-designer.html')
  const renderer = read('components/sections/FlexibleSectionRenderer.tsx')
  const modal = read('components/admin/FlexibleSectionEditorModal.tsx')
  // Counts call-like occurrences on CODE lines only (comment lines are documentation).
  const calls = (src: string, name: string) =>
    src
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .reduce((n, l) => n + (l.match(new RegExp(name + '\\s*\\(', 'g')) || []).length, 0)

  it('reconcileVariantBlocks( has exactly ONE caller: the one-time seed in setDevicePreview', () => {
    expect(calls(designer, 'FlexibleBreakpointRules\\.reconcileVariantBlocks')).toBe(1)
    const idx = designer.indexOf('FlexibleBreakpointRules.reconcileVariantBlocks(')
    const seedStart = designer.lastIndexOf('if (!state.variants[device])', idx)
    expect(seedStart).toBeGreaterThan(-1)
    expect(idx - seedStart).toBeLessThan(6000)
    expect(renderer).not.toMatch(/reconcileVariantBlocks/)
    expect(modal).not.toMatch(/reconcileVariantBlocks/)
  })
  it('the removed helpers are not called anywhere', () => {
    for (const src of [designer, renderer, modal]) {
      expect(calls(src, '[.\\s]reconcileNonActiveVariant')).toBe(0)
      expect(calls(src, '[.\\s]blocksChanged')).toBe(0)
    }
    expect(R.blocksChanged).toBeUndefined()
  })
  it('the live renderer uses the stored variant as-is (effectiveDesignerData is a plain alias)', () => {
    expect(renderer).toMatch(/const effectiveDesignerData = pickedDesignerData;/)
  })
  it('the manual reset button is the only other caller of the shared scale function', () => {
    expect(calls(designer, 'FlexibleBreakpointRules\\.scaleBlockToCanvas')).toBe(1)
    expect(designer).toContain('resetBlockToDesktopProportional')
  })
})
