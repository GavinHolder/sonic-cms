"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ──────────────────────────── Types ──────────────────────────── */

interface StepStatus {
  githubVerified: boolean;
  portainerVerified: boolean;
}

interface FormData {
  // Step 1 — Site Identity
  companyName: string;
  siteDomain: string;
  // Step 2 — GitHub
  githubOwner: string;
  githubRepo: string;
  githubPat: string;
  workflowId: string;
  upstreamUrl: string;
  // Step 3 — Portainer
  portainerUrl: string;
  portainerUsername: string;
  portainerPassword: string;
  portainerStackId: string;
  portainerEndpointId: string;
}

interface GithubCheckResult {
  ok: boolean;
  detail: string;
}

const STEPS = [
  "Site Identity",
  "GitHub Connection",
  "Portainer Deployment",
  "Review & Save",
] as const;

const DEFAULT_UPSTREAM =
  "https://raw.githubusercontent.com/GavinHolder/white-label-cms/main/public/cms-version.json";

const INITIAL_FORM: FormData = {
  companyName: "",
  siteDomain: "",
  githubOwner: "",
  githubRepo: "",
  githubPat: "",
  workflowId: "deploy.yml",
  upstreamUrl: DEFAULT_UPSTREAM,
  portainerUrl: "",
  portainerUsername: "admin",
  portainerPassword: "",
  portainerStackId: "",
  portainerEndpointId: "",
};

