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
  largeJump?: boolean;
  versionGap?: { major: number; minor: number; patch: number };
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
  const [pollCount, setPollCount] = useState(0);
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
    setPollCount(0);
    pollRef.current = setInterval(async () => {
      setPollCount((c) => c + 1);
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
                        <div className="alert alert-danger mb-0">
                          <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                            <i className="bi bi-exclamation-octagon-fill" />
                            {changelog.breaking.length} Breaking Change{changelog.breaking.length > 1 ? "s" : ""}
                          </h6>
                          <p className="mb-2 small">
                            This update includes changes that may affect custom development.
                            Review carefully before updating — especially if you have customised components or database schema.
                          </p>
                          <ul className="mb-0 ps-3 small">
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
                  {info.largeJump && (
                    <div className="alert alert-warning mb-2 small">
                      <i className="bi bi-exclamation-triangle-fill me-1" />
                      <strong>Large version jump detected</strong> ({info.localVersion} → {info.upstreamVersion}).
                      {(info.versionGap?.major ?? 0) > 0
                        ? " This includes a major version change — review the breaking changes above carefully."
                        : ` Jumping ${info.versionGap?.minor ?? 0} minor versions — all Prisma migrations will run in sequence automatically.`}
                      {" "}Database schema migrations are applied in order on startup, so this is safe — but review the changelogs for any config changes you may need to apply manually.
                    </div>
                  )}
                  <div className="alert alert-warning mb-0 small">
                    <i className="bi bi-shield-exclamation me-1" />
                    The site will enter <strong>maintenance mode</strong> during the update (~5 min). If anything goes wrong, maintenance mode stays on until you investigate.
                  </div>
                </>
              )}

              {/* Triggering / Polling */}
              {(phase === "triggering" || phase === "polling") && (() => {
                // Estimate progress based on poll count (each poll = 8s, typical build = ~3min)
                const steps = [
                  { label: "Enabling maintenance mode", threshold: 0 },
                  { label: "Triggering GitHub Actions workflow", threshold: 1 },
                  { label: "Merging upstream CMS changes", threshold: 3 },
                  { label: "Installing dependencies", threshold: 6 },
                  { label: "Building application", threshold: 10 },
                  { label: "Pushing Docker image", threshold: 16 },
                  { label: "Deploying to server", threshold: 20 },
                  { label: "Running database migrations", threshold: 22 },
                  { label: "Verifying deployment", threshold: 24 },
                ];
                const activeStep = [...steps].reverse().find(s => pollCount >= s.threshold) ?? steps[0];
                const progress = Math.min(95, phase === "triggering" ? 5 : Math.round((pollCount / 26) * 100));

                return (
                  <div className="py-3 vstack gap-3">
                    {/* Progress bar */}
                    <div className="progress" style={{ height: 8 }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                        role="progressbar"
                        style={{ width: `${progress}%`, transition: "width 0.5s ease" }}
                      />
                    </div>

                    {/* Current step */}
                    <div className="text-center">
                      <p className="fw-semibold mb-1">
                        <span className="spinner-border spinner-border-sm me-2" />
                        {activeStep.label}...
                      </p>
                      <p className="text-muted small mb-0">
                        Maintenance mode is active. Do not close this window.
                      </p>
                    </div>

                    {/* Step list */}
                    <div className="small">
                      {steps.map((step, i) => {
                        const done = pollCount > step.threshold + 2;
                        const active = step === activeStep;
                        return (
                          <div key={i} className={`d-flex align-items-center gap-2 py-1 ${active ? "fw-semibold" : done ? "text-success" : "text-muted"}`}>
                            {done ? (
                              <i className="bi bi-check-circle-fill text-success" style={{ width: 16 }} />
                            ) : active ? (
                              <span className="spinner-border spinner-border-sm text-primary" style={{ width: 14, height: 14 }} />
                            ) : (
                              <i className="bi bi-circle text-muted" style={{ width: 16, opacity: 0.3 }} />
                            )}
                            {step.label}
                          </div>
                        );
                      })}
                    </div>

                    {githubUrl && (
                      <div className="text-center">
                        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
                          <i className="bi bi-github me-1" />View build on GitHub
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

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
