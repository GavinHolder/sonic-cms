/**
 * Hand-written type declarations for volt-glass-rules.js (TypeScript pairs a
 * `.d.ts` with the same-named
 * `.js` in the same directory, so `import { buildVoltGlassStyle } from
 * "../../public/volt-glass-rules.js"` type-checks without checkJs). The JS is
 * also loaded standalone as a <script> tag by public/volt-designer.html
 * (window.VoltGlassRules).
 */
import type { CSSProperties } from "react";
import type { VoltFill } from "../types/volt";

export interface VoltGlassDefaults {
  blur: number;
  color: string;
  opacity: number;
  glassBorderRadius: number;
  borderOpacity: number;
  borderColor: string;
  borderWidth: number;
  brightness: number;
  saturate: number;
  contrast: number;
  grain: number;
  highlight: number;
}

export interface VoltGlassPreset {
  id: string;
  label: string;
  /** Partial glass fields merged over the current fill. Never includes glassBorderRadius. */
  values: Partial<Omit<VoltFill, "id" | "type" | "blendMode">>;
}

export declare const VOLT_GLASS_DEFAULTS: VoltGlassDefaults;
export declare const VOLT_GLASS_PRESETS: VoltGlassPreset[];

/** Glass-surface-only style (backdrop-filter, tint/grain, border, radius, highlight). Layer-level props are the caller's. */
export declare function buildVoltGlassStyle(fill: Partial<VoltFill> | null | undefined): CSSProperties;

/** camelCase style object → cssText string. */
export declare function styleObjectToCssText(styleObj: Record<string, string | number | undefined | null>): string;
