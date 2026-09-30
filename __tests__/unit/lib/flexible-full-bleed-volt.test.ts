// Regression coverage for the 2026-09-30 "Volt full-bleed mismatch" bug: a prior branch
// fed isFullBleedVolt() a geometry fallback (via the shared resolveVoltFullBleed()) so an
// un-flagged Volt block that merely happened to cover its canvas got PROMOTED out of the
// normal content plate into the section-level FullBleedVoltLayer — the same layer used for
// EXPLICITLY fullBleed:true blocks. That layer is pointer-events:none, aria-hidden, sits
// under the section's own background image, and ignores headerOffset/navbar-guide shift —
// so an ordinary un-flagged hero Volt (e.g. a CTA over a background photo) silently lost
// its clickability, could become invisible, lost z-order, and could drift out of alignment.
// The Designer never performs this promotion for an un-flagged block (it only changes its
// fit, contain vs cover, and leaves it in place) — so this promotion decision must be driven
// ONLY by the explicit props.fullBleed flag, never by geometry. This test asserts exactly
// that: isFullBleedVolt() must return false for an un-flagged block regardless of whether it
// geometrically covers its canvas (geometry isn't even something this function accepts
// anymore — it takes no canvasSize/box argument at all).
import { describe, it, expect } from 'vitest'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import FlexibleSectionRenderer, { isFullBleedVolt } from '@/components/sections/FlexibleSectionRenderer'
import type { FlexibleSection } from '@/types/section'

describe('isFullBleedVolt (promotion-to-section-layer predicate)', () => {
  it('returns false for a volt block with fullBleed undefined, even one that geometrically covers its whole canvas', () => {
    // pixelPos here deliberately covers a 1440x900 canvas edge-to-edge — under the old,
    // reverted behavior this block's pixelPos + a canvasSize would have made this function
    // return true via resolveVoltFullBleed()'s geometry fallback. isFullBleedVolt no longer
    // accepts any geometry/canvas argument, so there is nothing for it to fall back to.
    const coveringUnflaggedBlock = {
      type: 'volt',
      props: { voltId: 'v1' }, // fullBleed intentionally omitted (undefined)
      pixelPos: { x: 0, y: 0, w: 1440, h: 900 },
    }
    expect(isFullBleedVolt(coveringUnflaggedBlock)).toBe(false)
  })

  it('returns true only when fullBleed is explicitly true (and voltId is present)', () => {
    expect(isFullBleedVolt({ type: 'volt', props: { voltId: 'v1', fullBleed: true } })).toBe(true)
    expect(isFullBleedVolt({ type: 'volt', props: { voltId: 'v1', fullBleed: false } })).toBe(false)
    expect(isFullBleedVolt({ type: 'volt', props: { fullBleed: true } })).toBe(false) // no voltId
    expect(isFullBleedVolt({ type: 'text', props: { voltId: 'v1', fullBleed: true } })).toBe(false) // not a volt block
    expect(isFullBleedVolt(undefined)).toBe(false)
  })
})

