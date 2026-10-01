"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithRefresh } from "@/lib/fetch-with-refresh";
import { useToast } from "@/components/admin/ToastProvider";
import { rememberSavedUpdatedAt, resolveExpectedUpdatedAt } from "@/lib/section-stale-client";
import { BREAKPOINTS, droppedBreakpoints, relativeTime } from "@/lib/section-version-diff";
import type { BreakpointCounts } from "@/lib/section-versions";

interface VersionRow {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
  counts: BreakpointCounts;
}

interface Props {
  sectionId: string;
  sectionName: string;
  /** Latest known section.updatedAt (ISO) for the stale check; omit to skip the check. */
  sectionUpdatedAt?: string;
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

const LABEL: Record<keyof BreakpointCounts, string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Lists saved snapshots of a section and restores one. Restore snapshots the current state first
 * (server side), so it is undoable. Never uses native dialogs; confirmation is an inline panel.
 */
export default function SectionVersionHistoryModal({
  sectionId, sectionName, sectionUpdatedAt, open, onClose, onRestored,
}: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [confirming, setConfirming] = useState<VersionRow | null>(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetchWithRefresh(`/api/sections/${sectionId}/versions`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success || !Array.isArray(j.data)) throw new Error("bad response");
      setRows(j.data as VersionRow[]);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    if (!open) return;
    setConfirming(null);
    setRows([]);
    load();
  }, [open, load]);

  const restore = async (row: VersionRow) => {
    setRestoring(true);
    try {
      const expectedUpdatedAt = resolveExpectedUpdatedAt(sectionId, sectionUpdatedAt);
      const res = await fetchWithRefresh(`/api/sections/${sectionId}/versions/${row.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
      });
      if (res.status === 409) {
        toast.error("This section was changed elsewhere (another tab or device). Nothing was restored. Reload the page and try again.");
        return;
      }
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success) {
        toast.error(j?.error || "Failed to restore this version.");
        return;
      }
      rememberSavedUpdatedAt(sectionId, j.updatedAt);
      toast.success(`Restored version ${row.version}. The previous state was saved as a new version.`);
      setConfirming(null);
      onRestored();
      onClose();
    } catch {
      toast.error("Failed to restore this version.");
    } finally {
      setRestoring(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Version history"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-clock-history me-2"></i>
              Version history{sectionName ? ` - ${sectionName}` : ""}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={restoring}></button>
          </div>

          <div className="modal-body">
            {confirming && (
              <div className="alert alert-warning">
                <strong>Restore version {confirming.version}?</strong>
                <p className="mb-2 mt-1 small">
                  The current state is saved as a new version first, so you can undo this. Section order,
                  visibility and navbar settings are not changed.
                </p>
                <button className="btn btn-sm btn-warning me-2" disabled={restoring} onClick={() => restore(confirming)}>
                  {restoring ? "Restoring..." : "Yes, restore"}
                </button>
                <button className="btn btn-sm btn-outline-secondary" disabled={restoring} onClick={() => setConfirming(null)}>
                  Cancel
                </button>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Loading versions...
              </div>
            )}

            {isError && !isLoading && (
              <div className="alert alert-danger d-flex justify-content-between align-items-center">
                <span>Could not load version history.</span>
                <button className="btn btn-sm btn-outline-danger" onClick={load}>Retry</button>
              </div>
            )}

            {!isLoading && !isError && rows.length === 0 && (
              <p className="text-muted text-center py-4 mb-0">
                No history yet — versions are recorded from each save after 1 Oct 2026.
              </p>
            )}

            {!isLoading && !isError && rows.length > 0 && (
              <ul className="list-group">
                {rows.map((row, i) => {
                  const dropped = droppedBreakpoints(row.counts, rows[i + 1]?.counts);
                  return (
                    <li key={row.id} className="list-group-item d-flex align-items-center gap-3 flex-wrap">
                      <div className="flex-grow-1">
                        <div className="fw-semibold">
                          Version {row.version}
                          <span className="text-muted fw-normal ms-2 small">{relativeTime(row.createdAt)}</span>
                        </div>
                        <div className="small text-muted">
                          {formatAbsolute(row.createdAt)} · saved by {row.createdByName || row.createdBy}
                        </div>
                        <div className="mt-1 d-flex gap-1 flex-wrap">
                          {BREAKPOINTS.map((bp) => {
                            const isDropped = dropped.includes(bp);
                            const cls = isDropped ? "bg-danger" : row.counts[bp] === 0 ? "bg-secondary" : "bg-success";
                            return (
                              <span
                                key={bp}
                                className={`badge ${cls}`}
                                title={isDropped ? `${LABEL[bp]} layout had blocks in the previous version but none here` : undefined}
                              >
                                {isDropped && <i className="bi bi-exclamation-triangle-fill me-1"></i>}
                                {LABEL[bp]}: {row.counts[bp]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        disabled={restoring}
                        onClick={() => setConfirming(row)}
                      >
                        <i className="bi bi-arrow-counterclockwise me-1"></i>
                        Restore
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={restoring}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
