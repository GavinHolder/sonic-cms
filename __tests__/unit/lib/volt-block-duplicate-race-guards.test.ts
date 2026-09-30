import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import vm from 'vm'

/**
 * F2 regression tests (2026-09-29 independent review of fix/volt-block-duplicate,
 * "SHIP WITH MINOR FOLLOWUP"): the async _lyEnsureIndependentVoltCopy() helper
 * introduced an await gap inside every block-duplicating entry point
 * (_lyDuplicateBlock, mttDuplicate, pasteBpClipboard's 'blocks' kind). Two
 * things can happen to `state` while that POST /api/volt/<id>/duplicate is in
 * flight, both confirmed reproducible by the reviewer:
 *
 * 1. Breakpoint switch mid-POST (setDevicePreview -> loadFlatVariantIntoState)
 *    REPLACES state.blocks with a different array and resets state.nextId. If
 *    the duplicate-in-progress isn't aborted, it lands on the NEW breakpoint's
 *    canvas (wrong) once the POST resolves.
 * 2. Undo mid-POST (applySnapshot -> loadFlatVariantIntoState) also replaces
 *    state.blocks and rewinds state.nextId. If a duplicate's id is minted
 *    from the PRE-await nextId, a later duplicate minted after the rewind can
 *    collide with it — the exact "linked copy via a shared id" bug class this
 *    whole fix exists to prevent, via a different path.
 *
 * The fix: capture `state.activeBreakpoint` + a REFERENCE to `state.blocks`
 * before each await; if either changed after the await resolves, abort (no
 * insert, no history push, error toast) instead of proceeding. Ids are now
 * minted AFTER the await + race check, not before, so they're always drawn
 * from whatever state.nextId is CURRENT.
 *
 * A related but separate hardening (F2 point 4, "nearly free" per the
 * review): a simple in-flight guard per entry point, so holding a duplicate/
 * paste shortcut down can't fire overlapping POSTs from the SAME trigger.
 *
 * Like the sibling volt-block-duplicate-independence.test.ts, this extracts
 * the REAL source of these functions from public/flexible-designer.html and
 * runs it in an isolated vm context with stubbed designer globals, rather
 * than reimplementing the logic — so these tests break against the real
 * shipped code, not a copy of it.
 */

function extractFunctionSource(fileSrc: string, signature: string): string {
  const start = fileSrc.indexOf(signature)
  if (start === -1) {
    throw new Error(`Could not find "${signature}" in flexible-designer.html`)
  }
  let depth = 0
  let started = false
  let i = start
  for (; i < fileSrc.length; i++) {
    if (fileSrc[i] === '{') {
      depth++
      started = true
    } else if (fileSrc[i] === '}') {
      depth--
      if (started && depth === 0) {
        i++
        break
      }
    }
  }
  return fileSrc.slice(start, i)
}

type Block = {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  zIndex: number
  props: Record<string, unknown>
  subElements: Array<{ id: string }>
}

type State = {
  blocks: Block[]
  nextId: number
  selectedBlockId: string | null
  selectedSubId: string | null
  activeBreakpoint: string
  designerCanvasW: number
  designerCanvasH: number
}

type Ctx = {
  console: Console
  DESIGN_H: number
  BP_PASTE_MIN_VISIBLE: number
  defaultCanvasWForBreakpoint: () => number
  state: State
  pushHistory: () => void
  designerToast: (msg: string, kind?: string) => void
  renderCanvas: () => void
  renderPropsPanel: () => void
  autoSave: () => void
  window: { FlexibleRenderRules: { restampBlockZIndexes: (blocks: Block[]) => void } }
  fetch: typeof fetch
  _lyDuplicateBlock?: (blockId: string) => Promise<void>
  mttDuplicate?: () => Promise<void>
  pasteBpClipboard?: () => Promise<void>
  __setClip?: (clip: unknown) => void
}

type Log = { history: number; toasts: [string, string?][]; fetches: string[] }

let fnsSrc: string

