"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CTASection, BackgroundColor, ButtonConfig } from "@/types/section";
import type { FormField } from "@/types/page";
import VerificationModal from "@/components/VerificationModal";
import { readRateLimitMessage } from "@/lib/form-rate-limit-message";
import { resolveCtaFormFields, sectionBgImageLayerStyle, type SectionBgImageProps } from "@/lib/cta-defaults";
import { createEntranceObserver, isEntranceVisible } from "@/lib/entrance-observer";
import { preconnect, preinit } from "react-dom";
import { resolveCtaDesign, ctaFontHref } from "@/lib/cta-design";
import { HERO_FONT_ORIGINS } from "@/lib/hero/hero-fonts";

/**
 * CTAFooter Props
 * Supports both the classic CTA buttons mode and a contact-form mode
 * that renders a validated form with OTP email verification before submission.
 */
interface CTAFooterProps {
  heading: string;
  subheading?: string;
  buttons?: ButtonConfig[];
  contactInfo?: { phone?: string; email?: string; address?: string };
  socialLinks?: Array<{ platform: string; url: string }>;
  background?: BackgroundColor;
  paddingTop?: number;
  paddingBottom?: number;
  fullScreen?: boolean;
  snapThreshold?: number;
  // Contact form mode
  style?: "banner" | "card" | "fullwidth" | "contact-form";
  formFields?: FormField[];
  formTitle?: string;
  submitText?: string;
  formSuccessMessage?: string;
  sectionName?: string;
  /** Section background image (real bgImage* columns, or content.backgroundImage as fallback) */
  bgImage?: SectionBgImageProps;
  fallbackBgImageUrl?: string;
  /** DOM id for the section root, so #<section id> links and the Section Into overlay can find it. */
  sectionId?: string;
  // Optional contact-form presentation (all resolved by lib/cta-design.ts; absent = the classic look)
  design?: unknown;
  eyebrow?: string;
  headingAccent?: string;
  formHint?: string;
  contactLabels?: { phone?: string; email?: string; address?: string };
  paddingTopMobile?: number | null;
  paddingBottomMobile?: number | null;
}

const backgroundClasses: Record<BackgroundColor, string> = {
  white: "bg-white",
  gray: "bg-light",
  blue: "",
  lightblue: "",
  transparent: "",
};

const socialIcons: Record<string, string> = {
  facebook: "bi-facebook",
  twitter: "bi-twitter-x",
  instagram: "bi-instagram",
  linkedin: "bi-linkedin",
  youtube: "bi-youtube",
};

