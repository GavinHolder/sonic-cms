"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";
import {
  DEFAULT_CONCRETE_SETTINGS,
  type ConcreteSettings,
  type MixRatio,
} from "@/lib/concrete-calculator";

// ─── Outer shell — renders AdminLayout (which provides ToastProvider) ─────────

export default function ConcreteSettingsPage() {
  return (
    <AdminLayout
      title="Concrete Calculator Settings"
      subtitle="Configure pricing, mix ratios and display options"
    >
      <ConcreteSettingsInner />
    </AdminLayout>
  );
}

// ─── Inner component — safe to call useToast() here ───────────────────────────

function ConcreteSettingsInner() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ConcreteSettings>(DEFAULT_CONCRETE_SETTINGS);

  // ── Load feature config on mount ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/features/concrete-calculator");
        if (res.ok) {
          const j = await res.json();
          if (j.success && j.data?.config && Object.keys(j.data.config).length > 0) {
            setSettings({ ...DEFAULT_CONCRETE_SETTINGS, ...j.data.config });
          }
        }
      } catch {
        // Keep defaults on network error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/features/concrete-calculator", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: settings }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success("Concrete calculator settings saved.");
      } else {
        toast.error(j.error || "Failed to save settings.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Mix ratio helpers ───────────────────────────────────────────────────────
  const updateMixRatio = (strength: string, field: keyof MixRatio, value: number) => {
    setSettings((prev) => ({
      ...prev,
      mixRatios: {
        ...prev.mixRatios,
        [strength]: { ...prev.mixRatios[strength], [field]: value },
      },
    }));
  };

  const deleteMixRatio = (strength: string) => {
    setSettings((prev) => {
      const { [strength]: _removed, ...rest } = prev.mixRatios;
      return { ...prev, mixRatios: rest };
    });
  };

  const addMixRatio = () => {
    const label = `${Object.keys(settings.mixRatios).length * 5 + 10}MPa`;
    const unique = label in settings.mixRatios ? `${label}-new` : label;
    setSettings((prev) => ({
      ...prev,
      mixRatios: {
        ...prev.mixRatios,
        [unique]: { cement: 1, sand: 2, stone: 4 },
      },
    }));
  };

  const renameStrength = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey) return;
    setSettings((prev) => {
      const entries = Object.entries(prev.mixRatios);
      const idx = entries.findIndex(([k]) => k === oldKey);
      if (idx === -1) return prev;
      entries[idx] = [newKey.trim(), entries[idx][1]];
      return { ...prev, mixRatios: Object.fromEntries(entries) };
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="row g-4">
        {/* ── General Settings ─────────────────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header border-bottom bg-transparent py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-sliders me-2 text-primary" />
                General Settings
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Concrete Density (kg/m³)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.concreteDensity}
                    min={1000}
                    max={3000}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, concreteDensity: parseFloat(e.target.value) || 2400 }))
                    }
                  />
                  <div className="form-text">Standard reinforced concrete: 2400 kg/m³</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Currency Symbol</label>
                  <input
                    type="text"
                    className="form-control"
                    value={settings.currencySymbol}
                    maxLength={5}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, currencySymbol: e.target.value }))
                    }
                  />
                  <div className="form-text">Shown before cost estimates (e.g. R, $, €)</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Cement Bag Size (kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.cementBagSize}
                    min={1}
                    max={100}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, cementBagSize: parseFloat(e.target.value) || 50 }))
                    }
                  />
                  <div className="form-text">Standard bags are 50 kg</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Cement Bag Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.cementBagPrice}
                    min={0}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, cementBagPrice: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <div className="form-text">Price per bag including VAT</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Delivery Fee ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.deliveryFee}
                    min={0}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <div className="form-text">Flat delivery rate added to estimate</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Wastage Allowance (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.wastagePercent}
                    min={0}
                    max={50}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, wastagePercent: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <div className="form-text">Extra % added to volume for spillage and overages</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mix Ratio Table ───────────────────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header border-bottom bg-transparent py-3 d-flex align-items-center justify-content-between">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-table me-2 text-primary" />
                Concrete Mix Ratios
              </h6>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={addMixRatio}
              >
                <i className="bi bi-plus me-1" />
                Add Strength
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4" style={{ width: "120px" }}>Strength</th>
                      <th style={{ width: "90px" }}>Cement</th>
                      <th style={{ width: "90px" }}>Sand</th>
                      <th style={{ width: "90px" }}>Stone</th>
                      <th style={{ width: "50px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(settings.mixRatios).map(([strength, ratio]) => (
                      <tr key={strength}>
                        <td className="ps-4">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            defaultValue={strength}
                            onBlur={(e) => renameStrength(strength, e.target.value)}
                            style={{ width: "90px" }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={ratio.cement}
                            min={0}
                            step={0.25}
                            style={{ width: "70px" }}
                            onChange={(e) => updateMixRatio(strength, "cement", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={ratio.sand}
                            min={0}
                            step={0.25}
                            style={{ width: "70px" }}
                            onChange={(e) => updateMixRatio(strength, "sand", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={ratio.stone}
                            min={0}
                            step={0.25}
                            style={{ width: "70px" }}
                            onChange={(e) => updateMixRatio(strength, "stone", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteMixRatio(strength)}
                            title="Delete this mix ratio"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {Object.keys(settings.mixRatios).length === 0 && (
                <div className="text-center py-4 text-muted small">
                  No mix ratios defined. Click &quot;Add Strength&quot; to add one.
                </div>
              )}
            </div>
            <div className="card-footer bg-transparent border-top py-2">
              <div className="form-text mb-0">
                Mix ratios represent cement : sand : stone by volume parts.
                These determine cement bag calculations.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save button (bottom) ─────────────────────────────────────────────── */}
      <div className="mt-4 d-flex justify-content-end">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
          ) : (
            <><i className="bi bi-floppy me-1" />Save Settings</>
          )}
        </button>
      </div>
    </>
  );
}
