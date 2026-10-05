/**
 * Single source of truth for the Hero Carousel FREEFORM text-size CSS (heading rows, legacy single
 * heading, subheading, buttons). ONE system per concern: HeroCarousel.tsx (the live page, the Live
 * Preview and the Tablet/Mobile canvas, which all render HeroCarousel itself) calls
 * `resolveFreeformFontSizeCss`; the Desktop editor canvas chips (SlideEditor's FreeformDragSurface)
 * call the numeric twin `resolveFreeformFontSizePx`. Both are derived from the same internal plan,
 * so they cannot drift apart. Preset (non-freeform) layouts do NOT use this module.
 *
 * WHY: the authored "Size (px)" used to be only the MAX of `clamp(FLOOR, Nvw, MAXpx)`. On a 1920px
 * window `clamp(32px, 8vw, 200px)` is 153.6px, so any size above 153.6 did nothing on Desktop; on
 * Tablet (768px) and Mobile (375px) the vw term is smaller still, so the field was inert there.
 * Worse, one shared `fontSize` fed all three breakpoints, so they were not independent.
 *
 * "LEGACY UNTIL FIRST EDIT, THEN MATERIALIZE AND ISOLATE":
 *   An element is LEGACY unless its `fontSizeIndependent` flag is exactly true. A legacy element renders
 *   with the OLD strings byte-for-byte for every size (also S above the old cap, also if stray
 *   fontSizeTablet/fontSizeMobile values exist), so every slide saved before this feature renders exactly
 *   as it always did. The first time the owner edits any size field of a legacy element, the editor
 *   calls `materializeFontSizes` - it snapshots what the element renders at the reference widths (Desktop
 *   1920, Tablet 768, Mobile 375) into fontSize / fontSizeTablet / fontSizeMobile and sets the flag - and
 *   then applies the typed value to the edited breakpoint only. From then on the three breakpoints are
 *   fully independent: nothing a breakpoint renders ever reads another breakpoint's value.
 *
 * FORMULAS (S = authored desktop size, X = an authored per-breakpoint size):
 *   LEGACY element, every breakpoint:
 *       desktop / tablet:  clamp(FLOOR px, VW vw, S px)
 *       mobile, headings:  clamp(20px, 7.5vw | 7vw, min(S, 44) px)       mobile, subheading / button: as desktop
 *   FLAGGED (independent) element:
 *       Desktop:  S <= vw * 1920 / 100  ->  the legacy string (identical, nothing to honour beyond it)
 *                 S >  vw * 1920 / 100  ->  clamp(FLOOR px, max(VW vw, S/1920*100 vw), S px)
 *                 i.e. S is honoured above the old cap, proportional to a 1920px reference, never above S.
 *       Tablet:   own X (REF 768) -> clamp(10px, X/REF*100 vw, X*1.25 px); exact at the reference device,
 *       Mobile:   own X (REF 375)    proportional on other widths, never above 1.25*X. Tablet reads ONLY
 *                 fontSizeTablet and Mobile ONLY fontSizeMobile - never Desktop's or each other's value.
 *       A flagged element whose own value is missing/unusable falls back to the LEGACY string for that
 *       breakpoint (never to another breakpoint's value).
 *
 * ASSUMPTIONS:
 *  1. `breakpoint` is what HeroCarousel resolves from the window (mobile < 768, tablet 768-991, else
 *     desktop) or from `forceViewport`; the mobile heading rule keys off it (no separate flag).
 *  2. A per-breakpoint value is honoured only when it is a finite number > 0; anything else is
 *     treated as "not set" so a corrupted saved value can never break the render.
 *  3. When the authored desktop `size` itself is not a finite number the output is the old string
 *     built from the raw value (invalid CSS the browser drops, exactly as before) - never "fixed up".
 *  4. `independent` is honoured only when it is exactly `true`.
 *
 * FAILURE MODES / VALIDATION: see `parseFontSizeInput` for the editor-side input guard (never NaN).
 * Known, accepted limits of materialization: it reproduces the legacy size EXACTLY at the three reference
 * widths (to 0.1px) and on Desktop at every width <= 1920; away from the Tablet/Mobile reference width the
 * per-breakpoint value scales proportionally (<= 1.25x) where the legacy rule was flat, and a legacy
 * Desktop size above the old cap (S > 153.6 for headings) materializes to the cap, so it no longer
 * keeps growing on windows wider than 1920px.
 */
