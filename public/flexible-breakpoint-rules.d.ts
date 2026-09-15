// public/flexible-breakpoint-rules.d.ts
//
// Type declarations for flexible-breakpoint-rules.js — see that file's own
// doc comment for the full contract. Companion to flexible-render-rules.d.ts.

export type Breakpoint = "desktop" | "tablet" | "mobile";

export interface ResolvedVariants {
  desktop: Record<string, unknown> | null;
  tablet: Record<string, unknown> | null;
  mobile: Record<string, unknown> | null;
}

export interface ActiveVariant {
  data: Record<string, unknown> | null;
  isFallback: boolean;
}

export interface SerializedVariants {
  variant: "per-breakpoint";
  desktop: Record<string, unknown> | null;
  tablet: Record<string, unknown> | null;
  mobile: Record<string, unknown> | null;
}

export function resolveVariants(rawDesignerData: unknown): ResolvedVariants;
export function pickBreakpointForWidth(screenW: number): Breakpoint;
export function pickActiveVariant(resolved: ResolvedVariants, breakpoint: Breakpoint): ActiveVariant;
export function duplicateVariant<T>(sourceVariantData: T | null): T | null;
export function clampBlocksToCanvas<T extends { x?: number; y?: number; w?: number; h?: number }>(
  blocks: T[],
  canvasW: number,
  canvasH: number
): T[];
export function serializeVariants(variants: Partial<ResolvedVariants>): SerializedVariants;

export interface ReconcileDims {
  /** Overrides the DESKTOP source canvas width (other sources always use their own blob's). */
  srcW?: number;
  srcH?: number;
  /** Target canvas box; defaults to the target variant's own designerCanvasW/H (× multiLimit in multi mode). */
  dstW?: number;
  dstH?: number;
}
/** Full authored canvas box of one variant: W (or 1440/768/375 default) × H (or 900) × multiLimit when multi. */
export function variantCanvasDims(variant: Record<string, unknown> | null | undefined, key: Breakpoint): { w: number; h: number };
/**
 * Union-reconcile: returns a NEW block array for `targetKey` containing every block id found in any
 * variant — existing target blocks untouched (healed only if fully off-canvas), missing ones deep-cloned
 * from Desktop (else whichever variant has them), scaled by dstW/srcW incl. sub-elements, clamped on-canvas.
 */
export function reconcileVariantBlocks<T extends Record<string, unknown>>(
  targetBlocks: T[] | null | undefined,
  variants: Partial<ResolvedVariants>,
  targetKey: Breakpoint,
  dims?: ReconcileDims
): T[];
