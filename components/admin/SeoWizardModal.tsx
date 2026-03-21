"use client";

import { useState } from "react";
import type { SeoConfig } from "@/lib/seo-config";

// ─── Business type options ─────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: "LocalBusiness",       label: "Local Business (general)" },
  { value: "Organization",        label: "Organization / Company" },
  { value: "Store",               label: "Store / Retail" },
  { value: "Restaurant",          label: "Restaurant / Food" },
  { value: "HomeAndConstructionBusiness", label: "Construction / Home Services" },
  { value: "ProfessionalService", label: "Professional Services (legal, medical, etc.)" },
  { value: "AutomotiveBusiness",  label: "Automotive" },
  { value: "HealthAndBeautyBusiness", label: "Health & Beauty" },
  { value: "TravelAgency",        label: "Travel & Tourism" },
  { value: "SportsActivityLocation", label: "Sports & Recreation" },
];

// ─── Wizard steps ──────────────────────────────────────────────────────────

type Step = "basics" | "location" | "keywords" | "preview";

interface WizardData {
  businessName: string;
  /** Predefined types ticked by the user */
  businessTypes: string[];
  /** Free-text custom types, comma-separated */
  customTypes: string;
  tagline: string;
  websiteUrl: string;
  phone: string;
  streetAddress: string;
  city: string;
  country: string;
  keywords: string;
  twitterHandle: string;
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
};

// ─── Description generator ─────────────────────────────────────────────────

