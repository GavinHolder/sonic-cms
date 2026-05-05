"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

interface CmsTemplate {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  sectionType: string | null;
  thumbnail: string | null;
  data: Record<string, unknown>;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

type FilterType = "all" | "standalone" | "section" | "page";
type SectionFilter = "all" | "HERO" | "NORMAL" | "CTA" | "FOOTER" | "FLEXIBLE";

const TYPE_INFO: Record<string, { label: string; color: string; icon: string }> = {
  standalone: { label: "Standalone", color: "warning",  icon: "bi-code-slash" },
  section:    { label: "Section",    color: "primary",  icon: "bi-layout-split" },
  page:       { label: "Page",       color: "success",  icon: "bi-file-earmark" },
};

const SECTION_ICONS: Record<string, string> = {
  HERO:     "bi-stars",
  NORMAL:   "bi-file-earmark-text",
  CTA:      "bi-megaphone",
  FOOTER:   "bi-layout-text-window-reverse",
  FLEXIBLE: "bi-grid-1x2",
};

function toSlug(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface UseAsPageModalProps {
  template: CmsTemplate;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

function UseAsPageModal({ template, onClose, onCreated }: UseAsPageModalProps) {
  const [title, setTitle]   = useState(template.name);
  const [slug, setSlug]     = useState(toSlug(template.name));
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugEdited) setSlug(toSlug(v));
  };

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugEdited(true);
  };

