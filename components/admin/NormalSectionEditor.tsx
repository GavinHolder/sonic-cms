"use client";

import { useState, useEffect } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import type { NormalSection, GradientOverlay, AnimationType, LayoutPreset } from "@/types/section";
import type { AnimBgConfig } from "@/lib/anim-bg/types";
import { DEFAULT_ANIM_BG_CONFIG } from "@/lib/anim-bg/defaults";
import { DEFAULT_LOWER_THIRD } from "@/lib/lower-third-presets";
import type { LowerThirdConfig } from "@/types/section";
import LowerThirdTab from "./LowerThirdTab";
import MotionElementEditor, { createDefaultMotionElement } from "./MotionElementEditor";
import type { MotionElement } from "@/types/section";
import SpacingControls from "@/components/admin/SpacingControls";
import SectionIntoShapePicker from "@/components/admin/SectionIntoShapePicker";
import ImageFieldWithUpload from "@/components/admin/ImageFieldWithUpload";
import GoogleFontPicker from "@/components/admin/GoogleFontPicker";
import dynamic from "next/dynamic";
import {
  PRESET_COLORS,
  generatePalette,
  getHarmonyLabel,
  getHarmonyDescription,
  getContrastTextColor,
  isValidHex,
  openInCoolors,
  openInCoolorsVisualizer,
  type HarmonyType,
  type ColorPalette,
} from "@/lib/color-harmony";

const AnimBgEditor = dynamic(() => import("./AnimBgEditor"), { ssr: false });

const HTMLCodeEditor = dynamic(() => import("./HTMLCodeEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "280px", background: "#1e1e1e", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
      Loading editor...
    </div>
  ),
});

// Layout preset options with descriptions
const LAYOUT_PRESETS = {
  "text-only": [
    { value: "centered", label: "Centered", description: "Content centered on page" },
    { value: "left-aligned", label: "Left Aligned", description: "Content aligned to left" },
    { value: "right-aligned", label: "Right Aligned", description: "Content aligned to right" },
    { value: "split-column", label: "Split Column", description: "Two-column layout" },
  ],
  "text-image": [
    { value: "text-left-image-right", label: "Text Left + Image Right", description: "Standard side-by-side" },
    { value: "text-right-image-left", label: "Text Right + Image Left", description: "Reversed side-by-side" },
    { value: "text-overlay-center", label: "Text Overlay (Center)", description: "Text overlaid on image" },
    { value: "text-overlay-bottom", label: "Text Overlay (Bottom)", description: "Text at bottom of image" },
  ],
  "image-text": [
    { value: "image-left-text-right", label: "Image Left + Text Right", description: "Standard side-by-side" },
    { value: "image-right-text-left", label: "Image Right + Text Left", description: "Reversed side-by-side" },
    { value: "image-overlay-center", label: "Text Overlay (Center)", description: "Text overlaid on image" },
    { value: "image-overlay-bottom", label: "Text Overlay (Bottom)", description: "Text at bottom of image" },
  ],
  "grid": [
    { value: "standard-grid", label: "Standard Grid", description: "Regular grid layout" },
    { value: "overlay-top", label: "With Top Overlay", description: "Heading overlaid at top" },
    { value: "overlay-bottom", label: "With Bottom Overlay", description: "Heading overlaid at bottom" },
    { value: "overlay-center", label: "With Center Overlay", description: "Heading overlaid in center" },
  ],
  "columns": [
    { value: "standard-columns", label: "Standard Columns", description: "Regular column layout" },
    { value: "with-overlay", label: "With Overlay", description: "Columns with text overlay" },
  ],
} as const;

// Get default preset for a layout type
function getDefaultPreset(layout: string): LayoutPreset {
  const defaults: Record<string, LayoutPreset> = {
    "text-only": "centered",
    "text-image": "text-left-image-right",
    "image-text": "image-left-text-right",
    "grid": "standard-grid",
    "columns": "standard-columns",
  };
  return defaults[layout] || "centered";
}

// Get suggested overlay position based on layout preset
function getSuggestedOverlayPosition(preset: LayoutPreset): string {
  const suggestions: Record<string, string> = {
    "centered": "center",
    "left-aligned": "left",
    "right-aligned": "right",
    "split-column": "center",
    "text-left-image-right": "left",
    "text-right-image-left": "right",
    "text-overlay-center": "center",
    "text-overlay-bottom": "bottomCenter",
    "image-left-text-right": "right",
    "image-right-text-left": "left",
    "image-overlay-center": "center",
    "image-overlay-bottom": "bottomCenter",
    "standard-grid": "topCenter",
    "overlay-top": "topCenter",
    "overlay-bottom": "bottomCenter",
    "overlay-center": "center",
    "standard-columns": "topCenter",
    "with-overlay": "center",
  };
  return suggestions[preset] || "center";
}

// Check if overlay is recommended for preset
function isOverlayRecommendedForPreset(preset: LayoutPreset): boolean {
  const overlayPresets = [
    "text-overlay-center",
    "text-overlay-bottom",
    "image-overlay-center",
    "image-overlay-bottom",
    "overlay-top",
    "overlay-bottom",
    "overlay-center",
    "with-overlay",
  ];
  return overlayPresets.includes(preset);
}

// ─── Background preset lookup (shared with DynamicSection) ──────────
const BG_PRESETS: Record<string, string> = {
  white: "#ffffff",
  gray: "#f8f9fa",
  blue: "#1e3a5f",
  lightblue: "#e8f4fd",
  transparent: "transparent",
};

// ─── Triangle Live Preview Component ────────────────────────────────

/** SVG paths for right side (viewBox 0 0 200 100). Left side = scaleX(-1). */
function getPreviewShapePath(shape: string): string {
  switch (shape) {
    case "modern":   return "M 200 0 L 0 100 L 200 100 Z";
    case "steep":    return "M 200 0 L 130 100 L 200 100 Z";
    case "diagonal": return "M 0 0 L 0 100 L 200 100 Z";
    case "convex":   return "M 200 0 Q 0 0 0 100 L 200 100 Z";
    case "concave":  return "M 200 0 Q 200 100 0 100 L 200 100 Z";
    case "wave":     return "M 0 100 C 40 50 80 100 120 50 C 160 0 190 60 200 0 L 200 100 Z";
    case "arch":     return "M 0 100 Q 100 -30 200 100 Z";
    case "rhombus":  return "M 200 0 L 200 100 L 0 100 L 100 0 Z";
    default:         return "M 200 0 L 0 100 L 200 100 Z";
  }
}

interface TriangleLivePreviewProps {
  side: string;
  shape: string;
  height: number;
  gradientType: string;
  color1: string;
  color2: string;
  alpha1: number;
  alpha2: number;
  angle: number;
  imageUrl: string;
  imageSize: "cover" | "contain" | "auto";
  imagePos: string;
  imageOpacity: number;
  imageX?: number;    // 0-100, default 50
  imageY?: number;    // 0-100, default 50
  imageScale?: number; // 50-300, default 100
  hoverTextEnabled: boolean;
  hoverText: string;
  hoverTextStyle: number;
  hoverFontSize: number;
  hoverFontFamily: string;
  hoverAnimationType: string;
  hoverAnimateBehind: boolean;
  hoverAlwaysShow: boolean;
  hoverOffsetX: number;
  background: string;
  // Callbacks for real-time updates
  onHeightChange?: (value: number) => void;
  onOffsetChange?: (value: number) => void;
  onAlpha1Change?: (value: number) => void;
  onAlpha2Change?: (value: number) => void;
  onTextChange?: (value: string) => void;
  onTextStyleChange?: (value: number) => void;
  onFontSizeChange?: (value: number) => void;
}

