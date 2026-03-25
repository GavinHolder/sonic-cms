"use client";

import { useState, useEffect } from "react";

interface Version {
  id: string;
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
  createdById: string;
}

interface Props {
  entryId: string;
  currentData: Record<string, unknown>;
  currentTitle: string;
  onRestore: (data: Record<string, unknown>, title: string) => void;
}

export default function VersionHistory({ entryId, currentData, currentTitle, onRestore }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [comparing, setComparing] = useState<Version | null>(null);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    fetch(`/api/admin/content-entries/_versions/${entryId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) setVersions(d.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entryId, expanded]);

  function getDiff(old: Record<string, unknown>, current: Record<string, unknown>) {
    const allKeys = new Set([...Object.keys(old), ...Object.keys(current)]);
    const changes: { key: string; oldVal: string; newVal: string; type: "added" | "removed" | "changed" }[] = [];
    for (const key of allKeys) {
      const oldStr = JSON.stringify(old[key] ?? null);
      const newStr = JSON.stringify(current[key] ?? null);
      if (oldStr !== newStr) {
        if (old[key] === undefined) changes.push({ key, oldVal: "", newVal: String(current[key] ?? ""), type: "added" });
        else if (current[key] === undefined) changes.push({ key, oldVal: String(old[key] ?? ""), newVal: "", type: "removed" });
        else changes.push({ key, oldVal: String(old[key] ?? ""), newVal: String(current[key] ?? ""), type: "changed" });
      }
    }
    return changes;
  }

  return (
    <div className="card shadow-sm mb-3">
      <div
        className="card-header bg-white py-2 d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <h6 className="mb-0 d-flex align-items-center gap-2">
          <i className="bi bi-clock-history text-muted" />
          Version History
        </h6>
        <i className={`bi bi-chevron-${expanded ? "up" : "down"} text-muted`} />
      </div>

      {expanded && (
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary" /></div>
          ) : versions.length === 0 ? (
            <div className="text-center py-3 text-muted" style={{ fontSize: 12 }}>
              No previous versions yet. Versions are created automatically when you save.
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {versions.map((v, i) => (
                <div key={v.id} className="list-group-item py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {v.title !== currentTitle ? <><s className="text-muted">{v.title}</s> → {currentTitle}</> : v.title}
                      </div>
                      <div className="text-muted" style={{ fontSize: 10 }}>
                        {new Date(v.createdAt).toLocaleString()} — v{versions.length - i}
                      </div>
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        style={{ fontSize: 10, padding: "2px 6px" }}
                        onClick={() => setComparing(comparing?.id === v.id ? null : v)}
                      >
                        {comparing?.id === v.id ? "Hide Diff" : "Diff"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-warning"
                        style={{ fontSize: 10, padding: "2px 6px" }}
                        onClick={() => {
                          if (confirm(`Restore to version from ${new Date(v.createdAt).toLocaleString()}? Current content will be saved as a new version first.`)) {
                            onRestore(v.data, v.title);
                          }
                        }}
                      >
                        Restore
                      </button>
                    </div>
                  </div>

                  {/* Diff view */}
                  {comparing?.id === v.id && (
                    <div className="mt-2 p-2 rounded" style={{ background: "#f8fafc", fontSize: 11 }}>
                      {(() => {
                        const changes = getDiff(v.data, currentData);
                        if (changes.length === 0) return <span className="text-muted">No data changes</span>;
                        return (
                          <table className="table table-sm table-borderless mb-0" style={{ fontSize: 11 }}>
                            <thead>
                              <tr><th style={{ width: "25%" }}>Field</th><th>Old</th><th>New</th></tr>
                            </thead>
                            <tbody>
                              {changes.map(c => (
                                <tr key={c.key}>
                                  <td className="fw-semibold">{c.key}</td>
                                  <td style={{ color: "#ef4444", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.oldVal ? c.oldVal.slice(0, 100) : "—"}
                                  </td>
                                  <td style={{ color: "#22c55e", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.newVal ? c.newVal.slice(0, 100) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
