/**
 * volt-layer-order-rules.js
 *
 * Shared, framework-agnostic layer z-order sort for a Volt design — the
 * single source of truth for "what order do this design's layers paint in",
 * consumed identically by:
 *   1. public/volt-designer.html            (vanilla JS, <script> global → window.VoltLayerOrderRules)
 *   2. lib/volt/volt-utils.ts                (ES module import, re-exported as sortLayersByZ)
 *      → components/volt/VoltRenderer.tsx    (via lib/volt/volt-utils.ts's sortLayersByZ)
 *
 * WHY THIS FILE EXISTS: Volt Studio's own canvas painter used to do its own
 * inline `.sort()` for render order, never calling lib/volt/volt-utils.ts's
 * sortLayersByZ (it couldn't — that lived in a `.ts` file a plain `<script
 * src>` tag can't load). That let the Studio canvas's paint order silently
 * drift from the live renderer's — the exact drift pattern
 * public/flexible-render-rules.js was created to kill (CLAUDE.md "ONE SYSTEM
 * PER CONCERN"). This module moves the sort itself here first, same pattern
 * as public/volt-glass-rules.js.
 *
 * Ascending by zIndex: lowest zIndex paints first (furthest back), highest
 * paints last (frontmost) — standard back-to-front paint order.
 *
 * Loadable two ways (UMD-lite), same as volt-glass-rules.js.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  } else {
    root.VoltLayerOrderRules = mod;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Ascending-zIndex paint order. Pure — returns a new array, never mutates
   * input. Matches lib/volt/volt-utils.ts's sortLayersByZ exactly:
   * `[...layers].sort((a, b) => a.zIndex - b.zIndex)` — no defaulting, since
   * VoltLayer.zIndex is a required `number` field.
   */
  function sortLayersByZ(layers) {
    var list = Array.isArray(layers) ? layers : [];
    return list.slice().sort(function (a, b) {
      return a.zIndex - b.zIndex;
    });
  }

  return {
    sortLayersByZ: sortLayersByZ,
  };
});
