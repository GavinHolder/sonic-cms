"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";
import NetworksManager from "@/components/admin/coverage/NetworksManager";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const PolygonEditorModal = dynamic(
  () => import("@/components/admin/coverage/PolygonEditorModal"),
  { ssr: false }
);
const PointPickerModal = dynamic(
  () => import("@/components/admin/coverage/PointPickerModal"),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number; }

interface CoverageRegion {
  id: string; mapId: string;
  name: string; polygon: LatLng[]; color: string; opacity: number;
  strokeColor: string; strokeWidth: number; description: string | null;
  isActive: boolean; order: number;
  regionType: "GENERAL" | "FIBRE" | "WIRELESS";
  fnoProvider: string | null;
  serviceSlug: string | null;
  towerRef: string | null;
  networkId: string | null;
}

interface NetworkOption { id: string; name: string; category: string; color: string; }

interface ProductTypeOption { id: string; name: string; slug: string; color: string; isActive?: boolean; }

interface CoverageTower {
  id: string; mapId: string;
  name: string; lat: number; lng: number;
  description: string | null; isActive: boolean;
  networkId?: string | null;
  regionId?: string | null;
  region?: { id: string; name: string } | null;
  productTypes?: ProductTypeOption[];
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
  regions: CoverageRegion[]; labels: CoverageLabel[]; towers: CoverageTower[];
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
  const [activeTab, setActiveTab] = useState<"regions" | "labels" | "towers">("regions");
  const [view, setView] = useState<"maps" | "networks">("maps");
  // Regions list groups by the linked network's category once there are enough networks
  // that a flat list gets hard to scan. "ALL" shows every region unfiltered (the
  // previous, only behavior). The tab set itself is derived from whichever
  // NetworkCategory values are actually in use (see the render below) — not hardcoded —
  // since a category with zero networks (e.g. WIRELESS, when every real network is
  // FNO or WISP) is dead weight. VOICE is a real NetworkCategory too (a major category,
  // structurally separate from WISP/FNO/WIRELESS data networks), but voice service isn't
  // tied to a geographic coverage polygon the way fibre/wireless delivery is — so a VOICE
  // tab will only actually appear here if an admin deliberately links a region to a Voice
  // network, which is expected to be rare-to-never in practice.
  const [regionCategoryFilter, setRegionCategoryFilter] = useState<string>("ALL");

  // Map form
  const [showMapForm, setShowMapForm] = useState(false);
  const [editingMap, setEditingMap] = useState<Partial<CoverageMap> | null>(null);
  const [mapSaving, setMapSaving] = useState(false);

  // Region form
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [editingRegion, setEditingRegion] = useState<
    (Partial<CoverageRegion> & { towerIds: string[] }) | null
  >(null);
  // Tower multi-select (search + badges) inside the Region modal — reuses the
  // `towers` state already fetched for the selected map (Towers tab), no extra fetch.
  const [regionTowerSearch, setRegionTowerSearch] = useState("");
  const [regionTowerDropdownOpen, setRegionTowerDropdownOpen] = useState(false);
  const [networks, setNetworks] = useState<NetworkOption[]>([]);
  const [regionSaving, setRegionSaving] = useState(false);

  // Polygon editor
  const [polyEditorOpen, setPolyEditorOpen] = useState(false);
  const [polyEditorRegion, setPolyEditorRegion] = useState<CoverageRegion | null>(null);

  // Tower management
  const [towers, setTowers] = useState<CoverageTower[]>([]);
  const [newTower, setNewTower] = useState({ name: "", lat: "", lng: "", description: "", networkId: "", regionId: "", productTypeIds: [] as string[] });
  const [showTowerPicker, setShowTowerPicker] = useState(false);
  const [showAddTowerModal, setShowAddTowerModal] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  // Promise-based confirm via the in-app modal (no native window.confirm)
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const requestConfirm = (message: string) => new Promise<boolean>((resolve) => setConfirmState({ message, resolve }));
  const [addingTower, setAddingTower] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductTypeOption[]>([]);

  // Tower edit modal — mirrors the Region/Label edit-modal pattern below.
  const [showTowerForm, setShowTowerForm] = useState(false);
  const [editingTower, setEditingTower] = useState<
    (Partial<CoverageTower> & { productTypeIds: string[] }) | null
  >(null);
  const [towerSaving, setTowerSaving] = useState(false);
  const [showEditTowerPicker, setShowEditTowerPicker] = useState(false);

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

