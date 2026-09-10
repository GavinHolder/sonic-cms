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
