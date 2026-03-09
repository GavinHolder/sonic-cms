"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import type { VoltElementData } from "@/types/volt";
import { createNewVoltElement } from "@/lib/volt/volt-defaults";

const VoltStudio = dynamic(() => import("@/components/volt/VoltStudio"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 14 }}>Loading Volt Studio…</div>
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoltListItem {
  id: string;
  name: string;
  mood?: string | null;
  elementType: string;
  isPublic: boolean;
  authorId: string;
  updatedAt: string;
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function VoltAdminPage() {
  return (
    <VoltAdminInner />
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function VoltAdminInner() {
  const [volts, setVolts] = useState<VoltListItem[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingElement, setEditingElement] = useState<VoltElementData | null>(null);

  // Load current user + volt list on mount
  useEffect(() => {
    async function load() {
      try {
        const [meRes, voltsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/volt?public=true"),
        ]);
        if (meRes.ok) {
          const meJson = await meRes.json();
          setUserId(meJson?.data?.user?.id ?? "");
        }
        if (voltsRes.ok) {
          const { data } = await voltsRes.json();
          setVolts(data?.volts ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleNew() {
    const el = createNewVoltElement(userId, "New Design");
    const res = await fetch("/api/volt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: el.name,
        layers: [],
        states: el.states,
        canvasWidth: el.canvasWidth,
        canvasHeight: el.canvasHeight,
      }),
    });
    if (!res.ok) return;
    const { data } = await res.json();
    setEditingElement({ ...el, id: data.volt.id });
  }

  async function handleEdit(id: string) {
    const res = await fetch(`/api/volt/${id}`);
    if (!res.ok) return;
    const { data } = await res.json();
    setEditingElement(data.volt as VoltElementData);
  }

  async function handleSave(element: VoltElementData) {
    await fetch(`/api/volt/${element.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: element.name,
        layers: element.layers,
        states: element.states,
        isPublic: element.isPublic,
        mood: element.mood,
        elementType: element.elementType,
      }),
    });
    setVolts((v) =>
      v.map((x) => (x.id === element.id ? { ...x, name: element.name } : x))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this Volt design?")) return;
    await fetch(`/api/volt/${id}`, { method: "DELETE" });
    setVolts((v) => v.filter((x) => x.id !== id));
    if (editingElement?.id === id) setEditingElement(null);
  }

  // ─── Full-screen studio overlay ────────────────────────────────────────────

  if (editingElement) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
        <VoltStudio
          initialElement={editingElement}
          authorId={userId}
          onSave={handleSave}
        />
        <button
          onClick={() => setEditingElement(null)}
          style={{
            position: "fixed",
            top: 12,
            right: 72,
            zIndex: 1001,
            background: "#1e1e3a",
            border: "1px solid #2d2d44",
            borderRadius: 6,
            color: "#94a3b8",
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ← Back to Library
        </button>
      </div>
    );
  }

  // ─── Library view ───────────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="Volt Studio"
      subtitle="Design vector elements for your website"
      actions={
        <button onClick={handleNew} className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-2" />
          New Design
        </button>
      }
    >
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          Loading designs…
        </div>
      ) : volts.length === 0 ? (
        <div className="text-center py-5">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h5 className="text-muted">No Volt designs yet</h5>
          <p className="text-muted mb-4">Create your first vector design to get started</p>
          <button onClick={handleNew} className="btn btn-primary">
            Create First Design
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {volts.map((volt) => (
            <div key={volt.id} className="col-md-4 col-lg-3">
              <div
                className="card h-100"
                style={{ background: "#12122a", border: "1px solid #1e1e3a" }}
              >
                {/* Preview placeholder */}
                <div
                  style={{
                    height: 140,
                    background: "#0a0a1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px 8px 0 0",
                  }}
                >
                  <span style={{ fontSize: 32 }}>⚡</span>
                </div>

                <div className="card-body">
                  <h6 className="card-title text-white mb-1">{volt.name}</h6>
                  <div className="d-flex gap-1 mb-3 flex-wrap">
                    {volt.mood && (
                      <span
                        className="badge"
                        style={{
                          background: "#1e1e3a",
                          color: "#94a3b8",
                          fontSize: 10,
                        }}
                      >
                        {volt.mood}
                      </span>
                    )}
                    <span
                      className="badge"
                      style={{
                        background: volt.isPublic ? "#22c55e22" : "#1e1e3a",
                        color: volt.isPublic ? "#22c55e" : "#64748b",
                        fontSize: 10,
                      }}
                    >
                      {volt.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => handleEdit(volt.id)}
                      className="btn btn-sm btn-outline-primary flex-fill"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(volt.id)}
                      className="btn btn-sm btn-outline-danger"
                      aria-label="Delete"
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
