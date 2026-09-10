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
 * while writing it.
 *
 * Scope: heading / paragraph / button sub-element STYLE, plus the
 * free-canvas container-block sub-element WRAPPER POSITION formula.
 * Everything else (image/badge/icon/divider, outline/shadow filters,
 * animation, block-level layout) is untouched and stays in each consumer.
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

  return {
    computeSubElementStyle: computeSubElementStyle,
    computeSubElementPosition: computeSubElementPosition,
    styleObjectToCssText: styleObjectToCssText,
  };
});