import { MOBILE_VIEWPORT, TABLET_VIEWPORT, type HeroEditBreakpoint } from "./hero-device-fit";

export type FreeformFontKind = "heading" | "legacyHeading" | "subheading" | "button";

export interface FreeformFontSizeInput {
  kind: FreeformFontKind;
  breakpoint: HeroEditBreakpoint;
  /** The authored desktop size (px). Buttons default to 18 when undefined (the old `?? 18`). */
  size: number | undefined;
  /** Optional per-breakpoint sizes (px). Ignored unless `independent` is true. */
  sizeTablet?: number;
  sizeMobile?: number;
  /** The element's `fontSizeIndependent` flag. Absent / not exactly true = LEGACY rendering (old strings). */
  independent?: boolean;
}

/** Desktop reference width: an authored desktop size is honoured exactly at this window width. */
export const DESKTOP_REF_W = 1920;
/** Per-breakpoint value never renders above this multiple of itself (reached on wider windows). */
export const OWN_SIZE_CAP_RATIO = 1.25;
/** Per-breakpoint value never renders below this many px. */
export const OWN_SIZE_MIN_PX = 10;
/** Button label size when `fontSize` is unset (the pre-existing hardcoded look). */
export const BUTTON_DEFAULT_PX = 18;
/** Mobile heading ceiling of the legacy mobile rule. */
const LEGACY_MOBILE_HEADING_CAP_PX = 44;

/** Editor input bounds for every Size / Font Size control. */
export const FONT_SIZE_MIN_PX = 8;
export const FONT_SIZE_MAX_PX = 400;

interface KindSpec {
  floor: number;
  vw: number;
  /** Present for headings only: the narrower legacy mobile rule. */
  mobile?: { floor: number; vw: number };
}

const SPECS: Record<FreeformFontKind, KindSpec> = {
  heading: { floor: 32, vw: 8, mobile: { floor: 20, vw: 7.5 } },
  legacyHeading: { floor: 28, vw: 7, mobile: { floor: 20, vw: 7 } },
  subheading: { floor: 16, vw: 4 },
  button: { floor: 14, vw: 3.5 },
};

type Plan =
  /** clamp(floor px, vw vw, cap px) - the previous string. `cap` is kept raw so the string stays byte-identical. */
  | { mode: "legacy"; floor: number; vw: number; cap: unknown }
  /** clamp(floor px, max(vw vw, size/1920*100 vw), size px) */
  | { mode: "scaled"; floor: number; vw: number; size: number }
  /** clamp(10px, size/refW*100 vw, size*1.25 px) */
  | { mode: "own"; size: number; refW: number };

