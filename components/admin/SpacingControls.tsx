"use client";

import { useState } from "react";

interface SpacingControlsProps {
  // Desktop padding (required)
  paddingTop?: number;
  paddingBottom?: number;
  onPaddingTopChange: (value: number) => void;
  onPaddingBottomChange: (value: number) => void;
  // Mobile padding (null = use smart default)
  paddingTopMobile?: number | null;
  paddingBottomMobile?: number | null;
  onPaddingTopMobileChange?: (value: number | null) => void;
  onPaddingBottomMobileChange?: (value: number | null) => void;
  // Range config
  min?: number;
  minTop?: number;
  minBottom?: number;
  max?: number;
  step?: number;
}

const MOBILE_DEFAULT_TOP = 100;   // clears 76px navbar + 24px breathing room
const MOBILE_DEFAULT_BOTTOM = 80;

export default function SpacingControls({
  paddingTop = 100,
  paddingBottom = 80,
  onPaddingTopChange,
  onPaddingBottomChange,
  paddingTopMobile,
  paddingBottomMobile,
  onPaddingTopMobileChange,
  onPaddingBottomMobileChange,
  min = 0,
  minTop,
  minBottom,
  max = 200,
  step = 5,
}: SpacingControlsProps) {
  const topMin = minTop !== undefined ? minTop : min;
  const bottomMin = minBottom !== undefined ? minBottom : min;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile">("desktop");

  const showMobileTabs = !!onPaddingTopMobileChange;
  const mobileTopOverride = paddingTopMobile != null;
  const mobileBottomOverride = paddingBottomMobile != null;

  return (
    <div className="card shadow-sm mb-3">
      <div
        className="card-header bg-light d-flex align-items-center justify-content-between"
        style={{ cursor: "pointer" }}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: "1.2rem" }}>📏</span>
          <h6 className="mb-0">Section Spacing</h6>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={(e) => { e.stopPropagation(); setShowAdvanced(!showAdvanced); }}
        >
          {showAdvanced ? "▼ Hide" : "▶ Show"}
        </button>
      </div>

      {showAdvanced && (
        <div className="card-body">
          {/* Device tabs */}
          {showMobileTabs && (
            <ul className="nav nav-tabs mb-3" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === "desktop" ? "active" : ""}`}
                  onClick={() => setActiveTab("desktop")}
                  type="button"
                >
                  <i className="bi bi-display me-1" />Desktop
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === "mobile" ? "active" : ""}`}
                  onClick={() => setActiveTab("mobile")}
                  type="button"
                >
                  <i className="bi bi-phone me-1" />Mobile
                  {(mobileTopOverride || mobileBottomOverride) && (
                    <span className="badge bg-primary ms-1" style={{ fontSize: "10px" }}>custom</span>
                  )}
                </button>
              </li>
            </ul>
          )}

          {/* ── Desktop tab ── */}
          {(!showMobileTabs || activeTab === "desktop") && (
            <>
              {!showMobileTabs && (
                <div className="alert alert-info small mb-3">
                  <strong>Spacing Control:</strong> Adjust the internal padding at the top and
                  bottom of this section.
                </div>
              )}

              <SliderRow
                label="Padding Top"
                hint="Space above content"
                value={paddingTop}
                min={topMin}
                max={max}
                step={step}
                onChange={onPaddingTopChange}
              />

              <SliderRow
                label="Padding Bottom"
                hint="Space below content"
                value={paddingBottom}
                min={bottomMin}
                max={max}
                step={step}
                onChange={onPaddingBottomChange}
              />

              <Presets
                topMin={topMin}
                onApply={(t, b) => { onPaddingTopChange(t); onPaddingBottomChange(b); }}
              />
            </>
          )}

          {/* ── Mobile tab ── */}
          {showMobileTabs && activeTab === "mobile" && (
            <>
              <div className="alert alert-secondary small mb-3">
                <i className="bi bi-phone me-1" />
                <strong>Mobile overrides</strong> — applies on screens ≤ 767px. Leave as{" "}
                <strong>Auto</strong> to use the smart default (top: {MOBILE_DEFAULT_TOP}px clears
                the fixed navbar; bottom: {MOBILE_DEFAULT_BOTTOM}px).
              </div>

              {/* Top mobile */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong className="small">Padding Top (mobile)</strong>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="mobileTopOverride"
                      checked={mobileTopOverride}
                      onChange={(e) =>
                        onPaddingTopMobileChange!(e.target.checked ? MOBILE_DEFAULT_TOP : null)
                      }
                    />
                    <label className="form-check-label small" htmlFor="mobileTopOverride">
                      {mobileTopOverride ? "Custom" : "Auto"}
                    </label>
                  </div>
                </div>
                {mobileTopOverride ? (
                  <SliderRow
                    label=""
                    value={paddingTopMobile!}
                    min={0}
                    max={max}
                    step={step}
                    onChange={(v) => onPaddingTopMobileChange!(v)}
                  />
                ) : (
                  <p className="text-muted small mb-0">
                    Auto — {MOBILE_DEFAULT_TOP}px (navbar-safe default)
                  </p>
                )}
              </div>

              {/* Bottom mobile */}
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong className="small">Padding Bottom (mobile)</strong>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="mobileBottomOverride"
                      checked={mobileBottomOverride}
                      onChange={(e) =>
                        onPaddingBottomMobileChange!(e.target.checked ? MOBILE_DEFAULT_BOTTOM : null)
                      }
                    />
                    <label className="form-check-label small" htmlFor="mobileBottomOverride">
                      {mobileBottomOverride ? "Custom" : "Auto"}
                    </label>
                  </div>
                </div>
                {mobileBottomOverride ? (
                  <SliderRow
                    label=""
                    value={paddingBottomMobile!}
                    min={0}
                    max={max}
                    step={step}
                    onChange={(v) => onPaddingBottomMobileChange!(v)}
                  />
                ) : (
                  <p className="text-muted small mb-0">
                    Auto — {MOBILE_DEFAULT_BOTTOM}px default
                  </p>
                )}
              </div>

              {(mobileTopOverride || mobileBottomOverride) && (
                <Presets
                  topMin={0}
                  onApply={(t, b) => {
                    if (mobileTopOverride) onPaddingTopMobileChange!(t);
                    if (mobileBottomOverride) onPaddingBottomMobileChange!(b);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, hint, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="form-label d-flex justify-content-between align-items-center">
          <span>
            <strong>{label}</strong>
            {hint && <span className="text-muted small ms-2">({hint})</span>}
          </span>
          <span
            className="badge rounded-pill text-primary border border-primary-subtle"
            style={{ minWidth: "60px" }}
          >
            {value}px
          </span>
        </label>
      )}
      <div className="d-flex align-items-center gap-3">
        <input
          type="range"
          className="form-range flex-grow-1"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
        />
        <input
          type="number"
          className="form-control"
          style={{ width: "80px" }}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
        />
      </div>
      {label && (
        <div className="d-flex justify-content-between small text-muted mt-1">
          <span>{min}px</span>
          <span>{Math.floor((min + max) / 2)}px</span>
          <span>{max}px</span>
        </div>
      )}
    </div>
  );
}

interface PresetsProps {
  topMin: number;
  onApply: (top: number, bottom: number) => void;
}

function Presets({ topMin, onApply }: PresetsProps) {
  return (
    <div className="mt-3 pt-3 border-top">
      <label className="form-label small"><strong>Quick Presets:</strong></label>
      <div className="btn-group btn-group-sm w-100" role="group">
        <button type="button" className="btn btn-outline-secondary"
          onClick={() => onApply(Math.max(topMin, 40), 20)}>
          Compact
        </button>
        <button type="button" className="btn btn-outline-secondary"
          onClick={() => onApply(Math.max(topMin, 100), 80)}>
          Normal
        </button>
        <button type="button" className="btn btn-outline-secondary"
          onClick={() => onApply(Math.max(topMin, 150), 120)}>
          Spacious
        </button>
      </div>
    </div>
  );
}
