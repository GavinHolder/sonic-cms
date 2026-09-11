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
export function serializeVariants(variants: Partial<ResolvedVariants>): SerializedVariants;