export function isUsableFontSize(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** Window width at which a breakpoint's authored value is "exact" (1920 / 768 / 375). */
export function referenceViewportW(breakpoint: HeroEditBreakpoint): number {
  return breakpoint === "mobile" ? MOBILE_VIEWPORT.w : breakpoint === "tablet" ? TABLET_VIEWPORT.w : DESKTOP_REF_W;
}

/** Largest desktop size for which the old rule already honoured the value (identity threshold). */
export function legacyFontSizeThreshold(kind: FreeformFontKind): number {
  return (SPECS[kind].vw * DESKTOP_REF_W) / 100;
}

/** The previous rule, byte-for-byte (see the FORMULAS block above). */
function legacyPlan(kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: number | undefined): Plan {
  const spec = SPECS[kind];
  if (breakpoint === "mobile" && spec.mobile) {
    // Old mobile heading rule. Math.min on the raw value reproduces the old string even for null/NaN.
    return { mode: "legacy", floor: spec.mobile.floor, vw: spec.mobile.vw, cap: Math.min(size as number, LEGACY_MOBILE_HEADING_CAP_PX) };
  }
  return { mode: "legacy", floor: spec.floor, vw: spec.vw, cap: size };
}

function planFor(input: FreeformFontSizeInput): Plan {
  const { kind, breakpoint } = input;
  // `?? 18` for buttons (covers undefined AND a null that JSON round-tripped from an old NaN), as before.
  const size = kind === "button" ? (input.size ?? BUTTON_DEFAULT_PX) : input.size;

  // LEGACY element (flag absent / false / anything but true): the old strings for every size and breakpoint.
  if (input.independent !== true) return legacyPlan(kind, breakpoint, size);

  if (breakpoint === "desktop") {
    if (!isUsableFontSize(size) || size <= legacyFontSizeThreshold(kind)) return legacyPlan(kind, breakpoint, size);
    return { mode: "scaled", floor: SPECS[kind].floor, vw: SPECS[kind].vw, size };
  }

  // Tablet / Mobile: ONLY this breakpoint's own value, else the legacy string (never another breakpoint's value).
  const own = breakpoint === "tablet" ? input.sizeTablet : input.sizeMobile;
  if (isUsableFontSize(own)) return { mode: "own", size: own, refW: referenceViewportW(breakpoint) };
  return legacyPlan(kind, breakpoint, size);
}

/** Rounds to 6 decimals and drops trailing zeros: 10.416667, 8, 53.333333 (keeps the string short, error < 0.00002px). */
function num(n: number): string {
  return String(Number(n.toFixed(6)));
}

/** The CSS `font-size` value HeroCarousel uses for a freeform text element. */
export function resolveFreeformFontSizeCss(input: FreeformFontSizeInput): string {
  const plan = planFor(input);
  if (plan.mode === "legacy") return `clamp(${plan.floor}px, ${plan.vw}vw, ${plan.cap}px)`;
  if (plan.mode === "scaled") {
    return `clamp(${plan.floor}px, max(${plan.vw}vw, ${num((plan.size / DESKTOP_REF_W) * 100)}vw), ${plan.size}px)`;
  }
  return `clamp(${OWN_SIZE_MIN_PX}px, ${num((plan.size / plan.refW) * 100)}vw, ${num(plan.size * OWN_SIZE_CAP_RATIO)}px)`;
}

/**
 * Numeric twin of `resolveFreeformFontSizeCss`: the px that CSS resolves to at a given viewport
 * width. clamp(MIN, VAL, MAX) = max(MIN, min(VAL, MAX)), exactly as CSS defines it (MIN wins).
 * Returns NaN where the CSS string would be invalid (non-numeric authored size).
 */
export function resolveFreeformFontSizePx(input: FreeformFontSizeInput, viewportW: number): number {
  const plan = planFor(input);
  const clampPx = (min: number, val: number, max: number) => Math.max(min, Math.min(val, max));
  if (plan.mode === "legacy") return clampPx(plan.floor, (plan.vw / 100) * viewportW, Number(plan.cap));
  if (plan.mode === "scaled") {
    const scaledVw = Math.max((plan.vw / 100) * viewportW, (plan.size / DESKTOP_REF_W) * viewportW);
    return clampPx(plan.floor, scaledVw, plan.size);
  }
  return clampPx(OWN_SIZE_MIN_PX, (plan.size / plan.refW) * viewportW, plan.size * OWN_SIZE_CAP_RATIO);
}

/** Rounds to 0.1px - the precision of every stored per-breakpoint size. */
export function roundPx(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * What a LEGACY (unflagged) element renders at the breakpoint's reference device (Desktop 1920,
 * Tablet 768, Mobile 375) - the "legacy size" the editor shows. Undefined when it cannot be computed
 * (non-numeric authored size).
 */
export function legacyFontSizePx(kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: number | undefined): number | undefined {
  const px = resolveFreeformFontSizePx({ kind, breakpoint, size, independent: false }, referenceViewportW(breakpoint));
  return Number.isFinite(px) ? px : undefined;
}

/** Size assumed when an element has no usable desktop size (the editor's own defaults for a fresh element). */
const FALLBACK_SIZE_PX: Record<FreeformFontKind, number> = { heading: 56, legacyHeading: 56, subheading: 24, button: BUTTON_DEFAULT_PX };

export interface MaterializedFontSizes {
  fontSize: number;
  fontSizeTablet: number;
  fontSizeMobile: number;
  fontSizeIndependent: true;
}

/**
 * Snapshot of a LEGACY element's effective sizes at the reference widths, rounded to 0.1px, plus the flag.
 * Spread it into the element BEFORE applying the typed value (one immutable update):
 *   { ...element, ...materializeFontSizes(kind, element.fontSize), [editedField]: typed }
 * Desktop is measured at 1920, so e.g. a legacy heading with S=400 materializes Desktop=153.6, which
 * renders exactly as it did at every width <= 1920.
 */
export function materializeFontSizes(kind: FreeformFontKind, size: number | undefined): MaterializedFontSizes {
  const s = isUsableFontSize(size) ? size : FALLBACK_SIZE_PX[kind];
  const at = (bp: HeroEditBreakpoint) => roundPx(legacyFontSizePx(kind, bp, s) ?? FALLBACK_SIZE_PX[kind]);
  return { fontSize: at("desktop"), fontSizeTablet: at("tablet"), fontSizeMobile: at("mobile"), fontSizeIndependent: true };
}

/** The size fields an edit may write onto a heading row / heading / subheading / button. */
export interface FontSizePatch {
  fontSize?: number;
  fontSizeTablet?: number;
  fontSizeMobile?: number;
  fontSizeIndependent?: boolean;
}

/** What the editor needs to know about the element being edited. */
export interface FontSizeEditTarget {
  /** The element's authored desktop size (buttons: pass `fontSize ?? 18`). */
  size: number | undefined;
  /** The element's `fontSizeIndependent` flag. */
  independent?: boolean;
}

/**
 * The ONE immutable patch for typing `value` into the `breakpoint` field. A LEGACY element is materialized in
 * the same patch (snapshot of all three breakpoints + flag, then the typed value on top), so the first edit of
 * any breakpoint never changes how another looks. A flagged element writes ONLY its own breakpoint's field.
 */
export function fontSizeEditPatch(kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, target: FontSizeEditTarget, value: number): FontSizePatch {
  const base: FontSizePatch = target.independent === true ? {} : materializeFontSizes(kind, target.size);
  if (breakpoint === "tablet") return { ...base, fontSizeTablet: value };
  if (breakpoint === "mobile") return { ...base, fontSizeMobile: value };
  return { ...base, fontSize: value };
}

/**
 * Patch for the reset (x) on a flagged element's Tablet/Mobile field: re-snapshot the legacy-equivalent px for
 * that breakpoint from the CURRENT desktop number (a copied value, not a live link). Undefined when there is
 * nothing to reset (Desktop, a legacy element, or an uncomputable size).
 */
export function fontSizeResetPatch(kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, target: FontSizeEditTarget): FontSizePatch | undefined {
  if (breakpoint === "desktop" || target.independent !== true) return undefined;
  const px = legacyFontSizePx(kind, breakpoint, target.size);
  if (px === undefined) return undefined;
  return breakpoint === "tablet" ? { fontSizeTablet: roundPx(px) } : { fontSizeMobile: roundPx(px) };
}

/**
 * Only the per-breakpoint size fields an element actually carries, for code that rebuilds an element
 * field-by-field (e.g. classic heading -> stacked row): spreading this keeps the flag and values, and adds NO
 * keys to a legacy element.
 */
export function pickFontSizeFields(el: FontSizePatch | undefined): FontSizePatch {
  const out: FontSizePatch = {};
  if (el?.fontSizeIndependent !== undefined) out.fontSizeIndependent = el.fontSizeIndependent;
  if (el?.fontSizeTablet !== undefined) out.fontSizeTablet = el.fontSizeTablet;
  if (el?.fontSizeMobile !== undefined) out.fontSizeMobile = el.fontSizeMobile;
  return out;
}

/**
 * Editor-side input guard for a Size / Font Size field. Returns the px to store (0.1px precision), or
 * undefined for "nothing to store" (empty, non-numeric, NaN, Infinity). Out-of-range values are
 * clamped into [FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX]. NEVER returns NaN - a prior bug let a cleared
 * Font Size input write NaN into saved content.
 */
export function parseFontSizeInput(raw: string): number | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  const n = Number(text);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, roundPx(n)));
}