beforeAll(() => {
  const filePath = join(process.cwd(), 'public', 'flexible-designer.html')
  const fileSrc = readFileSync(filePath, 'utf8')
  fnsSrc = [
    'async function _lyEnsureIndependentVoltCopy(copy) {',
    'async function _lyDuplicateBlock(blockId){',
    'async function mttDuplicate() {',
    'async function pasteBpClipboard() {',
  ]
    .map((sig) => extractFunctionSource(fileSrc, sig))
    .join('\n\n')

  // Sanity-check the extraction found the race guards and in-flight guards
  // this test file exists to exercise — fail loudly here, not silently, if
  // flexible-designer.html is ever refactored past what these tests assume.
  expect(fnsSrc).toContain('raceBreakpoint')
  expect(fnsSrc).toContain('raceBlocks')
  expect(fnsSrc).toContain('_lyDuplicateBlockInFlight')
  expect(fnsSrc).toContain('_mttDuplicateInFlight')
  expect(fnsSrc).toContain('_pasteBpClipboardInFlight')
})

function makeCtx(fetchImpl: (url: string, opts?: RequestInit) => Promise<Response>) {
  const log: Log = { history: 0, toasts: [], fetches: [] }
  const ctx: Ctx = {
    console,
    DESIGN_H: 800,
    BP_PASTE_MIN_VISIBLE: 24,
    defaultCanvasWForBreakpoint: () => 1440,
    state: {
      blocks: [],
      nextId: 10,
      selectedBlockId: null,
      selectedSubId: null,
      activeBreakpoint: 'desktop',
      designerCanvasW: 1440,
      designerCanvasH: 800,
    },
    pushHistory: () => {
      log.history++
    },
    designerToast: (m: string, k?: string) => {
      log.toasts.push([m, k])
    },
    renderCanvas: () => {},
    renderPropsPanel: () => {},
    autoSave: () => {},
    window: { FlexibleRenderRules: { restampBlockZIndexes: (bs: Block[]) => bs.forEach((b, i) => { b.zIndex = i + 1 }) } },
    fetch: ((url: string, opts?: RequestInit) => {
      log.fetches.push(url)
      return fetchImpl(url, opts)
    }) as typeof fetch,
  }
  vm.createContext(ctx)
  vm.runInContext(
    // The extracted function sources reference these module-level `let`s
    // (declared just above each function in the real file, outside the
    // extracted signature-to-closing-brace span) as bare identifiers —
    // declare them here so calling the functions doesn't throw
    // ReferenceError. _bpClipboard likewise lives outside any of the
    // extracted functions in the real file.
    'let _bpClipboard = null;\n' +
      'let _lyDuplicateBlockInFlight = false;\n' +
      'let _mttDuplicateInFlight = false;\n' +
      'let _pasteBpClipboardInFlight = false;\n' +
      fnsSrc +
      '\nthis.__setClip = (c) => { _bpClipboard = c; };' +
      '\nthis._lyDuplicateBlock = _lyDuplicateBlock;' +
      '\nthis.mttDuplicate = mttDuplicate;' +
      '\nthis.pasteBpClipboard = pasteBpClipboard;',
    ctx
  )
  return { ctx, log }
}

let seq = 0
const okFetch = (delay = 0) =>
  async (): Promise<Response> => {
    if (delay) await new Promise((r) => setTimeout(r, delay))
    const id = 'new-' + ++seq
    return new Response(JSON.stringify({ data: { volt: { id, name: 'X (Copy)', thumbnail: null } } }), { status: 201 })
  }
const failFetch = async (): Promise<Response> => new Response('{}', { status: 404 })

