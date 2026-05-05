"use client";

import { useState, useCallback } from "react";
import HTMLCodeEditor from "@/components/admin/HTMLCodeEditor";
import type { StandalonePageConfig } from "@/types/page";

interface Props {
  page: StandalonePageConfig;
  onSave: () => void;
  onCancel: () => void;
}

export default function StandalonePageEditorModal({ page, onSave, onCancel }: Props) {
  const [html, setHtml] = useState(page.customHtml ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(page.slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customHtml: html }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to save");
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [html, page.slug, onSave]);

  const previewUrl = `/standalone/${page.slug}`;

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1055 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content" style={{ height: "90vh", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div className="modal-header border-bottom" style={{ flexShrink: 0 }}>
            <div>
              <h5 className="modal-title mb-0">
                <i className="bi bi-code-slash me-2 text-warning"></i>
                Standalone HTML Editor
              </h5>
              <div className="text-muted small mt-1">
                {page.title}
                <span className="ms-2 me-2">·</span>
                <code className="text-primary">/{page.slug}</code>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ms-2 btn btn-link btn-sm p-0"
                  title="Preview page in new tab"
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                </a>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
              disabled={saving}
            />
          </div>

          {/* Info bar */}
          <div
            className="d-flex align-items-center gap-3 px-4 py-2 border-bottom"
            style={{ background: "#1e1e2e", flexShrink: 0 }}
          >
            <span className="badge bg-warning text-dark">
              <i className="bi bi-lightning-charge-fill me-1"></i>Standalone
            </span>
            <span className="text-muted small">
              Paste full HTML — no CMS navbar or section constraints. Served at
              <code className="ms-1 text-info">/standalone/{page.slug}</code>
            </span>
          </div>

          {error && (
            <div className="alert alert-danger m-3 mb-0 py-2">
              <i className="bi bi-exclamation-triangle me-2"></i>{error}
            </div>
          )}

          {/* Monaco Editor — fills remaining height */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <HTMLCodeEditor
              value={html}
              onChange={setHtml}
              height="100%"
            />
          </div>

          {/* Footer */}
          <div className="modal-footer border-top" style={{ flexShrink: 0 }}>
            <div className="me-auto text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              HTML is saved to the database and rendered as-is. Write access requires admin role.
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Saving…
                </>
              ) : (
                <>
                  <i className="bi bi-floppy me-2"></i>Save HTML
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
