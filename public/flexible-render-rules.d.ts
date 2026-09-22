/**
 * Hand-written type declarations for flexible-render-rules.js.
 *
 * TypeScript pairs a `.d.ts` with a same-named `.js` file in the same
 * directory automatically, so `import { computeSubElementStyle } from
 * "../../public/flexible-render-rules.js"` picks this up without needing
 * `checkJs`/JSDoc inference on the plain-JS source. Kept intentionally
 * loose (no dependency on the FlexibleSectionRenderer-internal `SubEl`
 * type) since this module is also loaded standalone as a <script> tag by
 * public/flexible-designer.html, which has no TypeScript types at all.
 */
import type { CSSProperties } from "react";

export interface SubElementStyleOpts {
  /** Free-canvas / Designer-canvas 1:1 mode. The Designer canvas always passes true. */
  exact?: boolean;
  /** Free-reflow mobile mode (renderer only). */
  mobile?: boolean;
  /** Suppresses the #212529 default text colour on a dark section background (renderer only). */
  darkBg?: boolean;
}

export interface SubElementPixelPos {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface SubElementGeometry {
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
}

/**
 * Computes the style object for a heading/paragraph/button sub-element.
 * Returns `{}` for any other `type` (image/badge/icon/divider/etc. are out
 * of scope for this shared module and remain implemented per-consumer).
 */
export function computeSubElementStyle(
  type: string,
  props: Record<string, unknown> | undefined,
  opts?: SubElementStyleOpts
): CSSProperties;

/**
 * Computes the absolute-pixel wrapper geometry for a sub-element inside a
 * free-canvas container block, as used by FlexibleSectionRenderer.tsx's
 * DesignerBlocksRenderer free-canvas plate branch. See the doc comment in
 * flexible-render-rules.js for why this is NOT also wired into the
 * Designer canvas (public/flexible-designer.html).
 */
export function computeSubElementPosition(
  pos: SubElementPixelPos | undefined,
  sub: SubElementGeometry,
  blockProps: Record<string, unknown> | undefined
): CSSProperties;

/**
 * Serializes a camelCase style object into an inline CSS text fragment.
 * Used by public/flexible-designer.html's innerHTML-string-based
 * heading/paragraph rendering; not used by the React renderer.
 */
export function styleObjectToCssText(styleObj: Record<string, unknown>): string;

export interface MultiBgLayersOpts {
  /** One band's height in design px. */
  ch: number;
  /** Admin-set band count (2-10); single mode passes/implies 1. */
  multiLimit: number;
  /** "Repeat per section" toggle. Falsy (default) = today's single-layer cover behavior. */
  repeat?: boolean;
  bgImageUrl?: string;
  bgImageSize?: string;
  bgImagePosition?: string;
  bgImageRepeat?: string;
  bgImageOpacity?: number;
  maskCss?: string | null;
}

export interface MultiBgLayer {
  /** Layer's top offset in design px, relative to the multi-band box. */
  top: number;
  /** Layer height in design px. */
  height: number;
  /** Already-built, sanitized `url('...')` string, or undefined when no bgImageUrl was given. */
  backgroundImage?: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  opacity: number;
  maskCss?: string;
}

/**
 * Computes background-image layer geometry for a free-canvas multi/dynamic
 * section's background — one array entry per rendered layer div. See the
 * doc comment in flexible-render-rules.js for the full contract.
 */
export function computeMultiBgLayers(opts: MultiBgLayersOpts): MultiBgLayer[];

/**
 * Converts an optional 0-100 percentage pair into a CSS position value
 * ("<x>% <y>%"), usable for both `background-position` and `object-position`.
 * Either axis missing/non-numeric (or out of range, clamped) falls back to
 * "center" — the pre-existing hardcoded default for every block-level
 * cover/background image. See the doc comment in flexible-render-rules.js
 * for the full contract (the "Reposition Background Image" feature).
 */
export function resolveBgPositionCss(
  x: number | null | undefined,
  y: number | null | undefined
): string;

/** One breakpoint's drag-to-reposition override for a section's own background image. */
export interface BackgroundPosPoint {
  x: number;
  y: number;
}

/**
 * Per-breakpoint override container for a FLEXIBLE section's own background
 * image position (content.backgroundPos). Each entry is an explicit {x,y}
 * override, or null meaning "not yet customized for this breakpoint — falls
 * back per resolveBackgroundPosForBreakpoint's contract". Mirrors the
 * {desktop,tablet,mobile} shape flexible-breakpoint-rules.js's
 * resolveVariants()/pickActiveVariant() already use for per-breakpoint
 * designerData, for consistency across the codebase's per-breakpoint data.
 */
export interface BackgroundPosVariants {
  desktop: BackgroundPosPoint | null;
  tablet: BackgroundPosPoint | null;
  mobile: BackgroundPosPoint | null;
}

/**
 * Resolves which {x,y} pair to use for a SECTION's own background position
 * at a given breakpoint: an explicit per-breakpoint override, else (for
 * tablet/mobile) Desktop's own override, else the legacy pre-per-breakpoint
 * flat backgroundPosX/backgroundPosY pair, else {x:null,y:null} ("center").
 * Feed the result straight into resolveBgPositionCss(x, y) above. See the
 * doc comment in flexible-render-rules.js for the full contract.
 */
export function resolveBackgroundPosForBreakpoint(
  backgroundPos: BackgroundPosVariants | Partial<BackgroundPosVariants> | null | undefined,
  breakpoint: "desktop" | "tablet" | "mobile",
  legacyX: number | null | undefined,
  legacyY: number | null | undefined
): { x: number | null; y: number | null };

/**
 * One FLEXIBLE section's colour-gradient OVERLAY config (content.gradient /
 * a background bundle's own `gradient` field). `preset.kind` distinguishes
 * Linear (default when absent — every gradient saved before 2026-09-22) from
 * Radial (added 2026-09-22). `shape`/`position` are radial-only; `direction`
 * is linear-only.
 */
export interface GradientConfig {
  enabled?: boolean;
  type?: "preset";
  preset?: {
    /** "radial" or anything else/absent = "linear" (the only kind that ever existed before 2026-09-22). */
    kind?: "linear" | "radial";
    /** Linear only. One of the 8 existing direction keys; defaults to "bottom". */
    direction?: string;
    /** Radial only. Defaults to "circle". */
    shape?: "circle" | "ellipse";
    /** Radial only. A CSS position string ("center", "top left", "20% 80%", ...); defaults to "center". */
    position?: string;
    startOpacity?: number;
    endOpacity?: number;
    color?: string;
  };
}

/**
 * Full background CONFIGURATION for one breakpoint of a FLEXIBLE section —
 * everything EXCEPT crop position (which stays BackgroundPosVariants' own
 * concern, resolved separately via resolveBackgroundPosForBreakpoint above).
 * See resolveBackgroundBundleForBreakpoint's doc comment in
 * flexible-render-rules.js for the full per-breakpoint contract (no
 * inheritance between breakpoints — added 2026-09-22).
 */
export interface BgBundle {
  backgroundType: "solid" | "gradient";
  /** Solid colour token/hex (e.g. "white", "#2563eb") or "transparent". Meaningful when backgroundType === "solid". */
  background: string;
  gradient?: GradientConfig;
  bgImageUrl: string;
  bgImageSize: "cover" | "contain" | "auto" | string;
  bgImageRepeat: string;
  bgImageOpacity: number;
}

/**
 * Per-breakpoint container for a FLEXIBLE section's full background bundle
 * (content.backgroundByBreakpoint). `desktop` is always a valid bundle once
 * this key exists at all (migrated from the section's legacy flat fields the
 * first time it's saved under this feature); `tablet`/`mobile` are null
 * until the admin explicitly configures that breakpoint — see
 * resolveBackgroundBundleForBreakpoint's own contract for why an unset
 * tablet/mobile NEVER inherits Desktop's bundle.
 */
export interface BackgroundByBreakpoint {
  desktop: BgBundle | null;
  tablet: BgBundle | null;
  mobile: BgBundle | null;
}

/**
 * Builds the CSS `background` shorthand value for a gradient config —
 * `linear-gradient(...)` (kind absent/"linear", the pre-2026-09-22 behaviour,
 * byte-identical) or `radial-gradient(...)` (kind "radial", new). Returns
 * null when there is nothing to render (no preset, or both opacities are 0).
 * See the doc comment in flexible-render-rules.js for the full contract.
 */
export function buildGradientCss(gradient: GradientConfig | null | undefined): string | null;

/**
 * The deliberate neutral bundle an unconfigured Tablet/Mobile breakpoint
 * resolves to: solid, transparent, no image. Always a FRESH object.
 */
export function getUnsetBackgroundBundle(): BgBundle;

/**
 * Resolves the full background bundle for one breakpoint: an explicit
 * per-breakpoint override always wins; Desktop additionally falls back to
 * `legacyBundle` (the section's pre-feature flat fields) when unset; Tablet/
 * Mobile NEVER fall back to Desktop or to legacyBundle — they resolve to
 * getUnsetBackgroundBundle() instead. See the doc comment in
 * flexible-render-rules.js for the full contract.
 */
export function resolveBackgroundBundleForBreakpoint(
  backgroundByBreakpoint: Partial<BackgroundByBreakpoint> | null | undefined,
  breakpoint: "desktop" | "tablet" | "mobile",
  legacyBundle: BgBundle
): BgBundle;
