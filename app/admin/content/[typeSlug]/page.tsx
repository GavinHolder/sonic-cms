"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";

interface Entry {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  tags: string[];
  excerpt: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  author: { firstName: string | null; lastName: string | null; username: string };
}

interface ContentType {
  id: string;
  slug: string;
  name: string;
  pluralName: string;
  icon: string;
  enableTags: boolean;
  fields: { id: string; name: string; slug: string; fieldType: string }[];
}

export default function ContentEntryListPage() {
  const params = useParams();
  const router = useRouter();
  const typeSlug = params.typeSlug as string;

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/content-entries/${typeSlug}?${params}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
        setTotal(data.data.total);
        if (data.contentType) setContentType(data.contentType);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [typeSlug, page, search, statusFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  async function handleDelete(entry: Entry) {
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/content-entries/${typeSlug}/${entry.id}`, { method: "DELETE" });
      setMessage({ type: "success", text: `"${entry.title}" deleted.` });
      fetchEntries();
    } catch {
      setMessage({ type: "error", text: "Failed to delete" });
    }
  }

  async function handleCreate() {
    try {
      const res = await fetch(`/api/admin/content-entries/${typeSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", data: {} }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/content/${typeSlug}/${data.data.id}`);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to create entry" });
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { published: "bg-success", draft: "bg-secondary", archived: "bg-warning text-dark" };
    return <span className={`badge ${map[status] || "bg-secondary"}`}>{status}</span>;
  };

  return (
    <AdminLayout
      title={contentType?.pluralName || "Content"}
      subtitle={`Manage ${contentType?.pluralName?.toLowerCase() || "content"} entries`}
    >
      <div style={{ maxWidth: 1200 }}>
        {message && (
          <div className={`alert alert-${message.type === "success" ? "success" : "danger"} alert-dismissible mb-3`}>
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage(null)} />
          </div>
        )}

        {/* Toolbar */}
        <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
          <div className="d-flex gap-2 align-items-center">
            <div className="input-group" style={{ width: 280 }}>
              <span className="input-group-text"><i className="bi bi-search" /></span>
              <input className="form-control" placeholder="Search entries..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="d-flex gap-2">
            <a href="/admin/content-types" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-gear me-1" /> Manage Types
            </a>
            <button className="btn btn-primary" onClick={handleCreate}>
              <i className="bi bi-plus-lg me-1" /> New {contentType?.name || "Entry"}
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : entries.length === 0 ? (
          <div className="card shadow-sm">
            <div className="card-body text-center py-5">
              <i className={`bi ${contentType?.icon || "bi-collection"} display-1 text-muted`} style={{ opacity: 0.3 }} />
              <h5 className="mt-3 text-muted">No {contentType?.pluralName || "Entries"} Yet</h5>
              <button className="btn btn-primary mt-2" onClick={handleCreate}>
                <i className="bi bi-plus-lg me-1" /> Create First {contentType?.name || "Entry"}
              </button>
            </div>
          </div>
        ) : (
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}></th>
                    <th>Title</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 140 }}>Author</th>
                    <th style={{ width: 140 }}>Date</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/content/${typeSlug}/${entry.id}`)}>
                      <td>
                        {entry.coverImage ? (
                          <img src={entry.coverImage} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, background: "#f1f5f9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className={`bi ${contentType?.icon || "bi-file-text"} text-muted`} />
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold">{entry.title}</div>
                        {entry.excerpt && <div className="text-muted small text-truncate" style={{ maxWidth: 400 }}>{entry.excerpt}</div>}
                      </td>
                      <td>{statusBadge(entry.status)}</td>
                      <td className="text-muted small">{entry.author.firstName || entry.author.username}</td>
                      <td className="text-muted small">{new Date(entry.updatedAt).toLocaleDateString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(entry)}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 20 && (
              <div className="card-footer bg-white d-flex justify-content-between align-items-center">
                <small className="text-muted">{total} total entries</small>
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <button className="btn btn-sm btn-outline-secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
