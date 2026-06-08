"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { FlexibleSection, FlexibleElement, FlexibleAnimationType } from "@/types/section";
import { defaultScrollStage, defaultZone } from "@/components/sections/scroll-stage/types";
import type { ScrollStageConfig, ScrollStageZoneConfig, ScrollStageZoneImageConfig } from "@/components/sections/scroll-stage/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface FlexibleSectionEditorProps {
  section: FlexibleSection;
  onChange: (updated: FlexibleSection) => void;
}

type ActiveTab = "layout" | "content" | "styling" | "advanced" | "scroll-stage";

const ELEMENT_TYPES = [
  { type: "text",    label: "Text Block",   icon: "bi-type" },
  { type: "image",   label: "Image",        icon: "bi-image" },
  { type: "video",   label: "Video",        icon: "bi-play-circle" },
  { type: "button",  label: "Button",       icon: "bi-cursor" },
  { type: "banner",  label: "Banner",       icon: "bi-panorama" },
  { type: "card",    label: "Card",         icon: "bi-card-text" },
  { type: "stats",   label: "Stat",         icon: "bi-graph-up" },
  { type: "divider", label: "Divider",      icon: "bi-dash-lg" },
  { type: "html",    label: "Raw HTML",     icon: "bi-code-slash" },
  { type: "hero",    label: "Hero Block",   icon: "bi-layout-text-window" },
] as const;

const PRESET_OPTIONS = [
  { value: "2-col-split",           label: "2 Columns (50/50)" },
  { value: "3-col-grid",            label: "3 Columns (33/33/33)" },
  { value: "asymmetric-2col-60-40", label: "Asymmetric (60/40)" },
  { value: "asymmetric-2col-40-60", label: "Asymmetric (40/60)" },
  { value: "4-col-grid",            label: "4 Columns" },
  { value: "hero-2col",             label: "Hero Split (hero/content)" },
  { value: "sidebar-70-30",         label: "Sidebar Right (70/30)" },
  { value: "sidebar-30-70",         label: "Sidebar Left (30/70)" },
];

const ANIMATION_TYPES: FlexibleAnimationType[] = [
  "none", "fadeIn", "slideUp", "slideDown", "slideInLeft", "slideInRight",
  "scaleIn", "zoomIn", "flipInX", "flipInY", "bounceIn", "rotateIn", "blurIn",
];