function generateDescription(data: WizardData): string {
  const name   = data.businessName || "We";
  const city   = data.city         || "";
  const kws    = data.keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 3);

  const kwPhrase = kws.length > 0 ? kws.join(", ") : "our services";
  const cityPart = city ? ` in ${city}` : "";

  if (data.tagline) {
    const desc = `${name}${cityPart} — ${data.tagline}. Specialising in ${kwPhrase}.`;
    return desc.slice(0, 160);
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
  const allTypes = getAllTypes(data);
  const typeName = typeMap[allTypes[0]] || allTypes[0] || "business";
  const desc = `${name} is a trusted ${typeName}${cityPart} specialising in ${kwPhrase}. Contact us for a quote today.`;
  return desc.slice(0, 160);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Merge preset + custom types, deduplicated, blanks removed */
function getAllTypes(data: WizardData): string[] {
  const custom = data.customTypes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...data.businessTypes, ...custom])];
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  show: boolean;
  onClose: () => void;
  /** Called when user applies generated config — merges into parent state */
  onApply: (patch: Partial<SeoConfig>) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SeoWizardModal({ show, onClose, onApply }: Props) {
  const [step, setStep]   = useState<Step>("basics");
  const [data, setData]   = useState<WizardData>(EMPTY);

  if (!show) return null;

  const set = <K extends keyof WizardData>(key: K, value: WizardData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  // ── Derived preview values ───────────────────────────────────────────────

  const generatedDesc     = generateDescription(data);
  const canonicalBase     = data.websiteUrl.trim().replace(/\/$/, "");
  const twitterHandle     = data.twitterHandle
    ? `@${data.twitterHandle.replace(/^@/, "")}`
    : "";

  // ── Build the SEO patch ──────────────────────────────────────────────────

  function buildPatch(): Partial<SeoConfig> {
    return {
      siteName:           data.businessName || undefined,
      defaultDescription: generatedDesc,
      canonicalBase:      canonicalBase || undefined,
      social: {
        ogImage:      "/images/logo-placeholder.svg",
        twitterCard:  "summary_large_image",
        twitterSite:  twitterHandle,
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

  // ── Step validation ──────────────────────────────────────────────────────

  const basicsValid    = data.businessName.trim().length > 1;
  const locationValid  = true; // optional fields
  const keywordsValid  = true; // optional

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

  // ── Render ───────────────────────────────────────────────────────────────

  const steps: Step[] = ["basics", "location", "keywords", "preview"];
  const stepIdx = steps.indexOf(step);

  const stepLabel: Record<Step, string> = {
    basics:   "Business Info",
    location: "Location & Contact",
    keywords: "Keywords & Description",
    preview:  "Review & Apply",
  };

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={handleClose} />

      {/* Modal */}
      <div
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
                  <i className="bi bi-magic me-2 text-primary" />
                  SEO Wizard
                </h5>
                <p className="text-muted mb-0 small">Answer a few questions to auto-populate your SEO settings</p>
              </div>
              <button type="button" className="btn-close" onClick={handleClose} />
            </div>

            {/* Progress bar */}
            <div className="px-4 pt-3">
              <div className="d-flex gap-2 mb-1">
                {steps.map((s, i) => (
                  <div
                    key={s}
                    className="flex-grow-1 rounded"
                    style={{
                      height: "4px",
                      background: i <= stepIdx ? "var(--bs-primary)" : "var(--bs-border-color)",
                      transition: "background 0.2s",
                    }}
                  />
                ))}
              </div>
              <div className="d-flex justify-content-between">
                {steps.map((s, i) => (
                  <small
                    key={s}
                    className={i <= stepIdx ? "text-primary fw-semibold" : "text-muted"}
                    style={{ fontSize: "0.7rem" }}
                  >
                    {stepLabel[s]}
                  </small>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="modal-body p-4">

              {/* ── Step 1: Basics ─────────────────────────────────────────── */}
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
                    <div className="form-text mb-2">
                      Select all that apply — used for Google&apos;s structured data (schema.org).
                    </div>

                    {/* Predefined type checkboxes */}
                    <div className="row g-2 mb-3">
                      {BUSINESS_TYPES.map((bt) => {
                        const checked = data.businessTypes.includes(bt.value);
                        return (
                          <div key={bt.value} className="col-12 col-md-6">
                            <div
                              className={`form-check border rounded px-3 py-2 ${checked ? "border-primary bg-primary bg-opacity-10" : "border-secondary-subtle"}`}
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                set(
                                  "businessTypes",
                                  checked
                                    ? data.businessTypes.filter((t) => t !== bt.value)
                                    : [...data.businessTypes, bt.value],
                                )
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

                    {/* Custom types */}
                    <label className="form-label small fw-semibold">Custom types <span className="fw-normal text-muted">(comma-separated)</span></label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. ConcreteContractor, BuildingSupplier"
                      value={data.customTypes}
                      onChange={(e) => set("customTypes", e.target.value)}
                    />
                    <div className="form-text">Any schema.org type not listed above. See <a href="https://schema.org/LocalBusiness" target="_blank" rel="noopener noreferrer">schema.org</a> for the full list.</div>

                    {/* Summary badges */}
                    {getAllTypes(data).length > 0 && (
                      <div className="mt-2 d-flex flex-wrap gap-1">
                        {getAllTypes(data).map((t) => (
                          <span key={t} className="badge bg-primary bg-opacity-75">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label fw-semibold">One-line Tagline <span className="text-muted fw-normal">(optional)</span></label>
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

              {/* ── Step 2: Location & Contact ─────────────────────────────── */}
              {step === "location" && (
                <div className="vstack gap-4">
                  <div>
                    <label className="form-label fw-semibold">Website URL <span className="text-muted fw-normal">(optional)</span></label>
                    <input
                      autoFocus
                      type="url"
                      className="form-control"
                      placeholder="https://www.overbergreadymix.co.za"
                      value={data.websiteUrl}
                      onChange={(e) => set("websiteUrl", e.target.value)}
                    />
                    <div className="form-text">Used as the canonical base URL for sitemap and structured data.</div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">Phone Number <span className="text-muted fw-normal">(optional)</span></label>
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
                      <label className="form-label fw-semibold">Street Address <span className="text-muted fw-normal">(optional)</span></label>
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
                    <label className="form-label fw-semibold">Twitter / X Handle <span className="text-muted fw-normal">(optional)</span></label>
                    <div className="input-group">
                      <span className="input-group-text">@</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="overbergreadymix"
                        value={data.twitterHandle.replace(/^@/, "")}
                        onChange={(e) => set("twitterHandle", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Keywords ───────────────────────────────────────── */}
              {step === "keywords" && (
                <div className="vstack gap-4">
                  <div>
                    <label className="form-label fw-semibold">Primary Keywords <span className="text-muted fw-normal">(optional)</span></label>
                    <input
                      autoFocus
                      type="text"
                      className="form-control"
                      placeholder="ready-mix concrete, concrete delivery, Overberg"
                      value={data.keywords}
                      onChange={(e) => set("keywords", e.target.value)}
                    />
                    <div className="form-text">Comma-separated. Used to build your meta description. 3–5 terms is ideal.</div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold">Generated Meta Description</label>
                    <div className="p-3 bg-body-tertiary rounded border">
                      <p className="mb-0" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                        {generateDescription({ ...data })}
                      </p>
                    </div>
                    <div className={`form-text ${generatedDesc.length > 155 ? "text-warning" : ""}`}>
                      {generatedDesc.length}/160 characters — updates live as you type keywords
                    </div>
                  </div>

                  <div className="alert alert-info small mb-0">
                    <i className="bi bi-lightbulb me-1" />
                    You can edit the generated description manually after applying the wizard.
                  </div>
                </div>
              )}

              {/* ── Step 4: Preview ────────────────────────────────────────── */}
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
                        {generatedDesc}
                      </div>
                    </div>
                  </div>

                  {/* Field summary table */}
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
                            ["Site Name",          data.businessName || "—"],
                            ["Meta Description",   generatedDesc],
                            ["Canonical URL",      canonicalBase || "—"],
                            ["Schema Type(s)",      getAllTypes(data).join(", ") || "—"],
                            ["Business Name",      data.businessName || "—"],
                            ["Address",            [data.streetAddress, data.city, data.country].filter(Boolean).join(", ") || "—"],
                            ["Phone",              data.phone || "—"],
                            ["Twitter Handle",     twitterHandle || "—"],
                            ["Structured Data",    "Enabled"],
                          ].map(([label, value]) => (
                            <tr key={label}>
                              <td className="ps-3 text-muted" style={{ width: "40%", fontSize: "0.8rem" }}>{label}</td>
                              <td className="pe-3" style={{ fontSize: "0.8rem", wordBreak: "break-word" }}>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

              {step !== "preview" && (
                <button
                  className="btn btn-primary"
                  disabled={step === "basics" && !basicsValid}
                  onClick={() => setStep(steps[stepIdx + 1] as Step)}
                >
                  Next <i className="bi bi-arrow-right ms-1" />
                </button>
              )}

              {step === "preview" && (
                <button className="btn btn-success" onClick={handleApply}>
                  <i className="bi bi-check-circle me-1" />Apply to SEO
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
