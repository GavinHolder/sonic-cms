"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/ToastProvider";
import { fetchWithRefresh } from "@/lib/fetch-with-refresh";

interface NavItem {
  type: "section" | "page";
  id: string;
  label: string;
  href?: string;
  navOrder: number;
  displayName?: string;
}

export default function NavbarLinksEditor() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [available, setAvailable] = useState<NavItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes] = await Promise.all([fetch("/api/auth/me")]);
        if (!meRes.ok) { router.replace("/admin/login"); return; }

        const [linksRes, sectionsRes, pagesRes] = await Promise.all([
          fetch("/api/navbar-links"),
          fetch("/api/sections?pageSlug=/"),
          fetch("/api/pages"),
        ]);

        const linksData = linksRes.ok ? (await linksRes.json()).data ?? [] : [];
        const sectionsData = sectionsRes.ok ? (await sectionsRes.json()).data ?? [] : [];
        const pagesJson = pagesRes.ok ? await pagesRes.json() : null;
        const pagesData = pagesJson?.data?.pages ?? pagesJson?.data ?? [];

        const currentIds = new Set(linksData.map((l: NavItem) => l.id));
        setNavItems(linksData);

        const EXCLUDED_TYPES = ["HERO", "FOOTER", "CTA_FOOTER"];
        const availSections: NavItem[] = sectionsData
          .filter((s: any) => s.enabled && !EXCLUDED_TYPES.includes(s.type) && !currentIds.has(s.id))
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((s: any) => ({
            type: "section" as const,
            id: s.id,
            label: (s.navLabel || s.displayName || "").split(" ")[0] || s.type,
            displayName: s.displayName || s.type,
            navOrder: 99,
          }));
        const availPages: NavItem[] = pagesData
          .filter((p: any) => p.enabled && p.slug !== "/" && !currentIds.has(p.id))
          .map((p: any) => ({
            type: "page" as const,
            id: p.id,
            label: p.navLabel || p.title || p.slug,
            href: `/${p.slug}`,
            displayName: p.title || p.slug,
            navOrder: 99,
          }));
        setAvailable([...availSections, ...availPages]);
        setLoading(false);
      } catch (err) {
        console.error("navbar-links load error:", err);
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function addToNav(item: NavItem) {
    if (navItems.length >= 5) { toast.warning("Maximum 5 navbar links. Remove one first."); return; }
    setNavItems((prev) => [...prev, { ...item, navOrder: prev.length }]);
    setAvailable((prev) => prev.filter((a) => a.id !== item.id));
  }

  function removeFromNav(id: string) {
    const item = navItems.find((n) => n.id === id);
    if (!item) return;
    setNavItems((prev) => prev.filter((n) => n.id !== id).map((n, i) => ({ ...n, navOrder: i })));
    setAvailable((prev) => [...prev, { ...item, navOrder: 99 }]);
  }

  function updateLabel(id: string, label: string) {
    setNavItems((prev) => prev.map((n) => n.id === id ? { ...n, label } : n));
  }

  function handleDragStart(index: number) { setDragIndex(index); }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...navItems];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setNavItems(reordered.map((n, i) => ({ ...n, navOrder: i })));
    setDragIndex(index);
  }
  function handleDragEnd() { setDragIndex(null); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetchWithRefresh("/api/navbar-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: navItems.map((n, i) => ({ ...n, navOrder: i })) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Navbar links saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-4"><div className="spinner-border spinner-border-sm text-primary" role="status" /></div>;
  }

  return (
    <div className="d-flex flex-column gap-3">
      {/* In Navbar */}
      <div>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="small fw-semibold text-muted">
            <i className="bi bi-layout-navbar me-1" />Active links — {navItems.length}/5
          </span>
          <button className="btn btn-sm btn-primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="bi bi-check2 me-1" />Save</>}
          </button>
        </div>
        {navItems.length === 0 ? (
          <div className="text-muted small py-2 text-center border rounded" style={{ background: "#f8f9fa" }}>
            <i className="bi bi-info-circle me-1" />No links configured — using default (first 5 landing sections).
          </div>
        ) : (
          <div className="d-flex flex-column gap-1">
            {navItems.map((item, i) => (
              <div key={item.id}
                draggable onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)} onDragEnd={handleDragEnd}
                className="d-flex align-items-center gap-2 p-2 rounded border"
                style={{ background: dragIndex === i ? "#eff6ff" : "#fff", cursor: "grab", borderColor: dragIndex === i ? "#3b82f6" : "#dee2e6" }}>
                <i className="bi bi-grip-vertical text-muted flex-shrink-0" />
                <span className="badge flex-shrink-0" style={{ background: item.type === "page" ? "#6f42c1" : "#0d6efd", fontSize: "0.65rem" }}>
                  {item.type === "page" ? "PAGE" : "SECTION"}
                </span>
                <input className="form-control form-control-sm" style={{ maxWidth: 140, fontSize: "0.8rem" }}
                  value={item.label} onChange={(e) => updateLabel(item.id, e.target.value)} placeholder="Label…" />
                {item.href && <span className="text-muted small text-truncate flex-grow-1">{item.href}</span>}
                <button className="btn btn-sm btn-outline-danger ms-auto flex-shrink-0" onClick={() => removeFromNav(item.id)}>
                  <i className="bi bi-x" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available */}
      {available.length > 0 && (
        <div>
          <div className="small fw-semibold text-muted mb-2">
            <i className="bi bi-list-ul me-1" />Available to add
          </div>
          <div className="d-flex flex-column gap-1">
            {available.map((item) => (
              <div key={item.id} className="d-flex align-items-center gap-2 p-2 rounded" style={{ background: "#f8f9fa" }}>
                <span className="badge flex-shrink-0" style={{ background: item.type === "page" ? "#6f42c1" : "#6c757d", fontSize: "0.65rem" }}>
                  {item.type === "page" ? "PAGE" : "SECTION"}
                </span>
                <span className="small fw-medium flex-grow-1">{item.displayName || item.label}</span>
                {item.href && <span className="text-muted small">{item.href}</span>}
                <button className="btn btn-sm btn-outline-primary flex-shrink-0" onClick={() => addToNav(item)} disabled={navItems.length >= 5}>
                  <i className="bi bi-plus me-1" />Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
