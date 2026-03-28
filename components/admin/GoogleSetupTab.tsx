"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Instruction {
  text: string;
  url?: string;
  copyValue?: string;
}

interface SetupStep {
  id: string;
  label: string;
  description: string;
  status: "done" | "pending";
  autoDetected: boolean;
  hint?: string | null;
  actionLink?: string;
  actionLabel?: string;
  instructions?: Instruction[];
  ga4Id?: string;
  copyValue?: string;
}

interface GoogleSetupData {
  steps: SetupStep[];
  doneCount: number;
  totalCount: number;
  canonicalBase: string;
  ga4Id: string;
}

// ─── Copy helper ────────────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 mt-1"
      onClick={handleCopy}
      title={`Copy: ${value}`}
    >
      <i className={`bi ${copied ? "bi-check-lg text-success" : "bi-clipboard"}`} />
      <span className="small">{copied ? "Copied!" : label || "Copy"}</span>
    </button>
  );
}

// ─── Step card ──────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  onToggle,
  ga4Value,
  onGa4Change,
  onGa4Save,
  ga4Saving,
}: {
  step: SetupStep;
  index: number;
  onToggle: (stepId: string, done: boolean) => void;
  ga4Value: string;
  onGa4Change: (v: string) => void;
  onGa4Save: () => void;
  ga4Saving: boolean;
}) {
  const [expanded, setExpanded] = useState(step.status === "pending");
  const isDone = step.status === "done";
  const isGa4 = step.id === "ga4_setup";

  return (
    <div className={`card border-0 shadow-sm mb-3 ${isDone ? "opacity-75" : ""}`}>
      <div
        className="card-header bg-transparent border-bottom-0 py-3 d-flex align-items-center gap-3"
        style={{ cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Step number */}
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${isDone ? "bg-success" : "bg-primary"}`}
          style={{ width: 32, height: 32, color: "#fff", fontSize: "0.85rem", fontWeight: 600 }}
        >
          {isDone ? <i className="bi bi-check-lg" /> : index + 1}
        </div>

        {/* Label + description */}
        <div className="flex-grow-1">
          <div className="fw-semibold" style={{ fontSize: "0.95rem" }}>
            {step.label}
            {step.autoDetected && (
              <span className="badge bg-light text-muted border ms-2" style={{ fontSize: "0.65rem", fontWeight: 500 }}>
                auto-detected
              </span>
            )}
          </div>
          <div className="text-muted small">{step.description}</div>
        </div>

        {/* Status + expand */}
        <div className="d-flex align-items-center gap-2">
          {isDone ? (
            <span className="badge bg-success-subtle text-success">Done</span>
          ) : (
            <span className="badge bg-warning-subtle text-warning">Pending</span>
          )}
          <i className={`bi bi-chevron-${expanded ? "up" : "down"} text-muted`} />
        </div>
      </div>

      {expanded && (
        <div className="card-body pt-0 ps-5">
          {/* Auto-detected step with action link */}
          {step.autoDetected && step.actionLink && step.status === "pending" && (
            <a href={step.actionLink} className="btn btn-sm btn-primary mb-3">
              <i className="bi bi-arrow-right me-1" />
              {step.actionLabel || "Fix this"}
            </a>
          )}

          {/* Auto-detected hint (shows current value) */}
          {step.autoDetected && step.hint && (
            <div className="d-flex align-items-center gap-2 mb-3">
              <code className="small bg-light px-2 py-1 rounded">{step.hint}</code>
              <CopyButton value={step.hint} />
            </div>
          )}

          {/* Instructions */}
          {step.instructions && step.instructions.length > 0 && (
            <ol className="list-group list-group-flush mb-3" style={{ counterReset: "step" }}>
              {step.instructions.map((inst, i) => (
                <li key={i} className="list-group-item border-0 px-0 py-1 d-flex align-items-start gap-2">
                  <span className="text-muted flex-shrink-0" style={{ width: 20, fontSize: "0.8rem", textAlign: "right" }}>
                    {i + 1}.
                  </span>
                  <div>
                    {inst.url ? (
                      <a href={inst.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                        {inst.text} <i className="bi bi-box-arrow-up-right" style={{ fontSize: "0.7rem" }} />
                      </a>
                    ) : (
                      <span className="small">{inst.text}</span>
                    )}
                    {inst.copyValue && (
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <code className="small bg-light px-2 py-1 rounded text-break">{inst.copyValue}</code>
                        <CopyButton value={inst.copyValue} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* GA4 input field */}
          {isGa4 && (
            <div className="mb-3">
              <label className="form-label small fw-medium">GA4 Measurement ID</label>
              <div className="input-group" style={{ maxWidth: 360 }}>
                <span className="input-group-text bg-light small">G-</span>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="XXXXXXXXXX"
                  value={ga4Value.startsWith("G-") ? ga4Value.slice(2) : ga4Value}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                    onGa4Change(raw ? `G-${raw}` : "");
                  }}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={onGa4Save}
                  disabled={ga4Saving}
                >
                  {ga4Saving ? <span className="spinner-border spinner-border-sm" /> : "Save"}
                </button>
              </div>
              {step.ga4Id && (
                <div className="text-success small mt-1">
                  <i className="bi bi-check-circle me-1" />
                  Active: {step.ga4Id} — tracking script is injected on all public pages
                </div>
              )}
            </div>
          )}

          {/* Manual toggle */}
          {!step.autoDetected && (
            <div className="form-check form-switch mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id={`step-${step.id}`}
                checked={isDone}
                onChange={(e) => onToggle(step.id, e.target.checked)}
              />
              <label className="form-check-label small" htmlFor={`step-${step.id}`}>
                {isDone ? "Completed — uncheck to mark as pending" : "Mark as done when completed"}
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function GoogleSetupTab() {
  const [data, setData] = useState<GoogleSetupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ga4Input, setGa4Input] = useState("");
  const [ga4Saving, setGa4Saving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/google-setup");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
      setGa4Input(json.ga4Id || "");
    } catch {
      setError("Failed to load Google setup data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStep = async (stepId: string, done: boolean) => {
    try {
      const res = await fetch("/api/admin/google-setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, done }),
      });
      if (!res.ok) throw new Error("Save failed");
      await load();
      setAlert({ type: "success", msg: `Step ${done ? "completed" : "unchecked"}` });
      setTimeout(() => setAlert(null), 2000);
    } catch {
      setAlert({ type: "error", msg: "Failed to save" });
    }
  };

  const saveGa4 = async () => {
    setGa4Saving(true);
    try {
      const res = await fetch("/api/admin/google-setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ga4MeasurementId: ga4Input }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Save failed");
      }
      await load();
      setAlert({ type: "success", msg: ga4Input ? "GA4 tracking enabled" : "GA4 tracking removed" });
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: "error", msg: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setGa4Saving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <span className="spinner-border spinner-border-sm text-primary" />
        <span className="ms-2 text-muted">Loading Google setup...</span>
      </div>
    );
  }

  if (error || !data) {
    return <div className="alert alert-danger">{error || "Failed to load"}</div>;
  }

  const progress = Math.round((data.doneCount / data.totalCount) * 100);

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className={`alert alert-${alert.type === "success" ? "success" : "danger"} alert-dismissible py-2 small`}>
          {alert.msg}
          <button className="btn-close btn-close-sm" onClick={() => setAlert(null)} />
        </div>
      )}

      {/* Progress header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0 fw-semibold">
              <i className="bi bi-google me-2" style={{ color: "#4285f4" }} />
              Google Integration Progress
            </h6>
            <span className={`badge ${data.doneCount === data.totalCount ? "bg-success" : "bg-primary"}`}>
              {data.doneCount}/{data.totalCount} steps
            </span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <div
              className={`progress-bar ${data.doneCount === data.totalCount ? "bg-success" : "bg-primary"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {data.doneCount === data.totalCount ? (
            <div className="text-success small mt-2">
              <i className="bi bi-check-circle-fill me-1" />
              All steps completed — your site is fully configured for Google.
            </div>
          ) : (
            <div className="text-muted small mt-2">
              Complete each step to ensure Google can discover, index, and track your site.
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      {data.steps.map((step, i) => (
        <StepCard
          key={step.id}
          step={step}
          index={i}
          onToggle={toggleStep}
          ga4Value={ga4Input}
          onGa4Change={setGa4Input}
          onGa4Save={saveGa4}
          ga4Saving={ga4Saving}
        />
      ))}

      {/* Help note */}
      <div className="card border-0 bg-light mt-4">
        <div className="card-body py-3">
          <div className="small text-muted">
            <i className="bi bi-info-circle me-1" />
            <strong>Tip:</strong> After completing all steps, Google typically takes 1–4 weeks to fully index a new site.
            You can monitor progress in{" "}
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
              Google Search Console
            </a>
            {" "}under Coverage → Pages.
          </div>
        </div>
      </div>
    </div>
  );
}
