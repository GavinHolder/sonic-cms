"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";
import type { VoltElementData } from "@/types/volt";
import { createNewVoltElement } from "@/lib/volt/volt-defaults";

const VoltStudio = dynamic(() => import("@/components/volt/VoltStudio"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}>
      <div className="text-muted small">⚡ Loading Volt Studio…</div>
    </div>
  ),
});

interface VoltListItem {
  id: string;
  name: string;
  mood?: string | null;
  elementType: string;
  isPublic: boolean;
  authorId: string;
  thumbnail?: string | null;
  updatedAt: string;
}

// Shell: AdminLayout provides ToastProvider + sidebar
export default function VoltAdminPage() {
  return (
    <AdminLayout
      title="Volt Studio"
      subtitle="Design vector elements for your website"
    >
      <Suspense><VoltLibrary /></Suspense>
    </AdminLayout>
  );
}

// Inner: renders inside ToastProvider context
function VoltLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const toast = useToast();
  const [volts, setVolts] = useState<VoltListItem[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingElement, setEditingElement] = useState<VoltElementData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, voltsRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/volt")]);
        if (!meRes.ok) { router.replace("/admin/login"); return; }
        const meJson = await meRes.json();
        const uid = meJson?.data?.user?.id ?? "";
        if (!uid) { router.replace("/admin/login"); return; }
        setUserId(uid);
        if (voltsRes.ok) {
          const { data } = await voltsRes.json();
          setVolts(data?.volts ?? []);
        }
        // Restore editing state from URL on refresh
        if (editId) {
          const res = await fetch(`/api/volt/${editId}`);
          if (res.ok) {
            const { data } = await res.json();
            setEditingElement(data.volt as VoltElementData);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, editId]);

  async function handleNew() {
    const el = createNewVoltElement(userId, "New Design");
    try {
      const res = await fetch("/api/volt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: el.name, layers: [], states: el.states, canvasWidth: el.canvasWidth, canvasHeight: el.canvasHeight }),
      });
      if (!res.ok) { toast.error("Failed to create Volt"); return; }
      const { data } = await res.json();
      router.replace(`/admin/volt?edit=${data.volt.id}`, { scroll: false });
      setEditingElement({ ...el, id: data.volt.id });
    } catch { toast.error("Failed to create Volt"); }
  }

  async function handleEdit(id: string) {
    try {
      const res = await fetch(`/api/volt/${id}`);
      if (!res.ok) { toast.error("Failed to load Volt"); return; }
      const { data } = await res.json();
      router.replace(`/admin/volt?edit=${id}`, { scroll: false });
      setEditingElement(data.volt as VoltElementData);
    } catch { toast.error("Failed to load Volt"); }
  }

  function handleDone() {
    router.replace("/admin/volt", { scroll: false });
    setEditingElement(null);
  }

  async function handleSave(element: VoltElementData) {
    try {
      const res = await fetch(`/api/volt/${element.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: element.name,
          layers: element.layers,
          states: element.states,
          isPublic: element.isPublic,
          mood: element.mood,
          elementType: element.elementType,
          thumbnail: element.thumbnail,
          flipCard: element.flipCard ?? null,
          designerData: element,
        }),
      });
      if (!res.ok) { toast.error("Failed to save Volt"); return; }
      setVolts(v => v.map(x => x.id === element.id ? { ...x, name: element.name, isPublic: element.isPublic, mood: element.mood ?? null, elementType: element.elementType, thumbnail: element.thumbnail ?? x.thumbnail } : x));
    } catch { toast.error("Failed to save Volt"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this Volt design?")) return;
    try {
      const res = await fetch(`/api/volt/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete Volt"); return; }
      setVolts(v => v.filter(x => x.id !== id));
      if (editingElement?.id === id) setEditingElement(null);
    } catch { toast.error("Failed to delete Volt"); }
  }

  // ── Studio overlay — covers everything including the sidebar ─────────────────
  if (editingElement) {
    return (
      <VoltStudio
        key={editingElement.id}
        initialElement={editingElement}
        authorId={userId}
        onSave={handleSave}
        onDone={handleDone}
      />
    );
  }

  // ── Library view ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="d-flex justify-content-end mb-4">
        <button onClick={handleNew} className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1" />New Design
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary spinner-border-sm" role="status" />
          <div className="text-muted mt-2 small">Loading designs…</div>
        </div>
      ) : volts.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-lightning-charge display-4 text-muted" style={{ opacity: 0.3 }} />
            <h6 className="mt-3">No Volt designs yet</h6>
            <p className="text-muted small">Create your first vector design to get started</p>
            <button onClick={handleNew} className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1" />Create First Design
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {volts.map(volt => (
            <div key={volt.id} className="col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
                <div className="card-img-top d-flex align-items-center justify-content-center overflow-hidden" style={{ height: 130, background: "#f8f9fa", position: "relative" }}>
                  {volt.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={volt.thumbnail}
                      alt={volt.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }}
                    />
                  ) : (
                    <i className="bi bi-lightning-charge" style={{ fontSize: 32, opacity: 0.2 }} />
                  )}
                </div>
                <div className="card-body p-3">
                  <h6 className="card-title text-truncate mb-1">{volt.name}</h6>
                  <div className="d-flex gap-1 mb-3 flex-wrap">
                    {volt.mood && (
                      <span className="badge rounded-pill text-secondary border border-secondary-subtle" style={{ fontSize: "0.6875rem" }}>
                        {volt.mood}
                      </span>
                    )}
                    <span className={`badge rounded-pill ${volt.isPublic ? "text-success border border-success-subtle" : "text-secondary border border-secondary-subtle"}`} style={{ fontSize: "0.6875rem" }}>
                      {volt.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <button onClick={() => handleEdit(volt.id)} className="btn btn-sm btn-outline-primary flex-fill">
                      <i className="bi bi-pencil me-1" />Edit
                    </button>
                    <button onClick={() => handleDelete(volt.id)} className="btn btn-sm btn-outline-danger" aria-label="Delete">
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
