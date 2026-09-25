/**
 * public/flexible-breakpoint-rules.js
 *
 * SINGLE SOURCE OF TRUTH for Flexible-section per-breakpoint designerData shape
 * normalization and variant selection — shared between public/flexible-designer.html
 * (the admin Designer canvas) and components/sections/FlexibleSectionRenderer.tsx
 * (the live React renderer), per this project's "ONE SYSTEM PER CONCERN" rule
 * (CLAUDE.md). Companion module to flexible-render-rules.js (which handles
 * sub-element style/position/multi-bg-layer geometry) — this one is scoped
 * exclusively to breakpoint-variant shape/selection, a distinct concern.
 *
 * Loadable two ways (UMD-lite):
 *   - As a plain <script> tag → exposes window.FlexibleBreakpointRules.
 *   - As an ES module import (Next.js/webpack) → named exports below.
 * No DOM/window dependencies — pure data transforms only, safe in either context.
 *
 * SHAPE:
 *   Legacy (every section saved before this feature): designerData is a flat
 *   object — { contentMode, positionMode, designerCanvasW, designerCanvasH,
 *   multiLimit?, blocks: [...], ... } — no "variant" key.
 *
 *   Per-breakpoint (new): designerData is { variant: "per-breakpoint",
 *   desktop: <flat blob>, tablet: <flat blob>|null, mobile: <flat blob>|null }.
 *   Each variant's own blob is IDENTICAL in shape to the legacy flat object —
 *   deliberately, so neither consumer's block-rendering/editing logic needs to
 *   change at all; only shape NORMALIZATION and variant SELECTION are new.
 *
 * ASSUMPTIONS:
 * 1. A legacy flat blob (no "variant" key) is always treated as the desktop
 *    variant — this is what makes the rollout migration-free: every section
 *    saved before this feature keeps rendering/editing exactly as before.
 * 2. resolveVariants() never returns a null desktop for a non-null input —
 *    a legacy blob becomes desktop directly; a per-breakpoint blob's own
 *    "desktop" key is trusted to be present (the save path, Task 5, always
 *    writes a non-null desktop). A genuinely empty/malformed input (null,
 *    undefined, unparseable string) returns { desktop: null, tablet: null,
 *    mobile: null } — callers must handle a null desktop as "no data at all"
 *    (the same case they already handle today for a missing designerData).
 * 3. pickActiveVariant()'s isFallback flag exists so a caller can distinguish
 *    "this IS the tablet/mobile layout, as authored" from "tablet/mobile
 *    hasn't been customized, showing desktop instead" — the Designer UI uses
 *    this to show a "not yet customized" indicator (Task 4); the renderer
 *    uses it to decide whether a not-customized MOBILE falls through to
 *    FreeReflowStack (Task 6) — a customized mobile is NOT reflowed, it's
 *    rendered as its own independent scaled-stage plate, same as desktop/tablet.
 *
 * FAILURE MODES:
 * - rawDesignerData is an unparseable JSON string → resolveVariants() catches
 *   the parse error and returns { desktop: null, tablet: null, mobile: null },
 *   matching how both existing consumers already treat malformed designerData
 *   (render/edit nothing rather than throw).
 * - A per-breakpoint blob is missing its own "desktop" key (should never
 *   happen given Assumption 2, but a defensively malformed row is possible)
 *   → resolveVariants() returns desktop: null in that case; callers already
 *   must handle null desktop per Assumption 2.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FlexibleBreakpointRules = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function parseIfString(raw) {
    if (raw == null) return null;
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function resolveVariants(rawDesignerData) {
    var parsed = parseIfString(rawDesignerData);
    if (!parsed || typeof parsed !== "object") {
      return { desktop: null, tablet: null, mobile: null };
    }
    if (parsed.variant === "per-breakpoint") {
      return {
        desktop: parsed.desktop || null,
        tablet: parsed.tablet || null,
        mobile: parsed.mobile || null,
      };
    }
    // Legacy flat blob (no "variant" key) — treat the whole object as desktop.
    return { desktop: parsed, tablet: null, mobile: null };
  }

  function pickBreakpointForWidth(screenW) {
    var w = Number(screenW) || 0;
    if (w >= 992) return "desktop";
    if (w >= 768) return "tablet";
    return "mobile";
  }

  function pickActiveVariant(resolved, breakpoint) {
    resolved = resolved || {};
    if (breakpoint !== "desktop" && resolved[breakpoint]) {
      return { data: resolved[breakpoint], isFallback: false };
    }
    return { data: resolved.desktop || null, isFallback: breakpoint !== "desktop" };
  }

  /**
   * isVariantAuthored(variant) — pure. A Tablet/Mobile variant counts as "authored" (a layout somebody
   * actually designed) iff it holds at least one block. NOT "the variant exists" and NOT "it has its own
   * background bundle": clicking the Tablet tab in the Designer and pressing Save persists an EMPTY variant
   * (public/flexible-designer.html's setDevicePreview seeds emptyVariantBlob() on first visit and buildJson
   * serialises it), and FlexibleSectionEditorModal writes the active "Preview as" tab's background bundle on
   * every save — so neither is evidence that anyone designed anything for that breakpoint.
   *
   * @param {Object|null|undefined} variant - one variant blob ({ blocks: [...], ... }).
   * @returns {boolean}
   */
  function isVariantAuthored(variant) {
    return !!variant && Array.isArray(variant.blocks) && variant.blocks.length > 0;
  }

  /**
   * pickLiveVariant(resolved, breakpoint, fallbackMode) — pure. LIVE-PAGE variant selection (added
   * 2026-09-25). The Designer keeps using pickActiveVariant() above, unchanged: there an empty Tablet/Mobile
   * canvas must stay empty (breakpoint isolation — never copy, seed or sync data between breakpoints).
   * The live page only READS stored data and never writes it back, so it can afford a visitor-friendly rule:
   *
   *   desktop                    -> the Desktop variant.
   *   tablet/mobile, AUTHORED    -> that breakpoint's own variant, exactly as designed.
   *   tablet/mobile, NOT designed:
   *       fallbackMode "desktop" (default) -> the Desktop variant, flagged isFallback (the renderer scales it
   *                                            at 768-991 and reflows it below 768) — a visitor never sees a
   *                                            blank section just because a breakpoint was never designed.
   *       fallbackMode "none"              -> blank: the section shows nothing at that breakpoint (an explicit,
   *                                            per-section owner choice — content.undesignedBreakpoint).
   *   fallbackMode "off" (any section that is NOT a free-mode Designer layout — grid / mosaic / element-based):
   *       the live fallback does not exist for it. Exactly pickActiveVariant() (never blank, no borrowing), i.e. what
   *       these sections rendered before the fallback was introduced.
   *
   * "Not designed" = !isVariantAuthored(): a missing variant AND a saved-but-empty one are treated the same.
   *
   * @param {{desktop?:Object|null,tablet?:Object|null,mobile?:Object|null}} resolved - resolveVariants() output.
   * @param {'desktop'|'tablet'|'mobile'} breakpoint
   * @param {'desktop'|'none'|'off'} [fallbackMode] - "none", "off"; anything else means "desktop".
   * @returns {{data:Object|null,isFallback:boolean,blank:boolean}} blank => data.blocks is [] (render nothing).
   */
  function pickLiveVariant(resolved, breakpoint, fallbackMode) {
    resolved = resolved || {};
    if (fallbackMode === "off") {
      var active = pickActiveVariant(resolved, breakpoint);
      return { data: active.data, isFallback: active.isFallback, blank: false };
    }
    if (breakpoint === "desktop") {
      return { data: resolved.desktop || null, isFallback: false, blank: false };
    }
    var own = resolved[breakpoint] || null;
    if (isVariantAuthored(own)) return { data: own, isFallback: false, blank: false };
    if (fallbackMode === "none") {
      var blankBlob = Object.assign({}, own || resolved.desktop || {}, { blocks: [] });
      return { data: blankBlob, isFallback: false, blank: true };
    }
    return { data: resolved.desktop || null, isFallback: true, blank: false };
  }

  /**
   * usesReflowLayout(breakpoint, isFallback) — pure. THE single live-page decision of "plate or reflow" for a
   * FREE-mode section (owner decision 2026-09-25). A Tablet or Mobile screen whose own layout was never designed
   * (pickLiveVariant returned the Desktop variant with isFallback true) shows that Desktop design as the
   * single-column reading-order reflow (FreeReflowStack) — on phones AND on tablets up to 991px — instead of the
   * whole 1440px canvas shrunk to 0.53-0.69x (unreadable text, a pricing grid squeezed into a thumbnail).
   * Desktop, and any Tablet/Mobile variant with >= 1 block (isFallback false), keep the scaled-stage PLATE exactly
   * as designed. Consumed by every place that used to compute this on its own (the section's height model and the
   * plate/reflow branch inside the block renderer), so they can never disagree.
   *
   * Only meaningful for free-mode Designer sections: grid / mosaic / element-based sections never reach the plate
   * or the reflow.
   *
   * @param {'desktop'|'tablet'|'mobile'} breakpoint
   * @param {boolean} isFallback - pickLiveVariant()'s isFallback for that breakpoint.
   * @returns {boolean}
   */
  function usesReflowLayout(breakpoint, isFallback) {
    return (breakpoint === "tablet" || breakpoint === "mobile") && !!isFallback;
  }

  /**
   * Deep-clones a variant blob (JSON round-trip), or passes null through.
   *
   * 2026-09-22: no longer called anywhere in this codebase — it used to be how
   * public/flexible-designer.html's setDevicePreview seeded a freshly-opened
   * Tablet/Mobile breakpoint by cloning Desktop's blocks; that seed now builds a
   * genuinely EMPTY variant instead (emptyVariantBlob(), zero blocks — see
   * feedback_breakpoint-canvases-fully-isolated memory). Kept, unused, as a
   * generic exported utility rather than deleted (out of scope for that fix).
   */
  function duplicateVariant(sourceVariantData) {
    if (sourceVariantData == null) return null;
    return JSON.parse(JSON.stringify(sourceVariantData));
  }

  /**
   * Clamps every top-level block's x/y/w/h fully inside a canvasW x canvasH box.
   * ONE-TIME seed-time helper: the Designer calls this exactly once, right after
   * duplicateVariant() clones Desktop's blocks into a freshly-seeded Tablet/Mobile
   * variant, so the admin can immediately see and drag every block instead of some
   * sitting off-canvas (unreachable — the Designer's #canvas box is a fixed-size,
   * overflow:hidden "cover plate", not an auto-growing/scrolling one, so a block
   * whose x/y put it past the new, narrower/shorter breakpoint canvas is genuinely
   * invisible and undraggable, not just scrolled out of view). Desktop's blocks are
   * authored against Desktop's own (usually much wider/taller) canvas, so verbatim
   * coordinates routinely land outside a 768px/375px canvas.
   *
   * Shrinks width/height FIRST when a block is itself wider/taller than the target
   * canvas — clamping only x/y in that case would still force it to (0,0) and leave
   * it overflowing the far edge. Blocks are allowed to end up overlapping each other
   * after clamping; this deliberately does NOT auto-layout or de-overlap them — the
   * admin repositions them by hand from here, per spec.
   *
   * Do not call this outside seed time: once a variant has been customized, its
   * block positions are the admin's own explicit choices (including intentionally
   * placing something half off-canvas) and must not be silently reclamped.
   *
   * @param {Array<Object>} blocks - Block array to clamp (x/y/w/h in px, canvas-relative).
   * @param {number} canvasW - Target canvas width in px.
   * @param {number} canvasH - Target canvas height in px.
   * @returns {Array<Object>} A new array of new block objects — does not mutate inputs.
   */
  function clampBlocksToCanvas(blocks, canvasW, canvasH) {
    if (!Array.isArray(blocks)) return blocks;
    var cw = Number(canvasW) || 0;
    var ch = Number(canvasH) || 0;
    if (cw <= 0 && ch <= 0) return blocks;
    return blocks.map(function (block) {
      var w = typeof block.w === "number" ? block.w : 0;
      var h = typeof block.h === "number" ? block.h : 0;
      var x = typeof block.x === "number" ? block.x : 0;
      var y = typeof block.y === "number" ? block.y : 0;
      if (cw > 0) {
        w = Math.min(w, cw);
        x = Math.max(0, Math.min(x, cw - w));
      }
      if (ch > 0) {
        h = Math.min(h, ch);
        y = Math.max(0, Math.min(y, ch - h));
      }
      var clamped = Object.assign({}, block);
      clamped.x = x; clamped.y = y; clamped.w = w; clamped.h = h;
      return clamped;
    });
  }

  // ── Cross-breakpoint reconciliation — SEED-TIME ONLY (2026-09-21 decision,
  //    see docs/main-cms-sync-prompt.md) ──
  // HISTORY: this started as an AMBIENT, ongoing reconcile — called on every
  // breakpoint switch, every autosave, every undo, and even on every live page
  // render — that additively appended/unioned blocks and sub-elements missing
  // from a non-active breakpoint variant, on the theory that content should
  // never silently "disappear" between Desktop/Tablet/Mobile. Three rounds of
  // fixes (c75fcce reverted, then two same-day extensions) never fully closed
  // the gap, and the user explicitly ended the approach as a "futile exercise":
  // breakpoints are now fully INDEPENDENT after their initial seed. Going back
  // and forth trying to keep them ambiently in sync was judged not worth it —
  // the admin re-adds elements per breakpoint, or clicks the manual per-block
  // "Reset Size/Position to Match Desktop" action, and that is the ONLY way
  // content syncs across breakpoints from here on.
  //
  // WHAT REMAINS (updated 2026-09-22 — see feedback_breakpoint-canvases-fully-isolated
  // memory): the "one-time seed" call site described below is ITSELF superseded —
  // public/flexible-designer.html's setDevicePreview no longer seeds a freshly-opened
  // Tablet/Mobile from Desktop at all (not even once); it now builds a genuinely
  // EMPTY variant (emptyVariantBlob()) with zero blocks. reconcileVariantBlocks()
  // and unionBlockSubElements() therefore have NO call site left anywhere in this
  // codebase as of that change — kept here, unused, rather than deleted (out of
  // scope for that fix; they are still correct, documented, pure functions, and
  // deleting exported module API is a separate decision from removing one call
  // site). scaleBlockToCanvas() (which reconcileVariantBlocks delegates to
  // internally) is NOT orphaned — the manual per-block "Reset Size/Position to
  // Match Desktop" button still calls it directly, and that stays the ONLY way
  // content ever crosses from one breakpoint to another. Do NOT re-wire
  // reconcileVariantBlocks/unionBlockSubElements into ANY call site (seed-time
  // included) without re-reading that memory file first — the user has rejected
  // "seed once from Desktop" five times across sessions.
  //
  // INVARIANTS (still true of what remains):
  //   - every block already in the target stays at the same index, same order;
  //     it is the SAME object reference (no heal, no clamp, ever) UNLESS another
  //     variant's copy of that same block id has a sub-element it doesn't —
  //     then it is a NEW shallow-copied block whose OWN existing subElements
  //     keep their exact references/order/position, with only the missing ones
  //     appended (scaled relative to this block's own untouched geometry);
  //   - block ids missing from the target entirely are appended (scaled +
  //     clamped clones, full content via JSON deep-clone before geometry is
  //     overwritten);
  //   - inputs are never mutated; appended clones share no refs with sources.

  var DEFAULT_CANVAS_W = { desktop: 1440, tablet: 768, mobile: 375 };
  var DEFAULT_CANVAS_H = 900; // mirrors DESIGN_H in both consumers
  var MIN_BLOCK_W = 40;
  var MIN_BLOCK_H = 24;
  var MIN_SUB_W = 40;
  var MIN_SUB_H = 24;
  var BLOCK_BORDER = 2; // .container-block border

  function isNum(v) {
    return typeof v === "number" && isFinite(v);
  }

  /**
   * Full authored canvas box of one variant blob: designerCanvasW (or the
   * breakpoint default) x designerCanvasH (or 900) x multiLimit when multi.
   * Never returns 0/NaN.
   */
  function variantCanvasDims(variant, key) {
    var v = variant || {};
    var w = Number(v.designerCanvasW);
    var h = Number(v.designerCanvasH);
    if (!(w > 0)) w = DEFAULT_CANVAS_W[key] || DEFAULT_CANVAS_W.desktop;
    if (!(h > 0)) h = DEFAULT_CANVAS_H;
    var bands = v.contentMode === "multi" ? Math.max(1, Number(v.multiLimit) || 1) : 1;
    return { w: w, h: h * bands };
  }

  // Blocks travel in two shapes: LIVE {x,y,w,h} (Designer state) and PERSISTED
  // {pixelPos:{x,y,w,h}} (saved JSON / live renderer). A live block never
  // carries pixelPos and a persisted one never carries top-level x/y, so: a
  // top-level value wins when present, else pixelPos, else a safe default.
  function readGeom(block) {
    var b = block || {};
    var pp = b.pixelPos && typeof b.pixelPos === "object" ? b.pixelPos : {};
    function pick(k, dflt) {
      var raw = b[k] !== undefined && b[k] !== null && b[k] !== "" ? b[k] : pp[k];
      if (raw === undefined || raw === null || raw === "") return dflt;
      var n = Number(raw);
      return isFinite(n) ? n : dflt;
    }
    return { x: pick("x", 0), y: pick("y", 0), w: pick("w", 300), h: pick("h", 180) };
  }

  // Write geometry back into whichever shape(s) the block already carries
  // (LIVE top-level when neither is present). Returns a new object.
  function writeGeom(block, g) {
    var out = Object.assign({}, block);
    var hasPP = !!(block.pixelPos && typeof block.pixelPos === "object");
    var hasTop = block.x !== undefined || block.y !== undefined || block.w !== undefined || block.h !== undefined;
    if (hasPP) out.pixelPos = Object.assign({}, block.pixelPos, { x: g.x, y: g.y, w: g.w, h: g.h });
    if (hasTop || !hasPP) { out.x = g.x; out.y = g.y; out.w = g.w; out.h = g.h; }
    return out;
  }

  function clampBlockGeom(g, dstW, dstH) {
    var w = Math.round(g.w > 0 ? g.w : MIN_BLOCK_W);
    var h = Math.round(g.h > 0 ? g.h : MIN_BLOCK_H);
    w = Math.min(Math.max(w, MIN_BLOCK_W), dstW);
    h = Math.min(Math.max(h, MIN_BLOCK_H), dstH);
    return {
      x: Math.max(0, Math.min(Math.round(g.x), dstW - w)),
      y: Math.max(0, Math.min(Math.round(g.y), dstH - h)),
      w: w,
      h: h,
    };
  }

  function scaleSub(sub, r) {
    var out = Object.assign({}, sub);
    if (isNum(sub.x)) out.x = Math.round(sub.x * r);
    if (isNum(sub.y)) out.y = Math.round(sub.y * r);
    if (isNum(sub.w)) out.w = Math.max(1, Math.round(sub.w * r));
    if (isNum(sub.h)) out.h = Math.max(1, Math.round(sub.h * r));
    return out;
  }

  // Sub-elements are FREE children (may legitimately sit outside the parent
  // box), so a scaled child that is still on-CANVAS keeps its proportional
  // spot. Only a child that would land off-canvas is pulled inside its (already
  // on-canvas) block, which guarantees it is visible and draggable.
  function placeSub(sub, block, g, dstW, dstH) {
    var p = (block && block.props) || {};
    var padX = p.paddingX !== undefined && p.paddingX !== null ? Number(p.paddingX) || 0 : 20;
    var sx = isNum(sub.x) ? sub.x : 0;
    var sy = isNum(sub.y) ? sub.y : 0;
    var ax = g.x + BLOCK_BORDER + padX + sx;
    var ay = g.y + sy;
    if (ax >= 0 && ay >= 0 && ax <= dstW - MIN_SUB_W && ay <= dstH - MIN_SUB_H) return sub;
    var out = Object.assign({}, sub);
    var maxX = Math.max(0, g.w - 2 * BLOCK_BORDER - 2 * padX - MIN_SUB_W);
    var maxY = Math.max(0, g.h - MIN_SUB_H);
    out.x = Math.max(0, Math.min(sx, maxX));
    out.y = Math.max(0, Math.min(sy, maxY));
    if (isNum(out.w) && out.w > g.w) out.w = g.w;
    return out;
  }

  /** Scale a (cloned) block + sub-elements by r onto a dstW x dstH canvas, clamped on-canvas. */
  function scaleAndClampBlock(block, r, dstW, dstH) {
    var g = readGeom(block);
    var scaled = clampBlockGeom({ x: g.x * r, y: g.y * r, w: g.w * r, h: g.h * r }, dstW, dstH);
    var out = writeGeom(block, scaled);
    if (Array.isArray(block.subElements)) {
      out.subElements = block.subElements.map(function (sub) {
        if (!sub || typeof sub !== "object") return sub;
        return placeSub(scaleSub(sub, r), block, scaled, dstW, dstH);
      });
    }
    return out;
  }

  /**
   * scaleBlockToCanvas(block, srcDims, dstDims): pure. Scales ONE block (+ its
   * sub-elements) from a srcDims.w-wide source canvas onto a dstDims.w x
   * dstDims.h destination canvas — the exact ratio+clamp math
   * reconcileVariantBlocks() already applies to a newly-appended (missing)
   * block, factored out here so a second caller (the Designer's per-block
   * "Reset to proportional from Desktop" action, public/flexible-designer.html)
   * can recompute the SAME geometry for one already-existing block without a
   * second hand-copy of the math (ONE SYSTEM PER CONCERN, CLAUDE.md).
   * reconcileVariantBlocks() itself now delegates to this function too, so the
   * two call sites can never drift apart.
   *
   * ASSUMPTIONS:
   * 1. `block` is in either LIVE ({x,y,w,h}) or PERSISTED ({pixelPos:{...}})
   *    shape (see readGeom/writeGeom) — the returned block keeps that same shape.
   * 2. `srcDims.h` is not used: clamping is only ever against the DESTINATION
   *    box (matches scaleAndClampBlock/clampBlockGeom, which never reads a
   *    source height either) — accepted anyway so a caller can pass the same
   *    {w,h} shape variantCanvasDims() returns for both src and dst.
   *
   * FAILURE MODES:
   * - srcDims/dstDims missing or non-positive width -> ratio falls back to 1
   *   (no scaling), mirroring reconcileVariantBlocks' own `srcW > 0 ? dstW/srcW : 1` guard.
   * - non-positive dstDims.w/h -> clampBlockGeom's own min-size floor still applies.
   * @param {Object} block - source block (any shape readGeom/writeGeom understands).
   * @param {{w:number}} srcDims - source canvas width.
   * @param {{w:number,h:number}} dstDims - destination canvas box.
   * @returns {Object} a NEW block object; source is never mutated.
   */
  function scaleBlockToCanvas(block, srcDims, dstDims) {
    var srcW = srcDims && Number(srcDims.w) > 0 ? Number(srcDims.w) : 0;
    var dstW = dstDims && Number(dstDims.w) > 0 ? Number(dstDims.w) : 0;
    var dstH = dstDims && Number(dstDims.h) > 0 ? Number(dstDims.h) : 0;
    var r = srcW > 0 ? dstW / srcW : 1;
    return scaleAndClampBlock(JSON.parse(JSON.stringify(block)), r, dstW, dstH);
  }

  /**
   * unionBlockSubElements(targetBlock, variants, targetKey, dstW, dstH): pure.
   *
   * Second reconcile granularity (2026-09-21, round 2 — see docs/main-cms-sync-prompt.md
   * for the incident this closes): reconcileVariantBlocks() below only ever matched
   * blocks by id at the TOP LEVEL — once a block id existed in the target, the whole
   * block (including its subElements array) was returned untouched, even if another
   * breakpoint's copy of that SAME block id had since gained sub-elements the target
   * never got (e.g. Desktop's text-block grew a second heading after Tablet was
   * seeded). This unions the target block's OWN subElements (kept, same references,
   * same order) with any sub-element id present on another variant's copy of the same
   * block id but missing from the target's copy — scaled and placed relative to the
   * TARGET block's own actual (untouched) geometry, never Desktop's.
   *
   * ASSUMPTIONS:
   * 1. Sub-element ids are unique within a block's subElements array and stable
   *    across breakpoints (mirrors the block-id assumption above) — confirmed
   *    against real designerData shapes (`se-<n>` in free-mode, `e<n>` in preset
   *    templates), see public/flexible-designer.html's `subElements.find(s => s.id
   *    === ...)` call sites.
   * 2. The scale ratio for an appended sub-element is the TARGET block's own
   *    current width over the SOURCE block's own width (not a canvas-level ratio)
   *    — the target block's geometry is never touched by this function, so an
   *    appended child must be scaled against the box it is actually landing in,
   *    not the box its source block happened to have.
   *
   * FAILURE MODES this fixes (see docs/main-cms-sync-prompt.md entry for this fix):
   * - A block present on Tablet/Mobile with fewer subElements than Desktop's same
   *   block id permanently showed only the stale subset (missing heading/icon/
   *   paragraph) — this was the actual cause of "half the content missing on
   *   toggle", not a missing top-level block in the confirmed repro case.
   * - A container block (text-block/card) renders its own background box only
   *   when subElements.length === 0 (FlexibleSectionRenderer.tsx); a stale lower
   *   sub-element count on Tablet/Mobile could flip that render branch and show
   *   an extra background box Desktop never had. Backfilling the missing
   *   sub-elements here also fixes that render-branch mismatch as a side effect.
   *
   * @param {Object} targetBlock - a block already present in the target array (untouched).
   * @param {{desktop?:Object|null,tablet?:Object|null,mobile?:Object|null}} variants - source blobs.
   * @param {'desktop'|'tablet'|'mobile'} targetKey
   * @param {number} dstW - target canvas width (for placeSub's on-canvas check).
   * @param {number} dstH - target canvas height (for placeSub's on-canvas check).
   * @returns {Object} targetBlock unchanged (SAME reference) if nothing was missing,
   *   else a NEW shallow-copied block whose subElements is targetBlock's own array
   *   (same items, same order, same references) concatenated with the appended clones.
   */
  function unionBlockSubElements(targetBlock, variants, targetKey, dstW, dstH) {
    var existingSubs = Array.isArray(targetBlock.subElements) ? targetBlock.subElements : [];
    var seenSub = {};
    for (var s = 0; s < existingSubs.length; s++) {
      var sb = existingSubs[s];
      if (sb && typeof sb === "object" && sb.id !== undefined && sb.id !== null) {
        seenSub[String(sb.id)] = true;
      }
    }

    var g = readGeom(targetBlock); // target block's OWN existing geometry — never touched
    var appended = [];
    var order = ["desktop", "tablet", "mobile"];
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      if (key === targetKey) continue;
      var src = variants[key];
      if (!src || !Array.isArray(src.blocks)) continue;
      var srcBlock = null;
      for (var j = 0; j < src.blocks.length; j++) {
        var cand = src.blocks[j];
        if (cand && typeof cand === "object" && cand.id !== undefined && cand.id !== null &&
            String(cand.id) === String(targetBlock.id)) {
          srcBlock = cand;
          break;
        }
      }
      if (!srcBlock || !Array.isArray(srcBlock.subElements)) continue;
      var srcG = readGeom(srcBlock);
      var r = srcG.w > 0 ? g.w / srcG.w : 1;
      for (var k = 0; k < srcBlock.subElements.length; k++) {
        var sub = srcBlock.subElements[k];
        if (!sub || typeof sub !== "object" || sub.id === undefined || sub.id === null) continue;
        var subId = String(sub.id);
        if (seenSub[subId]) continue;
        seenSub[subId] = true;
        // Full deep clone FIRST (content/props/icon-src/colour survive verbatim),
        // geometry overwritten on top by scaleSub/placeSub — same pattern as
        // scaleBlockToCanvas's JSON.parse(JSON.stringify(block)) below.
        var clone = JSON.parse(JSON.stringify(sub));
        appended.push(placeSub(scaleSub(clone, r), targetBlock, g, dstW, dstH));
      }
    }

    if (appended.length === 0) return targetBlock; // nothing missing — same reference
    var out = Object.assign({}, targetBlock);
    out.subElements = existingSubs.concat(appended);
    return out;
  }

  /**
   * reconcileVariantBlocks(targetBlocks, variants, targetKey, dims): pure, ADDITIVE.
   *
   * ASSUMPTIONS:
   *   1. Block ids are unique within a variant and stable across variants.
   *   2. Source and target blocks are in the same shape (both LIVE in the
   *      Designer, both PERSISTED in the renderer); an appended clone keeps its
   *      source shape.
   *   3. variants[targetKey] is only read for the target canvas box (its
   *      .blocks are ignored; `targetBlocks` is the target list).
   * FAILURE MODES:
   *   - missing/NaN canvas dims -> breakpoint defaults (1440/768/375 x 900);
   *   - null/garbage block entries in a source -> skipped; in the target -> kept as-is;
   *   - zero/negative/NaN source geometry -> min-size floor + clamp.
   *
   * @param {Array<Object>|null} targetBlocks - target variant blocks; [] / null for a fresh seed.
   * @param {{desktop?:Object|null,tablet?:Object|null,mobile?:Object|null}} variants - source blobs (+ target blob for its dims).
   * @param {'desktop'|'tablet'|'mobile'} targetKey
   * @param {{srcW?:number,dstW?:number,dstH?:number}} [dims] - dstW/dstH override the target box; srcW overrides the DESKTOP source width only.
   * @returns {Array<Object>} NEW array: every existing target block at the SAME
   *   index in the SAME order — the SAME reference when it already has every
   *   sub-element another variant has for that block id, else a new shallow
   *   copy with the missing sub-elements unioned in (see unionBlockSubElements)
   *   — then appended clones of whole block ids missing entirely (Desktop
   *   first, then the other variant).
   */
  function reconcileVariantBlocks(targetBlocks, variants, targetKey, dims) {
    variants = variants || {};
    dims = dims || {};
    var target = Array.isArray(targetBlocks) ? targetBlocks : [];
    var dstBox = variantCanvasDims(variants[targetKey], targetKey);
    var dstW = Number(dims.dstW) > 0 ? Number(dims.dstW) : dstBox.w;
    var dstH = Number(dims.dstH) > 0 ? Number(dims.dstH) : dstBox.h;

    var seen = {};
    for (var t = 0; t < target.length; t++) {
      var tb0 = target[t];
      if (tb0 && tb0.id !== undefined && tb0.id !== null) seen[String(tb0.id)] = true;
    }

    // Existing blocks stay at the same index, same order — union missing
    // sub-elements into each (same reference back when there's nothing to add).
    var result = target.map(function (tb) {
      if (!tb || typeof tb !== "object" || tb.id === undefined || tb.id === null) return tb;
      return unionBlockSubElements(tb, variants, targetKey, dstW, dstH);
    });

    var order = ["desktop", "tablet", "mobile"];
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      if (key === targetKey) continue;
      var src = variants[key];
      if (!src || !Array.isArray(src.blocks)) continue;
      var srcW = key === "desktop" && Number(dims.srcW) > 0 ? Number(dims.srcW) : variantCanvasDims(src, key).w;
      for (var j = 0; j < src.blocks.length; j++) {
        var b = src.blocks[j];
        if (!b || typeof b !== "object" || b.id === undefined || b.id === null) continue;
        var id = String(b.id);
        if (seen[id]) continue;
        seen[id] = true;
        result.push(scaleBlockToCanvas(b, { w: srcW }, { w: dstW, h: dstH }));
      }
    }
    return result;
  }

  // 2026-09-21 (SUPERSEDED — see docs/main-cms-sync-prompt.md): blocksChanged()
  // used to detect whether reconcileVariantBlocks() actually changed a non-active
  // variant (by reference, not just length) so callers could skip a no-op write.
  // Removed — its only callers (buildJson's/applySnapshot's/setDevicePreview's
  // ongoing non-active-variant reconcile, and FlexibleSectionRenderer's self-heal)
  // were all removed per the same decision; reconcileVariantBlocks() itself is
  // still used, but only at one-time seed, where its result is always written.

  /** Returns a new block array without `id` (string-compared). Pure. */
  function removeBlockId(blocks, id) {
    if (!Array.isArray(blocks)) return blocks;
    return blocks.filter(function (b) { return !b || String(b.id) !== String(id); });
  }

  function serializeVariants(variants) {
    variants = variants || {};
    return {
      variant: "per-breakpoint",
      desktop: variants.desktop || null,
      tablet: variants.tablet || null,
      mobile: variants.mobile || null,
    };
  }

  return {
    resolveVariants: resolveVariants,
    pickBreakpointForWidth: pickBreakpointForWidth,
    pickActiveVariant: pickActiveVariant,
    isVariantAuthored: isVariantAuthored,
    usesReflowLayout: usesReflowLayout,
    pickLiveVariant: pickLiveVariant,
    duplicateVariant: duplicateVariant,
    clampBlocksToCanvas: clampBlocksToCanvas,
    variantCanvasDims: variantCanvasDims,
    scaleBlockToCanvas: scaleBlockToCanvas,
    reconcileVariantBlocks: reconcileVariantBlocks,
    removeBlockId: removeBlockId,
    serializeVariants: serializeVariants,
  };
});
