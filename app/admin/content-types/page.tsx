"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { FIELD_TYPES } from "@/lib/content-types";

interface ContentField {
  id?: string;
  name: string;
  slug: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  sortOrder: number;
}

interface ContentType {
  id: string;
  slug: string;
  name: string;
  pluralName: string;
  icon: string;
  description?: string;
  hasPublicListing: boolean;
  hasPublicDetail: boolean;
  listingLayout: string;
  enableTags: boolean;
  fields: ContentField[];
  _count?: { entries: number };
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const ICONS = [
  "bi-collection", "bi-journal-text", "bi-people", "bi-question-circle",
  "bi-briefcase", "bi-card-checklist", "bi-chat-quote", "bi-star",
  "bi-trophy", "bi-tag", "bi-gear", "bi-calendar-event",
  "bi-megaphone", "bi-book", "bi-camera", "bi-music-note",
];

export default function ContentTypesPage() {
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ContentType | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", pluralName: "", slug: "", icon: "bi-collection",
    description: "", hasPublicListing: true, hasPublicDetail: true,
    listingLayout: "grid", enableTags: true,
  });
  const [fields, setFields] = useState<ContentField[]>([]);

  useEffect(() => { fetchTypes(); }, []);

  async function fetchTypes() {
    try {
      const res = await fetch("/api/admin/content-types");
      const data = await res.json();
      if (data.success) setTypes(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function openCreate() {
    setForm({ name: "", pluralName: "", slug: "", icon: "bi-collection", description: "", hasPublicListing: true, hasPublicDetail: true, listingLayout: "grid", enableTags: true });
    setFields([]);
    setCreating(true);
    setEditing(null);
  }

  function openEdit(ct: ContentType) {
    setForm({ name: ct.name, pluralName: ct.pluralName, slug: ct.slug, icon: ct.icon, description: ct.description || "", hasPublicListing: ct.hasPublicListing, hasPublicDetail: ct.hasPublicDetail, listingLayout: ct.listingLayout, enableTags: ct.enableTags });
    setFields(ct.fields.map(f => ({ ...f, required: f.required ?? false, options: (f.options as ContentField["options"]) || [] })));
    setEditing(ct);
    setCreating(false);
  }

  function addField() {
    setFields(prev => [...prev, { name: "", slug: "", fieldType: "text", required: false, sortOrder: prev.length }]);
  }

  function updateField(index: number, updates: Partial<ContentField>) {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }

  function removeField(index: number) {
    setFields(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.pluralName),
        fields: fields.map((f, i) => ({ ...f, sortOrder: i })),
      };

      const url = editing ? `/api/admin/content-types/${editing.id}` : "/api/admin/content-types";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: editing ? "Content type updated!" : "Content type created!" });
        setCreating(false);
        setEditing(null);
        fetchTypes();
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSaving(false);
  }

  async function handleDelete(ct: ContentType) {
    const count = ct._count?.entries || 0;
    if (!confirm(`Delete "${ct.name}" and all ${count} entries? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/content-types/${ct.id}`, { method: "DELETE" });
      fetchTypes();
      setMessage({ type: "success", text: `"${ct.name}" deleted.` });
    } catch {
      setMessage({ type: "error", text: "Failed to delete" });
    }
  }

  const isEditorOpen = creating || editing;

  return (
    <AdminLayout title="Content Types" subtitle="Define custom content structures">
      <div style={{ maxWidth: 1200 }}>
        {message && (
          <div className={`alert alert-${message.type === "success" ? "success" : "danger"} alert-dismissible mb-3`}>
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage(null)} />
          </div>
        )}

        {!isEditorOpen && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="text-muted mb-0">Create and manage custom content types like blog posts, team members, FAQs, and more.</p>
              <button className="btn btn-primary" onClick={openCreate}>
                <i className="bi bi-plus-lg me-1" /> New Content Type
              </button>
            </div>

            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : types.length === 0 ? (
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <i className="bi bi-collection display-1 text-muted" style={{ opacity: 0.3 }} />
                  <h5 className="mt-3 text-muted">No Content Types Yet</h5>
                  <p className="text-muted">Create your first content type to start building custom content.</p>
                  <button className="btn btn-primary" onClick={openCreate}>
                    <i className="bi bi-plus-lg me-1" /> Create First Content Type
                  </button>
                </div>
              </div>
            ) : (
              <div className="row g-3">
                {types.map(ct => (
                  <div key={ct.id} className="col-md-6 col-lg-4">
                    <div className="card shadow-sm h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <i className={`bi ${ct.icon} fs-4 text-primary`} />
                          <div>
                            <h6 className="mb-0">{ct.name}</h6>
                            <small className="text-muted">{ct.pluralName} &middot; /{ct.slug}</small>
                          </div>
                        </div>
                        {ct.description && <p className="text-muted small mb-2">{ct.description}</p>}
                        <div className="d-flex gap-2 flex-wrap mb-2">
                          <span className="badge bg-primary-subtle text-primary">{ct.fields.length} fields</span>
                          <span className="badge bg-success-subtle text-success">{ct._count?.entries || 0} entries</span>
                          {ct.enableTags && <span className="badge bg-info-subtle text-info">Tags</span>}
                          {ct.hasPublicListing && <span className="badge bg-warning-subtle text-warning">Public</span>}
                        </div>
                      </div>
                      <div className="card-footer bg-white border-top-0 d-flex gap-2">
                        <a href={`/admin/content/${ct.slug}`} className="btn btn-sm btn-outline-primary flex-1">
                          <i className="bi bi-list-ul me-1" /> Entries
                        </a>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(ct)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(ct)}>
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Editor */}
        {isEditorOpen && (
          <div>
            <div className="d-flex align-items-center gap-2 mb-3">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setCreating(false); setEditing(null); }}>
                <i className="bi bi-arrow-left me-1" /> Back
              </button>
              <h5 className="mb-0">{editing ? `Edit: ${editing.name}` : "New Content Type"}</h5>
            </div>

            {/* Basic Info */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white py-2"><h6 className="mb-0">Basic Info</h6></div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Name (singular)</label>
                    <input className="form-control" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (!editing) setForm(f => ({ ...f, slug: slugify(e.target.value + "s") })); }} placeholder="Blog Post" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Plural Name</label>
                    <input className="form-control" value={form.pluralName} onChange={e => { setForm(f => ({ ...f, pluralName: e.target.value })); if (!editing) setForm(f => ({ ...f, slug: slugify(e.target.value) })); }} placeholder="Blog Posts" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Slug (URL)</label>
                    <div className="input-group">
                      <span className="input-group-text">/</span>
                      <input className="form-control" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="blog-posts" disabled={!!editing} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Description</label>
                    <input className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description for admin reference" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Icon</label>
                    <select className="form-select" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
                      {ICONS.map(i => <option key={i} value={i}>{i.replace("bi-", "")}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Layout</label>
                    <select className="form-select" value={form.listingLayout} onChange={e => setForm(f => ({ ...f, listingLayout: e.target.value }))}>
                      <option value="grid">Grid</option>
                      <option value="list">List</option>
                      <option value="cards">Cards</option>
                    </select>
                  </div>
                </div>
                <div className="d-flex gap-3 mt-3">
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" checked={form.hasPublicListing} onChange={e => setForm(f => ({ ...f, hasPublicListing: e.target.checked }))} id="chk-listing" />
                    <label className="form-check-label" htmlFor="chk-listing">Public listing page</label>
                  </div>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" checked={form.hasPublicDetail} onChange={e => setForm(f => ({ ...f, hasPublicDetail: e.target.checked }))} id="chk-detail" />
                    <label className="form-check-label" htmlFor="chk-detail">Public detail pages</label>
                  </div>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" checked={form.enableTags} onChange={e => setForm(f => ({ ...f, enableTags: e.target.checked }))} id="chk-tags" />
                    <label className="form-check-label" htmlFor="chk-tags">Enable tags</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Fields</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={addField}>
                  <i className="bi bi-plus-lg me-1" /> Add Field
                </button>
              </div>
              <div className="card-body">
                {fields.length === 0 ? (
                  <p className="text-muted text-center py-3 mb-0">No fields yet. Every entry gets a title automatically — add fields for additional data.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {fields.map((field, idx) => (
                      <div key={idx} className="border rounded p-2 d-flex align-items-start gap-2" style={{ background: "#fafafa" }}>
                        <span className="text-muted mt-1" style={{ fontSize: 11, minWidth: 20 }}>#{idx + 1}</span>
                        <div className="flex-1">
                          <div className="row g-2">
                            <div className="col-md-3">
                              <input className="form-control form-control-sm" placeholder="Field name" value={field.name} onChange={e => { updateField(idx, { name: e.target.value, slug: slugify(e.target.value) }); }} />
                            </div>
                            <div className="col-md-2">
                              <input className="form-control form-control-sm" placeholder="slug" value={field.slug} onChange={e => updateField(idx, { slug: e.target.value })} style={{ fontFamily: "monospace", fontSize: 11 }} />
                            </div>
                            <div className="col-md-3">
                              <select className="form-select form-select-sm" value={field.fieldType} onChange={e => updateField(idx, { fieldType: e.target.value })}>
                                {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                              </select>
                            </div>
                            <div className="col-md-2">
                              <input className="form-control form-control-sm" placeholder="Placeholder" value={field.placeholder || ""} onChange={e => updateField(idx, { placeholder: e.target.value })} />
                            </div>
                            <div className="col-md-2 d-flex align-items-center gap-2">
                              <div className="form-check">
                                <input type="checkbox" className="form-check-input" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} id={`req-${idx}`} />
                                <label className="form-check-label" htmlFor={`req-${idx}`} style={{ fontSize: 11 }}>Req</label>
                              </div>
                              <button className="btn btn-sm btn-outline-danger p-0 px-1" onClick={() => removeField(idx)}>
                                <i className="bi bi-x" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.pluralName}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" /> Saving...</> : <><i className="bi bi-check-lg me-1" /> {editing ? "Update" : "Create"} Content Type</>}
              </button>
              <button className="btn btn-outline-secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
