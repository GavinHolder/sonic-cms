"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ImageFieldWithUpload from "@/components/admin/ImageFieldWithUpload";

type Category = "FNO" | "WISP" | "WIRELESS" | "VOICE";

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
  productTypeId?: string | null;
}
interface ServiceCategory { id: string; name: string; order: number; isActive: boolean; }
interface PackageTerm {
  id: string;
  name: string;
  kind: "DATA" | "VAS";
  billsMonthly: boolean;
  order: number;
  isActive: boolean;
}
interface ProductType {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color: string;
  order: number;
  isActive: boolean;
  // Optional link to the ServiceCategory this product type is grouped under (e.g.
  // "AirFibre" -> "Wireless"). Unassigned (null) by default — drives the top-level
  // grouping fallback in CardTabsBlock/ProductGridBlock (serviceCategorySlug ?? productTypeSlug).
  serviceCategoryId?: string | null;
}

// The billing-period suffix shown next to price (e.g. "R599/month") is derived
// from Term instead of being a free-text field — Term already IS the contract
// period, so a separate manually-typed value was redundant and error-prone
// (e.g. someone typing "24" instead of "/month" ran the digits straight into
// the price with no separator). Term options themselves are admin-managed
// (PackageTerm, see prisma/schema.prisma) — this looks up the live list by
// name (Package.term stays a plain string, no FK).
//
// ASSUMPTIONS:
// 1. `terms` is the live PackageTerm list for the relevant kind (or the full list —
//    matching is by name only, kind isn't consulted here).
// 2. `term` is the raw Package.term string, which may not match any current
//    PackageTerm row (renamed/deleted term, or legacy data).
//
// FAILURE MODES:
// - No term selected (null/empty) → once-off price, no suffix. Correct: an
//   unspecified term shouldn't imply a recurring bill.
// - Term set but matches no PackageTerm row (stale/renamed/deleted) → falls back to
//   "/month". This direction is deliberate: silently mislabeling a real recurring
//   price as once-off is the more damaging failure (undercuts the displayed price),
//   whereas defaulting to the far-more-common monthly case is a safe assumption.
function termToPeriod(term: string | null | undefined, terms: PackageTerm[]): string {
  if (!term) return "";
  const match = terms.find((t) => t.name === term);
  return !match || match.billsMonthly ? "/month" : "";
}
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
  VOICE: "text-bg-danger",
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
  // termVariants: "Term Variants" quick-add (see savePackage) — a list of extra
  // (term, price) pairs that each become their own *sibling* Package row on save,
  // sharing every other field with the main form. Available in both Add and Edit:
  // in Add, the variants are created alongside the package being created; in Edit,
  // they're created alongside the package being edited (which keeps its own single
  // term/price, edited normally via the Term/Price fields above — a variant row
  // never rewrites the package being edited itself).
  // `features`: optional per-variant override — undefined means "inherit the shared
  // Features list from the main form" (the common case, e.g. Prepaid vs 24-Month
  // often differ in inclusions/caps); set means "use this variant's own list".
  const [pkgModal, setPkgModal] = useState<{ networkId: string; pkg: Partial<Pkg>; termVariants?: { term: string; price: string; features?: string[] }[] } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [vasEnabled, setVasEnabled] = useState(false);

  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [ptModal, setPtModal] = useState<Partial<ProductType> | null>(null);

  const [packageTerms, setPackageTerms] = useState<PackageTerm[]>([]);
  const [termModal, setTermModal] = useState<Partial<PackageTerm> | null>(null);

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

  const loadProductTypes = useCallback(async () => {
    try { const r = await fetch("/api/product-types"); if (r.ok) setProductTypes(await r.json()); } catch { /* ignore */ }
  }, []);

  const loadPackageTerms = useCallback(async () => {
    try { const r = await fetch("/api/package-terms"); if (r.ok) setPackageTerms(await r.json()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadCategories(); loadProductTypes(); loadPackageTerms(); }, [load, loadCategories, loadProductTypes, loadPackageTerms]);
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

  // ── Product Types (Product Card Grid Layer 1 scope) ──────────────────────────
  const saveProductType = async () => {
    if (!ptModal) return;
    const isNew = !ptModal.id;
    const payload = {
      name: ptModal.name?.trim(),
      slug: ptModal.slug,
      icon: ptModal.icon || "",
      color: ptModal.color || "#22c55e",
      order: ptModal.order ?? 0,
      isActive: ptModal.isActive ?? true,
      serviceCategoryId: ptModal.serviceCategoryId || "",
    };
    if (!payload.name) { toast.error("Name required"); return; }
    const res = await fetch(isNew ? "/api/product-types" : `/api/product-types/${ptModal.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { toast.success(`Product type ${isNew ? "created" : "updated"}`); setPtModal(null); loadProductTypes(); }
    else toast.error("Save failed");
  };

  const deleteProductType = (pt: ProductType) =>
    setConfirm({ title: "Delete product type", message: `Delete "${pt.name}"? Packages using it become unassigned.`, onConfirm: async () => {
      const res = await fetch(`/api/product-types/${pt.id}`, { method: "DELETE" });
      if (res.ok) { loadProductTypes(); toast.success("Product type deleted"); } else toast.error("Delete failed");
      setConfirm(null);
    } });

  // ── Package Terms (admin-managed, replaces the old hardcoded TERMS constant) ─
  const saveTerm = async () => {
    if (!termModal) return;
    const isNew = !termModal.id;
    const payload = {
      name: termModal.name?.trim(),
      kind: termModal.kind ?? "DATA",
      billsMonthly: termModal.billsMonthly ?? true,
      order: termModal.order ?? 0,
      isActive: termModal.isActive ?? true,
    };
    if (!payload.name) { toast.error("Name required"); return; }
    const res = await fetch(isNew ? "/api/package-terms" : `/api/package-terms/${termModal.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { toast.success(`Term ${isNew ? "created" : "updated"}`); setTermModal(null); loadPackageTerms(); }
    else toast.error("Save failed");
  };

  const deleteTerm = (t: PackageTerm) =>
    setConfirm({ title: "Delete term", message: `Delete "${t.name}"? Packages using it keep their term text but it stops matching this option.`, onConfirm: async () => {
      const res = await fetch(`/api/package-terms/${t.id}`, { method: "DELETE" });
      if (res.ok) { loadPackageTerms(); toast.success("Term deleted"); } else toast.error("Delete failed");
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
    const { networkId, pkg, termVariants } = pkgModal;
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
      productTypeId: pkg.productTypeId ?? null,
      popular: pkg.popular ?? false,
      isActive: pkg.isActive ?? true,
      order: pkg.order ?? 0,
      // Moving an existing package to a different network. Ignored by the POST (add)
      // route — the target network there is already fixed by the URL — but the PUT
      // (edit) route applies it, letting the admin re-parent a package (e.g. a Voice
      // package created under a WISP network by mistake) without deleting/recreating it.
      networkId,
    };
    if (!payload.name || !payload.price) { toast.error("Name and price required"); return; }

    // Term Variants quick-add (Add and Edit — see modal JSX below): each completed
    // extra (term, price) row becomes its own separate sibling Package row, sharing
    // every other field with the main form via `payload` (never rewrites the package
    // being edited itself — that one is saved normally above via `payload`/`url`).
    // Validate up front so a half-filled row (term picked but no price, or vice
    // versa) doesn't silently vanish instead of erroring.
    const variants = termVariants || [];
    for (const v of variants) {
      if (!!v.term !== !!v.price.trim()) {
        toast.error("Complete or remove the incomplete term variant row (needs both a term and a price)");
        return;
      }
    }
    const completeVariants = variants.filter((v) => v.term && v.price.trim());

    const url = isNew
      ? `/api/networks/${networkId}/packages`
      : `/api/networks/${networkId}/packages/${pkg.id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error("Save failed"); return; }

    let variantFailures = 0;
    if (completeVariants.length > 0) {
      const results = await Promise.all(
        completeVariants.map((v) =>
          fetch(`/api/networks/${networkId}/packages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              term: v.term,
              price: v.price.trim(),
              period: termToPeriod(v.term, packageTerms),
              // Shared unless overridden — same pattern as term/price per row. A
              // variant only carries its own `features` once the admin has touched
              // that row's "Customize features" toggle in the modal.
              features: (v.features ?? payload.features).map((s) => s.trim()).filter(Boolean),
            }),
          })
        )
      );
      variantFailures = results.filter((r) => !r.ok).length;
    }

    if (variantFailures > 0) {
      toast.error(`Package ${isNew ? "added" : "updated"}, but ${variantFailures} term variant(s) failed to save`);
    } else {
      const variantNote = completeVariants.length > 0 ? ` + ${completeVariants.length} term variant(s)` : "";
      toast.success(`Package ${isNew ? "added" : "updated"}${variantNote}`);
    }
    setPkgModal(null);
    load();
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

      {/* Product types (Product Card Grid Layer 1 scope) */}
      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <strong className="small"><i className="bi bi-grid-3x3-gap me-1" />Product Types</strong>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setPtModal({ color: "#22c55e", isActive: true, order: productTypes.length })}>
            <i className="bi bi-plus-lg me-1" />Add Product Type
          </button>
        </div>
        {productTypes.length === 0 ? (
          <p className="text-muted small mb-0">No product types yet — add one to enable the Product Card Grid block in the Designer.</p>
        ) : (
          <div className="d-flex flex-wrap align-items-center gap-2">
            {productTypes.map((pt) => (
              <span key={pt.id} className="badge text-bg-light border d-inline-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: pt.color, display: "inline-block" }} />
                {pt.icon ? <i className={pt.icon} /> : null}
                {pt.name}
                {pt.serviceCategoryId && (
                  <span className="text-muted">→ {categories.find((c) => c.id === pt.serviceCategoryId)?.name ?? "…"}</span>
                )}
                {!pt.isActive && <span className="text-muted">(hidden)</span>}
                <button type="button" className="btn btn-sm btn-link p-0 ms-1" style={{ fontSize: 11, lineHeight: 1 }} aria-label="Edit" onClick={() => setPtModal(pt)}><i className="bi bi-pencil" /></button>
                <button type="button" className="btn-close" style={{ fontSize: 8 }} aria-label="Delete" onClick={() => deleteProductType(pt)} />
              </span>
            ))}
          </div>
        )}
      </div></div>

      {/* Package Terms (admin-managed, drives the Term dropdown + billing-period suffix) */}
      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <strong className="small"><i className="bi bi-calendar3 me-1" />Package Terms</strong>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setTermModal({ kind: "DATA", billsMonthly: true, isActive: true, order: packageTerms.length })}>
            <i className="bi bi-plus-lg me-1" />Add Term
          </button>
        </div>
        {packageTerms.length === 0 ? (
          <p className="text-muted small mb-0">No terms yet — add the contract-term options packages can be set to (e.g. 24-Month, Prepaid).</p>
        ) : (
          <div className="d-flex flex-wrap align-items-center gap-2">
            {packageTerms.map((t) => (
              <span key={t.id} className="badge text-bg-light border d-inline-flex align-items-center gap-1" style={{ fontSize: 12 }}>
                <span className="text-muted">{t.kind}</span>
                {t.name}
                <span className="text-muted">{t.billsMonthly ? "/month" : "once-off"}</span>
                {!t.isActive && <span className="text-muted">(hidden)</span>}
                <button type="button" className="btn btn-sm btn-link p-0 ms-1" style={{ fontSize: 11, lineHeight: 1 }} aria-label="Edit" onClick={() => setTermModal(t)}><i className="bi bi-pencil" /></button>
                <button type="button" className="btn-close" style={{ fontSize: 8 }} aria-label="Delete" onClick={() => deleteTerm(t)} />
              </span>
            ))}
          </div>
        )}
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
                    <button className="btn btn-sm btn-primary" onClick={() => setPkgModal({ networkId: n.id, pkg: { period: termToPeriod(null, packageTerms), features: [], isActive: true, kind: "DATA" }, termVariants: [] })}>
                      <i className="bi bi-plus-lg me-1" />Add Package
                    </button>
                  </div>
                  {n.packages.length === 0 ? (
                    <p className="text-muted small mb-0">No packages yet.</p>
                  ) : (() => {
                    const isVoicePkg = (p: Pkg) => categories.find((c) => c.id === p.categoryId)?.name?.trim().toLowerCase() === "voice";
                    const hasVoicePkg = n.packages.some(isVoicePkg);
                    return (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>Name</th><th>Speed</th>{hasVoicePkg && <th>Bundle</th>}<th>Term</th><th>Price</th><th>Features</th><th></th></tr></thead>
                        <tbody>
                          {n.packages.map((p) => (
                            <tr key={p.id}>
                              <td>{p.name} {p.popular && <span className="badge text-bg-warning ms-1">Popular</span>} {!p.isActive && <span className="badge text-bg-secondary ms-1">Hidden</span>}</td>
                              <td className="small text-muted">{isVoicePkg(p) ? "—" : ([p.speedDown, p.speedUp].filter(Boolean).join(" / ") || "—")}</td>
                              {hasVoicePkg && <td className="small text-muted">{isVoicePkg(p) ? (p.speedDown || "—") : "—"}</td>}
                              <td>{p.term ? <span className="badge text-bg-light border">{p.term}</span> : <span className="text-muted small">—</span>}</td>
                              <td className="text-nowrap">{p.price}{p.period && <span className="text-muted small"> {p.period}</span>}</td>
                              <td className="small text-muted">{(p.features || []).length} feature(s)</td>
                              <td className="text-end text-nowrap">
                                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setPkgModal({ networkId: n.id, pkg: p })} title="Edit"><i className="bi bi-pencil" /></button>
                                <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => { const { id: _id, ...rest } = p; setPkgModal({ networkId: n.id, pkg: { ...rest, name: `${p.name} (copy)`, popular: false } }); }} title="Duplicate"><i className="bi bi-copy" /></button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => deletePackage(n.id, p)} title="Delete"><i className="bi bi-trash" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    );
                  })()}
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
                      <option value="FNO">FNO (Fibre)</option><option value="WISP">WISP</option><option value="WIRELESS">Wireless</option><option value="VOICE">Voice</option>
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

      {/* Product type modal */}
      {ptModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setPtModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">{ptModal.id ? "Edit" : "Add"} Product Type</h5>
                <button className="btn-close" onClick={() => setPtModal(null)} /></div>
              <div className="modal-body d-flex flex-column gap-3">
                <div><label className="form-label">Name</label>
                  <input className="form-control" value={ptModal.name || ""} onChange={(e) => setPtModal({ ...ptModal, name: e.target.value })} placeholder="e.g. Fibre" /></div>
                <div><label className="form-label">Service Category <span className="text-muted">(optional — groups this product type under a top-level tab, e.g. &quot;AirFibre&quot; under &quot;Wireless&quot;)</span></label>
                  <select className="form-select" value={ptModal.serviceCategoryId || ""} onChange={(e) => setPtModal({ ...ptModal, serviceCategoryId: e.target.value || null })}>
                    <option value="">— Unassigned (its own top-level tab) —</option>
                    {categories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div className="row">
                  <div className="col"><label className="form-label">Icon <span className="text-muted">(optional Bootstrap Icons class)</span></label>
                    <input className="form-control" value={ptModal.icon || ""} onChange={(e) => setPtModal({ ...ptModal, icon: e.target.value })} placeholder="bi bi-wifi" /></div>
                  <div className="col-auto"><label className="form-label">Colour</label>
                    <input type="color" className="form-control form-control-color" value={ptModal.color || "#22c55e"} onChange={(e) => setPtModal({ ...ptModal, color: e.target.value })} /></div>
                  <div className="col-auto" style={{ width: 90 }}><label className="form-label">Order</label>
                    <input className="form-control" type="number" value={ptModal.order ?? 0} onChange={(e) => setPtModal({ ...ptModal, order: parseInt(e.target.value, 10) || 0 })} /></div>
                </div>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="pt-active" checked={ptModal.isActive ?? true} onChange={(e) => setPtModal({ ...ptModal, isActive: e.target.checked })} />
                  <label className="form-check-label" htmlFor="pt-active">Active</label></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPtModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveProductType}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Term modal */}
      {termModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setTermModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">{termModal.id ? "Edit" : "Add"} Term</h5>
                <button className="btn-close" onClick={() => setTermModal(null)} /></div>
              <div className="modal-body d-flex flex-column gap-3">
                <div><label className="form-label">Name</label>
                  <input className="form-control" value={termModal.name || ""} onChange={(e) => setTermModal({ ...termModal, name: e.target.value })} placeholder="e.g. 24-Month" /></div>
                <div className="row">
                  <div className="col"><label className="form-label">Kind <span className="text-muted">(which package Kind this term applies to)</span></label>
                    <select className="form-select" value={termModal.kind ?? "DATA"} onChange={(e) => setTermModal({ ...termModal, kind: e.target.value as "DATA" | "VAS" })}>
                      <option value="DATA">Data package (primary)</option>
                      <option value="VAS">Value-added service (add-on)</option>
                    </select></div>
                  <div className="col-auto" style={{ width: 90 }}><label className="form-label">Order</label>
                    <input className="form-control" type="number" value={termModal.order ?? 0} onChange={(e) => setTermModal({ ...termModal, order: parseInt(e.target.value, 10) || 0 })} /></div>
                </div>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="term-bills-monthly" checked={termModal.billsMonthly ?? true} onChange={(e) => setTermModal({ ...termModal, billsMonthly: e.target.checked })} />
                  <label className="form-check-label" htmlFor="term-bills-monthly">Bills monthly <span className="text-muted">(off = once-off price, no &quot;/month&quot; suffix — e.g. Prepaid)</span></label></div>
                <div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="term-active" checked={termModal.isActive ?? true} onChange={(e) => setTermModal({ ...termModal, isActive: e.target.checked })} />
                  <label className="form-check-label" htmlFor="term-active">Active</label></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setTermModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveTerm}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package modal */}
      {pkgModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setPkgModal(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">{pkgModal.pkg.id ? "Edit" : "Add"} Package</h5>
                <button className="btn-close" onClick={() => setPkgModal(null)} /></div>
              <div className="modal-body d-flex flex-column gap-3">
                <div className="row">
                  <div className="col-8"><label className="form-label">Name</label>
                    <input className="form-control" value={pkgModal.pkg.name || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, name: e.target.value } })} placeholder="e.g. Home 50/50" /></div>
                  <div className="col-4"><label className="form-label">Network</label>
                    <select className="form-select" value={pkgModal.networkId} onChange={(e) => setPkgModal({ ...pkgModal, networkId: e.target.value })}>
                      {networks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                    {pkgModal.pkg.id && <div className="form-text">Changing this moves the package to the selected network.</div>}</div>
                </div>
                <div className="row">
                  <div className="col-3"><label className="form-label">Kind</label>
                    <select className="form-select" value={pkgModal.pkg.kind ?? "DATA"} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, kind: e.target.value as "DATA" | "VAS", term: null, period: termToPeriod(null, packageTerms) }, termVariants: [] })}>
                      <option value="DATA">Data package (primary)</option>
                      <option value="VAS">Value-added service (add-on)</option>
                    </select></div>
                  <div className="col-3"><label className="form-label">Category</label>
                    <select className="form-select" value={pkgModal.pkg.categoryId ?? ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, categoryId: e.target.value || null } })}>
                      <option value="">— None —</option>
                      {categories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div>
                  <div className="col-6"><label className="form-label">Term <span className="text-muted">(also sets the billing period shown next to price)</span></label>
                    <select className="form-select" value={pkgModal.pkg.term ?? ""} onChange={(e) => { const term = e.target.value || null; setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, term, period: termToPeriod(term, packageTerms) } }); }}>
                      <option value="">— None —</option>
                      {packageTerms.filter((t) => t.isActive && t.kind === (pkgModal.pkg.kind ?? "DATA")).map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select></div>
                </div>
                <div className="row">
                  <div className="col"><label className="form-label">Product Type <span className="text-muted">(optional — for the Product Card Grid block)</span></label>
                    <select className="form-select" value={pkgModal.pkg.productTypeId ?? ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, productTypeId: e.target.value || null } })}>
                      <option value="">— None —</option>
                      {productTypes.filter((pt) => pt.isActive).map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                    </select></div>
                </div>
                {categories.find((c) => c.id === pkgModal.pkg.categoryId)?.name?.trim().toLowerCase() === "voice" ? (
                  <div className="row">
                    <div className="col"><label className="form-label">Airtime / Minutes Bundle</label>
                      <input className="form-control" value={pkgModal.pkg.speedDown || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, speedDown: e.target.value, speedUp: "" } })} placeholder="e.g. 100 minutes, or Unlimited" /></div>
                  </div>
                ) : (
                  <div className="row">
                    <div className="col"><label className="form-label">Down</label>
                      <input className="form-control" value={pkgModal.pkg.speedDown || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, speedDown: e.target.value } })} placeholder="50 Mbps" /></div>
                    <div className="col"><label className="form-label">Up</label>
                      <input className="form-control" value={pkgModal.pkg.speedUp || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, speedUp: e.target.value } })} placeholder="50 Mbps" /></div>
                  </div>
                )}
                <div className="row">
                  <div className="col"><label className="form-label">Price</label>
                    <input className="form-control" value={pkgModal.pkg.price || ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, price: e.target.value } })} placeholder="R599" />
                    <div className="form-text">Billing period shown next to price: <strong>{termToPeriod(pkgModal.pkg.term, packageTerms) || "none (once-off)"}</strong> — set by Term above.</div></div>
                </div>
                {/* Term Variants quick-add — available in both Add and Edit. Lets the admin
                    fill in every shared field once (name, speed, network, product type,
                    category, and the Features list below unless overridden per-row) and
                    add multiple (term, price) pairs; each is saved as its own separate
                    *sibling* Package row on submit (same total rows as doing it manually
                    N times). This never rewrites the package being edited itself — that
                    one keeps its own single Term/Price/Features, edited normally via the
                    fields above — it only adds more term coverage for the same product. */}
                <div className="border rounded p-3 bg-light">
                  <strong className="small d-block mb-2">Term Variants <span className="text-muted fw-normal">— optional: add more (term, price) pairs for this same product; each is saved as its own package</span></strong>
                  {(pkgModal.termVariants || []).map((v, i) => {
                    const customized = v.features !== undefined;
                    const variantFeatures = v.features ?? pkgModal.pkg.features ?? [];
                    const updateVariant = (patch: Partial<{ term: string; price: string; features?: string[] }>) => {
                      const next = [...(pkgModal.termVariants || [])];
                      next[i] = { ...next[i], ...patch };
                      setPkgModal({ ...pkgModal, termVariants: next });
                    };
                    return (
                      <div key={i} className="mb-2">
                        <div className="row g-2 align-items-center">
                          <div className="col-5">
                            <select className="form-select form-select-sm" value={v.term}
                              onChange={(e) => updateVariant({ term: e.target.value })}>
                              <option value="">— Term —</option>
                              {packageTerms.filter((t) => t.isActive && t.kind === (pkgModal.pkg.kind ?? "DATA")).map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                          </div>
                          <div className="col-5">
                            <input className="form-control form-control-sm" placeholder="Price, e.g. R699" value={v.price}
                              onChange={(e) => updateVariant({ price: e.target.value })} />
                          </div>
                          <div className="col-2 text-end">
                            <button type="button" className="btn btn-sm btn-outline-danger" title="Remove"
                              onClick={() => setPkgModal({ ...pkgModal, termVariants: (pkgModal.termVariants || []).filter((_, j) => j !== i) })}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </div>
                        </div>
                        {!customized ? (
                          <button type="button" className="btn btn-sm btn-link p-0 mt-1"
                            onClick={() => updateVariant({ features: [...(pkgModal.pkg.features || [])] })}>
                            Customize features for this term <span className="text-muted">(currently using the shared list above)</span>
                          </button>
                        ) : (
                          <div className="ps-2 border-start mt-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="small text-muted">Features for this term</span>
                              <button type="button" className="btn btn-sm btn-link p-0" onClick={() => updateVariant({ features: undefined })}>
                                Use shared features instead
                              </button>
                            </div>
                            {variantFeatures.map((f, fi) => (
                              <div key={fi} className="d-flex gap-2 mb-2">
                                <input className="form-control form-control-sm" value={f} placeholder="e.g. Uncapped"
                                  onChange={(e) => { const next = [...variantFeatures]; next[fi] = e.target.value; updateVariant({ features: next }); }} />
                                <button type="button" className="btn btn-sm btn-outline-danger" title="Remove"
                                  onClick={() => updateVariant({ features: variantFeatures.filter((_, j) => j !== fi) })}>
                                  <i className="bi bi-x-lg" />
                                </button>
                              </div>
                            ))}
                            <button type="button" className="btn btn-sm btn-outline-secondary"
                              onClick={() => updateVariant({ features: [...variantFeatures, ""] })}>
                              <i className="bi bi-plus-lg me-1" />Add feature
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPkgModal({ ...pkgModal, termVariants: [...(pkgModal.termVariants || []), { term: "", price: "" }] })}>
                    <i className="bi bi-plus-lg me-1" />Add another term
                  </button>
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
                {(() => {
                  const netCat = networks.find((n) => n.id === pkgModal.networkId)?.category;
                  // Tower-distance gating only makes sense for the tower-based delivery
                  // categories (WISP/WIRELESS). FNO (fibre) and VOICE aren't tower-proximity
                  // services, so neither should show this field — previously this was
                  // `!== "FNO"`, which (before VOICE existed) happened to be equivalent to
                  // "WISP or WIRELESS", but adding VOICE as a third non-tower category broke
                  // that shortcut.
                  return netCat === "WISP" || netCat === "WIRELESS";
                })() && (
                  <div><label className="form-label">Max distance from tower <span className="text-muted">(metres — leave blank for no limit)</span></label>
                    <input className="form-control" type="number" min={0} value={pkgModal.pkg.maxDistanceM ?? ""} onChange={(e) => setPkgModal({ ...pkgModal, pkg: { ...pkgModal.pkg, maxDistanceM: e.target.value === "" ? null : parseInt(e.target.value, 10) } })} placeholder="e.g. 100 — only offered within 100m of a tower" />
                    <div className="form-text">Only show this package when the address is within this distance of one of the network&apos;s towers. Draws a ring around each tower on the map.</div></div>
                )}
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
