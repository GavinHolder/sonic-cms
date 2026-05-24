"use client";

import { useState, useEffect, useCallback } from "react";
import type { SeoConfig } from "@/lib/seo-config";

// ── Constants ──────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: "LocalBusiness",               label: "Local Business (general)" },
  { value: "Organization",                label: "Organization / Company" },
  { value: "Store",                       label: "Store / Retail" },
  { value: "Restaurant",                  label: "Restaurant / Food" },
  { value: "HomeAndConstructionBusiness", label: "Construction / Home Services" },
  { value: "ProfessionalService",         label: "Professional Services (legal, medical, etc.)" },
  { value: "AutomotiveBusiness",          label: "Automotive" },
  { value: "HealthAndBeautyBusiness",     label: "Health & Beauty" },
  { value: "TravelAgency",               label: "Travel & Tourism" },
  { value: "SportsActivityLocation",      label: "Sports & Recreation" },
];

const TYPE_KEYWORDS: Record<string, string[]> = {
  LocalBusiness:               ["local services", "trusted", "affordable", "professional", "free quote", "near me"],
  Organization:                ["professional services", "expert team", "industry solutions", "trusted partner"],
  Store:                       ["buy online", "fast delivery", "in stock", "best prices", "free shipping", "shop now"],
  Restaurant:                  ["dine in", "takeaway", "delivery", "reservations", "fresh ingredients", "daily specials"],
  HomeAndConstructionBusiness: ["construction", "renovations", "building contractor", "free quote", "quality workmanship", "licensed & insured"],
  ProfessionalService:         ["consultation", "certified", "qualified professionals", "expert advice", "trusted specialists"],
  AutomotiveBusiness:          ["car service", "vehicle repairs", "certified mechanics", "roadworthy", "auto workshop"],
  HealthAndBeautyBusiness:     ["beauty treatments", "spa & wellness", "appointments available", "health & beauty", "relaxation"],
  TravelAgency:                ["holiday packages", "travel deals", "accommodation", "tour packages", "flights & hotels"],
  SportsActivityLocation:      ["fitness classes", "personal training", "coaching", "gym membership", "sports facilities"],
};

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

interface WizardData {
  // Step 1 — Site Identity
  businessName: string;
  tagline: string;
  businessTypes: string[];
  streetAddress: string;
  city: string;
  country: string;
  phone: string;
  // Step 2 — Canonical URL
  canonicalBase: string;
  // Step 3 — Defaults
  defaultDescription: string;
  ogImage: string;
  twitterCard: "summary" | "summary_large_image";
  twitterHandle: string;
  // Step 4 — Verification (informational — not saved to DB)
  gscTag: string;
  gaId: string;
}

const EMPTY: WizardData = {
  businessName: "",
  tagline: "",
  businessTypes: ["LocalBusiness"],
  streetAddress: "",
  city: "",
  country: "ZA",
  phone: "",
  canonicalBase: "",
  defaultDescription: "",
  ogImage: "",
  twitterCard: "summary_large_image",
  twitterHandle: "",
  gscTag: "",
  gaId: "",
};

interface ReadinessCheck {
  id: string;
  label: string;
  pass: boolean;
  hint?: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  onApply: (patch: Partial<SeoConfig>) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getAllTypes(data: WizardData): string[] {
  return [...new Set(data.businessTypes)].filter(Boolean);
}

function autoDescription(data: WizardData): string {
  const name    = data.businessName || "We";
  const city    = data.city         || "";
  const cityPart = city ? ` in ${city}` : "";

  if (data.tagline) {
    return `${name}${cityPart} — ${data.tagline}.`.slice(0, 160);
  }

  const typeMap: Record<string, string> = {
    LocalBusiness: "local business",
    Organization: "organisation",
    Store: "retailer",
    Restaurant: "restaurant",
    HomeAndConstructionBusiness: "construction and home services provider",
    ProfessionalService: "professional services firm",
    AutomotiveBusiness: "automotive business",
    HealthAndBeautyBusiness: "health and beauty specialist",
    TravelAgency: "travel agency",
    SportsActivityLocation: "sports and recreation facility",
  };
  const type = typeMap[data.businessTypes[0]] || "business";
  return `${name} is a trusted ${type}${cityPart}. Contact us today.`.slice(0, 160);
}

function isValidUrl(raw: string): boolean {
  try { new URL(raw); return true; } catch { return false; }
}

function isHttps(raw: string): boolean {
  return raw.startsWith("https://");
}

// ── Component ──────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<Step, string> = {
  1: "Identity",
  2: "Canonical URL",
  3: "Defaults",
  4: "Verification",
  5: "Go Live",
};

