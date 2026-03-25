"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

interface RedirectEntry {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
  hitCount: number;
  createdAt: string;
}

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<RedirectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fromPath: "", toPath: "", statusCode: 301 });
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => { fetchRedirects(); }, []);

  async function fetchRedirects() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/redirects");
      const data = await res.json();
      if (data.success) setRedirects(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleSave() {
    setMessage(null);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing ? { id: editing, ...form } : form;
      const res = await fetch("/api/admin/redirects", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ fromPath: "", toPath: "", statusCode: 301 });
        setEditing(null);
        fetchRedirects();
        setMessage({ type: "success", text: editing ? "Redirect updated" : "Redirect created" });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed" });
      }
    } catch { setMessage({ type: "error", text: "Network error" }); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this redirect?")) return;
    await fetch(`/api/admin/redirects?id=${id}`, { method: "DELETE" });
    fetchRedirects();
  }

  async function handleToggle(r: RedirectEntry) {
    await fetch("/api/admin/redirects", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, isActive: !r.isActive }),
    });
    fetchRedirects();
  }

  return (
    <AdminLayout title="301 Redirects" subtitle="Manage URL redirects for SEO">
      <div style={{ maxWidth: 900 }}>
        {message && (
          <div className={`alert alert-${message.type === "success" ? "success" : "danger"} alert-dismissible mb-3`}>
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage(null)} />
          </div>
        )}

        {/* Add/Edit form */}
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <h6 className="mb-3">{editing ? "Edit Redirect" : "Add Redirect"}</h6>
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: 12 }}>From Path</label>
                <input className="form-control" value={form.fromPath} onChange={e => setForm(f => ({ ...f, fromPath: e.target.value }))} placeholder="/old-page" />
              </div>
              <div className="col-md-4">
                <label className="form-label" style={{ fontSize: 12 }}>To Path / URL</label>
                <input className="form-control" value={form.toPath} onChange={e => setForm(f => ({ ...f, toPath: e.target.value }))} placeholder="/new-page or https://..." />
              </div>
              <div className="col-md-2">
                <label className="form-label" style={{ fontSize: 12 }}>Status</label>
                <select className="form-select" value={form.statusCode} onChange={e => setForm(f => ({ ...f, statusCode: parseInt(e.target.value) }))}>
                  <option value={301}>301 Permanent</option>
                  <option value={302}>302 Temporary</option>
                  <option value={308}>308 Permanent</option>
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-primary w-100" onClick={handleSave} disabled={!form.fromPath || !form.toPath}>
                  {editing ? "Update" : "Add"}
                </button>
              </div>
            </div>
            {editing && (
              <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => { setEditing(null); setForm({ fromPath: "", toPath: "", statusCode: 301 }); }}>Cancel</button>
            )}
          </div>
        </div>

        {/* Redirects table */}
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : redirects.length === 0 ? (
          <div className="card shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-signpost-split display-1 text-muted" style={{ opacity: 0.3 }} />
              <h5 className="mt-3 text-muted">No Redirects</h5>
              <p className="text-muted small">Add redirects to preserve SEO when changing page URLs.</p>
            </div>
          </div>
        ) : (
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th style={{ width: 60 }}>Code</th>
                    <th style={{ width: 60 }}>Hits</th>
                    <th style={{ width: 60 }}>Active</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {redirects.map(r => (
                    <tr key={r.id} style={{ opacity: r.isActive ? 1 : 0.5 }}>
                      <td style={{ fontSize: 13, fontFamily: "monospace" }}>{r.fromPath}</td>
                      <td style={{ fontSize: 13, fontFamily: "monospace" }}>{r.toPath}</td>
                      <td><span className="badge bg-secondary">{r.statusCode}</span></td>
                      <td className="text-muted" style={{ fontSize: 12 }}>{r.hitCount}</td>
                      <td>
                        <div className="form-check form-switch">
                          <input type="checkbox" className="form-check-input" checked={r.isActive} onChange={() => handleToggle(r)} />
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary p-0 px-1" onClick={() => { setEditing(r.id); setForm({ fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode }); }}>
                            <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                          </button>
                          <button className="btn btn-sm btn-outline-danger p-0 px-1" onClick={() => handleDelete(r.id)}>
                            <i className="bi bi-trash" style={{ fontSize: 11 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
