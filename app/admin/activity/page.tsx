"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

interface LogEntry {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (resourceFilter) params.set("resource", resourceFilter);
    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      if (data.success) { setLogs(data.data.logs); setTotal(data.data.total); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, resourceFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actionColor: Record<string, string> = {
    login: "text-success", logout: "text-warning", create: "text-primary",
    update: "text-info", delete: "text-danger",
  };

  return (
    <AdminLayout title="Activity Log" subtitle="Track admin actions and changes">
      <div style={{ maxWidth: 1000 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <select className="form-select" style={{ width: 180 }} value={resourceFilter} onChange={e => { setResourceFilter(e.target.value); setPage(1); }}>
            <option value="">All Resources</option>
            <option value="auth">Authentication</option>
            <option value="page">Pages</option>
            <option value="section">Sections</option>
            <option value="media">Media</option>
            <option value="user">Users</option>
            <option value="settings">Settings</option>
          </select>
          <small className="text-muted">{total} total entries</small>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : logs.length === 0 ? (
          <div className="card shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-clock-history display-1 text-muted" style={{ opacity: 0.3 }} />
              <h5 className="mt-3 text-muted">No Activity Yet</h5>
              <p className="text-muted small">Admin actions will be logged here.</p>
            </div>
          </div>
        ) : (
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Time</th>
                    <th style={{ width: 120 }}>User</th>
                    <th style={{ width: 80 }}>Action</th>
                    <th>Resource</th>
                    <th style={{ width: 110 }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="text-muted" style={{ fontSize: 12 }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ fontSize: 12 }}>{log.username || "System"}</td>
                      <td><span className={`fw-semibold ${actionColor[log.action] || ""}`} style={{ fontSize: 12 }}>{log.action}</span></td>
                      <td style={{ fontSize: 12 }}>
                        {log.resource}
                        {log.resourceId && <span className="text-muted"> #{log.resourceId.slice(0, 8)}</span>}
                        {log.details && <small className="d-block text-muted">{JSON.stringify(log.details).slice(0, 80)}</small>}
                      </td>
                      <td className="text-muted" style={{ fontSize: 11, fontFamily: "monospace" }}>{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 50 && (
              <div className="card-footer bg-white d-flex justify-content-center gap-1">
                <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span className="btn btn-sm disabled">{page}</span>
                <button className="btn btn-sm btn-outline-secondary" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