  const handleCreate = async () => {
    if (!slug || !title.trim()) return;
    setSaving(true);
    setError(null);
    const data = template.data as { customHtml?: string; customCss?: string; customCssUrls?: string[] };
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: title.trim(),
          type: "standalone",
          enabled: true,
          status: "PUBLISHED",
          customHtml:    data.customHtml    ?? "",
          customCss:     data.customCss     ?? "",
          customCssUrls: data.customCssUrls ? JSON.stringify(data.customCssUrls) : "[]",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to create page");
      } else {
        onCreated(slug);
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-rocket-takeoff me-2 text-warning"></i>Use as Page
            </h5>
            <button className="btn-close" onClick={onClose} disabled={saving} />
          </div>
          <div className="modal-body">
            <p className="text-muted small mb-3">
              Creates a new <strong>Standalone page</strong> pre-filled with <em>{template.name}</em>.
              The page will be live immediately at the URL below.
            </p>
            <div className="mb-3">
              <label className="form-label fw-semibold">Page Title</label>
              <input
                className="form-control"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Services"
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">URL Slug</label>
              <div className="input-group">
                <span className="input-group-text text-muted">/</span>
                <input
                  className="form-control font-monospace"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="services"
                />
              </div>
              {slug && (
                <div className="mt-1 text-muted small">
                  Live at: <code className="text-warning">/{slug}</code>
                </div>
              )}
            </div>
            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="bi bi-exclamation-circle me-1"></i>{error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              className="btn btn-warning"
              onClick={handleCreate}
              disabled={saving || !slug || !title.trim()}
            >
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />Creating…</>
                : <><i className="bi bi-rocket-takeoff me-2"></i>Create Page</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesLibraryPage() {
  const [templates, setTemplates]       = useState<CmsTemplate[]>([]);
  const [loading, setLoading]           = useState(true);
  const [typeFilter, setTypeFilter]     = useState<FilterType>("all");
  const [secFilter, setSecFilter]       = useState<SectionFilter>("all");
  const [search, setSearch]             = useState("");
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState("");
  const [editDesc, setEditDesc]         = useState("");
  const [editSaving, setEditSaving]     = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean; slug?: string } | null>(null);
  const [useAsPageFor, setUseAsPageFor] = useState<CmsTemplate | null>(null);

  const showToast = (msg: string, ok = true, slug?: string) => {
    setToast({ msg, ok, slug });
    setTimeout(() => setToast(null), 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (typeFilter !== "all") p.set("type", typeFilter);
      if (secFilter !== "all" && typeFilter === "section") p.set("sectionType", secFilter);
      if (search) p.set("search", search);
      const res = await fetch(`/api/templates?${p}`);
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [typeFilter, secFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast("Template deleted");
    } else {
      showToast(json?.error || "Delete failed", false);
    }
    setDeleting(null);
  };

  const startEdit = (t: CmsTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDesc(t.description ?? "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditSaving(true);
    const res = await fetch(`/api/templates/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
    });
    const json = await res.json();
    if (res.ok) {
      setTemplates(prev => prev.map(t => t.id === editingId ? { ...t, name: json.data.name, description: json.data.description } : t));
      showToast("Template updated");
      setEditingId(null);
    } else {
      showToast(json?.error || "Update failed", false);
    }
    setEditSaving(false);
  };

  const counts = {
    all:        templates.length,
    standalone: templates.filter(t => t.templateType === "standalone").length,
    section:    templates.filter(t => t.templateType === "section").length,
    page:       templates.filter(t => t.templateType === "page").length,
  };

  return (
    <AdminLayout>
      <div className="container-fluid py-4">
        {/* Toast */}
        {toast && (
          <div
            className={`position-fixed top-0 end-0 m-3 alert ${toast.ok ? "alert-success" : "alert-danger"} py-2 px-3 d-flex align-items-center gap-2`}
            style={{ zIndex: 9999, fontSize: "0.875rem" }}
          >
            <i className={`bi ${toast.ok ? "bi-check-circle" : "bi-exclamation-circle"}`}></i>
            <span>{toast.msg}</span>
            {toast.slug && (
              <a href={`/${toast.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light ms-2">
                <i className="bi bi-box-arrow-up-right me-1"></i>View
              </a>
            )}
          </div>
        )}

        {/* Use as Page modal */}
        {useAsPageFor && (
          <UseAsPageModal
            template={useAsPageFor}
            onClose={() => setUseAsPageFor(null)}
            onCreated={(slug) => {
              setUseAsPageFor(null);
              showToast(`Page created at /${slug}`, true, slug);
            }}
          />
        )}

        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="mb-0 fw-bold">
              <i className="bi bi-bookmark-star me-2 text-warning"></i>Template Library
            </h4>
            <p className="text-muted small mb-0 mt-1">
              Reusable templates for standalone pages, sections, and page layouts.
              Save any page or section as a template to reuse across your site.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="row g-3 mb-4">
          {(["all", "standalone", "section", "page"] as FilterType[]).map(type => {
            const info = type === "all" ? { label: "All Templates", color: "secondary", icon: "bi-bookmark-star" } : TYPE_INFO[type];
            const count = counts[type];
            return (
              <div className="col-6 col-md-3" key={type}>
                <div
                  className={`card border-0 shadow-sm h-100 ${typeFilter === type ? `border-${info.color} border-2` : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setTypeFilter(type)}
                >
                  <div className="card-body py-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className={`bi ${info.icon} text-${info.color} fs-5`}></i>
                      <div>
                        <div className="fw-semibold" style={{ fontSize: "1.25rem" }}>{count}</div>
                        <div className="text-muted small">{info.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
          <div className="input-group input-group-sm" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>

          {/* Type tabs */}
          <div className="btn-group btn-group-sm">
            {(["all", "standalone", "section", "page"] as FilterType[]).map(type => (
              <button
                key={type}
                className={`btn ${typeFilter === type ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => setTypeFilter(type)}
              >
                {type === "all" ? "All" : TYPE_INFO[type].label}
              </button>
            ))}
          </div>

          {/* Section sub-filter */}
          {typeFilter === "section" && (
            <div className="btn-group btn-group-sm">
              {(["all", "HERO", "NORMAL", "CTA", "FOOTER", "FLEXIBLE"] as SectionFilter[]).map(s => (
                <button
                  key={s}
                  className={`btn ${secFilter === s ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setSecFilter(s)}
                >
                  {s === "all" ? "All types" : s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Template grid */}
        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border me-2" role="status" />Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-bookmark-star fs-1 d-block mb-3 text-muted opacity-50"></i>
            <h5 className="text-muted">No templates yet</h5>
            <p className="text-muted small">
              Go to any standalone page editor or section editor and click{" "}
              <strong>"Save as Template"</strong> to build your library.
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {templates.map(t => {
              const info = TYPE_INFO[t.templateType] ?? TYPE_INFO.standalone;
              const sIcon = t.sectionType ? SECTION_ICONS[t.sectionType] ?? "bi-layout-split" : info.icon;
              const isStandalone = t.templateType === "standalone";
              return (
                <div className="col-12 col-md-6 col-lg-4" key={t.id}>
                  <div className="card h-100 shadow-sm border-0">
                    {/* Thumbnail or icon placeholder */}
                    {t.thumbnail ? (
                      <img src={t.thumbnail} alt={t.name} className="card-img-top" style={{ height: 140, objectFit: "cover" }} />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{ height: 90, background: "#f3f4f6", borderRadius: "0.375rem 0.375rem 0 0" }}
                      >
                        <i className={`bi ${sIcon} text-muted`} style={{ fontSize: 36 }}></i>
                      </div>
                    )}

                    <div className="card-body">
                      {editingId === t.id ? (
                        <div>
                          <input
                            className="form-control form-control-sm mb-2"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            autoFocus
                          />
                          <textarea
                            className="form-control form-control-sm mb-2"
                            rows={2}
                            placeholder="Description (optional)"
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                          />
                          <div className="d-flex gap-2">
                            <button className="btn btn-warning btn-sm flex-grow-1" onClick={saveEdit} disabled={editSaving || !editName.trim()}>
                              {editSaving ? <span className="spinner-border spinner-border-sm" /> : "Save"}
                            </button>
                            <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="d-flex align-items-start gap-2 mb-1">
                            <h6 className="card-title mb-0 flex-grow-1" style={{ fontSize: "0.875rem" }}>{t.name}</h6>
                          </div>
                          {t.description && (
                            <p className="card-text text-muted mb-2" style={{ fontSize: "0.75rem", lineHeight: 1.4 }}>
                              {t.description}
                            </p>
                          )}
                          <div className="d-flex flex-wrap gap-1 mb-3">
                            <span className={`badge bg-${info.color} ${info.color === "warning" ? "text-dark" : "text-white"}`} style={{ fontSize: "0.65rem" }}>
                              {info.label}
                            </span>
                            {t.sectionType && (
                              <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: "0.65rem" }}>{t.sectionType}</span>
                            )}
                            {t.isBuiltIn && <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Built-in</span>}
                            {t.usageCount > 0 && (
                              <span className="badge bg-light text-muted border" style={{ fontSize: "0.65rem" }}>
                                {t.usageCount}× used
                              </span>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>

                    {editingId !== t.id && (
                      <div className="card-footer bg-transparent border-0 pt-0 d-flex gap-2 flex-wrap">
                        {isStandalone && (
                          <button
                            className="btn btn-sm btn-warning flex-grow-1"
                            onClick={() => setUseAsPageFor(t)}
                            title="Create a live page from this template"
                          >
                            <i className="bi bi-rocket-takeoff me-1"></i>Use as Page
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(t)} disabled={t.isBuiltIn} title="Rename">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id || t.isBuiltIn}
                          title={t.isBuiltIn ? "Cannot delete built-in template" : "Delete"}
                        >
                          {deleting === t.id
                            ? <span className="spinner-border spinner-border-sm" />
                            : <i className="bi bi-trash"></i>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
