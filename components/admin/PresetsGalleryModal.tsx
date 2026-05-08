"use client";

import { useEffect } from "react";
import { SECTION_PRESETS, type SectionPreset } from "@/lib/designer-presets";

interface PresetsGalleryModalProps {
  onSelect: (presetId: string | null) => void;
  onClose: () => void;
}

function PresetThumbnail({ id }: { id: string }) {
  const s = {
    box: (flex?: string, bg?: string, extra?: React.CSSProperties): React.CSSProperties => ({
      background: bg ?? "#dee2e6",
      borderRadius: 3,
      flex: flex ?? "1",
      minHeight: 8,
      ...extra,
    }),
    row: (gap?: number, extra?: React.CSSProperties): React.CSSProperties => ({
      display: "flex",
      gap: gap ?? 4,
      ...extra,
    }),
  };

  const col = (flex?: string, bg?: string) => s.box(flex, bg);

  switch (id) {
    case "about-grid":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
          <div style={s.row(4, { flex: 1 })}>
            <div style={col("2", "#adb5bd")} /> {/* tall image */}
            <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={col("1", "#dee2e6")} />
              <div style={col("1", "#dee2e6")} />
              <div style={s.row(4, { flex: 1 })}>
                <div style={col("1", "#ced4da")} />
                <div style={col("1", "#ced4da")} />
              </div>
              <div style={s.row(4, { flex: 1 })}>
                <div style={col("1", "#ced4da")} />
                <div style={col("1", "#ced4da")} />
              </div>
            </div>
          </div>
        </div>
      );
    case "services-grid":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
          <div style={{ ...s.box("1", "#dee2e6", { minHeight: 16 }) }} />
          <div style={s.row(4, { flex: 1 })}>
            <div style={col("1", "#ced4da")} />
            <div style={col("1", "#ced4da")} />
            <div style={col("1", "#ced4da")} />
          </div>
        </div>
      );
    case "how-it-works":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
          <div style={{ ...s.box("1", "#dee2e6", { minHeight: 16 }) }} />
          <div style={s.row(4, { flex: 1 })}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ flex: 1, position: "relative" }}>
                <div style={{ ...col("1", "#ced4da"), height: "100%" }} />
                {i < 3 && (
                  <div style={{ position: "absolute", right: -6, top: "30%", width: 8, height: 2, background: "#adb5bd", zIndex: 1 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    case "contact-split":
      return (
        <div style={s.row(4, { height: "100%" })}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            {[24, 8, 8, 8, 8, 8].map((h, i) => (
              <div key={i} style={s.box("1", "#dee2e6", { minHeight: h, flex: "none" })} />
            ))}
          </div>
          <div style={{ flex: 1, background: "#e9ecef", borderRadius: 3, display: "flex", flexDirection: "column", gap: 4, padding: 4 }}>
            {[1, 1, 1, 2].map((h, i) => (
              <div key={i} style={s.box(String(h), "#dee2e6", {})} />
            ))}
          </div>
        </div>
      );
    case "stats-banner":
      return (
        <div style={s.row(2, { height: "100%", alignItems: "stretch" })}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...col("1", "#ced4da"), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 16, height: 3, background: "#adb5bd", borderRadius: 2 }} />
            </div>
          ))}
        </div>
      );
    case "features-alternating":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
          <div style={s.box("1", "#dee2e6", { minHeight: 16 })} />
          <div style={s.row(4, { flex: 1 })}>
            <div style={col("1", "#dee2e6")} />
            <div style={col("1", "#adb5bd")} />
          </div>
          <div style={s.row(4, { flex: 1 })}>
            <div style={col("1", "#adb5bd")} />
            <div style={col("1", "#dee2e6")} />
          </div>
        </div>
      );
    case "team-grid":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
          <div style={s.box("1", "#dee2e6", { minHeight: 16 })} />
          <div style={s.row(4, { flex: 1 })}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={s.box("2", "#adb5bd", {})} />
                <div style={s.box("1", "#dee2e6", {})} />
                <div style={s.box("1", "#e9ecef", {})} />
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return <div style={{ flex: 1, background: "#dee2e6", borderRadius: 3 }} />;
  }
}

export default function PresetsGalleryModal({ onSelect, onClose }: PresetsGalleryModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1130 }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        style={{ maxWidth: 960 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-0">
                <i className="bi bi-grid-3x3-gap-fill me-2"></i>
                Choose a Layout
              </h5>
              <p className="text-muted mb-0 small mt-1">Pick a preset to start with, or begin from a blank canvas.</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}
            >
              {/* 7 preset cards */}
              {SECTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="btn p-0 text-start border rounded"
                  style={{ overflow: "hidden", transition: "box-shadow 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #0d6efd")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
                  onClick={() => onSelect(preset.id)}
                >
                  {/* Wireframe thumbnail */}
                  <div
                    style={{
                      background: "#f8f9fa",
                      borderBottom: "1px solid #dee2e6",
                      padding: 12,
                      height: 120,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <PresetThumbnail id={preset.id} />
                  </div>
                  {/* Label */}
                  <div style={{ padding: "10px 12px" }}>
                    <div className="fw-semibold small">{preset.name}</div>
                    <div className="text-muted" style={{ fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}

              {/* Start Blank card */}
              <button
                type="button"
                className="btn p-0 text-start border rounded border-dashed"
                style={{ overflow: "hidden", transition: "box-shadow 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #6c757d")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
                onClick={() => onSelect(null)}
              >
                {/* Empty thumbnail */}
                <div
                  style={{
                    background: "#f8f9fa",
                    borderBottom: "1px solid #dee2e6",
                    padding: 12,
                    height: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 6,
                    color: "#adb5bd",
                  }}
                >
                  <i className="bi bi-plus-circle" style={{ fontSize: 28 }} />
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div className="fw-semibold small">Start Blank</div>
                  <div className="text-muted" style={{ fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>
                    Empty canvas — build from scratch.
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