// RENDER-LEVEL regression test (2026-09-30 caveat fix): the two unit tests above call
// isFullBleedVolt() directly with a single argument, so they pass against BOTH the fixed
// code and the reverted-buggy 35ec1bd commit (which only added a SECOND, optional
// `canvasSize` arg to isFullBleedVolt — omitting it, as a direct one-arg call does, was
// always strict regardless of the bug). The actual bug lived in what the component's OWN
// internal call sites passed to that second arg, not in the function's standalone
// contract — so only rendering the real component through those call sites can catch it.
//
// This exercises FlexibleSectionRenderer's default export via renderToStaticMarkup (no
// render-level test convention exists elsewhere in this repo to follow; SSR markup is
// sufficient since vitest's environment is 'node', not jsdom — see vitest.config.ts).
// JSX is intentionally avoided (React.createElement only) because this file must stay a
// plain .ts file to match the suite's `include: ['__tests__/**/*.test.ts']` glob.
//
// Verified against the actual bug (not just reasoned about): temporarily swapping in
// 35ec1bd's full FlexibleSectionRenderer.tsx (checked out via `git show 35ec1bd:... `,
// NOT a change to this branch) and running this exact assertion set showed block 1
// missing from the plate (wrongly promoted) and fullBleedLayerCount === 2; restoring
// HEAD's fixed file (`git checkout HEAD -- components/sections/FlexibleSectionRenderer.tsx`)
// showed block 1 present and fullBleedLayerCount === 1 — i.e. this test flips red/green
// exactly around the real fix, unlike the two unit tests above.
describe('isFullBleedVolt (render-level — proves the promotion decision the component actually makes)', () => {
  it('leaves an un-flagged canvas-covering volt block in the normal content plate, and promotes only the explicitly-fullBleed one', () => {
    const COVER = { x: 0, y: 0, w: 1440, h: 900 }
    const blocks = [
      // Unflagged but geometrically covers the whole canvas — under the reverted bug this
      // was promoted purely from box geometry. Must stay in-grid now.
      { id: 1, type: 'volt', props: { voltId: 'vA' }, pixelPos: COVER },
      // Explicitly fullBleed:true — the ONLY block that should be promoted.
      { id: 2, type: 'volt', props: { voltId: 'vB', fullBleed: true }, pixelPos: COVER },
      // Unflagged, small — never a promotion candidate either way; sanity control.
      { id: 3, type: 'volt', props: { voltId: 'vC' }, pixelPos: { x: 100, y: 100, w: 300, h: 200 } },
      // Explicitly fullBleed:false, covers the canvas — explicit false must never be
      // overridden by geometry.
      { id: 4, type: 'volt', props: { voltId: 'vD', fullBleed: false }, pixelPos: COVER },
    ]
    // `any`: minimal designerData/free-mode blob, not the full FlexibleSection contract —
    // this test only exercises the isFullBleedVolt promotion decision, not section schema
    // validation, and no render-level test convention exists elsewhere in this repo to
    // follow for a more precisely typed fixture.
    const section = {
      id: 's1',
      type: 'FLEXIBLE',
      contentMode: 'single',
      paddingTop: 0,
      paddingBottom: 0,
      background: '#000000',
      content: { designerData: { positionMode: 'free', designerCanvasW: 1440, designerCanvasH: 900, blocks } },
    } as unknown as FlexibleSection

    const html = renderToStaticMarkup(React.createElement(FlexibleSectionRenderer, { section }))

    const fxContentIdx = html.indexOf('data-fx-content')
    expect(fxContentIdx).toBeGreaterThanOrEqual(0)

    const block1Idx = html.indexOf('data-fx-block="1"')
    const block4Idx = html.indexOf('data-fx-block="4"')
    const block2Idx = html.indexOf('data-fx-block="2"')

    // Un-flagged covering block: stays in the normal plate (after data-fx-content), i.e.
    // NOT promoted — this is the exact invariant the reverted bug violated.
    expect(block1Idx).toBeGreaterThan(fxContentIdx)
    // Explicit fullBleed:false covering block: same — explicit false is never overridden.
    expect(block4Idx).toBeGreaterThan(fxContentIdx)
    // Explicit fullBleed:true block: promoted OUT of the in-grid plate entirely (rendered
    // only via FullBleedVoltLayer's dynamic(..., { ssr: false }) VoltBlock, which emits no
    // markup server-side) — so no data-fx-block="2" appears anywhere in the SSR output.
    expect(block2Idx).toBe(-1)

    // Exactly one section-level full-bleed background layer — holding only the
    // explicitly-flagged block. Under the bug this was 2 (block 1 wrongly got its own
    // layer alongside block 2's legitimate one).
    const fullBleedLayers = html.match(
      /<div aria-hidden="true" style="position:absolute;inset:0;overflow:hidden;z-index:2;pointer-events:none">/g
    ) || []
    expect(fullBleedLayers.length).toBe(1)
  })
})