export default function CTAFooter({
  heading,
  subheading,
  buttons,
  contactInfo,
  socialLinks,
  background = "blue",
  paddingTop,
  paddingBottom,
  fullScreen = false,
  snapThreshold = 100,
  style,
  formFields: formFieldsProp,
  formTitle,
  submitText,
  formSuccessMessage,
  sectionName,
  bgImage,
  fallbackBgImageUrl,
  sectionId,
  design,
  eyebrow,
  headingAccent,
  formHint,
  contactLabels,
  paddingTopMobile,
  paddingBottomMobile,
}: CTAFooterProps) {
  const formFields = style === "contact-form" ? resolveCtaFormFields(formFieldsProp) : formFieldsProp;
  const bgLayer = sectionBgImageLayerStyle(bgImage ?? {}, fallbackBgImageUrl);
  const bgClass = backgroundClasses[background] || "";
  // Presentation: ONE resolver (lib/cta-design.ts). Without `design` it returns the classic literals.
  const isContactForm = style === "contact-form";
  const cta = resolveCtaDesign(isContactForm ? design : undefined, {
    background,
    hasBgImage: !!bgLayer,
    style,
    hasFormHint: isContactForm && !!formHint,
  });
  const isBlueBackground = cta.dark;
  const controlClass = cta.control ? ` ${cta.control}` : "";
  const wrapCard = (el: React.ReactElement) =>
    cta.card ? <div className={cta.card.className} style={cta.card.style}>{el}</div> : el;

  // Design fonts: same non-blocking render-time hint the Hero uses (deduped by href).
  if (cta.fonts.length > 0) {
    try {
      preconnect(HERO_FONT_ORIGINS.css);
      preconnect(HERO_FONT_ORIGINS.files, { crossOrigin: "anonymous" });
      for (const family of cta.fonts) preinit(ctaFontHref(family), { as: "style", precedence: "default" });
    } catch {
      /* a resource hint must never break the page */
    }
  }

  const bgColorValue =
    (background?.startsWith("#") || background?.startsWith("rgb"))
      ? background
      : background === "blue"
      ? "#1e40af"
      : background === "lightblue"
      ? "#dbeafe"
      : background === "gray"
      ? "#f8f9fa"
      : background === "transparent"
      ? "transparent"
      : "#ffffff";

  const topPad = paddingTop ?? 100;
  const bottomPad = paddingBottom ?? 80;

  /**
   * Entrance animation for the heading/subheading — scroll-snap-aware.
   *
   * ASSUMPTIONS:
   * 1. This section lives inside #snap-container like every other public
   *    section, so it jumps from ~0% to ~100% visible in one fast native
   *    scroll-snap transition rather than a slow continuous scroll.
   * 2. Only one of the two render branches (contact-form vs standard CTA)
   *    mounts at a time, so a single ref/state pair can drive whichever
   *    branch is active.
   *
   * FAILURE MODES:
   * - A low IntersectionObserver threshold would fire the animation while
   *   the section is still mid-snap-transition, so it finishes (or nearly
   *   finishes) before the section actually settles in front of the user —
   *   the same bug this fix's sibling branch (fix/scroll-triggered-animations)
   *   root-caused and fixed elsewhere. Using the shared
   *   ENTRANCE_VISIBILITY_THRESHOLD constant instead of a second hardcoded
   *   threshold avoids reintroducing that bug here (ONE SYSTEM PER CONCERN).
   * - Observing without disconnecting would re-trigger on every scroll-snap
   *   pass; disconnect() after first fire keeps it one-shot.
   */
  const headingRef = useRef<HTMLDivElement>(null);
  const [isHeadingVisible, setIsHeadingVisible] = useState(false);

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;

    const observer = createEntranceObserver(
      ([entry]) => {
        if (isEntranceVisible(entry)) {
          setIsHeadingVisible(true);
          observer.disconnect();
        }
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const headingEntranceStyle: React.CSSProperties = {
    transition: "opacity 0.8s ease, transform 0.8s ease",
    opacity: isHeadingVisible ? 1 : 0,
    transform: isHeadingVisible ? "translateY(0)" : "translateY(24px)",
  };

  // ── Contact form state ──
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /** Update a single form field value */
  const handleFieldChange = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /**
   * Validate form fields before triggering OTP.
   * Finds the email field and sets otpEmail to open the OTP modal.
   */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields || formFields.length === 0) return;

    // Validate required fields
    const errors: Record<string, string> = {};
    for (const field of formFields) {
      if (field.required && !formValues[field.id]?.trim()) {
        errors[field.id] = `${field.label} is required`;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setShowVerification(true);
  };

  /**
   * Called when OTP is verified — submits the collected form data to the API.
   * Shows the success state regardless of API response to avoid confusing the user.
   */
  const handleOtpVerified = async (_method?: "email" | "keypad") => {
    setShowVerification(false);
    setSubmitError("");
    setSubmitting(true);
    try {
      const fields = (formFields || []).map((f) => ({
        label: f.label,
        value: formValues[f.id] || "",
      }));
      const emailField = (formFields || []).find((f) => f.type === "email");
      const userEmail = emailField ? formValues[emailField.id] : "";

      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields,
          userEmail,
          source: sectionName || "CTA Section",
        }),
      });
      if (res.status === 429) {
        // Rate limited: the submission was NOT accepted — show the server's message, not success.
        setSubmitError(await readRateLimitMessage(res));
        return;
      }
      setSubmitted(true);
    } catch {
      // Show submitted state anyway — email may still have sent
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id={sectionId}
      className={`cms-section ${bgClass}${cta.root.className ? ` ${cta.root.className}` : ""}`}
      data-snap-threshold={snapThreshold}
      style={{
        "--section-bg": bgColorValue,
        "--section-pt": `${topPad}px`,
        "--section-pb": `${bottomPad}px`,
        // Mobile padding is honoured only for designed sections, so classic sections render as before.
        ...(cta.designed && paddingTopMobile != null && { "--section-pt-mobile": `${paddingTopMobile}px` }),
        ...(cta.designed && paddingBottomMobile != null && { "--section-pb-mobile": `${paddingBottomMobile}px` }),
        ...cta.root.vars,
      } as React.CSSProperties}
    >
      {bgLayer && <div aria-hidden="true" style={bgLayer} />}
      {cta.overlay && <div aria-hidden="true" style={cta.overlay} />}
      <div className="section-content-wrapper" style={{ justifyContent: "center", overflowY: "auto" }}>
        <div
          className="container-fluid px-4"
          style={cta.container.style}
        >
        {/* Contact Form: 2-column layout (text left, form right) */}
        {style === "contact-form" && formFields && formFields.length > 0 ? wrapCard(
          <div className={cta.layout.row}>
            {/* Left: heading + subheading + contact info */}
            <div className={cta.layout.left}>
              <div ref={headingRef} style={headingEntranceStyle}>
                {eyebrow && (
                  <p className={cta.eyebrow.className} style={cta.eyebrow.style}>
                    {eyebrow}
                  </p>
                )}
                <h2 className={cta.heading.className} style={cta.heading.style}>
                  {heading}
                  {headingAccent && (
                    <>
                      {" "}
                      <span className={cta.accent.className} style={cta.accent.style}>{headingAccent}</span>
                    </>
                  )}
                </h2>
                {subheading && (
                  <p className={cta.body.className} style={cta.body.style}>
                    {subheading}
                  </p>
                )}
              </div>
              {contactInfo && cta.contact.mode === "tiles" && (
                <ul className={cta.contact.list.className}>
                  {contactInfo.phone && (
                    <li>
                      <a className="cta-d-tile" href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}>
                        <span className="cta-d-ico" aria-hidden="true"><i className="bi bi-telephone-fill" /></span>
                        <span className="cta-d-tile-text">
                          <span className="cta-d-tile-label">{contactLabels?.phone || "Call us"}</span>
                          <span className="cta-d-tile-value">{contactInfo.phone}</span>
                        </span>
                      </a>
                    </li>
                  )}
                  {contactInfo.email && (
                    <li>
                      <a className="cta-d-tile" href={`mailto:${contactInfo.email}`}>
                        <span className="cta-d-ico" aria-hidden="true"><i className="bi bi-envelope-fill" /></span>
                        <span className="cta-d-tile-text">
                          <span className="cta-d-tile-label">{contactLabels?.email || "Email"}</span>
                          <span className="cta-d-tile-value">{contactInfo.email}</span>
                        </span>
                      </a>
                    </li>
                  )}
                  {contactInfo.address && (
                    <li className="cta-d-way-addr">
                      <div className="cta-d-tile">
                        <span className="cta-d-ico" aria-hidden="true"><i className="bi bi-geo-alt-fill" /></span>
                        <span className="cta-d-tile-text">
                          <span className="cta-d-tile-label">{contactLabels?.address || "Visit"}</span>
                          <span className="cta-d-tile-value">{contactInfo.address}</span>
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              )}
              {contactInfo && cta.contact.mode === "plain" && (
                <ul className={cta.contact.list.className} style={cta.contact.list.style}>
                  {contactInfo.phone && (
                    <li className={cta.contact.item}>
                      <i className={`bi bi-telephone-fill ${cta.contact.icon.className}`} style={cta.contact.icon.style} />
                      <a
                        href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                        className={cta.contact.phoneLink.className}
                        style={cta.contact.phoneLink.style}
                      >
                        {contactInfo.phone}
                      </a>
                    </li>
                  )}
                  {contactInfo.email && (
                    <li className={cta.contact.item}>
                      <i className={`bi bi-envelope-fill ${cta.contact.icon.className}`} style={cta.contact.icon.style} />
                      <a
                        href={`mailto:${contactInfo.email}`}
                        className={cta.contact.emailLink.className}
                        style={cta.contact.emailLink.style}
                      >
                        {contactInfo.email}
                      </a>
                    </li>
                  )}
                  {contactInfo.address && (
                    <li className={cta.contact.itemLast}>
                      <i className={`bi bi-geo-alt-fill ${cta.contact.icon.className}`} style={cta.contact.icon.style} />
                      <span className={cta.contact.address.className} style={cta.contact.address.style}>
                        {contactInfo.address}
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Right: form card */}
            <div className={cta.layout.right}>
              <div
                className={cta.formCard.className}
                style={cta.formCard.style}
              >
                {submitted ? (
                  <div className={cta.success.className} style={cta.success.style}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {formSuccessMessage || "Thank you! We'll be in touch shortly."}
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} noValidate>
                    {formTitle && (
                      <h5 className={cta.title.className} style={cta.title.style}>
                        {formTitle}
                      </h5>
                    )}
                    {formHint && (
                      <p className={cta.hint.className} style={cta.hint.style}>
                        {formHint}
                      </p>
                    )}
                    {formFields.map((field, fi) => {
                      const isHalf = (field as any).fieldWidth === 'half';
                      const prevHalf = fi > 0 && (formFields[fi - 1] as any).fieldWidth === 'half';
                      const nextHalf = fi < formFields.length - 1 && (formFields[fi + 1] as any).fieldWidth === 'half';
                      const wrapperStyle: React.CSSProperties = isHalf
                        ? { display: 'inline-block', width: '50%', verticalAlign: 'top', paddingRight: nextHalf && !prevHalf ? '8px' : '0', paddingLeft: prevHalf ? '8px' : '0' }
                        : { display: 'block' };
                      return (
                      <div className={cta.fieldWrap} key={field.id} style={wrapperStyle}>
                        <label
                          className={cta.label.className}
                          style={cta.label.style}
                        >
                          {field.label}
                          {field.required && <span className="text-danger ms-1">*</span>}
                        </label>

                        {field.type === "textarea" ? (
                          <textarea
                            className={`form-control ${formErrors[field.id] ? "is-invalid" : ""}${controlClass}`}
                            rows={3}
                            placeholder={field.placeholder}
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          />
                        ) : field.type === "select" ? (
                          <select
                            className={`form-select ${formErrors[field.id] ? "is-invalid" : ""}${controlClass}`}
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          >
                            <option value="">Select…</option>
                            {field.options?.map((opt) => {
                              const val = typeof opt === "string" ? opt : opt.value;
                              const lbl = typeof opt === "string" ? opt : opt.label;
                              return <option key={val} value={val}>{lbl}</option>;
                            })}
                          </select>
                        ) : field.type === "checkbox" ? (
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className={`form-check-input ${formErrors[field.id] ? "is-invalid" : ""}`}
                              id={`cta-field-${field.id}`}
                              checked={formValues[field.id] === "true"}
                              onChange={(e) => handleFieldChange(field.id, e.target.checked ? "true" : "")}
                            />
                            <label
                              className={cta.checkLabel.className}
                              style={cta.checkLabel.style}
                              htmlFor={`cta-field-${field.id}`}
                            >
                              {field.placeholder || field.label}
                            </label>
                          </div>
                        ) : (
                          <input
                            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                            className={`form-control ${formErrors[field.id] ? "is-invalid" : ""}${controlClass}`}
                            placeholder={field.placeholder}
                            value={formValues[field.id] || ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          />
                        )}

                        {formErrors[field.id] && (
                          <div className="invalid-feedback d-block" style={{ fontSize: 12 }}>
                            {formErrors[field.id]}
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {submitError && (
                      <div className={cta.error.className} role="alert" style={cta.error.style}>
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className={cta.button.className}
                      style={cta.button.style}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Submitting…</>
                      ) : (
                        <>
                          {cta.button.iconClassName && cta.button.iconPosition === "before" && <i className={cta.button.iconClassName} />}
                          {submitText || "Submit Request"}
                          {cta.button.iconClassName && cta.button.iconPosition === "after" && <i className={cta.button.iconClassName} />}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Standard CTA: centered heading + optional buttons */
          <div className="text-center mb-4">
            <div ref={headingRef} style={headingEntranceStyle}>
              <h2 className={`display-5 fw-bold mb-3 ${isBlueBackground ? "text-white" : "text-dark"}`}>
                {heading}
              </h2>
              {subheading && (
                <p className={`lead mb-4 ${isBlueBackground ? "text-white opacity-75" : "text-muted"}`}>
                  {subheading}
                </p>
              )}
            </div>
            {buttons && buttons.length > 0 && (
              <div className="d-flex flex-wrap justify-content-center gap-3 mb-5">
                {buttons.map((button, index) => (
                  <Link
                    key={index}
                    href={button.href}
                    className={`btn btn-lg ${
                      button.variant === "primary"
                        ? isBlueBackground ? "btn-light text-primary" : "btn-primary"
                        : button.variant === "secondary"
                        ? "btn-secondary"
                        : isBlueBackground ? "btn-outline-light" : "btn-outline-primary"
                    }`}
                  >
                    {button.text}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact Info & Social Links — contactInfo is shown in left panel for contact-form style */}
        {((contactInfo && style !== 'contact-form') || socialLinks) && (
          <div className="row justify-content-center">
            {/* Contact Information (non contact-form styles only) */}
            {contactInfo && style !== 'contact-form' && (
              <div className="col-md-6 col-lg-4 text-center mb-4 mb-md-0">
                <h5
                  className={`fw-semibold mb-3 ${
                    isBlueBackground ? "text-white" : "text-dark"
                  }`}
                >
                  Contact Us
                </h5>
                <ul className="list-unstyled mb-0">
                  {contactInfo.phone && (
                    <li className="mb-2">
                      <a
                        href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                        className={`text-decoration-none ${
                          isBlueBackground
                            ? "text-white opacity-75"
                            : "text-muted"
                        }`}
                      >
                        <i className="bi bi-telephone me-2"></i>
                        {contactInfo.phone}
                      </a>
                    </li>
                  )}
                  {contactInfo.email && (
                    <li className="mb-2">
                      <a
                        href={`mailto:${contactInfo.email}`}
                        className={`text-decoration-none ${
                          isBlueBackground
                            ? "text-white opacity-75"
                            : "text-muted"
                        }`}
                      >
                        <i className="bi bi-envelope me-2"></i>
                        {contactInfo.email}
                      </a>
                    </li>
                  )}
                  {contactInfo.address && (
                    <li>
                      <span
                        className={
                          isBlueBackground
                            ? "text-white opacity-75"
                            : "text-muted"
                        }
                      >
                        <i className="bi bi-geo-alt me-2"></i>
                        {contactInfo.address}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Social Links */}
            {socialLinks && socialLinks.length > 0 && (
              <div className="col-md-6 col-lg-4 text-center">
                <h5
                  className={`fw-semibold mb-3 ${
                    isBlueBackground ? "text-white" : "text-dark"
                  }`}
                >
                  Follow Us
                </h5>
                <div className="d-flex justify-content-center gap-3">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn btn-lg ${
                        isBlueBackground
                          ? "btn-outline-light"
                          : "btn-outline-secondary"
                      } rounded-circle p-0`}
                      style={{ width: "48px", height: "48px", lineHeight: "46px" }}
                      title={social.platform}
                    >
                      <i className={`bi ${socialIcons[social.platform] || "bi-link"}`}></i>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Verification modal — email OTP on desktop, keypad on mobile */}
      {(() => {
        const emailField = formFields?.find((f) => f.type === "email");
        const verifyEmail = emailField ? formValues[emailField.id] : undefined;
        return (
          <VerificationModal
            isOpen={showVerification}
            onClose={() => setShowVerification(false)}
            onVerified={handleOtpVerified}
            email={verifyEmail}
            purpose="cta-form"
            context="submit your enquiry"
          />
        );
      })()}
    </section>
  );
}
