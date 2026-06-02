"use client";
import { useState, useEffect } from "react";

interface GoogleSettings { clientId: string; clientSecret: string; redirectUri: string; encryptionConfigured: boolean; }

export default function GoogleSettingsTab() {
  const [s, setS] = useState<GoogleSettings>({ clientId: "", clientSecret: "", redirectUri: "", encryptionConfigured: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetch("/api/settings/google").then((r) => r.json()).then(setS).catch(() => {}); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/settings/google", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: s.clientId, clientSecret: s.clientSecret, redirectUri: s.redirectUri }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <h5 className="fw-bold mb-1">Google Integration</h5>
        <p className="text-muted small mb-4">
          OAuth 2.0 credentials for Google Search Console and Google Business Profile.
          Create credentials at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Google Cloud Console</a>.
        </p>
        {!s.encryptionConfigured && (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            <strong>GSC_ENCRYPTION_KEY not set.</strong> Configure this env var (64 hex chars) before saving credentials.
          </div>
        )}
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Google Client ID</label>
            <input type="text" className="form-control" value={s.clientId}
              onChange={(e) => setS((p) => ({ ...p, clientId: e.target.value }))}
              placeholder="123456789-xxx.apps.googleusercontent.com" />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Google Client Secret</label>
            <input type="password" className="form-control" value={s.clientSecret}
              onChange={(e) => setS((p) => ({ ...p, clientSecret: e.target.value }))}
              placeholder={s.clientSecret === "••••••••" ? "Already saved — leave blank to keep" : "Paste client secret"} />
            <div className="form-text">Stored encrypted (AES-256-GCM).</div>
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Redirect URI</label>
            <input type="text" className="form-control" value={s.redirectUri}
              onChange={(e) => setS((p) => ({ ...p, redirectUri: e.target.value }))}
              placeholder="https://yourdomain.com/api/seo/gsc/callback" />
            <div className="form-text">
              Add both <code>/api/seo/gsc/callback</code> and <code>/api/gbp/callback</code> as authorised redirect URIs in Google Cloud.
            </div>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {saved && <div className="alert alert-success">Saved successfully.</div>}
          <button type="submit" className="btn btn-primary" disabled={saving || !s.encryptionConfigured}>
            {saving ? "Saving…" : "Save Google Credentials"}
          </button>
        </form>
      </div>
    </div>
  );
}
