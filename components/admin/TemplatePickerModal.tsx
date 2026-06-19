"use client";

import { useState, useEffect, useCallback } from "react";
import { useConfirm } from "@/components/admin/ConfirmProvider";

export interface CmsTemplate {
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
}

interface Props {
  templateType: "standalone" | "section" | "page";
  sectionType?: string;
  title?: string;
  onSelect: (template: CmsTemplate) => void;
  onCancel: () => void;
}

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  standalone: { label: "Standalone",  color: "warning", icon: "bi-code-slash" },
  section:    { label: "Section",     color: "primary", icon: "bi-layout-split" },
  page:       { label: "Page",        color: "success", icon: "bi-file-earmark" },
};

const SECTION_ICONS: Record<string, string> = {
  HERO:     "bi-stars",
  NORMAL:   "bi-file-earmark-text",
  CTA:      "bi-megaphone",
  FOOTER:   "bi-layout-text-window-reverse",
  FLEXIBLE: "bi-grid-1x2",
};

export default function TemplatePickerModal({ templateType, sectionType, title, onSelect, onCancel }: Props) {
  const [templates, setTemplates] = useState<CmsTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ type: templateType });
      if (sectionType) p.set("sectionType", sectionType);
      if (search) p.set("search", search);
      const res = await fetch(`/api/templates?${p}`);
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [templateType, sectionType, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await confirm("Delete this template?"))) return;
    setDeleting(id);
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selected === id) setSelected(null);
    setDeleting(null);
  };

  const handleApply = async () => {
    const t = templates.find(x => x.id === selected);
    if (!t) return;
    await fetch(`/api/templates/${t.id}`, { method: "PATCH" });
    onSelect(t);
  };

  const info = TYPE_LABELS[templateType] ?? TYPE_LABELS.standalone;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi ${info.icon} me-2 text-${info.color}`}></i>
              {title ?? "Template Library"}
            </h5>
            <button type="button" className="btn-close" onClick={onCancel} />
          </div>

          <div className="modal-body p-0">
            {/* Search bar */}
            <div className="px-3 pt-3 pb-2 border-bottom">
              <div className="input-group input-group-sm">
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
            </div>

            <div style={{ minHeight: 300, maxHeight: "60vh", overflowY: "auto", padding: 16 }}>
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />Loading templates…
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className={`bi ${info.icon} fs-1 d-block mb-2 opacity-25`}></i>
                  {search ? "No templates match your search" : "No templates saved yet"}
                  <div className="small mt-1">Save a {templateType} as a template to see it here</div>
                </div>
              ) : (
                <div className="row g-3">
                  {templates.map(t => (
                    <div className="col-12 col-md-6" key={t.id}>
                      <div
                        className={`card h-100 border-2 ${selected === t.id ? "border-warning" : "border"}`}
                        style={{ cursor: "pointer", transition: "border-color 0.15s" }}
                        onClick={() => setSelected(t.id)}
                      >
                        {t.thumbnail ? (
                          <img src={t.thumbnail} alt={t.name} className="card-img-top" style={{ height: 120, objectFit: "cover" }} />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center"
                            style={{ height: 80, background: "#f8f9fa", borderRadius: "0.375rem 0.375rem 0 0" }}
                          >
                            <i className={`bi ${t.sectionType ? SECTION_ICONS[t.sectionType] ?? "bi-layout-split" : info.icon} text-muted`} style={{ fontSize: 28 }}></i>
                          </div>
                        )}
                        <div className="card-body py-2 px-3">
                          <div className="d-flex align-items-start justify-content-between gap-1">
                            <div className="fw-semibold small text-truncate" title={t.name}>{t.name}</div>
                            {!t.isBuiltIn && (
                              <button
                                className="btn btn-sm p-0 text-muted"
                                onClick={e => handleDelete(t.id, e)}
                                disabled={deleting === t.id}
                                title="Delete"
                                style={{ lineHeight: 1 }}
                              >
                                {deleting === t.id
                                  ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                                  : <i className="bi bi-trash" style={{ fontSize: 12 }}></i>}
                              </button>
                            )}
                          </div>
                          {t.description && <div className="text-muted" style={{ fontSize: "0.72rem", lineHeight: 1.3 }}>{t.description}</div>}
                          <div className="d-flex align-items-center gap-1 mt-1">
                            {t.isBuiltIn && <span className="badge bg-secondary" style={{ fontSize: "0.6rem" }}>Built-in</span>}
                            {t.sectionType && <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: "0.6rem" }}>{t.sectionType}</span>}
                            {t.usageCount > 0 && <span className="text-muted" style={{ fontSize: "0.65rem" }}>{t.usageCount}× used</span>}
                          </div>
                        </div>
                        {selected === t.id && (
                          <div className="position-absolute top-0 end-0 m-1">
                            <span className="badge bg-warning text-dark"><i className="bi bi-check2 me-1"></i>Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <div className="me-auto text-muted small">
              {templates.length} template{templates.length !== 1 ? "s" : ""}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button className="btn btn-warning btn-sm" onClick={handleApply} disabled={!selected}>
              <i className="bi bi-lightning me-1"></i>Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
