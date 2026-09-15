/**
 * volt-glass-rules.js
 *
 * Shared, framework-agnostic CSS builder for a Volt `glass` fill — the single
 * source of truth for what a frosted/smoky glass panel looks like, consumed
 * identically by:
 *   1. public/volt-designer.html            (vanilla JS, <script> global → window.VoltGlassRules)
 *   2. components/volt/VoltRenderer.tsx      (ES module import)
 *
 * WHY THIS FILE EXISTS: the Studio canvas painter and the live renderer's
 * renderGlassOverlays() were two hand-maintained copies of the same
 * blur/tint/border/radius string-building — the exact drift pattern that
 * public/flexible-render-rules.js was created to kill (CLAUDE.md "ONE SYSTEM
 * PER CONCERN"). Extending glass with brightness/saturate/contrast/grain/
 * highlight/border colour+width would have doubled that duplication, so the
 * whole computation moved here first.
 *
 * Defaults are chosen so a pre-existing saved glass fill (only blur/opacity/
 * borderOpacity/color/glassBorderRadius set, or nothing set) produces the
 * SAME output as the old hand-built code:
 *   backdropFilter 'blur(12px)', backgroundColor 'rgba(255,255,255,0.15)',
 *   border '1px solid rgba(255,255,255,0.3)', borderRadius '12px'.
 *
 * No clamping: any finite number the user typed is honoured. Only
 * undefined / null / '' / NaN fall back to the default.
 *
 * Loadable two ways (UMD-lite), same as flexible-render-rules.js.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  } else {
    root.VoltGlassRules = mod;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VOLT_GLASS_DEFAULTS = {
    blur: 12,
    color: "#ffffff",
    opacity: 0.15,
    glassBorderRadius: 12,
    borderOpacity: 0.3,
    borderColor: "#ffffff",
    borderWidth: 1,
    brightness: 100,
    saturate: 100,
    contrast: 100,
    grain: 0,
    highlight: 0,
  };

  /** Partial fills merged over the current glass fill. Never touch glassBorderRadius. */
  var VOLT_GLASS_PRESETS = [
    { id: "smoky-matte", label: "Smoky Matte", values: { color: "#0b1020", opacity: 0.55, blur: 24, brightness: 85, saturate: 80, contrast: 100, grain: 0.06, borderColor: "#ffffff", borderOpacity: 0.08, borderWidth: 1, highlight: 0 } },
    { id: "dark-tint", label: "Dark Tint", values: { color: "#020417", opacity: 0.65, blur: 16, brightness: 90, saturate: 100, grain: 0, borderOpacity: 0.1, highlight: 0 } },
    { id: "frosted-light", label: "Frosted", values: { color: "#ffffff", opacity: 0.18, blur: 20, brightness: 105, saturate: 130, grain: 0, borderOpacity: 0.35, highlight: 0.4 } },
    { id: "clear", label: "Clear", values: { color: "#ffffff", opacity: 0.06, blur: 8, brightness: 100, saturate: 100, grain: 0, borderOpacity: 0.2, highlight: 0.2 } },
  ];

  /** Finite number or default. Accepts numeric strings (form inputs); never clamps. */
  function num(v, d) {
    if (v === undefined || v === null || v === "") return d;
    var n = typeof v === "number" ? v : parseFloat(v);
    return isNaN(n) || !isFinite(n) ? d : n;
  }

  /**
   * Parses #rgb / #rrggbb / #rrggbbaa (alpha ignored — the fill's own opacity
   * field is the alpha) into [r,g,b]. Unparseable → parse the fallback instead.
   */
  function parseHex(hex, fallback) {
    if (typeof hex === "string") {
      var h = hex.trim();
      if (h.charAt(0) === "#") h = h.slice(1);
      if (h.length === 3 || h.length === 4) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      if ((h.length === 6 || h.length === 8) && /^[0-9a-fA-F]+$/.test(h)) {
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
    }
    return fallback ? parseHex(fallback, null) : [255, 255, 255];
  }

  function rgba(rgb, a) {
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
  }

  /** Tiling fractalNoise SVG as a CSS url() — the matte "grain" texture. */
  function grainImage(alpha) {
    var svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)' opacity='" + alpha + "'/></svg>";
    return 'url("data:image/svg+xml,' + svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23") + '")';
  }

  /**
   * buildVoltGlassStyle(fill) — pure. Returns a plain object of camelCase CSS
   * properties (React `style` shape) for the glass surface ONLY. Layer-level
   * props (position/size, layer opacity, rotation, blend mode, pointer-events)
   * stay with each consumer.
   */
  function buildVoltGlassStyle(fill) {
    var f = fill || {};
    var D = VOLT_GLASS_DEFAULTS;
    var blur = num(f.blur, D.blur);
    var brightness = num(f.brightness, D.brightness);
    var saturate = num(f.saturate, D.saturate);
    var contrast = num(f.contrast, D.contrast);
    var tint = parseHex(f.color, D.color);
    var tintA = num(f.opacity, D.opacity);
    var radius = num(f.glassBorderRadius, D.glassBorderRadius);
    var borderRgb = parseHex(f.borderColor, D.borderColor);
    var borderA = num(f.borderOpacity, D.borderOpacity);
    var borderW = num(f.borderWidth, D.borderWidth);
    var grain = num(f.grain, D.grain);
    var highlight = num(f.highlight, D.highlight);

    var backdrop = "blur(" + blur + "px)";
    if (brightness !== 100 || saturate !== 100 || contrast !== 100) {
      backdrop += " brightness(" + brightness + "%) saturate(" + saturate + "%) contrast(" + contrast + "%)";
    }

    var style = {
      backdropFilter: backdrop,
      WebkitBackdropFilter: backdrop,
    };
    var tintCss = rgba(tint, tintA);
    if (grain > 0) {
      // Noise on top (overlay-blended into the tint), tint gradient underneath so
      // the colour still reads at full strength.
      style.backgroundImage = grainImage(grain) + ", linear-gradient(" + tintCss + ", " + tintCss + ")";
      style.backgroundBlendMode = "overlay, normal";
    } else {
      style.backgroundColor = tintCss;
    }
    style.border = borderW + "px solid " + rgba(borderRgb, borderA);
    style.borderRadius = radius + "px";
    if (highlight > 0) {
      style.boxShadow = "inset 0 1px 0 rgba(255,255,255," + highlight + ")";
    }
    return style;
  }

  /** camelCase style object → cssText string (WebkitBackdropFilter → -webkit-backdrop-filter). */
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

  return {
    VOLT_GLASS_DEFAULTS: VOLT_GLASS_DEFAULTS,
    VOLT_GLASS_PRESETS: VOLT_GLASS_PRESETS,
    buildVoltGlassStyle: buildVoltGlassStyle,
    styleObjectToCssText: styleObjectToCssText,
  };
});
