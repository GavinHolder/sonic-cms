"use client";

import type { LowerThirdConfig } from "@/types/section";
import { getPresetPath } from "@/lib/lower-third-presets";

interface LowerThirdRendererProps {
  config: LowerThirdConfig;
}

/**
 * LowerThirdRenderer
 *
 * Renders a decorative shape/image at the bottom of a section.
 * z-index: 10 — above section content (z-index 5), below motion elements (z-index 20),
 * and well below intro text animations (z-index 30).
 *
 * Always positioned at section bottom via absolute positioning.
 * The parent section must have position: relative.
 */
export default function LowerThirdRenderer({ config }: LowerThirdRendererProps) {
  if (!config.enabled) return null;

  const transformParts = [
    config.flipHorizontal ? "scaleX(-1)" : "",
    config.flipVertical ? "scaleY(-1)" : "",
  ].filter(Boolean);

  const transform = transformParts.length > 0 ? transformParts.join(" ") : undefined;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: `${config.height}px`,
    zIndex: 10,
    overflow: "hidden",
    pointerEvents: "none",
    transform,
  };

  if (config.mode === "image" && config.imageSrc) {
    return (
      <div style={containerStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={config.imageSrc}
          alt=""
          aria-hidden="true"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // Preset SVG mode
  const path = getPresetPath(config.preset, config.height);
  const fill = config.presetColor || "#ffffff";
  const opacity = config.presetOpacity ?? 1;

  return (
    <div style={containerStyle}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${config.height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden="true"
      >
        <path d={path} fill={fill} fillOpacity={opacity} />
      </svg>
    </div>
  );
}
