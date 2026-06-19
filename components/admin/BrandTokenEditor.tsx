"use client";

import { useState, useEffect, useCallback } from "react";
import { useConfirm } from "@/components/admin/ConfirmProvider";
import type { BrandTokens, BrandPantone } from "@/lib/brand-tokens";

const DEFAULT_TOKENS: BrandTokens = {
  colors: {
    primary: "#2563eb",
    secondary: "#7c3aed",
    accent: "#f59e0b",
    neutral: "#64748b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    textMuted: "#64748b",
  },
  typography: {
    headingFont: "Inter",
    bodyFont: "Inter",
    baseSize: 16,
    scaleRatio: 1.25,
  },
  spacing: {
    sectionPadding: 80,
    containerMax: 1320,
  },
  borders: {
    radius: 8,
    radiusLarge: 16,
  },
};

// Popular Google Fonts for quick selection
const POPULAR_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
  "Raleway", "Nunito", "Playfair Display", "Merriweather", "Source Sans 3",
  "PT Sans", "Oswald", "Noto Sans", "Ubuntu", "Rubik", "Work Sans",
  "DM Sans", "Outfit", "Space Grotesk", "Plus Jakarta Sans", "Manrope",
  "Lexend", "Sora", "Be Vietnam Pro", "Figtree",
  // System fonts
  "Arial", "Georgia", "Times New Roman", "Helvetica",
];

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  pantone?: string;
  onPantoneChange?: (val: string) => void;
}

function ColorField({ label, value, onChange, pantone, onPantoneChange }: ColorFieldProps) {
  return (
    <div className="d-flex align-items-start gap-2 mb-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 36, padding: 2, cursor: "pointer", border: "1px solid #dee2e6", borderRadius: 6, flexShrink: 0, marginTop: 2 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </div>
        <div className="d-flex gap-1 align-items-center">
          <input
            type="text"
            className="form-control form-control-sm"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
            }}
            style={{ fontSize: 12, fontFamily: "monospace", width: 90, flexShrink: 0 }}
          />
          {onPantoneChange !== undefined && (
            <input
              type="text"
              className="form-control form-control-sm"
              value={pantone ?? ""}
              onChange={(e) => onPantoneChange(e.target.value)}
              placeholder="Pantone (e.g. 286 C)"
              style={{ fontSize: 11, width: 130 }}
              title="Optional Pantone reference code"
            />
          )}
        </div>
      </div>
      <div
        style={{ width: 40, height: 36, borderRadius: 6, background: value, border: "1px solid #dee2e6", flexShrink: 0 }}
      />
    </div>
  );
}

