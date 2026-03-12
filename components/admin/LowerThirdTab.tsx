"use client";

import type { LowerThirdConfig } from "@/types/section";
import { PRESET_LABELS, type LowerThirdPreset } from "@/lib/lower-third-presets";
import LowerThirdRenderer from "@/components/sections/LowerThirdRenderer";

interface LowerThirdTabProps {
  config: LowerThirdConfig;
  onChange: (config: LowerThirdConfig) => void;
}

export default function LowerThirdTab({ config, onChange }: LowerThirdTabProps) {
  const set = (patch: Partial<LowerThirdConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="p-3">
      <div className="form-check form-switch mb-3">
        <input
          type="checkbox"
          className="form-check-input"
          role="switch"
          id="ltEnabled"
          checked={config.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        <label className="form-check-label fw-semibold" htmlFor="ltEnabled">
          Enable Lower Third Graphic
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Mode selector */}
          <div className="btn-group mb-3 w-100" role="group">
            <button
              type="button"
              className={`btn btn-sm ${config.mode === "preset" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => set({ mode: "preset" })}
            >
              Preset Shape
            </button>
            <button
              type="button"
              className={`btn btn-sm ${config.mode === "image" ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => set({ mode: "image" })}
            >
              Upload Image
            </button>
          </div>

          {config.mode === "preset" && (
            <>
              {/* Preset grid */}
              <div className="row g-2 mb-3">
                {(Object.keys(PRESET_LABELS) as LowerThirdPreset[]).map((p) => (
                  <div key={p} className="col-3">
                    <button
                      type="button"
                      className={`btn btn-sm w-100 py-2 ${config.preset === p ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => set({ preset: p })}
                      style={{ fontSize: "0.75rem" }}
                    >
                      {PRESET_LABELS[p]}
                    </button>
                  </div>
                ))}
              </div>
              {/* Color + Opacity */}
              <div className="row g-3 mb-2">
                <div className="col-6">
                  <label className="form-label small">Fill Color</label>
                  <input
                    type="color"
                    className="form-control form-control-color w-100"
                    value={config.presetColor}
                    onChange={(e) => set({ presetColor: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small">Opacity ({Math.round(config.presetOpacity * 100)}%)</label>
                  <input
                    type="range"
                    className="form-range"
                    min={0} max={1} step={0.05}
                    value={config.presetOpacity}
                    onChange={(e) => set({ presetOpacity: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </>
          )}

          {config.mode === "image" && (
            <div className="mb-3">
              <label className="form-label small">Image URL (transparent PNG/SVG)</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={config.imageSrc}
                onChange={(e) => set({ imageSrc: e.target.value })}
                placeholder="/images/uploads/lower-third.png"
              />
            </div>
          )}

          {/* Height */}
          <div className="mb-3">
            <label className="form-label small">Height: {config.height}px</label>
            <input
              type="range"
              className="form-range"
              min={40} max={400} step={10}
              value={config.height}
              onChange={(e) => set({ height: parseInt(e.target.value) })}
            />
          </div>

          {/* Flip controls */}
          <div className="row g-3 mb-3">
            <div className="col-6">
              <div className="form-check form-switch">
                <input
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  id="ltFlipH"
                  checked={config.flipHorizontal}
                  onChange={(e) => set({ flipHorizontal: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor="ltFlipH">Flip Horizontal</label>
              </div>
            </div>
            <div className="col-6">
              <div className="form-check form-switch">
                <input
                  type="checkbox"
                  className="form-check-input"
                  role="switch"
                  id="ltFlipV"
                  checked={config.flipVertical}
                  onChange={(e) => set({ flipVertical: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor="ltFlipV">Flip Vertical</label>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="border rounded overflow-hidden" style={{ height: "120px", background: "#333", position: "relative" }}>
            <LowerThirdRenderer config={config} />
          </div>
        </>
      )}
    </div>
  );
}
