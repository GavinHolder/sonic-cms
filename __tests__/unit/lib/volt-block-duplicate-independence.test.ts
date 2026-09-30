import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import vm from 'vm'

/**
 * Regression test for the volt-block-duplicate data-integrity bug: duplicating
 * a `type:'volt'` block on the Flexible Designer canvas (public/flexible-designer.html)
 * must never leave the copy pointing at the SAME VoltElement row as the
 * original — editing one via Volt Studio (PUT /api/volt/<id>) would otherwise
 * silently change the other (and any other block/section anywhere on the site
 * sharing that id).
 *
 * public/flexible-designer.html is a plain-JS file served as a static asset —
 * it has no build step and no existing test harness. Rather than reimplement
 * its logic here (which could silently drift from the real shipped code),
 * this test EXTRACTS the real `_lyEnsureIndependentVoltCopy` function source
 * directly from the file and executes it in an isolated vm context with a
 * mocked `fetch`. If a future edit changes this function's behavior, this
 * test breaks against the REAL code, not a copy of it.
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

type EnsureIndependentVoltCopy = (copy: {
  type?: string
  props?: Record<string, unknown> | null
}) => Promise<boolean>

let ensureIndependentVoltCopy: EnsureIndependentVoltCopy
let sandbox: { fetch?: typeof fetch; console: Console; _lyEnsureIndependentVoltCopy?: EnsureIndependentVoltCopy }

beforeAll(() => {
  const filePath = join(process.cwd(), 'public', 'flexible-designer.html')
  const fileSrc = readFileSync(filePath, 'utf8')
  const fnSrc = extractFunctionSource(fileSrc, 'async function _lyEnsureIndependentVoltCopy(copy) {')

  // Sanity-check the extraction itself found a real, complete function body —
  // if flexible-designer.html is ever refactored and this helper renamed or
  // restructured, fail loudly here instead of silently testing nothing.
  expect(fnSrc).toContain("copy.type !== 'volt'")
  expect(fnSrc).toContain('/duplicate')

  sandbox = { console }
  vm.createContext(sandbox)
  vm.runInContext(fnSrc, sandbox)
  ensureIndependentVoltCopy = sandbox._lyEnsureIndependentVoltCopy as EnsureIndependentVoltCopy
})

function mockFetch(impl: (url: string, opts: RequestInit | undefined) => Promise<Response> | never) {
  sandbox.fetch = vi.fn(impl) as unknown as typeof fetch
  return sandbox.fetch as unknown as ReturnType<typeof vi.fn>
}

describe('_lyEnsureIndependentVoltCopy (extracted from public/flexible-designer.html)', () => {
  it('non-volt block type: no-op, no network call, object untouched', async () => {
    const fetchSpy = mockFetch(() => {
      throw new Error('must not be called for a non-volt block')
    })
    const copy = { type: 'text', props: { text: 'hello' } }
    const before = JSON.stringify(copy)
    const ok = await ensureIndependentVoltCopy(copy)
    expect(ok).toBe(true)
    expect(JSON.stringify(copy)).toBe(before)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("card-tabs/product-grid blocks (also carry props.voltId, but as a shared library reference) are left untouched", async () => {
    const fetchSpy = mockFetch(() => {
      throw new Error('must not be called for a non-volt block type, even one carrying voltId')
    })
    const copy = { type: 'card-tabs', props: { voltId: 'cmSharedCardStyle123456789' } }
    const ok = await ensureIndependentVoltCopy(copy)
    expect(ok).toBe(true)
    expect(copy.props.voltId).toBe('cmSharedCardStyle123456789')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('volt block with no voltId yet (never-saved placeholder): no-op, no network call', async () => {
    const fetchSpy = mockFetch(() => {
      throw new Error('must not be called when voltId is falsy')
    })
    const copy = { type: 'volt', props: { voltId: '' } }
    const ok = await ensureIndependentVoltCopy(copy)
    expect(ok).toBe(true)
    expect(copy.props.voltId).toBe('')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('volt block with a real voltId: calls POST /api/volt/<id>/duplicate and rewrites the copy to the NEW independent id', async () => {
    const fetchSpy = mockFetch(async (url, opts) => {
      expect(url).toBe('/api/volt/original-volt-id-123/duplicate')
      expect(opts?.method).toBe('POST')
      expect(opts?.credentials).toBe('include')
      return new Response(
        JSON.stringify({ data: { volt: { id: 'brand-new-independent-id-456', name: 'My Design (Copy)', thumbnail: 'thumb.png' } } }),
        { status: 201 }
      )
    })
    const copy = { type: 'volt', props: { voltId: 'original-volt-id-123', voltName: 'My Design', voltThumbnail: null } }
    const ok = await ensureIndependentVoltCopy(copy)
    expect(ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    // THE core assertion this bug fix exists for: the copy must NOT keep
    // pointing at the original's id.
    expect(copy.props.voltId).toBe('brand-new-independent-id-456')
    expect(copy.props.voltId).not.toBe('original-volt-id-123')
    expect(copy.props.voltName).toBe('My Design (Copy)')
    expect(copy.props.voltThumbnail).toBe('thumb.png')
  })

  it('server responds non-OK (e.g. 404/403): resolves false and leaves the copy COMPLETELY untouched — caller must abort rather than fall back to the shared id', async () => {
    const fetchSpy = mockFetch(async () => new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404 }))
    const copy = { type: 'volt', props: { voltId: 'some-id-not-visible-to-user' } }
    const before = JSON.stringify(copy)
    const ok = await ensureIndependentVoltCopy(copy)
    expect(ok).toBe(false)
    expect(JSON.stringify(copy)).toBe(before)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('server responds OK but with a malformed/empty body: resolves false, copy untouched', async () => {
    mockFetch(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }))
    const copy = { type: 'volt', props: { voltId: 'id-1' } }
    const before = JSON.stringify(copy)
    const ok = await ensureIndependentVoltCopy(copy)
    expect(ok).toBe(false)
    expect(JSON.stringify(copy)).toBe(before)
  })

  it('network error (fetch throws): resolves false, copy untouched, does not throw', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const copy = { type: 'volt', props: { voltId: 'id-2' } }
    const before = JSON.stringify(copy)
    await expect(ensureIndependentVoltCopy(copy)).resolves.toBe(false)
    expect(JSON.stringify(copy)).toBe(before)
  })
})

/**
 * F1 regression test (2026-09-29 independent review of fix/volt-block-duplicate):
 * duplicating a glass/frosted Volt lost its blur on the Designer canvas until
 * reload, because window.__voltGlassMap (keyed by voltId, read by
 * buildVoltPreviewUrl()) was only ever populated once at Designer load —
 * the newly-minted duplicate's id was never added to it. The fix copies the
 * flag from the OLD id to the NEW id inside _lyEnsureIndependentVoltCopy's
 * success branch, guarded by `typeof window !== 'undefined'` since this
 * function is extracted and run in a Node `vm` sandbox with no `window` (see
 * the describe block above, whose sandbox has none and whose tests all still
 * pass — proving the guard doesn't break the no-window case).
 *
 * Uses its OWN vm sandbox (with a stubbed `window.__voltGlassMap`) rather
 * than the shared one above, so this describe block's `window` stub cannot
 * leak into (or mask a real regression in) the no-window tests above.
 */
