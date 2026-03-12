"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";

interface ApiKeyRow {
  id: string;
  prefix: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function ApiKeysPage() {
  return (
    <AdminLayout
      title="API Keys"
      subtitle="Manage API keys for Blender addon sync"
    >
      <ApiKeysManager />
    </AdminLayout>
  );
}

function ApiKeysManager() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/admin/api-keys");
      if (!res.ok) { toast.error("Failed to load API keys"); return; }
      const { data } = await res.json();
      setKeys(data?.keys ?? []);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) { toast.warning("Enter a label for the key"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (!res.ok) { toast.error("Failed to generate API key"); return; }
      const { data } = await res.json();
      setRawKey(data?.rawKey ?? null);
      setNewLabel("");
      await fetchKeys();
    } catch {
      toast.error("Failed to generate API key");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this API key? It will stop working immediately.")) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete API key"); return; }
      setKeys(prev => prev.filter(k => k.id !== id));
      toast.success("API key deleted");
    } catch {
      toast.error("Failed to delete API key");
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return <span className="text-muted">Never</span>;
    return new Date(iso).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Raw key alert — shown once after successful creation */}
      {rawKey && (
        <div className="alert alert-success alert-dismissible d-flex flex-column gap-2 mb-4" role="alert">
          <div className="d-flex align-items-start gap-2">
            <i className="bi bi-check-circle-fill flex-shrink-0 mt-1" />
            <div className="flex-grow-1">
              <strong>API key generated.</strong>{" "}
              <span className="text-danger fw-semibold">Save this key — it will not be shown again.</span>
              <code className="d-block mt-2 p-2 rounded border bg-white text-break user-select-all">
                {rawKey}
              </code>
            </div>
          </div>
          <button
            type="button"
            className="btn-close position-absolute top-0 end-0 m-2"
            aria-label="Dismiss"
            onClick={() => setRawKey(null)}
          />
        </div>
      )}

      {/* Generate form */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h6 className="mb-0">Generate New Key</h6>
        </div>
        <div className="card-body">
          <form onSubmit={handleGenerate} className="d-flex gap-2 align-items-end flex-wrap">
            <div className="flex-grow-1" style={{ minWidth: 200 }}>
              <label htmlFor="key-label" className="form-label small fw-semibold mb-1">
                Label
              </label>
              <input
                id="key-label"
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Blender Workstation"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                maxLength={80}
                disabled={generating}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={generating || !newLabel.trim()}
            >
              {generating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Generating…
                </>
              ) : (
                <>
                  <i className="bi bi-key me-1" />
                  Generate Key
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Keys table */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h6 className="mb-0">Existing Keys</h6>
        </div>

        {loading ? (
          <div className="card-body text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <div className="text-muted small mt-2">Loading…</div>
          </div>
        ) : keys.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-key display-5 d-block mb-2" style={{ opacity: 0.25 }} />
            <div className="small">No API keys yet. Generate one above.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Prefix</th>
                  <th>Label</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th className="pe-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(key => (
                  <tr key={key.id}>
                    <td className="ps-3">
                      <code className="text-secondary">{key.prefix}…</code>
                    </td>
                    <td>{key.label || <span className="text-muted fst-italic">Unlabelled</span>}</td>
                    <td className="text-muted small">{formatDate(key.createdAt)}</td>
                    <td className="text-muted small">{formatDate(key.lastUsedAt)}</td>
                    <td className="pe-3 text-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(key.id)}
                        aria-label={`Delete key ${key.label}`}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="alert alert-info d-flex gap-2 align-items-start">
        <i className="bi bi-info-circle-fill flex-shrink-0 mt-1" />
        <div>
          <strong>Using this key with the Blender addon</strong>
          <ul className="mb-0 mt-1 ps-3 small">
            <li>
              Download the addon from{" "}
              <code>/downloads/volt-sync.py</code>
            </li>
            <li>In Blender: <em>Edit → Preferences → Add-ons → Volt Sync</em></li>
            <li>
              Enter your site URL and paste the API key into the addon preferences, then click{" "}
              <strong>Save Preferences</strong>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
