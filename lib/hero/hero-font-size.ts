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
 * MODEL - per-breakpoint OWN fields over a frozen legacy base:
 *   `fontSize` is the LEGACY base. It is the only size the preset layout uses and freeform size edits NEVER
 *   write it. Each breakpoint may carry its OWN explicit field: `fontSizeDesktop`, `fontSizeTablet`,
 *   `fontSizeMobile`. For a breakpoint BP:
 *     - own field usable (finite number > 0) -> the exact formula below, computed from that field alone;
 *     - otherwise                            -> the EXACT LEGACY string for BP computed from `fontSize`
 *                                               (byte-identical to what every slide rendered before this feature).
 *   Each breakpoint therefore reads only its own field or the frozen legacy `fontSize` - never another
 *   breakpoint's own field - so editing one breakpoint cannot change another at ANY viewport width, and an
 *   element with no own fields renders byte-for-byte as it always did.
 *
 * FORMULAS (S = size, X = a Tablet/Mobile own value):
 *   LEGACY (no own field for the breakpoint, from `fontSize`):
 *       desktop / tablet:  clamp(FLOOR px, VW vw, S px)
 *       mobile, headings:  clamp(20px, 7.5vw | 7vw, min(S, 44) px)       mobile, subheading / button: as desktop
 *   Desktop OWN (S = fontSizeDesktop):
 *       S <= VW * 1920 / 100  ->  the legacy string with S (identical, nothing to honour beyond it)
 *       S >  VW * 1920 / 100  ->  clamp(FLOOR px, max(VW vw, S/1920*100 vw), S px)
 *                                 i.e. S is honoured above the old cap, proportional to 1920px, never above S.
 *   Tablet / Mobile OWN (X = fontSizeTablet | fontSizeMobile, REF = 768 | 375):
 *       clamp(10px, X/REF*100 vw, X*1.25 px)       exactly X at the reference device, proportional on
 *                                                  other widths, never above 1.25*X.
 *
 * ASSUMPTIONS:
 *  1. `breakpoint` is what HeroCarousel resolves from the window (mobile < 768, tablet 768-991, else
 *     desktop) or from `forceViewport`; the mobile heading rule keys off it (no separate flag).
 *  2. An own value is honoured only when it is a finite number > 0; anything else counts as "not set",
 *     so a corrupted or hand-edited value can never break the render - it falls back to legacy(`fontSize`).
 *  3. When the legacy `size` itself is not a finite number the legacy output is the old string built from
 *     the raw value (invalid CSS the browser drops, exactly as before) - never "fixed up".
 *
 * FAILURE MODES / VALIDATION: see `parseFontSizeInput` for the editor-side input guard (never NaN).
 */
import { MOBILE_VIEWPORT, TABLET_VIEWPORT, type HeroEditBreakpoint } from "./hero-device-fit";

export type FreeformFontKind = "heading" | "legacyHeading" | "subheading" | "button";

export interface FreeformFontSizeInput {
  kind: FreeformFontKind;
  breakpoint: HeroEditBreakpoint;
  /** The legacy base `fontSize` (px). Buttons default to 18 when undefined (the old `?? 18`). */
  size: number | undefined;
  /** The element's OWN per-breakpoint sizes (px). Each is read only for its own breakpoint. */
  sizeDesktop?: number;
  sizeTablet?: number;
  sizeMobile?: number;
}

/** Desktop reference width: an own desktop size is honoured exactly at this window width. */
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

/** Window width at which a breakpoint's own value is "exact" (1920 / 768 / 375). */
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
  const spec = SPECS[kind];
  // `?? 18` for buttons (covers undefined AND a null that JSON round-tripped from an old NaN), as before.
  const legacySize = kind === "button" ? (input.size ?? BUTTON_DEFAULT_PX) : input.size;
  // ONLY this breakpoint's own field is ever read - never another breakpoint's.
  const own = breakpoint === "desktop" ? input.sizeDesktop : breakpoint === "tablet" ? input.sizeTablet : input.sizeMobile;

  if (!isUsableFontSize(own)) return legacyPlan(kind, breakpoint, legacySize);
  if (breakpoint === "desktop") {
    return own <= legacyFontSizeThreshold(kind)
      ? { mode: "legacy", floor: spec.floor, vw: spec.vw, cap: own }
      : { mode: "scaled", floor: spec.floor, vw: spec.vw, size: own };
  }
  return { mode: "own", size: own, refW: referenceViewportW(breakpoint) };
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
 * Returns NaN where the CSS string would be invalid (non-numeric legacy size).
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
 * What the LEGACY rule (from `fontSize`) renders at the breakpoint's reference device (Desktop 1920,
 * Tablet 768, Mobile 375) - the "Auto" / "Legacy" size the editor shows for a breakpoint with no own value.
 * Undefined when it cannot be computed (non-numeric legacy size).
 */
