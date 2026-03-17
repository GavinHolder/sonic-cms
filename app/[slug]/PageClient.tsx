"use client";

import { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { getPage, getDesignerData } from "@/lib/page-manager";
import { getSections } from "@/lib/section-manager";
import DynamicSection from "@/components/sections/DynamicSection";
import type { PageConfig, PDFPageConfig, FormPageConfig } from "@/types/page";
import type { SectionConfig } from "@/types/section";
import OtpVerificationModal from "@/components/ui/OtpVerificationModal";

const FlexibleSectionRenderer = dynamic(
  () => import("@/components/sections/FlexibleSectionRenderer"),
  { ssr: false }
);

/**
 * Dynamic Page Route
 *
 * Renders pages created through the Pages admin interface.
 * Uses the same section system as the landing page.
 *
 * ASSUMPTIONS:
 * 1. Page slug exists in cms_pages localStorage
 * 2. Page is enabled (disabled pages return 404)
 * 3. For full pages, sections stored in cms_sections_{slug}
 * 4. Navbar automatically rendered by root layout
 *
 * FAILURE MODES:
 * - Page not found → Show 404
 * - Page disabled → Show 404
 * - Sections fail to load → Show empty page (graceful degradation)
 * - localStorage unavailable → Show 404
 */
export default function PageClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [page, setPage] = useState<PageConfig | null>(null);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [designerData, setDesignerData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      try {
        // Fetch page from DB API
        const loadedPage: PageConfig | null = await getPage(slug);

        // Page not found or disabled → 404
        if (!loadedPage || !loadedPage.enabled) {
          notFound();
          return;
        }

        setPage(loadedPage);

        // Load type-specific data
        if (loadedPage.type === "full") {
          const loadedSections = await getSections(slug);
          setSections(loadedSections);
        } else if (loadedPage.type === "designer") {
          const data = getDesignerData(slug);
          setDesignerData(data);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to load page:", error);
        notFound();
      }
    }
    loadPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!page) {
    notFound();
  }

  // Render based on page type
  switch (page.type) {
    case "full":
      return <FullPageRenderer sections={sections} />;
    case "pdf":
      return <PDFPageRenderer page={page as PDFPageConfig} />;
    case "form":
      return <FormPageRenderer page={page as FormPageConfig} />;
    case "designer":
      return <DesignerPageRenderer designerData={designerData} title={page.title} />;
    default:
      notFound();
  }
}

/**
 * Full Page Renderer
 *
 * Renders sections using the same DynamicSection component as landing page.
 * Filters out disabled sections and sorts by order.
 */
function FullPageRenderer({ sections }: { sections: SectionConfig[] }) {
  const enabledSections = sections
    .filter((section) => section.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Empty page is valid (just navbar + footer)
  if (enabledSections.length === 0) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h1 className="display-4 text-body-secondary">Page Under Construction</h1>
          <p className="lead text-body-secondary">
            This page is being built. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {enabledSections.map((section) => (
        <DynamicSection key={section.id} section={section} />
      ))}
    </>
  );
}

/**
 * PDF Page Renderer
 *
 * Displays PDF documents with embed, download, or both modes.
 */
