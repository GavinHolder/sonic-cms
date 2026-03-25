"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

interface Submission {
  id: string;
  pageSlug: string;
  data: Record<string, unknown>;
  userEmail: string;
  status: string;
  createdAt: string;
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this submission?")) return;
    await fetch(`/api/admin/form-submissions?id=${id}`, { method: "DELETE" });
    setSubmissions(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function handleMarkRead(id: string) {
    await fetch(`/api/admin/form-submissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "read" }),
    });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: "read" } : s));
  }

  function handleExportCsv() {
    if (!submissions.length) return;
    const allKeys = new Set<string>();
    submissions.forEach(s => Object.keys(s.data).forEach(k => allKeys.add(k)));
    const keys = ["email", "pageSlug", "status", "createdAt", ...allKeys];
    const rows = submissions.map(s => keys.map(k => {
      if (k === "email") return s.userEmail;
      if (k === "pageSlug") return s.pageSlug;
      if (k === "status") return s.status;
      if (k === "createdAt") return new Date(s.createdAt).toISOString();
      return String(s.data[k] ?? "");
    }));
    const csv = [keys.join(","), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "form-submissions.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = submissions.filter(s => {
    if (search) {
      const searchLower = search.toLowerCase();
      const match = s.userEmail.toLowerCase().includes(searchLower) ||
        s.pageSlug.toLowerCase().includes(searchLower) ||
        Object.values(s.data).some(v => String(v).toLowerCase().includes(searchLower));
      if (!match) return false;
    }
    return true;
  });

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
              <option value="received">Received</option>
              <option value="read">Read</option>
            </select>
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
              <div className="card shadow-sm">
                <div className="list-group list-group-flush">
                  {filtered.map(sub => (
                    <div
                      key={sub.id}
                      className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${selected?.id === sub.id ? "active" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelected(sub)}
                    >
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center gap-2">
                          {sub.status === "received" && <span className="badge bg-primary" style={{ fontSize: 8 }}>NEW</span>}
                          <strong className="text-truncate" style={{ fontSize: 13 }}>{sub.userEmail || "Anonymous"}</strong>
                        </div>
                        <div className="text-muted small text-truncate">
                          /{sub.pageSlug} &middot; {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button className="btn btn-sm btn-outline-danger p-0 px-1" onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}>
                        <i className="bi bi-trash" style={{ fontSize: 11 }} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="card-footer bg-white text-muted small text-center">
                  {filtered.length} submission{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="col-md-7">
              <div className="card shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-0">{selected.userEmail || "Anonymous Submission"}</h6>
                    <small className="text-muted">/{selected.pageSlug} &middot; {new Date(selected.createdAt).toLocaleString()}</small>
                  </div>
                  <div className="d-flex gap-1">
                    {selected.status === "received" && (
                      <button className="btn btn-sm btn-outline-success" onClick={() => handleMarkRead(selected.id)}>
                        <i className="bi bi-check-lg me-1" /> Mark Read
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelected(null)}>
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <table className="table table-sm mb-0">
                    <tbody>
                      {Object.entries(selected.data).map(([key, value]) => (
                        <tr key={key}>
                          <td className="fw-semibold text-muted" style={{ width: "30%", fontSize: 13 }}>{key}</td>
                          <td style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