export function legacyFontSizePx(kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: number | undefined): number | undefined {
  const px = resolveFreeformFontSizePx({ kind, breakpoint, size }, referenceViewportW(breakpoint));
  return Number.isFinite(px) ? px : undefined;
}

/** The three OWN size fields an element may carry (all optional; absent = legacy for that breakpoint). */
export interface FontSizeOwnFields {
  fontSizeDesktop?: number;
  fontSizeTablet?: number;
  fontSizeMobile?: number;
}

/** Any size patch the editor writes: an own field (freeform) or the legacy `fontSize` (preset layout). */
export type FontSizePatch = FontSizeOwnFields & { fontSize?: number };

export type FontSizeOwnFieldName = keyof FontSizeOwnFields;

/** The own field a breakpoint reads and writes. */
export function fontSizeOwnFieldName(breakpoint: HeroEditBreakpoint): FontSizeOwnFieldName {
  return breakpoint === "mobile" ? "fontSizeMobile" : breakpoint === "tablet" ? "fontSizeTablet" : "fontSizeDesktop";
}

/**
 * The patch for typing `value` into a breakpoint: ONLY that breakpoint's own field. A fresh object each
 * call; nothing else (not `fontSize`, not another breakpoint) is ever part of it.
 */
export function fontSizeEditPatch(breakpoint: HeroEditBreakpoint, value: number): FontSizePatch {
  if (breakpoint === "mobile") return { fontSizeMobile: value };
  if (breakpoint === "tablet") return { fontSizeTablet: value };
  return { fontSizeDesktop: value };
}

/**
 * The patch for the reset (x): the breakpoint's own field set to `undefined`, so after JSON serialisation
 * the key is gone and that breakpoint is back on the legacy rule.
 */
export function fontSizeResetPatch(breakpoint: HeroEditBreakpoint): FontSizePatch {
  if (breakpoint === "mobile") return { fontSizeMobile: undefined };
  if (breakpoint === "tablet") return { fontSizeTablet: undefined };
  return { fontSizeDesktop: undefined };
}

/**
 * Only the own size fields an element actually carries, for code that rebuilds an element field-by-field
 * (e.g. classic heading -> stacked row): spreading this keeps them and adds NO keys to an element
 * that has none.
 */
export function pickFontSizeFields(el: FontSizeOwnFields | undefined): FontSizeOwnFields {
  const out: FontSizeOwnFields = {};
  if (el?.fontSizeDesktop !== undefined) out.fontSizeDesktop = el.fontSizeDesktop;
  if (el?.fontSizeTablet !== undefined) out.fontSizeTablet = el.fontSizeTablet;
  if (el?.fontSizeMobile !== undefined) out.fontSizeMobile = el.fontSizeMobile;
  return out;
}

/**
 * THE editor-side input guard for a Size / Font Size field (the only one; the component calls it).
 * Returns the px to store (0.1px precision), or undefined for "nothing to store" (empty, non-numeric,
 * NaN, Infinity). NEVER returns NaN - a prior bug let a cleared Font Size input write NaN into saved content.
 *  - "clamp" (default, used on blur): out-of-range values are clamped into [FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX].
 *  - "strict" (used while typing): out-of-range values return undefined, so a half-typed "1" on the way to
 *    "100" is not committed as a size.
 */
export function parseFontSizeInput(raw: string, mode: "clamp" | "strict" = "clamp"): number | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  const n = Number(text);
  if (!Number.isFinite(n)) return undefined;
  const rounded = roundPx(n);
  if (mode === "strict") return rounded >= FONT_SIZE_MIN_PX && rounded <= FONT_SIZE_MAX_PX ? rounded : undefined;
  return Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, rounded));
}
