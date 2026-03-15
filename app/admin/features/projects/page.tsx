"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";

interface Project {
  id: string; title: string; location: string | null;
  description: string | null; coverImageUrl: string | null;
  images: string[]; completedDate: string | null;
  isActive: boolean; order: number;
}

export default function ProjectsPage() {
  return (
    <AdminLayout title="Projects" subtitle="Manage completed project photos and details">
      <ProjectsInner />
    </AdminLayout>
  );
}

function ProjectsInner() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partial<Project> | null>(null);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects?all=true");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, []);

  const openNew = () => {
    setEditing({ title: "", location: "", description: "", coverImageUrl: "", images: [], completedDate: "", isActive: true, order: projects.length });
    setNewImageUrl("");
    setShowForm(true);
  };

  const openEdit = (p: Project) => {
    setEditing({ ...p, images: [...(p.images ?? [])] });
    setNewImageUrl("");
    setShowForm(true);
  };

  const save = async () => {
    if (!editing?.title) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url = isNew ? "/api/projects" : `/api/projects/${editing.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error();
      toast.success(isNew ? "Project created" : "Project saved");
      setShowForm(false);
      await loadProjects();
    } catch {
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
      await loadProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setEditing((prev) => ({ ...prev!, images: [...(prev?.images ?? []), url] }));
    setNewImageUrl("");
  };

  const removeImage = (index: number) => {
    setEditing((prev) => ({
      ...prev!,
      images: (prev?.images ?? []).filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-success" />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} · shown in the Projects Gallery section
          </p>
        </div>
        <button className="btn btn-success d-flex align-items-center gap-2" onClick={openNew}>
          <i className="bi bi-plus-circle" />Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "60px 20px",
            border: "2px dashed #e5e7eb", borderRadius: 12, color: "#9ca3af",
          }}
        >
          <i className="bi bi-building" style={{ fontSize: 48, display: "block", marginBottom: 16 }} />
          <h5 style={{ color: "#1f2937" }}>No projects yet</h5>
          <p style={{ margin: "0 0 20px" }}>Add your first completed project to showcase your work.</p>
          <button className="btn btn-success" onClick={openNew}>
            <i className="bi bi-plus me-1" />Add First Project
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {projects.map((p) => (
            <div key={p.id} className="col-12 col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12, overflow: "hidden" }}>
                {/* Cover image */}
                <div style={{ height: 180, background: "#f3f4f6", position: "relative", overflow: "hidden" }}>
                  {p.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.coverImageUrl} alt={p.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#d1d5db" }}>
                      <i className="bi bi-image" style={{ fontSize: 40 }} />
                    </div>
                  )}
                  {/* Badge */}
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <span
                      style={{
                        background: p.isActive ? "#dcfce7" : "#f3f4f6",
                        color: p.isActive ? "#16a34a" : "#9ca3af",
                        fontSize: 11, fontWeight: 600, borderRadius: 10,
                        padding: "3px 8px",
                      }}
                    >
                      {p.isActive ? "Active" : "Hidden"}
                    </span>
                  </div>
                  {/* Image count */}
                  {p.images.length > 0 && (
                    <div
                      style={{
                        position: "absolute", bottom: 10, left: 10,
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        fontSize: 11, borderRadius: 10, padding: "2px 8px",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <i className="bi bi-images" style={{ fontSize: 10 }} />
                      {p.images.length + (p.coverImageUrl ? 1 : 0)} photos
                    </div>
                  )}
                </div>

                <div className="card-body p-3">
                  <h6 className="fw-bold mb-1" style={{ color: "#1f2937" }}>{p.title}</h6>
                  {p.location && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      <i className="bi bi-geo-alt me-1" />{p.location}
                    </div>
                  )}
                  {p.completedDate && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
                      <i className="bi bi-calendar3 me-1" />{p.completedDate}
                    </div>
                  )}
                  {p.description && (
                    <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 12px", lineHeight: 1.5 }}
                       className="text-truncate-2">
                      {p.description}
                    </p>
                  )}
                  <div className="d-flex gap-2 mt-auto pt-2 border-top">
                    <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => openEdit(p)}>
                      <i className="bi bi-pencil me-1" />Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteProject(p.id)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Project form modal ──────────────────────────────────────────────── */}
      {showForm && editing && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setShowForm(false)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ marginTop: 80 }}>
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                <div className="modal-header border-0" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
                  <h5 className="modal-title fw-bold text-white">
                    {editing.id ? "Edit Project" : "New Project"}
                  </h5>
                  <button className="btn-close btn-close-white ms-auto" onClick={() => setShowForm(false)} />
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Project Title <span className="text-danger">*</span></label>
                    <input
                      type="text" className="form-control"
                      placeholder="e.g. Hermanus Shopping Centre Slab"
                      value={editing.title ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p!, title: e.target.value }))}
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Location</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        placeholder="e.g. Hermanus, Western Cape"
                        value={editing.location ?? ""}
                        onChange={(e) => setEditing((p) => ({ ...p!, location: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Completed Date</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        placeholder="e.g. March 2025"
                        value={editing.completedDate ?? ""}
                        onChange={(e) => setEditing((p) => ({ ...p!, completedDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control" rows={3}
                      placeholder="Brief description of the project, concrete specs, etc."
                      value={editing.description ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p!, description: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Cover Image URL</label>
                    <input
                      type="url" className="form-control"
                      placeholder="https://..."
                      value={editing.coverImageUrl ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p!, coverImageUrl: e.target.value }))}
                    />
                    {editing.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editing.coverImageUrl} alt=""
                        style={{ marginTop: 8, height: 100, objectFit: "cover", borderRadius: 6, maxWidth: "100%" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>

                  {/* Additional images */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Gallery Images</label>
                    <div className="d-flex gap-2 mb-2">
                      <input
                        type="url" className="form-control form-control-sm"
                        placeholder="Paste image URL and click Add"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }}
                      />
                      <button type="button" className="btn btn-sm btn-outline-success" onClick={addImage}>
                        Add
                      </button>
                    </div>
                    {(editing.images ?? []).length > 0 && (
                      <div className="d-flex flex-wrap gap-2">
                        {(editing.images ?? []).map((url, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url} alt=""
                              style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }}
                              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              style={{
                                position: "absolute", top: -6, right: -6,
                                background: "#dc2626", color: "#fff",
                                border: "none", borderRadius: "50%",
                                width: 18, height: 18, fontSize: 10,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer",
                              }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Display Order</label>
                      <input
                        type="number" className="form-control form-control-sm" min={0}
                        value={editing.order ?? 0}
                        onChange={(e) => setEditing((p) => ({ ...p!, order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="col-6 d-flex align-items-end">
                      <div className="form-check form-switch mb-2">
                        <input
                          type="checkbox" className="form-check-input" role="switch" id="projActive"
                          checked={editing.isActive ?? true}
                          onChange={(e) => setEditing((p) => ({ ...p!, isActive: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="projActive">Active</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-success px-4" onClick={save} disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                    {editing.id ? "Save Changes" : "Create Project"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