  // Refetchable so newly-created networks appear in the region/tower dropdowns
  // without a full page reload.
  const loadNetworks = () => {
    fetch("/api/networks")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setNetworks(Array.isArray(d) ? d.map((n: NetworkOption) => ({ id: n.id, name: n.name, category: n.category, color: n.color })) : []))
      .catch(() => {});
  };

  // Refetchable so newly-created product types appear in the tower checklist
  // without a full page reload. Same endpoint NetworksManager.tsx uses.
  const loadProductTypes = () => {
    fetch("/api/product-types")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProductTypes(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => { loadMaps(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadNetworks(); loadProductTypes(); }, []);

  useEffect(() => {
    if (selectedMapId) {
      fetch(`/api/coverage-maps/${selectedMapId}/towers`)
        .then((r) => r.json())
        .then(setTowers)
        .catch(() => setTowers([]));
    } else {
      setTowers([]);
    }
  }, [selectedMapId]);

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
    if (!editingMap?.name) {
      toast.error("Name is required"); return;
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
    if (!(await requestConfirm("Delete this coverage map and all its regions, labels and towers?"))) return;
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
      regionType: "GENERAL", fnoProvider: "", serviceSlug: "", towerRef: "", networkId: "",
      towerIds: [],
    });
    setRegionTowerSearch("");
    setRegionTowerDropdownOpen(false);
    loadNetworks();
    setShowRegionForm(true);
  };

  const openEditRegion = (region: CoverageRegion) => {
    setEditingRegion({
      ...region,
      regionType: region.regionType ?? "GENERAL",
      fnoProvider: region.fnoProvider ?? "",
      serviceSlug: region.serviceSlug ?? "",
      towerRef: region.towerRef ?? "",
      networkId: region.networkId ?? "",
      // Pre-populate from the `towers` state already loaded for this map (regionId back-relation) —
      // no separate fetch needed.
      towerIds: towers.filter((t) => t.regionId === region.id).map((t) => t.id),
    });
    setRegionTowerSearch("");
    setRegionTowerDropdownOpen(false);
    loadNetworks();
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
          body: JSON.stringify({
          ...editingRegion,
          regionType: editingRegion.regionType ?? "GENERAL",
          fnoProvider: editingRegion.regionType === "FIBRE" ? (editingRegion.fnoProvider || null) : null,
          serviceSlug: editingRegion.regionType === "WIRELESS" ? (editingRegion.serviceSlug || null) : null,
          towerRef: editingRegion.regionType === "WIRELESS" ? (editingRegion.towerRef || null) : null,
          networkId: editingRegion.networkId || null,
          // Replace-the-set: every tower now selected gets regionId = this region;
          // every tower previously linked but no longer selected gets regionId cleared.
          towerIds: editingRegion.towerIds ?? [],
        }),
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
    if (!(await requestConfirm("Delete this region?"))) return;
    try {
      await fetch(`/api/coverage-maps/${selectedMapId}/regions/${regionId}`, { method: "DELETE" });
      toast.success("Region deleted");
      await loadMaps();
    } catch {
      toast.error("Failed to delete region");
    }
  };

  // Duplicate a region — keeps the polygon + all styling/links, only the name differs.
  const duplicateRegion = async (region: CoverageRegion) => {
    try {
      const res = await fetch(`/api/coverage-maps/${selectedMapId}/regions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${region.name} (copy)`,
          polygon: region.polygon, color: region.color, opacity: region.opacity,
          strokeColor: region.strokeColor, strokeWidth: region.strokeWidth,
          description: region.description, order: region.order,
          regionType: region.regionType, fnoProvider: region.fnoProvider,
          serviceSlug: region.serviceSlug, towerRef: region.towerRef, networkId: region.networkId,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Region duplicated — edit the copy to adjust");
      await loadMaps();
    } catch { toast.error("Failed to duplicate region"); }
  };

  // Duplicate a tower — keeps description/network/location; user tweaks name + spot.
  const duplicateTower = async (tower: CoverageTower) => {
    try {
      const res = await fetch(`/api/coverage-maps/${selectedMapId}/towers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${tower.name} (copy)`, lat: tower.lat, lng: tower.lng,
          description: tower.description ?? null, networkId: tower.networkId ?? null,
          regionId: tower.regionId ?? null,
          productTypeIds: (tower.productTypes ?? []).map((pt) => pt.id),
        }),
      });
      if (!res.ok) throw new Error();
      const r = await fetch(`/api/coverage-maps/${selectedMapId}/towers`);
      setTowers(await r.json());
      toast.success("Tower duplicated — edit the copy to adjust");
    } catch { toast.error("Failed to duplicate tower"); }
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

  // ── Tower CRUD ─────────────────────────────────────────────────────────────
  const handleAddTower = async () => {
    if (!newTower.name || !newTower.lat || !newTower.lng) return;
    setAddingTower(true);
    try {
      await fetch(`/api/coverage-maps/${selectedMapId}/towers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTower.name,
          lat: parseFloat(newTower.lat),
          lng: parseFloat(newTower.lng),
          description: newTower.description || null,
          networkId: newTower.networkId || null,
          regionId: newTower.regionId || null,
          productTypeIds: newTower.productTypeIds,
        }),
      });
      setNewTower({ name: "", lat: "", lng: "", description: "", networkId: "", regionId: "", productTypeIds: [] });
      const res = await fetch(`/api/coverage-maps/${selectedMapId}/towers`);
      setTowers(await res.json());
      setShowAddTowerModal(false);
      toast.success("Tower added");
    } catch {
      toast.error("Failed to add tower");
    } finally {
      setAddingTower(false);
    }
  };

  const handleDeleteTower = async (towerId: string) => {
    if (!(await requestConfirm("Delete this tower?"))) return;
    try {
      await fetch(`/api/coverage-maps/${selectedMapId}/towers/${towerId}`, { method: "DELETE" });
      setTowers((t) => t.filter((x) => x.id !== towerId));
      toast.success("Tower deleted");
    } catch {
      toast.error("Failed to delete tower");
    }
  };

  const openEditTower = (tower: CoverageTower) => {
    setEditingTower({
      ...tower,
      networkId: tower.networkId ?? "",
      regionId: tower.regionId ?? "",
      productTypeIds: (tower.productTypes ?? []).map((pt) => pt.id),
    });
    loadNetworks();
    setShowTowerForm(true);
  };

  const saveTower = async () => {
    if (!editingTower?.id) return;
    if (!editingTower.name || typeof editingTower.lat !== "number" || typeof editingTower.lng !== "number") {
      toast.error("Tower name and location are required");
      return;
    }
    setTowerSaving(true);
    try {
      const res = await fetch(`/api/coverage-maps/${selectedMapId}/towers/${editingTower.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingTower.name,
          lat: editingTower.lat,
          lng: editingTower.lng,
          description: editingTower.description || null,
          networkId: editingTower.networkId || null,
          regionId: editingTower.regionId || null,
          productTypeIds: editingTower.productTypeIds,
          isActive: editingTower.isActive ?? true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tower saved");
      setShowTowerForm(false);
      setEditingTower(null);
      const r = await fetch(`/api/coverage-maps/${selectedMapId}/towers`);
      setTowers(await r.json());
    } catch {
      toast.error("Failed to save tower");
    } finally {
      setTowerSaving(false);
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
    if (!(await requestConfirm("Delete this label?"))) return;
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
    <>
      {/* View toggle — Maps vs Networks & Packages (both part of this plugin) */}
      <div className="btn-group mb-3" role="group">
        <button type="button" className={`btn btn-sm ${view === "maps" ? "btn-success" : "btn-outline-secondary"}`} onClick={() => { setView("maps"); loadNetworks(); }}>
          <i className="bi bi-map me-1" />Maps
        </button>
        <button type="button" className={`btn btn-sm ${view === "networks" ? "btn-success" : "btn-outline-secondary"}`} onClick={() => setView("networks")}>
          <i className="bi bi-diagram-3 me-1" />Networks &amp; Packages
        </button>
      </div>

      {view === "maps" && (
        <details className="mb-3" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, color: "#1e40af", fontSize: 13 }}>
            <i className="bi bi-info-circle me-1" />How coverage works
          </summary>
          <div style={{ fontSize: 13, color: "#1e3a5f", marginTop: 10, lineHeight: 1.7 }}>
            <strong>1. One map</strong> = your whole service footprint — you usually only need one.<br />
            <strong>2. Regions</strong> = the polygons you draw. Draw <em>one per covered area</em> and set each one&apos;s <strong>Provider Network</strong>. A provider can have many scattered polygons — that&apos;s expected.<br />
            <strong>3. Networks &amp; Packages</strong> (toggle above) = your providers (FNO / WISP / Wireless / Voice) and their plans. Regions link to a provider; the provider&apos;s packages show on the public address check.<br />
            <strong>Labels</strong> = optional town-name text on the map · <strong>Towers</strong> = optional site-marker pins. Both are visual only.
          </div>
        </details>
      )}

      {view === "networks" ? (
        <NetworksManager />
      ) : (
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
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.regions.length} regions · {m.towers?.length ?? 0} towers</div>
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
            {([
              { key: "regions", icon: "bi-pentagon", count: selectedMap.regions.length },
              { key: "labels", icon: "bi-fonts", count: selectedMap.labels.length },
              { key: "towers", icon: "bi-broadcast-pin", count: towers.length },
            ] as const).map(({ key, icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "12px 18px", border: "none", background: "transparent",
                  borderBottom: activeTab === key ? "2px solid #4a7c59" : "2px solid transparent",
                  color: activeTab === key ? "#4a7c59" : "#6b7280",
                  fontWeight: activeTab === key ? 700 : 500,
                  fontSize: 14, cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                <i className={`bi ${icon} me-2`} style={{ fontSize: 12 }} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
                <span
                  style={{
                    marginLeft: 6, background: activeTab === key ? "#dcfce7" : "#f3f4f6",
                    color: activeTab === key ? "#16a34a" : "#9ca3af",
                    fontSize: 11, fontWeight: 600, borderRadius: 10, padding: "1px 7px",
                  }}
                >
                  {count}
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

                {/* Category tabs — filter the (potentially long) region list by the
                    linked network's category. "ALL" is the previous, unfiltered view. */}
                {(() => {
                  const categoryCounts = selectedMap.regions.reduce<Record<string, number>>((acc, r) => {
                    const cat = networks.find((n) => n.id === r.networkId)?.category ?? "UNASSIGNED";
                    acc[cat] = (acc[cat] ?? 0) + 1;
                    return acc;
                  }, {});
                  // Only categories with at least one region get a tab — a category no
                  // network here actually uses (e.g. WIRELESS on an FNO/WISP-only setup)
                  // would otherwise sit at a permanent (0), which reads as broken rather
                  // than "unused". Preferred display order, then any others alphabetically.
                  const PREFERRED_ORDER = ["FNO", "WISP", "WIRELESS", "VOICE"];
                  const presentCats = Object.keys(categoryCounts).sort((a, b) => {
                    const ai = PREFERRED_ORDER.indexOf(a), bi = PREFERRED_ORDER.indexOf(b);
                    if (ai !== -1 && bi !== -1) return ai - bi;
                    if (ai !== -1) return -1;
                    if (bi !== -1) return 1;
                    return a.localeCompare(b);
                  });
                  const tabs: Array<{ key: string; label: string }> = [
                    { key: "ALL", label: "All" },
                    ...presentCats.map((c) => ({ key: c, label: c === "UNASSIGNED" ? "Unassigned" : c })),
                  ];
                  return (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {tabs.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          className={`btn btn-sm ${regionCategoryFilter === t.key ? "btn-dark" : "btn-outline-secondary"}`}
                          onClick={() => setRegionCategoryFilter(t.key)}
                        >
                          {t.label}
                          <span className="ms-1 opacity-75">
                            ({t.key === "ALL" ? selectedMap.regions.length : categoryCounts[t.key] ?? 0})
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {(() => {
                  const visibleRegions = regionCategoryFilter === "ALL"
                    ? selectedMap.regions
                    : selectedMap.regions.filter((r) => (networks.find((n) => n.id === r.networkId)?.category ?? "UNASSIGNED") === regionCategoryFilter);
                  return visibleRegions.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center", padding: "40px 20px", border: "2px dashed #e5e7eb",
                      borderRadius: 10, color: "#9ca3af",
                    }}
                  >
                    <i className="bi bi-pentagon" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
                    {selectedMap.regions.length === 0
                      ? <>No regions yet — click <strong>Add Region</strong> to get started</>
                      : "No regions in this category"}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {visibleRegions.map((region) => (
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
                          {/* Assigned provider — makes provider↔polygon obvious */}
                          {(() => {
                            const net = networks.find((n) => n.id === region.networkId);
                            return net ? (
                              <div style={{ fontSize: 11.5, color: "#6b7280", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                                <span style={{ width: 9, height: 9, borderRadius: 2, background: net.color, flexShrink: 0 }} />
                                {net.name} <span style={{ color: "#9ca3af" }}>({net.category})</span>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11.5, color: "#d97706", marginTop: 2 }}>
                                <i className="bi bi-exclamation-triangle me-1" />No provider linked — won&apos;t show packages
                              </div>
                            );
                          })()}
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
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => duplicateRegion(region)}
                            title="Duplicate region (keeps the polygon)"
                          >
                            <i className="bi bi-files" />
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
                );
                })()}
              </div>
            )}

            {/* ── Towers tab ────────────────────────────────────────────── */}
            {activeTab === "towers" && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    Tower markers shown on the wireless coverage map
                  </p>
                  <button className="btn btn-sm btn-primary" onClick={() => setShowAddTowerModal(true)}>
                    <i className="bi bi-plus-lg me-1" />Add Tower
                  </button>
                </div>

                {towers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 20px", border: "2px dashed #e5e7eb", borderRadius: 10, color: "#9ca3af", marginBottom: 16 }}>
                    <i className="bi bi-broadcast-pin" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                    No towers yet
                  </div>
                ) : (() => {
                  // Group towers by region (ask #2: "group towers by area"), sorted by the
                  // region's own display order (same field the Regions tab list already
                  // relies on for its ordering), tie-broken alphabetically. Towers with no
                  // regionId — most towers, until an admin assigns one — form an
                  // "Unassigned" group shown last so it never crowds out real areas.
                  const UNASSIGNED = "__unassigned__";
                  const groups = new Map<string, CoverageTower[]>();
                  for (const t of towers) {
                    const key = t.regionId || UNASSIGNED;
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(t);
                  }
                  const regionsById = new Map(selectedMap.regions.map((r) => [r.id, r]));
                  const sortedKeys = [...groups.keys()]
                    .filter((k) => k !== UNASSIGNED)
                    .sort((a, b) => {
                      const ra = regionsById.get(a), rb = regionsById.get(b);
                      if (ra && rb && ra.order !== rb.order) return ra.order - rb.order;
                      return (ra?.name ?? "").localeCompare(rb?.name ?? "");
                    });
                  if (groups.has(UNASSIGNED)) sortedKeys.push(UNASSIGNED);

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 16 }}>
                      {sortedKeys.map((key) => (
                        <div key={key}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                            {key === UNASSIGNED ? "Unassigned" : (regionsById.get(key)?.name ?? "Unknown region")}
                            <span style={{ fontWeight: 400, color: "#9ca3af" }}> · {groups.get(key)!.length}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {groups.get(key)!.map((tower) => (
                              <div key={tower.id} className="d-flex align-items-center gap-3"
                                style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                                <i className="bi bi-broadcast-pin" style={{ color: "#dc2626", fontSize: 18, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>{tower.name}</div>
                                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                                    {tower.lat.toFixed(5)}, {tower.lng.toFixed(5)}
                                    {tower.description && ` · ${tower.description}`}
                                  </div>
                                  {tower.productTypes && tower.productTypes.length > 0 && (
                                    <div className="d-flex flex-wrap gap-1" style={{ marginTop: 4 }}>
                                      {tower.productTypes.map((pt) => (
                                        <span key={pt.id} style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: `${pt.color}22`, color: pt.color }}>
                                          {pt.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditTower(tower)} title="Edit tower">
                                  <i className="bi bi-pencil" />
                                </button>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => duplicateTower(tower)} title="Duplicate tower">
                                  <i className="bi bi-files" />
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteTower(tower.id)}>
                                  <i className="bi bi-trash" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Add Tower modal — trigger moved to the top of the tab (was an
                    always-visible form at the bottom, requiring a scroll past every
                    existing tower to reach it). */}
                {showAddTowerModal && (
                  <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowAddTowerModal(false)}>
                    <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-content">
                        <div className="modal-header"><h5 className="modal-title">Add Tower</h5>
                          <button className="btn-close" onClick={() => setShowAddTowerModal(false)} /></div>
                        <div className="modal-body">
                          <div className="row g-2 mb-2 align-items-center">
                            <div className="col-6">
                              <input className="form-control form-control-sm" placeholder="Tower name *"
                                value={newTower.name} onChange={(e) => setNewTower((t) => ({ ...t, name: e.target.value }))} />
                            </div>
                            <div className="col-6 d-flex align-items-center gap-2">
                              <button type="button" className="btn btn-sm btn-outline-success text-nowrap" onClick={() => setShowTowerPicker(true)}>
                                <i className="bi bi-geo-alt me-1" />{newTower.lat && newTower.lng ? "Change location" : "Pick on map"}
                              </button>
                              <span style={{ fontSize: 12, fontFamily: "monospace", color: newTower.lat ? "#16a34a" : "#9ca3af" }}>
                                {newTower.lat && newTower.lng ? `${parseFloat(newTower.lat).toFixed(5)}, ${parseFloat(newTower.lng).toFixed(5)}` : "no location set"}
                              </span>
                            </div>
                          </div>
                          <div className="mb-2">
                            <input className="form-control form-control-sm" placeholder="Description (optional)"
                              value={newTower.description} onChange={(e) => setNewTower((t) => ({ ...t, description: e.target.value }))} />
                          </div>
                          <div className="row g-2 mb-2">
                            <div className="col-6">
                              <select className="form-select form-select-sm" value={newTower.networkId}
                                onChange={(e) => setNewTower((t) => ({ ...t, networkId: e.target.value }))}>
                                <option value="">— Network (for distance-limited packages) —</option>
                                {networks.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.category})</option>)}
                              </select>
                            </div>
                            <div className="col-6">
                              <select className="form-select form-select-sm" value={newTower.regionId}
                                onChange={(e) => setNewTower((t) => ({ ...t, regionId: e.target.value }))}>
                                <option value="">— Region (for grouping) —</option>
                                {selectedMap.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="form-text mb-2">Network links distance-limited packages (e.g. AirFibre ≤100m) to measure from here. Region groups this tower under an area in the list above.</div>
                          <div className="mb-2">
                            <label className="form-label fw-semibold small mb-1">Services available at this tower</label>
                            <div className="d-flex flex-wrap gap-2">
                              {productTypes.filter((pt) => pt.isActive !== false).map((pt) => {
                                const checked = newTower.productTypeIds.includes(pt.id);
                                return (
                                  <label key={pt.id} className="form-check form-check-inline m-0" style={{ fontSize: 12 }}>
                                    <input
                                      type="checkbox" className="form-check-input"
                                      checked={checked}
                                      onChange={(e) => setNewTower((t) => ({
                                        ...t,
                                        productTypeIds: e.target.checked
                                          ? [...t.productTypeIds, pt.id]
                                          : t.productTypeIds.filter((id) => id !== pt.id),
                                      }))}
                                    />
                                    <span className="form-check-label">{pt.name}</span>
                                  </label>
                                );
                              })}
                              {productTypes.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>No product types configured yet.</span>}
                            </div>
                            <div className="form-text">Leave unset for unrestricted (matches every package under this tower&apos;s network, same as today).</div>
                          </div>
                        </div>
                        <div className="modal-footer">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowAddTowerModal(false)}>Cancel</button>
                          <button className="btn btn-sm btn-success" onClick={handleAddTower} disabled={addingTower || !newTower.name || !newTower.lat || !newTower.lng}>
                            {addingTower ? <><span className="spinner-border spinner-border-sm me-1" />Adding…</> : <><i className="bi bi-plus me-1" />Add Tower</>}
                          </button>
                        </div>
                      </div>
                    </div>
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
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Region Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={editingRegion.regionType ?? "GENERAL"}
                      onChange={(e) => setEditingRegion((prev) => ({ ...prev!, regionType: e.target.value as "GENERAL" | "FIBRE" | "WIRELESS" }))}
                    >
                      <option value="GENERAL">General</option>
                      <option value="FIBRE">Fibre</option>
                      <option value="WIRELESS">Wireless</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Provider Network</label>
                    <select
                      className="form-select form-select-sm"
                      value={editingRegion.networkId ?? ""}
                      onChange={(e) => setEditingRegion((prev) => ({ ...prev!, networkId: e.target.value }))}
                    >
                      <option value="">— None —</option>
                      {networks.map((n) => (
                        <option key={n.id} value={n.id}>{n.name} ({n.category})</option>
                      ))}
                    </select>
                    <div className="form-text">
                      Links this polygon to a network &amp; its packages.{" "}
                      <a href="/admin/features/networks" target="_blank" rel="noopener noreferrer">Manage networks →</a>
                    </div>
                  </div>
                  {editingRegion.regionType === "FIBRE" && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">FNO Provider</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        placeholder="e.g. sonic_infraco or openserve"
                        value={editingRegion.fnoProvider ?? ""}
                        onChange={(e) => setEditingRegion((prev) => ({ ...prev!, fnoProvider: e.target.value }))}
                      />
                      <div className="form-text">Slug used to display FNO name in coverage results.</div>
                    </div>
                  )}
                  {editingRegion.regionType === "WIRELESS" && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Towers in this Area</label>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        {editingRegion.towerIds.length === 0 && (
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>No towers linked yet.</span>
                        )}
                        {editingRegion.towerIds.map((tid) => {
                          const t = towers.find((tw) => tw.id === tid);
                          if (!t) return null;
                          return (
                            <span key={tid} className="badge text-bg-light border d-inline-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                              {t.name}
                              <button
                                type="button" className="btn-close" style={{ fontSize: 8 }} aria-label="Remove"
                                onClick={() => setEditingRegion((prev) => ({
                                  ...prev!,
                                  towerIds: prev!.towerIds.filter((id) => id !== tid),
                                }))}
                              />
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text" className="form-control form-control-sm"
                          placeholder={towers.length ? "Search towers to add…" : "No towers yet — add them in the Towers tab"}
                          value={regionTowerSearch}
                          onChange={(e) => setRegionTowerSearch(e.target.value)}
                          onFocus={() => setRegionTowerDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setRegionTowerDropdownOpen(false), 150)}
                        />
                        {regionTowerDropdownOpen && (() => {
                          const q = regionTowerSearch.trim().toLowerCase();
                          const results = towers.filter(
                            (t) => !editingRegion!.towerIds.includes(t.id) && t.name.toLowerCase().includes(q)
                          );
                          if (results.length === 0) return null;
                          return (
                            <div
                              className="list-group position-absolute w-100 shadow-sm"
                              style={{ zIndex: 20, maxHeight: 180, overflowY: "auto", top: "100%" }}
                            >
                              {results.map((t) => (
                                <button
                                  key={t.id} type="button"
                                  className="list-group-item list-group-item-action py-1 px-2"
                                  style={{ fontSize: 13 }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setEditingRegion((prev) => ({ ...prev!, towerIds: [...prev!.towerIds, t.id] }));
                                    setRegionTowerSearch("");
                                  }}
                                >
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="form-text">Search and select towers physically located in this area. Multiple towers can belong to one area.</div>
                    </div>
                  )}
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

      {/* ── Tower edit modal (ask #3: name/location/network + new region/services) ── */}
      {showTowerForm && editingTower && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setShowTowerForm(false)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog" style={{ marginTop: 90 }}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                <div className="modal-header border-0" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">Edit Tower</h5>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => setShowTowerForm(false)} />
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Tower Name <span className="text-danger">*</span></label>
                    <input
                      type="text" className="form-control"
                      value={editingTower.name ?? ""}
                      onChange={(e) => setEditingTower((prev) => ({ ...prev!, name: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3 d-flex align-items-center gap-2">
                    <button type="button" className="btn btn-sm btn-outline-success text-nowrap" onClick={() => setShowEditTowerPicker(true)}>
                      <i className="bi bi-geo-alt me-1" />Change location
                    </button>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "#16a34a" }}>
                      {typeof editingTower.lat === "number" && typeof editingTower.lng === "number"
                        ? `${editingTower.lat.toFixed(5)}, ${editingTower.lng.toFixed(5)}`
                        : "no location set"}
                    </span>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Description</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={editingTower.description ?? ""}
                      onChange={(e) => setEditingTower((prev) => ({ ...prev!, description: e.target.value }))}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Network</label>
                      <select
                        className="form-select form-select-sm"
                        value={editingTower.networkId ?? ""}
                        onChange={(e) => setEditingTower((prev) => ({ ...prev!, networkId: e.target.value }))}
                      >
                        <option value="">— None —</option>
                        {networks.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.category})</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Region</label>
                      <select
                        className="form-select form-select-sm"
                        value={editingTower.regionId ?? ""}
                        onChange={(e) => setEditingTower((prev) => ({ ...prev!, regionId: e.target.value }))}
                      >
                        <option value="">— None —</option>
                        {selectedMap?.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small mb-1">Services available at this tower</label>
                    <div className="d-flex flex-wrap gap-2">
                      {productTypes.filter((pt) => pt.isActive !== false).map((pt) => {
                        const checked = editingTower.productTypeIds.includes(pt.id);
                        return (
                          <label key={pt.id} className="form-check form-check-inline m-0" style={{ fontSize: 12 }}>
                            <input
                              type="checkbox" className="form-check-input"
                              checked={checked}
                              onChange={(e) => setEditingTower((prev) => ({
                                ...prev!,
                                productTypeIds: e.target.checked
                                  ? [...prev!.productTypeIds, pt.id]
                                  : prev!.productTypeIds.filter((id) => id !== pt.id),
                              }))}
                            />
                            <span className="form-check-label">{pt.name}</span>
                          </label>
                        );
                      })}
                      {productTypes.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>No product types configured yet.</span>}
                    </div>
                    <div className="form-text">Leave unset for unrestricted (matches every package under this tower&apos;s network, same as today).</div>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox" className="form-check-input" role="switch" id="towerActive"
                      checked={editingTower.isActive ?? true}
                      onChange={(e) => setEditingTower((prev) => ({ ...prev!, isActive: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="towerActive">Active</label>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button className="btn btn-outline-secondary" onClick={() => setShowTowerForm(false)}>Cancel</button>
                  <button className="btn btn-success px-4" onClick={saveTower} disabled={towerSaving}>
                    {towerSaving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                    Save Changes
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
                  <div className="mb-3">
                    <label className="form-label fw-semibold small d-block">Location</label>
                    <div className="d-flex align-items-center gap-2">
                      <button type="button" className="btn btn-sm btn-outline-success text-nowrap" onClick={() => setShowLabelPicker(true)}>
                        <i className="bi bi-geo-alt me-1" />{editingLabel.lat && editingLabel.lng ? "Change location" : "Pick on map"}
                      </button>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: editingLabel.lat ? "#16a34a" : "#9ca3af" }}>
                        {editingLabel.lat && editingLabel.lng ? `${(editingLabel.lat as number).toFixed(5)}, ${(editingLabel.lng as number).toFixed(5)}` : "no location set"}
                      </span>
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

      {/* ── Tower location picker ──────────────────────────────────────────────── */}
      {showTowerPicker && selectedMap && (
        <PointPickerModal
          show={showTowerPicker}
          title={`Place tower${newTower.name ? ` — ${newTower.name}` : ""}`}
          centerLat={selectedMap.centerLat}
          centerLng={selectedMap.centerLng}
          defaultZoom={selectedMap.defaultZoom}
          initialLat={newTower.lat ? parseFloat(newTower.lat) : null}
          initialLng={newTower.lng ? parseFloat(newTower.lng) : null}
          onSave={(lat, lng) => { setNewTower((t) => ({ ...t, lat: String(lat), lng: String(lng) })); setShowTowerPicker(false); }}
          onClose={() => setShowTowerPicker(false)}
        />
      )}

      {/* ── Edit-tower location picker (re-pick location for the tower being edited) ── */}
      {showEditTowerPicker && selectedMap && editingTower && (
        <PointPickerModal
          show={showEditTowerPicker}
          title={`Place tower${editingTower.name ? ` — ${editingTower.name}` : ""}`}
          centerLat={selectedMap.centerLat}
          centerLng={selectedMap.centerLng}
          defaultZoom={selectedMap.defaultZoom}
          initialLat={typeof editingTower.lat === "number" ? editingTower.lat : null}
          initialLng={typeof editingTower.lng === "number" ? editingTower.lng : null}
          onSave={(lat, lng) => { setEditingTower((prev) => ({ ...prev!, lat, lng })); setShowEditTowerPicker(false); }}
          onClose={() => setShowEditTowerPicker(false)}
        />
      )}

      {/* ── Label location picker ─────────────────────────────────────────────── */}
      {showLabelPicker && selectedMap && editingLabel && (
        <PointPickerModal
          show={showLabelPicker}
          title={`Place label${editingLabel.text ? ` — ${editingLabel.text}` : ""}`}
          centerLat={selectedMap.centerLat}
          centerLng={selectedMap.centerLng}
          defaultZoom={selectedMap.defaultZoom}
          initialLat={typeof editingLabel.lat === "number" ? editingLabel.lat : null}
          initialLng={typeof editingLabel.lng === "number" ? editingLabel.lng : null}
          onSave={(lat, lng) => { setEditingLabel((prev) => ({ ...prev!, lat, lng })); setShowLabelPicker(false); }}
          onClose={() => setShowLabelPicker(false)}
        />
      )}
    </div>
      )}

      {/* In-app confirm modal — replaces native window.confirm */}
      {confirmState && (
        <ConfirmDialog
          isOpen
          title="Please confirm"
          message={confirmState.message}
          variant="danger"
          confirmText="Delete"
          onConfirm={() => { confirmState.resolve(true); setConfirmState(null); }}
          onCancel={() => { confirmState.resolve(false); setConfirmState(null); }}
        />
      )}
    </>
  );
}
