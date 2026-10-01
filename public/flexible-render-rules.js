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

  // ══════════════════════════════════════════════════════════════════════════
  //  FONTS — one resolution + loading path for the Designer canvas AND the live page
  // ══════════════════════════════════════════════════════════════════════════
  // ROOT CAUSE this section closes (measured empirically 2026-09-25, see the responsive-fidelity harness):
  // headings were sized/measured in the Designer against a SYSTEM FALLBACK font while their webfont was still
  // loading (`display=swap`), then never re-measured. E.g. a "NO EXCUSES." heading in 'Archivo Black' 80px is
  // 606px wide, but in the fallback (Times bold, because the stack ends in the invalid word `display`) it is
  // 529px — so a 542px content box "fitted" on ONE line in the Designer (stored _measuredH = one line) while
  // the live page, with the real webfont, wrapped to two lines and collided with its neighbour. Every
  // consumer now resolves and loads fonts through the helpers below, and the Designer re-measures once fonts
  // have settled (see public/flexible-designer.html: remeasureSubElementCaches).

  var GENERIC_FONT_KEYWORDS = {
    inherit: 1, initial: 1, unset: 1, "sans-serif": 1, serif: 1, monospace: 1, cursive: 1, fantasy: 1,
    "system-ui": 1, "ui-sans-serif": 1, "ui-serif": 1, "ui-monospace": 1, "ui-rounded": 1,
  };

  // The Designer's font list appends a Google Fonts CATEGORY word to every stack ('Archivo Black', display,
  // 'Pacifico', handwriting). Those are NOT CSS generic families: a bare unknown word in font-family is a
  // family NAME, so the fallback silently became the browser default serif instead of a real generic.
  var GOOGLE_CATEGORY_TO_GENERIC = { display: "sans-serif", handwriting: "cursive" };

  /**
   * normalizeFontStack(css) — pure. Replaces a trailing Google category word (display / handwriting) with the
   * real CSS generic family; everything else passes through untouched (incl. undefined/non-strings).
   */
  function normalizeFontStack(css) {
    if (typeof css !== "string" || !css) return css;
    return css.replace(/(^|,)\s*(display|handwriting)\s*(?=,|$)/gi, function (m, pre, word) {
      return pre + (pre ? " " : "") + GOOGLE_CATEGORY_TO_GENERIC[word.toLowerCase()];
    });
  }

  /** extractFontFamilyName(css) — the first (webfont) family of a stack, or "" for generics/inherit/system stacks. */
  function extractFontFamilyName(css) {
    if (typeof css !== "string") return "";
    var m = css.match(/'([^']+)'/) || css.match(/"([^"]+)"/) || css.match(/^([^,]+)/);
    var name = (m ? m[1] : css).trim().replace(/^["']|["']$/g, "");
    if (!name || name.charAt(0) === "-" || GENERIC_FONT_KEYWORDS[name.toLowerCase()]) return "";
    return name;
  }

  function normalizeFontWeight(w) {
    if (typeof w === "number" && isFinite(w)) return w;
    if (typeof w === "string") {
      var t = w.trim().toLowerCase();
      if (t === "bold") return 700;
      if (t === "normal" || t === "regular") return 400;
      var n = parseInt(t, 10);
      if (isFinite(n)) return n;
    }
    return null;
  }

  /**
   * collectFontRequests(blockLists) — pure. Given one or more block arrays (every breakpoint variant), returns
   * [{ family, weights }] for each webfont referenced by a block's or sub-element's `props.fontFamily`, weights
   * = the UNION of 400/700 (always) and every weight actually used with that family. Requesting only 400;700
   * makes a fontWeight-300 paragraph fall back to another face and wrap differently than the design (#90).
   */
  function collectFontRequests(blockLists) {
    var fam = {};
    function add(props) {
      if (!props || typeof props.fontFamily !== "string") return;
      var name = extractFontFamilyName(props.fontFamily);
      if (!name) return;
      var entry = fam[name] || (fam[name] = { 400: true, 700: true });
      var w = normalizeFontWeight(props.fontWeight);
      if (w !== null && w >= 100 && w <= 900) entry[Math.round(w / 100) * 100] = true;
    }
    (blockLists || []).forEach(function (blocks) {
      (blocks || []).forEach(function (b) {
        if (!b) return;
        add(b.props);
        (b.subElements || []).forEach(function (se) { add(se && se.props); });
      });
    });
    return Object.keys(fam).sort().map(function (name) {
      return { family: name, weights: Object.keys(fam[name]).map(Number).sort(function (a, b) { return a - b; }) };
    });
  }

  /** buildGoogleFontHref(family, weights) — the ONE Google Fonts css2 URL builder for the Flexible system. */
  function buildGoogleFontHref(family, weights) {
    return "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(family).replace(/%20/g, "+") +
      ":wght@" + weights.join(";") + "&display=swap";
  }

  function fontLinkId(family, weights) {
    return "gf-" + String(family).replace(/\s+/g, "-") + "-" + weights.join("_");
  }

  /**
   * ensureGoogleFontLinks(doc, requests) — idempotent: appends a <link rel=stylesheet> for every request whose id
   * is not already in `doc`. Takes the document as a parameter (this module has no DOM globals). Returns the
   * <link> elements it created, so a caller can wait on them.
   */
  function ensureGoogleFontLinks(doc, requests) {
    var created = [];
    if (!doc || !doc.head) return created;
    (requests || []).forEach(function (r) {
      var id = fontLinkId(r.family, r.weights);
      if (doc.getElementById(id)) return;
      var l = doc.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = buildGoogleFontHref(r.family, r.weights);
      doc.head.appendChild(l);
      created.push(l);
    });
    return created;
  }

  // The Designer canvas's .sub-element wrapper: 1px border + 6px padding, top and bottom.
  var WRAPPER_CHROME_PX = 14;
  // A Designer canvas HEADING also carries the Bootstrap .hN class = margin-bottom .5rem, which its stored
  // _measuredH therefore includes (an eyebrow/paragraph has none). The live wrapper reaches the same +8 via the
  // renderer's default marginBottom, but only the DESIGNER's number matters here: it is what was stored.
  var DESIGNER_HEADING_MARGIN_PX = 8;

  /**
   * measuredLineCount(type, props, measuredH) — pure. Decodes how many text lines the Designer showed for a
   * heading/eyebrow from the wrapper height it stored (`_measuredH`): lines = (measuredH - chrome) /
   * (fontSize * lineHeight). null when it cannot tell (other types, no measurement, degenerate font size, or a
   * heading line so short that the decode is ambiguous — see below).
   *
   * AMBIGUITY GUARD: the decode assumes the Designer's +8px heading margin is part of the stored height. If it is
   * not (a heading class with no margin), the count is under-read by 8/lineH lines — half a line or more once
   * lineH <= 16px, which turned a 2-line heading with line-height 0.5 into "1 line". Below that threshold the
   * measurement is treated as unknowable (null) rather than guessed.
   */
  function measuredLineCount(type, props, measuredH) {
    var mh = Number(measuredH);
    if (!isFinite(mh) || mh <= 0) return null;
    if (type !== "heading" && type !== "eyebrow") return null;
    var p = props || {};
    var fs = Number(p.fontSize) || (type === "heading" ? 22 : 13);
    var lh = type === "heading"
      ? (p.lineHeight !== undefined ? Number(p.lineHeight) : 1.2)
      : (Number(p.lineHeight) || 1.4);
    var lineH = fs * lh;
    if (!(lineH > 0)) return null;
    if (type === "heading" && lineH <= 2 * DESIGNER_HEADING_MARGIN_PX) return null;
    var chrome = WRAPPER_CHROME_PX + (type === "heading" ? DESIGNER_HEADING_MARGIN_PX : 0);
    return Math.max(1, Math.round((mh - chrome) / lineH));
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
   *   measuredH / fixedHeight / measurementSettled — LIVE renderer only, heading only: the sub-element's
   *             stored `_measuredH`, whether it was authored with an explicit height, and whether the
   *             Designer stamped that measurement `_fontsSettled` (taken with webfonts loaded). The
   *             one-line guard (white-space: nowrap) exists ONLY for data saved before that stamp
   *             existed; a stamped measurement is trusted as-is. The Designer must NEVER pass these
   *             (it would lock its own measurement to the first one it took).
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
      // Legacy-data safety net (live page only — the Designer never passes measuredH): a heading the Designer
      // measured as ONE line must not become two just because the live webfont is wider than the fallback the
      // Designer measured with. See the FONTS section above for the root cause. Off with an explicit textWrap,
      // an authored fixed height, a measurement the Designer stamped as taken with fonts settled (it is true, and
      // nowrap would turn its vertical overlap into horizontal overflow that a centred/right-aligned heading
      // spills sideways and the stage clips), or without `exact` (flow/mobile layouts wrap by design).
      var hNowrap = exact && !opts.fixedHeight && !opts.measurementSettled
        && measuredLineCount("heading", p, opts.measuredH) === 1;
      return stripUndefined({
        fontSize: mobile ? mobileFontClamp(hFontNum) : (hFontNum + "px"),
        fontFamily: normalizeFontStack(p.fontFamily) || undefined,
        fontWeight: p.fontWeight || "700",
        color: p.color || (exact && !darkBg ? "#212529" : undefined),
        textAlign: p.textAlign || (exact ? "left" : undefined),
        lineHeight: p.lineHeight !== undefined ? Number(p.lineHeight) : (exact ? 1.2 : undefined),
        letterSpacing: p.letterSpacing !== undefined ? (Number(p.letterSpacing) + "px") : (exact ? "0px" : undefined),
        textTransform: p.textTransform || (exact ? "none" : undefined),
        whiteSpace: exact ? (p.textWrap || (hNowrap ? "nowrap" : "normal")) : undefined,
        overflowWrap: exact ? "break-word" : undefined,
      });
    }

    if (type === "paragraph") {
      var pFontNum = Number(p.fontSize) || (exact ? 14 : 15);
      var constrainWidth = !exact && !mobile && !!p.maxWidth && Number(p.maxWidth) > 0;
      return stripUndefined({
        fontSize: mobile ? mobileFontClamp(Number(p.fontSize) || 15) : (pFontNum + "px"),
        fontFamily: normalizeFontStack(p.fontFamily) || undefined,
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
      // 2026-09-23: an eyebrow is a short single-line label. In exact (free-canvas)
      // mode the author sizes its box by eye in the Designer, so a label that only
      // just fits (e.g. "OUR COMMUNITY PROGRAMME" at 13px/3px tracking = 258px in a
      // 260px box) looked fine there but wrapped to a 2nd line on the live page the
      // moment anything nudged its width ~1% — browser zoom, a Google Font still
      // swapping in behind a wider fallback, glyph-hinting differences. Wrapping is
      // now decided HERE, once, so the Designer and every live surface agree:
      // exact mode never wraps (it can only overflow its own box by a few px,
      // invisible since the box has no fill). Flow mode keeps normal wrapping so a
      // long eyebrow can't force horizontal scroll on a phone.
      var eFontNum = Number(p.fontSize) || 13;
      return stripUndefined({
        fontSize: mobile ? mobileFontClamp(eFontNum) : (eFontNum + "px"),
        fontFamily: normalizeFontStack(p.fontFamily) || undefined,
        fontWeight: p.fontWeight || "700",
        color: p.color || "#0d6efd",
        textAlign: p.textAlign || "left",
        textTransform: p.textTransform || "uppercase",
        letterSpacing: (p.letterSpacing !== undefined && p.letterSpacing !== null) ? (Number(p.letterSpacing) + "px") : "2px",
        lineHeight: Number(p.lineHeight) || 1.4,
        whiteSpace: exact ? "nowrap" : undefined,
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
   *    (desktop/tablet/mobile), each either {x:number,y:number,zoom?:number}
   *    or null/undefined/absent — the exact shape FlexibleSectionEditorModal.tsx
   *    writes on save. A malformed entry (missing axis, non-numeric) is
   *    treated as absent (falls through to the next resolution step) rather
   *    than emitting a partial/garbage position.
   * 2. breakpoint is always one of "desktop" | "tablet" | "mobile" (the same
   *    3-value domain as pickBreakpointForWidth/previewViewport elsewhere in
   *    this codebase).
   * 3. (2026-10-01, Phase 2 of the "Reposition Background" feature —
   *    resolveBgZoomLayer below) `zoom` lives INSIDE the same per-breakpoint
   *    point object as x/y, not as a sibling field — a breakpoint's explicit
   *    override always carries its OWN zoom along with its OWN x/y (no
   *    independent per-axis fallback chain for zoom alone), so "own
   *    breakpoint wins entirely" stays a single, simple rule. A point missing
   *    `zoom` (every point saved before this feature existed) resolves
   *    zoom:null — see FAILURE MODES.
   *
   * FAILURE MODES:
   * - backgroundPos is null/undefined/not an object (every section that
   *   predates this feature) → step 1/2 both no-op, step 3 (legacy flat
   *   fallback) applies — matches the pre-feature behavior exactly.
   * - Desktop's own resolution also has no explicit override AND no legacy
   *   value → {x: null, y: null, zoom: null}, i.e. "center, no zoom", same as today.
   * - A valid {x,y} point with no/non-numeric `zoom` key (every point saved
   *   before 2026-10-01) → zoom: null, meaning "100%/no zoom" to every
   *   caller (resolveBgZoomLayer(x, y, null) returns null) — byte-identical
   *   rendering to before this feature existed.
   */
  function resolveBackgroundPosForBreakpoint(backgroundPos, breakpoint, legacyX, legacyY) {
    function validPoint(p) {
      if (!p || typeof p !== "object") return null;
      if (p.x == null || p.y == null) return null;
      var xN = Number(p.x);
      var yN = Number(p.y);
      if (!isFinite(xN) || !isFinite(yN)) return null;
      var zN = Number(p.zoom);
      var zoom = (p.zoom != null && isFinite(zN)) ? zN : null;
      return { x: xN, y: yN, zoom: zoom };
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

    return { x: null, y: null, zoom: null };
  }

  /**
   * resolveBgZoomLayer(x, y, zoom) — pure function. Phase 2 (2026-10-01) of the
   * section-level "Reposition Background" feature. `background-size:cover`
   * resolves against the ELEMENT'S OWN layout box (the free-mode plate's cw x
   * ch stage, or the live non-plate section's own rendered box) — the pan
   * slack `background-position` has on each axis is purely a function of the
   * IMAGE's native aspect ratio vs THAT box's aspect ratio, so an image whose
   * AR happens to match the box has ZERO slack on one axis no matter what x/y
   * is set to (root-caused this session: no matter where the dot is dragged,
   * only vertical — or only horizontal — movement ever shows up). This
   * function manufactures REAL pan slack on BOTH axes, independent of the
   * image's native AR, by describing a CHILD layer `zoom`% the size of the
   * existing box on BOTH axes (never just one — this is why it fixes the bug
   * regardless of which axis was starved).
   *
   * GEOMETRY: because the child is scaled up UNIFORMLY (both axes by the same
   * `zoom` factor) it keeps EXACTLY the box's own aspect ratio, so
   * `background-size:cover` + `background-position:center` on the child crops
   * the identical fraction of the source image as it would at zoom=100 —
   * just rendered `zoom`-times larger. The returned left/top then place that
   * oversized child inside the ORIGINAL (now clipping) box using the exact
   * same formula native CSS `background-position` itself uses to place an
   * oversized image inside its box — offset = (outerSize - childSize) *
   * (pct/100) — expressed purely as PERCENTAGES OF THE OUTER BOX so no pixel
   * value or natural-image-size lookup is ever needed (this codebase does not
   * track natural image dimensions — see this feature's own design notes):
   * childSize = outerSize * (zoom/100), so offsetPct = -(zoom/100 - 1) * pct.
   * At zoom=100 every offset is 0 and the child exactly fills the outer box —
   * this function is NEVER called for that case (see FAILURE MODES); callers
   * keep today's simpler single-layer rendering untouched for zoom<=100, so
   * this is strictly ADDITIVE, never a replacement for it.
   *
   * `background-position` on the CHILD is deliberately fixed to "center" by
   * every caller (not x%/y%) — the outer-box offset above already supplies
   * the full 2-axis pan range the zoom manufactures; additionally applying
   * x/y to the child's OWN background-position would double-apply the same
   * drag value through two independent mechanisms (compounding, and still
   * bounded by the image's native AR for whatever tiny amount it would add)
   * for no real benefit. See this feature's PR description for the full
   * position+zoom interaction reasoning (both options considered on paper
   * before implementation, since this project's rules disallow browser
   * verification).
   *
   * ASSUMPTIONS:
   * 1. x/y are 0-100 percentages, or null/non-numeric → treated as 50
   *    ("center"), matching resolveBgPositionCss's own default.
   * 2. zoom is a percentage, 100 = no extra zoom. null/undefined/non-finite/
   *    <=100 → this function returns null (see FAILURE MODES) rather than a
   *    zero-sized or inverted layer.
   * 3. The caller renders the returned {widthPct,heightPct,leftPct,topPct} on
   *    a CHILD element absolutely positioned inside the SAME box that holds
   *    today's single bg div — which must additionally gain
   *    `overflow:hidden` (the child is intentionally larger than it on both
   *    axes whenever this function returns non-null).
   *
   * FAILURE MODES:
   * - zoom null/undefined/non-finite/<=100 → returns null. Callers MUST treat
   *   null as "render today's plain single-layer background exactly as
   *   before this feature" (byte-identical, no wrapper) — the explicit
   *   backward-compatibility contract for every section saved before this
   *   feature existed (no `zoom` field at all).
   * - zoom above the clamp ceiling (e.g. a corrupt/hand-edited Template
   *   import value) → clamped, never produces an inverted/nonsensical offset.
   * - Non-numeric x or y → 50 (center), same default as resolveBgPositionCss.
   *
   * @param {number|null|undefined} x
   * @param {number|null|undefined} y
   * @param {number|null|undefined} zoom
   * @returns {{widthPct:number,heightPct:number,leftPct:number,topPct:number}|null}
   */
  function resolveBgZoomLayer(x, y, zoom) {
    var zN = Number(zoom);
    if (zoom == null || !isFinite(zN) || zN <= 100) return null;
    var ZOOM_MAX = 400; // 4x — generous pan range without rendering an absurdly oversized layer
    var z = Math.min(zN, ZOOM_MAX) / 100;
    var xN = Number(x);
    var yN = Number(y);
    var xP = (x != null && isFinite(xN)) ? Math.max(0, Math.min(100, xN)) : 50;
    var yP = (y != null && isFinite(yN)) ? Math.max(0, Math.min(100, yN)) : 50;
    // + 0 normalizes a -0 result (e.g. x=0 -> -(z-1)*0 = -0) to +0 — CSS renders either
    // identically ("0%"), but a clean +0 keeps equality checks/serialization predictable.
    var round4 = function (n) { return (Math.round(n * 10000) / 10000) + 0; };
    return {
      widthPct: round4(z * 100),
      heightPct: round4(z * 100),
      leftPct: round4(-(z - 1) * xP),
      topPct: round4(-(z - 1) * yP),
    };
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

  /**
   * isBlankBackgroundBundle(b) — pure. True when a background bundle paints nothing: not a valid bundle, or no
   * image, no non-transparent solid colour and (for a gradient bundle) no visible gradient.
   */
  function isBlankBackgroundBundle(b) {
    if (!isValidBgBundle(b)) return true;
    if (b.bgImageUrl) return false;
    if (b.backgroundType === "gradient") return buildGradientCss(b.gradient) === null;
    return !b.background || b.background === "transparent";
  }

  /**
   * resolveLiveBackgroundBundle(backgroundByBreakpoint, breakpoint, legacyBundle, breakpointAuthored, fallbackMode)
   * — pure. LIVE-PAGE background resolution (added 2026-09-25). resolveBackgroundBundleForBreakpoint() above is
   * left EXACTLY as it was — the Designer/section editor rely on its strict isolation (an unset Tablet/Mobile
   * background is neutral, never Desktop's) — and this wraps it with the one thing only the live page may do:
   * when a visitor is shown the DESKTOP layout because this breakpoint was never designed, they must also get a
   * background that layout was designed against. Without that, commit 45f0880 made every legacy desktop-only
   * section render with NO background below 992px (white sections, white text on white, blank sections).
   *
   *   desktop, or this breakpoint IS authored  -> exactly resolveBackgroundBundleForBreakpoint() (isolation kept).
   *   fallbackMode "none" or "off"             -> same (nothing is borrowed from Desktop). "off" is what every
   *                                                non-free-mode section passes: the fallback exists for free-mode
   *                                                Designer layouts only.
   *   not authored + fallbackMode "desktop":
   *       the breakpoint's own bundle if it deliberately paints something (a configured image/colour/gradient);
   *       else Desktop's bundle (or the legacy flat bundle) — an EXPLICIT BLANK bundle does not count as
   *       deliberate, because the section editor writes the active "Preview as" tab's bundle on every save.
   *
   * The result is never written back anywhere: stored data and the Designer canvas stay fully isolated.
   *
   * @param {{desktop?:object|null,tablet?:object|null,mobile?:object|null}|null|undefined} backgroundByBreakpoint
   * @param {'desktop'|'tablet'|'mobile'} breakpoint
   * @param {object} legacyBundle - shape-valid bundle assembled from the section's flat legacy fields.
   * @param {boolean} breakpointAuthored - isVariantAuthored() of the layout that will render at this breakpoint.
   * @param {'desktop'|'none'|'off'} [fallbackMode]
   * @returns {object} a background bundle — never null/undefined.
   */
  function resolveLiveBackgroundBundle(backgroundByBreakpoint, breakpoint, legacyBundle, breakpointAuthored, fallbackMode) {
    var own = resolveBackgroundBundleForBreakpoint(backgroundByBreakpoint, breakpoint, legacyBundle);
    if (breakpoint === "desktop" || breakpointAuthored || fallbackMode === "none" || fallbackMode === "off") return own;
    if (!isBlankBackgroundBundle(own)) return own;
    return resolveBackgroundBundleForBreakpoint(backgroundByBreakpoint, "desktop", legacyBundle);
  }

  /**
   * FRAME_GUIDE_NAV — the y-position, in canvas DESIGN px (the same coordinate space
   * computeStageFit's cw/ch and the free-mode Designer stage use), of the Designer's own
   * guide line marking where the live navbar's bottom edge would land if this canvas were
   * shown at native 1:1 scale. It is NOT itself a live, unscaled CSS-px measurement of the
   * navbar (that's navCover — computed by each caller, e.g. FlexibleSectionRenderer.tsx's
   * `navH - headerOffset`, from the ACTUAL rendered navbar). ONE constant for the value
   * public/flexible-designer.html's own guide-line code (Option C frame guides) used to
   * hand-copy as a separate hardcoded `NAV = 100` — kept here so the Designer canvas and the
   * live renderer can never drift apart on this specific number again (navbar-guide-drift
   * fix, 2026-09-30; wording corrected in the round-2 review follow-up, same date).
   */
  var FRAME_GUIDE_NAV = 100;

  /**
   * computeStageFit(opts) — pure. THE single decision of how a free-mode design canvas (cw x ch design px) is
   * fitted into the box it is shown in (vw x vh CSS px). Consumed by BOTH:
   *   1. components/sections/FlexibleSectionRenderer.tsx  — the live content plate and background plate;
   *   2. public/flexible-designer.html                    — the canvas's own fit-to-panel zoom
   *                                                          (getCanvasScale / resetUserZoom; only `.scale`),
   * so the Designer preview and the live page can never disagree about scale or placement.
   *
   * CONTENT plate (every breakpoint): ONE uniform scale — nothing is ever stretched.
   *   mode "single": scale = min(vw/cw, vh/ch, maxScale) — "contain": the WHOLE design is always visible and the
   *                  box is never grown/shrunk to fit content (the CMS-wide 100vh hard boundary).
   *   mode "multi":  scale = min(vw/cw, maxScale) — width fit; the caller grows the box to the design height with
   *                  CSS aspect-ratio, so the whole design is visible with no crop.
   *
   * BACKGROUND plate — depends on `opts.breakpoint` (2026-09-25 review follow-up):
   *   "desktop" (default; >= 992px): the geometry commit c4535fa (before the stage-fit work) rendered, UNCHANGED —
   *       a canvas-sized plate (cw x ch design px) scaled scale(sx, sy) to fill the stage box, whole image
   *       visible, the mild stretch on an off-ratio window being the trade-off the owner accepted. It is also what
   *       the Designer canvas shows, so canvas and live agree. Multi mode: the same plate under the single
   *       width-only scale, with height = the full stacked design height.
   *   "tablet" | "mobile": a UNIFORM cover plate. The non-uniform stretch is severe on these portrait boxes (14% at
   *       768x1024, 36% at 800x1280) and drifted out of register with the uniformly-scaled content, so the plate is
   *       (vw/scale) x (vh/scale) canvas units under the SAME uniform scale: it COVERS the whole box, and
   *       `background-size: cover` plus the owner's saved focal point resolve against the real section box.
   *
   * The content plate is top-anchored. contentLeft: on desktop exactly as c4535fa (centred only when height-limited,
   * i.e. scaleY < scaleX; 0 otherwise, and always 0 in multi mode); on tablet/mobile horizontally centred:
   * max(0, (vw - cw*scale) / 2).
   *
   * ASSUMPTIONS: cw/ch are design px > 0 (callers floor them); vw/vh are the fitted box in CSS px (the plate's
   *   stage: the section minus any Section Header inset); maxScale defaults to Infinity.
   * FAILURE MODES: non-finite/<= 0 cw or ch -> 1; non-finite/<= 0 vw or vh -> cw / ch (so the scale is 1, never
   *   NaN / 0 / Infinity); an unknown breakpoint is treated as "desktop". Every scale factor is rounded to 4dp (kills
   *   float noise from the vw/cw division, which renders text visibly soft under transform:scale() — same
   *   mitigation both editor canvases apply to their own zoom).
   *
   * navGuide/navCover (optional, Fix A 2026-09-30 — see FRAME_GUIDE_NAV and the navbar-guide-
   * drift block inside the function body): when both are > 0 and the single-mode plate would
   * otherwise place navGuide (canvas px) under the live navbar's real bottom edge (navCover,
   * CSS px), scale is shrunk (never grown) and contentTop is set so the guide lands exactly on
   * navCover instead. Omitted, or multi mode, or already clear of the navbar: contentTop stays
   * 0 and scale is unaffected — byte-identical to before this fix existed.
   *
   * @param {{cw:number,ch:number,vw:number,vh:number,mode?:"single"|"multi",maxScale?:number,
   *          breakpoint?:"desktop"|"tablet"|"mobile",navGuide?:number,navCover?:number}} opts
   * @returns {{scale:number,contentLeft:number,contentTop:number,contentW:number,contentH:number,
   *            bg:{left:number,top:number,width:number,height:number,scale:number,scaleX:number,scaleY:number,
   *                transform:string}}}
   */
  function computeStageFit(opts) {
    opts = opts || {};
    var cw = isFinite(opts.cw) && opts.cw > 0 ? Number(opts.cw) : 1;
    var ch = isFinite(opts.ch) && opts.ch > 0 ? Number(opts.ch) : 1;
    var vw = isFinite(opts.vw) && opts.vw > 0 ? Number(opts.vw) : cw;
    var vh = isFinite(opts.vh) && opts.vh > 0 ? Number(opts.vh) : ch;
    var maxScale = isFinite(opts.maxScale) && opts.maxScale > 0 ? Number(opts.maxScale) : Infinity;
    var multi = opts.mode === "multi";
    var uniformBg = opts.breakpoint === "tablet" || opts.breakpoint === "mobile";
    var round4 = function (n) { return Math.round(n * 10000) / 10000; };
    var scaleX = round4(Math.min(vw / cw, maxScale));
    var scaleY = round4(Math.min(vh / ch, maxScale));
    var scale = multi ? scaleX : Math.min(scaleX, scaleY);

    // Navbar-guide-drift fix (Fix A, 2026-09-30): on a free-mode SINGLE section, the live
    // navbar is a fixed, unscaled overlay `navCover` px tall that sits on top of everything
    // (see FRAME_GUIDE_NAV's own doc comment). At the natural `scale` above, the design's
    // navGuide line (the navbar's real bottom edge, in canvas px) can land ABOVE that real
    // navbar's bottom edge — content the Designer shows as clear of the navbar then renders
    // hidden underneath it live. Fix: shrink the stage further (NEVER grow it — the 100vh
    // hard boundary this section already sits inside must not be violated) until the guide
    // lands exactly on the navbar's bottom edge, and shift the plate down by the same
    // amount so nothing above the guide is cropped off the top.
    // opts.navGuide/opts.navCover are optional — omitted (or <= 0), `guide`/`cover` are 0,
    // the condition below is always false, and every line below it is dead: output is
    // byte-identical to before this fix existed.
    var guide = isFinite(opts.navGuide) && opts.navGuide > 0 ? Number(opts.navGuide) : 0;
    var cover = isFinite(opts.navCover) && opts.navCover > 0 ? Number(opts.navCover) : 0;
    var contentTop = 0;
    // !multi: multi-mode sections grow the box to fit (no fixed-height contract to protect
    //   the way single-mode's 100vh boundary is) and were never in scope for this bug.
    // guide < ch: a guide at/past the design's own bottom edge can't be satisfied sanely.
    // vh > cover: if the whole stage box is shorter than the navbar cover itself, the guide
    //   is impossible to satisfy — fall back to the unmodified result rather than producing
    //   a negative/nonsense scale.
    // guide * scale < cover: only correct when the natural scale actually puts the guide
    //   under the navbar — a guide that already clears it needs no adjustment.
    if (!multi && guide > 0 && cover > 0 && guide < ch && vh > cover && guide * scale < cover) {
      // Largest scale that keeps the guide's post-shift screen position (cover - guide*scale
      // + guide*scale = cover) and the plate's bottom (cover + scale*(ch-guide)) inside vh.
      // Math.min: shrink only, this can never grow scale above what it already was.
      // Math.max(..., 1e-4): a pathological input (e.g. vh only fractionally larger than
      // cover, against a tall ch-guide span) can drive the raw quotient to ~0 — floor it at
      // the smallest nonzero value this function's own 4dp rounding can represent, so scale
      // can never become exactly 0 (a real division-by-effectively-zero). Unreachable at any
      // real viewport size (see the property test's randomized range) — pure safety net.
      scale = Math.min(scale, Math.max(Math.floor(((vh - cover) / (ch - guide)) * 1e4) / 1e4, 1e-4));
      contentTop = cover - guide * scale; // guide now lands exactly on the navbar's real bottom edge
    }

    var contentW = cw * scale;
    // scale < scaleX (equivalent to the pre-fix `scaleY < scaleX` in every case that ever
    // reached it — scale is already Math.min(scaleX, scaleY) whenever multi is false, the
    // only branch that guard is read in): centres when the FINAL scale (after the navGuide
    // shrink above, if it applied) is height-constrained, so contentLeft reflects whatever
    // scale the plate actually renders at, not a stale pre-shrink value.
    var contentLeft = (uniformBg || (!multi && scale < scaleX)) ? Math.max(0, (vw - contentW) / 2) : 0;
    var bg = uniformBg
      ? { left: 0, top: 0, width: vw / scale, height: vh / scale, scale: scale, scaleX: scale, scaleY: scale,
          transform: "scale(" + scale + ")" }
      : { left: 0, top: 0, width: cw, height: ch, scale: scaleX, scaleX: scaleX, scaleY: multi ? scaleX : scaleY,
          transform: multi ? "scale(" + scaleX + ")" : "scale(" + scaleX + ", " + scaleY + ")" };
    return {
      scale: scale,
      contentLeft: contentLeft,
      contentTop: contentTop,
      contentW: contentW,
      contentH: ch * scale,
      bg: bg,
    };
  }

  /**
   * resolveVoltFullBleed(fullBleed, box, canvasW, canvasH) — pure. THE single decision of
   * whether a free-mode Volt block renders "full-bleed" (fills its box edge-to-edge,
   * fit=cover) vs letterboxed ("contain", centred). Consumed by BOTH:
   *   1. public/flexible-designer.html's buildVoltPreviewUrl()            (free-mode canvas preview)
   *   2. components/sections/FlexibleSectionRenderer.tsx's case "volt"    (live in-grid render, fit=cover vs contain)
   *
   * WHY THIS EXISTS (2026-09-30): the Designer's own (former) isVoltFullBleed() inferred
   * "full-bleed" from a block's free-mode BOX GEOMETRY (its box covers the full canvas
   * width+height, within a 3px rounding tolerance) whenever the author never explicitly
   * ticked "Full Bleed" — so a block visually sized to fill its box previewed correctly
   * (cover-fit) in the Designer canvas. Live's case "volt" used a STRICT `!!props.fullBleed`
   * check with NO geometry fallback at all, so the exact same un-flagged-but-visually-full
   * block rendered small/letterboxed on the live site — Designer and live disagreeing about
   * a block neither side actually authored differently. Confirmed general (affects any
   * full-bleed Volt usage sitewide, not Hero-specific) — this function is the ONE shared
   * formula that closes that fit=cover/contain gap.
   *
   * NOT consumed by isFullBleedVolt() (FlexibleSectionRenderer.tsx) — that is a SEPARATE,
   * deliberately narrower decision: whether a volt block is PROMOTED out of the normal
   * content plate onto the section-level background layer. Promotion stays gated on the
   * EXPLICIT `props.fullBleed === true` flag only, with no geometry fallback. A block that
   * geometrically covers its canvas but was never flagged gets `fit:cover` via this
   * function and still renders correctly — it just stays in the normal in-grid content
   * plate instead of being lifted to the background layer. Do not extend isFullBleedVolt()
   * to consult geometry/canvasSize to "finish" this unification — an earlier version that
   * did so mis-promoted un-flagged blocks and was reverted (see git history for this file
   * and FlexibleSectionRenderer.tsx around 2026-09-30).
   *
   * Explicit `fullBleed === true` / `=== false` is ALWAYS authoritative — geometry is
   * never consulted once the author has toggled the checkbox either way. Only
   * `fullBleed === undefined` (never explicitly set) falls back to geometry: true when
   * `box` covers the full `canvasW` x `canvasH` (every edge within the 3px tolerance).
   *
   * Scope: this is the FREE-MODE geometry heuristic only (a block's absolute on-canvas
   * px box vs. the design canvas's own px size). The Designer's SEPARATE grid-mode
   * heuristic (does the block's grid-cell span cover every row/column of the grid) is a
   * different coordinate system this function does not model — it was never part of the
   * Designer/live mismatch this function exists to fix, and stays a local, per-caller
   * check where it is still needed (public/flexible-designer.html's buildVoltPreviewUrl).
   *
   * @param {boolean | undefined} fullBleed - props.fullBleed as stored (tri-state:
   *   true/false/undefined — undefined means "never explicitly set").
   * @param {{x?:number,y?:number,w?:number,h?:number}|null|undefined} box - the block's
   *   resolved on-canvas free-mode geometry, in the SAME px space as canvasW/canvasH
   *   (Designer: getDisplayPos(b); live: block.pixelPos / tabletPos / mobilePos, already
   *   resolved to the active breakpoint). null/undefined (a grid/mosaic block has no such
   *   box) safely resolves to "not full-bleed" rather than throwing.
   * @param {number} canvasW - design canvas width, same px space as `box` (Designer:
   *   canvas.offsetWidth; live: resolveCanvasDim(designerCanvasW, 1440)).
   * @param {number} canvasH - design canvas height, same px space (live multi-mode: pass
   *   the FULL stacked height, ch * multiLimit — the same total the Designer's own multi
   *   canvas spans at authoring time — not a single 100vh band).
   * @returns {boolean}
   */
  function resolveVoltFullBleed(fullBleed, box, canvasW, canvasH) {
    if (fullBleed === true) return true;
    if (fullBleed !== undefined) return false; // explicit false — geometry ignored
    try {
      if (!box || !isFinite(canvasW) || !isFinite(canvasH) || canvasW <= 0 || canvasH <= 0) return false;
      var x = Number(box.x) || 0, y = Number(box.y) || 0;
      var w = Number(box.w) || 0, h = Number(box.h) || 0;
      var TOL = 3; // px tolerance for rounding — matches the Designer's original #82 heuristic
      var coversW = x <= TOL && (x + w) >= canvasW - TOL;
      var coversH = y <= TOL && (y + h) >= canvasH - TOL;
      return coversW && coversH;
    } catch (e) { return false; }
  }

  return {
    normalizeFontStack: normalizeFontStack,
    extractFontFamilyName: extractFontFamilyName,
    collectFontRequests: collectFontRequests,
    buildGoogleFontHref: buildGoogleFontHref,
    ensureGoogleFontLinks: ensureGoogleFontLinks,
    measuredLineCount: measuredLineCount,
    computeStageFit: computeStageFit,
    FRAME_GUIDE_NAV: FRAME_GUIDE_NAV,
    resolveVoltFullBleed: resolveVoltFullBleed,
    isBlankBackgroundBundle: isBlankBackgroundBundle,
    resolveLiveBackgroundBundle: resolveLiveBackgroundBundle,
    computeSubElementStyle: computeSubElementStyle,
    computeSubElementPosition: computeSubElementPosition,
    restampBlockZIndexes: restampBlockZIndexes,
    resolveBlockZIndex: resolveBlockZIndex,
    styleObjectToCssText: styleObjectToCssText,
    computeMultiBgLayers: computeMultiBgLayers,
    resolveBgPositionCss: resolveBgPositionCss,
    resolveBackgroundPosForBreakpoint: resolveBackgroundPosForBreakpoint,
    resolveBgZoomLayer: resolveBgZoomLayer,
    buildGradientCss: buildGradientCss,
    getUnsetBackgroundBundle: getUnsetBackgroundBundle,
    resolveBackgroundBundleForBreakpoint: resolveBackgroundBundleForBreakpoint,
  };
});
