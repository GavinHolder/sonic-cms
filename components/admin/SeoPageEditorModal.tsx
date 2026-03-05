"use client";

import { useState, useEffect } from "react";

interface SeoFields {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noindex: boolean;
  nofollow: boolean;
}

interface Props {
  slug: string;
  pageTitle: string;
  onClose: () => void;
}

const empty: SeoFields = {
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  canonicalUrl: "",
  noindex: false,
  nofollow: false,
};

export default function SeoPageEditorModal({ slug, pageTitle, onClose }: Props) {
  const [fields, setFields] = useState<SeoFields>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [notInDb, setNotInDb] = useState(false);

  // ── Load current SEO fields from DB ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`);
        if (!res.ok) { setNotInDb(true); return; }
        const j = await res.json();
        if (!j.success) { setNotInDb(true); return; }
        const p = j.data?.page ?? j.data;
        setFields({
          metaTitle: p.metaTitle || "",
          metaDescription: p.metaDescription || "",
          metaKeywords: p.metaKeywords || "",
          ogTitle: p.ogTitle || "",
          ogDescription: p.ogDescription || "",
          ogImage: p.ogImage || "",
          canonicalUrl: p.canonicalUrl || "",
          noindex: !!p.noindex,
          nofollow: !!p.nofollow,
        });
      } catch {
        setNotInDb(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  // ── Auto-dismiss alert ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3000);
    return () => clearTimeout(t);
  }, [alert]);

  const set = <K extends keyof SeoFields>(key: K, value: SeoFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        metaTitle: fields.metaTitle || null,
        metaDescription: fields.metaDescription || null,
        metaKeywords: fields.metaKeywords || null,
        ogTitle: fields.ogTitle || null,
        ogDescription: fields.ogDescription || null,
        ogImage: fields.ogImage || null,
        canonicalUrl: fields.canonicalUrl || null,
        noindex: fields.noindex,
        nofollow: fields.nofollow,
      };
      const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.success) {
        setAlert({ type: "success", message: "SEO settings saved." });
      } else {
        setAlert({ type: "error", message: j.error || "Failed to save." });
      }
    } catch {
      setAlert({ type: "error", message: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  // SERP snippet preview
  const titlePreview = fields.metaTitle || pageTitle || slug;
  const descPreview = fields.metaDescription || "Add a meta description to see it here…";

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1054 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 1055 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header border-bottom">
              <h5 className="modal-title">
                <i className="bi bi-search me-2 text-primary" />
                SEO Settings — <span className="text-muted fw-normal">{pageTitle || slug}</span>
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            {/* Body */}
            <div className="modal-body p-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading…</span>
                  </div>
                </div>
              ) : notInDb ? (
                <div className="alert alert-warning mb-0">
                  <i className="bi bi-exclamation-triangle me-2" />
                  This page is not yet in the database. SEO settings can only be set for pages that have been saved to the database (published or draft pages in the admin).
                </div>
              ) : (
                <>
                  {alert && (
                    <div className={`alert alert-${alert.type === "success" ? "success" : "danger"} alert-dismissible mb-4`}>
                      {alert.message}
                      <button className="btn-close" onClick={() => setAlert(null)} />
                    </div>
                  )}

                  {/* SERP Preview */}
                  <div className="border rounded p-3 mb-4 bg-white" style={{ fontFamily: "Arial, sans-serif" }}>
                    <div className="small fw-semibold text-muted mb-1">Google Search Preview</div>
                    <div style={{ fontSize: "0.75rem", color: "#202124" }}>
                      yourcompany.co.za/{slug}
                    </div>
                    <div style={{ fontSize: "1.1rem", color: "#1a0dab", fontWeight: 400, lineHeight: 1.3, marginBottom: "3px" }}>
                      {titlePreview}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#4d5156", lineHeight: 1.5 }}>
                      {descPreview}
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Meta Title */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Meta Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={fields.metaTitle}
                        onChange={(e) => set("metaTitle", e.target.value)}
                        placeholder={`Leave blank to use page title: "${pageTitle}"`}
                        maxLength={80}
                      />
                      <div className={`form-text ${fields.metaTitle.length > 60 ? "text-warning" : ""}`}>
                        {fields.metaTitle.length}/60 — ideal length for Google
                      </div>
                    </div>

                    {/* Meta Description */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Meta Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={fields.metaDescription}
                        onChange={(e) => set("metaDescription", e.target.value)}
                        placeholder="Describe this page in 50–160 characters for search results…"
                        maxLength={300}
                      />
                      <div className={`form-text ${fields.metaDescription.length > 160 ? "text-danger" : fields.metaDescription.length > 130 ? "text-warning" : fields.metaDescription.length > 0 && fields.metaDescription.length < 50 ? "text-warning" : ""}`}>
                        {fields.metaDescription.length}/160 {fields.metaDescription.length < 50 && fields.metaDescription.length > 0 ? "— too short" : fields.metaDescription.length > 160 ? "— too long" : ""}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Meta Keywords</label>
                      <input
                        type="text"
                        className="form-control"
                        value={fields.metaKeywords}
                        onChange={(e) => set("metaKeywords", e.target.value)}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                      <div className="form-text">Comma-separated. Low direct ranking impact but useful for internal search.</div>
                    </div>

                    {/* OG fields */}
                    <div className="col-12">
                      <hr className="my-1" />
                      <div className="fw-semibold small text-muted mb-2 mt-2">OPEN GRAPH (Social Sharing)</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">OG Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={fields.ogTitle}
                        onChange={(e) => set("ogTitle", e.target.value)}
                        placeholder={`Default: "${fields.metaTitle || pageTitle}"`}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">OG Image URL</label>
                      <input
                        type="text"
                        className="form-control"
                        value={fields.ogImage}
                        onChange={(e) => set("ogImage", e.target.value)}
                        placeholder="https://… or /images/page-og.jpg"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">OG Description</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={fields.ogDescription}
                        onChange={(e) => set("ogDescription", e.target.value)}
                        placeholder={`Default: meta description`}
                      />
                    </div>

                    {/* Canonical + Robots */}
                    <div className="col-12">
                      <hr className="my-1" />
                      <div className="fw-semibold small text-muted mb-2 mt-2">ADVANCED</div>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Canonical URL</label>
                      <input
                        type="url"
                        className="form-control"
                        value={fields.canonicalUrl}
                        onChange={(e) => set("canonicalUrl", e.target.value)}
                        placeholder="Leave blank to auto-generate from Canonical Base + slug"
                      />
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="noindex"
                          role="switch"
                          checked={fields.noindex}
                          onChange={(e) => set("noindex", e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="noindex">
                          <span className={fields.noindex ? "text-danger fw-semibold" : ""}>noindex</span>
                          <div className="form-text mb-0">Exclude this page from search engines</div>
                        </label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="nofollow"
                          role="switch"
                          checked={fields.nofollow}
                          onChange={(e) => set("nofollow", e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="nofollow">
                          nofollow
                          <div className="form-text mb-0">Tell crawlers not to follow links on this page</div>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!loading && !notInDb && (
              <div className="modal-footer border-top">
                <button className="btn btn-outline-secondary" onClick={onClose}>Close</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                  ) : (
                    <><i className="bi bi-floppy me-1" />Save SEO Settings</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