export default function BrandTokenEditor() {
  const askConfirm = useConfirm();
  const [tokens, setTokens] = useState<BrandTokens>(DEFAULT_TOKENS);
  const [pantone, setPantone] = useState<BrandPantone>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedColors, setDetectedColors] = useState<string[] | null>(null);
  const [showPantone, setShowPantone] = useState(false);

  useEffect(() => {
    fetch("/api/admin/brand-tokens")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) {
          setTokens(d.data);
          if (d.data.pantone) setPantone(d.data.pantone);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateColor = useCallback((key: keyof BrandTokens["colors"], val: string) => {
    setTokens((prev) => ({ ...prev, colors: { ...prev.colors, [key]: val } }));
  }, []);

  const updateTypography = useCallback((key: keyof BrandTokens["typography"], val: string | number) => {
    setTokens((prev) => ({ ...prev, typography: { ...prev.typography, [key]: val } }));
  }, []);

  const updateSpacing = useCallback((key: keyof BrandTokens["spacing"], val: number) => {
    setTokens((prev) => ({ ...prev, spacing: { ...prev.spacing, [key]: val } }));
  }, []);

  const updateBorders = useCallback((key: keyof BrandTokens["borders"], val: number) => {
    setTokens((prev) => ({ ...prev, borders: { ...prev.borders, [key]: val } }));
  }, []);

  const updatePantone = useCallback((key: keyof BrandPantone, val: string) => {
    setPantone(prev => ({ ...prev, [key]: val || undefined }));
  }, []);

  async function handleDetect() {
    setDetecting(true); setDetectedColors(null);
    try {
      const r = await fetch("/api/admin/brand-tokens/detect");
      const j = await r.json() as { colors?: string[] };
      setDetectedColors(j.colors ?? []);
    } catch { setDetectedColors([]); }
    finally { setDetecting(false); }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/brand-tokens", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tokens, pantone }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Brand tokens saved! Refresh the page to see changes across the site." });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (await askConfirm("Reset all brand tokens to defaults? This won't save until you click Save.")) {
      setTokens(DEFAULT_TOKENS);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm text-primary" />
        <span className="ms-2 text-muted">Loading brand tokens...</span>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div className={`alert alert-${message.type === "success" ? "success" : "danger"} alert-dismissible`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      {/* Colors */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-palette-fill text-primary" />
            Brand Colors
          </h6>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success bg-opacity-10 text-success small">
              <i className="bi bi-database-fill me-1" />Saved in database
            </span>
            <button
              type="button"
              className={`btn btn-outline-secondary btn-sm ${showPantone ? "active" : ""}`}
              onClick={() => setShowPantone(p => !p)}
              title="Toggle Pantone reference fields"
            >
              <i className="bi bi-p-circle me-1" />Pantone
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleDetect}
              disabled={detecting}
              title="Scan your pages and sections to suggest brand colours"
            >
              {detecting
                ? <><span className="spinner-border spinner-border-sm me-1" />Scanning…</>
                : <><i className="bi bi-eyedropper me-1" />Auto-Detect</>}
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Auto-detect results */}
          {detectedColors !== null && (
            <div className="mb-3 p-3 bg-light rounded">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-semibold">Colors found in your pages ({detectedColors.length})</span>
                <button type="button" className="btn-close btn-sm" onClick={() => setDetectedColors(null)} />
              </div>
              {detectedColors.length === 0
                ? <p className="small text-muted mb-0">No hex colors found in section content.</p>
                : <div className="d-flex flex-wrap gap-2">
                    {detectedColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        className="btn btn-sm d-flex align-items-center gap-1 border"
                        style={{ background: "#fff", fontSize: 11 }}
                        title={`Click to copy ${c}`}
                        onClick={() => { navigator.clipboard.writeText(c); }}
                      >
                        <span style={{ width: 20, height: 20, borderRadius: 4, background: c, display: "inline-block", border: "1px solid #dee2e6" }} />
                        <code>{c}</code>
                      </button>
                    ))}
                  </div>
              }
              <p className="small text-muted mt-2 mb-0">Click a colour to copy its hex code, then paste it into any field below.</p>
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-6">
              <ColorField label="Primary" value={tokens.colors.primary} onChange={(v) => updateColor("primary", v)} pantone={pantone.primary} onPantoneChange={showPantone ? (v) => updatePantone("primary", v) : undefined} />
              <ColorField label="Secondary" value={tokens.colors.secondary} onChange={(v) => updateColor("secondary", v)} pantone={pantone.secondary} onPantoneChange={showPantone ? (v) => updatePantone("secondary", v) : undefined} />
              <ColorField label="Accent" value={tokens.colors.accent} onChange={(v) => updateColor("accent", v)} pantone={pantone.accent} onPantoneChange={showPantone ? (v) => updatePantone("accent", v) : undefined} />
              <ColorField label="Neutral" value={tokens.colors.neutral} onChange={(v) => updateColor("neutral", v)} pantone={pantone.neutral} onPantoneChange={showPantone ? (v) => updatePantone("neutral", v) : undefined} />
            </div>
            <div className="col-md-6">
              <ColorField label="Background" value={tokens.colors.background} onChange={(v) => updateColor("background", v)} pantone={pantone.background} onPantoneChange={showPantone ? (v) => updatePantone("background", v) : undefined} />
              <ColorField label="Surface" value={tokens.colors.surface} onChange={(v) => updateColor("surface", v)} pantone={pantone.surface} onPantoneChange={showPantone ? (v) => updatePantone("surface", v) : undefined} />
              <ColorField label="Text" value={tokens.colors.text} onChange={(v) => updateColor("text", v)} pantone={pantone.text} onPantoneChange={showPantone ? (v) => updatePantone("text", v) : undefined} />
              <ColorField label="Text Muted" value={tokens.colors.textMuted} onChange={(v) => updateColor("textMuted", v)} pantone={pantone.textMuted} onPantoneChange={showPantone ? (v) => updatePantone("textMuted", v) : undefined} />
            </div>
          </div>
          {showPantone && (
            <div className="mt-2 small text-muted">
              <i className="bi bi-info-circle me-1" />
              Pantone codes are stored as reference labels only — they do not affect CSS output. Look up codes at{" "}
              <a href="https://www.pantone.com/color-finder" target="_blank" rel="noreferrer">pantone.com/color-finder</a>.
            </div>
          )}
          {/* Preview strip */}
          <div className="mt-3 d-flex rounded overflow-hidden" style={{ height: 32 }}>
            {Object.entries(tokens.colors).map(([key, color]) => (
              <div key={key} style={{ flex: 1, background: color }} title={`${key}: ${color}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white py-2">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-fonts text-secondary" />
            Typography
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Heading Font</label>
              <select
                className="form-select form-select-sm"
                value={tokens.typography.headingFont}
                onChange={(e) => updateTypography("headingFont", e.target.value)}
                style={{ fontFamily: `'${tokens.typography.headingFont}', sans-serif` }}
              >
                {POPULAR_FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>{f}</option>
                ))}
              </select>
              <div className="mt-2 p-2 border rounded" style={{ fontFamily: `'${tokens.typography.headingFont}', sans-serif`, fontSize: 20, fontWeight: 700 }}>
                The quick brown fox
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Body Font</label>
              <select
                className="form-select form-select-sm"
                value={tokens.typography.bodyFont}
                onChange={(e) => updateTypography("bodyFont", e.target.value)}
                style={{ fontFamily: `'${tokens.typography.bodyFont}', sans-serif` }}
              >
                {POPULAR_FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>{f}</option>
                ))}
              </select>
              <div className="mt-2 p-2 border rounded" style={{ fontFamily: `'${tokens.typography.bodyFont}', sans-serif`, fontSize: 14 }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </div>
            </div>
          </div>
          <div className="row g-3 mt-1">
            <div className="col-md-4">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Base Size (px)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={tokens.typography.baseSize}
                onChange={(e) => updateTypography("baseSize", parseInt(e.target.value) || 16)}
                min={10} max={32}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Scale Ratio</label>
              <select
                className="form-select form-select-sm"
                value={tokens.typography.scaleRatio}
                onChange={(e) => updateTypography("scaleRatio", parseFloat(e.target.value))}
              >
                <option value="1.125">1.125 — Minor Second</option>
                <option value="1.2">1.200 — Minor Third</option>
                <option value="1.25">1.250 — Major Third</option>
                <option value="1.333">1.333 — Perfect Fourth</option>
                <option value="1.414">1.414 — Augmented Fourth</option>
                <option value="1.5">1.500 — Perfect Fifth</option>
                <option value="1.618">1.618 — Golden Ratio</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Spacing & Borders */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white py-2">
          <h6 className="mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-rulers text-info" />
            Spacing & Borders
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Section Padding</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="range"
                  className="form-range flex-1"
                  value={tokens.spacing.sectionPadding}
                  onChange={(e) => updateSpacing("sectionPadding", parseInt(e.target.value))}
                  min={0} max={200}
                />
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{tokens.spacing.sectionPadding}px</span>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Container Max Width</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={tokens.spacing.containerMax}
                onChange={(e) => updateSpacing("containerMax", parseInt(e.target.value) || 1320)}
                min={800} max={2400} step={20}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Border Radius</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="range"
                  className="form-range flex-1"
                  value={tokens.borders.radius}
                  onChange={(e) => updateBorders("radius", parseInt(e.target.value))}
                  min={0} max={50}
                />
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{tokens.borders.radius}px</span>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Large Radius</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="range"
                  className="form-range flex-1"
                  value={tokens.borders.radiusLarge}
                  onChange={(e) => updateBorders("radiusLarge", parseInt(e.target.value))}
                  min={0} max={100}
                />
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 40 }}>{tokens.borders.radiusLarge}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" />
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-check-lg me-1" />
              Save Brand Tokens
            </>
          )}
        </button>
        <button className="btn btn-outline-secondary" onClick={handleReset}>
          <i className="bi bi-arrow-counterclockwise me-1" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