/* ──────────────────────────── Component ──────────────────────── */

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [status, setStatus] = useState<StepStatus>({
    githubVerified: false,
    portainerVerified: false,
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // GitHub verify state
  const [ghLoading, setGhLoading] = useState(false);
  const [ghResults, setGhResults] = useState<Record<string, GithubCheckResult> | null>(null);

  // Portainer verify state
  const [ptLoading, setPtLoading] = useState(false);
  const [ptResult, setPtResult] = useState<{ success: boolean; error?: string; stackName?: string; endpointName?: string } | null>(null);

  const update = useCallback(
    (field: keyof FormData, value: string) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  /* ── GitHub Test ─────────────────────────────────────────────── */
  const testGithub = async () => {
    setGhLoading(true);
    setGhResults(null);
    try {
      const res = await fetch("/api/admin/updates/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubPat: form.githubPat,
          githubRepoOwner: form.githubOwner,
          githubRepoName: form.githubRepo,
          githubWorkflowId: form.workflowId,
          upstreamVersionUrl: form.upstreamUrl,
        }),
      });
      const data = await res.json();
      if (data.results) {
        setGhResults(data.results);
        const allOk = Object.values(data.results as Record<string, GithubCheckResult>).every(
          (r) => r.ok
        );
        setStatus((s) => ({ ...s, githubVerified: allOk }));
      }
    } catch {
      setGhResults({ error: { ok: false, detail: "Request failed." } });
    } finally {
      setGhLoading(false);
    }
  };

  /* ── Portainer Test ──────────────────────────────────────────── */
  const testPortainer = async () => {
    setPtLoading(true);
    setPtResult(null);
    try {
      const res = await fetch("/api/admin/portainer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: form.portainerUrl,
          username: form.portainerUsername,
          password: form.portainerPassword,
          stackId: form.portainerStackId,
          endpointId: form.portainerEndpointId,
        }),
      });
      const data = await res.json();
      setPtResult(data);
      setStatus((s) => ({ ...s, portainerVerified: data.success === true }));
    } catch {
      setPtResult({ success: false, error: "Request failed." });
    } finally {
      setPtLoading(false);
    }
  };

  /* ── Save ────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => router.push("/admin/dashboard"), 3000);
      }
    } catch {
      // silent — user can retry
    } finally {
      setSaving(false);
    }
  };

  /* ── Skip ────────────────────────────────────────────────────── */
  const handleSkip = () => router.push("/admin/dashboard");

  /* ── Render helpers ──────────────────────────────────────────── */
  const canNext = (): boolean => {
    if (step === 0) return form.companyName.trim().length > 0;
    if (step === 1) return true; // GitHub fields are optional to proceed
    if (step === 2) return true; // Portainer fields are optional to proceed
    return true;
  };

  const mask = (val: string) =>
    val.length > 4 ? `${"*".repeat(val.length - 4)}${val.slice(-4)}` : val.length > 0 ? "****" : "(not set)";

  /* ── DONE state ──────────────────────────────────────────────── */
  if (done) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", background: "#f5f7fa" }}
      >
        <div className="card shadow-lg border-0" style={{ maxWidth: 520 }}>
          <div className="card-body text-center py-5 px-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10 mb-4"
              style={{ width: 80, height: 80 }}
            >
              <i className="bi bi-check-lg text-success" style={{ fontSize: 40 }}></i>
            </div>
            <h3 className="fw-bold mb-2">Setup Complete!</h3>
            <p className="text-muted mb-0">
              Your CMS is configured and ready to use. Redirecting to the dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────── MAIN RENDER ──────────────────── */
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", background: "#f5f7fa", padding: "2rem 1rem" }}
    >
      <div className="card shadow-lg border-0" style={{ maxWidth: 720, width: "100%" }}>
        {/* Header */}
        <div className="card-header bg-primary text-white text-center py-4 border-0">
          <h4 className="mb-1 fw-bold">
            <i className="bi bi-gear-wide-connected me-2"></i>
            CMS Setup Wizard
          </h4>
          <small className="opacity-75">Configure your CMS deployment in a few steps</small>
        </div>

        {/* Step indicator */}
        <div className="px-4 pt-4">
          <div className="d-flex justify-content-between mb-4">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className="text-center flex-fill"
                style={{ position: "relative" }}
              >
                <div
                  className={`d-inline-flex align-items-center justify-content-center rounded-circle mb-1 ${
                    i < step
                      ? "bg-success text-white"
                      : i === step
                        ? "bg-primary text-white"
                        : "bg-light text-muted border"
                  }`}
                  style={{ width: 32, height: 32, fontSize: 14, fontWeight: 600 }}
                >
                  {i < step ? <i className="bi bi-check"></i> : i + 1}
                </div>
                <div
                  className={`small ${i === step ? "fw-semibold text-primary" : "text-muted"}`}
                  style={{ fontSize: 11 }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="card-body px-4 pb-2">
          {/* ── Step 1: Site Identity ──────────────────────────── */}
          {step === 0 && (
            <div>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-building me-2 text-primary"></i>
                Site Identity
              </h5>
              <p className="text-muted small mb-4">
                Basic information about your website. You can change these later in Settings.
              </p>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Company Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Acme Corporation"
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Site Domain</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. www.acme.co.za"
                  value={form.siteDomain}
                  onChange={(e) => update("siteDomain", e.target.value)}
                />
                <div className="form-text">
                  The public domain where this CMS is deployed (used for SEO and canonical URLs).
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: GitHub Connection ─────────────────────── */}
          {step === 1 && (
            <div>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-github me-2"></i>
                GitHub Connection
              </h5>
              <p className="text-muted small mb-4">
                Connect to your GitHub repository to enable CMS updates. The PAT needs{" "}
                <code>repo</code> and <code>workflow</code> scopes.
              </p>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Repo Owner</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. GavinHolder"
                    value={form.githubOwner}
                    onChange={(e) => update("githubOwner", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Repo Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. mycompany-cms"
                    value={form.githubRepo}
                    onChange={(e) => update("githubRepo", e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Personal Access Token (PAT)</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="ghp_..."
                  value={form.githubPat}
                  onChange={(e) => update("githubPat", e.target.value)}
                />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Workflow ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.workflowId}
                    onChange={(e) => update("workflowId", e.target.value)}
                  />
                  <div className="form-text">Usually deploy.yml</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Upstream CMS Version URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.upstreamUrl}
                    onChange={(e) => update("upstreamUrl", e.target.value)}
                  />
                  <div className="form-text">Pre-filled with white-label CMS default</div>
                </div>
              </div>

              {/* Test button */}
              <button
                className="btn btn-outline-dark d-flex align-items-center gap-2"
                onClick={testGithub}
                disabled={ghLoading || !form.githubPat || !form.githubOwner || !form.githubRepo}
              >
                {ghLoading ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="bi bi-plug"></i>
                )}
                Test GitHub Connection
              </button>

              {/* Results */}
              {ghResults && (
                <div className="mt-3">
                  {Object.entries(ghResults).map(([key, result]) => (
                    <div
                      key={key}
                      className={`d-flex align-items-start gap-2 mb-2 small ${
                        result.ok ? "text-success" : "text-danger"
                      }`}
                    >
                      <i className={`bi ${result.ok ? "bi-check-circle-fill" : "bi-x-circle-fill"} mt-1`}></i>
                      <div>
                        <strong className="text-capitalize">{key}:</strong> {result.detail}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Portainer Deployment ──────────────────── */}
          {step === 2 && (
            <div>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-box-seam me-2 text-info"></i>
                Portainer Deployment
              </h5>
              <p className="text-muted small mb-4">
                Connect to Portainer for automated Docker stack deployments. This enables
                one-click updates from the CMS admin panel.
              </p>
              <div className="mb-3">
                <label className="form-label fw-semibold">Portainer URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. http://192.168.1.100:9000"
                  value={form.portainerUrl}
                  onChange={(e) => update("portainerUrl", e.target.value)}
                />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.portainerUsername}
                    onChange={(e) => update("portainerUsername", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.portainerPassword}
                    onChange={(e) => update("portainerPassword", e.target.value)}
                  />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Stack ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 1"
                    value={form.portainerStackId}
                    onChange={(e) => update("portainerStackId", e.target.value)}
                  />
                  <div className="form-text">
                    Find this in Portainer under Stacks (the number in the URL).
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Endpoint ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2"
                    value={form.portainerEndpointId}
                    onChange={(e) => update("portainerEndpointId", e.target.value)}
                  />
                  <div className="form-text">
                    Usually 1 or 2 — the local Docker environment ID.
                  </div>
                </div>
              </div>

              {/* Test button */}
              <button
                className="btn btn-outline-info d-flex align-items-center gap-2"
                onClick={testPortainer}
                disabled={
                  ptLoading ||
                  !form.portainerUrl ||
                  !form.portainerUsername ||
                  !form.portainerPassword
                }
              >
                {ptLoading ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="bi bi-plug"></i>
                )}
                Test Portainer Connection
              </button>

              {/* Result */}
              {ptResult && (
                <div className={`mt-3 small ${ptResult.success ? "text-success" : "text-danger"}`}>
                  <i
                    className={`bi ${ptResult.success ? "bi-check-circle-fill" : "bi-x-circle-fill"} me-2`}
                  ></i>
                  {ptResult.success ? (
                    <span>
                      Connected! Stack: <strong>{ptResult.stackName}</strong>, Endpoint:{" "}
                      <strong>{ptResult.endpointName}</strong>
                    </span>
                  ) : (
                    <span>{ptResult.error}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review & Save ─────────────────────────── */}
          {step === 3 && (
            <div>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-clipboard-check me-2 text-success"></i>
                Review & Save
              </h5>
              <p className="text-muted small mb-4">
                Review your configuration. Passwords are masked. Click &quot;Complete Setup&quot; to
                save everything.
              </p>

              {/* Site */}
              <div className="card bg-light border-0 mb-3">
                <div className="card-body py-3">
                  <h6 className="fw-bold mb-2">
                    <i className="bi bi-building me-1"></i> Site Identity
                  </h6>
                  <div className="row small">
                    <div className="col-5 text-muted">Company</div>
                    <div className="col-7 fw-semibold">{form.companyName || "(not set)"}</div>
                    <div className="col-5 text-muted">Domain</div>
                    <div className="col-7 fw-semibold">{form.siteDomain || "(not set)"}</div>
                  </div>
                </div>
              </div>

              {/* GitHub */}
              <div className="card bg-light border-0 mb-3">
                <div className="card-body py-3">
                  <h6 className="fw-bold mb-2">
                    <i className="bi bi-github me-1"></i> GitHub{" "}
                    {status.githubVerified && (
                      <span className="badge bg-success ms-2">Verified</span>
                    )}
                  </h6>
                  <div className="row small">
                    <div className="col-5 text-muted">Repository</div>
                    <div className="col-7 fw-semibold">
                      {form.githubOwner && form.githubRepo
                        ? `${form.githubOwner}/${form.githubRepo}`
                        : "(not set)"}
                    </div>
                    <div className="col-5 text-muted">PAT</div>
                    <div className="col-7 fw-semibold">{mask(form.githubPat)}</div>
                    <div className="col-5 text-muted">Workflow</div>
                    <div className="col-7 fw-semibold">{form.workflowId || "(not set)"}</div>
                  </div>
                </div>
              </div>

              {/* Portainer */}
              <div className="card bg-light border-0 mb-3">
                <div className="card-body py-3">
                  <h6 className="fw-bold mb-2">
                    <i className="bi bi-box-seam me-1"></i> Portainer{" "}
                    {status.portainerVerified && (
                      <span className="badge bg-success ms-2">Verified</span>
                    )}
                  </h6>
                  <div className="row small">
                    <div className="col-5 text-muted">URL</div>
                    <div className="col-7 fw-semibold">{form.portainerUrl || "(not set)"}</div>
                    <div className="col-5 text-muted">Username</div>
                    <div className="col-7 fw-semibold">{form.portainerUsername || "(not set)"}</div>
                    <div className="col-5 text-muted">Password</div>
                    <div className="col-7 fw-semibold">{mask(form.portainerPassword)}</div>
                    <div className="col-5 text-muted">Stack / Endpoint</div>
                    <div className="col-7 fw-semibold">
                      {form.portainerStackId || "–"} / {form.portainerEndpointId || "–"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="card-footer bg-white d-flex justify-content-between align-items-center border-0 px-4 py-3">
          <button
            className="btn btn-link text-muted text-decoration-none small"
            onClick={handleSkip}
          >
            Skip for now
          </button>

          <div className="d-flex gap-2">
            {step > 0 && (
              <button className="btn btn-outline-secondary" onClick={() => setStep(step - 1)}>
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
            )}
            {step < 3 && (
              <button
                className="btn btn-primary"
                disabled={!canNext()}
                onClick={() => setStep(step + 1)}
              >
                Next <i className="bi bi-arrow-right ms-1"></i>
              </button>
            )}
            {step === 3 && (
              <button
                className="btn btn-success d-flex align-items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <i className="bi bi-check-lg"></i>
                )}
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
