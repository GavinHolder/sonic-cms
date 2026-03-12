/**
 * Lower Third SVG Presets
 *
 * Each preset returns an SVG path string for a shape that fills
 * the full width of its container. Use with viewBox="0 0 1440 HEIGHT"
 * and preserveAspectRatio="none" for responsive stretching.
 */

import type { LowerThirdConfig, LowerThirdPreset } from "@/types/section";

export type { LowerThirdPreset };

/** Returns SVG <path> d= attribute value for the given preset */
export function getPresetPath(preset: LowerThirdPreset, height: number): string {
  const H = height;
  const W = 1440;
  switch (preset) {
    case "wave":
      return `M0,${H} C360,0 1080,${H} ${W},0 L${W},${H} Z`;
    case "diagonal":
      return `M0,${H} L${W},0 L${W},${H} Z`;
    case "arch":
      return `M0,${H} Q${W / 2},0 ${W},${H} Z`;
    case "stepped":
      return `M0,${H} L0,${H * 0.5} L${W * 0.5},${H * 0.5} L${W * 0.5},0 L${W},0 L${W},${H} Z`;
    case "mountain":
      return `M0,${H} L${W * 0.3},${H * 0.2} L${W * 0.5},${H * 0.6} L${W * 0.7},${H * 0.1} L${W},${H} Z`;
    case "blob":
      return `M0,${H} C${W * 0.1},${H * 0.4} ${W * 0.3},${H * 0.1} ${W * 0.5},${H * 0.3} C${W * 0.7},${H * 0.5} ${W * 0.9},0 ${W},${H * 0.2} L${W},${H} Z`;
    case "chevron":
      return `M0,${H} L${W * 0.5},0 L${W},${H} Z`;
    case "ripple":
      return `M0,${H} C${W * 0.25},${H * 0.5} ${W * 0.25},0 ${W * 0.5},${H * 0.2} C${W * 0.75},${H * 0.4} ${W * 0.75},0 ${W},${H * 0.1} L${W},${H} Z`;
    default:
      return `M0,${H} L${W},${H} L${W},0 L0,0 Z`;
  }
}

/** Human-readable labels for UI */
export const PRESET_LABELS: Record<LowerThirdPreset, string> = {
  wave: "Wave",
  diagonal: "Diagonal",
  arch: "Arch",
  stepped: "Stepped",
  mountain: "Mountain",
  blob: "Blob",
  chevron: "Chevron",
  ripple: "Ripple",
};

export const DEFAULT_LOWER_THIRD: LowerThirdConfig = {
  enabled: false,
  mode: "preset",
  preset: "wave",
  presetColor: "#ffffff",
  presetOpacity: 1,
  imageSrc: "",
  height: 120,
  flipHorizontal: false,
  flipVertical: false,
};
