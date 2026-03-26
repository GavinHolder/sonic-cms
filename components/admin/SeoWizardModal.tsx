"use client";

import { useState, useEffect, useCallback } from "react";
import type { SeoConfig } from "@/lib/seo-config";

// ─── Business type options ──────────────────────────────────────────────────

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

// ─── Keyword suggestions by business type ───────────────────────────────────

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

// ─── Wizard data types ───────────────────────────────────────────────────────

type Step = "basics" | "location" | "keywords" | "preview" | "golive";

interface ReadinessCheck {
  id: string;
  label: string;
  pass: boolean;
  hint?: string;
  link?: string;
}

interface WizardData {
  businessName: string;
  businessTypes: string[];
  customTypes: string;
  tagline: string;
  websiteUrl: string;
  phone: string;
  streetAddress: string;
  city: string;
  country: string;
  keywords: string;
  twitterHandle: string;
  /** User-edited description override — null means use auto-generated */
  descriptionOverride: string | null;
}

const EMPTY: WizardData = {
  businessName: "",
  businessTypes: ["LocalBusiness"],
  customTypes: "",
  tagline: "",
  websiteUrl: "",
  phone: "",
  streetAddress: "",
  city: "",
  country: "ZA",
  keywords: "",
  twitterHandle: "",
  descriptionOverride: null,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Merge preset + custom types, deduplicated, blanks removed */
function getAllTypes(data: WizardData): string[] {
  const custom = data.customTypes.split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set([...data.businessTypes, ...custom])];
}

/** Suggest keywords based on types, city and name — excluding ones already added */
function getSuggestedKeywords(data: WizardData): string[] {
  const types = getAllTypes(data);
  const suggestions = new Set<string>();

  // Type-based
  for (const type of types) {
    for (const kw of TYPE_KEYWORDS[type] ?? []) suggestions.add(kw);
  }

  // Location variants
  if (data.city) {
    suggestions.add(data.city);
    const firstTypeSuggestion = types[0] ? (TYPE_KEYWORDS[types[0]] ?? [])[0] : null;
    if (firstTypeSuggestion) suggestions.add(`${firstTypeSuggestion} in ${data.city}`);
  }

  // Brand name
  if (data.businessName) suggestions.add(data.businessName);

  // Remove already-added keywords
  const added = new Set(
    data.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
  );
  return [...suggestions].filter((s) => !added.has(s.toLowerCase())).slice(0, 14);
}

