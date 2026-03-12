"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";

interface Volt3DVersion {
  id: string;
  versionNum: number;
  glbPath: string;
  blendPath: string | null;
  animClips: Array<{ name: string; duration: number; isDefault: boolean }>;
  isConfirmed: boolean;
  syncedAt: string;
}

interface Volt3DAsset {
  id: string;
  name: string;
  thumbnail: string | null;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: Volt3DVersion[];
}

export default function Volt3DPage() {
  return (
    <AdminLayout title="3D Assets" subtitle="Manage Blender-synced 3D models and their versions">
      <Volt3DLibrary />
    </AdminLayout>
  );
}

function Volt3DLibrary() {
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<Volt3DAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, assetsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/volt-3d"),
        ]);
        if (!meRes.ok) { router.replace("/admin/login"); return; }
        if (assetsRes.ok) {
          const { data } = await assetsRes.json();
          setAssets(data?.assets ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleActivate(assetId: string, versionId: string) {
    setConfirming(versionId);
    try {
      const res = await fetch(`/api/volt-3d/${assetId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) { toast.error("Failed to activate version"); return; }
      const { data } = await res.json();
      toast.success(`Version activated — ${data.deletedVersions} draft(s) cleaned up`);
      // Refresh
      const updRes = await fetch("/api/volt-3d");
      if (updRes.ok) {
        const { data: d } = await updRes.json();
        setAssets(d?.assets ?? []);
      }
    } catch {
      toast.error("Failed to activate version");
    } finally {
      setConfirming(null);
    }
  }

  async function handleDeleteAsset(assetId: string, name: string) {
    if (!confirm(`Delete "${name}" and all its versions? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/volt-3d/${assetId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete asset"); return; }
      toast.success(`"${name}" deleted`);
      setAssets(a => a.filter(x => x.id !== assetId));
      if (expandedId === assetId) setExpandedId(null);
    } catch {
      toast.error("Failed to delete asset");
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function formatDuration(sec: number) {
    return sec < 1 ? `${Math.round(sec * 1000)}ms` : `${sec.toFixed(2)}s`;
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary spinner-border-sm" role="status" />
        <div className="text-muted mt-2 small">Loading 3D assets…</div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <i className="bi bi-box display-4 text-muted" style={{ opacity: 0.3 }} />
          <h6 className="mt-3">No 3D assets yet</h6>
          <p className="text-muted small mb-0">
            Sync a model from Blender using the <strong>volt-sync.py</strong> addon and your API key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {assets.map(asset => {
        const isExpanded = expandedId === asset.id;
        const activeVersion = asset.versions.find(v => v.id === asset.activeVersionId);

        return (
          <div key={asset.id} className="card shadow-sm">
            {/* Asset header */}
            <div
              className="card-header d-flex align-items-center gap-3 py-2 px-3"
              style={{ cursor: "pointer", background: "#f8f9fa" }}
              onClick={() => setExpandedId(isExpanded ? null : asset.id)}
            >
              {/* Thumbnail or icon */}
              <div
                style={{
                  width: 48, height: 48, borderRadius: 8,
                  background: "#e9ecef", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {asset.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.thumbnail} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <i className="bi bi-box" style={{ fontSize: 20, opacity: 0.4 }} />
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-fill min-width-0">
                <div className="fw-semibold text-truncate">{asset.name}</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  {asset.versions.length} version{asset.versions.length !== 1 ? "s" : ""}
                  {activeVersion && (
                    <span className="ms-2 badge bg-success-subtle text-success border border-success-subtle">
                      Active: v{activeVersion.versionNum}
                    </span>
                  )}
                  <span className="ms-2">Updated {formatDate(asset.updatedAt)}</span>
                </div>
              </div>

              {/* Version badges */}
              <div className="d-none d-md-flex gap-1 flex-wrap">
                {asset.versions.map(v => (
                  <span
                    key={v.id}
                    className={`badge ${v.id === asset.activeVersionId ? "bg-primary" : v.isConfirmed ? "bg-secondary" : "bg-warning text-dark"}`}
                    style={{ fontSize: "0.6875rem" }}
                  >
                    v{v.versionNum}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="d-flex gap-2 ms-2" onClick={e => e.stopPropagation()}>
                <button
                  className="btn btn-sm btn-outline-danger"
                  title="Delete asset"
                  onClick={() => handleDeleteAsset(asset.id, asset.name)}
                >
                  <i className="bi bi-trash" />
                </button>
              </div>

              <i className={`bi bi-chevron-${isExpanded ? "up" : "down"} text-muted`} style={{ fontSize: "0.875rem" }} />
            </div>

            {/* Version list */}
            {isExpanded && (
              <div className="card-body p-0">
                <table className="table table-sm table-hover mb-0" style={{ fontSize: "0.8125rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Version</th>
                      <th>Synced</th>
                      <th>Animations</th>
                      <th>Status</th>
                      <th className="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.versions.map(version => {
                      const isActive = version.id === asset.activeVersionId;
                      const clips = version.animClips ?? [];

                      return (
                        <tr key={version.id} className={isActive ? "table-primary" : ""}>
                          <td className="ps-3 align-middle fw-semibold">
                            v{version.versionNum}
                            {isActive && (
                              <span className="ms-2 badge bg-primary" style={{ fontSize: "0.625rem" }}>ACTIVE</span>
                            )}
                          </td>
                          <td className="align-middle text-muted">{formatDate(version.syncedAt)}</td>
                          <td className="align-middle">
                            {clips.length === 0 ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <div className="d-flex gap-1 flex-wrap">
                                {clips.map((c, i) => (
                                  <span key={i} className="badge bg-secondary-subtle text-secondary border border-secondary-subtle" style={{ fontSize: "0.625rem" }}>
                                    {c.name} ({formatDuration(c.duration)})
                                    {c.isDefault && <i className="bi bi-star-fill ms-1" style={{ fontSize: "0.5rem" }} />}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="align-middle">
                            {isActive ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                            ) : version.isConfirmed ? (
                              <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Confirmed</span>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning border border-warning-subtle">Draft</span>
                            )}
                          </td>
                          <td className="text-end pe-3 align-middle">
                            <div className="d-flex gap-2 justify-content-end">
                              {/* Download GLB */}
                              <a
                                href={version.glbPath}
                                download
                                className="btn btn-sm btn-outline-secondary"
                                title="Download GLB"
                              >
                                <i className="bi bi-download" /> GLB
                              </a>

                              {/* Download .blend (only if available) */}
                              {version.blendPath && (
                                <a
                                  href={version.blendPath}
                                  download
                                  className="btn btn-sm btn-outline-secondary"
                                  title="Download Blender source file"
                                >
                                  <i className="bi bi-box-arrow-down" /> .blend
                                </a>
                              )}

                              {/* Activate version */}
                              {!isActive && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  title="Set as active version"
                                  disabled={confirming === version.id}
                                  onClick={() => handleActivate(asset.id, version.id)}
                                >
                                  {confirming === version.id ? (
                                    <span className="spinner-border spinner-border-sm" role="status" />
                                  ) : (
                                    <><i className="bi bi-check2-circle me-1" />Activate</>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
