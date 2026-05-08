"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

interface FieldEntry {
  label?: string;
  name?: string;
  value?: unknown;
}

interface Submission {
  id: string;
  pageSlug: string;
  data: unknown;
  userEmail: string;
  status: string;
  createdAt: string;
}

/** Normalise submission data — handles both array-of-fields and flat-object formats */
function getFields(data: unknown): Array<{ label: string; value: string }> {
  if (Array.isArray(data)) {
    return (data as FieldEntry[])
      .map(f => ({
        label: f.label || f.name || "Field",
        value: typeof f.value === "object" && f.value !== null
          ? JSON.stringify(f.value)
          : String(f.value ?? ""),
      }))
      .filter(f => f.value !== "");
  }
  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>).map(([label, value]) => ({
      label,
      value: typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? ""),
    }));
  }
  return [];
}

function getSubmitterName(data: unknown): string {
  if (!Array.isArray(data)) return "";
  const f = (data as FieldEntry[]).find(f =>
    /^(name|full.?name|your.?name)$/i.test(f.label || f.name || "")
  );
  return f ? String(f.value ?? "") : "";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function FormsInboxPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/form-submissions?${params}`);
      const data = await res.json();
      if (data.success) setSubmissions(data.data?.submissions ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  async function markRead(id: string) {
    await fetch(`/api/admin/form-submissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "read" }),
    });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: "read" } : s));
    setSelected(prev => prev?.id === id ? { ...prev, status: "read" } : prev);
    window.dispatchEvent(new CustomEvent("cms:forms:read-updated"));
  }

  async function handleSelect(sub: Submission) {
    setSelected(sub);
    if (sub.status === "received") {
      await markRead(sub.id);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this submission?")) return;
    await fetch(`/api/admin/form-submissions?id=${id}`, { method: "DELETE" });
    setSubmissions(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function handleExportCsv() {
    if (!submissions.length) return;
    const allLabels = new Set<string>();
    submissions.forEach(s => getFields(s.data).forEach(f => allLabels.add(f.label)));
    const labels = [...allLabels];
    const keys = ["Name", "Email", "Page", "Status", "Submitted", ...labels.filter(l => !["Name", "Email"].includes(l))];
    const rows = submissions.map(s => {
      const fields = Object.fromEntries(getFields(s.data).map(f => [f.label, f.value]));
      return keys.map(k => {
        if (k === "Email") return s.userEmail;
        if (k === "Page") return s.pageSlug;
        if (k === "Status") return s.status;
        if (k === "Submitted") return new Date(s.createdAt).toISOString();
        return fields[k] ?? "";
      });
    });
    const csv = [keys.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "form-submissions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = submissions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.userEmail.toLowerCase().includes(q) ||
      s.pageSlug.toLowerCase().includes(q) ||
      getFields(s.data).some(f => f.value.toLowerCase().includes(q) || f.label.toLowerCase().includes(q))
    );
  });

  const newCount = submissions.filter(s => s.status === "received").length;

  return (
    <AdminLayout title="Form Submissions" subtitle="View and manage form responses">
      <div style={{ maxWidth: 1200 }}>
        {/* Toolbar */}
        <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
          <div className="d-flex gap-2 align-items-center">
            <div className="input-group" style={{ width: 280 }}>
              <span className="input-group-text"><i className="bi bi-search" /></span>
              <input className="form-control" placeholder="Search submissions..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="received">New</option>
              <option value="read">Read</option>
            </select>
            {newCount > 0 && (
              <span className="badge bg-danger rounded-pill" style={{ fontSize: 12 }}>
                {newCount} new
              </span>
            )}
          </div>
          <button className="btn btn-outline-primary btn-sm" onClick={handleExportCsv} disabled={!filtered.length}>
            <i className="bi bi-download me-1" /> Export CSV
          </button>
        </div>

        <div className="row g-3">
          {/* Submissions list */}
          <div className={selected ? "col-md-5" : "col-12"}>
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                  <i className="bi bi-inbox display-1 text-muted" style={{ opacity: 0.3 }} />
                  <h5 className="mt-3 text-muted">No Submissions</h5>
                  <p className="text-muted small">Form submissions will appear here when visitors fill out your forms.</p>
                </div>
              </div>
            ) : (
              <div className="card shadow-sm overflow-hidden">
                <div className="list-group list-group-flush">
                  {filtered.map(sub => {
                    const name = getSubmitterName(sub.data);
                    const isSelected = selected?.id === sub.id;
                    const isNew = sub.status === "received";
                    return (
                      <div
                        key={sub.id}
                        className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                        style={{
                          cursor: "pointer",
                          backgroundColor: isSelected ? "var(--bs-primary-bg-subtle, #dbeafe)" : undefined,
                          borderLeft: isSelected ? "3px solid var(--bs-primary, #2563eb)" : "3px solid transparent",
                        }}
                        onClick={() => handleSelect(sub)}
                      >
                        {/* Avatar */}
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-semibold text-white"
                          style={{
                            width: 36, height: 36, fontSize: 14,
                            backgroundColor: isNew ? "var(--bs-primary, #2563eb)" : "#94a3b8",
                          }}
                        >
                          {(name || sub.userEmail || "?")[0].toUpperCase()}
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center gap-1">
                            {isNew && (
                              <span className="badge bg-danger" style={{ fontSize: 9, padding: "2px 5px" }}>NEW</span>
                            )}
                            <strong className="text-truncate text-body" style={{ fontSize: 13 }}>
                              {name || sub.userEmail || "Anonymous"}
                            </strong>
                          </div>
                          {name && (
                            <div className="text-muted text-truncate" style={{ fontSize: 11 }}>{sub.userEmail}</div>
                          )}
                          <div className="text-muted text-truncate" style={{ fontSize: 11 }}>
                            {sub.pageSlug} &middot; {formatDate(sub.createdAt)}
                          </div>
                        </div>

                        <button
                          className="btn btn-sm btn-link text-danger p-0 flex-shrink-0"
                          style={{ opacity: 0.5 }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                          title="Delete"
                        >
                          <i className="bi bi-trash" style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="card-footer bg-white text-muted small text-center border-top">
                  {filtered.length} submission{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="col-md-7">
              <div className="card shadow-sm">
                {/* Header — neutral, always readable */}
                <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-start gap-2">
                  <div style={{ minWidth: 0 }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      {selected.status === "received" && (
                        <span className="badge bg-danger" style={{ fontSize: 10 }}>NEW</span>
                      )}
                      {selected.status === "read" && (
                        <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: 10 }}>READ</span>
                      )}
                      <h6 className="mb-0 text-truncate text-body" style={{ fontSize: 14 }}>
                        {getSubmitterName(selected.data) || selected.userEmail || "Anonymous Submission"}
                      </h6>
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      {selected.userEmail && getSubmitterName(selected.data) && (
                        <span className="me-2">{selected.userEmail}</span>
                      )}
                      <span>{selected.pageSlug}</span>
                      <span className="mx-1">&middot;</span>
                      <span>{new Date(selected.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-outline-secondary flex-shrink-0" onClick={() => setSelected(null)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                {/* Fields */}
                <div className="card-body p-0">
                  {getFields(selected.data).length === 0 ? (
                    <div className="text-center text-muted py-4" style={{ fontSize: 13 }}>No fields captured</div>
                  ) : (
                    <div>
                      {getFields(selected.data).map(({ label, value }, i) => {
                        const isLong = value.length > 80 || value.includes("\n");
                        return (
                          <div
                            key={label}
                            className={`px-4 py-3${i > 0 ? " border-top" : ""}`}
                            style={{ backgroundColor: i % 2 === 0 ? "#fafafa" : "#fff" }}
                          >
                            <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: 10, letterSpacing: "0.06em" }}>
                              {label}
                            </div>
                            <div style={{ fontSize: 14, whiteSpace: isLong ? "pre-wrap" : undefined, wordBreak: "break-word" }}>
                              {value || <span className="text-muted fst-italic">—</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
