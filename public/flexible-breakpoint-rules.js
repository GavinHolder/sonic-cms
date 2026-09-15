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

  function serializeVariants(variants) {
    variants = variants || {};
    return {
      variant: "per-breakpoint",
      desktop: variants.desktop || null,
      tablet: variants.tablet || null,
      mobile: variants.mobile || null,
    };
  }

  // ── Cross-breakpoint reconciliation (2026-09-15) ───────────────────────────
  // REQUIREMENT (hard): an element must NEVER disappear from any breakpoint
  // canvas or the live page unless the user deleted it. Before this, a variant
  // was seeded from Desktop exactly ONCE and never written to again — a block
  // added on Desktop after Tablet/Mobile had been seeded existed only in
  // Desktop, and the seed CLAMPED (never scaled) blocks and ignored
  // sub-elements, so a sub-element authored at x=600 inside a block shrunk to
  // 375px sat off-canvas — invisible and undraggable on both the canvas and the
  // live plate. reconcileVariantBlocks() is the ONE shared implementation of
  // "make this variant's block list complete and on-canvas"; the Designer
  // (seed / breakpoint switch / save / undo) and the live renderer (self-heal
  // of stale persisted data) both call it — no hand copies, per CLAUDE.md's
  // ONE SYSTEM PER CONCERN rule.

  var DEFAULT_CANVAS_W = { desktop: 1440, tablet: 768, mobile: 375 };
  var DEFAULT_CANVAS_H = 900;   // mirrors DESIGN_H in both consumers
  var MIN_BLOCK_W = 40;
  var MIN_BLOCK_H = 24;
  var MIN_SUB_W = 40;           // reserved visible width/height for a sub-element
  var MIN_SUB_H = 24;
  var BLOCK_BORDER = 2;         // .container-block border — see computeSubElementPosition

  function defaultCanvasWFor(key) {
    return DEFAULT_CANVAS_W[key] || DEFAULT_CANVAS_W.desktop;
  }

  /**
   * The FULL authored canvas box of one variant blob: designerCanvasW (or the
   * breakpoint default) × designerCanvasH (or 900), the latter multiplied by
   * multiLimit for multi-mode — the same `perSectionH * multiLimit` the
   * Designer's canvas element is sized to. Never returns 0/NaN.
   */
  function variantCanvasDims(variant, key) {
    var v = variant || {};
    var w = Number(v.designerCanvasW);
    var h = Number(v.designerCanvasH);
    if (!(w > 0)) w = defaultCanvasWFor(key);
    if (!(h > 0)) h = DEFAULT_CANVAS_H;
    var bands = v.contentMode === "multi" ? (Number(v.multiLimit) || 1) : 1;
    return { w: w, h: h * Math.max(1, bands) };
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function num(v, fallback) {
    var n = Number(v);
    return typeof v === "number" || (typeof v === "string" && v !== "") ? (isNaN(n) ? fallback : n) : fallback;
  }

  // Blocks travel in two shapes (see flexible-designer.html's
  // serializeBlocksForVariant doc): LIVE {x,y,w,h} and PERSISTED {pixelPos:{x,y,w,h}}.
  // Read from whichever is present; write back to every shape the block carries
  // so neither consumer's reader ever sees a stale copy.
  function readGeom(block) {
    var pp = block && block.pixelPos && typeof block.pixelPos === "object" ? block.pixelPos : null;
    return {
      x: num(pp ? pp.x : block.x, num(block.x, 0)),
      y: num(pp ? pp.y : block.y, num(block.y, 0)),
      w: num(pp ? pp.w : block.w, num(block.w, 300)),
      h: num(pp ? pp.h : block.h, num(block.h, 180)),
    };
  }

  function writeGeom(block, g) {
    var out = Object.assign({}, block);
    var hasPP = block && block.pixelPos && typeof block.pixelPos === "object";
    var hasTop = typeof block.x === "number" || typeof block.y === "number" || typeof block.w === "number" || typeof block.h === "number";
    if (hasPP) out.pixelPos = Object.assign({}, block.pixelPos, { x: g.x, y: g.y, w: g.w, h: g.h });
    if (hasTop || !hasPP) { out.x = g.x; out.y = g.y; out.w = g.w; out.h = g.h; }
    return out;
  }

  function padXOf(block) {
    var p = (block && block.props) || {};
    return p.paddingX !== undefined && p.paddingX !== null ? (Number(p.paddingX) || 0) : 20;
  }

  function clampBlockGeom(g, dstW, dstH) {
    var w = g.w > 0 ? g.w : MIN_BLOCK_W;
    var h = g.h > 0 ? g.h : MIN_BLOCK_H;
    if (w > dstW) w = dstW;
    if (h > dstH) h = dstH;
    w = Math.round(Math.max(Math.min(MIN_BLOCK_W, dstW), w));
    h = Math.round(Math.max(Math.min(MIN_BLOCK_H, dstH), h));
    return {
      x: Math.max(0, Math.min(Math.round(g.x), dstW - w)),
      y: Math.max(0, Math.min(Math.round(g.y), dstH - h)),
      w: w,
      h: h,
    };
  }

  // Inner box a sub-element may occupy inside its block (block minus 2px border
  // both sides minus paddingX both sides; vertically the block height).
  function subBounds(block, g) {
    var padX = padXOf(block);
    return {
      maxX: Math.max(0, g.w - 2 * BLOCK_BORDER - 2 * padX - MIN_SUB_W),
      maxY: Math.max(0, g.h - MIN_SUB_H),
    };
  }

  function clampSub(sub, bounds) {
    var out = Object.assign({}, sub);
    out.x = Math.max(0, Math.min(Math.round(num(sub.x, 0)), bounds.maxX));
    out.y = Math.max(0, Math.min(Math.round(num(sub.y, 0)), bounds.maxY));
    return out;
  }

  function subFullyOutside(sub, bounds) {
    var x = num(sub.x, 0), y = num(sub.y, 0);
    var w = num(sub.w, 0), h = num(sub.h, 0);
    return x > bounds.maxX || y > bounds.maxY || (w > 0 && x + w <= 0) || (h > 0 && y + h <= 0);
  }

  function blockFullyOutside(g, dstW, dstH) {
    return g.w <= 0 || g.h <= 0 || g.x >= dstW || g.y >= dstH || g.x + g.w <= 0 || g.y + g.h <= 0;
  }

  function scaleSub(sub, r) {
    var out = Object.assign({}, sub);
    if (typeof sub.x === "number") out.x = Math.round(sub.x * r);
    if (typeof sub.y === "number") out.y = Math.round(sub.y * r);
    if (typeof sub.w === "number") out.w = Math.max(1, Math.round(sub.w * r));
    if (typeof sub.h === "number") out.h = Math.max(1, Math.round(sub.h * r));
    return out;
  }

  /**
   * Scale a block (and its sub-elements) from a srcW-wide canvas onto a
   * dstW-wide one, then clamp everything on-canvas / in-block.
   */
  function scaleAndClampBlock(block, r, dstW, dstH) {
    var g = readGeom(block);
    var scaled = clampBlockGeom({ x: g.x * r, y: g.y * r, w: g.w * r, h: g.h * r }, dstW, dstH);
    var out = writeGeom(block, scaled);
    if (Array.isArray(block.subElements)) {
      var b = subBounds(block, scaled);
      out.subElements = block.subElements.map(function (sub) {
        return clampSub(scaleSub(sub, r), b);
      });
    }
    return out;
  }

  /**
   * Heal a block that already exists in the target: leave it exactly as the
   * user positioned it UNLESS it is fully outside the canvas / zero-sized, in
   * which case clamp it back into view. Same off-block check for sub-elements.
   */
  function healPresentBlock(block, dstW, dstH) {
    var g = readGeom(block);
    var out = block;
    var geom = g;
    if (blockFullyOutside(g, dstW, dstH)) {
      geom = clampBlockGeom(g, dstW, dstH);
      out = writeGeom(block, geom);
    }
    if (Array.isArray(block.subElements)) {
      var b = subBounds(block, geom);
      var changed = false;
      var subs = block.subElements.map(function (sub) {
        if (sub && subFullyOutside(sub, b)) { changed = true; return clampSub(sub, b); }
        return sub;
      });
      if (changed) out = Object.assign({}, out, { subElements: subs });
    }
    return out;
  }

  /**
   * reconcileVariantBlocks(targetBlocks, variants, targetKey, dims) — pure.
   *
   * Returns a NEW block array for `targetKey` that contains EVERY block id
   * present in ANY of variants.desktop/tablet/mobile:
   *   - ids already in `targetBlocks` keep their order and their user-authored
   *     geometry untouched (healed only if fully off-canvas / zero-sized);
   *   - ids missing from the target are deep-cloned from Desktop when Desktop
   *     has them, else from whichever variant does, scaled by dstW/srcW (block
   *     x/y/w/h AND every sub-element's x/y/w/h) and clamped fully on-canvas
   *     with every sub-element clamped inside its block; appended in source
   *     order after the existing ones.
   * A block deleted from every variant is therefore absent from the result —
   * deletion propagates by the caller deleting from every variant (removeBlock).
   *
   * @param {Array<Object>|null} targetBlocks - Target variant's current blocks (LIVE or PERSISTED shape); [] / null for a fresh seed.
   * @param {{desktop:Object|null,tablet:Object|null,mobile:Object|null}} variants - All variant blobs (each with .blocks and canvas dims).
   * @param {'desktop'|'tablet'|'mobile'} targetKey
   * @param {{srcW?:number,srcH?:number,dstW?:number,dstH?:number}} [dims] - Optional overrides. dstW/dstH default to the target variant's own canvas box; srcW/srcH override the DESKTOP source box only (other sources always use their own variant's box).
   * @returns {Array<Object>} New array; inputs are never mutated and no object refs are shared with other variants.
   */
  function reconcileVariantBlocks(targetBlocks, variants, targetKey, dims) {
    variants = variants || {};
    dims = dims || {};
    var target = Array.isArray(targetBlocks) ? targetBlocks : [];
    var dstBox = variantCanvasDims(variants[targetKey], targetKey);
    var dstW = Number(dims.dstW) > 0 ? Number(dims.dstW) : dstBox.w;
    var dstH = Number(dims.dstH) > 0 ? Number(dims.dstH) : dstBox.h;

    var seen = {};
    var result = target.map(function (b) {
      if (b && b.id !== undefined && b.id !== null) seen[String(b.id)] = true;
      return healPresentBlock(b, dstW, dstH);
    });

    var order = ["desktop", "tablet", "mobile"];
    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      if (key === targetKey) continue;
      var src = variants[key];
      if (!src || !Array.isArray(src.blocks)) continue;
      var srcBox = variantCanvasDims(src, key);
      var srcW = key === "desktop" && Number(dims.srcW) > 0 ? Number(dims.srcW) : srcBox.w;
      var r = srcW > 0 ? dstW / srcW : 1;
      for (var j = 0; j < src.blocks.length; j++) {
        var b = src.blocks[j];
        if (!b || b.id === undefined || b.id === null) continue;
        var id = String(b.id);
        if (seen[id]) continue;
        seen[id] = true;
        result.push(scaleAndClampBlock(deepClone(b), r, dstW, dstH));
      }
    }
    return result;
  }

  return {
    resolveVariants: resolveVariants,
    pickBreakpointForWidth: pickBreakpointForWidth,
    pickActiveVariant: pickActiveVariant,
    duplicateVariant: duplicateVariant,
    clampBlocksToCanvas: clampBlocksToCanvas,
    serializeVariants: serializeVariants,
    variantCanvasDims: variantCanvasDims,
    reconcileVariantBlocks: reconcileVariantBlocks,
  };
});
