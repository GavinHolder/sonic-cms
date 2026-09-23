/**
 * flexible-render-rules.js
 *
 * Shared, framework-agnostic style/position computation for FLEXIBLE-section
 * sub-elements (heading, paragraph, button) — a single source of truth for
 * what these three sub-element types look like, consumed identically by:
 *   1. public/flexible-designer.html                    (vanilla JS, <script> global)
 *   2. components/sections/FlexibleSectionRenderer.tsx   (ES module import)
 *
 * WHY THIS FILE EXISTS: on 2026-09-10 three separate live-page bugs (a font
 * mismatch, a button box-model mismatch, and a z-index gap — commits
 * 499ab71, 6f23100, 679a75d) all traced back to the same root cause: the
 * Designer canvas (public/flexible-designer.html) and the live renderer
 * (components/sections/FlexibleSectionRenderer.tsx) are two independently
 * hand-maintained implementations of "what a sub-element looks like," with
 * no shared source of truth, so any property either side sets can silently
 * drift from the other. This file is step one of closing that gap: it is a
 * PURE EXTRACTION of the CURRENT (post-fix) behavior of both sides for
 * heading, paragraph and button sub-elements — no behavior was changed
 * while writing it. Font and button box-model got this shared-module
 * treatment immediately; z-index was only fixed ad hoc at the time (each
 * side kept its own hand-copy of `block.zIndex ?? (index + 1)` /
 * `block.zIndex || 1`) and finally received the same treatment on
 * 2026-09-23 (`restampBlockZIndexes` / `resolveBlockZIndex` below), once a
 * follow-up audit confirmed the gap had never actually been closed.
 *
 * Scope: heading / paragraph / button sub-element STYLE, the free-canvas
 * container-block sub-element WRAPPER POSITION formula, top-level BLOCK
 * STACKING ORDER (z-index — `restampBlockZIndexes` / `resolveBlockZIndex`),
 * and (2026-09-11, `computeMultiBgLayers`) the free+multi/dynamic section
 * BACKGROUND-IMAGE LAYER GEOMETRY for the opt-in "repeat per section" mode.
 * Everything else (image/badge/icon/divider, outline/shadow filters,
 * animation, and all other block-level layout — position, sizing, padding,
 * grid/flex placement) is untouched and stays in each consumer.
 *
 * Loadable two ways (UMD-lite):
 *   - As a plain <script> tag → exposes window.FlexibleRenderRules.
 *   - As an ES module (`import { computeSubElementStyle } from
 *     "../../public/flexible-render-rules.js"`) from FlexibleSectionRenderer.tsx.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  } else {
    root.FlexibleRenderRules = mod;
  }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  /**
   * Fluid font-size clamp for the free-reflow MOBILE path only — never
   * exercised by the Designer canvas, which is always desktop 1:1. Ported
   * verbatim from FlexibleSectionRenderer.tsx's own `mobileFontClamp`
   * (which stays defined there too, unchanged, since it is also used by the
   * out-of-scope `icon` sub-element case that this refactor does not touch).
   */
  function mobileFontClamp(px) {
    var floor = Math.round(Math.min(Math.max(14, px * 0.5), 44));
    var vw = (px / 14.4) * 1.55;
    return "clamp(" + floor + "px, " + vw.toFixed(2) + "vw, " + px + "px)";
  }

  /**
   * Drops undefined-valued keys. An explicit `el.style.prop = undefined`
   * coerces to the string "undefined", which is invalid CSS and is simply
   * ignored by the browser (a no-op) — but omitting the key outright is
   * unambiguous everywhere and matches how React already treats an
   * `undefined` style value, so both consumers get identical behavior.
   */
  function stripUndefined(obj) {
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) out[k] = obj[k];
    }
    return out;
  }

  /**
   * Serializes a camelCase style object (as returned by
   * computeSubElementStyle) into an inline CSS text fragment
   * ("font-size:22px;color:#212529;..."), for consumers that build markup
   * via HTML strings rather than direct `element.style.xxx =` assignment
   * (public/flexible-designer.html's heading/paragraph branches do this).
   */
  function styleObjectToCssText(styleObj) {
    var parts = [];
    for (var key in styleObj) {
      if (!Object.prototype.hasOwnProperty.call(styleObj, key)) continue;
      var val = styleObj[key];
      if (val === undefined || val === null || val === "") continue;
      var kebab = key.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); });
      parts.push(kebab + ":" + val + ";");
    }
    return parts.join("");
  }

  /**
   * computeSubElementStyle(type, props, opts) — pure function. Returns a
   * plain object of camelCase style properties (the same keys React's
   * `style` prop and `element.style.xxx` both use) for the given
   * sub-element `type` ('heading' | 'paragraph' | 'button') and its stored
   * `props`. Values with no effect are omitted (see stripUndefined) rather
   * than emitted as `undefined`, so the result is safe to feed directly
   * into either `style={{...result}}` (React) or
   * `Object.assign(el.style, result)` (vanilla DOM).
   *
   * opts:
   *   exact   — free-canvas / Designer-canvas 1:1 mode. Resolves unset
   *             typography props to the Designer canvas's own defaults
   *             (left align, line-height 1.2 heading / 1.6 paragraph,
   *             letter-spacing 0, text-transform none, #212529 text,
   *             pre-wrap/normal white-space + break-word) instead of
   *             leaving them unset (which would inherit the page theme).
   *             The Designer canvas ALWAYS passes exact:true.
   *   mobile  — free-reflow MOBILE mode (renderer only — the Designer
   *             canvas never passes this). Fluid font-size via
   *             mobileFontClamp instead of a fixed px value.
   *   darkBg  — with `exact`, suppresses the #212529 default text colour on
   *             a dark section background so it isn't near-invisible.
   *             Renderer only — the Designer canvas has no equivalent
   *             concept (its own canvas background is always light) and
   *             never passes this.
   *
   * ASSUMPTIONS:
   * 1. `props` is the sub-element's own `.props` object, already
   *    {{pkg.*}}-token-resolved by the caller if applicable — this
   *    function does not resolve tokens itself.
   * 2. Outline-text and text-shadow (the #95 feature) are NOT part of this
   *    function's output. Both consumers keep applying their own
   *    outline/shadow fragment AFTER this function's result, exactly as
   *    before, because that feature involves side-effecting SVG filter
   *    definitions (DOM node injection on the canvas side, React refs +
   *    <defs> on the renderer side) — not pure style data.
   * 3. Block-level layout spacing (marginBottom/marginTop, driven by the
   *    renderer's `hasShell`) is NOT part of this function's output — the
   *    Designer canvas has no equivalent (every sub-element is positioned
   *    with explicit stored x/y), so this was never actually duplicated
   *    logic to begin with.
   *
   * FAILURE MODES:
   * - A caller passing already-broken `props` (e.g. fontSize as a
   *   non-numeric string) falls back to `Number(x) || default`, i.e. NaN
   *   coerces to the same default both sides already used — no new failure
   *   mode is introduced beyond what each side already had before this
   *   extraction.
   */
  function computeSubElementStyle(type, props, opts) {
    var p = props || {};
    opts = opts || {};
    var exact = !!opts.exact;
    var mobile = !!opts.mobile;
    var darkBg = !!opts.darkBg;

    if (type === "heading") {
      var hFontNum = Number(p.fontSize) || 22;
      return stripUndefined({
        fontSize: mobile ? mobileFontClamp(hFontNum) : (hFontNum + "px"),
        fontFamily: p.fontFamily || undefined,
        fontWeight: p.fontWeight || "700",
        color: p.color || (exact && !darkBg ? "#212529" : undefined),
        textAlign: p.textAlign || (exact ? "left" : undefined),
        lineHeight: p.lineHeight !== undefined ? Number(p.lineHeight) : (exact ? 1.2 : undefined),
        letterSpacing: p.letterSpacing !== undefined ? (Number(p.letterSpacing) + "px") : (exact ? "0px" : undefined),
        textTransform: p.textTransform || (exact ? "none" : undefined),
        whiteSpace: exact ? (p.textWrap || "normal") : undefined,
        overflowWrap: exact ? "break-word" : undefined,
      });
    }

    if (type === "paragraph") {
      var pFontNum = Number(p.fontSize) || (exact ? 14 : 15);
      var constrainWidth = !exact && !mobile && !!p.maxWidth && Number(p.maxWidth) > 0;
      return stripUndefined({
        fontSize: mobile ? mobileFontClamp(Number(p.fontSize) || 15) : (pFontNum + "px"),
        fontFamily: p.fontFamily || undefined,
        fontWeight: p.fontWeight || undefined,
        color: p.color || (exact && !darkBg ? "#212529" : undefined),
        textAlign: p.textAlign || (exact ? "left" : undefined),
        lineHeight: p.lineHeight !== undefined ? Number(p.lineHeight) : (exact ? 1.6 : 1.65),
        letterSpacing: p.letterSpacing !== undefined ? (Number(p.letterSpacing) + "px") : (exact ? "0px" : undefined),
        textTransform: p.textTransform || (exact ? "none" : undefined),
        maxWidth: constrainWidth ? (Number(p.maxWidth) + "px") : undefined,
        marginLeft: constrainWidth ? "auto" : undefined,
        marginRight: constrainWidth ? "auto" : undefined,
        whiteSpace: exact ? (p.textWrap || "pre-wrap") : undefined,
        overflowWrap: exact ? "break-word" : undefined,
      });
    }

    if (type === "button") {
      var px = p.paddingX !== undefined ? Number(p.paddingX) : 20;
      var py = p.paddingY !== undefined ? Number(p.paddingY) : 8;
      var br = p.borderRadius !== undefined ? (Number(p.borderRadius) + "px") : "6px";
      var mt = p.marginTop !== undefined ? (Number(p.marginTop) + "px") : "4px";
      return stripUndefined({
        display: exact ? "block" : "inline-block",
        textAlign: exact ? "center" : undefined,
        alignSelf: !exact ? "center" : undefined,
        width: !exact ? "fit-content" : undefined,
        background: p.bgColor || "#0d6efd",
        color: p.textColor || "#fff",
        padding: py + "px " + px + "px",
        borderRadius: br,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: exact ? "12px" : "14px",
        marginTop: mt,
      });
    }

    if (type === "eyebrow") {
      // Eyebrow (small uppercase label). Defaults are the Designer canvas's own
      // (createSubElementDOM 'eyebrow' case, public/flexible-designer.html):
      // #0d6efd / 13px / 700 / left / uppercase / 2px tracking / 1.4 line-height.
      // The live renderer had NO eyebrow branch at all until 2026-09-15 (the type
      // was added to the Designer on 2026-07-03, #67, and fell into DesignerSubElement's
      // "unknown type -> null" default), so every canvas-placed eyebrow rendered nothing
      // on the live page. Both consumers now read these defaults from here.
      var eFontNum = Number(p.fontSize) || 13;
      return stripUndefined({
        fontSize: mobile ? mobileFontClamp(eFontNum) : (eFontNum + "px"),
        fontFamily: p.fontFamily || undefined,
        fontWeight: p.fontWeight || "700",
        color: p.color || "#0d6efd",
        textAlign: p.textAlign || "left",
        textTransform: p.textTransform || "uppercase",
        letterSpacing: (p.letterSpacing !== undefined && p.letterSpacing !== null) ? (Number(p.letterSpacing) + "px") : "2px",
        lineHeight: Number(p.lineHeight) || 1.4,
      });
    }

    return {};
  }

  /**
   * computeSubElementPosition(pos, sub, blockProps) — pure function.
   * Returns the ABSOLUTE-pixel wrapper geometry (position/left/top/width/
   * height/minWidth/padding/border/boxSizing) for one sub-element inside a
   * FREE-CANVAS container block (text / text-block / card), exactly as
   * FlexibleSectionRenderer.tsx's DesignerBlocksRenderer free-canvas plate
   * branch computes it today: block position + the container's own 2px
   * border + its content padding + the sub-element's own stored x/y/w/h.
   *
   * NOT wired into public/flexible-designer.html. The Designer canvas
   * reaches the identical ON-SCREEN pixel position through ordinary CSS
   * nesting instead: `.container-block` is positioned + bordered (2px),
   * `.cb-content` inside it is padded (paddingTop/paddingX), and
   * `.sub-element` is absolutely positioned within that padded box at a
   * bare `se.x`/`se.y` — the browser's own box model already adds the
   * block position + border + padding for free. Feeding this function's
   * ABSOLUTE formula into that already-nested DOM would double-count the
   * offset and visibly mis-place every sub-element, so the canvas keeps
   * its existing (already-correct, already-single-source-via-CSS) relative
   * x/y/w assignment untouched. The wrapper's own padding/border/
   * boxSizing/minWidth values this function returns are verified identical
   * to the Designer's `.sub-element` CSS class (border 1px solid
   * transparent, padding 6px 10px, box-sizing border-box, min-width 60px)
   * — just expressed via a CSS class there instead of inline style, which
   * is already a single source of truth on that side.
   *
   * ASSUMPTIONS:
   * 1. `pos` is the container block's pixelPos ({x,y,w,h} in design px).
   * 2. `blockProps` is the container block's own `.props`, read for
   *    paddingTop (default 16) / paddingX (default 20) exactly like the
   *    renderer already does.
   * 3. `sub` is one SubEl ({x,y,w,h} in design px; any may be null/undefined).
   */
  function computeSubElementPosition(pos, sub, blockProps) {
    pos = pos || {};
    sub = sub || {};
    var bp = blockProps || {};
    var padT = Number(bp.paddingTop !== undefined && bp.paddingTop !== null ? bp.paddingTop : 16);
    var padX = Number(bp.paddingX !== undefined && bp.paddingX !== null ? bp.paddingX : 20);
    return {
      position: "absolute",
      left: (Number(pos.x) || 0) + 2 + padX + (Number(sub.x) || 0),
      top: (Number(pos.y) || 0) + 2 + padT + (Number(sub.y) || 0),
      width: sub.w != null ? sub.w : Math.max((Number(pos.w) || 0) - 2 * padX, 0),
      minWidth: 60,
      height: sub.h != null ? sub.h : undefined,
      padding: "6px 10px",
      border: "1px solid transparent",
      boxSizing: "border-box",
    };
  }

  /**
   * restampBlockZIndexes(blocks) — the app's ONLY z-order mechanism for
   * public/flexible-designer.html's free-canvas blocks: a block's position
   * in `state.blocks` IS its authoritative stacking order, and this stamps
   * that order onto each block's own `.zIndex` field (array index i → i+1)
   * so a renderer that only has ONE block object at a time (createBlockElement,
   * a single <DesignerBlock>) can still resolve its own stacking level
   * without needing the whole array.
   *
   * Consumers: public/flexible-designer.html's ~6 call sites that reorder
   * `state.blocks` (duplicate block, duplicate-to-breakpoint paste, drag
   * reorder in the Layers panel, replace/stack on drop, right-click
   * front/back/forward/backward) — each previously hand-wrote the exact
   * same `state.blocks.forEach((b,i)=> b.zIndex = i+1)` one-liner inline,
   * with a comment at each site asserting it's "the app's ONLY z-order
   * mechanism"; this function IS that mechanism, extracted once.
   *
   * NOT called by FlexibleSectionRenderer.tsx — the live renderer never
   * reorders blocks, it only READS each one's already-stamped `.zIndex` via
   * resolveBlockZIndex() below.
   *
   * ASSUMPTIONS:
   * 1. `blocks` is (a reference to) the live `state.blocks` array — the
   *    same object identity other Designer state (selection, autosave,
   *    undo/redo history snapshots taken via pushHistory() BEFORE the
   *    reorder) already depends on. This function deliberately MUTATES each
   *    block object's `.zIndex` in place (touches no other field, replaces
   *    no object, doesn't reassign `blocks` itself) rather than returning a
   *    new array — a deliberate, narrowly-scoped departure from this
   *    codebase's general immutability rule, because every existing call
   *    site already relied on in-place mutation of these exact object
   *    references; swapping to fresh objects here would desync them from
   *    state.blocks/selection/autosave, which is a much larger change than
   *    this extraction intends.
   *
   * FAILURE MODES:
   * - `blocks` is null/undefined/not an array → no-op (nothing to
   *   restamp), same as if the (nonexistent) forEach call sites were
   *   simply skipped.
   *
   * @param {Array<{zIndex?: number}>} blocks
   */
  function restampBlockZIndexes(blocks) {
    if (!Array.isArray(blocks)) return;
    blocks.forEach(function (b, i) { b.zIndex = i + 1; });
  }

  /**
   * resolveBlockZIndex(block, fallback) — pure function. Resolves ONE
   * top-level block's effective z-index for painting/stacking:
   *   1. A full-bleed Volt block (`block.props.fullBleed` truthy — the "use
   *      as background" toggle, see setVoltFullBleed() in
   *      flexible-designer.html) is forced to 0 so it always paints BEHIND
   *      every ordinary block, mirroring the live section where it renders
   *      as a section-level background layer beneath the content (see
   *      isFullBleedVolt() in FlexibleSectionRenderer.tsx).
   *   2. Otherwise, the block's own stored `.zIndex` (kept in sync with its
   *      `state.blocks` array position by restampBlockZIndexes() above, on
   *      the Designer canvas) wins.
   *   3. Otherwise (no `.zIndex` stored at all — e.g. a Template-imported
   *      section authored before this field existed, or a brand-new block
   *      not yet restamped), `fallback` — the caller's own best guess at
   *      this block's paint order, normally `index + 1` for whatever array
   *      it's iterating.
   *
   * Consumers:
   *   1. public/flexible-designer.html's createBlockElement() (canvas
   *      paint) and setVoltFullBleed() (immediate DOM z-index update on
   *      toggle) — both previously hand-wrote
   *      `block.props.fullBleed ? 0 : (block.zIndex || 1)`.
   *   2. FlexibleSectionRenderer.tsx's DesignerBlocksRenderer — 4 call
   *      sites (free-canvas container-block sub-elements, free-canvas
   *      plain block, grid-mode block, flex-mode block) that previously
   *      each hand-wrote `block.zIndex ?? (index + 1)`. Full-bleed Volt
   *      blocks never reach these call sites there (they're filtered out
   *      of `filteredBlocks` up-front by isFullBleedVolt() and painted
   *      separately as a section-level background layer instead), so
   *      branch 1 above is effectively Designer-canvas-only today — it's
   *      still applied here too so this function stays correct even if a
   *      future caller stops pre-filtering.
   *
   * ASSUMPTIONS:
   * 1. `block.props.fullBleed` is only ever set true on a `type: 'volt'`
   *    block (the only UI that writes it is the Volt block's own "use as
   *    background" checkbox) — this function doesn't additionally gate on
   *    `block.type === 'volt'`, for the SAME reason createBlockElement()'s
   *    original `block.props.fullBleed ? 0 : ...` check never did:
   *    preserving that exact pre-existing behavior rather than introducing
   *    a new, stricter condition as part of this extraction.
   *
   * FAILURE MODES:
   * - `block` null/undefined → treated as `{}`; falls through to
   *   `fallback` (or 1 if `fallback` is also omitted/non-numeric), never
   *   throws.
   *
   * @param {{type?: string, zIndex?: number, props?: {fullBleed?: boolean}}} [block]
   * @param {number} [fallback] - defaults to 1 when omitted/non-numeric.
   * @returns {number}
   */
  function resolveBlockZIndex(block, fallback) {
    var b = block || {};
    var props = b.props || {};
    if (props.fullBleed) return 0;
    if (typeof b.zIndex === "number" && isFinite(b.zIndex)) return b.zIndex;
    return typeof fallback === "number" && isFinite(fallback) ? fallback : 1;
  }

  /**
   * Neutralises a URL so it can't break out of a CSS `url('...')` context. Exact
   * duplicate of public/flexible-designer.html's own `cssUrl()` helper (see its
   * "SECURITY (#68)" comment) — re-implemented here rather than imported because
   * this module has zero DOM/window dependencies (see the file header) and must
   * stay callable as a bare function in both a <script> global and an ES import.
   */
  function sanitizeCssUrl(u) {
    return String(u == null ? "" : u).replace(/["'()\\\n\r]/g, "");
  }

  /**
   * computeMultiBgLayers(opts) — pure function. Computes the background-image
   * LAYER GEOMETRY for a free-canvas multi/dynamic section's background image —
   * one array entry per rendered `<div>`, for:
   *   1. public/flexible-designer.html's applySectionBgToCanvas() (canvas preview)
   *   2. FlexibleSectionRenderer.tsx's DesignerBlocksRenderer free-mode plate (live)
   *
   * DEFAULT (opts.repeat falsy): today's existing "cover the whole design" behavior
   * — a single `ch * multiLimit`-tall layer stretching one copy of the image across
   * every stacked 100vh band. This is the untouched, always-was-default path; single
   * mode already calls this with multiLimit 1, collapsing it to a `ch`-tall layer.
   *
   * OPT-IN (opts.repeat true — the "Repeat per section" toggle, default OFF):
   * `multiLimit` separate layers, each exactly `ch` tall and stacked back-to-back
   * (layer i's top = i*ch, i = 0..multiLimit-1), each showing the SAME image at its
   * own normal background-size/position/repeat — i.e. the image repeats once per
   * 100vh band instead of being stretched/zoomed across the whole design. Scoped to
   * free+multi/dynamic sections only — grid/preset/mosaic multi-mode sections never
   * call this with repeat:true (deliberately out of scope for this feature — YAGNI).
   *
   * SECURITY: returns PIECES — `backgroundImage` as an already-built, sanitized
   * `url('...')` string, plus plain backgroundSize/Position/Repeat/opacity/maskCss
   * values — for the CALLER to assign via style-PROPERTY (flexible-designer.html,
   * per its own "SECURITY (#68)" precedent) or a React style object
   * (FlexibleSectionRenderer.tsx). This function itself builds no HTML/markup and
   * touches no DOM, so it introduces no injection vector regardless of caller;
   * bgImageUrl is run through the same sanitizeCssUrl() neutralisation
   * flexible-designer.html's cssUrl() already applies to the single-layer case, so a
   * malicious Template-import URL can't break out of the url('...') wrapper here
   * either.
   *
   * ASSUMPTIONS:
   * 1. `opts.ch` is one band's height in design px — the Designer canvas's own
   *    `state.designerCanvasH || DESIGN_H`, or the renderer's resolved `ch`
   *    (`resolveCanvasDim(data.designerCanvasH, DESIGN_H)`) — both callers already
   *    compute this identically for the existing single-layer path.
   * 2. `opts.multiLimit` is the admin-set band count (2-10 in the UI; single mode
   *    passes/implies 1, collapsing repeat:true to one `ch`-tall layer — identical
   *    to the non-repeat single-layer result).
   * 3. bgImageSize/bgImagePosition/bgImageRepeat/bgImageOpacity get the SAME
   *    fallback defaults ('cover' / 'center' / 'no-repeat' / 100) each consumer
   *    already applied per-layer before this extraction — centralised here so
   *    neither consumer re-implements the fallback for the new multi-layer case.
   *    (The pre-existing single-layer call sites are NOT routed through this
   *    defaulting — they keep their own untouched, already-correct inline fallback,
   *    so today's default rendering stays byte-for-byte unchanged.)
   *
   * FAILURE MODES:
   * - opts.multiLimit missing/non-numeric/<1 → clamped to 1 (mirrors both
   *   consumers' own `state.multiLimit || 1` / `data.multiLimit || 1` guard), so
   *   repeat:true degrades to a single ch-tall layer instead of 0 layers or a
   *   negative-length loop.
   * - opts.ch missing/non-numeric → treated as 0 (Number(x) || 0). Both callers
   *   already guard against a zero/undefined canvas height upstream (DESIGN_H /
   *   resolveCanvasDim fallbacks) before this function ever sees `ch`, so this is
   *   defense-in-depth, not a new failure path this function introduces.
   * - opts.bgImageOpacity non-numeric (e.g. a corrupt Template-import value) falls
   *   back to opacity 1 (100%), the same "can't parse it, don't hide the image"
   *   default flexible-designer.html's own single-layer branch already uses.
   */
  function computeMultiBgLayers(opts) {
    opts = opts || {};
    var ch = Number(opts.ch) || 0;
    var multiLimit = Math.max(1, Number(opts.multiLimit) || 1);
    var repeat = !!opts.repeat;
    var size = opts.bgImageSize || "cover";
    var position = opts.bgImagePosition || "center";
    var imgRepeat = opts.bgImageRepeat || "no-repeat";
    var opN = Number(opts.bgImageOpacity);
    var opacity = (opts.bgImageOpacity == null || !Number.isFinite(opN)) ? 1 : opN / 100;
    var backgroundImage = opts.bgImageUrl ? "url('" + sanitizeCssUrl(opts.bgImageUrl) + "')" : undefined;
    var maskCss = opts.maskCss || undefined;

    if (!repeat) {
      return [{
        top: 0,
        height: ch * multiLimit,
        backgroundImage: backgroundImage,
        backgroundSize: size,
        backgroundPosition: position,
        backgroundRepeat: imgRepeat,
        opacity: opacity,
        maskCss: maskCss,
      }];
    }

    var layers = [];
    for (var i = 0; i < multiLimit; i++) {
      layers.push({
        top: i * ch,
        height: ch,
        backgroundImage: backgroundImage,
        backgroundSize: size,
        backgroundPosition: position,
        backgroundRepeat: imgRepeat,
        opacity: opacity,
        maskCss: maskCss,
      });
    }
    return layers;
  }

  /**
   * resolveBgPositionCss(x, y) — pure function. Converts an optional 0–100
   * percentage pair (the "Reposition Background" feature's bgImageX/bgImageY
   * or imagePosX/imagePosY-style prop pair — anchor = which point of the
   * SOURCE image is aligned to that point of the box) into the CSS value used
   * for both `background-position` (block-level cover background, e.g. the
   * 'hero' block's bgType:'image') and `object-position` (a plain cover-fit
   * `<img>`, e.g. the 'image' block's imageMode:'fill'). Both properties
   * accept the same "<x>% <y>%" syntax, so one function serves both call sites.
   *
   * Either axis missing/non-numeric → "center", the exact CSS keyword both
   * consumers already hardcoded before this feature — an unpositioned image
   * (the default for every block that existed before this feature shipped)
   * renders byte-for-byte unchanged (no regressions requirement).
   *
   * Consumers:
   *   1. public/flexible-designer.html's createBlockPreview() (canvas preview
   *      for 'hero' bgType:'image' and 'image' block imageMode:'fill')
   *   2. FlexibleSectionRenderer.tsx's DesignerBlock shellStyle (hero bg) and
   *      its "image" case (block-level cover `<img>`)
   *
   * ASSUMPTIONS:
   * 1. x/y are already 0-100 (the Designer's drag handler and sliders both
   *    clamp before writing the prop — see startBgReposition in
   *    flexible-designer.html) — this function clamps again defensively so a
   *    corrupt/out-of-range stored value (e.g. hand-edited Template import
   *    JSON) can't produce an out-of-box CSS position.
   *
   * FAILURE MODES:
   * - Non-numeric x or y (e.g. a stray string) → Number() coerces to NaN,
   *   caught by the isFinite check → falls back to "center", never emits
   *   "NaN% NaN%" into the stylesheet.
   */
  function resolveBgPositionCss(x, y) {
    var xN = Number(x);
    var yN = Number(y);
    if (x == null || y == null || !isFinite(xN) || !isFinite(yN)) return "center";
    xN = Math.max(0, Math.min(100, xN));
    yN = Math.max(0, Math.min(100, yN));
    return xN + "% " + yN + "%";
  }

  /**
   * resolveBackgroundPosForBreakpoint(backgroundPos, breakpoint, legacyX, legacyY)
   * — pure function. Picks which {x,y} pair a SECTION's own "Reposition
   * Background" drag position should use for a given breakpoint, given the
   * per-breakpoint override object plus the pre-per-breakpoint legacy flat
   * fields. Feed the returned {x,y} straight into resolveBgPositionCss(x,y)
   * above (this function does NOT format CSS — one dumb formatter, one
   * resolution-order picker, per ONE SYSTEM PER CONCERN, CLAUDE.md).
   *
   * Added 2026-09-21 when the section-level "Reposition Background" feature
   * (dc7435d, #205 — see docs/main-cms-sync-prompt.md) was changed from ONE
   * shared position for all screen sizes to an independent position per
   * breakpoint, matching how the block-level "Reposition Background" feature
   * (#197, bgImageX/Y on a 'hero' block) already works naturally (it lives
   * inside each breakpoint's own designerData variant). Section-level
   * backgroundPosX/Y is NOT inside a per-breakpoint designerData variant —
   * it lives in content JSONB directly — so it needs its OWN small
   * per-breakpoint container: content.backgroundPos = { desktop, tablet,
   * mobile }, each entry {x,y} (0-100) or null ("not yet customized for
   * this breakpoint").
   *
   * CONTRACT (mirrors public/flexible-breakpoint-rules.js's pickActiveVariant
   * fallback semantics, so this reads the same way to anyone already familiar
   * with that file):
   *   1. backgroundPos[breakpoint] is a valid {x,y} pair → use it (an
   *      explicit override for this exact breakpoint always wins).
   *   2. Else, for tablet/mobile only, backgroundPos.desktop is a valid
   *      {x,y} pair → fall back to it (an un-customized breakpoint inherits
   *      Desktop's explicit position rather than snapping to plain center).
   *   3. Else fall back to the legacy flat legacyX/legacyY pair (every
   *      section saved before this feature exists in exactly this shape:
   *      backgroundPos is absent entirely) — applies to EVERY breakpoint,
   *      desktop included, so a legacy section renders byte-identical to
   *      before this feature shipped.
   *   4. Else {x: null, y: null} → resolveBgPositionCss(null, null) yields
   *      "center", the pre-existing default for a section with no drag
   *      position set at all.
   *
   * ASSUMPTIONS:
   * 1. backgroundPos, when present, is a plain object with up to 3 keys
   *    (desktop/tablet/mobile), each either {x:number,y:number} or
   *    null/undefined/absent — the exact shape FlexibleSectionEditorModal.tsx
   *    writes on save. A malformed entry (missing axis, non-numeric) is
   *    treated as absent (falls through to the next resolution step) rather
   *    than emitting a partial/garbage position.
   * 2. breakpoint is always one of "desktop" | "tablet" | "mobile" (the same
   *    3-value domain as pickBreakpointForWidth/previewViewport elsewhere in
   *    this codebase).
   *
   * FAILURE MODES:
   * - backgroundPos is null/undefined/not an object (every section that
   *   predates this feature) → step 1/2 both no-op, step 3 (legacy flat
   *   fallback) applies — matches the pre-feature behavior exactly.
   * - Desktop's own resolution also has no explicit override AND no legacy
   *   value → {x: null, y: null}, i.e. "center", same as today.
   */
  function resolveBackgroundPosForBreakpoint(backgroundPos, breakpoint, legacyX, legacyY) {
    function validPoint(p) {
      if (!p || typeof p !== "object") return null;
      if (p.x == null || p.y == null) return null;
      var xN = Number(p.x);
      var yN = Number(p.y);
      if (!isFinite(xN) || !isFinite(yN)) return null;
      return { x: xN, y: yN };
    }

    var bp = backgroundPos && typeof backgroundPos === "object" ? backgroundPos : null;

    var own = bp ? validPoint(bp[breakpoint]) : null;
    if (own) return own;

    if (breakpoint !== "desktop") {
      var desktopOverride = bp ? validPoint(bp.desktop) : null;
      if (desktopOverride) return desktopOverride;
    }

    var legacy = validPoint({ x: legacyX, y: legacyY });
    if (legacy) return legacy;

    return { x: null, y: null };
  }

  /**
   * buildGradientCss(gradient) — pure function. Builds the CSS `background`
   * shorthand value for a FLEXIBLE section's colour-gradient OVERLAY
   * (content.gradient, the Background tab's "Gradient" type), given its
   * stored config object: { enabled, type: "preset", preset: { kind,
   * direction, shape, position, startOpacity, endOpacity, color } }.
   *
   * Added 2026-09-22 alongside resolveBackgroundBundleForBreakpoint() below,
   * when Radial was added as a second gradient KIND next to the pre-existing
   * Linear-only behaviour (see feedback_breakpoint-canvases-fully-isolated
   * memory) — extracted here so the two independently-maintained gradient-CSS
   * builders (FlexibleSectionRenderer.tsx's own `gradCss` useMemo and this
   * project's admin live preview, which as of this change both call this one
   * function) can never drift apart again (ONE SYSTEM PER CONCERN, CLAUDE.md).
   * Before this extraction only Linear ever existed, hand-built inline in the
   * renderer — this is a byte-identical port of that logic for
   * `preset.kind !== "radial"`, plus the new Radial branch.
   *
   * ASSUMPTIONS:
   * 1. `gradient.preset.kind` is "linear" when absent/anything else — every
   *    gradient saved before Radial existed has no `kind` field at all, and
   *    must keep rendering exactly as it always has (no migration needed).
   * 2. `preset.shape` (radial only) is "circle" when absent/anything else —
   *    a single deliberately-simple default shape, matching this feature's
   *    explicitly reduced scope (Linear-vs-Radial as a real choice is
   *    required; an arbitrary stop count or multi-shape UI is not).
   * 3. `preset.position` (radial only) is a plain CSS position string
   *    ("center", "top left", "20% 80%", ...) and defaults to "center".
   *
   * FAILURE MODES:
   * - Both startOpacity and endOpacity are 0 (or absent) -> null (no visible
   *   gradient — matches the pre-existing Linear behaviour exactly, so a
   *   section with the Gradient tab open but opacity untouched renders no
   *   overlay, same as before this function existed).
   * - Malformed/missing `color` -> falls back to "#000000", same as before.
   * - No `gradient`/`gradient.preset` at all -> null.
   *
   * @param {{enabled?:boolean, type?:string, preset?:{kind?:string, direction?:string, shape?:string, position?:string, startOpacity?:number, endOpacity?:number, color?:string}}|null|undefined} gradient
   * @returns {string|null} A `linear-gradient(...)` or `radial-gradient(...)` CSS value, or null.
   */
  function buildGradientCss(gradient) {
    var p = gradient && gradient.preset;
    if (!p) return null;
    // Coerce to finite numbers (defense-in-depth: a gradient config can arrive from
    // untrusted Template import via public/flexible-designer.html's own call site —
    // see that file's sectionGradCss, which delegates here) — non-numeric/missing
    // values become 0, matching the pre-2026-09-22 behaviour of BOTH independently
    // hand-rolled copies this function unifies.
    var soN = Number(p.startOpacity), eoN = Number(p.endOpacity);
    var so = (p.startOpacity == null || !isFinite(soN)) ? 0 : soN;
    var eo = (p.endOpacity == null || !isFinite(eoN)) ? 0 : eoN;
    if (so <= 0 && eo <= 0) return null;
    var hex = (p.color || "#000000").replace("#", "");
    var r = parseInt(hex.slice(0, 2), 16) || 0;
    var g = parseInt(hex.slice(2, 4), 16) || 0;
    var b = parseInt(hex.slice(4, 6), 16) || 0;
    var startColor = "rgba(" + r + "," + g + "," + b + "," + (so / 100) + ")";
    var endColor = "rgba(" + r + "," + g + "," + b + "," + (eo / 100) + ")";
    if (p.kind === "radial") {
      var shape = p.shape === "ellipse" ? "ellipse" : "circle";
      var position = p.position || "center";
      return "radial-gradient(" + shape + " at " + position + ", " + startColor + ", " + endColor + ")";
    }
    var DIR = {
      top: "to top", bottom: "to bottom", left: "to left", right: "to right",
      topLeft: "to top left", topRight: "to top right", bottomLeft: "to bottom left", bottomRight: "to bottom right",
    };
    var dir = DIR[p.direction || "bottom"] || "to bottom";
    return "linear-gradient(" + dir + ", " + startColor + ", " + endColor + ")";
  }

  /**
   * The deliberate NEUTRAL bundle a Tablet/Mobile breakpoint resolves to when
   * it has never been explicitly configured — see
   * resolveBackgroundBundleForBreakpoint()'s own doc comment for why this is
   * "transparent/no background" rather than falling back to Desktop's bundle.
   * getUnsetBackgroundBundle() always returns a FRESH object (never a shared
   * reference) so a caller can safely mutate its own copy.
   */
  function getUnsetBackgroundBundle() {
    return {
      backgroundType: "solid",
      background: "transparent",
      gradient: undefined,
      bgImageUrl: "",
      bgImageSize: "cover",
      bgImageRepeat: "no-repeat",
      bgImageOpacity: 100,
    };
  }

  function isValidBgBundle(b) {
    return !!b && typeof b === "object" && (b.backgroundType === "solid" || b.backgroundType === "gradient");
  }

  /**
   * resolveBackgroundBundleForBreakpoint(backgroundByBreakpoint, breakpoint, legacyBundle)
   * — pure function. Resolves the FULL background configuration (type, solid
   * colour, gradient config, and image sizing/repeat/opacity — everything
   * EXCEPT crop position, which stays its own already-per-breakpoint concern,
   * see resolveBackgroundPosForBreakpoint above) for a FLEXIBLE section at a
   * given breakpoint.
   *
   * Added 2026-09-22 (see feedback_breakpoint-canvases-fully-isolated memory
   * and project_session-2026-09-21-breakpoint-saga memory for the full
   * history this closes): this is DELIBERATELY NOT modeled on
   * resolveBackgroundPosForBreakpoint's own inherit-from-Desktop fallback
   * (step 2 there) — that "Tablet/Mobile falls back to Desktop's explicit
   * value" design was explicitly superseded by the user for this exact area.
   * A Tablet/Mobile breakpoint with nothing configured resolves to the
   * deliberate NEUTRAL "unset" bundle (getUnsetBackgroundBundle() — solid,
   * transparent, no image) instead, so nothing ever bleeds from Desktop into
   * another breakpoint's background, matching the same "no automatic sync
   * across breakpoints, ever" rule already locked in for block content
   * (public/flexible-breakpoint-rules.js's reconcileVariantBlocks doc
   * comment).
   *
   * CONTRACT:
   *   1. backgroundByBreakpoint[breakpoint] is a valid bundle
   *      ({backgroundType: "solid"|"gradient", ...}) -> use it verbatim (an
   *      explicit per-breakpoint bundle always wins, desktop included).
   *   2. Else, ONLY for "desktop": legacyBundle (the section's pre-feature
   *      FLAT fields — background/gradient/bgImage* — assembled by the
   *      caller) is used when valid, so a section saved before this feature
   *      existed renders Desktop byte-identical. When even that is invalid
   *      (should not happen — callers always assemble a shape-valid legacy
   *      bundle), falls back to the same neutral bundle as step 3.
   *   3. Else (tablet/mobile with no explicit bundle) -> the neutral "unset"
   *      bundle. NEVER Desktop's bundle, NEVER the legacy bundle.
   *
   * ASSUMPTIONS:
   * 1. backgroundByBreakpoint, when present, has up to 3 keys
   *    (desktop/tablet/mobile), each either a full bundle object or
   *    null/undefined/absent ("not customized") — the exact shape
   *    FlexibleSectionEditorModal.tsx writes on save.
   * 2. legacyBundle is always a shape-valid bundle the caller assembled from
   *    the section's own flat fields (never itself breakpoint-aware) — it is
   *    ONLY ever used for desktop, never tablet/mobile, by construction (step
   *    3 never reads it).
   *
   * FAILURE MODES:
   * - backgroundByBreakpoint is null/undefined/not an object (every section
   *   that predates this feature) -> step 1 no-ops for every breakpoint, step
   *   2 (desktop) uses legacyBundle, step 3 (tablet/mobile) uses the neutral
   *   bundle — this IS the intended "starts empty to be populated" migration
   *   behaviour, not a fallback path being mistakenly hit.
   * - A malformed stored bundle (missing backgroundType) -> treated as absent
   *   (isValidBgBundle), same resolution as if it were null.
   *
   * @param {{desktop?:object|null,tablet?:object|null,mobile?:object|null}|null|undefined} backgroundByBreakpoint
   * @param {'desktop'|'tablet'|'mobile'} breakpoint
   * @param {object} legacyBundle - shape-valid bundle assembled from the section's flat legacy fields.
   * @returns {object} A background bundle — never null/undefined.
   */
  function resolveBackgroundBundleForBreakpoint(backgroundByBreakpoint, breakpoint, legacyBundle) {
    var bp = backgroundByBreakpoint && typeof backgroundByBreakpoint === "object" ? backgroundByBreakpoint : null;
    var own = bp ? bp[breakpoint] : null;
    if (isValidBgBundle(own)) return own;

    if (breakpoint === "desktop") {
      return isValidBgBundle(legacyBundle) ? legacyBundle : getUnsetBackgroundBundle();
    }

    // Tablet/Mobile: deliberate — NEVER falls back to Desktop or legacy.
    return getUnsetBackgroundBundle();
  }

  return {
    computeSubElementStyle: computeSubElementStyle,
    computeSubElementPosition: computeSubElementPosition,
    restampBlockZIndexes: restampBlockZIndexes,
    resolveBlockZIndex: resolveBlockZIndex,
    styleObjectToCssText: styleObjectToCssText,
    computeMultiBgLayers: computeMultiBgLayers,
    resolveBgPositionCss: resolveBgPositionCss,
    resolveBackgroundPosForBreakpoint: resolveBackgroundPosForBreakpoint,
    buildGradientCss: buildGradientCss,
    getUnsetBackgroundBundle: getUnsetBackgroundBundle,
    resolveBackgroundBundleForBreakpoint: resolveBackgroundBundleForBreakpoint,
  };
});