export default function SeoSetupWizardModal({ show, onClose, onApply }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step 2 canonical check
  const [urlChecking, setUrlChecking] = useState(false);
  const [urlStatus, setUrlStatus] = useState<"idle" | "ok" | "warn" | "error">("idle");
  const [urlMsg, setUrlMsg] = useState("");

  // Step 5 readiness
  const [checks, setChecks] = useState<ReadinessCheck[]>([]);
  const [checksLoading, setChecksLoading] = useState(false);
  const [canonicalForChecks, setCanonicalForChecks] = useState("");

  const set = <K extends keyof WizardData>(key: K, val: WizardData[K]) =>
    setData((prev) => ({ ...prev, [key]: val }));

  // ── Canonical URL verification ──────────────────────────────────────────────

  const checkCanonical = useCallback(async (raw: string) => {
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (!trimmed) { setUrlStatus("idle"); setUrlMsg(""); return; }
    if (!isValidUrl(trimmed)) {
      setUrlStatus("error");
      setUrlMsg("Not a valid URL — must include https:// and a domain.");
      return;
    }
    if (!isHttps(trimmed)) {
      setUrlStatus("warn");
      setUrlMsg("HTTP detected — Google prefers HTTPS. Update when you have SSL.");
      return;
    }
    setUrlChecking(true);
    setUrlStatus("idle");
    setUrlMsg("Checking…");
    try {
      const res = await fetch(`/api/seo/check-url?url=${encodeURIComponent(trimmed)}`, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const j = await res.json();
        if (j.reachable) {
          setUrlStatus("ok");
          setUrlMsg("URL resolves correctly.");
        } else {
          setUrlStatus("warn");
          setUrlMsg(j.message || "Could not reach this URL — it may not be live yet.");
        }
      } else {
        setUrlStatus("warn");
        setUrlMsg("Could not verify — save anyway and check once the site is live.");
      }
    } catch {
      setUrlStatus("warn");
      setUrlMsg("Verification timed out — site may not be live yet. You can proceed.");
    } finally {
      setUrlChecking(false);
    }
  }, []);

  // ── Step 5 readiness checks ─────────────────────────────────────────────────

  const fetchChecks = useCallback(async () => {
    setChecksLoading(true);
    try {
      const res = await fetch("/api/seo/readiness");
      if (res.ok) {
        const j = await res.json();
        setChecks(j.checks ?? []);
        setCanonicalForChecks(j.canonicalBase ?? "");
      }
    } catch { /* ignore */ }
    setChecksLoading(false);
  }, []);

  useEffect(() => {
    if (step === 5) fetchChecks();
  }, [step, fetchChecks]);

  // Populate description auto-suggestion when step 3 opens and field is blank
  useEffect(() => {
    if (step === 3 && !data.defaultDescription) {
      set("defaultDescription", autoDescription(data));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Build patch ─────────────────────────────────────────────────────────────

  function buildPatch(): Partial<SeoConfig> {
    const twitter = data.twitterHandle ? `@${data.twitterHandle.replace(/^@/, "")}` : "";
    return {
      siteName: data.businessName || undefined,
      defaultDescription: data.defaultDescription || undefined,
      canonicalBase: data.canonicalBase.trim().replace(/\/+$/, "") || undefined,
      social: {
        ogImage: data.ogImage || "/images/logo-placeholder.svg",
        twitterCard: data.twitterCard,
        twitterSite: twitter,
      },
      structuredData: {
        enabled: true,
        type: getAllTypes(data),
        name: data.businessName,
        streetAddress: data.streetAddress,
        addressLocality: data.city,
        addressCountry: data.country.toUpperCase().slice(0, 2) || "ZA",
        telephone: data.phone,
        url: data.canonicalBase.trim().replace(/\/+$/, ""),
      },
    };
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const patch = buildPatch();
      const res = await fetch("/api/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (!res.ok || j.error) {
        setSaveError(j.error || "Failed to save. Try again.");
        return;
      }
      onApply(patch);
      handleClose();
    } catch {
      setSaveError("Network error — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    onClose();
    // Reset after a tick so the closing animation isn't interrupted
    setTimeout(() => {
      setStep(1);
      setData(EMPTY);
      setUrlStatus("idle");
      setUrlMsg("");
      setChecks([]);
      setSaveError(null);
    }, 200);
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const step1Valid = data.businessName.trim().length >= 2;
  const step2Valid = urlStatus !== "error";
  const step3Valid = data.defaultDescription.length <= 160;
  const allChecksPassed = checks.length > 0 && checks.every((c) => c.pass);

  function canAdvance(): boolean {
    if (step === 1) return step1Valid;
    if (step === 2) return step2Valid && !urlChecking;
    if (step === 3) return step3Valid;
    return true;
  }

  function advance() {
    if (step < 5) setStep((s) => (s + 1) as Step);
  }
  function back() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  if (!show) return null;

  // ── Step body helpers ───────────────────────────────────────────────────────

  const urlStatusColor = urlStatus === "ok" ? "text-success"
    : urlStatus === "warn" ? "text-warning"
    : urlStatus === "error" ? "text-danger"
    : "text-muted";

  const urlStatusIcon = urlStatus === "ok" ? "bi-check-circle-fill"
    : urlStatus === "warn" ? "bi-exclamation-triangle-fill"
    : urlStatus === "error" ? "bi-x-circle-fill"
    : urlChecking ? "bi-hourglass-split"
    : "";

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose} />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="modal-header border-bottom">
              <div>
                <h5 className="modal-title mb-0 fw-bold">
                  <i className="bi bi-magic me-2 text-primary" />SEO Setup Wizard
                </h5>
                <p className="text-muted mb-0 small">Get your SEO configured correctly in 5 steps</p>
              </div>
              <button type="button" className="btn-close" onClick={handleClose} />
            </div>

            {/* ── Progress ────────────────────────────────────────────── */}
            <div className="px-4 pt-3 pb-1">
              <div className="d-flex gap-2 mb-1">
                {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                  <div
                    key={s}
                    className="flex-grow-1 rounded"
                    style={{
                      height: 4,
                      background: s <= step ? "var(--bs-primary)" : "var(--bs-border-color)",
                      transition: "background 0.2s",
                    }}
                  />
                ))}
              </div>
              <div className="d-flex justify-content-between">
                {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                  <small
                    key={s}
                    className={s <= step ? "text-primary fw-semibold" : "text-muted"}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {STEP_LABELS[s]}
                  </small>
                ))}
              </div>
            </div>

            {/* ── Body ───────────────────────────────────────────────── */}
            <div className="modal-body p-4">

              {/* ── Step 1: Site Identity ─────────────────────────────── */}
              {step === 1 && (
                <div className="vstack gap-4">
                  <div>
                    <label className="form-label fw-semibold">
                      Business Name <span className="text-danger">*</span>
                    </label>
                    <input
                      autoFocus
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="Acme Corporation"
                      value={data.businessName}
                      onChange={(e) => set("businessName", e.target.value)}
                    />
                    <div className="form-text">Becomes your site name and appears across all SEO fields.</div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">
                      Tagline <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="South Africa's most reliable ready-mix concrete supplier"
                      value={data.tagline}
                      onChange={(e) => set("tagline", e.target.value)}
                    />
                    <div className="form-text">One punchy line — used to build your default meta description.</div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">Business Type</label>
                    <div className="form-text mb-2">Select all that apply — used for Google&apos;s structured data.</div>
                    <div className="row g-2">
                      {BUSINESS_TYPES.map((bt) => {
                        const checked = data.businessTypes.includes(bt.value);
                        return (
                          <div key={bt.value} className="col-12 col-md-6">
                            <div
                              className={`form-check border rounded px-3 py-2 ${checked ? "border-primary bg-primary bg-opacity-10" : "border-secondary-subtle"}`}
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                set("businessTypes", checked
                                  ? data.businessTypes.filter((t) => t !== bt.value)
                                  : [...data.businessTypes, bt.value])
                              }
                            >
                              <input className="form-check-input" type="checkbox" readOnly checked={checked} style={{ pointerEvents: "none" }} />
                              <label className="form-check-label small" style={{ pointerEvents: "none" }}>{bt.label}</label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        Street Address <span className="text-muted fw-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="123 Main Road"
                        value={data.streetAddress}
                        onChange={(e) => set("streetAddress", e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Cape Town"
                        value={data.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ZA"
                        maxLength={2}
                        value={data.country}
                        onChange={(e) => set("country", e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+27 21 000 0000"
                        value={data.phone}
                        onChange={(e) => set("phone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Canonical URL ─────────────────────────────── */}
              {step === 2 && (
                <div className="vstack gap-4">
                  <div>
                    <div className="alert alert-info py-2 small mb-3">
                      <i className="bi bi-info-circle me-2" />
                      The canonical base URL is the most important SEO setting. It fixes your sitemap, canonical tags, and OG previews in one go.
                    </div>

                    <label className="form-label fw-semibold">
                      Your Website URL <span className="text-danger">*</span>
                    </label>
                    <input
                      autoFocus
                      type="url"
                      className={`form-control form-control-lg ${urlStatus === "error" ? "is-invalid" : urlStatus === "ok" ? "is-valid" : ""}`}
                      placeholder="https://www.yourcompany.co.za"
                      value={data.canonicalBase}
                      onChange={(e) => {
                        set("canonicalBase", e.target.value);
                        setUrlStatus("idle");
                        setUrlMsg("");
                      }}
                      onBlur={(e) => {
                        const val = e.target.value.trim().replace(/\/+$/, "");
                        set("canonicalBase", val);
                        if (val) checkCanonical(val);
                      }}
                    />

                    {(urlMsg || urlChecking) && (
                      <div className={`form-text mt-1 ${urlStatusColor}`}>
                        {urlStatusIcon && <i className={`bi ${urlStatusIcon} me-1`} />}
                        {urlChecking ? "Checking…" : urlMsg}
                      </div>
                    )}
                    {!urlMsg && !urlChecking && (
                      <div className="form-text">
                        No trailing slash. Tab out of the field to verify.
                      </div>
                    )}
                  </div>

                  {data.canonicalBase && isValidUrl(data.canonicalBase) && (
                    <div className="border rounded p-3 bg-light">
                      <div className="small fw-semibold text-muted mb-2">What this enables</div>
                      <ul className="small mb-0 ps-3" style={{ lineHeight: 2 }}>
                        <li>Canonical: <code>{data.canonicalBase}/page-slug</code></li>
                        <li>Sitemap: <code>{data.canonicalBase}/sitemap.xml</code></li>
                        <li>OG URL: <code>{data.canonicalBase}/page-slug</code></li>
                        <li>Structured data URL: <code>{data.canonicalBase}</code></li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3: Defaults ─────────────────────────────────── */}
              {step === 3 && (
                <div className="vstack gap-4">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label fw-semibold mb-0">Default Meta Description</label>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-muted"
                        onClick={() => set("defaultDescription", autoDescription(data))}
                      >
                        <i className="bi bi-arrow-counterclockwise me-1" />Regenerate
                      </button>
                    </div>
                    <textarea
                      autoFocus
                      className={`form-control ${data.defaultDescription.length > 160 ? "is-invalid" : data.defaultDescription.length > 140 ? "border-warning" : ""}`}
                      rows={3}
                      value={data.defaultDescription}
                      onChange={(e) => set("defaultDescription", e.target.value)}
                      placeholder="Describe your business in 50–160 characters…"
                      maxLength={200}
                    />
                    <div className={`form-text ${data.defaultDescription.length > 160 ? "text-danger" : data.defaultDescription.length > 140 ? "text-warning" : "text-muted"}`}>
                      {data.defaultDescription.length}/160 chars
                      {data.defaultDescription.length > 160 && " — too long, will be cut by Google"}
                      {data.defaultDescription.length > 140 && data.defaultDescription.length <= 160 && " — nearly at limit"}
                    </div>
                    <div className="form-text">
                      Used on pages that don&apos;t have their own meta description set.
                    </div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">Default OG Image URL</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://yoursite.com/images/og-default.jpg or /images/og-default.jpg"
                      value={data.ogImage}
                      onChange={(e) => set("ogImage", e.target.value)}
                    />
                    <div className="form-text">
                      Shown when pages are shared on Facebook, LinkedIn, Twitter. Recommended: 1200×630px.
                    </div>
                    {data.ogImage && (
                      <div className="mt-2 border rounded overflow-hidden" style={{ maxWidth: 280 }}>
                        <img
                          src={data.ogImage}
                          alt="OG preview"
                          className="w-100"
                          style={{ height: 140, objectFit: "cover" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Twitter / X Handle</label>
                      <div className="input-group">
                        <span className="input-group-text">@</span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="yourcompany"
                          value={data.twitterHandle.replace(/^@/, "")}
                          onChange={(e) => set("twitterHandle", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Twitter Card Type</label>
                      <select
                        className="form-select"
                        value={data.twitterCard}
                        onChange={(e) => set("twitterCard", e.target.value as "summary" | "summary_large_image")}
                      >
                        <option value="summary_large_image">Large Image (recommended)</option>
                        <option value="summary">Summary with small image</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Verification ─────────────────────────────── */}
              {step === 4 && (
                <div className="vstack gap-4">
                  <p className="text-muted small mb-0">
                    Both fields are optional but strongly recommended. They are only stored so you can reference them — paste them into your DNS or ad platform as instructed below.
                  </p>

                  {/* GSC verification */}
                  <div>
                    <label className="form-label fw-semibold">
                      Google Search Console Verification Tag
                      <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: "0.65rem" }}>optional</span>
                    </label>
                    <input
                      autoFocus
                      type="text"
                      className="form-control font-monospace"
                      placeholder='<meta name="google-site-verification" content="…" />'
                      value={data.gscTag}
                      onChange={(e) => set("gscTag", e.target.value)}
                    />
                    <div className="form-text">
                      Paste the full meta tag from Google Search Console → Settings → Ownership verification → HTML tag.
                    </div>
                    <div className="card border-0 bg-light mt-2 p-3 small">
                      <div className="fw-semibold mb-1">Where to add it in the CMS</div>
                      <p className="mb-1">Go to <strong>Settings → Site Config → Head Tags</strong> and paste the tag there. It will be injected into every page&apos;s <code>&lt;head&gt;</code>.</p>
                    </div>
                  </div>

                  {/* GA4 */}
                  <div>
                    <label className="form-label fw-semibold">
                      Google Analytics 4 Measurement ID
                      <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: "0.65rem" }}>optional</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control font-monospace ${data.gaId && !/^G-[A-Z0-9]+$/.test(data.gaId.trim()) ? "is-invalid" : ""}`}
                      placeholder="G-XXXXXXXXXX"
                      value={data.gaId}
                      onChange={(e) => set("gaId", e.target.value.trim())}
                    />
                    {data.gaId && !/^G-[A-Z0-9]+$/.test(data.gaId.trim()) && (
                      <div className="invalid-feedback">GA4 IDs start with G- followed by uppercase letters and numbers.</div>
                    )}
                    <div className="form-text">
                      Found in Google Analytics → Admin → Data Streams → your stream → Measurement ID.
                    </div>
                    <div className="card border-0 bg-light mt-2 p-3 small">
                      <div className="fw-semibold mb-1">Where to add it in the CMS</div>
                      <p className="mb-0">Go to <strong>Settings → Analytics</strong> and paste the Measurement ID there.</p>
                    </div>
                  </div>

                  <div className="alert alert-success py-2 small mb-0">
                    <i className="bi bi-check-circle me-2" />
                    You can skip this step and add these later from Settings.
                  </div>
                </div>
              )}

              {/* ── Step 5: Go Live Checklist ─────────────────────────── */}
              {step === 5 && (
                <div className="vstack gap-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0">
                      <i className="bi bi-rocket-takeoff me-2 text-primary" />Go Live Checklist
                    </h6>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={fetchChecks}
                      disabled={checksLoading}
                    >
                      <i className={`bi ${checksLoading ? "bi-hourglass-split" : "bi-arrow-clockwise"} me-1`} />
                      Recheck
                    </button>
                  </div>

                  {checksLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" />
                      <span className="ms-2 text-muted small">Running checks…</span>
                    </div>
                  ) : (
                    <div className="list-group">
                      {checks.map((check) => (
                        <div key={check.id} className="list-group-item d-flex align-items-start gap-3 py-3">
                          <span style={{ fontSize: "1.1rem", lineHeight: 1, marginTop: 1 }}>
                            {check.pass
                              ? <i className="bi bi-check-circle-fill text-success" />
                              : <i className="bi bi-x-circle-fill text-danger" />}
                          </span>
                          <div className="flex-grow-1">
                            <div className={`fw-semibold small ${check.pass ? "text-success" : ""}`}>
                              {check.label}
                            </div>
                            {!check.pass && check.hint && (
                              <div className="text-muted small mt-1">
                                <i className="bi bi-arrow-return-right me-1" />
                                {check.hint}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {checks.length === 0 && (
                        <div className="list-group-item text-muted small py-3">
                          No checks returned — check your connection and retry.
                        </div>
                      )}
                    </div>
                  )}

                  {!checksLoading && checks.length > 0 && (
                    <div className="text-center">
                      <span className={`badge px-3 py-2 ${allChecksPassed ? "bg-success" : "bg-warning text-dark"}`}>
                        {checks.filter((c) => c.pass).length}/{checks.length} checks passed
                      </span>
                    </div>
                  )}

                  {/* GSC guide */}
                  <div className="card border-primary" style={{ borderWidth: 2 }}>
                    <div className="card-header bg-primary text-white py-2">
                      <h6 className="mb-0 small fw-bold">
                        <i className="bi bi-google me-2" />Submit to Google Search Console
                      </h6>
                    </div>
                    <div className="card-body p-3 small">
                      <ol className="mb-2 ps-3" style={{ lineHeight: 2 }}>
                        <li>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="fw-semibold">search.google.com/search-console</a></li>
                        <li>Add property → URL prefix → <code>{canonicalForChecks || data.canonicalBase || "https://www.yoursite.com"}</code></li>
                        <li>Verify ownership via DNS TXT record</li>
                        <li>Submit sitemap: <code>{canonicalForChecks || data.canonicalBase || "https://www.yoursite.com"}/sitemap.xml</code></li>
                        <li>URL Inspection → Request indexing for your homepage</li>
                      </ol>
                      <div className="alert alert-info py-2 mb-0 small">
                        <i className="bi bi-clock me-1" />
                        New sites typically take <strong>1–4 weeks</strong> to appear in Google results.
                      </div>
                    </div>
                  </div>

                  {saveError && (
                    <div className="alert alert-danger py-2 small mb-0">
                      <i className="bi bi-exclamation-triangle me-2" />
                      {saveError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={handleClose}>
                Cancel
              </button>

              {step > 1 && (
                <button className="btn btn-outline-secondary" onClick={back}>
                  <i className="bi bi-arrow-left me-1" />Back
                </button>
              )}

              {step < 5 && (
                <button
                  className="btn btn-primary"
                  disabled={!canAdvance()}
                  onClick={advance}
                >
                  Next <i className="bi bi-arrow-right ms-1" />
                </button>
              )}

              {step === 5 && (
                <button
                  className="btn btn-success"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                  ) : (
                    <><i className="bi bi-floppy me-1" />Save & Finish</>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