const volt = (id: string, voltId: string): Block => ({
  id,
  type: 'volt',
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  zIndex: 1,
  props: { voltId, voltName: 'X', voltThumbnail: null },
  subElements: [],
})
const text = (id: string): Block => ({
  id,
  type: 'text',
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  zIndex: 1,
  props: {},
  subElements: [{ id: 'se-1' }],
})

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('block-duplicate call sites — normal (non-racing) behavior after the F2 refactor', () => {
  it('_lyDuplicateBlock: success still inserts with a fresh voltId, one history push', async () => {
    const { ctx, log } = makeCtx(okFetch())
    ctx.state.blocks = [volt('b1', 'orig')]
    await ctx._lyDuplicateBlock!('b1')
    expect(ctx.state.blocks.length).toBe(2)
    expect(ctx.state.blocks[1].props.voltId).not.toBe('orig')
    expect(log.history).toBe(1)
  })

  it('_lyDuplicateBlock: server failure aborts fully (no insert, no history, error toast)', async () => {
    const { ctx, log } = makeCtx(failFetch)
    ctx.state.blocks = [volt('b1', 'orig')]
    await ctx._lyDuplicateBlock!('b1')
    expect(ctx.state.blocks.length).toBe(1)
    expect(log.history).toBe(0)
    expect(log.toasts.some((t) => t[1] === 'error')).toBe(true)
  })

  it('mttDuplicate: success still inserts with a fresh voltId, one history push', async () => {
    const { ctx, log } = makeCtx(okFetch())
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.selectedBlockId = 'b1'
    await ctx.mttDuplicate!()
    expect(ctx.state.blocks.length).toBe(2)
    expect(ctx.state.blocks[1].props.voltId).not.toBe('orig')
    expect(log.history).toBe(1)
  })

  it('mttDuplicate: card-tabs blocks are duplicated synchronously-equivalent with the SAME shared voltId, no fetch', async () => {
    const { ctx, log } = makeCtx(failFetch)
    ctx.state.blocks = [
      { id: 'b1', type: 'card-tabs', x: 0, y: 0, w: 1, h: 1, zIndex: 1, props: { voltId: 'shared' }, subElements: [] },
    ]
    ctx.state.selectedBlockId = 'b1'
    await ctx.mttDuplicate!()
    expect(ctx.state.blocks.length).toBe(2)
    expect(ctx.state.blocks[1].props.voltId).toBe('shared')
    expect(log.fetches.length).toBe(0)
  })

  it('pasteBpClipboard (kind: blocks): multi-item success inserts all with distinct new voltIds, one history push', async () => {
    const { ctx, log } = makeCtx(okFetch())
    ctx.state.blocks = []
    ctx.__setClip!({ kind: 'blocks', sourceCanvasW: 1440, items: [text('t1'), volt('v1', 'a'), volt('v2', 'a')] })
    await ctx.pasteBpClipboard!()
    const voltIds = ctx.state.blocks.filter((b) => b.type === 'volt').map((b) => b.props.voltId)
    expect(ctx.state.blocks.length).toBe(3)
    expect(new Set(voltIds).size).toBe(2)
    expect(voltIds).not.toContain('a')
    expect(log.history).toBe(1)
  })

  it('pasteBpClipboard (kind: blocks): one item failing aborts the WHOLE paste, nothing inserted', async () => {
    let n = 0
    const { ctx, log } = makeCtx(async () => (++n === 1 ? okFetch()() : failFetch()))
    ctx.state.blocks = []
    ctx.__setClip!({ kind: 'blocks', sourceCanvasW: 1440, items: [volt('v1', 'a'), volt('v2', 'b')] })
    await ctx.pasteBpClipboard!()
    expect(ctx.state.blocks.length).toBe(0)
    expect(log.history).toBe(0)
  })
})

describe('block-duplicate call sites — F2 race guard: breakpoint switch mid-POST', () => {
  it('_lyDuplicateBlock: switching breakpoint while the POST is in flight aborts — copy does NOT land on the new canvas', async () => {
    const { ctx, log } = makeCtx(okFetch(30))
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.nextId = 150
    const p = ctx._lyDuplicateBlock!('b1')
    await tick(5)
    // Simulate setDevicePreview('mobile'): state.blocks replaced with a fresh
    // (empty) array, nextId rewound, breakpoint changed.
    ctx.state.blocks = []
    ctx.state.nextId = 1
    ctx.state.activeBreakpoint = 'mobile'
    await p
    expect(ctx.state.blocks.length).toBe(0)
    expect(log.history).toBe(0)
    expect(log.toasts.some((t) => t[1] === 'error')).toBe(true)
  })

  it('mttDuplicate: switching breakpoint while the POST is in flight aborts — copy does NOT land on the new canvas', async () => {
    const { ctx, log } = makeCtx(okFetch(30))
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.selectedBlockId = 'b1'
    ctx.state.nextId = 150
    const p = ctx.mttDuplicate!()
    await tick(5)
    ctx.state.blocks = []
    ctx.state.nextId = 1
    ctx.state.activeBreakpoint = 'mobile'
    ctx.state.selectedBlockId = null
    await p
    expect(ctx.state.blocks.length).toBe(0)
    expect(log.history).toBe(0)
    expect(log.toasts.some((t) => t[1] === 'error')).toBe(true)
  })

  it('pasteBpClipboard: switching breakpoint mid-loop (between item 1 and item 2) aborts — nothing inserted on either canvas', async () => {
    const { ctx, log } = makeCtx(okFetch(20))
    const desktopBlocks = ctx.state.blocks
    ctx.__setClip!({ kind: 'blocks', sourceCanvasW: 1440, items: [volt('v1', 'a'), volt('v2', 'b')] })
    const p = ctx.pasteBpClipboard!()
    // First item's 20ms fetch resolves ~20ms in; switch breakpoint while the
    // SECOND item's fetch is in flight.
    await tick(25)
    ctx.state.blocks = []
    ctx.state.activeBreakpoint = 'tablet'
    await p
    expect(ctx.state.blocks.length).toBe(0)
    expect(desktopBlocks.length).toBe(0)
    expect(log.history).toBe(0)
    expect(log.toasts.some((t) => t[1] === 'error')).toBe(true)
  })
})

