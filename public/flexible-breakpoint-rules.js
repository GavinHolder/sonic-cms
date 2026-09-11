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
    serializeVariants: serializeVariants,
  };
});
