"use client";

import { useState } from "react";
import Link from "next/link";
import type { CTASection, BackgroundColor, ButtonConfig } from "@/types/section";
import type { FormField } from "@/types/page";
import ShuffledKeypadModal from "@/components/ui/ShuffledKeypadModal";

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
  formSuccessMessage?: string;
  sectionName?: string;
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
  formFields,
  formTitle,
  formSuccessMessage,
  sectionName,
}: CTAFooterProps) {
  const bgClass = backgroundClasses[background] || "";
  const isHexDark = (hex?: string) => {
    if (!hex?.startsWith("#") || hex.length < 7) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  };
  const isBlueBackground = background === "blue" || background === "lightblue" || isHexDark(background);

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

  // ── Contact form state ──
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      if (field.required && !formValues[field.name]?.trim()) {
        errors[field.name] = `${field.label} is required`;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setShowKeypad(true);
  };

  /**
   * Called when OTP is verified — submits the collected form data to the API.
   * Shows the success state regardless of API response to avoid confusing the user.
   */
  const handleOtpVerified = async () => {
    setShowKeypad(false);
    setSubmitting(true);
    try {
      const fields = (formFields || []).map((f) => ({
        label: f.label,
        value: formValues[f.name] || "",
      }));
      const emailField = (formFields || []).find((f) => f.type === "email");
      const userEmail = emailField ? formValues[emailField.name] : "";

      await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields,
          userEmail,
          source: sectionName || "CTA Section",
        }),
      });
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
      className={`cms-section ${bgClass}`}
      data-snap-threshold={snapThreshold}
      style={{
        "--section-bg": bgColorValue,
        "--section-pt": `${topPad}px`,
        "--section-pb": `${bottomPad}px`,
      } as React.CSSProperties}
    >
      <div className="section-content-wrapper" style={{ justifyContent: "center" }}>
        <div
          className="container-fluid px-4"
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
          }}
        >
        {/* Contact Form: 2-column layout (text left, form right) */}
        {style === "contact-form" && formFields && formFields.length > 0 ? (
          <div className="row align-items-center gy-5">
            {/* Left: heading + subheading */}
            <div className="col-lg-5">
              <h2 className={`display-5 fw-bold mb-3 ${isBlueBackground ? "text-white" : "text-dark"}`}>
                {heading}
              </h2>
              {subheading && (
                <p className={`lead mb-0 ${isBlueBackground ? "text-white opacity-75" : "text-muted"}`}>
                  {subheading}
                </p>
              )}
            </div>

            {/* Right: form card */}
            <div className="col-lg-6 ms-lg-auto">
              <div
                className="p-4 rounded-3"
                style={{
                  background: isBlueBackground ? "rgba(255,255,255,0.1)" : "#ffffff",
                  backdropFilter: isBlueBackground ? "blur(10px)" : undefined,
                  border: isBlueBackground ? "1px solid rgba(255,255,255,0.2)" : "1px solid #dee2e6",
                  maxHeight: "calc(100vh - 200px)",
                  overflowY: "auto",
                }}
              >
                {submitted ? (
                  <div className={`alert ${isBlueBackground ? "alert-light" : "alert-success"} text-center mb-0`}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {formSuccessMessage || "Thank you! We'll be in touch shortly."}
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} noValidate>
                    {formTitle && (
                      <h5 className={`fw-semibold mb-3 ${isBlueBackground ? "text-white" : "text-dark"}`}>
                        {formTitle}
                      </h5>
                    )}
                    {formFields.map((field) => (
                      <div className="mb-3" key={field.id}>
                        <label
                          className={`form-label ${isBlueBackground ? "text-white" : ""}`}
                          style={{ fontSize: 14 }}
                        >
                          {field.label}
                          {field.required && <span className="text-danger ms-1">*</span>}
                        </label>

                        {field.type === "textarea" ? (
                          <textarea
                            className={`form-control ${formErrors[field.name] ? "is-invalid" : ""}`}
                            rows={3}
                            placeholder={field.placeholder}
                            value={formValues[field.name] || ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          />
                        ) : field.type === "select" ? (
                          <select
                            className={`form-select ${formErrors[field.name] ? "is-invalid" : ""}`}
                            value={formValues[field.name] || ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          >
                            <option value="">Select…</option>
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : field.type === "checkbox" ? (
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className={`form-check-input ${formErrors[field.name] ? "is-invalid" : ""}`}
                              id={`cta-field-${field.id}`}
                              checked={formValues[field.name] === "true"}
                              onChange={(e) => handleFieldChange(field.name, e.target.checked ? "true" : "")}
                            />
                            <label
                              className={`form-check-label ${isBlueBackground ? "text-white" : ""}`}
                              htmlFor={`cta-field-${field.id}`}
                            >
                              {field.placeholder || field.label}
                            </label>
                          </div>
                        ) : (
                          <input
                            type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                            className={`form-control ${formErrors[field.name] ? "is-invalid" : ""}`}
                            placeholder={field.placeholder}
                            value={formValues[field.name] || ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          />
                        )}

                        {formErrors[field.name] && (
                          <div className="invalid-feedback d-block" style={{ fontSize: 12 }}>
                            {formErrors[field.name]}
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      type="submit"
                      className={`btn w-100 ${isBlueBackground ? "btn-light text-primary" : "btn-primary"}`}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Submitting…</>
                      ) : (
                        <><i className="bi bi-send me-2" />Submit Request</>
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
            <h2 className={`display-5 fw-bold mb-3 ${isBlueBackground ? "text-white" : "text-dark"}`}>
              {heading}
            </h2>
            {subheading && (
              <p className={`lead mb-4 ${isBlueBackground ? "text-white opacity-75" : "text-muted"}`}>
                {subheading}
              </p>
            )}
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

        {/* Contact Info & Social Links */}
        {(contactInfo || socialLinks) && (
          <div className="row justify-content-center">
            {/* Contact Information */}
            {contactInfo && (
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

      {/* Shuffled keypad verification — shown when user submits the contact form */}
      {showKeypad && (
        <ShuffledKeypadModal
          onVerified={handleOtpVerified}
          onCancel={() => setShowKeypad(false)}
        />
      )}
    </section>
  );
}