describe('_lyEnsureIndependentVoltCopy — F1 glass-map flag transfer', () => {
  let ensureWithWindow: EnsureIndependentVoltCopy
  let windowSandbox: {
    fetch?: typeof fetch
    console: Console
    window: { __voltGlassMap: Record<string, boolean> | undefined }
    _lyEnsureIndependentVoltCopy?: EnsureIndependentVoltCopy
  }

  beforeAll(() => {
    const filePath = join(process.cwd(), 'public', 'flexible-designer.html')
    const fileSrc = readFileSync(filePath, 'utf8')
    const fnSrc = extractFunctionSource(fileSrc, 'async function _lyEnsureIndependentVoltCopy(copy) {')
    windowSandbox = { console, window: { __voltGlassMap: {} } }
    vm.createContext(windowSandbox)
    vm.runInContext(fnSrc, windowSandbox)
    ensureWithWindow = windowSandbox._lyEnsureIndependentVoltCopy as EnsureIndependentVoltCopy
  })

  function stubFetch(newId: string) {
    windowSandbox.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ data: { volt: { id: newId, name: 'X (Copy)', thumbnail: null } } }),
        { status: 201 }
      )
    ) as unknown as typeof fetch
  }

  it('copies a `true` glass flag from the old voltId to the newly-minted id', async () => {
    windowSandbox.window.__voltGlassMap = { 'original-volt-id-123': true }
    stubFetch('brand-new-id-456')
    const copy = { type: 'volt', props: { voltId: 'original-volt-id-123', voltName: 'X', voltThumbnail: null } }
    const ok = await ensureWithWindow(copy)
    expect(ok).toBe(true)
    expect(windowSandbox.window.__voltGlassMap!['brand-new-id-456']).toBe(true)
    // The original id's own entry is left alone — it still describes that row.
    expect(windowSandbox.window.__voltGlassMap!['original-volt-id-123']).toBe(true)
  })

  it('copies a `false` glass flag too — presence in the map, not truthiness, is what must transfer', async () => {
    windowSandbox.window.__voltGlassMap = { 'orig-2': false }
    stubFetch('new-2')
    const copy = { type: 'volt', props: { voltId: 'orig-2', voltName: 'X', voltThumbnail: null } }
    await ensureWithWindow(copy)
    expect('new-2' in windowSandbox.window.__voltGlassMap!).toBe(true)
    expect(windowSandbox.window.__voltGlassMap!['new-2']).toBe(false)
  })

  it('leaves the glass map alone when the original id was never in it (non-glass Volt)', async () => {
    windowSandbox.window.__voltGlassMap = {}
    stubFetch('new-3')
    const copy = { type: 'volt', props: { voltId: 'orig-3', voltName: 'X', voltThumbnail: null } }
    await ensureWithWindow(copy)
    expect('new-3' in windowSandbox.window.__voltGlassMap!).toBe(false)
  })

  it('does not throw and skips the transfer when window.__voltGlassMap itself is missing', async () => {
    windowSandbox.window.__voltGlassMap = undefined
    stubFetch('new-5')
    const copy = { type: 'volt', props: { voltId: 'orig-5', voltName: 'X', voltThumbnail: null } }
    await expect(ensureWithWindow(copy)).resolves.toBe(true)
  })
})
