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
 *
 * FORMULAS (S = authored size, X = an authored per-breakpoint size):
 *   Desktop, and Tablet with no tablet value ("scaled"):
 *       S <= vw * 1920 / 100  ->  clamp(FLOOR px, VW vw, S px)               (byte-identical to the old string)
 *       S >  vw * 1920 / 100  ->  clamp(FLOOR px, max(VW vw, S/1920*100 vw), S px)
 *     i.e. a superset of the old rule: identical for every size the old rule could already express,
 *     and above that threshold the size is honoured proportionally to a 1920px reference (never above S).
 *   Mobile with no mobile value ("legacy mobile"): the previous mobile rule, unchanged.
 *       headings:  clamp(20px, 7.5vw | 7vw, min(S, 44) px)       subheading / button: same as desktop's old rule
 *   Tablet / Mobile WITH its own value X ("own"):
 *       clamp(10px, X/REF*100 vw, X*1.25 px)        REF = 768 (tablet) / 375 (mobile)
 *     i.e. exactly X at the reference device, proportional on other widths, never above 1.25*X.
 *
 * ASSUMPTIONS:
 *  1. `breakpoint` is what HeroCarousel resolves from the window (mobile < 768, tablet 768-991, else
 *     desktop) or from `forceViewport`; the mobile heading rule keys off it (no separate flag).
 *  2. A per-breakpoint value is honoured only when it is a finite number > 0; anything else is
 *     treated as "not set" so a corrupted saved value can never break the render.
 *  3. When the authored desktop `size` itself is not a finite number the output is the old string
 *     built from the raw value (invalid CSS the browser drops, exactly as before) — never "fixed up".
 *
 * FAILURE MODES / VALIDATION: see `parseFontSizeInput` for the editor-side input guard (never NaN).
 */
import { MOBILE_VIEWPORT, TABLET_VIEWPORT, type HeroEditBreakpoint } from "./hero-device-fit";

export type FreeformFontKind = "heading" | "legacyHeading" | "subheading" | "button";

export interface FreeformFontSizeInput {
  kind: FreeformFontKind;
  breakpoint: HeroEditBreakpoint;
  /** The authored desktop size (px). Buttons default to 18 when undefined (the old `?? 18`). */
  size: number | undefined;
  /** Optional per-breakpoint sizes (px). Absent = today's behaviour exactly. */
  sizeTablet?: number;
  sizeMobile?: number;
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
  /** clamp(floor px, vw vw, cap px) — the previous string. `cap` is kept raw so the string stays byte-identical. */
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

function planFor(input: FreeformFontSizeInput): Plan {
  const { kind, breakpoint } = input;
  const spec = SPECS[kind];

  const own = breakpoint === "tablet" ? input.sizeTablet : breakpoint === "mobile" ? input.sizeMobile : undefined;
  if (isUsableFontSize(own)) return { mode: "own", size: own, refW: referenceViewportW(breakpoint) };

  // `?? 18` for buttons (covers undefined AND a null that JSON round-tripped from an old NaN), as before.
  const size = kind === "button" ? (input.size ?? BUTTON_DEFAULT_PX) : input.size;

  if (breakpoint === "mobile") {
    if (spec.mobile) {
      // Old mobile heading rule. Math.min on the raw value reproduces the old string even for null/NaN.
      return { mode: "legacy", floor: spec.mobile.floor, vw: spec.mobile.vw, cap: Math.min(size as number, LEGACY_MOBILE_HEADING_CAP_PX) };
    }
    return { mode: "legacy", floor: spec.floor, vw: spec.vw, cap: size };
  }

  // desktop + tablet-without-own-value
  if (!isUsableFontSize(size) || size <= legacyFontSizeThreshold(kind)) {
    return { mode: "legacy", floor: spec.floor, vw: spec.vw, cap: size };
  }
  return { mode: "scaled", floor: spec.floor, vw: spec.vw, size };
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

/**
 * The size this element renders at on the breakpoint's reference device when NO per-breakpoint
 * value is set (the "Auto" the editor shows). Desktop returns the authored size's own rendering
 * at 1920. Returns undefined when it cannot be computed (non-numeric authored size).
 */
export function autoFontSizePx(kind: FreeformFontKind, breakpoint: HeroEditBreakpoint, size: number | undefined): number | undefined {
  const px = resolveFreeformFontSizePx({ kind, breakpoint, size }, referenceViewportW(breakpoint));
  return Number.isFinite(px) ? px : undefined;
}

/**
 * Editor-side input guard for a Size / Font Size field. Returns the integer px to store, or
 * undefined for "nothing to store" (empty, non-numeric, NaN, Infinity). Out-of-range values are
 * clamped into [FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX]. NEVER returns NaN — a prior bug let a cleared
 * Font Size input write NaN into saved content.
 */
export function parseFontSizeInput(raw: string): number | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  const n = Number(text);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, Math.round(n)));
}
