"use client";

import { useState, useRef } from "react";
import type { MotionElement, MotionEntranceDirection, MotionIdleType } from "@/types/section";

const EASING_OPTIONS = [
  "easeOutCubic", "easeOutQuart", "easeOutBack",
  "easeInOutSine", "easeInOutCubic", "linear",
];

export function createDefaultMotionElement(): MotionElement {
  return {
    id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    src: "",
    alt: "",
    top: "20%",
    left: undefined,
    right: "5%",
    bottom: undefined,
    width: "200px",
    zIndex: 5,
    layer: "behind",
    parallax: { enabled: false, speed: 0.3 },
    entrance: {
      enabled: true,
      direction: "right",
      distance: 200,
      duration: 800,
      delay: 0,
      easing: "easeOutCubic",
    },
    exit: { enabled: false, direction: "right", distance: 200, duration: 600 },
    idle: { enabled: false, type: "float", speed: 1, amplitude: 15 },
  };
}

// ─── Direction Picker ────────────────────────────────────────────────────────
// Visual 4-arrow compass instead of a dropdown
interface DirectionPickerProps {
  value: MotionEntranceDirection;
  onChange: (dir: MotionEntranceDirection) => void;
  label?: string;
}

function DirectionPicker({ value, onChange, label }: DirectionPickerProps) {
  const dirs: { d: MotionEntranceDirection; label: string; arrow: string; style: React.CSSProperties }[] = [
    { d: "top",    label: "Top",    arrow: "↑", style: { top: 0,    left: "50%", transform: "translateX(-50%)" } },
    { d: "bottom", label: "Bottom", arrow: "↓", style: { bottom: 0, left: "50%", transform: "translateX(-50%)" } },
    { d: "left",   label: "Left",   arrow: "←", style: { left: 0,   top:  "50%", transform: "translateY(-50%)" } },
    { d: "right",  label: "Right",  arrow: "→", style: { right: 0,  top:  "50%", transform: "translateY(-50%)" } },
  ];

  return (
    <div>
      {label && <label className="form-label small mb-1">{label}</label>}
      <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto" }}>
        {/* Centre target */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 28, height: 28, borderRadius: "50%",
          background: "#e2e8f0", border: "2px solid #cbd5e1",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6rem", color: "#64748b", fontWeight: 600,
        }}>
          HERE
        </div>
        {dirs.map(({ d, label: dl, arrow, style }) => (
          <button
            key={d}
            type="button"
            title={`From ${dl}`}
            onClick={() => onChange(d)}
            style={{
              position: "absolute",
              ...style,
              width: 28, height: 28,
              border: `2px solid ${value === d ? "#6366f1" : "#dee2e6"}`,
              background: value === d ? "#6366f1" : "#fff",
              color: value === d ? "#fff" : "#64748b",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
              transition: "all 0.15s",
            }}
          >
            {arrow}
          </button>
        ))}
      </div>
      <div className="text-center mt-1" style={{ fontSize: "0.7rem", color: "#64748b" }}>
        From: <strong>{value}</strong>
      </div>
    </div>
  );
}

// ─── Position Canvas ─────────────────────────────────────────────────────────
// Click anywhere on a section thumbnail to set top/right position
interface PositionCanvasProps {
  top?: string;
  right?: string;
  left?: string;
  bottom?: string;
  onChange: (patch: { top?: string; right?: string; left?: string; bottom?: string }) => void;
}