describe('block-duplicate call sites — F2 race guard: undo mid-POST (nextId rewind / id collision)', () => {
  it('mttDuplicate: undo mid-POST aborts the in-flight duplicate, and a later duplicate mints no colliding id', async () => {
    const { ctx } = makeCtx(okFetch(30))
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.selectedBlockId = 'b1'
    ctx.state.nextId = 148
    const p = ctx.mttDuplicate!()
    await tick(5)
    // Simulate undo: applySnapshot replaces state.blocks with a NEW array
    // (same-looking content) and rewinds nextId back to what it was when the
    // snapshot was taken.
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.nextId = 148
    await p
    expect(ctx.state.blocks.length).toBe(1)
    // A subsequent duplicate must not collide with whatever id the aborted
    // one would have minted.
    ctx.state.blocks.push(text('b0'))
    ctx.state.selectedBlockId = 'b0'
    await ctx.mttDuplicate!()
    const ids = ctx.state.blocks.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('_lyDuplicateBlock: undo mid-POST aborts the in-flight duplicate, and a later duplicate mints no colliding id', async () => {
    const { ctx } = makeCtx(okFetch(30))
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.nextId = 148
    const p = ctx._lyDuplicateBlock!('b1')
    await tick(5)
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.nextId = 148
    await p
    expect(ctx.state.blocks.length).toBe(1)
    ctx.state.blocks.push(text('b0'))
    await ctx._lyDuplicateBlock!('b0')
    const ids = ctx.state.blocks.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('block-duplicate call sites — F2 point 4: in-flight guard drops overlapping calls from the same trigger', () => {
  it('_lyDuplicateBlock: a second call while the first is still awaiting is dropped — exactly one duplicate, one fetch', async () => {
    const { ctx, log } = makeCtx(okFetch(20))
    ctx.state.blocks = [volt('b1', 'orig')]
    await Promise.all([ctx._lyDuplicateBlock!('b1'), ctx._lyDuplicateBlock!('b1')])
    expect(ctx.state.blocks.length).toBe(2)
    expect(log.fetches.length).toBe(1)
    expect(log.history).toBe(1)
  })

  it('mttDuplicate: a second call while the first is still awaiting is dropped — exactly one duplicate, one fetch', async () => {
    const { ctx, log } = makeCtx(okFetch(20))
    ctx.state.blocks = [volt('b1', 'orig')]
    ctx.state.selectedBlockId = 'b1'
    await Promise.all([ctx.mttDuplicate!(), ctx.mttDuplicate!()])
    expect(ctx.state.blocks.length).toBe(2)
    expect(log.fetches.length).toBe(1)
    expect(log.history).toBe(1)
  })

  it('pasteBpClipboard: a second call (holding Ctrl+V) while the first is still awaiting is dropped — exactly one paste, one fetch', async () => {
    const { ctx, log } = makeCtx(okFetch(20))
    ctx.state.blocks = []
    ctx.__setClip!({ kind: 'blocks', sourceCanvasW: 1440, items: [volt('v1', 'a')] })
    await Promise.all([ctx.pasteBpClipboard!(), ctx.pasteBpClipboard!()])
    expect(ctx.state.blocks.length).toBe(1)
    expect(log.fetches.length).toBe(1)
    expect(log.history).toBe(1)
  })

  it('_lyDuplicateBlock: after the first call resolves, a fresh call is no longer blocked', async () => {
    const { ctx, log } = makeCtx(okFetch(0))
    ctx.state.blocks = [volt('b1', 'orig')]
    await ctx._lyDuplicateBlock!('b1')
    await ctx._lyDuplicateBlock!('b1')
    expect(ctx.state.blocks.length).toBe(3)
    expect(log.fetches.length).toBe(2)
  })
})