function PDFPageRenderer({ page }: { page: PDFPageConfig }) {
  const { pdfUrl, displayMode, description, title } = page;

  if (!pdfUrl) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          PDF document not configured. Please contact the site administrator.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h1 className="display-5 mb-3">{title}</h1>
      {description && <p className="lead text-body-secondary mb-4">{description}</p>}

      {/* Embed Mode */}
      {(displayMode === "embed" || displayMode === "both") && (
        <div className="ratio ratio-4x3 mb-4 border rounded shadow-sm">
          <iframe
            src={pdfUrl}
            title={title}
            className="rounded"
            style={{ border: "none" }}
          />
        </div>
      )}

      {/* Download Button */}
      {(displayMode === "download" || displayMode === "both") && (
        <div className="d-flex gap-2">
          <a
            href={pdfUrl}
            download
            className="btn btn-primary btn-lg"
          >
            <i className="bi bi-download me-2"></i>
            Download PDF
          </a>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-secondary btn-lg"
          >
            <i className="bi bi-box-arrow-up-right me-2"></i>
            Open in New Tab
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Form Page Renderer
 *
 * Displays contact/inquiry forms with custom fields.
 * Submission flow:
 *  1. User fills in the form and clicks Submit
 *  2. Required-field validation runs client-side
 *  3. An OTP is sent to the email field's value
 *  4. OtpVerificationModal appears — user enters the 6-digit code
 *  5. On successful OTP verification, form data is POSTed to /api/forms/submit
 *
 * ASSUMPTIONS:
 *  1. The form config contains at least one field of type "email"
 *  2. /api/otp/send and /api/otp/verify are available (used by OtpVerificationModal)
 *  3. /api/forms/submit accepts { fields, userEmail, source } JSON body
 *
 * FAILURE MODES:
 *  - No email field → block submission with inline error message
 *  - OTP send failure → handled inside OtpVerificationModal (shows error to user)
 *  - /api/forms/submit network error → silently treat as success (UX choice: avoid double-submit confusion)
 */
function FormPageRenderer({ page }: { page: FormPageConfig }) {
  const { fields, submitConfig, title } = page;
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** OTP flow state — email triggers modal, pendingFormData holds snapshot for post-OTP submit */
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [pendingFormData, setPendingFormData] = useState<Record<string, string>>({});

  /** Update a single field value in formData */
  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  /**
   * Handle form submit:
   * 1. Validate required fields
   * 2. Require an email field value
   * 3. Store form snapshot and trigger OTP modal
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !formData[field.name]?.toString().trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Find email field — required for OTP
    const emailField = fields.find((f) => f.type === "email");
    if (!emailField || !formData[emailField.name]?.toString().trim()) {
      setErrors((prev) => ({
        ...prev,
        [emailField?.name || "_email"]:
          "A valid email address is required for verification",
      }));
      return;
    }

    // Snapshot form data and open OTP modal
    setPendingFormData({ ...formData });
    setOtpEmail(formData[emailField.name].toString().trim());
  };

  /**
   * Called by OtpVerificationModal when the user enters the correct OTP.
   * Posts the pending form data to /api/forms/submit.
   */
  const handleOtpVerified = async () => {
    setOtpEmail(null);
    setIsSubmitting(true);
    try {
      const submittedFields = fields.map((f) => ({
        label: f.label,
        value: pendingFormData[f.name] || "",
      }));
      const emailField = fields.find((f) => f.type === "email");
      const userEmail = emailField ? pendingFormData[emailField.name] || "" : "";

      await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: submittedFields,
          userEmail,
          source: title || "Form Page",
          emailTo: submitConfig?.emailTo || undefined,
          submitAction: submitConfig ? page.submitAction : "email",
          webhookUrl: submitConfig?.webhookUrl || undefined,
        }),
      });
      setSubmitted(true);
    } catch {
      // Network failure — still show success to avoid confusing the user about
      // re-submitting a verified form
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="alert alert-success text-center p-4">
              <i className="bi bi-check-circle display-4 text-success mb-3"></i>
              <h3 className="mb-3">Thank You!</h3>
              <p className="mb-0">
                {submitConfig.successMessage || "Your submission has been received."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <h1 className="display-5 mb-4">{title}</h1>

          <form onSubmit={handleSubmit} className="needs-validation">
            {fields.map((field) => (
              <div key={field.id} className="mb-3">
                <label htmlFor={field.id} className="form-label">
                  {field.label}
                  {field.required && <span className="text-danger ms-1">*</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    id={field.id}
                    name={field.name}
                    className={`form-control${errors[field.name] ? " is-invalid" : ""}`}
                    rows={4}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={field.id}
                    name={field.name}
                    className={`form-select${errors[field.name] ? " is-invalid" : ""}`}
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id={field.id}
                      name={field.name}
                      className={`form-check-input${errors[field.name] ? " is-invalid" : ""}`}
                      required={field.required}
                      checked={formData[field.name] || false}
                      onChange={(e) => handleChange(field.name, e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={field.id}>
                      {field.placeholder || "I agree"}
                    </label>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    id={field.id}
                    name={field.name}
                    className={`form-control${errors[field.name] ? " is-invalid" : ""}`}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                )}

                {/* Inline validation error for this field */}
                {errors[field.name] && (
                  <div className="invalid-feedback d-block">
                    {errors[field.name]}
                  </div>
                )}
              </div>
            ))}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Submit
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* OTP verification modal — shown when user submits a valid form */}
      {otpEmail && (
        <OtpVerificationModal
          email={otpEmail}
          purpose="form-page"
          onVerified={handleOtpVerified}
          onCancel={() => setOtpEmail(null)}
        />
      )}
    </div>
  );
}

/**
 * Designer Page Renderer
 *
 * Renders pages built with the visual designer (flexible-designer.html).
 * Disables snap-container scroll-snap so the page scrolls freely.
 * Uses FlexibleSectionRenderer's DesignerBlocksRenderer to render the blocks.
 *
 * ASSUMPTIONS:
 * 1. designerData is a JSON string matching the flexible-designer format
 * 2. #snap-container is present in the DOM (added by ClientLayout)
 * 3. Snap is safely restored when this component unmounts
 *
 * FAILURE MODES:
 * - Invalid designerData JSON → show empty state
 * - #snap-container not found → no snap to disable (graceful)
 */
function DesignerPageRenderer({ designerData, title }: { designerData: string | null; title: string }) {
  // Disable snap-container for this page so it scrolls freely
  useEffect(() => {
    const snap = document.getElementById("snap-container");
    if (snap) {
      snap.style.overflowY = "auto";
      snap.style.scrollSnapType = "none";
    }
    return () => {
      if (snap) {
        snap.style.overflowY = "scroll";
        snap.style.scrollSnapType = "y mandatory";
      }
    };
  }, []);

  // Empty state when no designer content yet
  if (!designerData) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <i className="bi bi-grid-1x2 text-body-tertiary" style={{ fontSize: "4rem" }}></i>
          <h1 className="display-5 mt-3 mb-2">{title}</h1>
          <p className="lead text-body-secondary">
            This designer page has no content yet. Open the admin editor to build it.
          </p>
        </div>
      </div>
    );
  }

  // Build a synthetic FlexibleSection from the designer JSON so
  // FlexibleSectionRenderer can render it
  const syntheticSection = {
    id: "designer-page",
    type: "flexible" as const,
    enabled: true,
    order: 0,
    background: "transparent" as const,
    paddingTop: 0,
    paddingBottom: 0,
    contentMode: "multi" as const,
    content: {
      contentMode: "multi" as const,
      elements: [],
      designerData,
      layout: { type: "preset" as const, preset: "2-col-split" as const },
    } as any,
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <FlexibleSectionRenderer section={syntheticSection as any} />
    </div>
  );
}
