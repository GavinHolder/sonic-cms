"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { FlexibleSection, FlexibleElement, AnimationType, MotionElement, LowerThirdConfig } from "@/types/section";
import SpacingControls from "@/components/admin/SpacingControls";
import SectionIntoShapePicker from "@/components/admin/SectionIntoShapePicker";
import GoogleFontPicker from "@/components/admin/GoogleFontPicker";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import MediaUploadModal from "@/components/admin/MediaUploadModal";
import dynamic from "next/dynamic";
import AnimBgEditor from "@/components/admin/AnimBgEditor";
import ImageFieldWithUpload from "@/components/admin/ImageFieldWithUpload";
import type { AnimBgConfig } from "@/lib/anim-bg/types";
import { DEFAULT_ANIM_BG_CONFIG } from "@/lib/anim-bg/defaults";
import LowerThirdTab from "@/components/admin/LowerThirdTab";
import MotionElementEditor, { createDefaultMotionElement } from "@/components/admin/MotionElementEditor";
import { DEFAULT_LOWER_THIRD } from "@/lib/lower-third-presets";
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
} from "@/lib/color-harmony";
// Dynamically import the preview renderer to avoid SSR issues
const FlexibleSectionRenderer = dynamic(
  () => import("@/components/sections/FlexibleSectionRenderer"),
  { ssr: false, loading: () => <div className="p-4 text-muted text-center">Loading preview...</div> }
);

interface FlexibleSectionEditorModalProps {
  section: FlexibleSection;
  onSave: (section: FlexibleSection, shouldClose?: boolean) => void;
  onCancel: () => void;
  allSections?: Array<{ id: string; type: string; title?: string; displayName?: string; order: number }>;
}

type ActiveTab = "content" | "background" | "animation" | "overlay" | "triangle" | "lower-third" | "motion" | "spacing" | "preview";