/** Auto-generate a meta description from wizard inputs */
function generateDescription(data: WizardData): string {
  const types = getAllTypes(data);
  const name    = data.businessName || "We";
  const city    = data.city         || "";
  const kws     = data.keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 3);
  const kwPhrase = kws.length > 0 ? kws.join(", ") : "our services";
  const cityPart = city ? ` in ${city}` : "";

  if (data.tagline) {
    return `${name}${cityPart} — ${data.tagline}. Specialising in ${kwPhrase}.`.slice(0, 160);
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
  const typeName = typeMap[types[0]] || types[0] || "business";
  return `${name} is a trusted ${typeName}${cityPart} specialising in ${kwPhrase}. Contact us for a quote today.`.slice(0, 160);
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  show: boolean;
  onClose: () => void;
  onApply: (patch: Partial<SeoConfig>) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SeoWizardModal({ show, onClose, onApply }: Props) {
  const [step, setStep] = useState<Step>("basics");
  const [data, setData] = useState<WizardData>(EMPTY);

  if (!show) return null;

  const set = <K extends keyof WizardData>(key: K, value: WizardData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  // ── Derived values ────────────────────────────────────────────────────────

  const autoDescription    = generateDescription(data);
  const activeDescription  = data.descriptionOverride ?? autoDescription;
  const canonicalBase      = data.websiteUrl.trim().replace(/\/$/, "");
  const twitterHandle      = data.twitterHandle ? `@${data.twitterHandle.replace(/^@/, "")}` : "";
  const suggestedKeywords  = getSuggestedKeywords(data);

  // ── Keyword helpers ───────────────────────────────────────────────────────

  function addKeyword(kw: string) {
    const current = data.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!current.map((k) => k.toLowerCase()).includes(kw.toLowerCase())) {
      set("keywords", [...current, kw].join(", "));
    }
  }

  // ── Build SEO patch ───────────────────────────────────────────────────────

  function buildPatch(): Partial<SeoConfig> {
    return {
      siteName:           data.businessName || undefined,
      defaultDescription: activeDescription,
      canonicalBase:      canonicalBase || undefined,
      social: {
        ogImage:     "/images/logo-placeholder.svg",
        twitterCard: "summary_large_image",
        twitterSite: twitterHandle,
      },
      structuredData: {
        enabled:         true,
        type:            getAllTypes(data),
        name:            data.businessName,
        streetAddress:   data.streetAddress,
        addressLocality: data.city,
        addressCountry:  data.country.toUpperCase().slice(0, 2) || "ZA",
        telephone:       data.phone,
        url:             canonicalBase,
      },
    };
  }

  // ── Step validation ───────────────────────────────────────────────────────

  const basicsValid = data.businessName.trim().length > 1;

  function handleApply() {
    onApply(buildPatch());
    onClose();
    setStep("basics");
    setData(EMPTY);
  }

  function handleClose() {
    onClose();
    setStep("basics");
    setData(EMPTY);
  }

  // ── Step metadata ─────────────────────────────────────────────────────────

  const steps: Step[] = ["basics", "location", "keywords", "preview", "golive"];
  const stepIdx = steps.indexOf(step);

  const stepLabel: Record<Step, string> = {
    basics:   "Business Info",
    location: "Location & Contact",
    keywords: "Keywords & Description",
    preview:  "Review & Apply",
    golive:   "Go Live Checklist",
  };

  // ── Go Live readiness checks ─────────────────────────────────────────────
  const [readinessChecks, setReadinessChecks] = useState<ReadinessCheck[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessCanonical, setReadinessCanonical] = useState("");

  const fetchReadiness = useCallback(async () => {
    setReadinessLoading(true);
    try {
      const res = await fetch("/api/seo/readiness");
      if (res.ok) {
        const data = await res.json();
        setReadinessChecks(data.checks ?? []);
        setReadinessCanonical(data.canonicalBase ?? "");
      }
    } catch { /* ignore */ }
    setReadinessLoading(false);
  }, []);

  useEffect(() => {
    if (step === "golive") fetchReadiness();
  }, [step, fetchReadiness]);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose} />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header border-bottom">
              <div>
                <h5 className="modal-title mb-0 fw-bold">
                  <i className="bi bi-magic me-2 text-primary" />SEO Wizard
                </h5>
                <p className="text-muted mb-0 small">Answer a few questions to auto-populate your SEO settings</p>
              </div>
              <button type="button" className="btn-close" onClick={handleClose} />
            </div>

            {/* Progress bar */}
            <div className="px-4 pt-3">
              <div className="d-flex gap-2 mb-1">
                {steps.map((s, i) => (
                  <div key={s} className="flex-grow-1 rounded" style={{
                    height: "4px",
                    background: i <= stepIdx ? "var(--bs-primary)" : "var(--bs-border-color)",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
              <div className="d-flex justify-content-between">
                {steps.map((s, i) => (
                  <small key={s} className={i <= stepIdx ? "text-primary fw-semibold" : "text-muted"} style={{ fontSize: "0.7rem" }}>
                    {stepLabel[s]}
                  </small>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="modal-body p-4">

              {/* ── Step 1: Basics ──────────────────────────────────────── */}
              {step === "basics" && (
                <div className="vstack gap-4">
                  <div>
                    <label className="form-label fw-semibold">Business Name <span className="text-danger">*</span></label>
                    <input
                      autoFocus
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="Overberg Ready Mix"
                      value={data.businessName}
                      onChange={(e) => set("businessName", e.target.value)}
                    />
                    <div className="form-text">This becomes your site name and is used across all SEO fields.</div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">Business Type(s)</label>
                    <div className="form-text mb-2">Select all that apply — used for Google&apos;s structured data (schema.org).</div>

                    <div className="row g-2 mb-3">
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
                              <input
                                className="form-check-input"
                                type="checkbox"
                                readOnly
                                checked={checked}
                                style={{ pointerEvents: "none" }}
                              />
                              <label className="form-check-label small" style={{ pointerEvents: "none" }}>
                                {bt.label}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <label className="form-label small fw-semibold">
                      Custom types <span className="fw-normal text-muted">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. ConcreteContractor, BuildingSupplier"
                      value={data.customTypes}
                      onChange={(e) => set("customTypes", e.target.value)}
                    />
                    <div className="form-text">
                      Any <a href="https://schema.org/LocalBusiness" target="_blank" rel="noopener noreferrer">schema.org</a> type not listed above.
                    </div>

                    {getAllTypes(data).length > 0 && (
                      <div className="mt-2 d-flex flex-wrap gap-1">
                        {getAllTypes(data).map((t) => (
                          <span key={t} className="badge bg-primary bg-opacity-75">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label fw-semibold">
                      One-line Tagline <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="South Africa's most reliable ready-mix concrete supplier"
                      value={data.tagline}
                      onChange={(e) => set("tagline", e.target.value)}
                    />
                    <div className="form-text">Used to build your default meta description. Keep it punchy.</div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Location & Contact ──────────────────────────── */}
              {step === "location" && (
                <div className="vstack gap-4">
                  <div>
                    <label className="form-label fw-semibold">
                      Website URL <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <input
                      autoFocus
                      type="url"
                      className="form-control"
                      placeholder="https://www.yourcompany.com"
                      value={data.websiteUrl}
                      onChange={(e) => set("websiteUrl", e.target.value)}
                    />
                    <div className="form-text">Used as the canonical base URL for sitemap and structured data.</div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">
                      Phone Number <span className="text-muted fw-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="+27 28 000 0000"
                      value={data.phone}
                      onChange={(e) => set("phone", e.target.value)}
                    />
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
                    <div className="col-md-7">
                      <label className="form-label fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Caledon"
                        value={data.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label fw-semibold">Country Code</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ZA"
                        maxLength={2}
                        value={data.country}
                        onChange={(e) => set("country", e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">
                      Twitter / X Handle <span className="text-muted fw-normal">(optional)</span>
                    </label>
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
                </div>
              )}

              {/* ── Step 3: Keywords & Description ──────────────────────── */}
              {step === "keywords" && (
                <div className="vstack gap-4">

                  {/* Keyword input */}
                  <div>
                    <label className="form-label fw-semibold">Primary Keywords <span className="text-muted fw-normal">(optional)</span></label>
                    <input
                      autoFocus
                      type="text"
                      className="form-control"
                      placeholder="ready-mix concrete, concrete delivery, Overberg"
                      value={data.keywords}
                      onChange={(e) => { set("keywords", e.target.value); set("descriptionOverride", null); }}
                    />
                    <div className="form-text">Comma-separated. 3–5 terms is ideal.</div>
                  </div>

                  {/* Keyword suggestions */}
                  {suggestedKeywords.length > 0 && (
                    <div>
                      <label className="form-label small fw-semibold text-muted text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                        <i className="bi bi-lightbulb me-1 text-warning" />Suggested Keywords — click to add
                      </label>
                      <div className="d-flex flex-wrap gap-2">
                        {suggestedKeywords.map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            style={{ fontSize: "0.75rem" }}
                            onClick={() => addKeyword(kw)}
                          >
                            <i className="bi bi-plus me-1" />{kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Editable meta description */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="form-label fw-semibold mb-0">Meta Description</label>
                      {data.descriptionOverride !== null && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-muted"
                          onClick={() => set("descriptionOverride", null)}
                          title="Reset to auto-generated"
                        >
                          <i className="bi bi-arrow-counterclockwise me-1" />Reset to generated
                        </button>
                      )}
                    </div>
                    <textarea
                      className={`form-control ${data.descriptionOverride !== null ? "border-warning" : ""}`}
                      rows={3}
                      value={activeDescription}
                      onChange={(e) => set("descriptionOverride", e.target.value)}
                      placeholder="Your meta description..."
                    />
                    <div className={`d-flex justify-content-between form-text mt-1 ${activeDescription.length > 155 ? "text-warning" : ""}`}>
                      <span>
                        {data.descriptionOverride !== null
                          ? <><i className="bi bi-pencil me-1" />Edited manually</>
                          : <><i className="bi bi-magic me-1" />Auto-generated — edit to customise</>}
                      </span>
                      <span>{activeDescription.length}/160 chars</span>
                    </div>
                  </div>

                  {/* Missing field prompts */}
                  {(!data.businessName || !data.city || !data.tagline) && (
                    <div className="alert alert-info small mb-0 py-2">
                      <i className="bi bi-info-circle me-1" />
                      <strong>Tip:</strong> Adding{" "}
                      {[
                        !data.businessName && "business name",
                        !data.city && "city",
                        !data.tagline && "tagline",
                      ].filter(Boolean).join(", ")} will improve the generated description.
                      {" "}
                      <button className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setStep("basics")}>
                        Go back to add them
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Preview ─────────────────────────────────────── */}
              {step === "preview" && (
                <div className="vstack gap-3">
                  <div className="alert alert-success small mb-0">
                    <i className="bi bi-check-circle me-1" />
                    Ready to apply. Review the generated settings below, then click <strong>Apply to SEO</strong>.
                  </div>

                  {/* SERP preview */}
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent border-bottom py-2">
                      <small className="fw-semibold text-muted text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                        Google Search Preview
                      </small>
                    </div>
                    <div className="card-body p-3" style={{ fontFamily: "Arial, sans-serif" }}>
                      <div style={{ fontSize: "0.75rem", color: "#202124", marginBottom: "2px" }}>
                        {canonicalBase || "https://www.yourcompany.co.za"}/
                      </div>
                      <div style={{ fontSize: "1.1rem", color: "#1a0dab", fontWeight: 400, marginBottom: "4px" }}>
                        Home | {data.businessName || "Your Company"}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#4d5156", lineHeight: 1.5 }}>
                        {activeDescription}
                      </div>
                    </div>
                  </div>

                  {/* Field summary */}
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent border-bottom py-2">
                      <small className="fw-semibold text-muted text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                        Fields That Will Be Updated
                      </small>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-sm table-borderless mb-0">
                        <tbody>
                          {[
                            ["Site Name",       data.businessName || "—"],
                            ["Meta Description", activeDescription],
                            ["Canonical URL",    canonicalBase || "—"],
                            ["Schema Type(s)",   getAllTypes(data).join(", ") || "—"],
                            ["Business Name",    data.businessName || "—"],
                            ["Address",          [data.streetAddress, data.city, data.country].filter(Boolean).join(", ") || "—"],
                            ["Phone",            data.phone || "—"],
                            ["Twitter Handle",   twitterHandle || "—"],
                            ["Structured Data",  "Enabled"],
                          ].map(([label, value]) => (
                            <tr key={label}>
                              <td className="ps-3 text-muted" style={{ width: "38%", fontSize: "0.8rem" }}>{label}</td>
                              <td className="pe-3" style={{ fontSize: "0.8rem", wordBreak: "break-word" }}>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Warnings for missing fields */}
                  {(!canonicalBase || !data.phone || !data.streetAddress) && (
                    <div className="alert alert-warning small mb-0 py-2">
                      <i className="bi bi-exclamation-triangle me-1" />
                      <strong>Some fields are empty:</strong>{" "}
                      {[
                        !canonicalBase && "Website URL (required for sitemap & canonical tags)",
                        !data.phone && "Phone number",
                        !data.streetAddress && "Address",
                      ].filter(Boolean).join(" · ")}.
                      You can fill these in the SEO Settings after applying.
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 5: Go Live Checklist ───────────────────────── */}
              {step === "golive" && (
                <div className="vstack gap-3">
                  <h6 className="fw-bold mb-0">
                    <i className="bi bi-rocket-takeoff me-2 text-primary" />Go Live Checklist
                  </h6>
                  <p className="text-muted small mb-0">Complete these before turning the site live.</p>

                  {readinessLoading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" />
                      <span className="ms-2 text-muted">Checking readiness...</span>
                    </div>
                  ) : (
                    <div className="list-group">
                      {readinessChecks.map((check) => (
                        <div key={check.id} className="list-group-item d-flex align-items-start gap-3 py-3">
                          <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>
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
                                {check.link && (
                                  <a href={check.link} className="ms-2 text-decoration-none" target="_blank" rel="noopener noreferrer">
                                    <i className="bi bi-box-arrow-up-right" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Google Search Console — always shown */}
                      <div className="list-group-item d-flex align-items-start gap-3 py-3">
                        <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>
                          <i className="bi bi-link-45deg text-primary" />
                        </span>
                        <div className="flex-grow-1">
                          <div className="fw-semibold small">Google Search Console</div>
                          <div className="text-muted small mt-1">Submit your site to Google to start appearing in search results.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Badge summary */}
                  {!readinessLoading && readinessChecks.length > 0 && (
                    <div className="text-center">
                      <span className={`badge ${readinessChecks.every(c => c.pass) ? "bg-success" : "bg-warning text-dark"} px-3 py-2`}>
                        {readinessChecks.filter(c => c.pass).length}/{readinessChecks.length} checks passed
                      </span>
                    </div>
                  )}

                  {/* GSC instructions */}
                  <div className="card border-0 bg-light">
                    <div className="card-body p-3">
                      <h6 className="fw-bold small mb-2">
                        <i className="bi bi-google me-1" />Submit to Google Search Console
                      </h6>
                      <p className="small text-muted mb-2">
                        Google won&apos;t discover the site until you tell it the site exists.
                      </p>
                      <ol className="small mb-2 ps-3">
                        <li>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">search.google.com/search-console</a> &rarr; Add property</li>
                        <li>Enter <code>{readinessCanonical || "https://www.yourdomain.co.za"}</code> &rarr; verify via DNS TXT record</li>
                        <li>Submit sitemap: <code>{readinessCanonical || "https://www.yourdomain.co.za"}/sitemap.xml</code></li>
                        <li>Open URL Inspection &rarr; paste homepage URL &rarr; Request Indexing</li>
                      </ol>
                      <p className="small text-muted mb-0">
                        <i className="bi bi-clock me-1" />New sites typically take <strong>1&ndash;4 weeks</strong> to appear in search results after submission.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>

              {step !== "basics" && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setStep(steps[stepIdx - 1] as Step)}
                >
                  <i className="bi bi-arrow-left me-1" />Back
                </button>
              )}

              {step === "preview" && (
                <button className="btn btn-success" onClick={handleApply}>
                  <i className="bi bi-check-circle me-1" />Apply to SEO
                </button>
              )}

              {step !== "preview" && step !== "golive" && (
                <button
                  className="btn btn-primary"
                  disabled={step === "basics" && !basicsValid}
                  onClick={() => setStep(steps[stepIdx + 1] as Step)}
                >
                  Next <i className="bi bi-arrow-right ms-1" />
                </button>
              )}

              {step === "preview" && (
                <button
                  className="btn btn-outline-primary ms-1"
                  onClick={() => setStep("golive")}
                >
                  Go Live Checklist <i className="bi bi-arrow-right ms-1" />
                </button>
              )}

              {step === "golive" && (
                <button className="btn btn-primary" onClick={handleClose}>
                  <i className="bi bi-check-lg me-1" />Done
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
