"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import type { SeoConfig } from "@/lib/seo-config";
import { defaultSeoConfig } from "@/lib/seo-config";
import SeoWizardModal from "@/components/admin/SeoWizardModal";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import MediaUploadModal from "@/components/admin/MediaUploadModal";
import GoogleSetupTab from "@/components/admin/GoogleSetupTab";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageAuditResult {
  slug: string;
  title: string;
  status: "pass" | "warn" | "error";
  issues: Array<{ severity: "warning" | "error"; message: string }>;
}

interface AuditResult {
  runAt: string;
  totalPages: number;
  passed: number;
  warnings: number;
  errors: number;
  pages: PageAuditResult[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SeoSettingsPage() {
  const [config, setConfig] = useState<SeoConfig>(defaultSeoConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);
  const [activeTab, setActiveTab] = useState<"site" | "social" | "robots" | "schema" | "google" | "audit">("site");
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [readiness, setReadiness] = useState<{ checks: Array<{ id: string; label: string; pass: boolean; hint?: string; link?: string }>; passCount: number; totalCount: number; canonicalBase: string } | null>(null);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [readinessLoading, setReadinessLoading] = useState(false);

  // ── Load config + last audit on mount ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, auditRes] = await Promise.all([
          fetch("/api/seo"),
          fetch("/api/seo/audit"),
        ]);
        if (cfgRes.ok) {
          const j = await cfgRes.json();
          if (j.success && j.data) setConfig(j.data);
        }
        if (auditRes.ok) {
          const j = await auditRes.json();
          if (j.success && j.data) setAudit(j.data);
        }
      } catch {
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Fetch readiness when audit tab is active ────────────────────────────────
  useEffect(() => {
    if (activeTab !== "audit") return;
    setReadinessLoading(true);
    fetch("/api/seo/readiness")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setReadiness(data); })
      .catch(() => {})
      .finally(() => setReadinessLoading(false));
  }, [activeTab]);

  // ── Auto-dismiss alert ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  // ── Field setters ───────────────────────────────────────────────────────────
  const setField = <K extends keyof SeoConfig>(key: K, value: SeoConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const setSocial = <K extends keyof SeoConfig["social"]>(key: K, value: SeoConfig["social"][K]) =>
    setConfig((prev) => ({ ...prev, social: { ...prev.social, [key]: value } }));

  const setRobots = <K extends keyof SeoConfig["robots"]>(key: K, value: SeoConfig["robots"][K]) =>
    setConfig((prev) => ({ ...prev, robots: { ...prev.robots, [key]: value } }));

  const setSchema = <K extends keyof SeoConfig["structuredData"]>(key: K, value: SeoConfig["structuredData"][K]) =>
    setConfig((prev) => ({ ...prev, structuredData: { ...prev.structuredData, [key]: value } }));

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const j = await res.json();
      if (j.success) {
        setConfig(j.data);
        setAlert({ type: "success", message: "SEO settings saved successfully." });
      } else {
        setAlert({ type: "error", message: j.error || "Failed to save settings." });
      }
    } catch {
      setAlert({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // ── Wizard apply ─────────────────────────────────────────────────────────────
  const handleWizardApply = (patch: Partial<SeoConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...patch,
      social: { ...prev.social, ...(patch.social ?? {}) },
      structuredData: { ...prev.structuredData, ...(patch.structuredData ?? {}) },
    }));
    setAlert({ type: "success", message: "SEO fields populated from wizard. Review and save when ready." });
    setActiveTab("site");
  };

  // ── Run Audit ───────────────────────────────────────────────────────────────
  const handleRunAudit = async () => {
    setRunningAudit(true);
    setActiveTab("audit");
    try {
      const res = await fetch("/api/seo/audit", { method: "POST" });
      const j = await res.json();
      if (j.success && j.data) {
        setAudit(j.data);
        setAlert({ type: "success", message: "SEO audit completed." });
      } else {
        setAlert({ type: "error", message: "Audit failed. Check server logs." });
      }
    } catch {
      setAlert({ type: "error", message: "Network error during audit." });
    } finally {
      setRunningAudit(false);
    }
  };

  // ── Preview helpers ─────────────────────────────────────────────────────────
  const previewTitle = config.siteName
    ? `Page Title ${config.titleSeparator} ${config.siteName}`
    : "Page Title";

  const robotsTxtPreview = [
    "User-agent: *",
    "Allow: /",
    ...(config.robots.disallowPaths || []).map((p) => `Disallow: ${p}`),
    ...(config.robots.includeSitemap && config.canonicalBase
      ? [`Sitemap: ${config.canonicalBase.replace(/\/$/, "")}/sitemap.xml`]
      : []),
  ].join("\n");

  const structuredDataPreview = config.structuredData.enabled && config.structuredData.name
    ? JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": (() => { const t = config.structuredData.type; const arr = Array.isArray(t) ? t : [t || "LocalBusiness"]; return arr.length === 1 ? arr[0] : arr; })(),
          name: config.structuredData.name,
          ...(config.structuredData.telephone ? { telephone: config.structuredData.telephone } : {}),
          ...(config.structuredData.url ? { url: config.structuredData.url } : {}),
          ...(config.structuredData.streetAddress
            ? {
                address: {
                  "@type": "PostalAddress",
                  streetAddress: config.structuredData.streetAddress,
                  addressLocality: config.structuredData.addressLocality,
                  addressCountry: config.structuredData.addressCountry,
                },
              }
            : {}),
        },
        null,
        2
      )
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminLayout title="SEO Settings" subtitle="Search engine optimisation">
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="SEO Settings"
      subtitle="Manage site-wide search engine optimisation"
      actions={
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowWizard(true)}
          >
            <i className="bi bi-magic me-1" />SEO Wizard
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={handleRunAudit}
            disabled={runningAudit}
          >
            {runningAudit ? (
              <><span className="spinner-border spinner-border-sm me-1" />Running…</>
            ) : (
              <><i className="bi bi-clipboard-check me-1" />Run SEO Audit</>
            )}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
            ) : (
              <><i className="bi bi-floppy me-1" />Save Settings</>
            )}
          </button>
        </div>
      }
    >
      {/* Critical: canonicalBase missing warning */}
      {!config.canonicalBase && (
        <div className="alert alert-danger d-flex align-items-start gap-3 mb-4" role="alert">
          <i className="bi bi-exclamation-octagon-fill fs-4 flex-shrink-0 mt-1" />
          <div>
            <strong>Canonical Base URL is not set — SEO is partially broken.</strong>
            <ul className="mb-0 mt-1 ps-3 small">
              <li>Sitemap (<code>/sitemap.xml</code>) returns <strong>zero entries</strong> — Googlebot finds nothing</li>
              <li>No canonical tags on any page → duplicate content risk</li>
              <li>OG images use relative paths → broken social previews on Facebook, LinkedIn &amp; WhatsApp</li>
            </ul>
            <div className="mt-2 small">Set <strong>Canonical Base URL</strong> in the <strong>Site Settings</strong> tab (e.g. <code>https://www.yourcompany.co.za</code>).</div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div className={`alert alert-${alert.type === "success" ? "success" : "danger"} alert-dismissible mb-4`} role="alert">
          <i className={`bi ${alert.type === "success" ? "bi-check-circle" : "bi-exclamation-triangle"} me-2`} />
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)} />
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 flex-wrap gap-1">
        {(["site", "social", "robots", "schema", "google", "audit"] as const).map((tab) => (
          <li key={tab} className="nav-item">
            <button
              className={`nav-link ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "site" && <><i className="bi bi-globe me-1" />Site Settings</>}
              {tab === "social" && <><i className="bi bi-share me-1" />Social & OG</>}
              {tab === "robots" && <><i className="bi bi-robot me-1" />Robots &amp; Sitemap</>}
              {tab === "schema" && <><i className="bi bi-code-slash me-1" />Structured Data</>}
              {tab === "google" && <><i className="bi bi-google me-1" />Google</>}
              {tab === "audit" && (
                <>
                  <i className="bi bi-clipboard-check me-1" />
                  SEO Audit
                  {audit && audit.errors > 0 && (
                    <span className="badge bg-danger ms-1">{audit.errors}</span>
                  )}
                  {audit && audit.errors === 0 && audit.warnings > 0 && (
                    <span className="badge bg-warning text-dark ms-1">{audit.warnings}</span>
                  )}
                </>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* ── Tab: Site Settings ─────────────────────────────────────────────── */}
      {activeTab === "site" && (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-globe me-2 text-primary" />Site Identity</h6>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Site Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={config.siteName}
                    onChange={(e) => setField("siteName", e.target.value)}
                    placeholder="Your Company"
                  />
                  <div className="form-text">Appended to every page title: <em>Page Title {config.titleSeparator} {config.siteName || "Your Company"}</em></div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Title Separator</label>
                  <input
                    type="text"
                    className="form-control"
                    value={config.titleSeparator}
                    onChange={(e) => setField("titleSeparator", e.target.value.slice(0, 5))}
                    placeholder="|"
                    maxLength={5}
                    style={{ width: "80px" }}
                  />
                  <div className="form-text">Character between page title and site name</div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Default Meta Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={config.defaultDescription}
                    onChange={(e) => setField("defaultDescription", e.target.value)}
                    placeholder="Professional services for your region."
                  />
                  <div className={`form-text ${config.defaultDescription.length > 160 ? "text-danger" : config.defaultDescription.length > 130 ? "text-warning" : ""}`}>
                    {config.defaultDescription.length}/160 characters — used for pages without a custom description
                  </div>
                </div>

                <div className="mb-0">
                  <label className="form-label fw-semibold">Canonical Base URL</label>
                  <input
                    type="url"
                    className="form-control"
                    value={config.canonicalBase}
                    onChange={(e) => setField("canonicalBase", e.target.value)}
                    onBlur={(e) => setField("canonicalBase", e.target.value.replace(/\/+$/, ""))}
                    placeholder="https://www.yourcompany.co.za"
                  />
                  <div className="form-text">Used for canonical tags and sitemap. No trailing slash (e.g. <code>https://www.yourcompany.co.za</code>). Required for sitemap.xml to work correctly.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Title preview */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-eye me-2 text-primary" />SERP Preview</h6>
              </div>
              <div className="card-body p-4">
                <div className="border rounded p-3 bg-white" style={{ fontFamily: "Arial, sans-serif" }}>
                  <div style={{ fontSize: "0.8rem", color: "#202124", marginBottom: "2px" }}>
                    {config.canonicalBase || "https://www.yourcompany.co.za"}/page-slug
                  </div>
                  <div style={{ fontSize: "1.15rem", color: "#1a0dab", fontWeight: 400, marginBottom: "4px", lineHeight: 1.3 }}>
                    {previewTitle}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#4d5156", lineHeight: 1.5 }}>
                    {config.defaultDescription || "Your default meta description will appear here…"}
                  </div>
                </div>
                <div className="form-text mt-2">Live preview of how your site appears in Google search results</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Social & OG ──────────────────────────────────────────────── */}
      {activeTab === "social" && (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-share me-2 text-primary" />Open Graph Defaults</h6>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Default OG Image URL</label>
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      value={config.social.ogImage}
                      onChange={(e) => setSocial("ogImage", e.target.value)}
                      placeholder="/images/og-default.jpg"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary flex-shrink-0"
                      onClick={() => setShowMediaPicker(true)}
                      title="Browse Media Library"
                    >
                      <i className="bi bi-folder2-open" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary flex-shrink-0"
                      onClick={() => setShowMediaUpload(true)}
                      title="Upload New Image"
                    >
                      <i className="bi bi-cloud-arrow-up" />
                    </button>
                  </div>
                  <div className="form-text">Used when a page has no custom OG image. Recommended: 1200×630px JPG/PNG. Use an absolute URL for best social sharing compatibility.</div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Twitter Card Type</label>
                  <div className="d-flex gap-3">
                    {(["summary", "summary_large_image"] as const).map((type) => (
                      <div key={type} className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id={`tc-${type}`}
                          name="twitterCard"
                          checked={config.social.twitterCard === type}
                          onChange={() => setSocial("twitterCard", type)}
                        />
                        <label className="form-check-label" htmlFor={`tc-${type}`}>
                          {type === "summary" ? "Summary (small image)" : "Summary Large Image"}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-0">
                  <label className="form-label fw-semibold">Twitter / X Handle</label>
                  <div className="input-group">
                    <span className="input-group-text">@</span>
                    <input
                      type="text"
                      className="form-control"
                      value={config.social.twitterSite.replace(/^@/, "")}
                      onChange={(e) => setSocial("twitterSite", `@${e.target.value.replace(/^@/, "")}`)}
                      placeholder="yourcompany"
                    />
                  </div>
                  <div className="form-text">Shown in Twitter cards. Leave blank to omit.</div>
                </div>
              </div>
            </div>
          </div>

          {/* OG preview card */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-eye me-2 text-primary" />Social Share Preview</h6>
              </div>
              <div className="card-body p-4">
                <div className="border rounded overflow-hidden" style={{ maxWidth: "400px" }}>
                  {config.social.ogImage ? (
                    <img
                      src={config.social.ogImage}
                      alt="OG preview"
                      className="w-100"
                      style={{ height: "150px", objectFit: "cover" }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="bg-secondary d-flex align-items-center justify-content-center" style={{ height: "150px" }}>
                      <i className="bi bi-image text-white" style={{ fontSize: "2rem" }} />
                    </div>
                  )}
                  <div className="p-3 bg-white border-top">
                    <div className="small text-uppercase text-muted mb-1" style={{ fontSize: "0.7rem" }}>
                      {config.canonicalBase?.replace(/^https?:\/\//, "") || "yourcompany.co.za"}
                    </div>
                    <div className="fw-semibold mb-1" style={{ fontSize: "0.875rem" }}>
                      {previewTitle}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.8rem", lineHeight: 1.4 }}>
                      {config.defaultDescription || "Your page description…"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Robots & Sitemap ─────────────────────────────────────────── */}
      {activeTab === "robots" && (
        <div className="row g-4">
          {!config.canonicalBase && (
            <div className="col-12">
              <div className="alert alert-warning mb-0 py-2 small">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                <strong>Canonical Base URL is not set.</strong> The sitemap will use <code>NEXT_PUBLIC_API_URL</code> as fallback. Set the Canonical Base in the <button className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setActiveTab("site")}>Site Settings tab</button> for fully correct robots.txt and sitemap URLs.
              </div>
            </div>
          )}
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-robot me-2 text-primary" />robots.txt Configuration</h6>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Disallow Paths</label>
                  <textarea
                    className="form-control font-monospace"
                    rows={6}
                    value={(config.robots.disallowPaths || []).join("\n")}
                    onChange={(e) =>
                      setRobots(
                        "disallowPaths",
                        e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="/admin&#10;/api&#10;/private"
                  />
                  <div className="form-text">One path per line. These paths will be blocked from search engine crawlers.</div>
                </div>

                <div className="form-check form-switch mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="includeSitemap"
                    role="switch"
                    checked={config.robots.includeSitemap}
                    onChange={(e) => setRobots("includeSitemap", e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="includeSitemap">
                    Include sitemap URL in robots.txt
                    <div className="form-text mb-0">Requires Canonical Base URL to be set</div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* robots.txt preview */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-eye me-2 text-primary" />robots.txt Preview</h6>
              </div>
              <div className="card-body p-0">
                <pre className="p-4 mb-0 rounded font-monospace bg-dark text-success" style={{ fontSize: "0.8rem", minHeight: "180px" }}>
                  {robotsTxtPreview}
                </pre>
              </div>
              <div className="card-footer bg-transparent border-top py-2">
                <div className="form-text mb-0">
                  Live at: <a href="/robots.txt" target="_blank" rel="noopener" className="text-decoration-none">/robots.txt</a>
                  {" · "}
                  <a href="/sitemap.xml" target="_blank" rel="noopener" className="text-decoration-none">/sitemap.xml</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Structured Data ──────────────────────────────────────────── */}
      {activeTab === "schema" && (
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3 d-flex align-items-center justify-content-between">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-code-slash me-2 text-primary" />LocalBusiness Schema</h6>
                <div className="form-check form-switch mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="schemaEnabled"
                    role="switch"
                    checked={config.structuredData.enabled}
                    onChange={(e) => setSchema("enabled", e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="schemaEnabled">
                    {config.structuredData.enabled ? "Enabled" : "Disabled"}
                  </label>
                </div>
              </div>
              <div className={`card-body p-4 ${!config.structuredData.enabled ? "opacity-50" : ""}`}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Business Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={config.structuredData.name}
                      onChange={(e) => setSchema("name", e.target.value)}
                      disabled={!config.structuredData.enabled}
                      placeholder="Your Company Ltd"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Business Type(s)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={Array.isArray(config.structuredData.type) ? config.structuredData.type.join(", ") : config.structuredData.type}
                      onChange={(e) => setSchema("type", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                      disabled={!config.structuredData.enabled}
                      placeholder="LocalBusiness, Store"
                    />
                    <div className="form-text">Comma-separated schema.org types. Use the SEO Wizard for a guided picker.</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Street Address</label>
                    <input
                      type="text"
                      className="form-control"
                      value={config.structuredData.streetAddress}
                      onChange={(e) => setSchema("streetAddress", e.target.value)}
                      disabled={!config.structuredData.enabled}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-semibold">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={config.structuredData.addressLocality}
                      onChange={(e) => setSchema("addressLocality", e.target.value)}
                      disabled={!config.structuredData.enabled}
                      placeholder="Cape Town"
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Country Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={config.structuredData.addressCountry}
                      onChange={(e) => setSchema("addressCountry", e.target.value.toUpperCase().slice(0, 2))}
                      disabled={!config.structuredData.enabled}
                      placeholder="ZA"
                      maxLength={2}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={config.structuredData.telephone}
                      onChange={(e) => setSchema("telephone", e.target.value)}
                      disabled={!config.structuredData.enabled}
                      placeholder="+27 21 000 0000"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Website URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={config.structuredData.url}
                      onChange={(e) => setSchema("url", e.target.value)}
                      disabled={!config.structuredData.enabled}
                      placeholder="https://www.yourcompany.co.za"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* JSON-LD preview */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-header border-bottom bg-transparent py-3">
                <h6 className="mb-0 fw-semibold"><i className="bi bi-eye me-2 text-primary" />JSON-LD Preview</h6>
              </div>
              <div className="card-body p-0">
                <pre className="p-4 mb-0 rounded font-monospace bg-dark text-info" style={{ fontSize: "0.75rem", minHeight: "180px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {structuredDataPreview || "// Enable structured data and fill in Business Name to see preview"}
                </pre>
              </div>
              <div className="card-footer bg-transparent border-top py-2">
                <div className="form-text mb-0">This JSON-LD block is injected into every page &lt;head&gt; when enabled.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Google Setup ──────────────────────────────────────────────── */}
      {activeTab === "google" && <GoogleSetupTab />}

      {/* ── Tab: SEO Audit ────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div>
          {/* Go Live Readiness panel */}
          <div className="card border-0 shadow-sm mb-4">
            <div
              className="card-header bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between"
              style={{ cursor: "pointer" }}
              onClick={() => setReadinessOpen(!readinessOpen)}
            >
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-rocket-takeoff me-2 text-primary" />
                Go Live Readiness
              </h6>
              <div className="d-flex align-items-center gap-2">
                {readinessLoading ? (
                  <span className="spinner-border spinner-border-sm text-muted" />
                ) : readiness ? (
                  <span className={`badge ${readiness.passCount === readiness.totalCount ? "bg-success" : "bg-warning text-dark"}`}>
                    {readiness.passCount}/{readiness.totalCount}
                  </span>
                ) : null}
                <i className={`bi bi-chevron-${readinessOpen ? "up" : "down"} text-muted`} />
              </div>
            </div>
            {readinessOpen && (
              <div className="card-body p-0">
                {readinessLoading ? (
                  <div className="text-center py-4">
                    <span className="spinner-border spinner-border-sm text-primary" />
                    <span className="ms-2 text-muted small">Checking...</span>
                  </div>
                ) : readiness ? (
                  <>
                    <div className="list-group list-group-flush">
                      {readiness.checks.map((check) => (
                        <div key={check.id} className="list-group-item d-flex align-items-start gap-3 py-2 px-4">
                          <span style={{ fontSize: "1.1rem", lineHeight: 1, marginTop: "2px" }}>
                            {check.pass
                              ? <i className="bi bi-check-circle-fill text-success" />
                              : <i className="bi bi-x-circle-fill text-danger" />}
                          </span>
                          <div className="flex-grow-1">
                            <span className="small fw-medium">{check.label}</span>
                            {!check.pass && check.hint && (
                              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                {check.hint}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* GSC info link — always shown */}
                      <div className="list-group-item d-flex align-items-start gap-3 py-2 px-4">
                        <span style={{ fontSize: "1.1rem", lineHeight: 1, marginTop: "2px" }}>
                          <i className="bi bi-link-45deg text-primary" />
                        </span>
                        <div className="flex-grow-1">
                          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="small fw-medium text-decoration-none">
                            Submit to Google Search Console <i className="bi bi-box-arrow-up-right ms-1" />
                          </a>
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                            Google won&apos;t discover your site until you submit it. Takes 1&ndash;4 weeks.
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-3 text-muted small">Unable to load readiness checks</div>
                )}
              </div>
            )}
          </div>

          {/* Summary cards */}
          {audit ? (
            <>
              <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm text-center p-3">
                    <div className="h2 fw-bold mb-0 text-body">{audit.totalPages}</div>
                    <div className="small text-muted">Pages Audited</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm text-center p-3">
                    <div className="h2 fw-bold mb-0 text-success">{audit.passed}</div>
                    <div className="small text-muted">Passed</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm text-center p-3">
                    <div className="h2 fw-bold mb-0 text-warning">{audit.warnings}</div>
                    <div className="small text-muted">Warnings</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm text-center p-3">
                    <div className="h2 fw-bold mb-0 text-danger">{audit.errors}</div>
                    <div className="small text-muted">Errors</div>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="small text-muted">
                  Last run: {new Date(audit.runAt).toLocaleString()}
                </div>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleRunAudit}
                  disabled={runningAudit}
                >
                  {runningAudit ? (
                    <><span className="spinner-border spinner-border-sm me-1" />Running…</>
                  ) : (
                    <><i className="bi bi-arrow-clockwise me-1" />Run Again</>
                  )}
                </button>
              </div>

              {/* Page results */}
              <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Status</th>
                        <th>Page</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.pages.map((p) => (
                        <tr key={p.slug}>
                          <td className="ps-4">
                            {p.status === "pass" && <span className="badge bg-success">Pass</span>}
                            {p.status === "warn" && <span className="badge bg-warning text-dark">Warning</span>}
                            {p.status === "error" && <span className="badge bg-danger">Error</span>}
                          </td>
                          <td>
                            <div className="fw-medium">{p.title}</div>
                            <div className="small text-muted font-monospace">/{p.slug}</div>
                          </td>
                          <td>
                            {p.issues.length === 0 ? (
                              <span className="text-success small"><i className="bi bi-check-circle me-1" />No issues</span>
                            ) : (
                              <ul className="list-unstyled mb-0 small">
                                {p.issues.map((issue, i) => (
                                  <li key={i} className={issue.severity === "error" ? "text-danger" : "text-warning"}>
                                    <i className={`bi ${issue.severity === "error" ? "bi-x-circle" : "bi-exclamation-triangle"} me-1`} />
                                    {issue.message}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-clipboard-check text-body-tertiary" style={{ fontSize: "3rem" }} />
              <h5 className="mt-3 mb-2">No audit data yet</h5>
              <p className="text-muted mb-4">Run an audit to check your pages for SEO issues.</p>
              <button
                className="btn btn-primary"
                onClick={handleRunAudit}
                disabled={runningAudit}
              >
                {runningAudit ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Running…</>
                ) : (
                  <><i className="bi bi-clipboard-check me-1" />Run SEO Audit Now</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      <SeoWizardModal
        show={showWizard}
        onClose={() => setShowWizard(false)}
        onApply={handleWizardApply}
      />
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        filterType="image"
        onSelect={(url) => {
          setSocial("ogImage", url);
          setShowMediaPicker(false);
        }}
      />
      <MediaUploadModal
        isOpen={showMediaUpload}
        onClose={() => setShowMediaUpload(false)}
        acceptedTypes="image/*"
        onUploadComplete={(url) => {
          setSocial("ogImage", url);
          setShowMediaUpload(false);
        }}
      />
    </AdminLayout>
  );
}
