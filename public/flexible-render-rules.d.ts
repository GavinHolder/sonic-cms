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
  /**
   * LIVE renderer only, heading only: the sub-element's stored `_measuredH`. With `exact`, a heading the Designer
   * measured as ONE line is kept on one line (white-space: nowrap). The Designer canvas must never pass this.
   */
  measuredH?: number;
  /** LIVE renderer only: the sub-element was authored with an explicit height (disables the measuredH line guard). */
  fixedHeight?: boolean;
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

/**
 * The app's ONLY z-order mechanism for the Designer canvas: stamps each
 * block's `.zIndex` to its 1-based array index. MUTATES `blocks` in place
 * (deliberately — see the doc comment in flexible-render-rules.js).
 * Designer-canvas-only; the live renderer never reorders blocks.
 */
export function restampBlockZIndexes(blocks: Array<{ zIndex?: number }> | null | undefined): void;

/**
 * Resolves one top-level block's effective z-index for painting: a
 * full-bleed Volt block (`block.props.fullBleed`) is forced to 0; otherwise
 * the block's own stored `.zIndex` wins; otherwise `fallback` (typically
 * `index + 1`). See the doc comment in flexible-render-rules.js for the
 * full contract and both consumers.
 */
export function resolveBlockZIndex(
  block: { type?: string; zIndex?: number; props?: { fullBleed?: boolean } } | null | undefined,
  fallback?: number
): number;

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

/** True when a background bundle paints nothing (invalid, or no image / non-transparent colour / visible gradient). */
export function isBlankBackgroundBundle(bundle: BgBundle | null | undefined): boolean;

/**
 * LIVE-PAGE background resolution: identical to resolveBackgroundBundleForBreakpoint() (isolation kept) except that
 * a Tablet/Mobile breakpoint that is NOT authored and shows the Desktop layout (fallbackMode "desktop", the
 * default) borrows Desktop's bundle when its own is missing or blank. Never written back; the Designer does not
 * use it. See the doc comment in flexible-render-rules.js.
 */
export function resolveLiveBackgroundBundle(
  backgroundByBreakpoint: Partial<BackgroundByBreakpoint> | null | undefined,
  breakpoint: "desktop" | "tablet" | "mobile",
  legacyBundle: BgBundle,
  breakpointAuthored: boolean,
  fallbackMode?: "desktop" | "none"
): BgBundle;

export interface StageFitOpts {
  /** Design canvas size in design px (for multi: the FULL stacked height cw x (ch * bands)). */
  cw: number;
  ch: number;
  /** The box the design is fitted into, CSS px. */
  vw: number;
  vh: number;
  /** "single" (default): contain-fit; "multi": width fit only (the caller grows the box). */
  mode?: "single" | "multi";
  /** Upper clamp on the uniform scale (e.g. 1.15 for the Mobile plate, 1 for the Designer's own zoom). */
  maxScale?: number;
  /**
   * Active breakpoint. "desktop" (default) keeps the pre-2026-09-25 background geometry (canvas-sized plate under
   * scale(sx, sy)); "tablet"/"mobile" get the uniform cover plate. Does not affect `scale`.
   */
  breakpoint?: "desktop" | "tablet" | "mobile";
}

export interface StageFit {
  /** The ONE uniform scale factor (4dp). */
  scale: number;
  /** Content plate offset inside the box: horizontally centred, top-anchored. */
  contentLeft: number;
  contentTop: number;
  contentW: number;
  contentH: number;
  /**
   * Background plate. Tablet/mobile: (vw/scale) x (vh/scale) canvas units under the SAME uniform factor, so it covers
   * the whole box. Desktop: the canvas-sized cw x ch plate under scale(scaleX, scaleY) (multi: one width-only factor).
   * `transform` is the ready-made CSS string; `scale` is the horizontal factor.
   */
  bg: { left: number; top: number; width: number; height: number; scale: number; scaleX: number; scaleY: number; transform: string };
}

/** The single shared decision of how a free-mode canvas is fitted into a box — uniform, never stretched. */
export function computeStageFit(opts: StageFitOpts): StageFit;

/** Replaces a trailing Google category word (display/handwriting — not valid CSS generics) with a real generic. */
export function normalizeFontStack<T extends string | undefined | null>(css: T): T;
/** First (webfont) family of a stack, or "" for generics/inherit/system stacks. */
export function extractFontFamilyName(css: unknown): string;

export interface FontRequest {
  family: string;
  weights: number[];
}
/** Every webfont (+ the union of its used weights, 400/700 always) referenced by the given block lists. */
export function collectFontRequests(
  blockLists: Array<Array<{ props?: Record<string, unknown>; subElements?: Array<{ props?: Record<string, unknown> }> }> | null | undefined>
): FontRequest[];
/** The one Google Fonts css2 URL builder for the Flexible system (Designer + live renderer). */
export function buildGoogleFontHref(family: string, weights: number[]): string;
/** Idempotently appends a stylesheet <link> per request to `doc`; returns the links it created. */
export function ensureGoogleFontLinks(doc: Document, requests: FontRequest[]): HTMLLinkElement[];
/** Lines the Designer showed for a heading/eyebrow, decoded from its stored `_measuredH` (null if unknowable). */
export function measuredLineCount(type: string, props: Record<string, unknown> | undefined, measuredH: unknown): number | null;
