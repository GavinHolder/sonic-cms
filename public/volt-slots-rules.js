/**
 * volt-slots-rules.js
 *
 * Canonical list of VoltSlots keys (see types/volt.ts's `VoltSlots` interface)
 * — a single source of truth for which slot keys exist — consumed by:
 *   1. public/flexible-designer.html's buildVoltPreviewUrl()  (forwards a Volt
 *      block's manual slot-override props into its own Designer-canvas
 *      preview iframe's URL, <script> global → window.VoltSlotsRules)
 *   2. app/volt-preview/[id]/page.tsx                          (parses that
 *      same URL's params back into a VoltSlots object; ES module import)
 *
 * WHY THIS FILE EXISTS: a 2026-09 audit found buildVoltPreviewUrl() only
 * ever forwarded 6 of VoltSlots' 8 keys as 6 separately hand-typed
 * `if (...) sp.set(...)` lines — `actionHref` and `badge` were silently
 * dropped, so the Designer canvas's own live Volt preview iframe never
 * showed a bound action link or badge even though real seeded content
 * (prisma/seed-v6.ts) sets both on Volt block props today.
 * components/sections/FlexibleSectionRenderer.tsx's own two slot builders
 * (the canonical LIVE-render path — DesignerBlocksRenderer's 'volt' case and
 * FullBleedVoltLayer) already handle all 8 keys correctly and are the de
 * facto source of truth this list was derived from; this file exists so the
 * Designer-forwarding and volt-preview-parsing sides can no longer
 * independently drift from that same 8-key set the same way three keys
 * (font, button box-model, z-index) already drifted between
 * flexible-designer.html and FlexibleSectionRenderer.tsx before
 * flexible-render-rules.js was created (CLAUDE.md "ONE SYSTEM PER CONCERN").
 *
 * Each slot key's flat block-prop name (the one a Volt block's own
 * `.props` object stores a manual override under) follows one fixed
 * convention: "slot" + capitalize-first-letter(key) — e.g. "actionHref" →
 * "slotActionHref", "imageUrl" → "slotImageUrl" — matching every existing
 * prop name already in use across flexible-designer.html /
 * FlexibleSectionRenderer.tsx / seed data. slotPropKey() below is that one
 * conversion, extracted so a caller iterating VOLT_SLOT_KEYS never has to
 * hand-write its own capitalization (or drift from it independently).
 *
 * The Designer-canvas URL param name for each slot is the bare slot key
 * itself (e.g. `?actionHref=...`, not `?slotActionHref=...`) — matching
 * both buildVoltPreviewUrl()'s pre-existing param names for the other 6
 * keys and app/volt-preview/[id]/page.tsx's own route doc comment.
 *
 * Loadable two ways (UMD-lite), same as flexible-render-rules.js /
 * volt-glass-rules.js:
 *   - As a plain <script> tag → exposes window.VoltSlotsRules.
 *   - As an ES module (`import { VOLT_SLOT_KEYS } from
 *     "@/public/volt-slots-rules.js"`) from app/volt-preview/[id]/page.tsx.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  } else {
    root.VoltSlotsRules = mod;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * The 8 VoltSlots keys (types/volt.ts), in the same order that interface
   * declares them. A future 9th slot key needs to be added HERE ONCE —
   * both buildVoltPreviewUrl() and volt-preview's parser iterate this array
   * instead of hand-listing keys, so adding one here is enough to reach
   * both consumers.
   */
  var VOLT_SLOT_KEYS = ["title", "body", "imageUrl", "imageAlt", "actionLabel", "actionHref", "badge", "icon"];

  /**
   * slotKey ("actionHref") → the block prop name storing its manual
   * override ("slotActionHref") — the one fixed "slot" + Capitalized
   * convention every consumer already follows.
   *
   * FAILURE MODES:
   * - Non-string/empty `slotKey` → returns "slot" + "" = "slot" (the
   *   original NaN/undefined-style edge case this file's callers never
   *   actually hit, since they always iterate VOLT_SLOT_KEYS itself).
   */
  function slotPropKey(slotKey) {
    var k = String(slotKey == null ? "" : slotKey);
    return "slot" + k.charAt(0).toUpperCase() + k.slice(1);
  }

  return {
    VOLT_SLOT_KEYS: VOLT_SLOT_KEYS,
    slotPropKey: slotPropKey,
  };
});