function makeElementId() {
  return `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function makeDefaultElement(type: FlexibleElement["type"]): FlexibleElement {
  const base: FlexibleElement = {
    id: makeElementId(),
    type,
    position: { mode: "grid", gridRow: 1, gridCol: 1, gridColSpan: 1 },
    styling: {},
    content: {},
    animation: { type: "fadeIn", duration: 600, delay: 0 },
  };

  switch (type) {
    case "text":
      return { ...base, content: { heading: "New Heading", subheading: "A subheading", text: "<p>Your content here.</p>" } };
    case "image":
      return { ...base, content: { imageSrc: "", imageAlt: "Image", imageFit: "cover", imageHeight: 300 } };
    case "video":
      return { ...base, content: { videoSrc: "", autoplay: false, loop: false, muted: true, controls: true, videoHeight: 280 } };
    case "button":
      return { ...base, content: { buttonText: "Click Here", buttonHref: "#", buttonVariant: "filled", buttonSize: "md" } };
    case "banner":
      return { ...base, content: { bannerHeading: "Banner Heading", bannerSubheading: "Subtitle text", bannerHeight: 280, bannerTextPosition: "center", bannerOverlay: "rgba(0,0,0,0.38)" } };
    case "card":
      return { ...base, content: { cardTitle: "Card Title", cardBody: "Card description text goes here.", cardBgType: "default", cardEffect: "default" } };
    case "stats":
      return { ...base, content: { statsNumber: "99%", statsLabel: "Uptime", statsIcon: "bi-server" } };
    case "divider":
      return { ...base, content: { dividerType: "line", dividerColor: "#dee2e6", dividerHeight: 1 } };
    case "html":
      return { ...base, content: { html: "<p>Custom HTML content</p>" } };
    case "hero":
      return { ...base, content: { heroHeading: "Hero Heading", heroSubheading: "A compelling subtitle", heroAlign: "center", heroMinHeight: 400 } };
    default:
      return base;
  }
}

export default function FlexibleSectionEditor({ section, onChange }: FlexibleSectionEditorProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("content");
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const content = section.content || {};
  const layout  = content.layout  || { type: "preset", preset: "2-col-split" };
  const elements: FlexibleElement[] = content.elements || [];

  const update = useCallback((patch: Partial<FlexibleSection>) => {
    onChange({ ...section, ...patch });
  }, [section, onChange]);

  const updateContent = useCallback((contentPatch: Partial<FlexibleSection["content"]>) => {
    update({ content: { ...content, ...contentPatch } });
  }, [content, update]);

  const updateLayout = useCallback((layoutPatch: Partial<typeof layout>) => {
    updateContent({ layout: { ...layout, ...layoutPatch } });
  }, [layout, updateContent]);

  const updateElements = useCallback((newElements: FlexibleElement[]) => {
    updateContent({ elements: newElements });
  }, [updateContent]);

  const updateElement = useCallback((id: string, patch: Partial<FlexibleElement>) => {
    updateElements(elements.map((el) => el.id === id ? { ...el, ...patch } : el));
  }, [elements, updateElements]);

  const updateElementContent = useCallback((id: string, contentPatch: Record<string, unknown>) => {
    updateElements(elements.map((el) => el.id === id ? { ...el, content: { ...el.content, ...contentPatch } } : el));
  }, [elements, updateElements]);

  const addElement = (type: FlexibleElement["type"]) => {
    const newEl = makeDefaultElement(type);
    updateElements([...elements, newEl]);
    setExpandedElements((prev) => new Set(prev).add(newEl.id));
    setShowAddPicker(false);
  };

  const deleteElement = (id: string) => {
    updateElements(elements.filter((el) => el.id !== id));
    setExpandedElements((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleExpand = (id: string) => {
    setExpandedElements((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  // Drag-to-reorder handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...elements];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    updateElements(reordered);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const contentMode = (content as Record<string, unknown>).contentMode as string || "single";

  return (
    <div className="flexible-section-editor">
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-3 flex-wrap">
        {(["layout", "content", "styling", "advanced"] as ActiveTab[]).map((tab) => (
          <li key={tab} className="nav-item">
            <button
              className={`nav-link ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "layout"   && <><i className="bi bi-layout-three-columns me-1"></i>Layout</>}
              {tab === "content"  && <><i className="bi bi-grid-1x2 me-1"></i>Content</>}
              {tab === "styling"  && <><i className="bi bi-palette me-1"></i>Styling</>}
              {tab === "advanced" && <><i className="bi bi-sliders me-1"></i>Advanced</>}
            </button>
          </li>
        ))}
        {/* Scroll Stage tab — only visible in multi content mode */}
        {contentMode === "multi" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "scroll-stage" ? "active" : ""} position-relative`}
              onClick={() => setActiveTab("scroll-stage")}
            >
              <i className="bi bi-layers me-1"></i>Scroll Stage
              {(content as any).scrollStage?.enabled && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success" style={{ fontSize: "9px" }}>ON</span>
              )}
            </button>
          </li>
        )}
      </ul>

      {/* ── TAB: LAYOUT ── */}
      {activeTab === "layout" && (
        <div className="tab-pane-layout">
          <div className="row g-3">
            {/* Content Mode */}
            <div className="col-12">
              <label className="form-label fw-semibold">Content Mode</label>
              <div className="d-flex gap-2">
                {[
                  { value: "single", label: "Single (100vh snap)", icon: "bi-window" },
                  { value: "multi",  label: "Multi (grows with content)", icon: "bi-layout-split" },
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`btn btn-sm ${contentMode === value ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => {
                      // contentMode is stored inside content JSONB (not a Prisma column)
                      updateContent({ contentMode: value as "single" | "multi" });
                    }}
                  >
                    <i className={`bi ${icon} me-1`}></i>{label}
                  </button>
                ))}
              </div>
              <div className="form-text">Single: snaps with other sections. Multi: grows freely with content height.</div>
            </div>

            {/* Layout Engine */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Layout Engine</label>
              <select
                className="form-select"
                value={layout.type}
                onChange={(e) => updateLayout({ type: e.target.value as "grid" | "preset" | "absolute" })}
              >
                <option value="preset">Preset (named column layouts)</option>
                <option value="grid">Grid (row × column positioning)</option>
                <option value="absolute">Absolute (free positioning)</option>
              </select>
            </div>

            {/* Preset Selection */}
            {layout.type === "preset" && (
              <div className="col-md-6">
                <label className="form-label fw-semibold">Preset Layout</label>
                <select
                  className="form-select"
                  value={layout.preset || "2-col-split"}
                  onChange={(e) => updateLayout({ preset: e.target.value as typeof layout.preset })}
                >
                  {PRESET_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Grid Configuration */}
            {layout.type === "grid" && (
              <>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Grid Rows</label>
                  <input
                    type="number" min={1} max={10} className="form-control"
                    value={layout.gridRows ?? 1}
                    onChange={(e) => updateLayout({ gridRows: Number(e.target.value) })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Grid Columns</label>
                  <input
                    type="number" min={1} max={12} className="form-control"
                    value={layout.gridCols ?? 12}
                    onChange={(e) => updateLayout({ gridCols: Number(e.target.value) })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Gap (px)</label>
                  <input
                    type="number" min={0} max={80} className="form-control"
                    value={layout.gridGap ?? 20}
                    onChange={(e) => updateLayout({ gridGap: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: CONTENT ── */}
      {activeTab === "content" && (
        <div className="tab-pane-content">
          {/* Add Element Button */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted small">{elements.length} element{elements.length !== 1 ? "s" : ""}</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddPicker(!showAddPicker)}
            >
              <i className="bi bi-plus-lg me-1"></i>Add Element
            </button>
          </div>

          {/* Element Type Picker */}
          {showAddPicker && (
            <div className="card mb-3 border-primary">
              <div className="card-header bg-primary bg-opacity-10 py-2">
                <small className="fw-semibold text-primary">Choose element type:</small>
              </div>
              <div className="card-body py-2">
                <div className="row g-2">
                  {ELEMENT_TYPES.map(({ type, label, icon }) => (
                    <div key={type} className="col-6 col-md-4 col-lg-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm w-100"
                        onClick={() => addElement(type as FlexibleElement["type"])}
                      >
                        <i className={`bi ${icon} d-block fs-5 mb-1`}></i>
                        <small>{label}</small>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Element Cards */}
          {elements.length === 0 && (
            <div className="text-center text-muted py-4 border rounded">
              <i className="bi bi-layout-text-window d-block fs-2 mb-2 opacity-50"></i>
              <p className="mb-1">No elements yet</p>
              <small>Click "Add Element" to get started</small>
            </div>
          )}

          <div className="element-list">
            {elements.map((el, idx) => (
              <ElementCard
                key={el.id}
                element={el}
                idx={idx}
                expanded={expandedElements.has(el.id)}
                isDragging={dragIdx === idx}
                isDragOver={dragOverIdx === idx}
                onToggleExpand={() => toggleExpand(el.id)}
                onDelete={() => deleteElement(el.id)}
                onUpdate={(patch) => updateElement(el.id, patch)}
                onUpdateContent={(patch) => updateElementContent(el.id, patch)}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: STYLING ── */}
      {activeTab === "styling" && (
        <StylingTab section={section} onChange={update} />
      )}

      {/* ── TAB: ADVANCED ── */}
      {activeTab === "advanced" && (
        <AdvancedTab section={section} contentMode={contentMode} />
      )}

      {/* ── TAB: SCROLL STAGE ── */}
      {activeTab === "scroll-stage" && contentMode === "multi" && (
        <ScrollStageTab
          scrollStage={(content as any).scrollStage as ScrollStageConfig | undefined}
          onChange={(ss) => updateContent({ scrollStage: ss } as any)}
        />
      )}
    </div>
  );
}

// ─── Element Card ─────────────────────────────────────────────────────────────

interface ElementCardProps {
  element: FlexibleElement;
  idx: number;
  expanded: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<FlexibleElement>) => void;
  onUpdateContent: (patch: Record<string, unknown>) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function ElementCard({
  element, idx, expanded, isDragging, isDragOver,
  onToggleExpand, onDelete, onUpdate, onUpdateContent,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: ElementCardProps) {
  const typeInfo = ELEMENT_TYPES.find((t) => t.type === element.type);
  const label    = typeInfo?.label || element.type;
  const icon     = typeInfo?.icon  || "bi-box";

  const previewText = getElementPreview(element);

  return (
    <div
      className={`card mb-2 element-card ${isDragging ? "opacity-50" : ""} ${isDragOver ? "border-primary border-2" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{ cursor: "grab" }}
    >
      <div
        className="card-header d-flex align-items-center py-2"
        style={{ cursor: "pointer" }}
        onClick={onToggleExpand}
      >
        <i className="bi bi-grip-vertical text-muted me-2" style={{ cursor: "grab" }}></i>
        <i className={`bi ${icon} me-2 text-primary`}></i>
        <span className="fw-semibold small flex-grow-1">
          {label}
          {previewText && <span className="text-muted fw-normal ms-2">— {previewText}</span>}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger me-2"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <i className="bi bi-trash3"></i>
        </button>
        <i className={`bi ${expanded ? "bi-chevron-up" : "bi-chevron-down"} text-muted`}></i>
      </div>

      {expanded && (
        <div className="card-body">
          <ElementFields
            element={element}
            onUpdate={onUpdate}
            onUpdateContent={onUpdateContent}
          />
        </div>
      )}
    </div>
  );
}

function getElementPreview(element: FlexibleElement): string {
  const c = element.content;
  if (element.type === "text")    return (c.heading || c.subheading || c.text || "").toString().replace(/<[^>]+>/g, "").substring(0, 40);
  if (element.type === "image")   return ((c.imageSrc || "") as string).split("/").pop()?.substring(0, 30) || "";
  if (element.type === "button")  return ((c.buttonText || "") as string).substring(0, 30);
  if (element.type === "card")    return ((c.cardTitle || "") as string).substring(0, 30);
  if (element.type === "stats")   return `${c.statsNumber || ""} ${c.statsLabel || ""}`;
  if (element.type === "banner")  return ((c.bannerHeading || "") as string).substring(0, 30);
  if (element.type === "hero")    return ((c.heroHeading || "") as string).substring(0, 30);
  if (element.type === "divider") return (c.dividerType || "line") as string;
  if (element.type === "html")    return "Custom HTML";
  if (element.type === "video")   return ((c.videoSrc || "") as string).split("/").pop()?.substring(0, 30) || "";
  return "";
}

// ─── Element Fields ───────────────────────────────────────────────────────────

function ElementFields({ element, onUpdate, onUpdateContent }: {
  element: FlexibleElement;
  onUpdate: (patch: Partial<FlexibleElement>) => void;
  onUpdateContent: (patch: Record<string, unknown>) => void;
}) {
  const c = element.content;
  const s = element.styling || {};

  const updateStyling = (patch: Record<string, unknown>) => {
    onUpdate({ styling: { ...s, ...patch } });
  };

  const updateAnimation = (patch: Partial<FlexibleElement["animation"]>) => {
    onUpdate({ animation: { ...element.animation, ...patch } });
  };

  return (
    <div>
      {/* Type-specific fields */}
      {element.type === "text" && (
        <TextFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "image" && (
        <ImageFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "video" && (
        <VideoFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "button" && (
        <ButtonFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "banner" && (
        <BannerFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "card" && (
        <CardFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "stats" && (
        <StatsFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "divider" && (
        <DividerFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "html" && (
        <HtmlFields content={c} onUpdateContent={onUpdateContent} />
      )}
      {element.type === "hero" && (
        <HeroFields content={c} onUpdateContent={onUpdateContent} />
      )}

      <hr className="my-3" />

      {/* Shared: Animation */}
      <div className="row g-2 mb-2">
        <div className="col-md-4">
          <label className="form-label form-label-sm">Animation</label>
          <select
            className="form-select form-select-sm"
            value={element.animation?.type || "none"}
            onChange={(e) => updateAnimation({ type: e.target.value as FlexibleAnimationType })}
          >
            {ANIMATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label form-label-sm">Duration (ms)</label>
          <input type="number" min={100} max={3000} step={100} className="form-control form-control-sm"
            value={element.animation?.duration ?? 600}
            onChange={(e) => updateAnimation({ duration: Number(e.target.value) })}
          />
        </div>
        <div className="col-md-4">
          <label className="form-label form-label-sm">Delay (ms)</label>
          <input type="number" min={0} max={3000} step={100} className="form-control form-control-sm"
            value={element.animation?.delay ?? 0}
            onChange={(e) => updateAnimation({ delay: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Shared: Padding, Border Radius */}
      <div className="row g-2">
        <div className="col-md-6">
          <label className="form-label form-label-sm">Padding</label>
          <input type="text" placeholder="e.g. 20px or 16px 32px" className="form-control form-control-sm"
            value={s.padding || ""}
            onChange={(e) => updateStyling({ padding: e.target.value })}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label form-label-sm">Border Radius</label>
          <input type="text" placeholder="e.g. 12px" className="form-control form-control-sm"
            value={s.borderRadius || ""}
            onChange={(e) => updateStyling({ borderRadius: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Type-Specific Field Groups ────────────────────────────────────────────────

function TextFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-6">
        <label className="form-label form-label-sm">Heading</label>
        <input type="text" className="form-control form-control-sm" value={(c.heading as string) || ""}
          onChange={(e) => onUpdateContent({ heading: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Subheading</label>
        <input type="text" className="form-control form-control-sm" value={(c.subheading as string) || ""}
          onChange={(e) => onUpdateContent({ subheading: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Badge Text</label>
        <input type="text" className="form-control form-control-sm" value={(c.badge as string) || ""}
          onChange={(e) => onUpdateContent({ badge: e.target.value })} placeholder="Optional badge label" />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Text Align</label>
        <select className="form-select form-select-sm" value={(c.headingAlign as string) || ""}
          onChange={(e) => onUpdateContent({ headingAlign: e.target.value })}>
          <option value="">Default</option>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div className="col-12">
        <label className="form-label form-label-sm">Body Text (HTML)</label>
        <div style={{ border: "1px solid #ced4da", borderRadius: "4px", overflow: "hidden" }}>
          <MonacoEditor
            height="160px"
            language="html"
            theme="vs-dark"
            value={(c.text as string) || ""}
            onChange={(val) => onUpdateContent({ text: val || "" })}
            options={{ minimap: { enabled: false }, lineNumbers: "off", wordWrap: "on", scrollBeyondLastLine: false, fontSize: 12 }}
          />
        </div>
      </div>
    </div>
  );
}

function ImageFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-12">
        <label className="form-label form-label-sm">Image URL</label>
        <input type="text" className="form-control form-control-sm" value={(c.imageSrc as string) || ""}
          onChange={(e) => onUpdateContent({ imageSrc: e.target.value })} placeholder="https://... or /images/..." />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Alt Text</label>
        <input type="text" className="form-control form-control-sm" value={(c.imageAlt as string) || ""}
          onChange={(e) => onUpdateContent({ imageAlt: e.target.value })} />
      </div>
      <div className="col-md-3">
        <label className="form-label form-label-sm">Height (px)</label>
        <input type="number" min={80} max={1200} className="form-control form-control-sm"
          value={(c.imageHeight as number) || 300}
          onChange={(e) => onUpdateContent({ imageHeight: Number(e.target.value) })} />
      </div>
      <div className="col-md-3">
        <label className="form-label form-label-sm">Object Fit</label>
        <select className="form-select form-select-sm" value={(c.imageFit as string) || "cover"}
          onChange={(e) => onUpdateContent({ imageFit: e.target.value })}>
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>
      <div className="col-12">
        <label className="form-label form-label-sm">Caption</label>
        <input type="text" className="form-control form-control-sm" value={(c.imageCaption as string) || ""}
          onChange={(e) => onUpdateContent({ imageCaption: e.target.value })} placeholder="Optional caption" />
      </div>
    </div>
  );
}

function VideoFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-12">
        <label className="form-label form-label-sm">Video URL</label>
        <input type="text" className="form-control form-control-sm" value={(c.videoSrc as string) || ""}
          onChange={(e) => onUpdateContent({ videoSrc: e.target.value })} placeholder="https://... or /videos/..." />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Height (px)</label>
        <input type="number" min={80} max={800} className="form-control form-control-sm"
          value={(c.videoHeight as number) || 280}
          onChange={(e) => onUpdateContent({ videoHeight: Number(e.target.value) })} />
      </div>
      <div className="col-md-8 d-flex gap-3 align-items-end pb-1">
        {(["autoplay", "loop", "muted", "controls"] as const).map((prop) => (
          <div key={prop} className="form-check">
            <input type="checkbox" className="form-check-input" id={`video-${prop}`}
              checked={!!c[prop as keyof typeof c]}
              onChange={(e) => onUpdateContent({ [prop]: e.target.checked })} />
            <label className="form-check-label form-label-sm text-capitalize" htmlFor={`video-${prop}`}>{prop}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-6">
        <label className="form-label form-label-sm">Button Text</label>
        <input type="text" className="form-control form-control-sm" value={(c.buttonText as string) || ""}
          onChange={(e) => onUpdateContent({ buttonText: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Link (href)</label>
        <input type="text" className="form-control form-control-sm" value={(c.buttonHref as string) || "#"}
          onChange={(e) => onUpdateContent({ buttonHref: e.target.value })} />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Variant</label>
        <select className="form-select form-select-sm" value={(c.buttonVariant as string) || "filled"}
          onChange={(e) => onUpdateContent({ buttonVariant: e.target.value })}>
          <option value="filled">Filled (Primary)</option>
          <option value="outline">Outline</option>
          <option value="dark">Dark</option>
          <option value="ghost">Ghost (Link)</option>
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Size</label>
        <select className="form-select form-select-sm" value={(c.buttonSize as string) || "md"}
          onChange={(e) => onUpdateContent({ buttonSize: e.target.value })}>
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </div>
      <div className="col-md-4 d-flex align-items-end">
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="btn-full-width"
            checked={!!(c.buttonFullWidth as boolean)}
            onChange={(e) => onUpdateContent({ buttonFullWidth: e.target.checked })} />
          <label className="form-check-label form-label-sm" htmlFor="btn-full-width">Full Width</label>
        </div>
      </div>
    </div>
  );
}

function BannerFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-8">
        <label className="form-label form-label-sm">Heading</label>
        <input type="text" className="form-control form-control-sm" value={(c.bannerHeading as string) || ""}
          onChange={(e) => onUpdateContent({ bannerHeading: e.target.value })} />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Height (px)</label>
        <input type="number" min={100} max={800} className="form-control form-control-sm"
          value={(c.bannerHeight as number) || 280}
          onChange={(e) => onUpdateContent({ bannerHeight: Number(e.target.value) })} />
      </div>
      <div className="col-12">
        <label className="form-label form-label-sm">Subheading</label>
        <input type="text" className="form-control form-control-sm" value={(c.bannerSubheading as string) || ""}
          onChange={(e) => onUpdateContent({ bannerSubheading: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Background Image URL</label>
        <input type="text" className="form-control form-control-sm" value={(c.bannerSrc as string) || ""}
          onChange={(e) => onUpdateContent({ bannerSrc: e.target.value })} placeholder="https://..." />
      </div>
      <div className="col-md-3">
        <label className="form-label form-label-sm">Text Position</label>
        <select className="form-select form-select-sm" value={(c.bannerTextPosition as string) || "center"}
          onChange={(e) => onUpdateContent({ bannerTextPosition: e.target.value })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div className="col-md-3">
        <label className="form-label form-label-sm">Overlay Color</label>
        <input type="text" className="form-control form-control-sm" value={(c.bannerOverlay as string) || "rgba(0,0,0,0.38)"}
          onChange={(e) => onUpdateContent({ bannerOverlay: e.target.value })} placeholder="rgba(0,0,0,0.4)" />
      </div>
    </div>
  );
}

function CardFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-6">
        <label className="form-label form-label-sm">Card Title</label>
        <input type="text" className="form-control form-control-sm" value={(c.cardTitle as string) || ""}
          onChange={(e) => onUpdateContent({ cardTitle: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Badge</label>
        <input type="text" className="form-control form-control-sm" value={(c.cardBadge as string) || ""}
          onChange={(e) => onUpdateContent({ cardBadge: e.target.value })} placeholder="Optional badge text" />
      </div>
      <div className="col-12">
        <label className="form-label form-label-sm">Body Text</label>
        <textarea rows={3} className="form-control form-control-sm" value={(c.cardBody as string) || ""}
          onChange={(e) => onUpdateContent({ cardBody: e.target.value })} />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Background Type</label>
        <select className="form-select form-select-sm" value={(c.cardBgType as string) || "default"}
          onChange={(e) => onUpdateContent({ cardBgType: e.target.value })}>
          <option value="default">Default</option>
          <option value="solid">Solid Color</option>
          <option value="gradient">Gradient</option>
          <option value="image">Background Image</option>
          <option value="image-gradient">Image + Gradient</option>
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Visual Effect</label>
        <select className="form-select form-select-sm" value={(c.cardEffect as string) || "default"}
          onChange={(e) => onUpdateContent({ cardEffect: e.target.value })}>
          <option value="default">None</option>
          <option value="glass">Glass (Blur)</option>
          <option value="glow">Glow on Hover</option>
          <option value="rgb">RGB Glow</option>
          <option value="shimmer">Shimmer</option>
          <option value="pulse-glow">Pulse Glow</option>
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Image URL</label>
        <input type="text" className="form-control form-control-sm" value={(c.cardImage as string) || ""}
          onChange={(e) => onUpdateContent({ cardImage: e.target.value })} placeholder="https://..." />
      </div>
      {(c.cardBgType === "solid") && (
        <div className="col-md-6">
          <label className="form-label form-label-sm">Background Color</label>
          <input type="text" className="form-control form-control-sm" value={(c.cardBgColor as string) || ""}
            onChange={(e) => onUpdateContent({ cardBgColor: e.target.value })} placeholder="#1a1a2e" />
        </div>
      )}
      {(c.cardBgType === "gradient" || c.cardBgType === "image-gradient") && (
        <div className="col-12">
          <label className="form-label form-label-sm">Gradient CSS</label>
          <input type="text" className="form-control form-control-sm" value={(c.cardBgGradient as string) || ""}
            onChange={(e) => onUpdateContent({ cardBgGradient: e.target.value })} placeholder="linear-gradient(135deg, #0f0c29, #302b63)" />
        </div>
      )}
    </div>
  );
}

function StatsFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-4">
        <label className="form-label form-label-sm">Value</label>
        <input type="text" className="form-control form-control-sm" value={(c.statsNumber as string) || ""}
          onChange={(e) => onUpdateContent({ statsNumber: e.target.value })} placeholder="99.9%" />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Label</label>
        <input type="text" className="form-control form-control-sm" value={(c.statsLabel as string) || ""}
          onChange={(e) => onUpdateContent({ statsLabel: e.target.value })} placeholder="Uptime" />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Sub-label</label>
        <input type="text" className="form-control form-control-sm" value={(c.statsSubLabel as string) || ""}
          onChange={(e) => onUpdateContent({ statsSubLabel: e.target.value })} placeholder="Over 12 months" />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Bootstrap Icon</label>
        <input type="text" className="form-control form-control-sm" value={(c.statsIcon as string) || ""}
          onChange={(e) => onUpdateContent({ statsIcon: e.target.value })} placeholder="bi-server" />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Accent Color</label>
        <input type="text" className="form-control form-control-sm" value={(c.statsAccentColor as string) || ""}
          onChange={(e) => onUpdateContent({ statsAccentColor: e.target.value })} placeholder="#0969da" />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Trend</label>
        <select className="form-select form-select-sm" value={(c.statsTrend as string) || ""}
          onChange={(e) => onUpdateContent({ statsTrend: e.target.value })}>
          <option value="">None</option>
          <option value="up">Up ↑</option>
          <option value="down">Down ↓</option>
        </select>
      </div>
      <div className="col-12 d-flex gap-3">
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="stats-glass"
            checked={!!(c.statsGlass as boolean)}
            onChange={(e) => onUpdateContent({ statsGlass: e.target.checked })} />
          <label className="form-check-label form-label-sm" htmlFor="stats-glass">Glass Effect</label>
        </div>
      </div>
    </div>
  );
}

function DividerFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-4">
        <label className="form-label form-label-sm">Divider Type</label>
        <select className="form-select form-select-sm" value={(c.dividerType as string) || "line"}
          onChange={(e) => onUpdateContent({ dividerType: e.target.value })}>
          <option value="line">Line</option>
          <option value="dots">Dots</option>
          <option value="gradient">Gradient</option>
          <option value="wave">Wave</option>
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Color</label>
        <input type="text" className="form-control form-control-sm" value={(c.dividerColor as string) || "#dee2e6"}
          onChange={(e) => onUpdateContent({ dividerColor: e.target.value })} />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Thickness (px)</label>
        <input type="number" min={1} max={8} className="form-control form-control-sm"
          value={(c.dividerHeight as number) || 1}
          onChange={(e) => onUpdateContent({ dividerHeight: Number(e.target.value) })} />
      </div>
      <div className="col-12">
        <label className="form-label form-label-sm">Label (optional)</label>
        <input type="text" className="form-control form-control-sm" value={(c.dividerLabel as string) || ""}
          onChange={(e) => onUpdateContent({ dividerLabel: e.target.value })} placeholder="or — Section Label" />
      </div>
    </div>
  );
}

function HtmlFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="mb-2">
      <label className="form-label form-label-sm">HTML Content</label>
      <div style={{ border: "1px solid #ced4da", borderRadius: "4px", overflow: "hidden" }}>
        <MonacoEditor
          height="240px"
          language="html"
          theme="vs-dark"
          value={(c.html as string) || ""}
          onChange={(val) => onUpdateContent({ html: val || "" })}
          options={{ minimap: { enabled: false }, wordWrap: "on", scrollBeyondLastLine: false, fontSize: 12 }}
        />
      </div>
      <div className="form-text">⚠️ Admin-only CMS content. Never expose to untrusted users.</div>
    </div>
  );
}

function HeroFields({ content: c, onUpdateContent }: { content: FlexibleElement["content"]; onUpdateContent: (p: Record<string, unknown>) => void }) {
  return (
    <div className="row g-2 mb-2">
      <div className="col-md-8">
        <label className="form-label form-label-sm">Hero Heading</label>
        <input type="text" className="form-control form-control-sm" value={(c.heroHeading as string) || ""}
          onChange={(e) => onUpdateContent({ heroHeading: e.target.value })} />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Alignment</label>
        <select className="form-select form-select-sm" value={(c.heroAlign as string) || "center"}
          onChange={(e) => onUpdateContent({ heroAlign: e.target.value })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div className="col-12">
        <label className="form-label form-label-sm">Subheading</label>
        <input type="text" className="form-control form-control-sm" value={(c.heroSubheading as string) || ""}
          onChange={(e) => onUpdateContent({ heroSubheading: e.target.value })} />
      </div>
      <div className="col-12">
        <label className="form-label form-label-sm">Body Text (HTML)</label>
        <div style={{ border: "1px solid #ced4da", borderRadius: "4px", overflow: "hidden" }}>
          <MonacoEditor
            height="120px"
            language="html"
            theme="vs-dark"
            value={(c.heroText as string) || ""}
            onChange={(val) => onUpdateContent({ heroText: val || "" })}
            options={{ minimap: { enabled: false }, wordWrap: "on", scrollBeyondLastLine: false, fontSize: 12 }}
          />
        </div>
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Background Image URL</label>
        <input type="text" className="form-control form-control-sm" value={(c.backgroundImage as string) || ""}
          onChange={(e) => onUpdateContent({ backgroundImage: e.target.value })} placeholder="https://..." />
      </div>
      <div className="col-md-6">
        <label className="form-label form-label-sm">Background Video URL</label>
        <input type="text" className="form-control form-control-sm" value={(c.backgroundVideo as string) || ""}
          onChange={(e) => onUpdateContent({ backgroundVideo: e.target.value })} placeholder="https://..." />
      </div>
      <div className="col-md-4">
        <label className="form-label form-label-sm">Min Height (px)</label>
        <input type="number" min={100} max={1200} className="form-control form-control-sm"
          value={(c.heroMinHeight as number) || 400}
          onChange={(e) => onUpdateContent({ heroMinHeight: Number(e.target.value) })} />
      </div>
      <div className="col-md-8">
        <label className="form-label form-label-sm">Primary Button Text → URL</label>
        <div className="input-group input-group-sm">
          <input type="text" className="form-control" placeholder="Button text"
            value={((c.heroButton as { text?: string; href?: string }) || {}).text || ""}
            onChange={(e) => onUpdateContent({ heroButton: { ...((c.heroButton as object) || {}), text: e.target.value } })} />
          <input type="text" className="form-control" placeholder="https://..."
            value={((c.heroButton as { text?: string; href?: string }) || {}).href || ""}
            onChange={(e) => onUpdateContent({ heroButton: { ...((c.heroButton as object) || {}), href: e.target.value } })} />
        </div>
      </div>
    </div>
  );
}

// ─── Styling Tab ─────────────────────────────────────────────────────────────

const BG_PRESETS = [
  { value: "white",       label: "White",       color: "#ffffff" },
  { value: "gray",        label: "Light Gray",  color: "#f8f9fa" },
  { value: "blue",        label: "Navy Blue",   color: "#1e3a5f" },
  { value: "lightblue",   label: "Light Blue",  color: "#e8f4fd" },
  { value: "dark",        label: "Dark",        color: "#0d1117" },
  { value: "midnight",    label: "Midnight",    color: "#0f0c29" },
  { value: "teal",        label: "Teal",        color: "#0d4a4a" },
  { value: "purple",      label: "Purple",      color: "#2d1b69" },
  { value: "transparent", label: "Transparent", color: "transparent" },
];

// Theme-aware background tokens. These reference CSS custom properties that flip
// between light/dark via the [data-theme] attribute, so a section authored with
// one of these adapts automatically when the visitor toggles the site theme.
const THEME_BG_TOKENS = [
  { value: "var(--theme-bg)",       label: "Theme BG" },
  { value: "var(--theme-surface)",  label: "Theme Surface" },
  { value: "var(--theme-navy)",     label: "Theme Navy" },
  { value: "var(--theme-card-bg)",  label: "Theme Card" },
];

function StylingTab({ section, onChange }: { section: FlexibleSection; onChange: (patch: Partial<FlexibleSection>) => void }) {
  const bg = section.background || "white";

  return (
    <div className="row g-3">
      <div className="col-12">
        <label className="form-label fw-semibold">Background</label>
        <div className="d-flex flex-wrap gap-2 mb-2">
          {BG_PRESETS.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => onChange({ background: value as FlexibleSection["background"] })}
              className={`btn btn-sm ${bg === value ? "border-primary border-2" : "border"}`}
              style={{
                background: value === "midnight" ? "linear-gradient(135deg, #0f0c29, #302b63)" :
                            value === "teal"     ? "linear-gradient(135deg, #0d4a4a, #0a2a2a)" :
                            value === "purple"   ? "linear-gradient(135deg, #2d1b69, #11073f)" :
                            value === "transparent" ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0/16px 16px" :
                            color,
                width: "36px", height: "36px", borderRadius: "6px", padding: 0,
                outline: bg === value ? "2px solid #0d6efd" : "none",
              }}
            />
          ))}
        </div>
        <div className="input-group input-group-sm" style={{ maxWidth: "260px" }}>
          <span className="input-group-text">Custom</span>
          <input
            type="text"
            className="form-control"
            placeholder="#hex or CSS gradient"
            value={BG_PRESETS.some((p) => p.value === bg) || THEME_BG_TOKENS.some((t) => t.value === bg) ? "" : bg}
            onChange={(e) => onChange({ background: e.target.value as FlexibleSection["background"] })}
          />
        </div>
        {/* Theme-aware backgrounds — flip with the site light/dark toggle */}
        <div className="mt-2">
          <div className="text-muted small mb-1" style={{ fontSize: 11 }}>
            <i className="bi bi-circle-half me-1" />Theme-aware (flips with light/dark)
          </div>
          <div className="d-flex flex-wrap gap-2">
            {THEME_BG_TOKENS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                title={`${label} — ${value}`}
                onClick={() => onChange({ background: value as FlexibleSection["background"] })}
                className={`btn btn-sm ${bg === value ? "border-primary border-2" : "border"}`}
                style={{
                  background: value,
                  width: "36px", height: "36px", borderRadius: "6px", padding: 0,
                  outline: bg === value ? "2px solid #0d6efd" : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">Padding Top (px)</label>
        <div className="d-flex gap-2 align-items-center">
          <input
            type="range" min={0} max={200} className="form-range flex-grow-1"
            value={section.paddingTop ?? 100}
            onChange={(e) => onChange({ paddingTop: Number(e.target.value) })}
          />
          <input
            type="number" min={0} max={200} className="form-control form-control-sm" style={{ width: "70px" }}
            value={section.paddingTop ?? 100}
            onChange={(e) => onChange({ paddingTop: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">Padding Bottom (px)</label>
        <div className="d-flex gap-2 align-items-center">
          <input
            type="range" min={0} max={200} className="form-range flex-grow-1"
            value={section.paddingBottom ?? 80}
            onChange={(e) => onChange({ paddingBottom: Number(e.target.value) })}
          />
          <input
            type="number" min={0} max={200} className="form-control form-control-sm" style={{ width: "70px" }}
            value={section.paddingBottom ?? 80}
            onChange={(e) => onChange({ paddingBottom: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Scroll Stage Tab ─────────────────────────────────────────────────────────

function ScrollStageTab({
  scrollStage,
  onChange,
}: {
  scrollStage: ScrollStageConfig | undefined;
  onChange: (config: ScrollStageConfig) => void;
}) {
  const config: ScrollStageConfig = scrollStage ?? defaultScrollStage(2);

  const updateConfig = (patch: Partial<ScrollStageConfig>) => onChange({ ...config, ...patch });

  const updateZone = (idx: number, patch: Partial<ScrollStageZoneImageConfig>) => {
    const zones = config.zones.map((z, i) => (i === idx ? { ...z, ...patch } as ScrollStageZoneConfig : z));
    updateConfig({ zones });
  };

  const addZone = () => updateConfig({ zones: [...config.zones, defaultZone()] });

  const removeZone = (idx: number) => {
    if (config.zones.length <= 1) return;
    updateConfig({ zones: config.zones.filter((_, i) => i !== idx) });
  };

  return (
    <div className="row g-3">
      {/* Enable toggle */}
      <div className="col-12">
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="ss-enabled"
              checked={config.enabled}
              onChange={(e) => updateConfig({ enabled: e.target.checked })}
            />
            <label className="form-check-label fw-semibold" htmlFor="ss-enabled">
              Enable Scroll Stage
            </label>
          </div>
          {config.enabled && (
            <span className="badge bg-success">Active</span>
          )}
        </div>
        <div className="form-text">
          Adds a sticky visual companion track (images) alongside the multi-section content. Desktop only.
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Default side */}
          <div className="col-md-6">
            <label className="form-label fw-semibold">Default Track Side</label>
            <div className="d-flex gap-2">
              {(["left", "right"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  className={`btn btn-sm ${config.side === side ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => updateConfig({ side })}
                >
                  <i className={`bi bi-layout-sidebar${side === "right" ? "-reverse" : ""} me-1`}></i>
                  {side.charAt(0).toUpperCase() + side.slice(1)}
                </button>
              ))}
            </div>
            <div className="form-text">Individual zones can override this side setting.</div>
          </div>

          {/* Zone count info */}
          <div className="col-md-6 d-flex align-items-end">
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              {config.zones.length} zone{config.zones.length !== 1 ? "s" : ""} configured.
              Match this to your section&apos;s multi-zone count.
            </div>
          </div>

          {/* Zone configs */}
          {config.zones.map((zoneRaw, idx) => { const zone = zoneRaw as ScrollStageZoneImageConfig; return (
            <div key={idx} className="col-12">
              <div className="card border-secondary">
                <div className="card-header d-flex justify-content-between align-items-center py-2 bg-secondary bg-opacity-10">
                  <span className="fw-semibold small">
                    <i className="bi bi-layers me-1 text-primary"></i>Zone {idx + 1}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={config.zones.length <= 1}
                    onClick={() => removeZone(idx)}
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {/* Image URL */}
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Image URL</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="https://... or /images/..."
                        value={zone.src}
                        onChange={(e) => updateZone(idx, { src: e.target.value })}
                      />
                    </div>

                    {/* Alt text */}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Alt Text</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={zone.alt ?? ""}
                        onChange={(e) => updateZone(idx, { alt: e.target.value })}
                      />
                    </div>

                    {/* Object Fit */}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Object Fit</label>
                      <select
                        className="form-select form-select-sm"
                        value={zone.objectFit ?? "cover"}
                        onChange={(e) => updateZone(idx, { objectFit: e.target.value as "cover" | "contain" })}
                      >
                        <option value="cover">Cover</option>
                        <option value="contain">Contain</option>
                      </select>
                    </div>

                    {/* Parallax Factor */}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Parallax Factor <span className="text-muted">(1 = static, 1.3 = default)</span>
                      </label>
                      <input
                        type="number"
                        min={0} max={3} step={0.1}
                        className="form-control form-control-sm"
                        value={zone.parallaxFactor ?? 1.3}
                        onChange={(e) => updateZone(idx, { parallaxFactor: Number(e.target.value) })}
                      />
                    </div>

                    {/* Parallax Direction */}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Parallax Direction</label>
                      <div className="d-flex gap-2">
                        {(["up", "down"] as const).map((dir) => (
                          <button
                            key={dir}
                            type="button"
                            className={`btn btn-sm ${(zone.parallaxDirection ?? "up") === dir ? "btn-primary" : "btn-outline-secondary"}`}
                            onClick={() => updateZone(idx, { parallaxDirection: dir })}
                          >
                            <i className={`bi bi-arrow-${dir} me-1`}></i>{dir}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transition Duration */}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Transition (ms)</label>
                      <input
                        type="number"
                        min={0} max={2000} step={50}
                        className="form-control form-control-sm"
                        value={zone.transitionDuration ?? 400}
                        onChange={(e) => updateZone(idx, { transitionDuration: Number(e.target.value) })}
                      />
                    </div>

                    {/* Side Override */}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Side Override</label>
                      <select
                        className="form-select form-select-sm"
                        value={zone.sideOverride ?? ""}
                        onChange={(e) => updateZone(idx, { sideOverride: (e.target.value || null) as "left" | "right" | null })}
                      >
                        <option value="">Use default</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    {/* Preview thumbnail */}
                    {zone.src && (
                      <div className="col-12">
                        <div style={{ height: 80, overflow: "hidden", borderRadius: 6, border: "1px solid #dee2e6" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={zone.src}
                            alt={zone.alt ?? ""}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ); })}

          {/* Add zone */}
          <div className="col-12">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addZone}
            >
              <i className="bi bi-plus-lg me-1"></i>Add Zone
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Advanced Tab ─────────────────────────────────────────────────────────────

function AdvancedTab({ section, contentMode }: { section: FlexibleSection; contentMode: string }) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="row g-3">
      <div className="col-12">
        <label className="form-label fw-semibold">Section ID</label>
        <input type="text" className="form-control" value={section.id} disabled />
        <div className="form-text">Use as anchor: <code>#{section.id}</code></div>
      </div>
      <div className="col-12">
        <label className="form-label fw-semibold">Current Content Mode</label>
        <span className={`badge ms-2 ${contentMode === "single" ? "bg-primary" : "bg-success"}`}>{contentMode}</span>
        <div className="form-text">{contentMode === "single" ? "100vh snap section" : "Grows with content"}</div>
      </div>
      <div className="col-12">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setShowJson(!showJson)}
        >
          <i className="bi bi-braces me-1"></i>
          {showJson ? "Hide" : "Show"} Content JSON (dev)
        </button>
        {showJson && (
          <div className="mt-2" style={{ border: "1px solid #ced4da", borderRadius: "4px", overflow: "hidden" }}>
            <MonacoEditor
              height="300px"
              language="json"
              theme="vs-dark"
              value={JSON.stringify(section.content, null, 2)}
              options={{ readOnly: true, minimap: { enabled: false }, wordWrap: "on", scrollBeyondLastLine: false, fontSize: 11 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
