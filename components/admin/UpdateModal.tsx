"use client";

import { useEffect, useRef, useState } from "react";

interface UpdateInfo {
  localVersion: string;
  upstreamVersion: string | null;
  upstreamDate?: string;
  updateAvailable: boolean;
  changelog: { features: string[]; bugfixes: string[]; breaking: string[] } | null;
  updateStatus: "idle" | "in_progress" | "scheduled" | "failed" | "completed";
  scheduledTime: string | null;
  lastError: string | null;
}

interface StatusResult {
  updateStatus: string;
  githubRunStatus: string | null;
  conclusion: string | null;
  githubRunUrl: string | null;
  newVersion?: string;
  error?: string;
  message?: string;
}

interface Props {
  show: boolean;
  info: UpdateInfo | null;
  onClose: () => void;
}

export default function UpdateModal({ show, info, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "triggering" | "polling" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset phase when modal opens
  useEffect(() => {
    if (show) {
      const initialPhase =
        info?.updateStatus === "in_progress" ? "polling" :
        info?.updateStatus === "failed" ? "error" : "idle";
      setPhase(initialPhase);
      if (info?.updateStatus === "failed") setErrorMsg(info.lastError ?? "Unknown error");
      if (info?.updateStatus === "in_progress") startPolling();
    } else {
      stopPolling();
      setPhase("idle");
      setStatusMsg("");
      setErrorMsg("");
      setGithubUrl(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/updates/status");
        if (!res.ok) return;
        const data = await res.json() as StatusResult;
        if (data.githubRunUrl) setGithubUrl(data.githubRunUrl);

        if (data.updateStatus === "in_progress") {
          const msgs: Record<string, string> = {
            queued: "Workflow queued on GitHub Actions...",
            in_progress: "Building and deploying...",
            unknown: "Waiting for workflow to start...",
          };
          setStatusMsg(msgs[data.githubRunStatus ?? ""] ?? "Update in progress...");
          return;
        }

        stopPolling();

        if (data.updateStatus === "completed" || data.conclusion === "success") {
          setPhase("done");
          setStatusMsg(`Updated to v${data.newVersion ?? "latest"} successfully.`);
          setTimeout(() => window.location.reload(), 3000);
        } else {
          setPhase("error");
          setErrorMsg(data.error ?? data.message ?? "Update failed — check GitHub Actions.");
        }
      } catch { /* ignore poll errors */ }
    }, 8_000);
  }

  async function handleUpdate(mode: "now" | "midnight") {
    setPhase("triggering");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/updates/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json() as { success?: boolean; error?: string; scheduledFor?: string };
      if (!res.ok || data.error) {
        setPhase("error");
        setErrorMsg(data.error ?? "Failed to trigger update");
        return;
      }
      if (mode === "midnight") {
        setPhase("done");
        const time = data.scheduledFor ? new Date(data.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "midnight";
        setStatusMsg(`Update scheduled for ${time}. The site will enter maintenance mode automatically.`);
        return;
      }
      // mode === "now"
      setPhase("polling");
      setStatusMsg("Enabling maintenance mode and triggering build...");
      setTimeout(startPolling, 5_000);
    } catch (err) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    }
  }

  async function handleCancelSchedule() {
    await fetch("/api/admin/updates/schedule", { method: "DELETE" });
    onClose();
  }

  async function handleAcknowledgeError() {
    // Reset failed status so admin can retry
    await fetch("/api/admin/updates/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "_reset" }),
    }).catch(() => {});
    // Actually just reset via a direct settings upsert isn't available client-side.
    // We'll reload — the badge will reflect DB state.
    window.location.reload();
  }

  if (!show || !info) return null;

  const { upstreamVersion, upstreamDate, changelog, localVersion, updateStatus, scheduledTime } = info;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040 }} />
      <div
        ref={modalRef}
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header border-bottom">
              <div>
                <h5 className="modal-title mb-0 fw-bold">
                  {phase === "done" ? "✓ Update Complete" :
                   phase === "error" ? "⚠ Update Failed" :
                   phase === "polling" || phase === "triggering" ? "Updating CMS..." :
                   upstreamVersion ? `CMS Update v${upstreamVersion} Available` : "CMS Update"}
                </h5>
                <p className="text-muted mb-0 small">
                  {phase === "idle" || phase === "triggering"
                    ? `Current: v${localVersion}${upstreamVersion ? ` → v${upstreamVersion}` : ""}${upstreamDate ? ` (${upstreamDate})` : ""}`
                    : ""}
                </p>
              </div>
              {(phase === "idle" || phase === "done") && (
                <button type="button" className="btn-close" onClick={onClose} />
              )}
            </div>

            {/* Body */}
            <div className="modal-body">

              {/* Idle: show changelog */}
              {phase === "idle" && (
                <>
                  {updateStatus === "failed" && (
                    <div className="alert alert-danger mb-3">
                      <strong>Previous update failed:</strong> {info.lastError}
                    </div>
                  )}
                  {updateStatus === "scheduled" && scheduledTime && (
                    <div className="alert alert-info mb-3 d-flex justify-content-between align-items-center">
                      <span>Update scheduled for {new Date(scheduledTime).toLocaleString()}</span>
                      <button className="btn btn-sm btn-outline-danger" onClick={handleCancelSchedule}>
                        Cancel schedule
                      </button>
                    </div>
                  )}
                  {changelog ? (
                    <div className="vstack gap-3">
                      {changelog.breaking.length > 0 && (
                        <div>
                          <h6 className="text-danger fw-semibold mb-2">
                            <i className="bi bi-exclamation-octagon me-1" />Breaking Changes
                          </h6>
                          <ul className="mb-0 ps-3">
                            {changelog.breaking.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      )}
                      {changelog.features.length > 0 && (
                        <div>
                          <h6 className="text-success fw-semibold mb-2">
                            <i className="bi bi-stars me-1" />New Features
                          </h6>
                          <ul className="mb-0 ps-3">
                            {changelog.features.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      )}
                      {changelog.bugfixes.length > 0 && (
                        <div>
                          <h6 className="text-primary fw-semibold mb-2">
                            <i className="bi bi-bug me-1" />Bug Fixes
                          </h6>
                          <ul className="mb-0 ps-3">
                            {changelog.bugfixes.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">No changelog available.</p>
                  )}
                  <hr />
                  <div className="alert alert-warning mb-0 small">
                    <i className="bi bi-shield-exclamation me-1" />
                    The site will enter <strong>maintenance mode</strong> during the update (~5 min). If anything goes wrong, maintenance mode stays on until you investigate.
                  </div>
                </>
              )}

              {/* Triggering / Polling */}
              {(phase === "triggering" || phase === "polling") && (
                <div className="text-center py-4 vstack gap-3 align-items-center">
                  <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }} role="status" />
                  <div>
                    <p className="fw-semibold mb-1">{statusMsg || "Starting update..."}</p>
                    <p className="text-muted small mb-0">Maintenance mode is active. Do not close this window.</p>
                  </div>
                  {githubUrl && (
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
                      <i className="bi bi-github me-1" />View build on GitHub
                    </a>
                  )}
                </div>
              )}

              {/* Done */}
              {phase === "done" && (
                <div className="text-center py-4 vstack gap-3 align-items-center">
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "3rem" }} />
                  <div>
                    <p className="fw-semibold mb-1">{statusMsg}</p>
                    {!statusMsg.includes("scheduled") && (
                      <p className="text-muted small">Reloading in 3 seconds...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {phase === "error" && (
                <div className="vstack gap-3">
                  <div className="alert alert-danger">
                    <h6 className="fw-bold"><i className="bi bi-exclamation-triangle-fill me-1" />Update failed</h6>
                    <p className="mb-0 small">{errorMsg}</p>
                  </div>
                  <div className="alert alert-warning small mb-0">
                    <i className="bi bi-cone-striped me-1" />
                    <strong>Maintenance mode is still active.</strong> Retrying will attempt the update again.
                    If you want to cancel, close and disable maintenance mode manually in Settings → Site.
                  </div>
                  {githubUrl && (
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
                      <i className="bi bi-github me-1" />View failed build on GitHub
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {phase === "idle" && (
                <>
                  <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => handleUpdate("midnight")}
                  >
                    <i className="bi bi-moon-stars me-1" />Schedule for Midnight
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleUpdate("now")}
                  >
                    <i className="bi bi-arrow-up-circle me-1" />Update Now
                  </button>
                </>
              )}
              {phase === "done" && !statusMsg.includes("scheduled") && (
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  Reload now
                </button>
              )}
              {phase === "done" && statusMsg.includes("scheduled") && (
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
              )}
              {phase === "error" && (
                <>
                  <button className="btn btn-secondary" onClick={onClose}>Close</button>
                  <button
                    className="btn btn-warning"
                    onClick={() => { setErrorMsg(""); setGithubUrl(null); handleUpdate("now"); }}
                  >
                    <i className="bi bi-arrow-clockwise me-1" />Retry Update
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