function TriangleLivePreview(props: TriangleLivePreviewProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isRight = props.side === "right";

  // Scale the preview to fit within the panel - increased for better visibility
  const maxPreviewWidth = 320; // Increased from 260 to reduce squashing
  const actualWidth = props.height * 2;
  const scale = Math.min(1, maxPreviewWidth / actualWidth);
  const previewWidth = actualWidth * scale;
  const previewHeight = props.height * scale;

  // Hover text transform based on animation type
  const getTextTransformPreview = (): string => {
    if (props.hoverTextStyle === 1) {
      // Inside triangle - always centered
      return "translate(-50%, -50%)";
    }
    // Outside triangle - animate in on hover
    if (!isHovered && !props.hoverAlwaysShow) {
      switch (props.hoverAnimationType) {
        case "slide":
          return isRight ? "translate(30px, -50%)" : "translate(-30px, -50%)";
        case "scale":
          return isRight ? "translate(0, -50%) scale(0.5)" : "translate(0, -50%) scale(0.5)";
        case "sweep":
          return isRight ? "translate(50px, -50%)" : "translate(-50px, -50%)";
        default:
          return "translate(0, -50%)";
      }
    }
    return "translate(0, -50%)";
  };

  // Text position
  const scaledFontSize = Math.max(8, props.hoverFontSize * scale);
  const scaledOffset = props.hoverOffsetX * scale;
  const baseOutsideOffset = 60 * scale;

  const textStyle: Record<string, string | number> =
    props.hoverTextStyle === 1
      ? isRight
        ? { top: "50%", left: `calc(50% + ${scaledOffset}px)`, transform: "translate(-50%, -50%)" }
        : { top: "50%", right: `calc(50% - ${scaledOffset}px)`, transform: "translate(50%, -50%)" }
      : isRight
        ? { top: "50%", left: `-${baseOutsideOffset + Math.abs(scaledOffset)}px`, transform: getTextTransformPreview() }
        : { top: "50%", right: `-${baseOutsideOffset + Math.abs(scaledOffset)}px`, transform: getTextTransformPreview() };

  return (
    <div className="card bg-light mb-4">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 small fw-bold">
            <i className="bi bi-eye me-1"></i>
            Live Preview
          </h6>
          <button
            type="button"
            className={`btn btn-sm ${isHovered ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setIsHovered(!isHovered)}
            style={{ fontSize: "11px", padding: "2px 8px" }}
          >
            <i className={`bi ${isHovered ? "bi-eye-fill" : "bi-eye"} me-1`}></i>
            {isHovered ? "Hide Hover" : "Show Hover"}
          </button>
        </div>

        {/* Two-column layout: Preview + Controls */}
        <div className="row g-3">
          {/* Left: Preview - Sticky so it stays in view */}
          <div className="col-md-6" style={{ position: "sticky", top: "20px", alignSelf: "flex-start" }}>
            {/* Wrapper - compact size with equal padding */}
            <div style={{
              // Compact padding since we only show triangle and text
              padding: "40px 60px",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              backgroundColor: "#f8f9fa",
              overflow: "hidden",
            }}>
              {/* Preview container - compact, just triangle and text */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: `${previewHeight}px`,
                  overflow: "visible",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {/* Centered wrapper for triangle */}
                <div
                  style={{
                    position: "relative",
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                  }}
                >
          {/* Triangle shape */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${previewWidth}px`,
              height: `${previewHeight}px`,
              zIndex: 10,
            }}
          >
            {/* The triangle visual — CSS borders for classic, SVG for all others */}
            {props.shape === "classic" ? (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  ...(isRight ? { right: 0 } : { left: 0 }),
                  width: 0,
                  height: 0,
                  ...(isRight
                    ? {
                        borderLeft: `${previewHeight}px solid transparent`,
                        borderRight: `${previewHeight}px solid ${props.color1}`,
                        borderBottom: `${previewHeight}px solid ${props.color1}`,
                      }
                    : {
                        borderLeft: `${previewHeight}px solid ${props.color1}`,
                        borderRight: `${previewHeight}px solid transparent`,
                        borderBottom: `${previewHeight}px solid ${props.color1}`,
                      }),
                  filter: isHovered
                    ? "drop-shadow(0px 0px 8px rgba(0,0,0,0.4))"
                    : "drop-shadow(0px 0px 0px rgba(0,0,0,0))",
                  transition: "filter 0.3s ease-out",
                }}
              />
            ) : (() => {
              const shapePath = getPreviewShapePath(props.shape);
              const solidFill = props.color1;
              const solidOpacity = props.alpha1 / 100;
              const imgScale = (props.imageScale ?? 100) / 100;
              const scaledW = 200 * imgScale;
              const scaledH = 100 * imgScale;
              const imgX = ((props.imageX ?? 50) / 100) * 200 - scaledW / 2;
              const imgY = ((props.imageY ?? 50) / 100) * 100 - scaledH / 2;
              return (
                <svg
                  viewBox="0 0 200 100"
                  preserveAspectRatio="none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                    transform: isRight ? "none" : "scaleX(-1)",
                    transformOrigin: "center",
                    filter: isHovered
                      ? "drop-shadow(0px 0px 8px rgba(0,0,0,0.4)) drop-shadow(0px 0px 16px rgba(255,255,255,0.2))"
                      : "drop-shadow(0px 0px 0px rgba(0,0,0,0))",
                    transition: "filter 0.3s ease-out",
                  }}
                >
                  <defs>
                    {props.imageUrl && (
                      <clipPath id="preview-clip">
                        <path d={shapePath} />
                      </clipPath>
                    )}
                    {props.gradientType === "linear" && (
                      <linearGradient
                        id="preview-grad"
                        gradientUnits="userSpaceOnUse"
                        x1="0" y1="50" x2="200" y2="50"
                        gradientTransform={`rotate(${props.angle}, 100, 50)`}
                      >
                        <stop offset="0%" stopColor={props.color1} stopOpacity={props.alpha1 / 100} />
                        <stop offset="100%" stopColor={props.color2} stopOpacity={props.alpha2 / 100} />
                      </linearGradient>
                    )}
                    {props.gradientType === "radial" && (
                      <radialGradient id="preview-grad" cx="100" cy="50" r="120" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor={props.color1} stopOpacity={props.alpha1 / 100} />
                        <stop offset="100%" stopColor={props.color2} stopOpacity={props.alpha2 / 100} />
                      </radialGradient>
                    )}
                  </defs>
                  {!props.imageUrl && (
                    <path
                      d={shapePath}
                      fill={props.gradientType !== "solid" ? "url(#preview-grad)" : solidFill}
                      opacity={props.gradientType === "solid" ? solidOpacity : 1}
                    />
                  )}
                  {props.imageUrl && (
                    <>
                      <path
                        d={shapePath}
                        fill={props.gradientType !== "solid" ? "url(#preview-grad)" : solidFill}
                        opacity={props.gradientType === "solid" ? solidOpacity * 0.3 : 0.3}
                      />
                      <image
                        href={props.imageUrl}
                        x={imgX}
                        y={imgY}
                        width={scaledW}
                        height={scaledH}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="url(#preview-clip)"
                        opacity={props.imageOpacity / 100}
                      />
                    </>
                  )}
                </svg>
              );
            })()}

            {/* Hover text */}
            {props.hoverTextEnabled && (
              <div
                style={{
                  position: "absolute",
                  ...textStyle,
                  fontSize: `${scaledFontSize}px`,
                  fontFamily: props.hoverFontFamily,
                  fontWeight: 700,
                  color: "white",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  userSelect: "none",
                  opacity: isHovered || props.hoverAlwaysShow ? 1 : 0,
                  transition: `all 0.3s ${props.hoverAnimationType === "sweep" ? "cubic-bezier(0.68,-0.55,0.265,1.55)" : "ease-out"}`,
                  zIndex: 20,
                }}
              >
                {props.hoverText || "HOVER TEXT"}
              </div>
            )}
          </div>
                </div>
              </div>

            {/* Preview info badges */}
            <div className="d-flex flex-wrap gap-1 mt-2 justify-content-center">
              <span className="badge bg-secondary" style={{ fontSize: "10px" }}>
                {isRight ? "Right" : "Left"}
              </span>
              <span className="badge bg-secondary" style={{ fontSize: "10px" }}>
                {props.shape === "classic" ? "CSS Borders" : "SVG"}
              </span>
              <span className="badge bg-secondary" style={{ fontSize: "10px" }}>
                {props.height}px
              </span>
              <span className="badge bg-secondary" style={{ fontSize: "10px" }}>
                {props.gradientType}
              </span>
              {props.hoverTextEnabled && (
                <span className="badge bg-info" style={{ fontSize: "10px" }}>
                  {props.hoverTextStyle === 1 ? "Text Inside" : "Text Outside"}
                </span>
              )}
              {props.hoverAlwaysShow && (
                <span className="badge bg-success" style={{ fontSize: "10px" }}>
                  Always Visible
                </span>
              )}
            </div>
            </div>
          </div>

          {/* Right: Key Controls */}
          <div className="col-md-6">
            <div className="d-flex flex-column h-100">
              <h6 className="fw-bold mb-3 small text-muted">
                <i className="bi bi-sliders me-1"></i>
                Adjust While Viewing
              </h6>

              {/* Hover Text Controls - Show if enabled */}
              {props.hoverTextEnabled && (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small mb-2">Hover Text</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={props.hoverText}
                      onChange={(e) => props.onTextChange?.(e.target.value)}
                      placeholder="e.g., NEXT SECTION"
                      maxLength={50}
                    />
                    <small className="text-muted" style={{ fontSize: "10px" }}>
                      {props.hoverText.length}/50 characters
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small mb-2">Text Position</label>
                    <select
                      className="form-select form-select-sm"
                      value={props.hoverTextStyle}
                      onChange={(e) => props.onTextStyleChange?.(parseInt(e.target.value))}
                    >
                      <option value={1}>Inside Triangle</option>
                      <option value={2}>Outside Triangle</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small mb-2">
                      Font Size: {props.hoverFontSize}px
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="12"
                      max={props.hoverTextStyle === 1 ? 32 : 64}
                      value={props.hoverFontSize}
                      onChange={(e) => props.onFontSizeChange?.(parseInt(e.target.value))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small mb-2">
                      {props.hoverTextStyle === 1
                        ? `Horizontal Offset: ${props.hoverOffsetX}px`
                        : `Distance Offset: ${props.hoverOffsetX}px`}
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min={props.hoverTextStyle === 1 ? -50 : 0}
                      max={props.hoverTextStyle === 1 ? 50 : 200}
                      value={props.hoverOffsetX}
                      onChange={(e) => props.onOffsetChange?.(parseInt(e.target.value))}
                    />
                    <small className="form-text text-muted" style={{ fontSize: "10px" }}>
                      {props.hoverTextStyle === 1
                        ? "Adjust horizontal position within triangle"
                        : "Adjust distance from triangle edge"}
                    </small>
                  </div>

                  <hr className="my-3" />
                </>
              )}

              {/* Triangle Height Control */}
              <div className="mb-3">
                <label className="form-label fw-semibold small mb-2">
                  Triangle Height: {props.height}px
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="100"
                  max="400"
                  step="10"
                  value={props.height}
                  onChange={(e) => props.onHeightChange?.(parseInt(e.target.value))}
                />
              </div>

              {/* Gradient Controls - Only if gradient active */}
              {props.gradientType !== "solid" && (
                <>
                  <div className="mb-3">
                    <label className="form-label small mb-2">Alpha 1: {props.alpha1}%</label>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="100"
                      value={props.alpha1}
                      onChange={(e) => props.onAlpha1Change?.(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small mb-2">Alpha 2: {props.alpha2}%</label>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="100"
                      value={props.alpha2}
                      onChange={(e) => props.onAlpha2Change?.(parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              {/* Quick Access to More Settings */}
              <div className="mt-auto pt-3 border-top">
                <small className="text-muted" style={{ fontSize: "11px" }}>
                  <i className="bi bi-info-circle me-1"></i>
                  Scroll down for more triangle settings (colors, images, hover text style, etc.)
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live Preview Component ─────────────────────────────────────────
interface SectionLivePreviewProps {
  background: string;
  backgroundType: "solid" | "gradient" | "image" | "video";
  backgroundImage: string;
  backgroundVideo: string;
  gradientEnabled: boolean;
  gradientDirection: string;
  gradientStartOpacity: number;
  gradientEndOpacity: number;
  gradientColor: string;
  heading: string;
  subheading: string;
  body: string;
  layout: string;
  imageSrc: string;
  imageAlt: string;
  overlayEnabled: boolean;
  overlayHeading: string;
  overlaySubheading: string;
  overlayAnimation: string;
  overlayPosition: string;
  paddingTop: number;
  paddingBottom: number;
  colorPalette: string[];
  contentMode: "single" | "multi";
}

function SectionLivePreview(props: SectionLivePreviewProps) {
  const bgColor = BG_PRESETS[props.background] ?? props.background;
  const isDark = props.background === "blue" ||
    (props.background.startsWith("#") && (() => {
      const r = parseInt(props.background.slice(1, 3), 16);
      const g = parseInt(props.background.slice(3, 5), 16);
      const b = parseInt(props.background.slice(5, 7), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
    })());
  const hasVisualBg = !!(props.backgroundImage || props.backgroundVideo || props.gradientEnabled);
  const textColor = isDark || hasVisualBg ? "#ffffff" : "#1a1a1a";
  const mutedColor = isDark || hasVisualBg ? "rgba(255,255,255,0.6)" : "#6c757d";

  // Build gradient CSS
  const getGradientCss = (): string => {
    if (!props.gradientEnabled) return "";
    const dirMap: Record<string, string> = {
      top: "to top", bottom: "to bottom", left: "to left", right: "to right",
      topLeft: "to top left", topRight: "to top right",
      bottomLeft: "to bottom left", bottomRight: "to bottom right",
    };
    const hexToRgba = (hex: string, opacity: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    };
    return `linear-gradient(${dirMap[props.gradientDirection] || "to bottom"}, ${hexToRgba(props.gradientColor, props.gradientStartOpacity)}, ${hexToRgba(props.gradientColor, props.gradientEndOpacity)})`;
  };

  // Overlay position styles (mini version)
  const overlayPositionStyle: Record<string, React.CSSProperties> = {
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" },
    topCenter: { top: "10%", left: "50%", transform: "translateX(-50%)", textAlign: "center" },
    topLeft: { top: "10%", left: "5%" },
    topRight: { top: "10%", right: "5%", textAlign: "right" },
    left: { top: "50%", left: "5%", transform: "translateY(-50%)" },
    right: { top: "50%", right: "5%", transform: "translateY(-50%)", textAlign: "right" },
    bottomCenter: { bottom: "10%", left: "50%", transform: "translateX(-50%)", textAlign: "center" },
    bottomLeft: { bottom: "10%", left: "5%" },
    bottomRight: { bottom: "10%", right: "5%", textAlign: "right" },
  };

  // Sanitize body for preview - strip dangerous tags but keep formatting
  // Note: This is admin-only preview content from the editor, not untrusted user input
  const sanitizeForPreview = (html: string): string => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "");
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-bold mb-0">
          <i className="bi bi-eye me-2"></i>
          Live Preview
        </h6>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-info text-dark">
            {props.contentMode === "single" ? "100vh (Single)" : "> 100vh (Multi)"}
          </span>
          {props.overlayEnabled && (
            <span className="badge bg-warning text-dark">
              <i className="bi bi-layers me-1"></i>
              Overlay: {props.overlayPosition}
            </span>
          )}
        </div>
      </div>

      {/* Color Palette Strip */}
      {props.colorPalette.length > 0 && (
        <div className="d-flex mb-3 rounded overflow-hidden" style={{ height: "8px" }}>
          {props.colorPalette.map((color, i) => (
            <div key={i} style={{ flex: 1, backgroundColor: color }} />
          ))}
        </div>
      )}

      {/* Preview Container */}
      <div
        className="position-relative border rounded overflow-hidden"
        style={{
          backgroundColor: bgColor,
          backgroundImage: props.backgroundImage ? `url(${props.backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: props.contentMode === "single" ? "300px" : "200px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {/* Gradient overlay */}
        {props.gradientEnabled && (
          <div
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              background: getGradientCss(),
              zIndex: 0,
            }}
          />
        )}

        {/* Text overlay preview */}
        {props.overlayEnabled && (props.overlayHeading || props.overlaySubheading) && (
          <div
            style={{
              position: "absolute",
              zIndex: 5,
              maxWidth: "70%",
              ...overlayPositionStyle[props.overlayPosition] || overlayPositionStyle.center,
            }}
          >
            {props.overlayHeading && (
              <div
                style={{
                  fontSize: "clamp(16px, 3vw, 28px)",
                  fontWeight: 700,
                  color: hasVisualBg || isDark ? "#ffffff" : "#1a1a1a",
                  textShadow: hasVisualBg ? "0 2px 4px rgba(0,0,0,0.3)" : "none",
                  marginBottom: "4px",
                }}
              >
                {props.overlayHeading}
              </div>
            )}
            {props.overlaySubheading && (
              <div
                style={{
                  fontSize: "clamp(12px, 2vw, 16px)",
                  fontWeight: 400,
                  color: hasVisualBg || isDark ? "rgba(255,255,255,0.85)" : "#6c757d",
                  textShadow: hasVisualBg ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {props.overlaySubheading}
              </div>
            )}
            <div className="mt-1">
              <span className="badge bg-primary bg-opacity-25 text-primary-emphasis" style={{ fontSize: "0.65rem" }}>
                <i className="bi bi-layers me-1"></i>
                overlay ({props.overlayAnimation})
              </span>
            </div>
          </div>
        )}

        {/* Main content preview */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: `${Math.min(props.paddingTop, 40)}px 20px ${Math.min(props.paddingBottom, 40)}px`,
          }}
        >
          {props.heading && (
            <div style={{ fontSize: "18px", fontWeight: 700, color: textColor, marginBottom: "4px" }}>
              {props.heading}
            </div>
          )}
          {props.subheading && (
            <div style={{ fontSize: "13px", color: mutedColor, marginBottom: "12px" }}>
              {props.subheading}
            </div>
          )}

          {/* Body content preview - admin-authored content only */}
          {props.body ? (
            <div
              className="preview-body-content"
              style={{
                fontSize: "12px",
                lineHeight: 1.5,
                color: textColor,
                maxHeight: "200px",
                overflow: "hidden",
              }}
              dangerouslySetInnerHTML={{ __html: sanitizeForPreview(props.body) }}
            />
          ) : (
            <div className="text-center py-4" style={{ color: mutedColor }}>
              <i className="bi bi-paragraph" style={{ fontSize: "24px" }}></i>
              <div className="small mt-1">No body content yet</div>
            </div>
          )}

          {/* Image preview for image layouts */}
          {(props.layout === "text-image" || props.layout === "image-text") && props.imageSrc && (
            <div className="mt-2 text-center">
              <img
                src={props.imageSrc}
                alt={props.imageAlt || "Preview"}
                style={{ maxHeight: "80px", borderRadius: "4px", opacity: 0.7 }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          )}
        </div>

        {/* Spacing indicators */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${Math.min(props.paddingTop / 5, 20)}px`,
            backgroundColor: "rgba(0, 123, 255, 0.15)",
            borderBottom: "1px dashed rgba(0, 123, 255, 0.3)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "9px", color: "rgba(0, 123, 255, 0.7)" }}>
            {props.paddingTop}px
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${Math.min(props.paddingBottom / 5, 20)}px`,
            backgroundColor: "rgba(0, 123, 255, 0.15)",
            borderTop: "1px dashed rgba(0, 123, 255, 0.3)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "9px", color: "rgba(0, 123, 255, 0.7)" }}>
            {props.paddingBottom}px
          </span>
        </div>
      </div>

      {/* Settings Summary */}
      <div className="mt-3 p-3 bg-light rounded border">
        <h6 className="fw-bold mb-2" style={{ fontSize: "0.8rem" }}>
          <i className="bi bi-gear me-1"></i>
          Active Settings Summary
        </h6>
        <div className="d-flex flex-wrap gap-2">
          <span className="badge bg-secondary">
            Layout: {props.layout}
          </span>
          <span className="badge bg-secondary">
            BG: {props.backgroundType === "solid" ? (BG_PRESETS[props.background] ? props.background : props.background.slice(0, 9)) : props.backgroundType}
          </span>
          {props.gradientEnabled && (
            <span className="badge bg-info text-dark">Gradient</span>
          )}
          {props.backgroundImage && (
            <span className="badge bg-info text-dark">BG Image</span>
          )}
          {props.overlayEnabled && (
            <span className="badge bg-warning text-dark">Text Overlay</span>
          )}
          {props.colorPalette.length > 0 && (
            <span className="badge bg-success">Theme ({props.colorPalette.length} colors)</span>
          )}
          <span className="badge bg-secondary">
            Spacing: {props.paddingTop}/{props.paddingBottom}px
          </span>
        </div>
      </div>
    </div>
  );
}

interface NormalSectionEditorProps {
  section: NormalSection;
  onSave: (section: NormalSection, shouldClose?: boolean) => void;
  onCancel: () => void;
  allSections?: Array<{ id: string; type: string; title?: string; displayName?: string; order: number }>;
}

export default function NormalSectionEditor({
  section,
  onSave,
  onCancel,
  allSections = [],
}: NormalSectionEditorProps) {
  const [heading, setHeading] = useState(section.content.heading || "");
  const [subheading, setSubheading] = useState(section.content.subheading || "");
  const [body, setBody] = useState(section.content.body || "");
  const [layout, setLayout] = useState<
    "text-only" | "text-image" | "image-text" | "grid" | "columns"
  >(section.content.layout || "text-only");
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>(
    section.content.layoutPreset || getDefaultPreset(section.content.layout || "text-only")
  );
  const [imageSrc, setImageSrc] = useState(section.content.imageSrc || "");
  const [imageAlt, setImageAlt] = useState(section.content.imageAlt || "");
  const [columns, setColumns] = useState(section.content.columns || 3);

  // Auto-update preset when layout changes
  useEffect(() => {
    const defaultPreset = getDefaultPreset(layout);
    setLayoutPreset(defaultPreset);
  }, [layout]);

  // Auto-suggest overlay position when preset changes
  useEffect(() => {
    if (overlayEnabled && layoutPreset) {
      const suggestedPosition = getSuggestedOverlayPosition(layoutPreset);
      setOverlayPosition(suggestedPosition);
    }
  }, [layoutPreset]); // Only depend on layoutPreset, not overlayEnabled to avoid loops

  // Background options
  const [backgroundType, setBackgroundType] = useState<"solid" | "gradient" | "image" | "video">(
    section.content.backgroundVideo
      ? "video"
      : section.content.backgroundImage
      ? "image"
      : section.content.gradient?.enabled && !section.content.backgroundImage && !section.content.backgroundVideo
      ? "gradient"
      : "solid"
  );
  const [background, setBackground] = useState(section.background || "white");
  const [backgroundImage, setBackgroundImage] = useState(section.content.backgroundImage || "");
  const [backgroundVideo, setBackgroundVideo] = useState(section.content.backgroundVideo || "");
  const [videoPoster, setVideoPoster] = useState(section.content.videoPoster || "");

  // Color palette / theme
  const [colorPalette, setColorPalette] = useState<string[]>(section.colorPalette || []);
  const [paletteHarmony, setPaletteHarmony] = useState<HarmonyType>(
    (section.colorPaletteHarmony as HarmonyType) || "analogous"
  );
  const [paletteLocked, setPaletteLocked] = useState(section.colorPaletteLocked || false);
  const [customHex, setCustomHex] = useState(
    background.startsWith("#") ? background : "#ffffff"
  );
  const [showPaletteGenerator, setShowPaletteGenerator] = useState(false);

  // Content height mode
  const [contentMode, setContentMode] = useState<"single" | "multi">(
    section.contentMode || "single"
  );

  // Gradient overlay
  const [gradientEnabled, setGradientEnabled] = useState(section.content.gradient?.enabled || false);
  const [gradientDirection, setGradientDirection] = useState(
    section.content.gradient?.preset?.direction || "bottom"
  );
  const [gradientStartOpacity, setGradientStartOpacity] = useState(
    section.content.gradient?.preset?.startOpacity || 70
  );
  const [gradientEndOpacity, setGradientEndOpacity] = useState(
    section.content.gradient?.preset?.endOpacity || 0
  );
  const [gradientColor, setGradientColor] = useState(
    section.content.gradient?.preset?.color || "#000000"
  );

  // Text overlay (for scroll animations)
  const [overlayEnabled, setOverlayEnabled] = useState(
    !!(section.content as any).overlay
  );
  const [overlayHeading, setOverlayHeading] = useState(
    (section.content as any).overlay?.heading || ""
  );
  const [overlaySubheading, setOverlaySubheading] = useState(
    (section.content as any).overlay?.subheading || ""
  );
  const [overlayAnimation, setOverlayAnimation] = useState<AnimationType>(
    (section.content as any).overlay?.animation || "fadeIn"
  );
  const [overlayPosition, setOverlayPosition] = useState(
    (section.content as any).overlay?.position || "center"
  );

  const [displayName, setDisplayName] = useState(section.displayName || "Content Section");
  const [paddingTop, setPaddingTop] = useState(section.paddingTop || 100);
  const [paddingBottom, setPaddingBottom] = useState(section.paddingBottom || 80);

  // Triangle configuration state (from prototype migration)
  const [triangleEnabled, setTriangleEnabled] = useState(section.triangleEnabled || false);
  const [triangleSide, setTriangleSide] = useState(section.triangleSide === "left" ? "left" : "right");
  const [triangleShape, setTriangleShape] = useState(section.triangleShape || "classic");
  const [triangleHeight, setTriangleHeight] = useState(section.triangleHeight || 200);
  const [triangleTargetId, setTriangleTargetId] = useState(section.triangleTargetId || section.id);
  const [triangleGradientType, setTriangleGradientType] = useState(section.triangleGradientType || "solid");
  const [triangleColor1, setTriangleColor1] = useState(section.triangleColor1 || "#4ecdc4");
  const [triangleColor2, setTriangleColor2] = useState(section.triangleColor2 || "#6a82fb");
  const [triangleAlpha1, setTriangleAlpha1] = useState(section.triangleAlpha1 || 100);
  const [triangleAlpha2, setTriangleAlpha2] = useState(section.triangleAlpha2 || 100);
  const [triangleAngle, setTriangleAngle] = useState(section.triangleAngle || 45);
  const [triangleImageUrl, setTriangleImageUrl] = useState(section.triangleImageUrl || "");
  const [triangleImageSize, setTriangleImageSize] = useState(section.triangleImageSize || "cover");
  const [triangleImagePos, setTriangleImagePos] = useState(section.triangleImagePos || "center");
  const [triangleImageOpacity, setTriangleImageOpacity] = useState(section.triangleImageOpacity || 100);
  const [triangleImageX, setTriangleImageX] = useState(section.triangleImageX ?? 50);
  const [triangleImageY, setTriangleImageY] = useState(section.triangleImageY ?? 50);
  const [triangleImageScale, setTriangleImageScale] = useState(section.triangleImageScale ?? 100);
  const [hoverTextEnabled, setHoverTextEnabled] = useState(section.hoverTextEnabled || false);
  const [hoverText, setHoverText] = useState(section.hoverText || "");
  const [hoverTextStyle, setHoverTextStyle] = useState(section.hoverTextStyle || 1);
  const [hoverFontSize, setHoverFontSize] = useState(section.hoverFontSize || 18);
  const [hoverFontFamily, setHoverFontFamily] = useState(section.hoverFontFamily || "Arial");
  const [hoverAnimationType, setHoverAnimationType] = useState(section.hoverAnimationType || "slide");
  const [hoverAnimateBehind, setHoverAnimateBehind] = useState(section.hoverAnimateBehind !== false);
  const [hoverAlwaysShow, setHoverAlwaysShow] = useState(section.hoverAlwaysShow || false);
  const [hoverOffsetX, setHoverOffsetX] = useState(section.hoverOffsetX || 0);
  const [bgImageUrl, setBgImageUrl] = useState(section.bgImageUrl || "");
  const [bgImageSize, setBgImageSize] = useState(section.bgImageSize || "cover");
  const [bgImagePosition, setBgImagePosition] = useState(section.bgImagePosition || "center");
  const [bgImageRepeat, setBgImageRepeat] = useState(section.bgImageRepeat || "no-repeat");
  const [bgImageOpacity, setBgImageOpacity] = useState(section.bgImageOpacity || 100);
  const [bgParallax, setBgParallax] = useState(section.bgParallax || false);

  const [activeTab, setActiveTab] = useState<"content" | "background" | "animation" | "overlay" | "spacing" | "triangle" | "lower-third" | "motion" | "preview">("content");
  const [animBg, setAnimBg] = useState<AnimBgConfig>(
    (section as any).content?.animBg || DEFAULT_ANIM_BG_CONFIG
  );
  const [lowerThird, setLowerThird] = useState<LowerThirdConfig>(
    (section as any).lowerThird ?? DEFAULT_LOWER_THIRD
  );
  const [motionElements, setMotionElements] = useState<MotionElement[]>(
    (section as any).motionElements ?? []
  );

  const showImageFields = layout === "text-image" || layout === "image-text";
  const showColumnsField = layout === "grid" || layout === "columns";

  const handleSave = (shouldClose: boolean = true) => {
    // Build gradient object
    // For "gradient" background type, always include gradient
    // For "image"/"video" background type, only include if gradientEnabled is true
    const shouldIncludeGradient =
      backgroundType === "gradient" ||
      (backgroundType === "image" && gradientEnabled) ||
      (backgroundType === "video" && gradientEnabled);

    const gradient: GradientOverlay | undefined = shouldIncludeGradient
      ? {
          enabled: true,
          type: "preset",
          preset: {
            direction: gradientDirection as any,
            startOpacity: gradientStartOpacity,
            endOpacity: gradientEndOpacity,
            color: gradientColor,
          },
        }
      : undefined;

    // Build text overlay object (for scroll animations)
    const overlay = overlayEnabled
      ? {
          heading: overlayHeading,
          subheading: overlaySubheading,
          animation: overlayAnimation,
          position: overlayPosition,
        }
      : undefined;

    const updatedSection: NormalSection = {
      ...section,
      displayName,
      background: backgroundType === "solid" ? (background as any) : "transparent",
      paddingTop,
      paddingBottom,
      colorPalette: colorPalette.length > 0 ? colorPalette : undefined,
      colorPaletteHarmony: colorPalette.length > 0 ? paletteHarmony : undefined,
      colorPaletteLocked: paletteLocked || undefined,
      contentMode,
      // Triangle overlay fields
      triangleEnabled,
      triangleSide,
      triangleShape,
      triangleHeight,
      triangleTargetId: triangleTargetId || undefined,
      triangleGradientType,
      triangleColor1,
      triangleColor2,
      triangleAlpha1,
      triangleAlpha2,
      triangleAngle,
      triangleImageUrl: triangleImageUrl || undefined,
      triangleImageSize,
      triangleImagePos,
      triangleImageOpacity,
      triangleImageX,
      triangleImageY,
      triangleImageScale,
      hoverTextEnabled,
      hoverText: hoverText || undefined,
      hoverTextStyle,
      hoverFontSize,
      hoverFontFamily,
      hoverAnimationType,
      hoverAnimateBehind,
      hoverAlwaysShow,
      hoverOffsetX,
      bgImageUrl: bgImageUrl || undefined,
      bgImageSize,
      bgImagePosition,
      bgImageRepeat,
      bgImageOpacity,
      bgParallax,
      lowerThird,
      motionElements,
      content: {
        heading: heading || undefined,
        subheading: subheading || undefined,
        body: body || undefined,
        layout,
        layoutPreset: layoutPreset,
        imageSrc: showImageFields ? imageSrc : undefined,
        imageAlt: showImageFields ? imageAlt : undefined,
        columns: showColumnsField ? columns : undefined,
        items: section.content.items,
        backgroundImage: backgroundType === "image" ? backgroundImage : undefined,
        backgroundVideo: backgroundType === "video" ? backgroundVideo : undefined,
        videoPoster: backgroundType === "video" ? videoPoster : undefined,
        gradient,
        ...(overlay && { overlay }), // Add overlay if enabled
        // Animated background stored inside content JSONB (persisted by API)
        animBg: animBg.enabled ? animBg : undefined,
      } as any,
    } as any;
    onSave(updatedSection as NormalSection, shouldClose);
  };

  // Wire up autosave — reads autoSaveEnabled + autoSaveIntervalMs from admin settings
  // useAutoSave uses a ref internally so no dependency array issues
  useAutoSave(() => handleSave(false));

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1115 }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-layout-text-window me-2"></i>
              Edit Content Section
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            {/* Display Name */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                <i className="bi bi-tag me-2"></i>
                Section Name (Admin Only)
              </label>
              <input
                type="text"
                className="form-control"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., About Us Section"
              />
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "content" ? "active" : ""}`}
                  onClick={() => setActiveTab("content")}
                >
                  <i className="bi bi-type me-2"></i>
                  Content
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "background" ? "active" : ""}`}
                  onClick={() => setActiveTab("background")}
                >
                  <i className="bi bi-image me-2"></i>
                  Background
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "animation" ? "active" : ""}`}
                  onClick={() => setActiveTab("animation")}
                >
                  <i className="bi bi-stars me-2"></i>
                  Animation
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "overlay" ? "active" : ""}`}
                  onClick={() => setActiveTab("overlay")}
                >
                  <i className="bi bi-layers me-2"></i>
                  Text Overlay
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "triangle" ? "active" : ""}`}
                  onClick={() => setActiveTab("triangle")}
                >
                  <i className="bi bi-triangle me-2"></i>
                  Section Into
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "lower-third" ? "active" : ""}`}
                  onClick={() => setActiveTab("lower-third")}
                >
                  <i className="bi bi-layout-bottom me-1" />
                  Lower Third
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "motion" ? "active" : ""}`}
                  onClick={() => setActiveTab("motion")}
                >
                  <i className="bi bi-stars me-1" />
                  Motion
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "spacing" ? "active" : ""}`}
                  onClick={() => setActiveTab("spacing")}
                >
                  <i className="bi bi-arrows-expand-vertical me-2"></i>
                  Spacing
                </button>
              </li>
              <li className="nav-item ms-auto">
                <button
                  className={`nav-link ${activeTab === "preview" ? "active" : ""} ${activeTab === "preview" ? "text-success" : "text-primary"}`}
                  onClick={() => setActiveTab("preview")}
                >
                  <i className="bi bi-eye me-2"></i>
                  Live Preview
                </button>
              </li>
            </ul>

            {/* Content Tab */}
            {activeTab === "content" && (
              <>
                {/* Content Mode Toggle */}
                <div className="mb-4 p-3 border rounded bg-light">
                  <label className="form-label fw-semibold mb-2">
                    <i className="bi bi-aspect-ratio me-2"></i>
                    Content Height Mode
                  </label>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill ${contentMode === "single" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setContentMode("single")}
                    >
                      <i className="bi bi-fullscreen me-1"></i>
                      Single Screen (100vh)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm flex-fill ${contentMode === "multi" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setContentMode("multi")}
                    >
                      <i className="bi bi-arrows-expand me-1"></i>
                      Multi Screen (&gt;100vh)
                    </button>
                  </div>
                  <small className="form-text text-muted mt-1 d-block">
                    {contentMode === "single"
                      ? "Content is restricted to one viewport height (100vh). Content will scroll within the section."
                      : "Content can exceed viewport height. Section expands to fit all content."}
                  </small>
                </div>

                {/* Layout Selection */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-layout-three-columns me-2"></i>
                    Layout Type
                  </label>
                  <select
                    className="form-select"
                    value={layout}
                    onChange={(e) =>
                      setLayout(
                        e.target.value as
                          | "text-only"
                          | "text-image"
                          | "image-text"
                          | "grid"
                          | "columns"
                      )
                    }
                  >
                    <option value="text-only">Text Only</option>
                    <option value="text-image">Text + Image (Right)</option>
                    <option value="image-text">Image + Text (Left)</option>
                    <option value="grid">Grid Layout</option>
                    <option value="columns">Multiple Columns</option>
                  </select>
                </div>

                {/* Layout Preset */}
                {LAYOUT_PRESETS[layout as keyof typeof LAYOUT_PRESETS] && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-grid-1x2 me-2"></i>
                      Content Position Preset
                    </label>
                    <select
                      className="form-select"
                      value={layoutPreset}
                      onChange={(e) => setLayoutPreset(e.target.value as LayoutPreset)}
                    >
                      {LAYOUT_PRESETS[layout as keyof typeof LAYOUT_PRESETS].map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label} - {preset.description}
                        </option>
                      ))}
                    </select>
                    <small className="form-text text-muted">
                      Controls how content and overlays are positioned in this section
                    </small>
                  </div>
                )}

                {/* Visual Layout Guide */}
                <div className="alert alert-light border mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-info-circle text-primary me-2"></i>
                    <strong>Layout Structure: {layout === "text-only" ? "Text Only" : layout === "text-image" ? "Text + Image" : layout === "image-text" ? "Image + Text" : layout === "grid" ? "Grid" : layout === "columns" ? "Columns" : "Freeform"}</strong>
                  </div>

                  {/* Text-Only Layout */}
                  {layout === "text-only" && (
                    <div className="d-flex flex-column gap-2">
                      <div className="border rounded p-3 bg-primary bg-opacity-10 text-center">
                        <i className="bi bi-type-h1 text-primary"></i>
                        <div className="small fw-semibold text-primary">Heading (Optional)</div>
                      </div>
                      <div className="border rounded p-3 bg-primary bg-opacity-10 text-center">
                        <i className="bi bi-type-h2 text-primary"></i>
                        <div className="small fw-semibold text-primary">Subheading (Optional)</div>
                      </div>
                      <div className="border rounded p-4 bg-primary bg-opacity-10 text-center">
                        <i className="bi bi-paragraph text-primary"></i>
                        <div className="small fw-semibold text-primary">Body Content (HTML)</div>
                      </div>
                    </div>
                  )}

                  {/* Text-Image Layout */}
                  {layout === "text-image" && (
                    <div className="row g-2">
                      <div className="col-md-6">
                        <div className="d-flex flex-column gap-2 h-100">
                          <div className="border rounded p-2 bg-primary bg-opacity-10 text-center">
                            <i className="bi bi-type-h1 text-primary"></i>
                            <div className="small fw-semibold text-primary">Heading</div>
                          </div>
                          <div className="border rounded p-2 bg-primary bg-opacity-10 text-center">
                            <i className="bi bi-type-h2 text-primary"></i>
                            <div className="small fw-semibold text-primary">Subheading</div>
                          </div>
                          <div className="border rounded p-3 bg-primary bg-opacity-10 text-center flex-grow-1">
                            <i className="bi bi-paragraph text-primary"></i>
                            <div className="small fw-semibold text-primary">Body Content</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="border rounded p-5 bg-success bg-opacity-10 text-center h-100 d-flex flex-column align-items-center justify-content-center">
                          <i className="bi bi-image fs-3 text-success"></i>
                          <div className="small fw-semibold text-success mt-2">Image</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image-Text Layout */}
                  {layout === "image-text" && (
                    <div className="row g-2">
                      <div className="col-md-6">
                        <div className="border rounded p-5 bg-success bg-opacity-10 text-center h-100 d-flex flex-column align-items-center justify-content-center">
                          <i className="bi bi-image fs-3 text-success"></i>
                          <div className="small fw-semibold text-success mt-2">Image</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex flex-column gap-2 h-100">
                          <div className="border rounded p-2 bg-primary bg-opacity-10 text-center">
                            <i className="bi bi-type-h1 text-primary"></i>
                            <div className="small fw-semibold text-primary">Heading</div>
                          </div>
                          <div className="border rounded p-2 bg-primary bg-opacity-10 text-center">
                            <i className="bi bi-type-h2 text-primary"></i>
                            <div className="small fw-semibold text-primary">Subheading</div>
                          </div>
                          <div className="border rounded p-3 bg-primary bg-opacity-10 text-center flex-grow-1">
                            <i className="bi bi-paragraph text-primary"></i>
                            <div className="small fw-semibold text-primary">Body Content</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grid Layout */}
                  {layout === "grid" && (
                    <div>
                      <div className="border rounded p-3 bg-primary bg-opacity-10 text-center mb-2">
                        <i className="bi bi-type-h1 text-primary"></i>
                        <div className="small fw-semibold text-primary">Heading (Optional)</div>
                      </div>
                      <div className="row g-2">
                        <div className="col-4">
                          <div className="border rounded p-3 bg-success bg-opacity-10 text-center">
                            <i className="bi bi-grid text-success"></i>
                            <div className="small fw-semibold text-success">Item 1</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="border rounded p-3 bg-success bg-opacity-10 text-center">
                            <i className="bi bi-grid text-success"></i>
                            <div className="small fw-semibold text-success">Item 2</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="border rounded p-3 bg-success bg-opacity-10 text-center">
                            <i className="bi bi-grid text-success"></i>
                            <div className="small fw-semibold text-success">Item 3</div>
                          </div>
                        </div>
                      </div>
                      <div className="small text-muted text-center mt-2">
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Grid repeats based on items array
                      </div>
                    </div>
                  )}

                  {/* Columns Layout */}
                  {layout === "columns" && (
                    <div>
                      <div className="border rounded p-3 bg-primary bg-opacity-10 text-center mb-2">
                        <i className="bi bi-type-h1 text-primary"></i>
                        <div className="small fw-semibold text-primary">Heading (Optional)</div>
                      </div>
                      <div className="row g-2">
                        <div className="col-4">
                          <div className="border rounded p-4 bg-warning bg-opacity-10 text-center">
                            <i className="bi bi-card-text text-warning"></i>
                            <div className="small fw-semibold text-warning">Column 1</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="border rounded p-4 bg-warning bg-opacity-10 text-center">
                            <i className="bi bi-card-text text-warning"></i>
                            <div className="small fw-semibold text-warning">Column 2</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="border rounded p-4 bg-warning bg-opacity-10 text-center">
                            <i className="bi bi-card-text text-warning"></i>
                            <div className="small fw-semibold text-warning">Column 3</div>
                          </div>
                        </div>
                      </div>
                      <div className="small text-muted text-center mt-2">
                        <i className="bi bi-sliders me-1"></i>
                        Number of columns: {columns}
                      </div>
                    </div>
                  )}

                  {/* Additional notes for preset-specific layouts */}
                  {layoutPreset && (layoutPreset.includes("overlay") || layoutPreset.includes("split")) && (
                    <div className="alert alert-info mb-0 mt-3 d-flex align-items-start">
                      <i className="bi bi-lightbulb flex-shrink-0 me-2 mt-1"></i>
                      <div className="small">
                        <strong>Preset Note:</strong> "{layoutPreset}" modifies how these elements are positioned.
                        {layoutPreset.includes("overlay") && " Text will be overlaid on the background/image."}
                        {layoutPreset.includes("split") && " Content will be split into two columns."}
                      </div>
                    </div>
                  )}
                </div>

                {/* Heading */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-type-h1 me-2"></i>
                    Heading (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder="e.g., About Our Company"
                  />
                </div>

                {/* Subheading */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-type-h2 me-2"></i>
                    Subheading (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    placeholder="e.g., Delivering quality service since 2010"
                  />
                </div>

                {/* Body Content - Monaco HTML Editor */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label fw-semibold mb-0">
                      <i className="bi bi-code-slash me-2"></i>
                      Body Content
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        // Format HTML via Monaco's built-in formatter
                        const formatted = body
                          .replace(/></g, ">\n<")
                          .replace(/\n\s*\n/g, "\n");
                        setBody(formatted);
                      }}
                      title="Auto-format HTML"
                    >
                      <i className="bi bi-braces me-1"></i>
                      Format
                    </button>
                  </div>
                  <div style={{ border: "1px solid #dee2e6", borderRadius: "6px", overflow: "hidden" }}>
                    <HTMLCodeEditor
                      value={body}
                      onChange={(value) => setBody(value)}
                    />
                  </div>
                  {/* Unsupported tag warning */}
                  {(() => {
                    if (!body) return null;
                    const tagPattern = /<(?!\/?\s*(?:p|h[2-6]|ul|ol|li|strong|em|a|br|span|div|table|thead|tbody|tr|th|td|button|i)\b)([a-z][a-z0-9]*)\b[^>]*>/gi;
                    const matches = [...body.matchAll(tagPattern)];
                    if (matches.length === 0) return null;
                    const unsupportedTags = [...new Set(matches.map(m => `<${m[1]}>`))];
                    return (
                      <div className="alert alert-warning small py-2 px-3 mt-2 mb-0">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <strong>Unsupported tags detected:</strong> {unsupportedTags.join(", ")}
                        <div className="mt-1">These will be stripped when rendered on the frontend for security.</div>
                      </div>
                    );
                  })()}
                  {/* Supported tags reference */}
                  <details className="mt-2">
                    <summary className="form-text text-muted" style={{ cursor: "pointer" }}>
                      <i className="bi bi-info-circle me-1"></i>
                      Supported HTML tags reference
                    </summary>
                    <div className="card card-body py-2 px-3 mt-1" style={{ fontSize: "12px" }}>
                      <div className="row g-2">
                        <div className="col-6 col-md-4">
                          <strong className="d-block mb-1">Text</strong>
                          <code>&lt;p&gt;</code> <code>&lt;span&gt;</code> <code>&lt;br&gt;</code><br/>
                          <code>&lt;strong&gt;</code> <code>&lt;em&gt;</code> <code>&lt;i&gt;</code>
                        </div>
                        <div className="col-6 col-md-4">
                          <strong className="d-block mb-1">Headings</strong>
                          <code>&lt;h2&gt;</code> <code>&lt;h3&gt;</code> <code>&lt;h4&gt;</code><br/>
                          <code>&lt;h5&gt;</code> <code>&lt;h6&gt;</code>
                        </div>
                        <div className="col-6 col-md-4">
                          <strong className="d-block mb-1">Lists</strong>
                          <code>&lt;ul&gt;</code> <code>&lt;ol&gt;</code> <code>&lt;li&gt;</code>
                        </div>
                        <div className="col-6 col-md-4">
                          <strong className="d-block mb-1">Layout</strong>
                          <code>&lt;div&gt;</code> <code>&lt;a&gt;</code> <code>&lt;button&gt;</code>
                        </div>
                        <div className="col-6 col-md-4">
                          <strong className="d-block mb-1">Tables</strong>
                          <code>&lt;table&gt;</code> <code>&lt;thead&gt;</code> <code>&lt;tbody&gt;</code><br/>
                          <code>&lt;tr&gt;</code> <code>&lt;th&gt;</code> <code>&lt;td&gt;</code>
                        </div>
                        <div className="col-6 col-md-4">
                          <strong className="d-block mb-1">Attributes</strong>
                          <code>href</code> <code>class</code> <code>style</code><br/>
                          <code>target</code> <code>id</code> <code>aria-label</code>
                        </div>
                      </div>
                      <div className="mt-2 text-danger" style={{ fontSize: "11px" }}>
                        <i className="bi bi-shield-lock me-1"></i>
                        Tags like <code>&lt;script&gt;</code>, <code>&lt;iframe&gt;</code>, <code>&lt;img&gt;</code>, <code>&lt;form&gt;</code>, <code>&lt;input&gt;</code> and event attributes (<code>onclick</code>, <code>onerror</code>) are stripped for security.
                      </div>
                    </div>
                  </details>
                </div>

                {/* Image Fields (Conditional) */}
                {showImageFields && (
                  <>
                    <div className="mb-4">
                      <ImageFieldWithUpload
                        label="Image Source"
                        value={imageSrc}
                        onChange={setImageSrc}
                        placeholder="/images/about.jpg"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-card-text me-2"></i>
                        Image Alt Text
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        placeholder="Description of image for accessibility"
                      />
                    </div>
                  </>
                )}

                {/* Columns Field (Conditional) */}
                {showColumnsField && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-grid-3x3 me-2"></i>
                      Number of Columns
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="6"
                      value={columns}
                      onChange={(e) => setColumns(Number(e.target.value))}
                    />
                  </div>
                )}

              </>
            )}

            {/* Background Tab */}
            {activeTab === "background" && (
              <>
                {/* Background Type */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-palette me-2"></i>
                    Background Type
                  </label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-solid"
                      checked={backgroundType === "solid"}
                      onChange={() => setBackgroundType("solid")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-solid">
                      <i className="bi bi-paint-bucket me-1"></i>
                      Solid
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-gradient"
                      checked={backgroundType === "gradient"}
                      onChange={() => {
                        setBackgroundType("gradient");
                        setGradientEnabled(true);
                      }}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-gradient">
                      <i className="bi bi-palette-fill me-1"></i>
                      Gradient
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-image"
                      checked={backgroundType === "image"}
                      onChange={() => setBackgroundType("image")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-image">
                      <i className="bi bi-image me-1"></i>
                      Image
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-video"
                      checked={backgroundType === "video"}
                      onChange={() => setBackgroundType("video")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-video">
                      <i className="bi bi-camera-video me-1"></i>
                      Video
                    </label>
                  </div>
                </div>

                {/* Solid Color Background - Enhanced */}
                {backgroundType === "solid" && (
                  <>
                    {/* Preset Colors */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-grid-fill me-2"></i>
                        Preset Colors
                      </label>
                      <div className="d-flex flex-wrap gap-2 p-3 border rounded bg-light">
                        {/* Legacy presets */}
                        {[
                          { value: "white", color: "#ffffff", label: "White" },
                          { value: "gray", color: "#f8f9fa", label: "Gray" },
                          { value: "blue", color: "rgba(37, 99, 235, 0.1)", label: "Blue" },
                          { value: "lightblue", color: "#dbeafe", label: "Light Blue" },
                          { value: "transparent", color: "transparent", label: "None" },
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setBackground(preset.value)}
                            title={preset.label}
                            className="border-0 p-0 position-relative"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              backgroundColor: preset.color,
                              cursor: "pointer",
                              outline: background === preset.value ? "3px solid #2563eb" : "1px solid #dee2e6",
                              outlineOffset: "2px",
                              backgroundImage: preset.value === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)" : undefined,
                              backgroundSize: preset.value === "transparent" ? "8px 8px" : undefined,
                              backgroundPosition: preset.value === "transparent" ? "0 0, 4px 4px" : undefined,
                            }}
                          />
                        ))}

                        {/* Divider */}
                        <div style={{ width: "1px", backgroundColor: "#dee2e6", margin: "0 4px" }} />

                        {/* Extended preset swatches */}
                        {PRESET_COLORS.filter(p => !["#ffffff", "#f8f9fa", "#dbeafe"].includes(p.hex)).slice(0, 24).map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => {
                              setBackground(preset.hex);
                              setCustomHex(preset.hex);
                            }}
                            title={preset.name}
                            className="border-0 p-0"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              backgroundColor: preset.hex,
                              cursor: "pointer",
                              outline: background === preset.hex ? "3px solid #2563eb" : "1px solid #dee2e6",
                              outlineOffset: "2px",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Custom Color Picker */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-eyedropper me-2"></i>
                        Custom Color
                      </label>
                      <div className="input-group" style={{ maxWidth: "300px" }}>
                        <input
                          type="color"
                          className="form-control form-control-color"
                          value={customHex}
                          onChange={(e) => {
                            setCustomHex(e.target.value);
                            setBackground(e.target.value);
                          }}
                          style={{ width: "48px", height: "38px" }}
                        />
                        <input
                          type="text"
                          className="form-control font-monospace"
                          value={customHex}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomHex(val);
                            if (isValidHex(val)) {
                              setBackground(val);
                            }
                          }}
                          placeholder="#000000"
                          maxLength={7}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => {
                            if (isValidHex(customHex)) {
                              setBackground(customHex);
                            }
                          }}
                        >
                          Apply
                        </button>
                      </div>
                      <small className="form-text text-muted">
                        Pick from the color wheel or enter a hex code
                      </small>
                    </div>

                    {/* Color Preview */}
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Preview</label>
                      <div
                        className="border rounded p-4 text-center"
                        style={{
                          backgroundColor: background.startsWith("#") ? background : (
                            ({ white: "#ffffff", gray: "#f8f9fa", blue: "rgba(37,99,235,0.1)", lightblue: "#dbeafe", transparent: "#ffffff" } as Record<string, string>)[background] || "#ffffff"
                          ),
                          minHeight: "80px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundImage: background === "transparent" ? "linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%)" : undefined,
                          backgroundSize: background === "transparent" ? "16px 16px" : undefined,
                          backgroundPosition: background === "transparent" ? "0 0, 8px 8px" : undefined,
                        }}
                      >
                        <span
                          className="fw-semibold"
                          style={{
                            color: background.startsWith("#") ? getContrastTextColor(background) : "#333",
                          }}
                        >
                          Section Background Preview
                        </span>
                      </div>
                    </div>

                    {/* Palette Generator Toggle */}
                    <hr className="my-4" />
                    <div className="mb-3">
                      <button
                        type="button"
                        className={`btn ${showPaletteGenerator ? "btn-primary" : "btn-outline-primary"} w-100`}
                        onClick={() => setShowPaletteGenerator(!showPaletteGenerator)}
                      >
                        <i className={`bi ${showPaletteGenerator ? "bi-chevron-up" : "bi-palette2"} me-2`}></i>
                        {showPaletteGenerator ? "Hide Palette Generator" : "Generate Color Palette / Theme"}
                      </button>
                    </div>

                    {/* Palette Generator */}
                    {showPaletteGenerator && (
                      <div className="border rounded p-3 bg-light mb-4">
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-palette2 me-2"></i>
                          Section Color Theme
                          {paletteLocked && (
                            <span className="badge bg-warning text-dark ms-2">
                              <i className="bi bi-lock-fill me-1"></i>Locked
                            </span>
                          )}
                        </h6>

                        {/* Harmony Type Selector */}
                        {!paletteLocked && (
                          <>
                            <div className="mb-3">
                              <label className="form-label small fw-semibold">Harmony Type</label>
                              <select
                                className="form-select form-select-sm"
                                value={paletteHarmony}
                                onChange={(e) => {
                                  const harmony = e.target.value as HarmonyType;
                                  setPaletteHarmony(harmony);
                                  const baseColor = background.startsWith("#") ? background : customHex;
                                  const palette = generatePalette(baseColor, harmony);
                                  setColorPalette(palette.colors);
                                }}
                              >
                                {(["complementary", "analogous", "triadic", "split-complementary", "tetradic", "monochromatic"] as HarmonyType[]).map((type) => (
                                  <option key={type} value={type}>
                                    {getHarmonyLabel(type)} - {getHarmonyDescription(type)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-primary mb-3"
                              onClick={() => {
                                const baseColor = background.startsWith("#") ? background : customHex;
                                const palette = generatePalette(baseColor, paletteHarmony);
                                setColorPalette(palette.colors);
                              }}
                            >
                              <i className="bi bi-arrow-clockwise me-2"></i>
                              Generate from Background Color
                            </button>
                          </>
                        )}

                        {/* Palette Visualization */}
                        {colorPalette.length > 0 && (
                          <>
                            <div className="d-flex rounded overflow-hidden mb-3" style={{ height: "60px" }}>
                              {colorPalette.map((color, i) => (
                                <div
                                  key={i}
                                  className="flex-fill d-flex align-items-end justify-content-center pb-1"
                                  style={{ backgroundColor: color }}
                                >
                                  <span
                                    className="small font-monospace"
                                    style={{
                                      color: getContrastTextColor(color),
                                      fontSize: "0.65rem",
                                    }}
                                  >
                                    {color}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Individual color editing (when unlocked) */}
                            {!paletteLocked && (
                              <div className="d-flex gap-2 mb-3 flex-wrap">
                                {colorPalette.map((color, i) => (
                                  <div key={i} className="d-flex align-items-center gap-1">
                                    <input
                                      type="color"
                                      value={color}
                                      onChange={(e) => {
                                        const updated = [...colorPalette];
                                        updated[i] = e.target.value;
                                        setColorPalette(updated);
                                      }}
                                      style={{ width: "28px", height: "28px", padding: 0, border: "1px solid #dee2e6", borderRadius: "4px" }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Coolors.co Integration */}
                            <div className="d-flex gap-2 mb-3 flex-wrap">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => openInCoolors(colorPalette)}
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i>
                                Edit in Coolors.co
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => openInCoolorsVisualizer(colorPalette)}
                              >
                                <i className="bi bi-eye me-1"></i>
                                Preview in Visualizer
                              </button>
                            </div>

                            {/* Import from Coolors.co URL */}
                            <div className="mb-3">
                              <label className="form-label small fw-semibold">
                                <i className="bi bi-clipboard me-1"></i>
                                Import from Coolors.co
                              </label>
                              <div className="input-group input-group-sm">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Paste Coolors.co URL (e.g. coolors.co/264653-2a9d8f-e9c46a)"
                                  onPaste={(e) => {
                                    const text = e.clipboardData.getData("text");
                                    const match = text.match(/coolors\.co\/(?:visualizer\/)?([a-fA-F0-9-]+)/);
                                    if (match) {
                                      const hexCodes = match[1].split("-").filter(h => /^[a-fA-F0-9]{6}$/.test(h));
                                      if (hexCodes.length >= 2) {
                                        const newPalette = hexCodes.slice(0, 5).map(h => `#${h}`);
                                        setColorPalette(newPalette);
                                        e.currentTarget.value = "";
                                        e.currentTarget.classList.add("is-valid");
                                        setTimeout(() => e.currentTarget.classList.remove("is-valid"), 2000);
                                      } else {
                                        e.currentTarget.classList.add("is-invalid");
                                        setTimeout(() => e.currentTarget.classList.remove("is-invalid"), 2000);
                                      }
                                    }
                                  }}
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    const match = text.match(/coolors\.co\/(?:visualizer\/)?([a-fA-F0-9-]+)/);
                                    if (match) {
                                      const hexCodes = match[1].split("-").filter(h => /^[a-fA-F0-9]{6}$/.test(h));
                                      if (hexCodes.length >= 2) {
                                        const newPalette = hexCodes.slice(0, 5).map(h => `#${h}`);
                                        setColorPalette(newPalette);
                                        e.target.value = "";
                                        e.target.classList.add("is-valid");
                                        setTimeout(() => e.target.classList.remove("is-valid"), 2000);
                                      }
                                    }
                                  }}
                                />
                                <span className="input-group-text">
                                  <i className="bi bi-arrow-down-circle"></i>
                                </span>
                              </div>
                              <small className="form-text text-muted">
                                Paste a Coolors.co URL to auto-import the palette colors
                              </small>
                            </div>

                            {/* Lock / Unlock */}
                            <div className="d-flex gap-2">
                              {!paletteLocked ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-warning"
                                  onClick={() => {
                                    if (window.confirm("Lock this color theme? You can unlock it later if needed.")) {
                                      setPaletteLocked(true);
                                    }
                                  }}
                                >
                                  <i className="bi bi-lock me-1"></i>
                                  Lock Theme
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => {
                                    if (window.confirm("Unlock theme? This allows editing the color palette.")) {
                                      setPaletteLocked(false);
                                    }
                                  }}
                                >
                                  <i className="bi bi-unlock me-1"></i>
                                  Unlock Theme
                                </button>
                              )}

                              {!paletteLocked && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    setColorPalette([]);
                                    setPaletteLocked(false);
                                  }}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Clear Palette
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        {colorPalette.length === 0 && (
                          <div className="text-muted small text-center py-3">
                            <i className="bi bi-palette2 d-block fs-3 mb-2"></i>
                            Select a background color above, then click "Generate" to create a harmonious palette.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Image Background */}
                {backgroundType === "image" && (
                  <div className="mb-4">
                    <ImageFieldWithUpload
                      label="Background Image"
                      value={backgroundImage}
                      onChange={setBackgroundImage}
                      placeholder="/images/hero-bg.jpg"
                    />
                  </div>
                )}

                {/* Video Background */}
                {backgroundType === "video" && (
                  <>
                    <div className="mb-4">
                      <ImageFieldWithUpload
                        label="Background Video"
                        value={backgroundVideo}
                        onChange={setBackgroundVideo}
                        placeholder="/videos/hero-video.mp4"
                        acceptedTypes="video/*"
                      />
                    </div>
                    <div className="mb-4">
                      <ImageFieldWithUpload
                        label="Video Poster Image"
                        value={videoPoster}
                        onChange={setVideoPoster}
                        placeholder="/images/video-poster.jpg"
                      />
                    </div>
                  </>
                )}

                {/* Gradient Controls */}
                {backgroundType === "gradient" && (
                  <>
                    <div className="alert alert-info mb-4">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Gradient Background:</strong> Pure gradient (no image/video). Perfect for colorful backgrounds or as masks for content.
                    </div>

                    <div className="mb-4">
                      <label className="form-label">Gradient Direction</label>
                      <select
                        className="form-select"
                        value={gradientDirection}
                        onChange={(e) => setGradientDirection(e.target.value as any)}
                      >
                        <option value="top">Top to Bottom</option>
                        <option value="bottom">Bottom to Top</option>
                        <option value="left">Left to Right</option>
                        <option value="right">Right to Left</option>
                        <option value="topLeft">Top Left</option>
                        <option value="topRight">Top Right</option>
                        <option value="bottomLeft">Bottom Left</option>
                        <option value="bottomRight">Bottom Right</option>
                      </select>
                    </div>

                    <div className="row mb-4">
                      <div className="col-md-6">
                        <label className="form-label">Start Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          max="100"
                          value={gradientStartOpacity}
                          onChange={(e) => setGradientStartOpacity(Number(e.target.value))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">End Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          max="100"
                          value={gradientEndOpacity}
                          onChange={(e) => setGradientEndOpacity(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label">Gradient Color</label>
                      <div className="input-group">
                        <input
                          type="color"
                          className="form-control form-control-color"
                          value={gradientColor}
                          onChange={(e) => setGradientColor(e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-control"
                          value={gradientColor}
                          onChange={(e) => setGradientColor(e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Gradient Overlay (for image/video backgrounds) */}
                {(backgroundType === "image" || backgroundType === "video") && (
                  <>
                    <hr className="my-4" />
                    <div className="mb-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="gradientEnabled"
                          checked={gradientEnabled}
                          onChange={(e) => setGradientEnabled(e.target.checked)}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="gradientEnabled">
                          <i className="bi bi-gradient me-2"></i>
                          Gradient Overlay (Optional)
                        </label>
                      </div>
                      <small className="form-text text-muted">
                        Add a gradient overlay on top of the image/video background
                      </small>
                    </div>

                    {gradientEnabled && (
                      <>
                        <div className="mb-4">
                          <label className="form-label">Gradient Direction</label>
                          <select
                            className="form-select"
                            value={gradientDirection}
                            onChange={(e) => setGradientDirection(e.target.value as any)}
                          >
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="topLeft">Top Left</option>
                            <option value="topRight">Top Right</option>
                            <option value="bottomLeft">Bottom Left</option>
                            <option value="bottomRight">Bottom Right</option>
                          </select>
                        </div>

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Start Opacity (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={gradientStartOpacity}
                              onChange={(e) => setGradientStartOpacity(Number(e.target.value))}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">End Opacity (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={gradientEndOpacity}
                              onChange={(e) => setGradientEndOpacity(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label">Gradient Color</label>
                          <div className="input-group">
                            <input
                              type="color"
                              className="form-control form-control-color"
                              value={gradientColor}
                              onChange={(e) => setGradientColor(e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              value={gradientColor}
                              onChange={(e) => setGradientColor(e.target.value)}
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Animation Tab */}
            {activeTab === "animation" && (
              <AnimBgEditor
                config={animBg}
                onChange={setAnimBg}
                colorPalette={colorPalette}
              />
            )}

            {/* Text Overlay Tab (for scroll animations) */}
            {activeTab === "overlay" && (
              <>
                {/* Preset-based recommendations */}
                {isOverlayRecommendedForPreset(layoutPreset) && (
                  <div className="alert alert-info mb-4">
                    <i className="bi bi-lightbulb me-2"></i>
                    <strong>Recommended:</strong> Your layout preset "{layoutPreset}" works best with text overlays enabled.
                  </div>
                )}

                {!isOverlayRecommendedForPreset(layoutPreset) && layoutPreset.includes("text-") && (
                  <div className="alert alert-warning mb-4">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Note:</strong> Your layout preset "{layoutPreset}" uses standard positioning. Text overlays may conflict with content layout.
                  </div>
                )}

                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="overlayEnabled"
                      checked={overlayEnabled}
                      onChange={(e) => setOverlayEnabled(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="overlayEnabled">
                      <i className="bi bi-layers me-2"></i>
                      Enable Text Overlay (Animated on Scroll)
                    </label>
                  </div>
                  <small className="form-text text-muted">
                    Overlay text on top of section background with scroll animations. Position automatically suggested based on your layout preset.
                  </small>
                </div>

                {overlayEnabled && (
                  <>
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Overlay Heading</label>
                      <input
                        type="text"
                        className="form-control"
                        value={overlayHeading}
                        onChange={(e) => setOverlayHeading(e.target.value)}
                        placeholder="Large overlay text"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Overlay Subheading</label>
                      <input
                        type="text"
                        className="form-control"
                        value={overlaySubheading}
                        onChange={(e) => setOverlaySubheading(e.target.value)}
                        placeholder="Supporting text"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Animation Type</label>
                      <select
                        className="form-select"
                        value={overlayAnimation}
                        onChange={(e) => setOverlayAnimation(e.target.value as AnimationType)}
                      >
                        <option value="fade">Fade In</option>
                        <option value="slideUp">Slide Up</option>
                        <option value="slideDown">Slide Down</option>
                        <option value="slideLeft">Slide Left</option>
                        <option value="slideRight">Slide Right</option>
                        <option value="zoom">Zoom In</option>
                        <option value="none">No Animation</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Overlay Position</label>
                      <select
                        className="form-select"
                        value={overlayPosition}
                        onChange={(e) => setOverlayPosition(e.target.value)}
                      >
                        <option value="center">Center</option>
                        <option value="topCenter">Top Center</option>
                        <option value="bottomCenter">Bottom Center</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="topLeft">Top Left</option>
                        <option value="topRight">Top Right</option>
                        <option value="bottomLeft">Bottom Left</option>
                        <option value="bottomRight">Bottom Right</option>
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Triangle Overlay Tab */}
            {activeTab === "triangle" && (
              <>
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="triangleEnabled"
                      checked={triangleEnabled}
                      onChange={(e) => setTriangleEnabled(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="triangleEnabled">
                      <i className="bi bi-triangle me-2"></i>
                      Enable Section Into
                    </label>
                  </div>
                  <small className="form-text text-muted">
                    Add decorative triangle shapes to section edges with optional hover text and navigation
                  </small>
                </div>

                {triangleEnabled && (
                  <>
                    {/* Live Triangle Preview */}
                    <TriangleLivePreview
                      side={triangleSide}
                      shape={triangleShape}
                      height={triangleHeight}
                      gradientType={triangleGradientType}
                      color1={triangleColor1}
                      color2={triangleColor2}
                      alpha1={triangleAlpha1}
                      alpha2={triangleAlpha2}
                      angle={triangleAngle}
                      imageUrl={triangleImageUrl}
                      imageSize={triangleImageSize as "cover" | "contain" | "auto"}
                      imagePos={triangleImagePos}
                      imageOpacity={triangleImageOpacity}
                      imageX={triangleImageX}
                      imageY={triangleImageY}
                      imageScale={triangleImageScale}
                      hoverTextEnabled={hoverTextEnabled}
                      hoverText={hoverText}
                      hoverTextStyle={hoverTextStyle}
                      hoverFontSize={hoverFontSize}
                      hoverFontFamily={hoverFontFamily}
                      hoverAnimationType={hoverAnimationType}
                      hoverAnimateBehind={hoverAnimateBehind}
                      hoverAlwaysShow={hoverAlwaysShow}
                      hoverOffsetX={hoverOffsetX}
                      background={background}
                      onHeightChange={setTriangleHeight}
                      onOffsetChange={setHoverOffsetX}
                      onAlpha1Change={setTriangleAlpha1}
                      onAlpha2Change={setTriangleAlpha2}
                      onTextChange={setHoverText}
                      onTextStyleChange={setHoverTextStyle}
                      onFontSizeChange={setHoverFontSize}
                    />

                    <div className="row mb-4">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Triangle Side</label>
                        <select
                          className="form-select"
                          value={triangleSide}
                          onChange={(e) => setTriangleSide(e.target.value)}
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                    </div>
                    <SectionIntoShapePicker value={triangleShape} onChange={setTriangleShape} />

                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        Triangle Height: {triangleHeight}px
                      </label>
                      <input
                        type="range"
                        className="form-range"
                        min="100"
                        max="400"
                        step="10"
                        value={triangleHeight}
                        onChange={(e) => setTriangleHeight(Number(e.target.value))}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Navigate to Section</label>
                      <select
                        className="form-select mb-2"
                        value={triangleTargetId}
                        onChange={(e) => setTriangleTargetId(e.target.value)}
                      >
                        {allSections
                          .filter((s) => s.type !== "HERO" && s.type !== "FOOTER")
                          .sort((a, b) => a.order - b.order)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id === section.id ? `(This Section) ` : ""}
                              {s.displayName || s.title || s.type} (Order {s.order})
                            </option>
                          ))}
                      </select>
                      <input
                        type="text"
                        className="form-control"
                        value={triangleTargetId}
                        onChange={(e) => setTriangleTargetId(e.target.value)}
                        placeholder="Or enter custom section ID"
                      />
                      <small className="form-text text-muted">
                        Defaults to this section. Pick a different section from the dropdown or type a custom ID.
                      </small>
                    </div>

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-palette me-2"></i>
                      Triangle Gradient
                    </h6>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Gradient Type</label>
                      <select
                        className="form-select"
                        value={triangleGradientType}
                        onChange={(e) => setTriangleGradientType(e.target.value)}
                      >
                        <option value="solid">Solid Color</option>
                        <option value="linear">Linear Gradient</option>
                        <option value="radial">Radial Gradient</option>
                      </select>
                      {triangleGradientType !== "solid" && triangleShape === "classic" && (
                        <div className="alert alert-warning py-2 px-3 mt-2 mb-0 small">
                          <i className="bi bi-exclamation-triangle me-1" />
                          Gradients require <strong>Modern (Clip-Path)</strong> shape. Switch the Triangle Shape above to see the gradient.
                        </div>
                      )}
                    </div>

                    <div className="row mb-4">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Color 1</label>
                        <div className="input-group">
                          <input
                            type="color"
                            className="form-control form-control-color"
                            value={triangleColor1}
                            onChange={(e) => setTriangleColor1(e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={triangleColor1}
                            onChange={(e) => setTriangleColor1(e.target.value)}
                            placeholder="#4ecdc4"
                          />
                        </div>
                      </div>

                      {triangleGradientType !== "solid" && (
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Color 2</label>
                          <div className="input-group">
                            <input
                              type="color"
                              className="form-control form-control-color"
                              value={triangleColor2}
                              onChange={(e) => setTriangleColor2(e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              value={triangleColor2}
                              onChange={(e) => setTriangleColor2(e.target.value)}
                              placeholder="#6a82fb"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {triangleGradientType !== "solid" && (
                      <>
                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Alpha 1: {triangleAlpha1}%</label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              value={triangleAlpha1}
                              onChange={(e) => setTriangleAlpha1(Number(e.target.value))}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Alpha 2: {triangleAlpha2}%</label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              value={triangleAlpha2}
                              onChange={(e) => setTriangleAlpha2(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        {triangleGradientType === "linear" && (
                          <div className="mb-4">
                            <label className="form-label">Gradient Angle: {triangleAngle}°</label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="360"
                              value={triangleAngle}
                              onChange={(e) => setTriangleAngle(Number(e.target.value))}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-image me-2"></i>
                      Image Fill
                    </h6>
                    <div className="mb-3">
                      <ImageFieldWithUpload
                        label="Fill Image (clips to shape)"
                        value={triangleImageUrl}
                        onChange={setTriangleImageUrl}
                      />
                    </div>
                    {triangleImageUrl && (
                      <>
                        <div className="mb-3">
                          <label className="form-label">X Position: {triangleImageX}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="100"
                            value={triangleImageX}
                            onChange={(e) => setTriangleImageX(Number(e.target.value))}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Y Position: {triangleImageY}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="100"
                            value={triangleImageY}
                            onChange={(e) => setTriangleImageY(Number(e.target.value))}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Scale: {triangleImageScale}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="50"
                            max="300"
                            value={triangleImageScale}
                            onChange={(e) => setTriangleImageScale(Number(e.target.value))}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Opacity: {triangleImageOpacity}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="100"
                            value={triangleImageOpacity}
                            onChange={(e) => setTriangleImageOpacity(Number(e.target.value))}
                          />
                        </div>
                      </>
                    )}

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-cursor-text me-2"></i>
                      Hover Text (Optional)
                    </h6>

                    <div className="mb-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="hoverTextEnabled"
                          checked={hoverTextEnabled}
                          onChange={(e) => setHoverTextEnabled(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="hoverTextEnabled">
                          Enable Hover Text
                        </label>
                      </div>
                    </div>

                    {hoverTextEnabled && (
                      <>
                        <div className="mb-4">
                          <label className="form-label fw-semibold">Hover Text</label>
                          <input
                            type="text"
                            className="form-control"
                            value={hoverText}
                            onChange={(e) => setHoverText(e.target.value)}
                            placeholder="e.g., NEXT SECTION"
                            maxLength={50}
                          />
                          <small className="form-text text-muted">
                            {hoverText.length}/50 characters
                          </small>
                        </div>

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Text Style</label>
                            <select
                              className="form-select"
                              value={hoverTextStyle}
                              onChange={(e) => setHoverTextStyle(Number(e.target.value))}
                            >
                              <option value={1}>Inside Triangle</option>
                              <option value={2}>Outside Triangle</option>
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Font Size: {hoverFontSize}px</label>
                            <input
                              type="range"
                              className="form-range"
                              min="12"
                              max={hoverTextStyle === 1 ? 32 : 64}
                              value={hoverFontSize}
                              onChange={(e) => setHoverFontSize(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Font Family</label>
                            <GoogleFontPicker
                              value={hoverFontFamily}
                              onChange={setHoverFontFamily}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Animation Type</label>
                            <select
                              className="form-select"
                              value={hoverAnimationType}
                              onChange={(e) => setHoverAnimationType(e.target.value)}
                            >
                              <option value="slide">Slide</option>
                              <option value="fade">Fade</option>
                              <option value="scale">Scale</option>
                              <option value="sweep">Sweep</option>
                            </select>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="hoverAnimateBehind"
                              checked={hoverAnimateBehind}
                              onChange={(e) => setHoverAnimateBehind(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="hoverAnimateBehind">
                              Animate From Behind
                            </label>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="hoverAlwaysShow"
                              checked={hoverAlwaysShow}
                              onChange={(e) => setHoverAlwaysShow(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="hoverAlwaysShow">
                              Always Show Text (No Hover Required)
                            </label>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label">
                            {hoverTextStyle === 1
                              ? `Horizontal Offset: ${hoverOffsetX}px`
                              : `Distance Offset: ${hoverOffsetX}px`}
                          </label>
                          <input
                            type="range"
                            className="form-range"
                            min={hoverTextStyle === 1 ? -50 : 0}
                            max={hoverTextStyle === 1 ? 50 : 200}
                            value={hoverOffsetX}
                            onChange={(e) => setHoverOffsetX(Number(e.target.value))}
                          />
                          <small className="form-text text-muted">
                            {hoverTextStyle === 1
                              ? "Adjust horizontal position within triangle"
                              : "Adjust distance from triangle edge"}
                          </small>
                        </div>
                      </>
                    )}

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-image me-2"></i>
                      Section Background Image (Optional)
                    </h6>

                    <div className="mb-4">
                      <ImageFieldWithUpload
                        label="Section Background Image"
                        value={bgImageUrl}
                        onChange={setBgImageUrl}
                        placeholder="/images/background.jpg"
                        helpText="Background image for the entire section"
                      />
                    </div>

                    {bgImageUrl && (
                      <>
                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Background Size</label>
                            <select
                              className="form-select"
                              value={bgImageSize}
                              onChange={(e) => setBgImageSize(e.target.value)}
                            >
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Background Position</label>
                            <input
                              type="text"
                              className="form-control"
                              value={bgImagePosition}
                              onChange={(e) => setBgImagePosition(e.target.value)}
                              placeholder="center, top left, 50% 50%"
                            />
                          </div>
                        </div>

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Background Repeat</label>
                            <select
                              className="form-select"
                              value={bgImageRepeat}
                              onChange={(e) => setBgImageRepeat(e.target.value)}
                            >
                              <option value="no-repeat">No Repeat</option>
                              <option value="repeat">Repeat</option>
                              <option value="repeat-x">Repeat Horizontally</option>
                              <option value="repeat-y">Repeat Vertically</option>
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">
                              Image Opacity: {bgImageOpacity}%
                            </label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              value={bgImageOpacity}
                              onChange={(e) => setBgImageOpacity(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="bgParallax"
                              checked={bgParallax}
                              onChange={(e) => setBgParallax(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="bgParallax">
                              Enable Parallax Effect
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Spacing Tab */}
            {activeTab === "spacing" && (
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  <i className="bi bi-arrows-expand-vertical me-2"></i>
                  Section Spacing
                </label>
                <SpacingControls
                  paddingTop={paddingTop}
                  paddingBottom={paddingBottom}
                  onPaddingTopChange={setPaddingTop}
                  onPaddingBottomChange={setPaddingBottom}
                />
              </div>
            )}

            {/* Lower Third Tab */}
            {activeTab === "lower-third" && (
              <LowerThirdTab config={lowerThird} onChange={setLowerThird} />
            )}

            {/* Motion Elements Tab */}
            {activeTab === "motion" && (
              <div className="p-3">
                <p className="text-muted small mb-3">
                  Add parallax images that float, animate in, and loop while visible.
                </p>
                {motionElements.map((el, i) => (
                  <MotionElementEditor
                    key={el.id}
                    element={el}
                    onChange={(updated) =>
                      setMotionElements((prev) => prev.map((e) => (e.id === el.id ? updated : e)))
                    }
                    onDelete={() => setMotionElements((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm w-100"
                  onClick={() => setMotionElements((prev) => [...prev, createDefaultMotionElement()])}
                >
                  <i className="bi bi-plus-circle me-1" />
                  Add Motion Element
                </button>
              </div>
            )}

            {/* Live Preview Tab */}
            {activeTab === "preview" && (
              <SectionLivePreview
                background={backgroundType === "solid" ? background : "transparent"}
                backgroundType={backgroundType}
                backgroundImage={backgroundImage}
                backgroundVideo={backgroundVideo}
                gradientEnabled={gradientEnabled || backgroundType === "gradient"}
                gradientDirection={gradientDirection}
                gradientStartOpacity={gradientStartOpacity}
                gradientEndOpacity={gradientEndOpacity}
                gradientColor={gradientColor}
                heading={heading}
                subheading={subheading}
                body={body}
                layout={layout}
                imageSrc={imageSrc}
                imageAlt={imageAlt}
                overlayEnabled={overlayEnabled}
                overlayHeading={overlayHeading}
                overlaySubheading={overlaySubheading}
                overlayAnimation={overlayAnimation}
                overlayPosition={overlayPosition}
                paddingTop={paddingTop}
                paddingBottom={paddingBottom}
                colorPalette={colorPalette}
                contentMode={contentMode}
              />
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => handleSave(false)}
            >
              <i className="bi bi-floppy me-2"></i>
              Save Only
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSave(true)}
            >
              <i className="bi bi-check-circle me-2"></i>
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
