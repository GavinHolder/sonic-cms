"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";

interface Field {
  id: string;
  name: string;
  slug: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

interface EntryData {
  id: string;
  slug: string;
  title: string;
  data: Record<string, unknown>;
  status: string;
  publishedAt: string | null;
  tags: string[];
  excerpt: string | null;
  coverImage: string | null;
  contentType: { name: string; pluralName: string; slug: string; icon: string; enableTags: boolean; fields: Field[] };
}

export default function ContentEntryEditorPage() {
  const params = useParams();
  const router = useRouter();
  const typeSlug = params.typeSlug as string;
  const entryId = params.entryId as string;

  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tags, setTags] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/content-entries/${typeSlug}/${entryId}`);
        const result = await res.json();
        if (result.success) {
          const e = result.data;
          setEntry(e);
          setTitle(e.title);
          setSlug(e.slug);
          setStatus(e.status);
          setExcerpt(e.excerpt || "");
          setCoverImage(e.coverImage || "");
          setTags((e.tags || []).join(", "));
          setData(e.data || {});
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [typeSlug, entryId]);

  function updateData(fieldSlug: string, value: unknown) {
    setData(prev => ({ ...prev, [fieldSlug]: value }));
  }

  async function handleSave(newStatus?: string) {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        title,
        slug,
        status: newStatus || status,
        data,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      };
      if (newStatus === "published" && !entry?.publishedAt) {
        payload.publishedAt = new Date().toISOString();
      }

      const res = await fetch(`/api/admin/content-entries/${typeSlug}/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        if (newStatus) setStatus(newStatus);
        setMessage({ type: "success", text: newStatus === "published" ? "Published!" : "Saved!" });
      } else {
        setMessage({ type: "error", text: result.error?.message || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSaving(false);
  }

  function renderField(field: Field) {
    const value = data[field.slug];
    const key = field.slug;

    switch (field.fieldType) {
      case "text":
      case "url":
        return (
          <input
            className="form-control"
            value={(value as string) || ""}
            onChange={e => updateData(key, e.target.value)}
            placeholder={field.placeholder || ""}
            type={field.fieldType === "url" ? "url" : "text"}
          />
        );
      case "richtext":
        return (
          <textarea
            className="form-control"
            rows={8}
            value={(value as string) || ""}
            onChange={e => updateData(key, e.target.value)}
            placeholder={field.placeholder || "Write content here..."}
            style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}
          />
        );
      case "image":
        return (
          <div>
            <input
              className="form-control"
              value={(value as string) || ""}
              onChange={e => updateData(key, e.target.value)}
              placeholder="Image URL or /uploads/..."
            />
            {typeof value === 'string' && value && (
              <img src={value} alt="" className="mt-2 rounded" style={{ maxWidth: 200, maxHeight: 120, objectFit: "cover" }} />
            )}
          </div>
        );
      case "date":
        return (
          <input
            type="datetime-local"
            className="form-control"
            value={(value as string) || ""}
            onChange={e => updateData(key, e.target.value)}
          />
        );
      case "number":
        return (
          <input
            type="number"
            className="form-control"
            value={(value as number) ?? ""}
            onChange={e => updateData(key, parseFloat(e.target.value) || 0)}
          />
        );
      case "boolean":
        return (
          <div className="form-check form-switch">
            <input
              type="checkbox"
              className="form-check-input"
              checked={!!value}
              onChange={e => updateData(key, e.target.checked)}
              id={`field-${key}`}
            />
            <label className="form-check-label" htmlFor={`field-${key}`}>
              {value ? "Yes" : "No"}
            </label>
          </div>
        );
      case "select":
        return (
          <select className="form-select" value={(value as string) || ""} onChange={e => updateData(key, e.target.value)}>
            <option value="">Select...</option>
            {(field.options || []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case "color":
        return (
          <div className="d-flex gap-2 align-items-center">
            <input type="color" value={(value as string) || "#000000"} onChange={e => updateData(key, e.target.value)} style={{ width: 40, height: 36, cursor: "pointer" }} />
            <input className="form-control" value={(value as string) || ""} onChange={e => updateData(key, e.target.value)} style={{ width: 120, fontFamily: "monospace" }} />
          </div>
        );
      default:
        return (
          <input
            className="form-control"
            value={(value as string) || ""}
            onChange={e => updateData(key, e.target.value)}
            placeholder={field.placeholder || ""}
          />
        );
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Loading..." subtitle="">
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      </AdminLayout>
    );
  }

  if (!entry) {
    return (
      <AdminLayout title="Not Found" subtitle="">
        <div className="text-center py-5">
          <p className="text-muted">Entry not found.</p>
          <a href={`/admin/content/${typeSlug}`} className="btn btn-outline-primary">Back to list</a>
        </div>
      </AdminLayout>
    );
  }

  const ct = entry.contentType;

  return (
    <AdminLayout title={`Edit ${ct.name}`} subtitle={title || "Untitled"}>
      <div style={{ maxWidth: 900 }}>
        {message && (
          <div className={`alert alert-${message.type === "success" ? "success" : "danger"} alert-dismissible mb-3`}>
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage(null)} />
          </div>
        )}

        {/* Header with back button + actions */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <a href={`/admin/content/${typeSlug}`} className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left me-1" /> {ct.pluralName}
          </a>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={() => handleSave()} disabled={saving}>
              <i className="bi bi-floppy me-1" /> Save Draft
            </button>
            {status !== "published" && (
              <button className="btn btn-success" onClick={() => handleSave("published")} disabled={saving}>
                <i className="bi bi-send me-1" /> Publish
              </button>
            )}
            {status === "published" && (
              <button className="btn btn-warning" onClick={() => handleSave("draft")} disabled={saving}>
                <i className="bi bi-arrow-counterclockwise me-1" /> Unpublish
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="row g-3">
          {/* Left column — content fields */}
          <div className="col-md-8">
            {/* Title */}
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <label className="form-label fw-semibold">Title</label>
                <input className="form-control form-control-lg" value={title} onChange={e => setTitle(e.target.value)} placeholder="Entry title" />
              </div>
            </div>

            {/* Dynamic fields */}
            {ct.fields.length > 0 && (
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  {ct.fields.map(field => (
                    <div key={field.id} className="mb-3">
                      <label className="form-label fw-semibold">
                        {field.name}
                        {field.required && <span className="text-danger ms-1">*</span>}
                      </label>
                      {renderField(field)}
                      {field.helpText && <div className="form-text">{field.helpText}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — metadata */}
          <div className="col-md-4">
            {/* Status */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white py-2"><h6 className="mb-0">Status</h6></div>
              <div className="card-body">
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Slug */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white py-2"><h6 className="mb-0">URL Slug</h6></div>
              <div className="card-body">
                <div className="input-group">
                  <span className="input-group-text" style={{ fontSize: 12 }}>/{ct.slug}/</span>
                  <input className="form-control" value={slug} onChange={e => setSlug(e.target.value)} style={{ fontFamily: "monospace", fontSize: 13 }} />
                </div>
              </div>
            </div>

            {/* Excerpt */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white py-2"><h6 className="mb-0">Excerpt</h6></div>
              <div className="card-body">
                <textarea className="form-control" rows={3} value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Short summary..." />
              </div>
            </div>

            {/* Cover Image */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white py-2"><h6 className="mb-0">Cover Image</h6></div>
              <div className="card-body">
                <input className="form-control" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="Image URL" />
                {coverImage && <img src={coverImage} alt="" className="mt-2 rounded w-100" style={{ maxHeight: 120, objectFit: "cover" }} />}
              </div>
            </div>

            {/* Tags */}
            {ct.enableTags && (
              <div className="card shadow-sm mb-3">
                <div className="card-header bg-white py-2"><h6 className="mb-0">Tags</h6></div>
                <div className="card-body">
                  <input className="form-control" value={tags} onChange={e => setTags(e.target.value)} placeholder="Comma-separated tags" />
                  <div className="form-text">Separate multiple tags with commas</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