function PositionCanvas({ top, right, left, bottom, onChange }: PositionCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Parse existing left/top values for slider display (strip %, default to 50)
  const xVal = left ? Math.round(parseFloat(left)) : 50;
  const yVal = top ? Math.round(parseFloat(top)) : 50;

  const handleXChange = (val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    onChange({ left: `${clamped}%`, top, right: undefined, bottom });
  };

  const handleYChange = (val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    onChange({ left, top: `${clamped}%`, right: undefined, bottom: undefined });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Position from nearest edge: if right half, use right; if bottom half, use bottom
    const useRight = xPct > 50;
    const useBottom = yPct > 50;

    onChange({
      top: useBottom ? undefined : `${yPct}%`,
      bottom: useBottom ? `${100 - yPct}%` : undefined,
      left: useRight ? undefined : `${xPct}%`,
      right: useRight ? `${100 - xPct}%` : undefined,
    });
  };

  // Calculate dot position for display
  const dotLeft = left ? left : right ? `calc(100% - ${right})` : "50%";
  const dotTop = top ? top : bottom ? `calc(100% - ${bottom})` : "50%";

  const positionText = [
    top ? `top: ${top}` : null,
    bottom ? `bottom: ${bottom}` : null,
    left ? `left: ${left}` : null,
    right ? `right: ${right}` : null,
  ].filter(Boolean).join(", ") || "not set";

  return (
    <div>
      {/* X/Y precision sliders */}
      <div className="mb-2">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="small fw-semibold" style={{ minWidth: 70 }}>X Position</span>
          <input
            type="range"
            className="form-range flex-grow-1"
            min={0} max={100} step={1}
            value={xVal}
            onChange={(e) => handleXChange(parseInt(e.target.value))}
          />
          <input
            type="number"
            className="form-control form-control-sm"
            style={{ width: 60 }}
            min={0} max={100}
            value={xVal}
            onChange={(e) => handleXChange(parseInt(e.target.value) || 0)}
          />
          <span className="small text-muted">%</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="small fw-semibold" style={{ minWidth: 70 }}>Y Position</span>
          <input
            type="range"
            className="form-range flex-grow-1"
            min={0} max={100} step={1}
            value={yVal}
            onChange={(e) => handleYChange(parseInt(e.target.value))}
          />
          <input
            type="number"
            className="form-control form-control-sm"
            style={{ width: 60 }}
            min={0} max={100}
            value={yVal}
            onChange={(e) => handleYChange(parseInt(e.target.value) || 0)}
          />
          <span className="small text-muted">%</span>
        </div>
      </div>
      <label className="form-label small mb-1">Click to Position</label>
      <div
        ref={canvasRef}
        onClick={handleClick}
        style={{
          position: "relative",
          width: "100%",
          height: 80,
          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
          borderRadius: 8,
          cursor: "crosshair",
          border: "2px dashed #475569",
          overflow: "hidden",
          userSelect: "none",
        }}
        title="Click to set element position"
      >
        {/* Grid lines */}
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: "1px dashed rgba(255,255,255,0.1)" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1px dashed rgba(255,255,255,0.1)" }} />
        {/* Label */}
        <div style={{ position: "absolute", top: 4, left: 6, fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", pointerEvents: "none" }}>
          SECTION
        </div>
        {/* Dot */}
        <div style={{
          position: "absolute",
          left: dotLeft,
          top: dotTop,
          transform: "translate(-50%, -50%)",
          width: 14, height: 14,
          borderRadius: "50%",
          background: "#6366f1",
          border: "2px solid #fff",
          boxShadow: "0 0 0 3px rgba(99,102,241,0.4)",
          pointerEvents: "none",
        }} />
      </div>
      <div className="text-muted mt-1" style={{ fontSize: "0.7rem" }}>{positionText}</div>
      {/* Fine-tune inputs */}
      <div className="row g-1 mt-1">
        {(["top", "right", "bottom", "left"] as const).map((side) => {
          const val = side === "top" ? top : side === "right" ? right : side === "bottom" ? bottom : left;
          return (
            <div key={side} className="col-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text py-0" style={{ fontSize: "0.65rem", minWidth: 42 }}>{side}</span>
                <input
                  type="text"
                  className="form-control py-0"
                  style={{ fontSize: "0.7rem" }}
                  value={val ?? ""}
                  placeholder="e.g. 20%"
                  onChange={(e) => onChange({
                    top: side === "top" ? (e.target.value || undefined) : top,
                    right: side === "right" ? (e.target.value || undefined) : right,
                    bottom: side === "bottom" ? (e.target.value || undefined) : bottom,
                    left: side === "left" ? (e.target.value || undefined) : left,
                  })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Idle Type Picker ────────────────────────────────────────────────────────
// Animated CSS preview buttons for each idle type
interface IdleTypePickerProps {
  value: MotionIdleType;
  onChange: (type: MotionIdleType) => void;
}

const IDLE_ANIMATIONS: Record<MotionIdleType, { label: string; keyframes: string; animStyle: React.CSSProperties }> = {
  float: {
    label: "Float",
    keyframes: `@keyframes idle-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`,
    animStyle: { animation: "idle-float 2s ease-in-out infinite" },
  },
  bob: {
    label: "Bob",
    keyframes: `@keyframes idle-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`,
    animStyle: { animation: "idle-bob 1s ease-in-out infinite" },
  },
  rotate: {
    label: "Rotate",
    keyframes: `@keyframes idle-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
    animStyle: { animation: "idle-rotate 2s linear infinite" },
  },
  pulse: {
    label: "Pulse",
    keyframes: `@keyframes idle-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.25); } }`,
    animStyle: { animation: "idle-pulse 1.5s ease-in-out infinite" },
  },
  sway: {
    label: "Sway",
    keyframes: `@keyframes idle-sway { 0%,100% { transform: rotate(0deg); } 33% { transform: rotate(8deg); } 66% { transform: rotate(-8deg); } }`,
    animStyle: { animation: "idle-sway 2s ease-in-out infinite" },
  },
};

function IdleTypePicker({ value, onChange }: IdleTypePickerProps) {
  return (
    <div>
      <label className="form-label small mb-1">Animation Type</label>
      {/* Inject keyframe styles */}
      <style>{Object.values(IDLE_ANIMATIONS).map((a) => a.keyframes).join("\n")}</style>
      <div className="d-flex gap-2 flex-wrap">
        {(Object.entries(IDLE_ANIMATIONS) as [MotionIdleType, typeof IDLE_ANIMATIONS[MotionIdleType]][]).map(([type, anim]) => {
          const isActive = value === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "8px 12px",
                border: `2px solid ${isActive ? "#6366f1" : "#dee2e6"}`,
                background: isActive ? "#eef2ff" : "#fff",
                borderRadius: 8,
                cursor: "pointer",
                minWidth: 60,
                transition: "all 0.15s",
              }}
            >
              {/* Animated icon */}
              <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: isActive ? "#6366f1" : "#94a3b8",
                    borderRadius: type === "rotate" ? "50%" : 4,
                    ...(anim.animStyle),
                  }}
                />
              </div>
              <span style={{ fontSize: "0.65rem", fontWeight: isActive ? 600 : 400, color: isActive ? "#4f46e5" : "#64748b" }}>
                {anim.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

interface MotionElementEditorProps {
  element: MotionElement;
  onChange: (el: MotionElement) => void;
  onDelete: () => void;
}

export default function MotionElementEditor({ element, onChange, onDelete }: MotionElementEditorProps) {
  const [openPanel, setOpenPanel] = useState<string | null>("position");
  const set = (patch: Partial<MotionElement>) => onChange({ ...element, ...patch });
  const togglePanel = (panel: string) => setOpenPanel((prev) => (prev === panel ? null : panel));

  return (
    <div className="border rounded mb-3">
      {/* Header */}
      <div className="d-flex align-items-center gap-2 p-2 bg-light border-bottom">
        <span className="fw-semibold small text-truncate flex-grow-1">
          {element.src ? element.src.split("/").pop() : "New Motion Element"}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger py-0 px-1"
          onClick={onDelete}
          title="Remove element"
        >
          <i className="bi bi-trash" />
        </button>
      </div>

      <div className="accordion accordion-flush">

        {/* ── Position & Image ── */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className={`accordion-button py-2 small ${openPanel !== "position" ? "collapsed" : ""}`}
              type="button"
              onClick={() => togglePanel("position")}
            >
              Image & Position
            </button>
          </h2>
          {openPanel === "position" && (
            <div className="accordion-body py-2">
              <div className="mb-2">
                <label className="form-label small mb-1">Image URL</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={element.src}
                  onChange={(e) => set({ src: e.target.value })}
                  placeholder="/images/uploads/element.png"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small mb-1">Alt Text</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={element.alt}
                  onChange={(e) => set({ alt: e.target.value })}
                  placeholder="Decorative element"
                />
              </div>
              {/* Visual position canvas */}
              <PositionCanvas
                top={element.top}
                right={element.right}
                bottom={element.bottom}
                left={element.left}
                onChange={(patch) => set(patch)}
              />
              <div className="row g-2 mt-2">
                <div className="col-12">
                  <label className="form-label small mb-1">Width</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={element.width}
                    onChange={(e) => set({ width: e.target.value })}
                    placeholder="200px or 25%"
                  />
                </div>
              </div>

              {/* Opacity */}
              <div className="mb-3">
                <label className="form-label fw-semibold small d-flex justify-content-between">
                  <span>Opacity</span>
                  <span className="text-muted">{element.opacity ?? 100}%</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min={0}
                  max={100}
                  step={5}
                  value={element.opacity ?? 100}
                  onChange={(e) => onChange({ ...element, opacity: Number(e.target.value) })}
                />
                <div className="d-flex justify-content-between text-muted" style={{ fontSize: "0.7rem" }}>
                  <span>Invisible</span>
                  <span>Fully Opaque</span>
                </div>
              </div>

              {/* Layer */}
              <div className="mb-3 mt-3">
                <label className="form-label fw-semibold small">Layer (Z-depth)</label>
                <div className="btn-group w-100" role="group">
                  {(["behind", "above-lower-third", "above-content"] as const).map((opt) => {
                    const labels: Record<string, string> = {
                      "behind": "Behind All",
                      "above-lower-third": "Above Shape",
                      "above-content": "Above Content",
                    };
                    const icons: Record<string, string> = {
                      "behind": "bi-layers",
                      "above-lower-third": "bi-layout-bottom",
                      "above-content": "bi-front",
                    };
                    const active = (element.layer ?? "behind") === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => onChange({ ...element, layer: opt })}
                        title={labels[opt]}
                      >
                        <i className={`bi ${icons[opt]} me-1`} />
                        {labels[opt]}
                      </button>
                    );
                  })}
                </div>
                <div className="form-text">
                  {(element.layer ?? "behind") === "behind" && "Behind lower-third shape and section content"}
                  {element.layer === "above-lower-third" && "Above the lower-third shape, behind section content"}
                  {element.layer === "above-content" && "In front of all section content and shapes"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Parallax ── */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className={`accordion-button py-2 small ${openPanel !== "parallax" ? "collapsed" : ""}`}
              type="button"
              onClick={() => togglePanel("parallax")}
            >
              <span className="me-2">Parallax Depth</span>
              {element.parallax.enabled && <span className="badge bg-success">ON</span>}
            </button>
          </h2>
          {openPanel === "parallax" && (
            <div className="accordion-body py-2">
              <div className="form-check form-switch mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  id={`par-en-${element.id}`}
                  checked={element.parallax.enabled}
                  onChange={(e) => set({ parallax: { ...element.parallax, enabled: e.target.checked } })}
                />
                <label className="form-check-label small" htmlFor={`par-en-${element.id}`}>Enable</label>
              </div>
              {element.parallax.enabled && (
                <div>
                  {/* Visual depth indicator */}
                  <div style={{
                    position: "relative", height: 36, background: "linear-gradient(to right, #dbeafe, #f8fafc, #fce7f3)",
                    borderRadius: 6, border: "1px solid #e2e8f0", marginBottom: 6, overflow: "hidden"
                  }}>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: "1px dashed #cbd5e1" }} />
                    <div style={{
                      position: "absolute", top: "50%", transform: "translateY(-50%)",
                      left: `${((element.parallax.speed + 1) / 2) * 100}%`,
                      marginLeft: -8, width: 16, height: 16, borderRadius: "50%",
                      background: element.parallax.speed < 0 ? "#ec4899" : "#3b82f6",
                      border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      transition: "left 0.1s",
                    }} />
                    <div style={{ position: "absolute", left: 4, bottom: 2, fontSize: "0.6rem", color: "#3b82f6" }}>← slower</div>
                    <div style={{ position: "absolute", right: 4, bottom: 2, fontSize: "0.6rem", color: "#ec4899" }}>counter →</div>
                  </div>
                  <label className="form-label small">Speed: {element.parallax.speed.toFixed(2)}</label>
                  <input
                    type="range"
                    className="form-range"
                    min={-1} max={1} step={0.05}
                    value={element.parallax.speed}
                    onChange={(e) => set({ parallax: { ...element.parallax, speed: parseFloat(e.target.value) } })}
                  />
                  <div className="d-flex justify-content-between" style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: -4 }}>
                    <span>-1.0 counter-scroll</span>
                    <span>0 none</span>
                    <span>+1.0 slow</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Entrance ── */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className={`accordion-button py-2 small ${openPanel !== "entrance" ? "collapsed" : ""}`}
              type="button"
              onClick={() => togglePanel("entrance")}
            >
              <span className="me-2">Scroll Entrance</span>
              {element.entrance.enabled && <span className="badge bg-success">ON</span>}
            </button>
          </h2>
          {openPanel === "entrance" && (
            <div className="accordion-body py-2">
              <div className="form-check form-switch mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  id={`ent-en-${element.id}`}
                  checked={element.entrance.enabled}
                  onChange={(e) => set({ entrance: { ...element.entrance, enabled: e.target.checked } })}
                />
                <label className="form-check-label small" htmlFor={`ent-en-${element.id}`}>Enable entrance animation</label>
              </div>
              {element.entrance.enabled && (
                <>
                  <div className="mb-3">
                    <DirectionPicker
                      value={element.entrance.direction}
                      onChange={(d) => set({ entrance: { ...element.entrance, direction: d } })}
                      label="Enters from direction"
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small mb-1">Distance (px)</label>
                      <input type="number" className="form-control form-control-sm" value={element.entrance.distance}
                        onChange={(e) => set({ entrance: { ...element.entrance, distance: parseInt(e.target.value) || 200 } })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small mb-1">Duration (ms)</label>
                      <input type="number" className="form-control form-control-sm" value={element.entrance.duration}
                        onChange={(e) => set({ entrance: { ...element.entrance, duration: parseInt(e.target.value) || 800 } })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small mb-1">Delay (ms)</label>
                      <input type="number" className="form-control form-control-sm" value={element.entrance.delay}
                        onChange={(e) => set({ entrance: { ...element.entrance, delay: parseInt(e.target.value) || 0 } })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small mb-1">Easing</label>
                      <select className="form-select form-select-sm" value={element.entrance.easing}
                        onChange={(e) => set({ entrance: { ...element.entrance, easing: e.target.value } })}>
                        {EASING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Exit ── */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className={`accordion-button py-2 small ${openPanel !== "exit" ? "collapsed" : ""}`}
              type="button"
              onClick={() => togglePanel("exit")}
            >
              <span className="me-2">Scroll Exit</span>
              {element.exit.enabled && <span className="badge bg-success">ON</span>}
            </button>
          </h2>
          {openPanel === "exit" && (
            <div className="accordion-body py-2">
              <div className="form-check form-switch mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  id={`exit-en-${element.id}`}
                  checked={element.exit.enabled}
                  onChange={(e) => set({ exit: { ...element.exit, enabled: e.target.checked } })}
                />
                <label className="form-check-label small" htmlFor={`exit-en-${element.id}`}>Enable exit animation</label>
              </div>
              {element.exit.enabled && (
                <>
                  <div className="mb-3">
                    <DirectionPicker
                      value={element.exit.direction}
                      onChange={(d) => set({ exit: { ...element.exit, direction: d } })}
                      label="Exits toward direction"
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small mb-1">Distance (px)</label>
                      <input type="number" className="form-control form-control-sm" value={element.exit.distance}
                        onChange={(e) => set({ exit: { ...element.exit, distance: parseInt(e.target.value) || 200 } })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small mb-1">Duration (ms)</label>
                      <input type="number" className="form-control form-control-sm" value={element.exit.duration}
                        onChange={(e) => set({ exit: { ...element.exit, duration: parseInt(e.target.value) || 600 } })} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Idle ── */}
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button
              className={`accordion-button py-2 small ${openPanel !== "idle" ? "collapsed" : ""}`}
              type="button"
              onClick={() => togglePanel("idle")}
            >
              <span className="me-2">Idle Loop</span>
              {element.idle.enabled && <span className="badge bg-success">ON</span>}
            </button>
          </h2>
          {openPanel === "idle" && (
            <div className="accordion-body py-2">
              <div className="form-check form-switch mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  id={`idle-en-${element.id}`}
                  checked={element.idle.enabled}
                  onChange={(e) => set({ idle: { ...element.idle, enabled: e.target.checked } })}
                />
                <label className="form-check-label small" htmlFor={`idle-en-${element.id}`}>Loop while section is visible</label>
              </div>
              {element.idle.enabled && (
                <>
                  <div className="mb-3">
                    <IdleTypePicker
                      value={element.idle.type}
                      onChange={(type) => set({ idle: { ...element.idle, type } })}
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small mb-1">Amplitude</label>
                      <input type="number" className="form-control form-control-sm" value={element.idle.amplitude}
                        onChange={(e) => set({ idle: { ...element.idle, amplitude: parseInt(e.target.value) || 15 } })} />
                      <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>px for float/bob/sway, deg for rotate, % for pulse</div>
                    </div>
                    <div className="col-6">
                      <label className="form-label small mb-1">Speed: {element.idle.speed.toFixed(1)}x</label>
                      <input type="range" className="form-range" min={0.5} max={3} step={0.1}
                        value={element.idle.speed}
                        onChange={(e) => set({ idle: { ...element.idle, speed: parseFloat(e.target.value) } })} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
