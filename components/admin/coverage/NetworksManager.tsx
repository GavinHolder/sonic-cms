"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ImageFieldWithUpload from "@/components/admin/ImageFieldWithUpload";

type Category = "FNO" | "WISP" | "WIRELESS";

interface Pkg {
  id: string;
  name: string;
  speedDown?: string | null;
  speedUp?: string | null;
  price: string;
  period?: string | null;
  features: string[];
  popular: boolean;
  isActive: boolean;
  order: number;
  maxDistanceM?: number | null;
  kind?: "DATA" | "VAS";
  term?: string | null;
  categoryId?: string | null;
}
interface ServiceCategory { id: string; name: string; order: number; isActive: boolean; }

// Fixed term lists per package kind (decoupled — data vs value-added billing)
const TERMS: Record<"DATA" | "VAS", string[]> = {
  DATA: ["24-Month", "Prepaid"],
  VAS: ["Month-to-Month", "12-Month"],
};
interface Network {
  id: string;
  name: string;
  slug: string;
  category: Category;
  color: string;
  logoUrl?: string | null;
  description?: string | null;
  isActive: boolean;
  order: number;
  packages: Pkg[];
  _count?: { regions: number };
}

const CATEGORY_BADGE: Record<Category, string> = {
  FNO: "text-bg-primary",
  WISP: "text-bg-info",
  WIRELESS: "text-bg-success",
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Reusable Networks & Packages manager. Rendered inside AdminLayout (standalone
// page) OR inside the coverage-maps plugin admin as a tab — both provide the
// ToastProvider that useToast() needs.
export default function NetworksManager() {
  const toast = useToast();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [netModal, setNetModal] = useState<Partial<Network> | null>(null);
  const [pkgModal, setPkgModal] = useState<{ networkId: string; pkg: Partial<Pkg> } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [vasEnabled, setVasEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/networks");
      if (r.ok) setNetworks(await r.json());
      else toast.error("Failed to load networks");
    } catch { toast.error("Failed to load networks"); }
    finally { setLoading(false); }
  }, [toast]);

  const loadCategories = useCallback(async () => {
    try { const r = await fetch("/api/service-categories"); if (r.ok) setCategories(await r.json()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadCategories(); }, [load, loadCategories]);
  useEffect(() => {
    fetch("/api/features/coverage-maps")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const cfg = d?.config ?? d?.data?.config ?? {}; setVasEnabled(!!cfg.showValueAddedServices); })
      .catch(() => {});
  }, []);

  // ── Categories ─────────────────────────────────────────────────────────────
  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const res = await fetch("/api/service-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, order: categories.length }) });
    if (res.ok) { setNewCategory(""); loadCategories(); toast.success("Category added"); } else toast.error("Failed to add category");
  };
  const deleteCategory = (c: ServiceCategory) =>
    setConfirm({ title: "Delete category", message: `Delete "${c.name}"? Packages using it become uncategorised.`, onConfirm: async () => {
      const res = await fetch(`/api/service-categories/${c.id}`, { method: "DELETE" });
      if (res.ok) { loadCategories(); toast.success("Category deleted"); } else toast.error("Delete failed");
      setConfirm(null);
    } });

  // ── Global value-added-services visibility ───────────────────────────────────
  const toggleVas = async (on: boolean) => {
    setVasEnabled(on);
    try {
      const cur = await fetch("/api/features/coverage-maps").then((r) => (r.ok ? r.json() : null));
      const cfg = cur?.config ?? cur?.data?.config ?? {};
      await fetch("/api/features/coverage-maps", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: { ...cfg, showValueAddedServices: on } }) });
    } catch { /* ignore */ }
  };

  const toggle = (id: string) =>
    setExpanded((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── Network save ───────────────────────────────────────────────
  const saveNetwork = async () => {
    if (!netModal) return;
    const isNew = !netModal.id;
    const payload = {
      name: netModal.name?.trim(),
      slug: (netModal.slug || slugify(netModal.name || "")).trim(),
      category: netModal.category || "FNO",
      color: netModal.color || "#22c55e",
      logoUrl: netModal.logoUrl || "",
      description: netModal.description || "",
      isActive: netModal.isActive ?? true,
      order: netModal.order ?? 0,
    };
    if (!payload.name || !payload.slug) { toast.error("Name and slug required"); return; }
    const res = await fetch(isNew ? "/api/networks" : `/api/networks/${netModal.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { toast.success(`Network ${isNew ? "created" : "updated"}`); setNetModal(null); load(); }
    else toast.error("Save failed (slug may be taken)");
  };

  const deleteNetwork = (n: Network) =>
    setConfirm({
      title: "Delete network",
      message: `Delete "${n.name}" and its ${n.packages.length} package(s)? Regions keep their data but unlink.`,
      onConfirm: async () => {
        const res = await fetch(`/api/networks/${n.id}`, { method: "DELETE" });
        if (res.ok) { toast.success("Network deleted"); load(); } else toast.error("Delete failed");
        setConfirm(null);
      },
    });

  // ── Package save ───────────────────────────────────────────────
  const savePackage = async () => {
    if (!pkgModal) return;
    const { networkId, pkg } = pkgModal;
    const isNew = !pkg.id;
    const payload = {
      name: pkg.name?.trim(),
      price: (pkg.price || "").trim(),
      speedDown: pkg.speedDown || "",
      speedUp: pkg.speedUp || "",
      period: pkg.period ?? "/month",
      features: (pkg.features || []).map((s) => s.trim()).filter(Boolean),
      maxDistanceM: pkg.maxDistanceM ?? null,
      kind: pkg.kind ?? "DATA",
      term: pkg.term ?? null,
      categoryId: pkg.categoryId ?? null,
      popular: pkg.popular ?? false,
      isActive: pkg.isActive ?? true,
      order: pkg.order ?? 0,
    };
    if (!payload.name || !payload.price) { toast.error("Name and price required"); return; }
    const url = isNew
      ? `/api/networks/${networkId}/packages`
      : `/api/networks/${networkId}/packages/${pkg.id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { toast.success(`Package ${isNew ? "added" : "updated"}`); setPkgModal(null); load(); }
    else toast.error("Save failed");
  };

  const deletePackage = (networkId: string, p: Pkg) =>
    setConfirm({
      title: "Delete package",
      message: `Delete "${p.name}"?`,
      onConfirm: async () => {
        const res = await fetch(`/api/networks/${networkId}/packages/${p.id}`, { method: "DELETE" });
        if (res.ok) { toast.success("Package deleted"); load(); } else toast.error("Delete failed");
        setConfirm(null);
      },
    });

  return (
    <>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <a href="/admin/features/coverage-maps" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-map me-1" />Coverage Maps
        </a>
        <button className="btn btn-primary btn-sm" onClick={() => setNetModal({ category: "FNO", color: "#22c55e", isActive: true })}>
          <i className="bi bi-plus-lg me-1" />Add Network
        </button>
      </div>

      {/* Service categories + value-added services control */}
      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <strong className="small"><i className="bi bi-tags me-1" />Service Categories</strong>
          <div className="form-check form-switch mb-0">
            <input className="form-check-input" type="checkbox" id="vas-toggle" checked={vasEnabled} onChange={(e) => toggleVas(e.target.checked)} />
            <label className="form-check-label small" htmlFor="vas-toggle">Show value-added services on the coverage map</label>
          </div>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {categories.map((c) => (
            <span key={c.id} className="badge text-bg-light border d-inline-flex align-items-center gap-1" style={{ fontSize: 12 }}>
              {c.name}
              <button type="button" className="btn-close" style={{ fontSize: 8 }} aria-label="Delete" onClick={() => deleteCategory(c)} />
            </span>
          ))}
          <div className="input-group input-group-sm" style={{ width: 220 }}>
            <input className="form-control" placeholder="New category (e.g. Voice)" value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }} />
            <button className="btn btn-outline-primary" onClick={addCategory}><i className="bi bi-plus-lg" /></button>
          </div>
        </div>
      </div></div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : networks.length === 0 ? (
        <div className="card shadow-sm"><div className="card-body text-center py-5">
          <i className="bi bi-diagram-3 display-4 text-muted" style={{ opacity: 0.3 }} />
          <h6 className="mt-3">No networks yet</h6>
          <p className="text-muted small">Add your provider networks (e.g. Sonic Fibre, Openserve, Sonic Wireless), then attach packages and link them to coverage polygons.</p>
        </div></div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {networks.map((n) => (
            <div key={n.id} className="card shadow-sm">
              <div className="card-body d-flex align-items-center gap-3 flex-wrap">
                <span style={{ width: 18, height: 18, borderRadius: 4, background: n.color, flexShrink: 0 }} />
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2">
                    <strong>{n.name}</strong>
                    <span className={`badge ${CATEGORY_BADGE[n.category]}`}>{n.category}</span>
                    {!n.isActive && <span className="badge text-bg-warning">Hidden</span>}
                  </div>
                  <small className="text-muted font-monospace">{n.slug}</small>
                </div>
                <div className="text-muted small text-nowrap">
                  {n.packages.length} pkg · {n._count?.regions ?? 0} polygon{(n._count?.regions ?? 0) !== 1 ? "s" : ""}
                </div>
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => toggle(n.id)}>
                    <i className={`bi bi-chevron-${expanded.has(n.id) ? "up" : "down"}`} /> Packages
                  </button>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => setNetModal(n)} title="Edit"><i className="bi bi-pencil" /></button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => deleteNetwork(n)} title="Delete"><i className="bi bi-trash" /></button>
                </div>
              </div>

              {expanded.has(n.id) && (
                <div className="card-body border-top bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Packages</h6>
                    <button className="btn btn-sm btn-primary" onClick={() => setPkgModal({ networkId: n.id, pkg: { period: "/month", features: [], isActive: true, kind: "DATA" } })}>
                      <i className="bi bi-plus-lg me-1" />Add Package
                    </button>
                  </div>
                  {n.packages.length === 0 ? (
                    <p className="text-muted small mb-0">No packages yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>Name</th><th>Speed</th><th>Price</th><th>Features</th><th></th></tr></thead>
                        <tbody>
                          {n.packages.map((p) => (
                            <tr key={p.id}>
                              <td>{p.name} {p.popular && <span className="badge text-bg-warning ms-1">Popular</span>} {!p.isActive && <span className="badge text-bg-secondary ms-1">Hidden</span>}</td>
                              <td className="small text-muted">{[p.speedDown, p.speedUp].filter(Boolean).join(" / ") || "—"}</td>
                              <td className="text-nowrap">{p.price}<span className="text-muted small">{p.period}</span></td>
                              <td className="small text-muted">{(p.features || []).length} feature(s)</td>
                              <td className="text-end text-nowrap">
                                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setPkgModal({ networkId: n.id, pkg: p })}><i className="bi bi-pencil" /></button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => deletePackage(n.id, p)}><i className="bi bi-trash" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Network modal */}
      {netModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setNetModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">{netModal.id ? "Edit" : "Add"} Network</h5>
                <button className="btn-close" onClick={() => setNetModal(null)} /></div>
              <div className="modal-body d-flex flex-column gap-3">
                <div><label className="form-label">Name</label>
                  <input className="form-control" value={netModal.name || ""} onChange={(e) => setNetModal({ ...netModal, name: e.target.value, slug: netModal.id ? netModal.slug : slugify(e.target.value) })} placeholder="e.g. Sonic Fibre" /></div>
                <div className="row">
                  <div className="col"><label className="form-label">Category</label>
                    <select className="form-select" value={netModal.category || "FNO"} onChange={(e) => setNetModal({ ...netModal, category: e.target.value as Category })}>
                      <option value="FNO">FNO (Fibre)</option><option value="WISP">WISP</option><option value="WIRELESS">Wireless</option>
                    </select></div>
                  <div className="col-auto"><label className="form-label">Colour</label>
                    <input type="color" className="form-control form-control-color" value={netModal.color || "#22c55e"} onChange={(e) => setNetModal({ ...netModal, color: e.target.value })} /></div>
                </div>
                <ImageFieldWithUpload
                  label="Logo (optional)"
                  value={netModal.logoUrl || ""}
                  onChange={(url) => setNetModal({ ...netModal, logoUrl: url })}
                  helpText="Browse the Media Library or upload — shown on the coverage result cards."
                  previewMaxHeight="60px"
                />
                <div><label className="form-label">Description <span className="text-muted">(optional)</span></label>
                  <textarea className="form-control" rows={2} value={netModal.description || ""} onChange={(e) => setNetModal({ ...netModal, description: e.target.value })} /></div>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="net-active" checked={netModal.isActive ?? true} onChange={(e) => setNetModal({ ...netModal, isActive: e.target.checked })} />
                  <label className="form-check-label" htmlFor="net-active">Active</label></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setNetModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveNetwork}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package modal */}
      {pkgModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setPkgModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">{pkgModal.pkg.id ? "Edit" : "Add"} Package</h5>
                <button className="btn-close" onClick={() => setPkgModal(null)} /></div>
              <div className="modal-body d-flex flex-column gap-3">
                <div><label className="form-label">Name</label>
                  <input className="form-control" value={pkgModal.pkg.name || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, name: e.target.value } })} placeholder="e.g. Home 50/50" /></div>
                <div className="row">
                  <div className="col"><label className="form-label">Kind</label>
                    <select className="form-select" value={pkgModal.pkg.kind ?? "DATA"} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, kind: e.target.value as "DATA" | "VAS", term: null } })}>
                      <option value="DATA">Data package (primary)</option>
                      <option value="VAS">Value-added service (add-on)</option>
                    </select></div>
                  <div className="col"><label className="form-label">Category</label>
                    <select className="form-select" value={pkgModal.pkg.categoryId ?? ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, categoryId: e.target.value || null } })}>
                      <option value="">— None —</option>
                      {categories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div>
                  <div className="col"><label className="form-label">Term</label>
                    <select className="form-select" value={pkgModal.pkg.term ?? ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, term: e.target.value || null } })}>
                      <option value="">— None —</option>
                      {TERMS[pkgModal.pkg.kind ?? "DATA"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select></div>
                </div>
                <div className="row">
                  <div className="col"><label className="form-label">Down</label>
                    <input className="form-control" value={pkgModal.pkg.speedDown || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, speedDown: e.target.value } })} placeholder="50 Mbps" /></div>
                  <div className="col"><label className="form-label">Up</label>
                    <input className="form-control" value={pkgModal.pkg.speedUp || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, speedUp: e.target.value } })} placeholder="50 Mbps" /></div>
                </div>
                <div className="row">
                  <div className="col"><label className="form-label">Price</label>
                    <input className="form-control" value={pkgModal.pkg.price || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, price: e.target.value } })} placeholder="R599" /></div>
                  <div className="col"><label className="form-label">Period</label>
                    <input className="form-control" value={pkgModal.pkg.period ?? "/month"} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, period: e.target.value } })} /></div>
                </div>
                <div><label className="form-label">Features</label>
                  {(pkgModal.pkg.features || []).map((f, i) => (
                    <div key={i} className="d-flex gap-2 mb-2">
                      <input className="form-control" value={f} placeholder="e.g. Uncapped"
                        onChange={(e) => { const next = [...(pkgModal.pkg.features || [])]; next[i] = e.target.value; setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, features: next } }); }} />
                      <button type="button" className="btn btn-outline-danger" title="Remove"
                        onClick={() => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, features: (pkgModal.pkg.features || []).filter((_, j) => j !== i) } })}>
                        <i className="bi bi-x-lg" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, features: [...(pkgModal.pkg.features || []), ""] } })}>
                    <i className="bi bi-plus-lg me-1" />Add feature
                  </button></div>
                <div><label className="form-label">Max distance from tower <span className="text-muted">(metres — leave blank for no limit)</span></label>
                  <input className="form-control" type="number" min={0} value={pkgModal.pkg.maxDistanceM ?? ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, maxDistanceM: e.target.value === "" ? null : parseInt(e.target.value, 10) } })} placeholder="e.g. 100 — only offered within 100m of a tower" />
                  <div className="form-text">Only show this package when the address is within this distance of one of the network&apos;s towers. Draws a ring around each tower on the map.</div></div>
                <div className="d-flex gap-4">
                  <div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="pkg-popular" checked={pkgModal.pkg.popular ?? false} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, popular: e.target.checked } })} /><label className="form-check-label" htmlFor="pkg-popular">Popular</label></div>
                  <div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="pkg-active" checked={pkgModal.pkg.isActive ?? true} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, isActive: e.target.checked } })} /><label className="form-check-label" htmlFor="pkg-active">Active</label></div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPkgModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={savePackage}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog isOpen title={confirm.title} message={confirm.message} variant="danger" confirmText="Delete"
          onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}