export default function FlexibleSectionEditorModal({
  section,
  onSave,
  onCancel,
  allSections = [],
}: FlexibleSectionEditorModalProps) {
  // ── Section meta ──────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(section.displayName || "Flexible Section");
  const [activeTab, setActiveTab] = useState<ActiveTab>("content");
  const [showDesigner, setShowDesigner] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Store raw designer JSON (mockup format) — sent to iframe on open, received on save
  const [designerData, setDesignerData] = useState<string | null>(
    (section.content as any)?.designerData || null
  );
  // Draft key — persists unsaved designer work to localStorage so it survives unexpected closes
  const draftKey = `cms_flexible_draft_${section.id}`;
  // Track which designer blocks are expanded in the accordion
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string | number>>(new Set());

  // ── Content ───────────────────────────────────────────────────
  const [contentMode, setContentMode] = useState<"single" | "multi">(
    section.content?.contentMode || section.contentMode || "single"
  );
  const [elements, setElements] = useState<FlexibleElement[]>(
    section.content?.elements || []
  );
  const [layout, setLayout] = useState(
    section.content?.layout || { type: "preset" as const, preset: "2-col-split" as const }
  );

  // ── Spacing ───────────────────────────────────────────────────
  const [paddingTop, setPaddingTop] = useState(section.paddingTop ?? 100);
  const [paddingBottom, setPaddingBottom] = useState(section.paddingBottom ?? 80);

  // ── Background ────────────────────────────────────────────────
  const rawBg = section.background || "white";
  const contentAny = section.content as any;
  const [backgroundType, setBackgroundType] = useState<"solid" | "gradient">(
    contentAny?.gradient?.enabled ? "gradient" : "solid"
  );
  const [background, setBackground] = useState(rawBg);
  const [customHex, setCustomHex] = useState(rawBg.startsWith("#") ? rawBg : "#ffffff");
  const [colorPalette, setColorPalette] = useState<string[]>(section.colorPalette || []);
  const [paletteHarmony, setPaletteHarmony] = useState<HarmonyType>(
    (section.colorPaletteHarmony as HarmonyType) || "analogous"
  );
  const [paletteLocked, setPaletteLocked] = useState(section.colorPaletteLocked || false);
  const [showPaletteGenerator, setShowPaletteGenerator] = useState(false);
  // Resolve a usable hex seed for palette generation regardless of background type
  const namedBgHexMap: Record<string, string> = {
    white: "#ffffff", gray: "#6c757d", blue: "#2563eb",
    lightblue: "#3b82f6", transparent: "#2563eb",
  };
  const resolvedBgHex = rawBg.startsWith("#") ? rawBg : (namedBgHexMap[rawBg] || "#2563eb");
  const [paletteBaseColor, setPaletteBaseColor] = useState(resolvedBgHex);
  const [gradientEnabled, setGradientEnabled] = useState(contentAny?.gradient?.enabled || false);
  const [gradientDirection, setGradientDirection] = useState(
    contentAny?.gradient?.preset?.direction || "bottom"
  );
  const [gradientStartOpacity, setGradientStartOpacity] = useState(
    contentAny?.gradient?.preset?.startOpacity ?? 70
  );
  const [gradientEndOpacity, setGradientEndOpacity] = useState(
    contentAny?.gradient?.preset?.endOpacity ?? 0
  );
  const [gradientColor, setGradientColor] = useState(
    contentAny?.gradient?.preset?.color || "#000000"
  );

  // ── Animated Background ───────────────────────────────────────
  const [animBg, setAnimBg] = useState<AnimBgConfig>(
    contentAny?.animBg || DEFAULT_ANIM_BG_CONFIG
  );

  // ── Text Overlay ──────────────────────────────────────────────
  const overlay = (section.content as any)?.overlay;
  const [overlayEnabled, setOverlayEnabled] = useState(!!overlay);
  const [overlayHeading, setOverlayHeading] = useState(overlay?.heading || "");
  const [overlaySubheading, setOverlaySubheading] = useState(overlay?.subheading || "");
  const [overlayAnimation, setOverlayAnimation] = useState<AnimationType>(overlay?.animation || "fade");
  const [overlayPosition, setOverlayPosition] = useState(overlay?.position || "center");

  // ── Triangle Overlay ──────────────────────────────────────────
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
  const [bgImageOpacity, setBgImageOpacity] = useState(section.bgImageOpacity ?? 100);
  const [bgParallax, setBgParallax] = useState(section.bgParallax || false);

  // ── Motion Elements + Lower Third ────────────────────────────
  const [motionElements, setMotionElements] = useState<MotionElement[]>(
    (section as any).motionElements ?? []
  );
  const [lowerThird, setLowerThird] = useState<LowerThirdConfig>(
    (section as any).lowerThird ?? DEFAULT_LOWER_THIRD
  );

  // ── Save ──────────────────────────────────────────────────────
  const handleCancel = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    onCancel();
  };

  const handleSave = (shouldClose = true) => {
    // Clear draft — data is now properly committed to section storage
    try { localStorage.removeItem(draftKey); } catch {}
    const gradient = backgroundType === "gradient"
      ? { enabled: true, type: "preset" as const, preset: { direction: gradientDirection as any, startOpacity: gradientStartOpacity, endOpacity: gradientEndOpacity, color: gradientColor } }
      : undefined;

    const updated: FlexibleSection = {
      ...section,
      displayName,
      background: backgroundType === "solid" ? (background as any) : "transparent",
      paddingTop,
      paddingBottom,
      contentMode,
      colorPalette: colorPalette.length > 0 ? colorPalette : undefined,
      colorPaletteHarmony: colorPalette.length > 0 ? paletteHarmony : undefined,
      colorPaletteLocked: paletteLocked || undefined,
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
      motionElements: motionElements,
      lowerThird,
      content: {
        ...section.content,
        contentMode,
        // When using the designer, clear the elements array so stale entries don't
        // appear if designerData is ever removed. When editing elements directly,
        // explicitly null-out designerData so the renderer doesn't ignore changes.
        elements: designerData ? [] : elements,
        designerData: designerData || null,
        layout,
        gradient,
        ...(overlayEnabled ? { overlay: { heading: overlayHeading, subheading: overlaySubheading, animation: overlayAnimation, position: overlayPosition } } : {}),
        animBg,
      } as any,
    };
    onSave(updated, shouldClose);
  };

  // ── postMessage: handle messages from the designer iframe ────
  const handleDesignerMessage = useCallback((e: MessageEvent) => {
    if (!e.data?.type) return;
    if (e.data.type === "FLEXIBLE_DESIGNER_READY") {
      // Check for unsaved draft first (survives unexpected designer closes)
      let draft: string | null = null;
      try { draft = localStorage.getItem(draftKey); } catch {}
      const initPayload = draft || designerData || JSON.stringify({
        contentMode,
        layoutType: layout.type || "preset",
        grid: { rows: 2, cols: 3, gap: 16 },
        preset: layout.preset || "2-col-split",
        blocks: [],
      });
      iframeRef.current?.contentWindow?.postMessage(
        { type: "FLEXIBLE_DESIGNER_INIT", payload: initPayload },
        "*"
      );
    }
    if (e.data.type === "FLEXIBLE_DESIGNER_SAVE" || e.data.type === "FLEXIBLE_DESIGNER_DONE") {
      setDesignerData(e.data.payload);
      // Persist to draft so data survives if modal closes unexpectedly
      try { localStorage.setItem(draftKey, e.data.payload); } catch {}
      if (e.data.type === "FLEXIBLE_DESIGNER_DONE") {
        setShowDesigner(false);
      }
    }
    if (e.data.type === "FLEXIBLE_DESIGNER_PREVIEW") {
      // Close the designer and switch to the Preview tab to show a real render
      setShowDesigner(false);
      setActiveTab("preview");
    }
  }, [designerData, contentMode, layout, draftKey]);

  useEffect(() => {
    window.addEventListener("message", handleDesignerMessage);
    return () => window.removeEventListener("message", handleDesignerMessage);
  }, [handleDesignerMessage]);

  // ── Designer block helpers ─────────────────────────────────────
  const toggleBlockExpand = (id: string | number) => {
    setExpandedBlocks((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const updateDesignerBlockProps = (blockId: string | number, patch: Record<string, unknown>) => {
    if (!designerData) return;
    try {
      const data = JSON.parse(designerData);
      data.blocks = (data.blocks || []).map((b: any) =>
        b.id === blockId ? { ...b, props: { ...(b.props || {}), ...patch } } : b
      );
      setDesignerData(JSON.stringify(data));
    } catch { /* malformed JSON — ignore */ }
  };

  const updateDesignerSubElement = (blockId: string | number, subIdx: number, patch: Record<string, unknown>) => {
    if (!designerData) return;
    try {
      const data = JSON.parse(designerData);
      data.blocks = (data.blocks || []).map((b: any) => {
        if (b.id !== blockId) return b;
        const subs = [...(b.subElements || [])];
        subs[subIdx] = { ...subs[subIdx], props: { ...(subs[subIdx].props || {}), ...patch } };
        return { ...b, subElements: subs };
      });
      setDesignerData(JSON.stringify(data));
    } catch { /* malformed JSON — ignore */ }
  };

  const addDesignerSubElement = (blockId: string | number, type: string) => {
    if (!designerData) return;
    try {
      const defaults: Record<string, Record<string, unknown>> = {
        heading:   { text: "New Heading", level: "h2", fontSize: 28, fontWeight: "700", textAlign: "left", marginBottom: 8 },
        paragraph: { text: "Add your paragraph text here.", fontSize: 15, lineHeight: 1.65, textAlign: "left", marginBottom: 16 },
        button:    { text: "Click Here", variant: "filled", size: "md", borderRadius: 6, paddingX: 24, paddingY: 10 },
        image:     { src: "", alt: "Image", imageMode: "fill" },
        badge:     { text: "New Badge", borderRadius: 20, fontSize: 12 },
        divider:   { thickness: 1 },
        video:     { src: "", autoplay: false, loop: false },
      };
      const data = JSON.parse(designerData);
      data.blocks = (data.blocks || []).map((b: any) => {
        if (b.id !== blockId) return b;
        const newSub = { type, props: { ...(defaults[type] || {}) } };
        return { ...b, subElements: [...(b.subElements || []), newSub] };
      });
      setDesignerData(JSON.stringify(data));
      setExpandedBlocks((prev) => new Set([...prev, blockId]));
    } catch { /* malformed JSON — ignore */ }
  };

  const removeDesignerSubElement = (blockId: string | number, subIdx: number) => {
    if (!designerData) return;
    try {
      const data = JSON.parse(designerData);
      data.blocks = (data.blocks || []).map((b: any) => {
        if (b.id !== blockId) return b;
        const subs = [...(b.subElements || [])];
        subs.splice(subIdx, 1);
        return { ...b, subElements: subs };
      });
      setDesignerData(JSON.stringify(data));
    } catch { /* malformed JSON — ignore */ }
  };

  // Parse designer data once for rendering
  const parsedDesigner = (() => {
    if (!designerData) return null;
    try { return JSON.parse(designerData); } catch { return null; }
  })();

  // ── Section being edited in designer ─────────────────────────
  const designerSection: FlexibleSection = {
    ...section,
    displayName,
    content: { ...section.content, contentMode, elements, layout, designerData } as any,
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Element Designer overlay — full-screen iframe */}
      {showDesigner && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <iframe
            ref={iframeRef}
            src="/flexible-designer.html"
            style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
            title="Flexible Section Designer"
          />
        </div>
      )}

      {/* Main editor modal — same shell as NormalSectionEditor */}
      <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1115 }}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-grid-1x2 me-2" />
                Edit Flexible Section
              </h5>
              <button type="button" className="btn-close" onClick={handleCancel} aria-label="Close" />
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Display Name */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  <i className="bi bi-tag me-2" />
                  Section Name (Admin Only)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Features Grid"
                />
              </div>

              {/* Tabs */}
              <ul className="nav nav-tabs mb-4">
                {(["content", "background", "animation", "overlay", "triangle", "lower-third", "motion", "spacing"] as ActiveTab[]).map((tab) => {
                  const icons: Record<string, string> = {
                    content: "bi-grid-1x2",
                    background: "bi-image",
                    animation: "bi-stars",
                    overlay: "bi-layers",
                    triangle: "bi-triangle",
                    "lower-third": "bi-layout-bottom",
                    motion: "bi-film",
                    spacing: "bi-arrows-expand-vertical",
                  };
                  const labels: Record<string, string> = {
                    content: "Content",
                    background: "Background",
                    animation: "Animation",
                    overlay: "Text Overlay",
                    triangle: "Section Into",
                    "lower-third": "Lower Third",
                    motion: "Motion",
                    spacing: "Spacing",
                  };
                  return (
                    <li className="nav-item" key={tab}>
                      <button
                        className={`nav-link ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        <i className={`bi ${icons[tab]} me-2`} />
                        {labels[tab]}
                      </button>
                    </li>
                  );
                })}
                <li className="nav-item ms-auto">
                  <button
                    className={`nav-link ${activeTab === "preview" ? "active text-success" : "text-primary"}`}
                    onClick={() => setActiveTab("preview")}
                  >
                    <i className="bi bi-eye me-2" />
                    Live Preview
                  </button>
                </li>
              </ul>

              {/* ══ CONTENT TAB ════════════════════════════════════════════ */}
              {activeTab === "content" && (
                <>
                  {/* Content Height Mode */}
                  <div className="mb-4 p-3 border rounded bg-light">
                    <label className="form-label fw-semibold mb-2">
                      <i className="bi bi-aspect-ratio me-2" />
                      Content Height Mode
                    </label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm flex-fill ${contentMode === "single" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setContentMode("single")}
                      >
                        <i className="bi bi-fullscreen me-1" />
                        Single Screen (100vh)
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm flex-fill ${contentMode === "multi" ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setContentMode("multi")}
                      >
                        <i className="bi bi-arrows-expand me-1" />
                        Multi Screen (&gt;100vh)
                      </button>
                    </div>
                    <small className="form-text text-muted mt-1 d-block">
                      Single locks the section to exactly one viewport height. Multi allows it to grow with content.
                    </small>
                  </div>

                  {/* Elements */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <h6 className="fw-semibold mb-0">
                          <i className="bi bi-grid-1x2 me-2" />
                          Section Elements
                        </h6>
                        <small className="text-muted">
                          {parsedDesigner?.blocks?.length
                            ? `${parsedDesigner.blocks.length} block${parsedDesigner.blocks.length !== 1 ? "s" : ""} from designer — edit inline below`
                            : "No elements yet — open the designer to build your layout"}
                        </small>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowDesigner(true)}
                      >
                        <i className="bi bi-palette me-2" />
                        {parsedDesigner?.blocks?.length ? "Edit in Designer" : "Open Designer"}
                      </button>
                    </div>

                    {/* ── Designer blocks accordion ── */}
                    {parsedDesigner?.blocks?.length ? (
                      <>
                        {/* Layout info badge */}
                        <div className="d-flex gap-2 align-items-center mb-3 p-2 rounded" style={{ background: "#f0f4ff", border: "1px solid #c7d7ff" }}>
                          <i className="bi bi-layout-three-columns text-primary" />
                          <span className="small">
                            Layout: <strong>{parsedDesigner.layoutType === "grid"
                              ? `${parsedDesigner.grid?.rows || 2}×${parsedDesigner.grid?.cols || 3} grid`
                              : (parsedDesigner.preset || "preset")}</strong>
                            {parsedDesigner.grid?.gap != null && ` · gap ${parsedDesigner.grid.gap}px`}
                          </span>
                          <span className="ms-auto badge bg-primary bg-opacity-10 text-primary">{parsedDesigner.contentMode || "single"} mode</span>
                        </div>

                        {/* Block accordion */}
                        <div className="accordion mb-3" id="designer-blocks-accordion">
                          {(parsedDesigner.blocks as Array<{
                            id: string | number; type: string;
                            position?: { row: number; col: number; colSpan?: number; rowSpan?: number };
                            props?: Record<string, unknown>;
                            subElements?: Array<{ type: string; props?: Record<string, unknown> }>;
                          }>).map((block, idx) => {
                            const isExpanded = expandedBlocks.has(block.id);
                            const typeIcons: Record<string, string> = {
                              hero: "bi-layout-text-window", card: "bi-card-text",
                              "text-block": "bi-type", text: "bi-type",
                              banner: "bi-panorama", stats: "bi-graph-up",
                              image: "bi-image", divider: "bi-dash-lg",
                            };
                            const icon = typeIcons[block.type] || "bi-box";
                            const pos = block.position;
                            const posLabel = pos
                              ? `col ${pos.col}${pos.colSpan && pos.colSpan > 1 ? `–${pos.col + pos.colSpan - 1}` : ""}, row ${pos.row}${pos.rowSpan && pos.rowSpan > 1 ? `–${pos.row + pos.rowSpan - 1}` : ""}`
                              : `#${idx + 1}`;
                            const previewText = (block.props?.heading || block.props?.label || block.props?.number || block.props?.src || "") as string;

                            return (
                              <div key={block.id} className="accordion-item">
                                <h2 className="accordion-header">
                                  <button
                                    className={`accordion-button py-2 ${isExpanded ? "" : "collapsed"}`}
                                    type="button"
                                    onClick={() => toggleBlockExpand(block.id)}
                                    style={{ fontSize: "0.875rem" }}
                                  >
                                    <i className={`bi ${icon} me-2 text-primary`} />
                                    <span className="fw-semibold text-capitalize me-2">{block.type.replace("-", " ")}</span>
                                    {previewText && <span className="text-muted fw-normal me-2 text-truncate" style={{ maxWidth: 160 }}>— {previewText}</span>}
                                    <span className="badge bg-light text-dark border ms-auto me-2 fw-normal" style={{ fontSize: "0.7rem" }}>{posLabel}</span>
                                  </button>
                                </h2>
                                {isExpanded && (
                                  <div className="accordion-collapse">
                                    <div className="accordion-body py-3">
                                      <DesignerBlockEditor
                                        block={block}
                                        onUpdateProps={(patch) => updateDesignerBlockProps(block.id, patch)}
                                        onUpdateSubElement={(subIdx, patch) => updateDesignerSubElement(block.id, subIdx, patch)}
                                        onAddSubElement={(type) => addDesignerSubElement(block.id, type)}
                                        onRemoveSubElement={(subIdx) => removeDesignerSubElement(block.id, subIdx)}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          className="btn btn-outline-primary btn-sm w-100"
                          onClick={() => setShowDesigner(true)}
                        >
                          <i className="bi bi-pencil-square me-2" />
                          Edit Layout in Designer
                        </button>
                      </>
                    ) : (
                      <div
                        className="text-center py-5 border rounded"
                        style={{ background: "#f8f9fa", borderStyle: "dashed" }}
                      >
                        <i className="bi bi-grid-1x2 text-muted d-block mb-3" style={{ fontSize: "2.5rem" }} />
                        <p className="text-muted mb-4">
                          No elements added yet. Use the Element Designer to build your section layout —
                          drag blocks, set the grid, and design your content visually.
                        </p>
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => setShowDesigner(true)}
                        >
                          <i className="bi bi-plus-circle me-2" />
                          Open Element Designer
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="alert alert-info small mt-3">
                    <i className="bi bi-info-circle me-2" />
                    Use the <strong>Element Designer</strong> to arrange the layout visually.
                    Edit element content directly in the accordions above.
                    Background, overlays, and spacing are configured in the other tabs.
                  </div>
                </>
              )}

              {/* ══ BACKGROUND TAB ════════════════════════════════════════ */}
              {activeTab === "background" && (
                <>
                  {/* Background Type */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-palette me-2" />
                      Background Type
                    </label>
                    <div className="btn-group w-100" role="group">
                      <input type="radio" className="btn-check" id="flex-bg-solid" checked={backgroundType === "solid"} onChange={() => setBackgroundType("solid")} />
                      <label className="btn btn-outline-primary" htmlFor="flex-bg-solid">
                        <i className="bi bi-paint-bucket me-1" />Solid
                      </label>
                      <input type="radio" className="btn-check" id="flex-bg-gradient" checked={backgroundType === "gradient"} onChange={() => { setBackgroundType("gradient"); setGradientEnabled(true); }} />
                      <label className="btn btn-outline-primary" htmlFor="flex-bg-gradient">
                        <i className="bi bi-palette-fill me-1" />Gradient
                      </label>
                    </div>
                  </div>

                  {/* Solid Color */}
                  {backgroundType === "solid" && (
                    <>
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-grid-fill me-2" />Preset Colors
                        </label>
                        <div className="d-flex flex-wrap gap-2 p-3 border rounded bg-light">
                          {[
                            { value: "white", color: "#ffffff", label: "White" },
                            { value: "gray", color: "#f8f9fa", label: "Gray" },
                            { value: "blue", color: "rgba(37,99,235,0.1)", label: "Blue" },
                            { value: "lightblue", color: "#dbeafe", label: "Light Blue" },
                            { value: "transparent", color: "transparent", label: "None" },
                          ].map((p) => (
                            <button key={p.value} type="button" onClick={() => setBackground(p.value)} title={p.label}
                              className="border-0 p-0 position-relative"
                              style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: p.color, cursor: "pointer", outline: background === p.value ? "3px solid #2563eb" : "1px solid #dee2e6", outlineOffset: 2, backgroundImage: p.value === "transparent" ? "linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)" : undefined, backgroundSize: p.value === "transparent" ? "8px 8px" : undefined, backgroundPosition: p.value === "transparent" ? "0 0,4px 4px" : undefined }}
                            />
                          ))}
                          <div style={{ width: 1, backgroundColor: "#dee2e6", margin: "0 4px" }} />
                          {PRESET_COLORS.filter((p) => !["#ffffff", "#f8f9fa", "#dbeafe"].includes(p.hex)).slice(0, 24).map((p) => (
                            <button key={p.hex} type="button" onClick={() => { setBackground(p.hex); setCustomHex(p.hex); }} title={p.name}
                              className="border-0 p-0"
                              style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: p.hex, cursor: "pointer", outline: background === p.hex ? "3px solid #2563eb" : "1px solid #dee2e6", outlineOffset: 2 }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-eyedropper me-2" />Custom Color
                        </label>
                        <div className="input-group" style={{ maxWidth: 300 }}>
                          <input type="color" className="form-control form-control-color" value={customHex} onChange={(e) => { setCustomHex(e.target.value); setBackground(e.target.value); }} style={{ width: 48, height: 38 }} />
                          <input type="text" className="form-control font-monospace" value={customHex} onChange={(e) => { const v = e.target.value; setCustomHex(v); if (isValidHex(v)) setBackground(v); }} placeholder="#000000" maxLength={7} />
                          <button type="button" className="btn btn-outline-primary" onClick={() => { if (isValidHex(customHex)) setBackground(customHex); }}>Apply</button>
                        </div>
                      </div>

                      {/* Color preview */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Preview</label>
                        <div className="border rounded p-4 text-center" style={{ backgroundColor: background.startsWith("#") ? background : ({ white: "#ffffff", gray: "#f8f9fa", blue: "rgba(37,99,235,0.1)", lightblue: "#dbeafe", transparent: "#ffffff" } as Record<string,string>)[background] || "#ffffff", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className="fw-semibold" style={{ color: background.startsWith("#") ? getContrastTextColor(background) : "#333" }}>
                            Section Background Preview
                          </span>
                        </div>
                      </div>

                      <hr className="my-4" />
                      <div className="mb-3">
                        <button type="button" className={`btn ${showPaletteGenerator ? "btn-primary" : "btn-outline-primary"} w-100`} onClick={() => setShowPaletteGenerator(!showPaletteGenerator)}>
                          <i className={`bi ${showPaletteGenerator ? "bi-chevron-up" : "bi-palette2"} me-2`} />
                          {showPaletteGenerator ? "Hide Palette Generator" : "Generate Color Palette / Theme"}
                        </button>
                      </div>

                      {showPaletteGenerator && (
                        <div className="border rounded p-3 bg-light mb-4">
                          <h6 className="fw-bold mb-3"><i className="bi bi-palette2 me-2" />Section Color Theme</h6>
                          {!paletteLocked && (
                            <>
                              <div className="mb-3">
                                <label className="form-label small fw-semibold">Base Color</label>
                                <div className="d-flex gap-2 align-items-center">
                                  <input
                                    type="color"
                                    className="form-control form-control-color"
                                    style={{ width: 48, height: 36, padding: 2 }}
                                    value={paletteBaseColor}
                                    onChange={(e) => setPaletteBaseColor(e.target.value)}
                                    title="Pick seed color for palette"
                                  />
                                  <input
                                    type="text"
                                    className="form-control form-control-sm font-monospace"
                                    value={paletteBaseColor}
                                    maxLength={7}
                                    onChange={(e) => { if (isValidHex(e.target.value)) setPaletteBaseColor(e.target.value); }}
                                    placeholder="#2563eb"
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary text-nowrap"
                                    title="Use section background"
                                    onClick={() => setPaletteBaseColor(resolvedBgHex)}
                                  >
                                    <i className="bi bi-eyedropper me-1" />From BG
                                  </button>
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="form-label small fw-semibold">Harmony Type</label>
                                <select className="form-select form-select-sm" value={paletteHarmony} onChange={(e) => { const h = e.target.value as HarmonyType; setPaletteHarmony(h); const p = generatePalette(paletteBaseColor, h, true); setColorPalette(p.colors); }}>
                                  {(["complementary","analogous","triadic","split-complementary","tetradic","monochromatic"] as HarmonyType[]).map((t) => (
                                    <option key={t} value={t}>{getHarmonyLabel(t)} - {getHarmonyDescription(t)}</option>
                                  ))}
                                </select>
                              </div>
                              <button type="button" className="btn btn-sm btn-primary mb-3" onClick={() => { const p = generatePalette(paletteBaseColor, paletteHarmony, true); setColorPalette(p.colors); }}>
                                <i className="bi bi-arrow-clockwise me-2" />Generate Palette
                              </button>
                            </>
                          )}
                          {colorPalette.length > 0 && (
                            <>
                              <div className="d-flex rounded overflow-hidden mb-3" style={{ height: 60 }}>
                                {colorPalette.map((c, i) => (
                                  <div key={i} className="flex-fill d-flex align-items-end justify-content-center pb-1" style={{ backgroundColor: c }}>
                                    <span className="small font-monospace" style={{ color: getContrastTextColor(c), fontSize: "0.65rem" }}>{c}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="d-flex gap-2 mb-3 flex-wrap">
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openInCoolors(colorPalette)}><i className="bi bi-box-arrow-up-right me-1" />Edit in Coolors.co</button>
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openInCoolorsVisualizer(colorPalette)}><i className="bi bi-eye me-1" />Preview in Visualizer</button>
                              </div>
                            </>
                          )}
                          <div className="form-check form-switch mt-2">
                            <input className="form-check-input" type="checkbox" id="flex-palette-lock" checked={paletteLocked} onChange={(e) => setPaletteLocked(e.target.checked)} />
                            <label className="form-check-label" htmlFor="flex-palette-lock">Lock Palette</label>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Section Background Image */}
                  <hr className="my-4" />
                  <h6 className="fw-bold mb-3">
                    <i className="bi bi-image me-2" />Section Background Image
                  </h6>
                  <div className="mb-3">
                    <ImageFieldWithUpload
                      label="Section Background Image"
                      value={bgImageUrl}
                      onChange={setBgImageUrl}
                      placeholder="/images/background.jpg"
                      helpText="Background image for the entire section. When set, animated backgrounds are disabled."
                    />
                  </div>
                  {bgImageUrl && (
                    <>
                      <div className="alert alert-warning small mb-3 py-2">
                        <i className="bi bi-exclamation-triangle me-2" />
                        <strong>Animated backgrounds disabled</strong> — remove this image to enable animations.
                      </div>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label">Background Size</label>
                          <select className="form-select" value={bgImageSize} onChange={(e) => setBgImageSize(e.target.value)}>
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Background Position</label>
                          <input type="text" className="form-control" value={bgImagePosition} onChange={(e) => setBgImagePosition(e.target.value)} placeholder="center, top left, 50% 50%" />
                        </div>
                      </div>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label">Background Repeat</label>
                          <select className="form-select" value={bgImageRepeat} onChange={(e) => setBgImageRepeat(e.target.value)}>
                            <option value="no-repeat">No Repeat</option>
                            <option value="repeat">Repeat</option>
                            <option value="repeat-x">Repeat Horizontally</option>
                            <option value="repeat-y">Repeat Vertically</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Image Opacity: {bgImageOpacity}%</label>
                          <input type="range" className="form-range" min={0} max={100} value={bgImageOpacity} onChange={(e) => setBgImageOpacity(Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" id="flex-bgParallax" checked={bgParallax} onChange={(e) => setBgParallax(e.target.checked)} />
                          <label className="form-check-label" htmlFor="flex-bgParallax">Enable Parallax Effect</label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Gradient */}
                  {backgroundType === "gradient" && (
                    <>
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Gradient Direction</label>
                        <select className="form-select" value={gradientDirection} onChange={(e) => setGradientDirection(e.target.value)}>
                          {["top","bottom","left","right","topLeft","topRight","bottomLeft","bottomRight"].map((d) => (
                            <option key={d} value={d}>{d.replace(/([A-Z])/g, " $1").trim()}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Gradient Color</label>
                        <div className="input-group" style={{ maxWidth: 220 }}>
                          <input type="color" className="form-control form-control-color" value={gradientColor} onChange={(e) => setGradientColor(e.target.value)} />
                          <input type="text" className="form-control font-monospace" value={gradientColor} onChange={(e) => setGradientColor(e.target.value)} maxLength={7} />
                        </div>
                      </div>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label">Start Opacity: {gradientStartOpacity}%</label>
                          <input type="range" className="form-range" min={0} max={100} value={gradientStartOpacity} onChange={(e) => setGradientStartOpacity(Number(e.target.value))} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">End Opacity: {gradientEndOpacity}%</label>
                          <input type="range" className="form-range" min={0} max={100} value={gradientEndOpacity} onChange={(e) => setGradientEndOpacity(Number(e.target.value))} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ══ TEXT OVERLAY TAB ══════════════════════════════════════ */}
              {activeTab === "overlay" && (
                <>
                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="flex-overlayEnabled" checked={overlayEnabled} onChange={(e) => setOverlayEnabled(e.target.checked)} />
                      <label className="form-check-label fw-semibold" htmlFor="flex-overlayEnabled">
                        <i className="bi bi-layers me-2" />Enable Text Overlay (Animated on Scroll)
                      </label>
                    </div>
                    <small className="form-text text-muted">Overlay text on top of the section background with scroll animations.</small>
                  </div>
                  {overlayEnabled && (
                    <>
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Overlay Heading</label>
                        <input type="text" className="form-control" value={overlayHeading} onChange={(e) => setOverlayHeading(e.target.value)} placeholder="Large overlay text" />
                      </div>
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Overlay Subheading</label>
                        <input type="text" className="form-control" value={overlaySubheading} onChange={(e) => setOverlaySubheading(e.target.value)} placeholder="Supporting text" />
                      </div>
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Animation Type</label>
                        <select className="form-select" value={overlayAnimation} onChange={(e) => setOverlayAnimation(e.target.value as AnimationType)}>
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
                        <select className="form-select" value={overlayPosition} onChange={(e) => setOverlayPosition(e.target.value)}>
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

              {/* ══ TRIANGLE OVERLAY TAB ══════════════════════════════════ */}
              {activeTab === "triangle" && (
                <>
                  <div className="mb-4">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="flex-triangleEnabled" checked={triangleEnabled} onChange={(e) => setTriangleEnabled(e.target.checked)} />
                      <label className="form-check-label fw-semibold" htmlFor="flex-triangleEnabled">
                        <i className="bi bi-triangle me-2" />Enable Section Into
                      </label>
                    </div>
                    <small className="form-text text-muted">Add decorative triangle shapes to section edges with optional hover text and navigation.</small>
                  </div>

                  {triangleEnabled && (
                    <>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Triangle Side</label>
                          <select className="form-select" value={triangleSide} onChange={(e) => setTriangleSide(e.target.value)}>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                      </div>
                    <SectionIntoShapePicker value={triangleShape} onChange={setTriangleShape} />

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Triangle Height: {triangleHeight}px</label>
                        <input type="range" className="form-range" min={100} max={400} step={10} value={triangleHeight} onChange={(e) => setTriangleHeight(Number(e.target.value))} />
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Navigate to Section</label>
                        <select className="form-select mb-2" value={triangleTargetId} onChange={(e) => setTriangleTargetId(e.target.value)}>
                          {allSections.filter((s) => s.type !== "HERO" && s.type !== "FOOTER").sort((a, b) => a.order - b.order).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id === section.id ? "(This Section) " : ""}{s.displayName || s.title || s.type} (Order {s.order})
                            </option>
                          ))}
                        </select>
                        <input type="text" className="form-control" value={triangleTargetId} onChange={(e) => setTriangleTargetId(e.target.value)} placeholder="Or enter custom section ID" />
                        <small className="form-text text-muted">Pick a target section or enter a custom ID.</small>
                      </div>

                      <hr className="my-4" />
                      <h6 className="fw-bold mb-3"><i className="bi bi-palette me-2" />Triangle Gradient</h6>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Gradient Type</label>
                        <select className="form-select" value={triangleGradientType} onChange={(e) => setTriangleGradientType(e.target.value)}>
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
                            <input type="color" className="form-control form-control-color" value={triangleColor1} onChange={(e) => setTriangleColor1(e.target.value)} />
                            <input type="text" className="form-control" value={triangleColor1} onChange={(e) => setTriangleColor1(e.target.value)} placeholder="#4ecdc4" />
                          </div>
                        </div>
                        {triangleGradientType !== "solid" && (
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">Color 2</label>
                            <div className="input-group">
                              <input type="color" className="form-control form-control-color" value={triangleColor2} onChange={(e) => setTriangleColor2(e.target.value)} />
                              <input type="text" className="form-control" value={triangleColor2} onChange={(e) => setTriangleColor2(e.target.value)} placeholder="#6a82fb" />
                            </div>
                          </div>
                        )}
                      </div>

                      {triangleGradientType !== "solid" && (
                        <>
                          <div className="row mb-4">
                            <div className="col-md-6">
                              <label className="form-label">Alpha 1: {triangleAlpha1}%</label>
                              <input type="range" className="form-range" min={0} max={100} value={triangleAlpha1} onChange={(e) => setTriangleAlpha1(Number(e.target.value))} />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Alpha 2: {triangleAlpha2}%</label>
                              <input type="range" className="form-range" min={0} max={100} value={triangleAlpha2} onChange={(e) => setTriangleAlpha2(Number(e.target.value))} />
                            </div>
                          </div>
                          {triangleGradientType === "linear" && (
                            <div className="mb-4">
                              <label className="form-label">Gradient Angle: {triangleAngle}°</label>
                              <input type="range" className="form-range" min={0} max={360} value={triangleAngle} onChange={(e) => setTriangleAngle(Number(e.target.value))} />
                            </div>
                          )}
                        </>
                      )}

                      <hr className="my-4" />
                      <h6 className="fw-bold mb-3"><i className="bi bi-image me-2" />Image Fill</h6>
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
                            <input type="range" className="form-range" min="0" max="100" value={triangleImageX} onChange={(e) => setTriangleImageX(Number(e.target.value))} />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Y Position: {triangleImageY}%</label>
                            <input type="range" className="form-range" min="0" max="100" value={triangleImageY} onChange={(e) => setTriangleImageY(Number(e.target.value))} />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Scale: {triangleImageScale}%</label>
                            <input type="range" className="form-range" min="50" max="300" value={triangleImageScale} onChange={(e) => setTriangleImageScale(Number(e.target.value))} />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Opacity: {triangleImageOpacity}%</label>
                            <input type="range" className="form-range" min="0" max="100" value={triangleImageOpacity} onChange={(e) => setTriangleImageOpacity(Number(e.target.value))} />
                          </div>
                        </>
                      )}

                      <hr className="my-4" />
                      <h6 className="fw-bold mb-3"><i className="bi bi-cursor-text me-2" />Hover Text (Optional)</h6>

                      <div className="mb-4">
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" id="flex-hoverTextEnabled" checked={hoverTextEnabled} onChange={(e) => setHoverTextEnabled(e.target.checked)} />
                          <label className="form-check-label" htmlFor="flex-hoverTextEnabled">Enable Hover Text</label>
                        </div>
                      </div>

                      {hoverTextEnabled && (
                        <>
                          <div className="mb-4">
                            <label className="form-label fw-semibold">Hover Text</label>
                            <input type="text" className="form-control" value={hoverText} onChange={(e) => setHoverText(e.target.value)} placeholder="e.g., NEXT SECTION" maxLength={50} />
                            <small className="form-text text-muted">{hoverText.length}/50 characters</small>
                          </div>
                          <div className="row mb-4">
                            <div className="col-md-6">
                              <label className="form-label">Text Style</label>
                              <select className="form-select" value={hoverTextStyle} onChange={(e) => setHoverTextStyle(Number(e.target.value))}>
                                <option value={1}>Inside Triangle</option>
                                <option value={2}>Outside Triangle</option>
                              </select>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Font Size: {hoverFontSize}px</label>
                              <input type="range" className="form-range" min={12} max={hoverTextStyle === 1 ? 32 : 64} value={hoverFontSize} onChange={(e) => setHoverFontSize(Number(e.target.value))} />
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
                              <select className="form-select" value={hoverAnimationType} onChange={(e) => setHoverAnimationType(e.target.value)}>
                                {["slide","fade","scale","sweep"].map((t) => <option key={t} value={t} className="text-capitalize">{t}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" id="flex-hoverAnimateBehind" checked={hoverAnimateBehind} onChange={(e) => setHoverAnimateBehind(e.target.checked)} />
                              <label className="form-check-label" htmlFor="flex-hoverAnimateBehind">Animate From Behind</label>
                            </div>
                          </div>
                          <div className="mb-4">
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" id="flex-hoverAlwaysShow" checked={hoverAlwaysShow} onChange={(e) => setHoverAlwaysShow(e.target.checked)} />
                              <label className="form-check-label" htmlFor="flex-hoverAlwaysShow">Always Show Text (No Hover Required)</label>
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="form-label">{hoverTextStyle === 1 ? `Horizontal Offset: ${hoverOffsetX}px` : `Distance Offset: ${hoverOffsetX}px`}</label>
                            <input type="range" className="form-range" min={hoverTextStyle === 1 ? -50 : 0} max={hoverTextStyle === 1 ? 50 : 200} value={hoverOffsetX} onChange={(e) => setHoverOffsetX(Number(e.target.value))} />
                          </div>
                        </>
                      )}

                    </>
                  )}
                </>
              )}

              {/* ══ ANIMATION TAB ════════════════════════════════════════ */}
              {activeTab === "animation" && (
                bgImageUrl ? (
                  <div className="alert alert-warning d-flex align-items-start gap-3 mb-0">
                    <i className="bi bi-exclamation-triangle-fill fs-5 mt-1 flex-shrink-0" />
                    <div>
                      <strong>Animated backgrounds are disabled when a background image is set.</strong>
                      <div className="mt-1 small text-muted">
                        Remove the background image in the <strong>Background</strong> tab to enable animated backgrounds.
                        Gradient and solid colour backgrounds are fully compatible with animations.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {backgroundType === "gradient" && (
                      <div className="alert alert-success small mb-3 py-2">
                        <i className="bi bi-check-circle me-2" />
                        <strong>Gradient + Animation</strong> — these work simultaneously!
                        The gradient renders as the section background and the animation layers on top.
                      </div>
                    )}
                    <AnimBgEditor
                      config={animBg}
                      onChange={setAnimBg}
                      colorPalette={colorPalette}
                      sectionBackground={backgroundType === "gradient" ? "gradient" : background}
                    />
                  </>
                )
              )}

              {/* ══ SPACING TAB ══════════════════════════════════════════ */}
              {activeTab === "spacing" && (
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-arrows-expand-vertical me-2" />Section Spacing
                  </label>
                  <SpacingControls
                    paddingTop={paddingTop}
                    paddingBottom={paddingBottom}
                    onPaddingTopChange={setPaddingTop}
                    onPaddingBottomChange={setPaddingBottom}
                  />
                </div>
              )}

              {/* ══ LOWER THIRD TAB ═══════════════════════════════════════ */}
              {activeTab === "lower-third" && (
                <LowerThirdTab config={lowerThird} onChange={setLowerThird} />
              )}

              {/* ══ MOTION ELEMENTS TAB ══════════════════════════════════ */}
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

              {/* ══ PREVIEW TAB ══════════════════════════════════════════ */}
              {activeTab === "preview" && (
                <div>
                  <p className="text-muted small mb-3">
                    <i className="bi bi-info-circle me-1" />
                    Live preview of the section as it will appear on the page.
                  </p>
                  <div className="border rounded overflow-hidden" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <FlexibleSectionRenderer section={designerSection} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                <i className="bi bi-x-circle me-2" />Cancel
              </button>
              <button type="button" className="btn btn-outline-primary" onClick={() => handleSave(false)}>
                <i className="bi bi-floppy me-2" />Save Only
              </button>
              <button type="button" className="btn btn-primary" onClick={() => handleSave(true)}>
                <i className="bi bi-check-circle me-2" />Save & Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Field schema types ───────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "colorPicker" | "toggle" | "select" | "number"
      | "slider" | "iconInput" | "navTarget" | "imageUpload" | "videoUpload" | "fontPicker";
  tab?: "content" | "style" | "anim";
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  showWhen?: { key: string; value: unknown };
}

// ─── Shared style / animation fields (spread into block schemas) ─────────────

const BLOCK_STYLE_FIELDS: FieldDef[] = [
  { key: "bgImage",          label: "BG Image",        type: "imageUpload", tab: "style", hint: "Background image — overrides solid bg color" },
  { key: "bgGradient",       label: "BG Gradient",     type: "text",        tab: "style", hint: "CSS gradient e.g. linear-gradient(135deg,#0f0c29,#302b63)" },
  { key: "bgOverlayColor",   label: "Overlay Color",   type: "colorPicker", tab: "style", hint: "Semi-transparent layer over bg image/gradient" },
  { key: "bgOverlayOpacity", label: "Overlay Opacity", type: "slider",      tab: "style", min: 0, max: 80, step: 5, unit: "%" },
  { key: "borderColor",      label: "Border Color",    type: "colorPicker", tab: "style" },
  { key: "borderWidth",      label: "Border Width",    type: "slider",      tab: "style", min: 0, max: 10, step: 1, unit: "px" },
  { key: "boxShadow",        label: "Box Shadow",      type: "select",      tab: "style",
    options: [
      { value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" },
      { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }, { value: "glow", label: "Glow" },
    ],
  },
  { key: "cardEffect",       label: "Visual Effect",   type: "select",      tab: "style", hint: "Animated visual effect applied to the block",
    options: [
      { value: "none",       label: "None" },
      { value: "glow",       label: "Hover Glow" },
      { value: "shimmer",    label: "Shimmer Sweep" },
      { value: "rgb",        label: "RGB Glow" },
      { value: "pulse-glow", label: "Pulse Glow" },
    ],
  },
  { key: "glowColor",        label: "Glow Color",      type: "colorPicker", tab: "style", hint: "Color for glow / pulse-glow effects" },
];

const BLOCK_ANIM_FIELDS: FieldDef[] = [
  { key: "scrollAnim", label: "Scroll Animation", type: "select", tab: "anim", hint: "Plays once when the block scrolls into view",
    options: [
      { value: "none",         label: "None (instant)" },
      { value: "fadeIn",       label: "Fade In" },
      { value: "slideUp",      label: "Slide Up" },
      { value: "slideDown",    label: "Slide Down" },
      { value: "slideInLeft",  label: "Slide from Left" },
      { value: "slideInRight", label: "Slide from Right" },
      { value: "scaleIn",      label: "Scale In" },
      { value: "zoomIn",       label: "Zoom In" },
      { value: "flipInX",      label: "Flip X" },
      { value: "flipInY",      label: "Flip Y" },
      { value: "bounceIn",     label: "Bounce In" },
      { value: "rotateIn",     label: "Rotate In" },
    ],
  },
];

// ─── Block schemas (1:1 with designer BLOCK_DEFAULTS) ────────────────────────

const BLOCK_SCHEMAS: Record<string, FieldDef[]> = {
  hero: [
    { key: "heading",          label: "Heading Text",     type: "text",        hint: "Main headline shown over the background" },
    { key: "subtext",          label: "Subheading",       type: "textarea",    hint: "Supporting text displayed below the heading" },
    { key: "bgColor",          label: "Background Color", type: "colorPicker", hint: "Solid fill — ignored when a BG Image is set" },
    { key: "bgImage",          label: "BG Image",         type: "imageUpload", hint: "Upload or link an image — overrides bg color" },
    { key: "textColor",        label: "Text Color",       type: "colorPicker", hint: "Color applied to heading and subheading" },
    { key: "overlayPos",       label: "Text Position",    type: "select",      hint: "Where the heading & subheading appear over the background",
      options: [
        { value: "top-left",      label: "Top Left" },    { value: "top-center",    label: "Top Center" },
        { value: "top-right",     label: "Top Right" },   { value: "center-left",   label: "Middle Left" },
        { value: "center",        label: "Center" },      { value: "center-right",  label: "Middle Right" },
        { value: "bottom-left",   label: "Bottom Left" }, { value: "bottom-center", label: "Bottom Center" },
        { value: "bottom-right",  label: "Bottom Right" },
      ],
    },
    { key: "overlayBgColor",   label: "Overlay Color",   type: "colorPicker", hint: "Semi-transparent box behind the text" },
    { key: "overlayBgOpacity", label: "Overlay Opacity", type: "slider",      hint: "0 = fully transparent, 80 = nearly opaque", min: 0, max: 80, step: 1, unit: "%" },
    { key: "showBtn",          label: "Show Button",     type: "toggle",      hint: "Display a call-to-action button over the hero" },
    { key: "btnText",          label: "Button Label",    type: "text",        showWhen: { key: "showBtn", value: true }, hint: "Button text e.g. 'Get Started'" },
    { key: "btnNavTarget",     label: "Button Link",     type: "navTarget",   showWhen: { key: "showBtn", value: true }, hint: "URL or anchor e.g. /contact or #packages" },
    { key: "btnVariant",       label: "Button Style",    type: "select",      showWhen: { key: "showBtn", value: true }, hint: "Visual style of the button",
      options: [{ value: "filled", label: "Filled" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost" }],
    },
    { key: "btnColor",         label: "Button Color",    type: "colorPicker", showWhen: { key: "showBtn", value: true }, hint: "Background color (filled) or border color (outline)" },
    { key: "btnTextColor",     label: "Button Text",     type: "colorPicker", showWhen: { key: "showBtn", value: true }, hint: "Color of the button label text" },
    { key: "customCss",        label: "Custom CSS",      type: "textarea",    hint: "Advanced — raw CSS applied to the block wrapper" },
    { key: "bgGradient",       label: "BG Gradient",     type: "text",        tab: "style", hint: "CSS gradient e.g. linear-gradient(135deg,#0f0c29,#302b63) — overrides bg color" },
    { key: "borderColor",      label: "Border Color",    type: "colorPicker", tab: "style" },
    { key: "borderWidth",      label: "Border Width",    type: "slider",      tab: "style", min: 0, max: 10, step: 1, unit: "px" },
    { key: "boxShadow",        label: "Box Shadow",      type: "select",      tab: "style",
      options: [
        { value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" },
        { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }, { value: "glow", label: "Glow" },
      ],
    },
    { key: "cardEffect",       label: "Visual Effect",   type: "select",      tab: "style",
      options: [
        { value: "none", label: "None" }, { value: "glow", label: "Hover Glow" },
        { value: "shimmer", label: "Shimmer" }, { value: "rgb", label: "RGB Glow" }, { value: "pulse-glow", label: "Pulse Glow" },
      ],
    },
    { key: "glowColor",        label: "Glow Color",      type: "colorPicker", tab: "style" },
    ...BLOCK_ANIM_FIELDS,
  ],

  card: [
    { key: "label",         label: "Card Label",     type: "text",        hint: "Internal identifier — not shown to visitors" },
    { key: "cardStyle",     label: "Card Style",     type: "select",      hint: "Visual appearance of the card container",
      options: [{ value: "shadow", label: "Shadow" }, { value: "bordered", label: "Bordered" },
                { value: "flat",   label: "Flat" },   { value: "elevated", label: "Elevated" }],
    },
    { key: "bgColor",       label: "Background",     type: "colorPicker", hint: "Card background fill — leave transparent to let section background show through" },
    { key: "glassEffect",   label: "Glass Effect",   type: "select",      hint: "Frosted glass overlay — best on animated or image backgrounds",
      options: [{ value: "none",  label: "None — transparent" },
                { value: "light", label: "Light Glass (for dark sections)" },
                { value: "dark",  label: "Dark Glass (for light sections)" }],
    },
    { key: "borderRadius",  label: "Corner Radius",  type: "slider", min: 0, max: 40, step: 2, unit: "px", hint: "How rounded the card corners are" },
    { key: "paddingTop",    label: "Pad Top",        type: "slider", min: 0, max: 80, step: 4, unit: "px", hint: "Inner top space" },
    { key: "paddingBottom", label: "Pad Bottom",     type: "slider", min: 0, max: 80, step: 4, unit: "px", hint: "Inner bottom space" },
    { key: "paddingX",      label: "Pad Left/Right", type: "slider", min: 0, max: 60, step: 4, unit: "px", hint: "Inner horizontal space" },
    { key: "gap",           label: "Element Gap",    type: "slider", min: 0, max: 48, step: 4, unit: "px", hint: "Space between items inside this card" },
    { key: "customCss",     label: "Custom CSS",     type: "textarea",    hint: "Advanced — raw CSS applied to the card wrapper" },
    { key: "textColor",     label: "Text Color",     type: "colorPicker", tab: "style", hint: "Color of text content inside the card" },
    ...BLOCK_STYLE_FIELDS,
    ...BLOCK_ANIM_FIELDS,
  ],

  "text-block": [
    { key: "label",         label: "Block Label",    type: "text",        hint: "Internal identifier — not shown to visitors" },
    { key: "bgColor",       label: "Background",     type: "colorPicker", hint: "Block background — leave transparent to let section background show through" },
    { key: "glassEffect",   label: "Glass Effect",   type: "select",      hint: "Frosted glass overlay — adds legibility over animated or image backgrounds",
      options: [{ value: "none",  label: "None — transparent" },
                { value: "light", label: "Light Glass (for dark sections)" },
                { value: "dark",  label: "Dark Glass (for light sections)" }],
    },
    { key: "paddingTop",    label: "Pad Top",        type: "slider", min: 0, max: 100, step: 4,  unit: "px", hint: "Inner top space" },
    { key: "paddingBottom", label: "Pad Bottom",     type: "slider", min: 0, max: 100, step: 4,  unit: "px", hint: "Inner bottom space" },
    { key: "paddingX",      label: "Pad Left/Right", type: "slider", min: 0, max: 80,  step: 4,  unit: "px", hint: "Inner horizontal space" },
    { key: "gap",           label: "Element Gap",    type: "slider", min: 0, max: 64,  step: 4,  unit: "px", hint: "Space between heading, paragraph, button and other sub-elements" },
    { key: "customCss",     label: "Custom CSS",     type: "textarea",    hint: "Advanced — raw CSS applied to the block wrapper" },
    { key: "textColor",     label: "Text Color",     type: "colorPicker", tab: "style", hint: "Color of text inside the block" },
    ...BLOCK_STYLE_FIELDS,
    ...BLOCK_ANIM_FIELDS,
  ],

  banner: [
    { key: "heading",   label: "Banner Text", type: "text",        hint: "Main message shown in the banner strip" },
    { key: "bgColor",   label: "Background",  type: "colorPicker", hint: "Banner background color" },
    { key: "textColor", label: "Text Color",  type: "colorPicker", hint: "Color of the banner text" },
    { key: "navTarget", label: "Link URL",    type: "navTarget",   hint: "Makes the banner clickable — leave empty for no link" },
    { key: "customCss", label: "Custom CSS",  type: "textarea",    hint: "Advanced — raw CSS applied to the banner" },
    ...BLOCK_STYLE_FIELDS,
    ...BLOCK_ANIM_FIELDS,
  ],

  stats: [
    { key: "number",    label: "Value",        type: "text",        hint: "Displayed number or text e.g. '99%' or '1,500+'" },
    { key: "statLabel", label: "Label",        type: "text",        hint: "Description below the value e.g. 'Uptime'" },
    { key: "icon",      label: "Icon",         type: "iconInput",   hint: "Bootstrap icon class e.g. bi-wifi or bi-people" },
    { key: "bgColor",   label: "Accent Color", type: "colorPicker", hint: "Icon or highlight accent color" },
    { key: "textColor", label: "Text Color",   type: "colorPicker", hint: "Color applied to value and label text" },
    { key: "customCss", label: "Custom CSS",   type: "textarea",    hint: "Advanced — raw CSS applied to the stat block" },
    ...BLOCK_STYLE_FIELDS,
    ...BLOCK_ANIM_FIELDS,
  ],

  image: [
    { key: "src",       label: "Image",        type: "imageUpload", hint: "Upload or choose from gallery, or paste a URL" },
    { key: "alt",       label: "Alt Text",     type: "text",        hint: "Describes the image for screen readers and SEO" },
    { key: "imageMode", label: "Display Mode", type: "select",      hint: "How the image fits within its block",
      options: [{ value: "fill",        label: "Fill Block" }, { value: "natural",     label: "Natural Size" },
                { value: "float-left",  label: "Float Left" }, { value: "float-right", label: "Float Right" }],
    },
    { key: "customCss", label: "Custom CSS",   type: "textarea",    hint: "Advanced — raw CSS applied to the image wrapper" },
    { key: "borderColor", label: "Border Color", type: "colorPicker", tab: "style" },
    { key: "borderWidth", label: "Border Width", type: "slider",      tab: "style", min: 0, max: 10, step: 1, unit: "px" },
    { key: "boxShadow",   label: "Box Shadow",   type: "select",      tab: "style",
      options: [{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }],
    },
    ...BLOCK_ANIM_FIELDS,
  ],

  video: [
    { key: "src",       label: "Video",        type: "videoUpload", hint: "Upload an .mp4 file or paste a video URL" },
    { key: "poster",    label: "Poster Image", type: "imageUpload", hint: "Thumbnail shown before the user hits play" },
    { key: "autoplay",  label: "Autoplay",     type: "toggle",      hint: "Starts playing automatically (muted)" },
    { key: "loop",      label: "Loop",         type: "toggle",      hint: "Restarts from the beginning when it ends" },
    { key: "customCss", label: "Custom CSS",   type: "textarea",    hint: "Advanced — raw CSS applied to the video wrapper" },
    { key: "borderColor", label: "Border Color", type: "colorPicker", tab: "style" },
    { key: "borderWidth", label: "Border Width", type: "slider",      tab: "style", min: 0, max: 10, step: 1, unit: "px" },
    { key: "boxShadow",   label: "Box Shadow",   type: "select",      tab: "style",
      options: [{ value: "none", label: "None" }, { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra Large" }],
    },
    ...BLOCK_ANIM_FIELDS,
  ],

  html: [
    { key: "html",      label: "HTML Content", type: "textarea", hint: "Raw HTML injected into the page — use with care" },
    { key: "customCss", label: "Custom CSS",   type: "textarea", hint: "Advanced — raw CSS scoped to this block" },
  ],

  divider: [
    { key: "thickness",    label: "Thickness", type: "slider",      hint: "Line thickness in pixels", min: 1, max: 10, step: 1, unit: "px" },
    { key: "dividerColor", label: "Color",     type: "colorPicker", hint: "Color of the divider line" },
    { key: "customCss",    label: "Custom CSS", type: "textarea",   hint: "Advanced — raw CSS applied to the divider" },
  ],
};

// ─── Sub-element schemas (1:1 with designer SUB_DEFAULTS) ────────────────────

// Visual layer fields shared across sub-elements — bg, clip, opacity, z-index, padding, radius
const SUB_LAYER_FIELDS: FieldDef[] = [
  { key: "bgColor",     label: "BG Color",    type: "colorPicker", hint: "Solid background colour behind this element" },
  { key: "bgImage",     label: "BG Image",    type: "imageUpload", hint: "Background image — combine with clip-path for creative masks" },
  { key: "bgGradient",  label: "BG Gradient", type: "text",        hint: "CSS gradient e.g. linear-gradient(135deg,#f72585,#7209b7)" },
  { key: "clipPath",    label: "Clip Path",   type: "text",        hint: "CSS clip-path — e.g. polygon(0 0,100% 0,85% 100%,0 100%) or ellipse(60% 40% at 50% 50%)" },
  { key: "opacity",     label: "Opacity",     type: "slider", min: 0, max: 100, step: 5, unit: "%", defaultValue: 100 },
  { key: "zIndex",      label: "Z-Index",     type: "slider", min: -10, max: 50, step: 1, hint: "Stack order — higher = in front. Use with position:absolute in Custom CSS to layer elements" },
  { key: "elPadding",   label: "Padding",     type: "slider", min: 0, max: 80, step: 2, unit: "px", hint: "Inner space around the element" },
  { key: "elRadius",    label: "Radius",      type: "slider", min: 0, max: 100, step: 2, unit: "px", hint: "Corner rounding" },
];

const SUB_ELEMENT_SCHEMAS: Record<string, FieldDef[]> = {
  heading: [
    { key: "text",          label: "Heading Text",   type: "text",        hint: "The heading text displayed to visitors" },
    { key: "level",         label: "Tag Level",      type: "select",      hint: "HTML heading tag — H1 is largest, H6 is smallest",
      options: [{ value: "h1", label: "H1 — Hero Title" }, { value: "h2", label: "H2 — Section" },
                { value: "h3", label: "H3 — Subsection" }, { value: "h4", label: "H4 — Card Title" },
                { value: "h5", label: "H5 — Small" },      { value: "h6", label: "H6 — Tiny" }],
    },
    { key: "fontSize",      label: "Font Size",      type: "slider",  min: 12, max: 96, step: 1, unit: "px", hint: "Override the default tag size" },
    { key: "fontFamily",    label: "Font Family",    type: "fontPicker", hint: "Google Font applied to this heading" },
    { key: "fontWeight",    label: "Weight",         type: "select",
      options: [{ value: "100", label: "100 · Thin" }, { value: "200", label: "200 · Extra Light" },
                { value: "300", label: "300 · Light" }, { value: "400", label: "400 · Regular" },
                { value: "500", label: "500 · Medium" }, { value: "600", label: "600 · Semibold" },
                { value: "700", label: "700 · Bold" }, { value: "800", label: "800 · Extra Bold" },
                { value: "900", label: "900 · Black" }],
    },
    { key: "textAlign",     label: "Alignment",      type: "select",
      options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }],
    },
    { key: "lineHeight",    label: "Line Height",    type: "slider",  min: 0.8, max: 2.5, step: 0.1, unit: "×",  hint: "Vertical space between lines" },
    { key: "letterSpacing", label: "Letter Spacing", type: "slider",  min: -3,  max: 12,  step: 0.5, unit: "px", hint: "Horizontal space between characters" },
    { key: "textTransform", label: "Transform",      type: "select",
      options: [{ value: "none", label: "None" }, { value: "uppercase", label: "UPPERCASE" },
                { value: "lowercase", label: "lowercase" }, { value: "capitalize", label: "Capitalize Each" }],
    },
    { key: "marginBottom",  label: "Space Below",    type: "slider",  min: 0, max: 80, step: 4, unit: "px", hint: "Gap below this heading before the next element" },
    { key: "color",         label: "Text Color",     type: "colorPicker" },
    ...SUB_LAYER_FIELDS,
    { key: "customCss",     label: "Custom CSS",     type: "textarea", hint: "Raw CSS — use clip-path, background-image, transform, mix-blend-mode, etc." },
  ],

  paragraph: [
    { key: "text",          label: "Paragraph Text", type: "textarea", hint: "Body copy shown in this paragraph" },
    { key: "fontSize",      label: "Font Size",      type: "slider",  min: 10, max: 28, step: 1, unit: "px" },
    { key: "fontFamily",    label: "Font Family",    type: "fontPicker", hint: "Google Font applied to this paragraph" },
    { key: "fontWeight",    label: "Weight",         type: "select",
      options: [{ value: "300", label: "300 · Light" }, { value: "400", label: "400 · Regular" },
                { value: "500", label: "500 · Medium" }, { value: "600", label: "600 · Semibold" }],
    },
    { key: "textAlign",     label: "Alignment",      type: "select",
      options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" },
                { value: "right", label: "Right" }, { value: "justify", label: "Justify" }],
    },
    { key: "lineHeight",    label: "Line Height",    type: "slider",  min: 1.0, max: 2.5, step: 0.1, unit: "×",  hint: "Vertical space between lines — 1.6 is a comfortable reading default" },
    { key: "letterSpacing", label: "Letter Spacing", type: "slider",  min: -2,  max: 8,   step: 0.5, unit: "px" },
    { key: "textTransform", label: "Transform",      type: "select",
      options: [{ value: "none", label: "None" }, { value: "uppercase", label: "UPPERCASE" },
                { value: "lowercase", label: "lowercase" }, { value: "capitalize", label: "Capitalize Each" }],
    },
    { key: "maxWidth",      label: "Max Line Width", type: "slider",  min: 0, max: 900, step: 20, unit: "px", hint: "Limit line length for readability — 0 = full width" },
    { key: "marginBottom",  label: "Space Below",    type: "slider",  min: 0, max: 80, step: 4, unit: "px", hint: "Gap below this paragraph before the next element" },
    { key: "color",         label: "Text Color",     type: "colorPicker" },
    ...SUB_LAYER_FIELDS,
    { key: "customCss",     label: "Custom CSS",     type: "textarea", hint: "Raw CSS — use clip-path, background-image, transform, mix-blend-mode, etc." },
  ],

  image: [
    { key: "src",       label: "Image",        type: "imageUpload", hint: "Upload, choose from gallery, or paste a URL" },
    { key: "alt",       label: "Alt Text",     type: "text",        hint: "Describes the image for screen readers and SEO" },
    { key: "imageMode", label: "Display Mode", type: "select",      hint: "How the image fits in its available space",
      options: [{ value: "fill",       label: "Fill Block" },    { value: "natural",     label: "Natural Size" },
                { value: "float-left", label: "Float Left" },  { value: "float-right", label: "Float Right" }],
    },
    { key: "clipPath",   label: "Clip Path",   type: "text",    hint: "CSS clip-path — e.g. polygon(0 0,100% 0,85% 100%,0 100%)" },
    { key: "opacity",    label: "Opacity",     type: "slider", min: 0, max: 100, step: 5, unit: "%", defaultValue: 100 },
    { key: "elRadius",   label: "Radius",      type: "slider", min: 0, max: 100, step: 2, unit: "px" },
    { key: "zIndex",     label: "Z-Index",     type: "slider", min: -10, max: 50, step: 1, hint: "Stack order for layering" },
    { key: "customCss",  label: "Custom CSS",  type: "textarea", hint: "Raw CSS — transform, mix-blend-mode, filter, etc." },
  ],

  button: [
    { key: "text",         label: "Button Label",   type: "text",        hint: "Text shown on the button" },
    { key: "navTarget",    label: "Link URL",        type: "navTarget",   hint: "Where this button navigates e.g. /contact or #packages" },
    { key: "variant",      label: "Style",           type: "select",
      options: [{ value: "filled", label: "Filled" }, { value: "outline", label: "Outline" }, { value: "ghost", label: "Ghost" }],
    },
    { key: "size",         label: "Size",            type: "select",
      options: [{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }],
    },
    { key: "borderRadius", label: "Corner Radius",  type: "slider", min: 0, max: 50, step: 1, unit: "px", hint: "0 = sharp square, 50 = fully rounded pill" },
    { key: "paddingX",     label: "H. Padding",     type: "slider", min: 8, max: 60, step: 2, unit: "px", hint: "Horizontal padding inside the button" },
    { key: "paddingY",     label: "V. Padding",     type: "slider", min: 4, max: 24, step: 2, unit: "px", hint: "Vertical padding inside the button" },
    { key: "marginTop",    label: "Space Above",    type: "slider", min: 0, max: 60, step: 4, unit: "px" },
    { key: "bgColor",      label: "Button Color",   type: "colorPicker", hint: "Background (filled) or border (outline) color" },
    { key: "textColor",    label: "Label Color",    type: "colorPicker", hint: "Color of the button label text" },
    { key: "icon",         label: "Icon",           type: "iconInput",   hint: "Bootstrap icon shown on button e.g. bi-arrow-right" },
    { key: "customCss",    label: "Custom CSS",     type: "textarea",    hint: "Advanced — raw CSS applied to the button" },
  ],

  badge: [
    { key: "text",         label: "Badge Text",    type: "text",        hint: "Short label shown inside the badge" },
    { key: "bgColor",      label: "Background",    type: "colorPicker", hint: "Badge background fill color" },
    { key: "textColor",    label: "Text Color",    type: "colorPicker", hint: "Color of the badge label text" },
    { key: "fontSize",     label: "Font Size",     type: "slider", min: 9, max: 20, step: 1, unit: "px" },
    { key: "borderRadius", label: "Corner Radius", type: "slider", min: 0, max: 30, step: 2, unit: "px", hint: "0 = square badge, 30 = pill badge" },
    { key: "clipPath",     label: "Clip Path",     type: "text",    hint: "CSS clip-path e.g. polygon(0 0,100% 0,85% 100%,0 100%)" },
    { key: "opacity",      label: "Opacity",       type: "slider", min: 0, max: 100, step: 5, unit: "%" },
    { key: "zIndex",       label: "Z-Index",       type: "slider", min: -10, max: 50, step: 1 },
    { key: "customCss",    label: "Custom CSS",    type: "textarea", hint: "Raw CSS — transform, mix-blend-mode, filter, etc." },
  ],

  divider: [
    { key: "thickness",    label: "Thickness", type: "slider", min: 1, max: 10, step: 1, unit: "px" },
    { key: "dividerColor", label: "Color",     type: "colorPicker" },
    { key: "customCss",    label: "Custom CSS", type: "textarea" },
  ],
};

// ─── Media picker control (image / video with upload + gallery) ───────────────

function MediaPickerControl({
  value,
  onChange,
  acceptVideo = false,
}: {
  value: string;
  onChange: (val: unknown) => void;
  acceptVideo?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <div className="input-group input-group-sm">
        <input
          type="text"
          className="form-control form-control-sm"
          value={value}
          placeholder={acceptVideo ? "https://... (.mp4)" : "/images/... or https://..."}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setShowPicker(true)}
          title="Browse media library"
        >
          <i className="bi bi-folder2-open" />
        </button>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => setShowUpload(true)}
          title="Upload from your computer"
        >
          <i className="bi bi-cloud-upload" />
        </button>
      </div>
      {/* Inline preview for images */}
      {value && !acceptVideo && (
        <img
          src={value}
          alt="Preview"
          className="img-thumbnail mt-1"
          style={{ maxHeight: 60, display: "block" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      <MediaPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(url) => { onChange(url); setShowPicker(false); }}
        filterType={acceptVideo ? "video" : "image"}
      />
      <MediaUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadComplete={(url) => { onChange(url); setShowUpload(false); }}
        acceptedTypes={acceptVideo ? "video/*" : "image/*"}
      />
    </>
  );
}

// ─── Generic field renderer ───────────────────────────────────────────────────

function renderField(
  fieldDef: FieldDef,
  value: unknown,
  onChange: (val: unknown) => void,
  allProps: Record<string, unknown> = {},
): React.ReactNode {
  if (fieldDef.showWhen && allProps[fieldDef.showWhen.key] !== fieldDef.showWhen.value) {
    return null;
  }

  const strVal = (value as string) ?? "";
  const numVal = (value as number) ?? fieldDef.defaultValue ?? 0;
  const boolVal = !!(value);

  switch (fieldDef.type) {
    case "text":
      return (
        <input type="text" className="form-control form-control-sm"
          value={strVal} placeholder={fieldDef.hint}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "textarea":
      return (
        <textarea className="form-control form-control-sm" rows={3}
          value={strVal} placeholder={fieldDef.hint}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "navTarget":
      return (
        <input type="text" className="form-control form-control-sm"
          value={strVal} placeholder={fieldDef.hint || "https://..."}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "iconInput":
      return (
        <input type="text" className="form-control form-control-sm font-monospace"
          value={strVal} placeholder={fieldDef.hint || "bi-icon-name"}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "colorPicker": {
      const isValidHex = /^#[0-9a-fA-F]{6}$/.test(strVal);
      return (
        <div className="input-group input-group-sm">
          {isValidHex ? (
            <input type="color" className="form-control form-control-color form-control-sm"
              value={strVal} style={{ width: 40, padding: "2px" }}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <span
              className="input-group-text"
              style={{
                width: 40, padding: 0, cursor: "pointer", flexShrink: 0,
                background: "repeating-conic-gradient(#bbb 0% 25%, #fff 0% 50%) 0 0 / 8px 8px",
                border: "1px solid #ced4da", borderRight: "none",
              }}
              title="Transparent — click to set a colour"
              onClick={() => onChange("#ffffff")}
            />
          )}
          <input type="text" className="form-control form-control-sm font-monospace"
            value={strVal} placeholder="transparent"
            onChange={(e) => onChange(e.target.value)}
          />
          {isValidHex && (
            <button type="button" className="btn btn-outline-secondary btn-sm px-1"
              title="Clear to transparent" onClick={() => onChange("transparent")}>
              <i className="bi bi-x-lg" style={{ fontSize: 10 }} />
            </button>
          )}
        </div>
      );
    }

    case "toggle":
      return (
        <div className="form-check form-switch mb-0">
          <input className="form-check-input" type="checkbox" checked={boolVal}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="form-check-label small">{boolVal ? "On" : "Off"}</label>
        </div>
      );

    case "select":
      return (
        <select className="form-select form-select-sm" value={strVal}
          onChange={(e) => onChange(e.target.value)}
        >
          {(fieldDef.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case "number":
      return (
        <input type="number" className="form-control form-control-sm"
          value={numVal} min={fieldDef.min} max={fieldDef.max} step={fieldDef.step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );

    case "slider":
      return (
        <div className="d-flex align-items-center gap-2">
          <input type="range" className="form-range flex-grow-1"
            min={fieldDef.min ?? 0} max={fieldDef.max ?? 100} step={fieldDef.step ?? 1}
            value={numVal} onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="badge bg-secondary text-white" style={{ minWidth: 42, fontSize: "0.7rem" }}>
            {numVal}{fieldDef.unit || ""}
          </span>
        </div>
      );

    case "imageUpload":
      return <MediaPickerControl value={strVal} onChange={onChange} />;

    case "videoUpload":
      return <MediaPickerControl value={strVal} onChange={onChange} acceptVideo />;

    case "fontPicker":
      return (
        <GoogleFontPicker
          value={strVal || "inherit"}
          onChange={(val) => onChange(val)}
        />
      );

    default:
      return null;
  }
}

// ─── Schema table editor ──────────────────────────────────────────────────────

function SchemaTableEditor({
  schema,
  props,
  onUpdate,
}: {
  schema: FieldDef[];
  props: Record<string, unknown>;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <table className="table table-sm table-borderless mb-0" style={{ tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "36%" }} />
        <col style={{ width: "64%" }} />
      </colgroup>
      <tbody>
        {schema.map((fieldDef) => {
          const control = renderField(fieldDef, props[fieldDef.key], (val) => onUpdate({ [fieldDef.key]: val }), props);
          if (control === null) return null;
          return (
            <tr key={fieldDef.key}>
              <td className="align-middle pe-2">
                <label className="form-label form-label-sm mb-0 fw-semibold text-secondary" style={{ fontSize: "0.8rem" }}>
                  {fieldDef.label}
                </label>
                {fieldDef.hint && (
                  <div className="form-text mt-0" style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>{fieldDef.hint}</div>
                )}
              </td>
              <td className="align-middle">{control}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Text layout presets ─────────────────────────────────────────────────────

const HEADING_PRESETS = [
  { label: "Display",    icon: "bi-type",          props: { fontSize: 60, fontWeight: "800", textAlign: "center", lineHeight: 1.0, letterSpacing: -2,   marginBottom: 16 } },
  { label: "Hero",       icon: "bi-stars",          props: { fontSize: 44, fontWeight: "700", textAlign: "left",   lineHeight: 1.1, letterSpacing: -0.5, marginBottom: 12 } },
  { label: "Section",    icon: "bi-layout-text-window-reverse", props: { fontSize: 32, fontWeight: "700", textAlign: "left", lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 8 } },
  { label: "Card Title", icon: "bi-card-heading",   props: { fontSize: 20, fontWeight: "600", textAlign: "left",   lineHeight: 1.3, letterSpacing: 0,    marginBottom: 4 } },
  { label: "Subhead",    icon: "bi-type-h3",        props: { fontSize: 18, fontWeight: "300", textAlign: "left",   lineHeight: 1.6, letterSpacing: 0.5,  marginBottom: 8 } },
  { label: "Eyebrow",    icon: "bi-subtract",       props: { fontSize: 11, fontWeight: "700", textAlign: "left",   lineHeight: 1.4, letterSpacing: 2.5,  textTransform: "uppercase", marginBottom: 8 } },
] as const;

const PARAGRAPH_PRESETS = [
  { label: "Lead",    icon: "bi-body-text",     props: { fontSize: 18, fontWeight: "400", lineHeight: 1.8,  letterSpacing: 0,   textAlign: "left", marginBottom: 16 } },
  { label: "Body",    icon: "bi-paragraph",     props: { fontSize: 15, fontWeight: "400", lineHeight: 1.65, letterSpacing: 0,   textAlign: "left", marginBottom: 12 } },
  { label: "Small",   icon: "bi-text-paragraph",props: { fontSize: 13, fontWeight: "400", lineHeight: 1.5,  letterSpacing: 0.2, textAlign: "left", marginBottom: 8  } },
  { label: "Caption", icon: "bi-chat-quote",    props: { fontSize: 12, fontWeight: "400", lineHeight: 1.4,  letterSpacing: 0.5, textAlign: "left", marginBottom: 4  } },
  { label: "Callout", icon: "bi-megaphone",     props: { fontSize: 16, fontWeight: "600", lineHeight: 1.6,  letterSpacing: 0,   textAlign: "center", marginBottom: 12 } },
] as const;

function TextPresetBar({
  type,
  onApply,
}: {
  type: "heading" | "paragraph";
  onApply: (props: Record<string, unknown>) => void;
}) {
  const presets = type === "heading" ? HEADING_PRESETS : PARAGRAPH_PRESETS;
  return (
    <div className="mb-2 px-1">
      <div className="d-flex align-items-center gap-1 mb-1">
        <i className="bi bi-magic text-primary" style={{ fontSize: "0.75rem" }} />
        <span className="text-muted" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Quick Presets
        </span>
      </div>
      <div className="d-flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className="btn btn-outline-primary btn-sm"
            style={{ fontSize: "0.7rem", padding: "2px 8px", lineHeight: 1.6 }}
            title={`Apply ${p.label} preset`}
            onClick={() => onApply({ ...p.props })}
          >
            <i className={`bi ${p.icon} me-1`} style={{ fontSize: "0.65rem" }} />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DesignerBlockEditor ──────────────────────────────────────────────────────

interface DesignerBlockEditorProps {
  block: {
    id: string | number;
    type: string;
    props?: Record<string, unknown>;
    subElements?: Array<{ id?: string | number; type: string; props?: Record<string, unknown> }>;
  };
  onUpdateProps: (patch: Record<string, unknown>) => void;
  onUpdateSubElement: (subIdx: number, patch: Record<string, unknown>) => void;
  onAddSubElement?: (type: string) => void;
  onRemoveSubElement?: (subIdx: number) => void;
}

// Block types that support nested sub-elements
const SUB_ELEMENT_CAPABLE = new Set(["card", "text-block", "text", "banner"]);

// Available sub-element types with icons and labels
const SUB_ELEMENT_TYPES = [
  { type: "heading",   icon: "bi-type-h1",    label: "Heading" },
  { type: "paragraph", icon: "bi-paragraph",  label: "Paragraph" },
  { type: "button",    icon: "bi-cursor",     label: "Button" },
  { type: "image",     icon: "bi-image",      label: "Image" },
  { type: "badge",     icon: "bi-award",      label: "Badge" },
  { type: "divider",   icon: "bi-dash-lg",    label: "Divider" },
];

function DesignerBlockEditor({
  block, onUpdateProps, onUpdateSubElement, onAddSubElement, onRemoveSubElement
}: DesignerBlockEditorProps) {
  const [expandedSubs, setExpandedSubs] = useState<Set<number>>(new Set());
  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "style" | "anim">("content");

  const blockProps = block.props || {};
  const subs = block.subElements || [];

  const toggleSub = (idx: number) => {
    setExpandedSubs((prev) => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return s;
    });
  };

  const startInlineEdit = (si: number, text: string) => {
    setEditingSubIdx(si);
    setEditingText(text);
  };

  const commitInlineEdit = (si: number) => {
    onUpdateSubElement(si, { text: editingText });
    setEditingSubIdx(null);
  };

  const subIcons: Record<string, string> = {
    heading: "bi-type-h1", paragraph: "bi-paragraph", button: "bi-cursor",
    image: "bi-image", badge: "bi-award", divider: "bi-dash-lg", video: "bi-play-circle",
  };

  const resolvedSchema = block.type === "text" ? BLOCK_SCHEMAS["text-block"] : (BLOCK_SCHEMAS[block.type] || []);
  const canAddSubElements = SUB_ELEMENT_CAPABLE.has(block.type);

  const contentSchema = resolvedSchema.filter(f => !f.tab || f.tab === "content");
  const styleSchema   = resolvedSchema.filter(f => f.tab === "style");
  const animSchema    = resolvedSchema.filter(f => f.tab === "anim");
  const hasStyleTab   = styleSchema.length > 0;
  const hasAnimTab    = animSchema.length > 0;
  const hasTabs       = hasStyleTab || hasAnimTab;

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: "0.72rem", padding: "3px 10px", borderRadius: "4px",
    background: active ? "#0d6efd" : "transparent",
    color: active ? "#fff" : "#6c757d",
    border: active ? "1px solid #0d6efd" : "1px solid #dee2e6",
    cursor: "pointer", fontWeight: active ? 600 : 400,
  });

  return (
    <div>
      {/* Tab bar — only shown when style or anim fields exist */}
      {hasTabs && (
        <div className="d-flex gap-1 mb-2 pb-2 border-bottom">
          <button type="button" style={tabBtnStyle(activeTab === "content")} onClick={() => setActiveTab("content")}>
            <i className="bi bi-layout-text-window-reverse me-1" style={{ fontSize: "0.65rem" }} />Content
          </button>
          {hasStyleTab && (
            <button type="button" style={tabBtnStyle(activeTab === "style")} onClick={() => setActiveTab("style")}>
              <i className="bi bi-palette2 me-1" style={{ fontSize: "0.65rem" }} />Style
            </button>
          )}
          {hasAnimTab && (
            <button type="button" style={tabBtnStyle(activeTab === "anim")} onClick={() => setActiveTab("anim")}>
              <i className="bi bi-stars me-1" style={{ fontSize: "0.65rem" }} />Animate
            </button>
          )}
        </div>
      )}

      {/* Schema fields for active tab */}
      {hasTabs ? (
        <>
          {activeTab === "content" && contentSchema.length > 0 && (
            <SchemaTableEditor schema={contentSchema} props={blockProps} onUpdate={onUpdateProps} />
          )}
          {activeTab === "style" && styleSchema.length > 0 && (
            <SchemaTableEditor schema={styleSchema} props={blockProps} onUpdate={onUpdateProps} />
          )}
          {activeTab === "anim" && animSchema.length > 0 && (
            <SchemaTableEditor schema={animSchema} props={blockProps} onUpdate={onUpdateProps} />
          )}
          {((activeTab === "content" && contentSchema.length === 0) ||
            (activeTab === "style"   && styleSchema.length   === 0) ||
            (activeTab === "anim"    && animSchema.length    === 0)) && (
            <div className="text-muted small text-center py-2">No fields in this tab.</div>
          )}
        </>
      ) : resolvedSchema.length > 0 ? (
        <SchemaTableEditor schema={resolvedSchema} props={blockProps} onUpdate={onUpdateProps} />
      ) : (
        <div className="alert alert-secondary small mb-2 py-2">
          <i className="bi bi-info-circle me-2" />
          Block type <strong>{block.type}</strong> — open the designer to edit this block.
        </div>
      )}

      {/* Sub-elements section — shown when block has subs or can accept them */}
      {(subs.length > 0 || canAddSubElements) && (
        <div className="mt-3">
          <div className="d-flex align-items-center gap-1 mb-2 px-2 py-1 rounded"
            style={{ background: "#f0f4ff", border: "1px solid #c7d7ff" }}
          >
            <i className="bi bi-list-ul text-primary" style={{ fontSize: "0.8rem" }} />
            <span className="small fw-semibold text-primary">
              Nested elements{subs.length > 0 ? ` (${subs.length})` : ""}
            </span>
          </div>

          {subs.length === 0 && canAddSubElements && (
            <div className="text-muted small text-center py-2 border rounded mb-2" style={{ borderStyle: "dashed" }}>
              No elements yet — add one below
            </div>
          )}

          {/* Sub-element rows */}
          {subs.map((sub, si) => {
            const isExpanded = expandedSubs.has(si);
            const isEditing = editingSubIdx === si;
            const subSchema = SUB_ELEMENT_SCHEMAS[sub.type] || [];
            const subProps = sub.props || {};
            const textValue = ((subProps.text || subProps.html || subProps.src || "") as string);
            const preview = textValue.slice(0, 35);
            const hasTextProp = ["heading", "paragraph", "button", "badge", "banner"].includes(sub.type);

            return (
              <div key={si} className="rounded mb-1 border" style={{ overflow: "hidden" }}>
                {/* Header row: toggle + pencil (quick edit) + delete */}
                <div
                  className="d-flex align-items-stretch"
                  style={{ background: isExpanded ? "#f0f4ff" : "white", minHeight: "36px" }}
                >
                  <button
                    type="button"
                    className="btn btn-link text-start d-flex align-items-center flex-fill py-2 px-2 text-decoration-none text-dark"
                    style={{ fontSize: "0.82rem" }}
                    onClick={() => toggleSub(si)}
                  >
                    <i className={`bi ${subIcons[sub.type] || "bi-box"} me-2 text-secondary`} />
                    <span className="text-capitalize fw-semibold">{sub.type}</span>
                    {preview && (
                      <span className="ms-2 text-muted fw-normal text-truncate" style={{ maxWidth: 120, fontSize: "0.74rem" }}>
                        — {preview}
                      </span>
                    )}
                    <i
                      className={`bi ${isExpanded ? "bi-chevron-up" : "bi-chevron-down"} ms-auto text-muted`}
                      style={{ fontSize: "0.65rem" }}
                    />
                  </button>

                  {/* Pencil — quick inline text edit */}
                  {hasTextProp && (
                    <button
                      type="button"
                      className="btn btn-link px-2 border-start"
                      style={{ color: isEditing ? "#0d6efd" : "#6c757d", fontSize: "0.75rem" }}
                      title="Quick-edit text (pencil = inline edit)"
                      onClick={() => isEditing ? setEditingSubIdx(null) : startInlineEdit(si, textValue)}
                    >
                      <i className="bi bi-pencil-fill" />
                    </button>
                  )}

                  {/* Delete */}
                  {onRemoveSubElement && (
                    <button
                      type="button"
                      className="btn btn-link px-2 border-start text-danger"
                      style={{ fontSize: "0.75rem" }}
                      title="Remove this element"
                      onClick={() => onRemoveSubElement(si)}
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  )}
                </div>

                {/* Inline text edit panel — shows when pencil clicked */}
                {isEditing && (
                  <div className="px-2 py-2 border-top" style={{ background: "#fffdf0" }}>
                    <div className="small fw-semibold text-muted mb-1">
                      <i className="bi bi-pencil me-1 text-warning" />
                      Quick-edit text
                    </div>
                    {sub.type === "paragraph" ? (
                      <textarea
                        autoFocus
                        className="form-control form-control-sm w-100 mb-2"
                        rows={3}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") setEditingSubIdx(null); }}
                        placeholder="Paragraph text..."
                      />
                    ) : (
                      <input
                        autoFocus
                        type="text"
                        className="form-control form-control-sm w-100 mb-2"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitInlineEdit(si);
                          if (e.key === "Escape") setEditingSubIdx(null);
                        }}
                        placeholder="Element text..."
                      />
                    )}
                    <div className="d-flex gap-1 justify-content-end">
                      <button
                        className="btn btn-success btn-sm"
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => commitInlineEdit(si)}
                      >
                        <i className="bi bi-check-lg me-1" />Save
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => setEditingSubIdx(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded schema body */}
                {isExpanded && (
                  <div className="border-top px-2 py-2">
                    {(sub.type === "heading" || sub.type === "paragraph") && (
                      <TextPresetBar
                        type={sub.type}
                        onApply={(preset) => onUpdateSubElement(si, preset)}
                      />
                    )}
                    {subSchema.length > 0 ? (
                      <SchemaTableEditor
                        schema={subSchema}
                        props={subProps}
                        onUpdate={(patch) => onUpdateSubElement(si, patch)}
                      />
                    ) : (
                      <p className="text-muted small mb-0">
                        <i className="bi bi-info-circle me-1" />
                        No editable properties for <strong>{sub.type}</strong>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add sub-element chips */}
          {canAddSubElements && onAddSubElement && (
            <div className="mt-2 pt-2 border-top">
              <div className="d-flex align-items-center gap-1 mb-1">
                <i className="bi bi-plus-circle text-success" style={{ fontSize: "0.75rem" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "#6c757d" }}>
                  Add element
                </span>
              </div>
              <div className="d-flex flex-wrap gap-1">
                {SUB_ELEMENT_TYPES.map(({ type, icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    style={{ fontSize: "0.7rem", padding: "2px 8px", lineHeight: 1.6 }}
                    onClick={() => onAddSubElement(type)}
                  >
                    <i className={`bi ${icon} me-1`} style={{ fontSize: "0.65rem" }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
