"use client";
import { useState, useEffect, useCallback } from "react";

interface GoogleSettings {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionConfigured: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5;

// Validates Google OAuth Client ID format: digits-alphanumeric.apps.googleusercontent.com
function isValidClientId(v: string) {
  return /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(v.trim());
}
// Client secret is either masked (already saved) or non-empty
function isValidSecret(v: string) {
  return v === "••••••••" || v.trim().length > 0;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <><i className="bi bi-check2 me-1" />Copied</> : <><i className="bi bi-copy me-1" />Copy</>}
    </button>
  );
}

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div
      className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fw-bold small
        ${done ? "bg-success text-white" : active ? "bg-primary text-white" : "bg-light text-muted border"}`}
      style={{ width: 28, height: 28, fontSize: 13 }}
    >
      {done ? <i className="bi bi-check2" /> : n}
    </div>
  );
}

export default function GoogleSettingsTab() {
  const [step, setStep] = useState<Step>(1);
  const [s, setS] = useState<GoogleSettings>({ clientId: "", clientSecret: "", redirectUri: "", encryptionConfigured: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://yourdomain.com");

  const gscCallback = `${origin}/api/seo/gsc/callback`;
  const gbpCallback = `${origin}/api/gbp/callback`;

  const load = useCallback(async () => {
    try {
      const j = await fetch("/api/settings/google").then(r => r.json()) as GoogleSettings;
      setS(j);
      // If already configured, jump to review step
      if (j.clientId && j.clientSecret) setStep(5);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/settings/google", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: s.clientId, clientSecret: s.clientSecret, redirectUri: s.redirectUri || origin }),
      });
      if (!res.ok) throw new Error("Save failed — check server logs");
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const steps: Array<{ label: string; icon: string }> = [
    { label: "Overview",     icon: "bi-info-circle" },
    { label: "Google Cloud", icon: "bi-cloud" },
    { label: "Credentials",  icon: "bi-key" },
    { label: "Enter Details",icon: "bi-pencil" },
    { label: "Verify & Save",icon: "bi-check-circle" },
  ];

  const credentialsComplete = isValidClientId(s.clientId) && isValidSecret(s.clientSecret);

  return (
    <div>
      {/* Step indicator */}
      <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
        {steps.map((st, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n || (n === 5 && saved);
          return (
            <div key={n} className="d-flex align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-2 px-2 py-1 ${active ? "btn-primary" : done ? "btn-outline-success" : "btn-outline-secondary"}`}
                onClick={() => setStep(n)}
                style={{ fontSize: 12 }}
              >
                <StepBadge n={n} active={active} done={done} />
                <span className="d-none d-md-inline">{st.label}</span>
              </button>
              {i < steps.length - 1 && <i className="bi bi-chevron-right text-muted" style={{ fontSize: 10 }} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Overview ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-1"><i className="bi bi-google me-2 text-primary" />Google Integration</h5>
            <p className="text-muted mb-4">
              Connecting Google lets you use <strong>Search Console</strong> (index monitoring, URL inspection, sitemaps)
              and <strong>Google Business Profile</strong> (reviews, posts, insights) directly from this CMS.
            </p>

            <h6 className="fw-semibold mb-3">What you&apos;ll need</h6>
            <ul className="list-group list-group-flush mb-4">
              {[
                { icon: "bi-check-circle-fill text-success", text: "A Google account that manages your Search Console property and/or Business Profile" },
                { icon: "bi-check-circle-fill text-success", text: "Access to Google Cloud Console to create OAuth credentials (free)" },
                { icon: "bi-check-circle-fill text-success", text: "The GSC_ENCRYPTION_KEY environment variable set on your server (64 hex chars)" },
              ].map((item, i) => (
                <li key={i} className="list-group-item border-0 ps-0 d-flex align-items-start gap-2">
                  <i className={`bi ${item.icon} mt-1 flex-shrink-0`} />
                  <span className="small">{item.text}</span>
                </li>
              ))}
            </ul>

            {!s.encryptionConfigured && (
              <div className="alert alert-warning mb-4">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                <strong>GSC_ENCRYPTION_KEY not set.</strong> This server env var is required before saving credentials.
                Generate one with:<br />
                <code className="small">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</code>
              </div>
            )}

            {s.encryptionConfigured && (
              <div className="alert alert-success mb-4">
                <i className="bi bi-lock-fill me-2" />
                <strong>Encryption configured.</strong> Credentials will be stored with AES-256-GCM encryption.
              </div>
            )}

            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Get Started <i className="bi bi-arrow-right ms-1" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Google Cloud setup ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-1">Set up Google Cloud</h5>
            <p className="text-muted small mb-4">Follow these steps in Google Cloud Console. Each link opens in a new tab.</p>

            <ol className="list-group list-group-numbered mb-4">
              {[
                {
                  title: "Create or select a Google Cloud project",
                  detail: "Go to the Google Cloud Console and create a new project (or select an existing one).",
                  link: "https://console.cloud.google.com/projectcreate",
                  linkLabel: "Create project",
                },
                {
                  title: "Enable the required APIs",
                  detail: "Enable: Google Search Console API and Google My Business API.",
                  link: "https://console.cloud.google.com/apis/library",
                  linkLabel: "Browse APIs",
                },
                {
                  title: "Configure the OAuth consent screen",
                  detail: 'Set app name, user support email. Under "Scopes" add: openid, email, profile. Set publishing status to "In production" or add your email as a test user.',
                  link: "https://console.cloud.google.com/apis/credentials/consent",
                  linkLabel: "Open consent screen",
                },
              ].map((item, i) => (
                <li key={i} className="list-group-item">
                  <div className="ms-2">
                    <div className="fw-semibold">{item.title}</div>
                    <p className="mb-1 small text-muted">{item.detail}</p>
                    <a href={item.link} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                      <i className="bi bi-box-arrow-up-right me-1" />{item.linkLabel}
                    </a>
                  </div>
                </li>
              ))}
            </ol>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setStep(1)}><i className="bi bi-arrow-left me-1" />Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Next: Create Credentials <i className="bi bi-arrow-right ms-1" /></button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Create OAuth credentials ──────────────────────────────── */}
      {step === 3 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-1">Create OAuth 2.0 Credentials</h5>
            <p className="text-muted small mb-4">In Google Cloud Console, create an OAuth Client ID and add the redirect URIs below.</p>

            <ol className="list-group list-group-numbered mb-4">
              <li className="list-group-item">
                <div className="ms-2">
                  <div className="fw-semibold">Open Credentials page</div>
                  <p className="mb-2 small text-muted">Click <strong>+ Create Credentials</strong> → <strong>OAuth client ID</strong>.</p>
                  <a href="https://console.cloud.google.com/apis/credentials/oauthclient" target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                    <i className="bi bi-box-arrow-up-right me-1" />Open Credentials
                  </a>
                </div>
              </li>
              <li className="list-group-item">
                <div className="ms-2">
                  <div className="fw-semibold">Application type</div>
                  <p className="mb-1 small text-muted">Select <strong>Web application</strong>.</p>
                </div>
              </li>
              <li className="list-group-item">
                <div className="ms-2">
                  <div className="fw-semibold">Add Authorised Redirect URIs</div>
                  <p className="mb-2 small text-muted">Add <strong>both</strong> of these URIs exactly as shown:</p>
                  <div className="mb-2">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <code className="bg-light px-2 py-1 rounded small flex-grow-1">{gscCallback}</code>
                      <CopyButton value={gscCallback} />
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Used by: Search Console</div>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <code className="bg-light px-2 py-1 rounded small flex-grow-1">{gbpCallback}</code>
                      <CopyButton value={gbpCallback} />
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Used by: Business Profile</div>
                  </div>
                </div>
              </li>
              <li className="list-group-item">
                <div className="ms-2">
                  <div className="fw-semibold">Save and copy credentials</div>
                  <p className="mb-0 small text-muted">Click <strong>Create</strong>. A dialog shows your <strong>Client ID</strong> and <strong>Client Secret</strong> — copy both.</p>
                </div>
              </li>
            </ol>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setStep(2)}><i className="bi bi-arrow-left me-1" />Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)}>Next: Enter Details <i className="bi bi-arrow-right ms-1" /></button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Enter credentials ──────────────────────────────────────── */}
      {step === 4 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-1">Enter Your Credentials</h5>
            <p className="text-muted small mb-4">Paste the Client ID and Secret from the Google Cloud credential you just created.</p>

            <div className="mb-3">
              <label className="form-label fw-semibold">Google Client ID</label>
              <input
                type="text"
                className={`form-control ${s.clientId && !isValidClientId(s.clientId) ? "is-invalid" : s.clientId && isValidClientId(s.clientId) ? "is-valid" : ""}`}
                value={s.clientId}
                onChange={e => setS(p => ({ ...p, clientId: e.target.value }))}
                placeholder="123456789-abcdefg.apps.googleusercontent.com"
              />
              {s.clientId && !isValidClientId(s.clientId) && (
                <div className="invalid-feedback">Should look like: <code>123456-xxx.apps.googleusercontent.com</code></div>
              )}
              {s.clientId && isValidClientId(s.clientId) && (
                <div className="valid-feedback">Looks good.</div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Google Client Secret</label>
              <input
                type="password"
                className={`form-control ${s.clientSecret && s.clientSecret !== "••••••••" && s.clientSecret.trim().length > 0 ? "is-valid" : ""}`}
                value={s.clientSecret}
                onChange={e => setS(p => ({ ...p, clientSecret: e.target.value }))}
                placeholder={s.clientSecret === "••••••••" ? "Already saved — leave blank to keep" : "Paste client secret"}
              />
              <div className="form-text">Stored encrypted (AES-256-GCM). Leave blank to keep existing value.</div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Your Site Domain</label>
              <input
                type="url"
                className="form-control"
                value={s.redirectUri || origin}
                onChange={e => setS(p => ({ ...p, redirectUri: e.target.value }))}
                placeholder={origin}
              />
              <div className="form-text">
                The redirect URIs registered in Step 3 were based on <strong>{origin}</strong>. Only change this if your domain differs.
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setStep(3)}><i className="bi bi-arrow-left me-1" />Back</button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(5)}
                disabled={!credentialsComplete}
              >
                Next: Verify & Save <i className="bi bi-arrow-right ms-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 5: Verify & save ──────────────────────────────────────────── */}
      {step === 5 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-1">Verify &amp; Save</h5>
            <p className="text-muted small mb-4">Review your configuration before saving.</p>

            {!s.encryptionConfigured && (
              <div className="alert alert-danger mb-4">
                <i className="bi bi-x-circle-fill me-2" />
                <strong>Cannot save:</strong> GSC_ENCRYPTION_KEY environment variable is not set on this server.
                Contact your server administrator.
              </div>
            )}

            <div className="card bg-light border-0 mb-4">
              <div className="card-body">
                <div className="row g-2 small">
                  <div className="col-4 text-muted">Client ID</div>
                  <div className="col-8 font-monospace text-truncate">
                    {s.clientId || <span className="text-danger">Not set</span>}
                    {s.clientId && isValidClientId(s.clientId) && <i className="bi bi-check-circle-fill text-success ms-2" />}
                    {s.clientId && !isValidClientId(s.clientId) && <i className="bi bi-exclamation-circle-fill text-warning ms-2" />}
                  </div>
                  <div className="col-4 text-muted">Client Secret</div>
                  <div className="col-8">
                    {s.clientSecret ? <><span className="font-monospace">••••••••</span><i className="bi bi-check-circle-fill text-success ms-2" /></> : <span className="text-danger">Not set</span>}
                  </div>
                  <div className="col-4 text-muted">Redirect Base</div>
                  <div className="col-8 font-monospace text-truncate">{s.redirectUri || origin}</div>
                  <div className="col-4 text-muted">Encryption</div>
                  <div className="col-8">
                    {s.encryptionConfigured
                      ? <><span className="text-success">AES-256-GCM</span><i className="bi bi-lock-fill text-success ms-2" /></>
                      : <span className="text-danger">Not configured</span>}
                  </div>
                </div>
              </div>
            </div>

            {saved && (
              <div className="alert alert-success mb-3">
                <i className="bi bi-check-circle-fill me-2" />
                <strong>Saved!</strong> You can now connect Search Console and Business Profile from the SEO section.
              </div>
            )}
            {error && <div className="alert alert-danger mb-3"><i className="bi bi-x-circle-fill me-2" />{error}</div>}

            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setStep(4)}><i className="bi bi-arrow-left me-1" />Edit</button>
              <button
                className="btn btn-success"
                onClick={handleSave}
                disabled={saving || !s.encryptionConfigured || !credentialsComplete}
              >
                {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="bi bi-cloud-check me-1" />Save Credentials</>}
              </button>
            </div>

            {saved && (
              <div className="mt-4 pt-3 border-top">
                <h6 className="fw-semibold mb-2">Next steps</h6>
                <ul className="list-unstyled small">
                  <li className="mb-1"><i className="bi bi-arrow-right text-primary me-2" />Go to <strong>SEO → Search Console</strong> to connect your property</li>
                  <li className="mb-1"><i className="bi bi-arrow-right text-primary me-2" />Go to <strong>SEO → Business Profile</strong> to connect your listing</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
