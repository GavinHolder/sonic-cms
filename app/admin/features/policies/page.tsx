"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";
import { useConfirm } from "@/components/admin/ConfirmProvider";
import PolicyEditor from "@/components/admin/policies/PolicyEditor";

interface Policy {
  id: string;
  slug: string;
  title: string;
  body: string;
  navLabel: string | null;
  order: number;
  enabled: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
}

export default function PoliciesPage() {
  return (
    <AdminLayout title="Policies" subtitle="Manage legal policy pages (Privacy, POPIA, AUP, Terms)">
      <PoliciesInner />
    </AdminLayout>
  );
}

function PoliciesInner() {
  const toast = useToast();
  const confirm = useConfirm();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partial<Policy> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/policies");
      if (!res.ok) throw new Error("Failed to load");
      setPolicies(await res.json());
    } catch {
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditing({
      title: "",
      slug: "",
      body: "",
      navLabel: "",
      order: policies.length,
      enabled: true,
      metaTitle: "",
      metaDescription: "",
      noindex: false,
    });
    setShowForm(true);
  };

  const openEdit = (p: Policy) => {
    setEditing({ ...p });
    setShowForm(true);
  };

  const save = async () => {
    if (!editing?.title) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const isNew = !editing.id;
      const res = await fetch(isNew ? "/api/policies" : `/api/policies/${editing.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(isNew ? "Policy created" : "Policy updated");
      setShowForm(false);
      await load();
    } catch {
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Policy) => {
    const ok = await confirm({
      title: "Delete policy",
      message: `Delete "${p.title}"? This cannot be undone.`,
      variant: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/policies/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Policy deleted");
      await load();
    } catch {
      toast.error("Failed to delete policy");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-success" />
      </div>
    );
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Policy pages are listed automatically in the footer and selectable from internal link pickers.
        </p>
        <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={openNew}>
          <i className="bi bi-plus" />Add Policy
        </button>
      </div>

      {policies.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "40px 20px", border: "2px dashed #e5e7eb",
            borderRadius: 10, color: "#9ca3af",
          }}
        >
          <i className="bi bi-file-earmark-text" style={{ fontSize: 32, display: "block", marginBottom: 10 }} />
          No policies yet — click <strong>Add Policy</strong> to create one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {policies.map((p) => (
            <div
              key={p.id}
              className="d-flex align-items-center gap-3"
              style={{ padding: "12px 16px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}
            >
              <i
                className="bi bi-file-earmark-text"
                style={{ color: p.enabled ? "#4a7c59" : "#9ca3af", fontSize: 18, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  /policies/{p.slug}
                  {p.navLabel && ` · footer: ${p.navLabel}`}
                  {` · order ${p.order}`}
                </div>
              </div>
              {!p.enabled && (
                <span style={{ fontSize: 10, background: "#f3f4f6", color: "#9ca3af", borderRadius: 10, padding: "2px 8px" }}>
                  hidden
                </span>
              )}
              <a
                className="btn btn-sm btn-outline-secondary"
                href={`/policies/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View public page"
              >
                <i className="bi bi-box-arrow-up-right" />
              </a>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(p)} title="Edit">
                <i className="bi bi-pencil" />
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p)} title="Delete">
                <i className="bi bi-trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Policy form modal ─────────────────────────────────────────────────── */}
      {showForm && editing && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setShowForm(false)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg" style={{ marginTop: 60 }}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                <div className="modal-header border-0" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">
                    {editing.id ? "Edit Policy" : "New Policy"}
                  </h5>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => setShowForm(false)} />
                </div>
                <div className="modal-body p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Title <span className="text-danger">*</span></label>
                    <input
                      type="text" className="form-control"
                      placeholder="e.g. Privacy Policy"
                      value={editing.title ?? ""}
                      onChange={(e) => setEditing((prev) => ({ ...prev!, title: e.target.value }))}
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Slug</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        placeholder="auto from title"
                        value={editing.slug ?? ""}
                        onChange={(e) => setEditing((prev) => ({ ...prev!, slug: e.target.value }))}
                      />
                      <div className="form-text">URL: /policies/{editing.slug || "…"}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Footer Label</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        placeholder="defaults to title"
                        value={editing.navLabel ?? ""}
                        onChange={(e) => setEditing((prev) => ({ ...prev!, navLabel: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Body</label>
                    <PolicyEditor
                      value={editing.body ?? ""}
                      onChange={(html) => setEditing((prev) => ({ ...prev!, body: html }))}
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Order</label>
                      <input
                        type="number" className="form-control form-control-sm" min={0}
                        value={editing.order ?? 0}
                        onChange={(e) => setEditing((prev) => ({ ...prev!, order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="col-md-8 d-flex align-items-end gap-4">
                      <div className="form-check form-switch">
                        <input
                          type="checkbox" className="form-check-input" role="switch" id="policyEnabled"
                          checked={editing.enabled ?? true}
                          onChange={(e) => setEditing((prev) => ({ ...prev!, enabled: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="policyEnabled">Enabled (visible)</label>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          type="checkbox" className="form-check-input" role="switch" id="policyNoindex"
                          checked={editing.noindex ?? false}
                          onChange={(e) => setEditing((prev) => ({ ...prev!, noindex: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="policyNoindex">No-index (hide from search)</label>
                      </div>
                    </div>
                  </div>

                  <hr />
                  <p className="fw-semibold small text-muted mb-2">SEO (optional)</p>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Meta Title</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      placeholder="defaults to title"
                      value={editing.metaTitle ?? ""}
                      onChange={(e) => setEditing((prev) => ({ ...prev!, metaTitle: e.target.value }))}
                    />
                  </div>
                  <div className="mb-1">
                    <label className="form-label fw-semibold small">Meta Description</label>
                    <textarea
                      className="form-control form-control-sm" rows={2}
                      value={editing.metaDescription ?? ""}
                      onChange={(e) => setEditing((prev) => ({ ...prev!, metaDescription: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-success px-4" onClick={save} disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                    {editing.id ? "Save Changes" : "Create Policy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
