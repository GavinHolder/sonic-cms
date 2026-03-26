"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";

const PolygonEditorModal = dynamic(
  () => import("@/components/admin/coverage/PolygonEditorModal"),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number; }

interface CoverageRegion {
  id: string; mapId: string;
  name: string; polygon: LatLng[]; color: string; opacity: number;
  strokeColor: string; strokeWidth: number; description: string | null;
  isActive: boolean; order: number;
}

interface CoverageLabel {
  id: string; mapId: string;
  text: string; lat: number; lng: number;
  fontSize: number; fontFamily: string; color: string;
  bgColor: string | null; bold: boolean;
}

interface CoverageMap {
  id: string; name: string; slug: string; description: string | null;
  centerLat: number; centerLng: number; defaultZoom: number; isActive: boolean;
  regions: CoverageRegion[]; labels: CoverageLabel[];
}

// ─── Outer page ───────────────────────────────────────────────────────────────

export default function CoverageMapsPage() {
  return (
    <AdminLayout title="Coverage Maps" subtitle="Manage delivery region maps and polygons">
      <CoverageMapsInner />
    </AdminLayout>
  );
}

// ─── Inner (can call useToast) ─────────────────────────────────────────────────

function CoverageMapsInner() {
  const toast = useToast();
  const [maps, setMaps] = useState<CoverageMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"regions" | "labels">("regions");

  // Map form
  const [showMapForm, setShowMapForm] = useState(false);
  const [editingMap, setEditingMap] = useState<Partial<CoverageMap> | null>(null);
  const [mapSaving, setMapSaving] = useState(false);

  // Region form
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Partial<CoverageRegion> | null>(null);
  const [regionSaving, setRegionSaving] = useState(false);

  // Polygon editor
  const [polyEditorOpen, setPolyEditorOpen] = useState(false);
  const [polyEditorRegion, setPolyEditorRegion] = useState<CoverageRegion | null>(null);

  // Label form
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Partial<CoverageLabel> | null>(null);
  const [labelSaving, setLabelSaving] = useState(false);

  const selectedMap = maps.find((m) => m.id === selectedMapId) ?? null;

  // ── Load maps ──────────────────────────────────────────────────────────────
  const loadMaps = async () => {
    try {
      const res = await fetch("/api/coverage-maps");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setMaps(data);
      if (data.length > 0 && !selectedMapId) setSelectedMapId(data[0].id);
    } catch {
      toast.error("Failed to load coverage maps");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMaps(); }, []);

  // ── Map CRUD ───────────────────────────────────────────────────────────────
  const openNewMap = () => {
    setEditingMap({ name: "", slug: "", description: "", centerLat: -34.4187, centerLng: 19.2345, defaultZoom: 10, isActive: true });
    setShowMapForm(true);
  };

  const openEditMap = (map: CoverageMap) => {
    setEditingMap({ ...map });
    setShowMapForm(true);
  };

  const saveMap = async () => {
    if (!editingMap?.name || !editingMap?.slug) {
      toast.error("Name and slug are required"); return;
    }
    setMapSaving(true);
    try {
      const isNew = !editingMap.id;
      const res = await fetch(isNew ? "/api/coverage-maps" : `/api/coverage-maps/${editingMap.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMap),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(isNew ? "Map created" : "Map updated");
      setShowMapForm(false);
      await loadMaps();
      if (isNew) {
        const created = await res.json().catch(() => null);
        if (created?.id) setSelectedMapId(created.id);
      }
    } catch {
      toast.error("Failed to save map");
    } finally {
      setMapSaving(false);
    }
  };

  const deleteMap = async (id: string) => {
    if (!confirm("Delete this coverage map and all its regions/labels?")) return;
    try {
      const res = await fetch(`/api/coverage-maps/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Map deleted");
      setSelectedMapId(null);
      await loadMaps();
    } catch {
      toast.error("Failed to delete map");
    }
  };

  // ── Region CRUD ────────────────────────────────────────────────────────────
  const openNewRegion = () => {
    setEditingRegion({
      mapId: selectedMapId ?? "",
      name: "", polygon: [], color: "#22c55e", opacity: 0.4,
      strokeColor: "#16a34a", strokeWidth: 2, description: "", isActive: true, order: 0,
    });
    setShowRegionForm(true);
  };

  const openEditRegion = (region: CoverageRegion) => {
    setEditingRegion({ ...region });
    setShowRegionForm(true);
  };

  const saveRegion = async () => {
    if (!editingRegion?.name) { toast.error("Region name is required"); return; }
    setRegionSaving(true);
    try {
      const isNew = !editingRegion.id;
      const res = await fetch(
        isNew
          ? `/api/coverage-maps/${selectedMapId}/regions`
          : `/api/coverage-maps/${selectedMapId}/regions/${editingRegion.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingRegion),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(isNew ? "Region added" : "Region saved");
      setShowRegionForm(false);
      await loadMaps();
    } catch {
      toast.error("Failed to save region");
    } finally {
      setRegionSaving(false);
    }
  };

  const deleteRegion = async (regionId: string) => {
    if (!confirm("Delete this region?")) return;
    try {
      await fetch(`/api/coverage-maps/${selectedMapId}/regions/${regionId}`, { method: "DELETE" });
      toast.success("Region deleted");
      await loadMaps();
    } catch {
      toast.error("Failed to delete region");
    }
  };

  const openPolygonEditor = (region: CoverageRegion) => {
    setPolyEditorRegion(region);
    setPolyEditorOpen(true);
  };

  const savePolygon = async (pts: LatLng[]) => {
    if (!polyEditorRegion) return;
    try {
      await fetch(`/api/coverage-maps/${selectedMapId}/regions/${polyEditorRegion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polygon: pts }),
      });
      toast.success("Polygon saved");
      setPolyEditorOpen(false);
      await loadMaps();
    } catch {
      toast.error("Failed to save polygon");
    }
  };

  // ── Label CRUD ─────────────────────────────────────────────────────────────
  const openNewLabel = () => {
    setEditingLabel({
      mapId: selectedMapId ?? "",
      text: "Label", lat: selectedMap?.centerLat ?? -34.4187, lng: selectedMap?.centerLng ?? 19.2345,
      fontSize: 14, fontFamily: "Arial", color: "#ffffff", bgColor: null, bold: false,
    });
    setShowLabelForm(true);
  };

  const openEditLabel = (label: CoverageLabel) => {
    setEditingLabel({ ...label });
    setShowLabelForm(true);
  };

  const saveLabel = async () => {
    if (!editingLabel?.text) { toast.error("Label text is required"); return; }
    setLabelSaving(true);
    try {
      const isNew = !editingLabel.id;
      const res = await fetch(
        isNew
          ? `/api/coverage-maps/${selectedMapId}/labels`
          : `/api/coverage-maps/${selectedMapId}/labels/${editingLabel.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingLabel),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(isNew ? "Label added" : "Label saved");
      setShowLabelForm(false);
      await loadMaps();
    } catch {
      toast.error("Failed to save label");
    } finally {
      setLabelSaving(false);
    }
  };

  const deleteLabel = async (labelId: string) => {
    if (!confirm("Delete this label?")) return;
    try {
      await fetch(`/api/coverage-maps/${selectedMapId}/labels/${labelId}`, { method: "DELETE" });
      toast.success("Label deleted");
      await loadMaps();
    } catch {
      toast.error("Failed to delete label");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-success" />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, alignItems: "start" }}>
      {/* ── Map list sidebar ─────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
        <div className="card-body p-0">
          <div
            className="d-flex align-items-center justify-content-between"
            style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}
          >
            <span className="fw-bold" style={{ fontSize: 14, color: "#1f2937" }}>Coverage Maps</span>
            <button className="btn btn-sm btn-success" onClick={openNewMap} title="Add new map">
              <i className="bi bi-plus" />
            </button>
          </div>

          {maps.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              No maps yet.<br />Click + to create one.
            </div>
          ) : (
            maps.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelectedMapId(m.id); setActiveTab("regions"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "12px 16px", border: "none", textAlign: "left",
                  background: selectedMapId === m.id ? "#f0fdf4" : "transparent",
                  borderLeft: selectedMapId === m.id ? "3px solid #4a7c59" : "3px solid transparent",
                  cursor: "pointer",
                }}
              >
                <i className={`bi bi-map${m.isActive ? "-fill" : ""}`} style={{ color: m.isActive ? "#4a7c59" : "#9ca3af", fontSize: 16 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.regions.length} regions</div>
                </div>
                {!m.isActive && (
                  <span style={{ fontSize: 10, background: "#f3f4f6", color: "#9ca3af", borderRadius: 10, padding: "2px 6px" }}>off</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Map detail panel ────────────────────────────────────────────────── */}
      {!selectedMap ? (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-map" style={{ fontSize: 40, display: "block", marginBottom: 12 }} />
            Select a map or create a new one
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: "hidden" }}>
          {/* Map header */}
          <div
            style={{
              background: "#1f2937", padding: "16px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <h6 className="fw-bold text-white mb-0">{selectedMap.name}</h6>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>/{selectedMap.slug}</div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-light" onClick={() => openEditMap(selectedMap)}>
                <i className="bi bi-pencil me-1" />Edit
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => deleteMap(selectedMap.id)}>
                <i className="bi bi-trash" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: "1px solid #e5e7eb", padding: "0 20px", background: "#f9fafb" }}>
            {(["regions", "labels"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 18px", border: "none", background: "transparent",
                  borderBottom: activeTab === tab ? "2px solid #4a7c59" : "2px solid transparent",
                  color: activeTab === tab ? "#4a7c59" : "#6b7280",
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: 14, cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                <i className={`bi ${tab === "regions" ? "bi-pentagon" : "bi-fonts"} me-2`} style={{ fontSize: 12 }} />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span
                  style={{
                    marginLeft: 6, background: activeTab === tab ? "#dcfce7" : "#f3f4f6",
                    color: activeTab === tab ? "#16a34a" : "#9ca3af",
                    fontSize: 11, fontWeight: 600, borderRadius: 10, padding: "1px 7px",
                  }}
                >
                  {tab === "regions" ? selectedMap.regions.length : selectedMap.labels.length}
                </span>
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {/* ── Regions tab ────────────────────────────────────────────── */}
            {activeTab === "regions" && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    Delivery regions displayed as colored polygons on the map
                  </p>
                  <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={openNewRegion}>
                    <i className="bi bi-plus" />Add Region
                  </button>
                </div>

                {selectedMap.regions.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center", padding: "40px 20px", border: "2px dashed #e5e7eb",
                      borderRadius: 10, color: "#9ca3af",
                    }}
                  >
                    <i className="bi bi-pentagon" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
                    No regions yet — click <strong>Add Region</strong> to get started
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedMap.regions.map((region) => (
                      <div
                        key={region.id}
                        className="d-flex align-items-center gap-3"
                        style={{
                          padding: "12px 16px", background: "#f9fafb",
                          borderRadius: 8, border: "1px solid #e5e7eb",
                        }}
                      >
                        {/* Color swatch */}
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                            background: region.color,
                            border: `2px solid ${region.strokeColor}`,
                            opacity: region.isActive ? 1 : 0.4,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>{region.name}</div>
                          {region.description && (
                            <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {region.description}
                            </div>
                          )}
                        </div>
                        {/* Polygon status */}
                        <div style={{ fontSize: 12, color: region.polygon.length >= 3 ? "#16a34a" : "#9ca3af" }}>
                          <i className={`bi ${region.polygon.length >= 3 ? "bi-check-circle-fill" : "bi-circle"} me-1`} />
                          {region.polygon.length >= 3 ? `${region.polygon.length} pts` : "no polygon"}
                        </div>
                        {/* Actions */}
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openPolygonEditor(region)}
                            title="Draw/edit polygon"
                          >
                            <i className="bi bi-pentagon" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openEditRegion(region)}
                            title="Edit region settings"
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteRegion(region.id)}
                            title="Delete region"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Labels tab ────────────────────────────────────────────── */}
            {activeTab === "labels" && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    Text labels displayed on the map at specific coordinates
                  </p>
                  <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={openNewLabel}>
                    <i className="bi bi-plus" />Add Label
                  </button>
                </div>

                {selectedMap.labels.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center", padding: "40px 20px", border: "2px dashed #e5e7eb",
                      borderRadius: 10, color: "#9ca3af",
                    }}
                  >
                    <i className="bi bi-fonts" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
                    No labels yet — click <strong>Add Label</strong> to get started
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedMap.labels.map((label) => (
                      <div
                        key={label.id}
                        className="d-flex align-items-center gap-3"
                        style={{
                          padding: "12px 16px", background: "#f9fafb",
                          borderRadius: 8, border: "1px solid #e5e7eb",
                        }}
                      >
                        {/* Text preview */}
                        <div
                          style={{
                            fontFamily: label.fontFamily, fontSize: label.fontSize, fontWeight: label.bold ? 700 : 400,
                            color: label.color, background: label.bgColor ?? "#374151",
                            padding: "2px 8px", borderRadius: 4, flexShrink: 0, maxWidth: 140,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}
                        >
                          {label.text}
                        </div>
                        <div style={{ flex: 1, fontSize: 12, color: "#6b7280" }}>
                          {label.lat.toFixed(4)}, {label.lng.toFixed(4)} · {label.fontSize}px {label.fontFamily}
                        </div>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditLabel(label)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteLabel(label.id)}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Map form modal ────────────────────────────────────────────────────── */}
      {showMapForm && editingMap && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setShowMapForm(false)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog" style={{ marginTop: 90 }}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                <div className="modal-header border-0" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">
                    {editingMap.id ? "Edit Coverage Map" : "New Coverage Map"}
                  </h5>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => setShowMapForm(false)} />
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Map Name <span className="text-danger">*</span></label>
                    <input
                      type="text" className="form-control"
                      placeholder="e.g. Overberg Region"
                      value={editingMap.name ?? ""}
                      onChange={(e) => setEditingMap((prev) => ({ ...prev!, name: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">URL Slug <span className="text-danger">*</span></label>
                    <input
                      type="text" className="form-control font-monospace"
                      placeholder="e.g. western-cape"
                      value={editingMap.slug ?? ""}
                      onChange={(e) => setEditingMap((prev) => ({ ...prev!, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                    />
                    <div className="form-text">Used in the URL: /api/coverage-maps/{editingMap.slug}/public</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control" rows={2}
                      value={editingMap.description ?? ""}
                      onChange={(e) => setEditingMap((prev) => ({ ...prev!, description: e.target.value }))}
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Center Latitude</label>
                      <input
                        type="number" className="form-control form-control-sm" step="0.0001"
                        value={editingMap.centerLat ?? -34.4187}
                        onChange={(e) => setEditingMap((prev) => ({ ...prev!, centerLat: parseFloat(e.target.value) || -34.4187 }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Center Longitude</label>
                      <input
                        type="number" className="form-control form-control-sm" step="0.0001"
                        value={editingMap.centerLng ?? 19.2345}
                        onChange={(e) => setEditingMap((prev) => ({ ...prev!, centerLng: parseFloat(e.target.value) || 19.2345 }))}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Default Zoom</label>
                    <input
                      type="number" className="form-control form-control-sm" min={5} max={18}
                      value={editingMap.defaultZoom ?? 10}
                      onChange={(e) => setEditingMap((prev) => ({ ...prev!, defaultZoom: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox" className="form-check-input" role="switch" id="mapActive"
                      checked={editingMap.isActive ?? true}
                      onChange={(e) => setEditingMap((prev) => ({ ...prev!, isActive: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="mapActive">Active (visible to visitors)</label>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button className="btn btn-outline-secondary" onClick={() => setShowMapForm(false)}>Cancel</button>
                  <button className="btn btn-success px-4" onClick={saveMap} disabled={mapSaving}>
                    {mapSaving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                    {editingMap.id ? "Save Changes" : "Create Map"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Region form modal ─────────────────────────────────────────────────── */}
      {showRegionForm && editingRegion && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setShowRegionForm(false)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog" style={{ marginTop: 90 }}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                <div className="modal-header border-0" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">
                    {editingRegion.id ? "Edit Region" : "New Region"}
                  </h5>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => setShowRegionForm(false)} />
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Region Name <span className="text-danger">*</span></label>
                    <input
                      type="text" className="form-control"
                      placeholder="e.g. Hermanus"
                      value={editingRegion.name ?? ""}
                      onChange={(e) => setEditingRegion((prev) => ({ ...prev!, name: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <input
                      type="text" className="form-control"
                      placeholder="Optional info for the popup"
                      value={editingRegion.description ?? ""}
                      onChange={(e) => setEditingRegion((prev) => ({ ...prev!, description: e.target.value }))}
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-4">
                      <label className="form-label fw-semibold small">Fill Color</label>
                      <input
                        type="color" className="form-control form-control-color w-100"
                        value={editingRegion.color ?? "#22c55e"}
                        onChange={(e) => setEditingRegion((prev) => ({ ...prev!, color: e.target.value }))}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold small">Stroke Color</label>
                      <input
                        type="color" className="form-control form-control-color w-100"
                        value={editingRegion.strokeColor ?? "#16a34a"}
                        onChange={(e) => setEditingRegion((prev) => ({ ...prev!, strokeColor: e.target.value }))}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold small">Stroke Width</label>
                      <input
                        type="number" className="form-control form-control-sm" min={1} max={8}
                        value={editingRegion.strokeWidth ?? 2}
                        onChange={(e) => setEditingRegion((prev) => ({ ...prev!, strokeWidth: parseInt(e.target.value) || 2 }))}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Opacity: {Math.round((editingRegion.opacity ?? 0.4) * 100)}%</label>
                    <input
                      type="range" className="form-range" min={0.05} max={0.85} step={0.05}
                      value={editingRegion.opacity ?? 0.4}
                      onChange={(e) => setEditingRegion((prev) => ({ ...prev!, opacity: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Display Order</label>
                    <input
                      type="number" className="form-control form-control-sm" min={0}
                      value={editingRegion.order ?? 0}
                      onChange={(e) => setEditingRegion((prev) => ({ ...prev!, order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox" className="form-check-input" role="switch" id="regionActive"
                      checked={editingRegion.isActive ?? true}
                      onChange={(e) => setEditingRegion((prev) => ({ ...prev!, isActive: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="regionActive">Active</label>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button className="btn btn-outline-secondary" onClick={() => setShowRegionForm(false)}>Cancel</button>
                  <button className="btn btn-success px-4" onClick={saveRegion} disabled={regionSaving}>
                    {regionSaving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                    {editingRegion.id ? "Save Changes" : "Add Region"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Label form modal ──────────────────────────────────────────────────── */}
      {showLabelForm && editingLabel && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setShowLabelForm(false)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog" style={{ marginTop: 90 }}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                <div className="modal-header border-0" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">
                    {editingLabel.id ? "Edit Label" : "New Label"}
                  </h5>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => setShowLabelForm(false)} />
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Label Text <span className="text-danger">*</span></label>
                    <input
                      type="text" className="form-control"
                      value={editingLabel.text ?? ""}
                      onChange={(e) => setEditingLabel((prev) => ({ ...prev!, text: e.target.value }))}
                    />
                  </div>
                  {/* Preview */}
                  <div className="mb-3 p-3 rounded" style={{ background: "#374151", textAlign: "center" }}>
                    <span style={{
                      fontFamily: editingLabel.fontFamily, fontSize: editingLabel.fontSize,
                      fontWeight: editingLabel.bold ? 700 : 400, color: editingLabel.color,
                      background: editingLabel.bgColor ?? "transparent",
                      padding: editingLabel.bgColor ? "2px 8px" : undefined, borderRadius: 3,
                    }}>
                      {editingLabel.text || "Preview"}
                    </span>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Latitude</label>
                      <input
                        type="number" className="form-control form-control-sm" step="0.0001"
                        value={editingLabel.lat ?? 0}
                        onChange={(e) => setEditingLabel((prev) => ({ ...prev!, lat: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Longitude</label>
                      <input
                        type="number" className="form-control form-control-sm" step="0.0001"
                        value={editingLabel.lng ?? 0}
                        onChange={(e) => setEditingLabel((prev) => ({ ...prev!, lng: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Font Size (px)</label>
                      <input
                        type="number" className="form-control form-control-sm" min={10} max={48}
                        value={editingLabel.fontSize ?? 14}
                        onChange={(e) => setEditingLabel((prev) => ({ ...prev!, fontSize: parseInt(e.target.value) || 14 }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Font Family</label>
                      <select
                        className="form-select form-select-sm"
                        value={editingLabel.fontFamily ?? "Arial"}
                        onChange={(e) => setEditingLabel((prev) => ({ ...prev!, fontFamily: e.target.value }))}
                      >
                        {["Arial", "Georgia", "Verdana", "Trebuchet MS", "Impact", "Courier New"].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-4">
                      <label className="form-label fw-semibold small">Text Color</label>
                      <input
                        type="color" className="form-control form-control-color w-100"
                        value={editingLabel.color ?? "#ffffff"}
                        onChange={(e) => setEditingLabel((prev) => ({ ...prev!, color: e.target.value }))}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold small">Bg Color</label>
                      <input
                        type="color" className="form-control form-control-color w-100"
                        value={editingLabel.bgColor ?? "#000000"}
                        onChange={(e) => setEditingLabel((prev) => ({ ...prev!, bgColor: e.target.value }))}
                      />
                    </div>
                    <div className="col-4 d-flex flex-column">
                      <label className="form-label fw-semibold small">Options</label>
                      <div className="form-check mt-auto">
                        <input
                          type="checkbox" className="form-check-input" id="labelBold"
                          checked={editingLabel.bold ?? false}
                          onChange={(e) => setEditingLabel((prev) => ({ ...prev!, bold: e.target.checked }))}
                        />
                        <label className="form-check-label fw-bold" htmlFor="labelBold">Bold</label>
                      </div>
                    </div>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox" className="form-check-input" role="switch" id="noBg"
                      checked={!editingLabel.bgColor}
                      onChange={(e) => setEditingLabel((prev) => ({ ...prev!, bgColor: e.target.checked ? null : "#000000" }))}
                    />
                    <label className="form-check-label" htmlFor="noBg">No background</label>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button className="btn btn-outline-secondary" onClick={() => setShowLabelForm(false)}>Cancel</button>
                  <button className="btn btn-success px-4" onClick={saveLabel} disabled={labelSaving}>
                    {labelSaving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                    {editingLabel.id ? "Save Changes" : "Add Label"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Polygon editor modal ──────────────────────────────────────────────── */}
      {polyEditorOpen && polyEditorRegion && selectedMap && (
        <PolygonEditorModal
          show={polyEditorOpen}
          regionName={polyEditorRegion.name}
          existingPolygon={polyEditorRegion.polygon}
          centerLat={selectedMap.centerLat}
          centerLng={selectedMap.centerLng}
          defaultZoom={selectedMap.defaultZoom}
          color={polyEditorRegion.color}
          strokeColor={polyEditorRegion.strokeColor}
          onSave={savePolygon}
          onClose={() => setPolyEditorOpen(false)}
        />
      )}
    </div>
  );
}
