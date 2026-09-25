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

/** What a Tablet/Mobile breakpoint shows when it has not been designed (content.undesignedBreakpoint). */
export type UndesignedBreakpointMode = "desktop" | "none";

export interface LiveVariant extends ActiveVariant {
  /** true only for fallbackMode "none" on an undesigned breakpoint: render nothing (data.blocks is []). */
  blank: boolean;
}

/** True iff the variant holds at least one block (NOT merely "exists" — see the JS doc comment). */
export function isVariantAuthored(variant: Record<string, unknown> | null | undefined): boolean;

/**
 * LIVE-page variant selection: authored -> itself; undesigned -> Desktop (isFallback) by default, or blank
 * when the section opts in via content.undesignedBreakpoint === "none". The Designer keeps pickActiveVariant.
 */
export function pickLiveVariant(
  resolved: ResolvedVariants,
  breakpoint: Breakpoint,
  fallbackMode?: UndesignedBreakpointMode
): LiveVariant;
export function duplicateVariant<T>(sourceVariantData: T | null): T | null;
export function clampBlocksToCanvas<T extends { x?: number; y?: number; w?: number; h?: number }>(
  blocks: T[],
  canvasW: number,
  canvasH: number
): T[];
export function serializeVariants(variants: Partial<ResolvedVariants>): SerializedVariants;

export interface ReconcileDims {
  /** Overrides the DESKTOP source canvas width (other sources always use their own blob). */
  srcW?: number;
  /** Target canvas box; defaults to the target variant designerCanvasW/H (x multiLimit in multi mode). */
  dstW?: number;
  dstH?: number;
}
/** Full authored canvas box of one variant: W (or 1440/768/375 default) x H (or 900) x multiLimit when multi. */
export function variantCanvasDims(variant: Record<string, unknown> | null | undefined, key: Breakpoint): { w: number; h: number };
/**
 * ADDITIVE reconcile, two granularities (2026-09-21, round 2): returns a NEW array holding every
 * existing target block at the same index/order — the SAME reference when it already has every
 * sub-element another variant has for that block id, else a new shallow copy with the missing
 * sub-elements unioned in (own existing sub-elements keep their references/order/position, only
 * the missing ones are appended, scaled relative to this block's own untouched geometry) — followed
 * by deep-cloned, scaled (dstW/srcW, incl. sub-elements) and on-canvas-clamped copies of whole block
 * ids missing from the target entirely (Desktop first, then the other variant).
 * Handles both LIVE {x,y,w,h} and PERSISTED {pixelPos} block shapes. Pure.
 */
export function reconcileVariantBlocks<T extends Record<string, unknown>>(
  targetBlocks: T[] | null | undefined,
  variants: Partial<ResolvedVariants>,
  targetKey: Breakpoint,
  dims?: ReconcileDims
): T[];
/** New block array without `id` (string-compared). Pure. */
export function removeBlockId<T extends { id?: unknown }>(blocks: T[], id: unknown): T[];
