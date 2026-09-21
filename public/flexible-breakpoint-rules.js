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

  // ── Additive cross-breakpoint reconciliation (2026-09-21, re-land of c75fcce) ──
  // REQUIREMENT (hard, two halves):
  //   1. an element never disappears from any breakpoint canvas or the live page
  //      unless the user deleted it (delete removes it from all three);
  //   2. an element stays EXACTLY where the user put it.
  // The first attempt (c75fcce, reverted in 4f69022) broke half 2: it "healed"
  // blocks/sub-elements that were ALREADY in the target (sub-elements are FREE
  // children, legitimately outside their parent box, so the heal clamped them
  // back on every autosave) and wrote its output back into the Designer live
  // state.blocks. This version is PURELY ADDITIVE.
  //
  // INVARIANTS:
  //   - every block already in the target is returned as the SAME object
  //     reference, same order, geometry untouched: no heal, no clamp, ever;
  //   - only ids missing from the target are appended (scaled + clamped clones);
  //   - inputs are never mutated; appended clones share no refs with sources.
  // Callers (Designer) must additionally never pass the ACTIVE breakpoint live
  // state.blocks as a target: only non-active variants are reconciled.

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
   * @returns {Array<Object>} NEW array: every existing target block as the SAME reference in the SAME order, then appended clones of missing ids (Desktop first, then the other variant).
   */
  function reconcileVariantBlocks(targetBlocks, variants, targetKey, dims) {
    variants = variants || {};
    dims = dims || {};
    var target = Array.isArray(targetBlocks) ? targetBlocks : [];
    var dstBox = variantCanvasDims(variants[targetKey], targetKey);
    var dstW = Number(dims.dstW) > 0 ? Number(dims.dstW) : dstBox.w;
    var dstH = Number(dims.dstH) > 0 ? Number(dims.dstH) : dstBox.h;

    var seen = {};
    var result = target.slice(); // existing blocks: same refs, same order, untouched
    for (var t = 0; t < target.length; t++) {
      var tb = target[t];
      if (tb && tb.id !== undefined && tb.id !== null) seen[String(tb.id)] = true;
    }

    var order = ["desktop", "tablet", "mobile"];
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      if (key === targetKey) continue;
      var src = variants[key];
      if (!src || !Array.isArray(src.blocks)) continue;
      var srcW = key === "desktop" && Number(dims.srcW) > 0 ? Number(dims.srcW) : variantCanvasDims(src, key).w;
      var r = srcW > 0 ? dstW / srcW : 1;
      for (var j = 0; j < src.blocks.length; j++) {
        var b = src.blocks[j];
        if (!b || typeof b !== "object" || b.id === undefined || b.id === null) continue;
        var id = String(b.id);
        if (seen[id]) continue;
        seen[id] = true;
        result.push(scaleAndClampBlock(JSON.parse(JSON.stringify(b)), r, dstW, dstH));
      }
    }
    return result;
  }

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
    duplicateVariant: duplicateVariant,
    clampBlocksToCanvas: clampBlocksToCanvas,
    variantCanvasDims: variantCanvasDims,
    reconcileVariantBlocks: reconcileVariantBlocks,
    removeBlockId: removeBlockId,
    serializeVariants: serializeVariants,
  };
});
