"use client";

import { useState } from "react";

interface Props {
  templateType: "standalone" | "section" | "page";
  sectionType?: string;
  data: Record<string, unknown>;
  defaultName?: string;
  onSaved: (templateId: string) => void;
  onCancel: () => void;
}

export default function SaveTemplateModal({ templateType, sectionType, data, defaultName = "", onSaved, onCancel }: Props) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, templateType, sectionType: sectionType || null, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save template");
      onSaved(json.data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = templateType === "standalone" ? "Standalone Page" : templateType === "section" ? `${sectionType ?? ""} Section` : "Page";

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-bookmark-plus me-2 text-warning"></i>Save as Template
            </h5>
            <button type="button" className="btn-close" onClick={onCancel} disabled={saving} />
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <span className="badge bg-warning text-dark me-2" style={{ fontSize: "0.7rem" }}>{typeLabel}</span>
              <span className="text-muted small">Will be saved to the Template Library</span>
            </div>
            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="bi bi-exclamation-triangle me-1"></i>{error}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label fw-semibold small">Template name <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Modern Hero, Dark Landing, Contact Section"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
            <div className="mb-1">
              <label className="form-label fw-semibold small">Description <span className="text-muted fw-normal">(optional)</span></label>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                placeholder="Describe what this template is for..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
            <button className="btn btn-warning btn-sm" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-1" role="status" />Saving…</>
                : <><i className="bi bi-bookmark-check me-1"></i>Save Template</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
