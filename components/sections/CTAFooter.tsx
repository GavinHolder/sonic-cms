"use client";

import { useState } from "react";
import Link from "next/link";
import type { CTASection, BackgroundColor, ButtonConfig } from "@/types/section";
import type { FormField } from "@/types/page";
import OtpVerificationModal from "@/components/ui/OtpVerificationModal";

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
  const isBlueBackground = background === "blue" || background === "lightblue";

  const bgColorValue =
    background === "blue"
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
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
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

    // Find email field to send OTP to
    const emailField = formFields.find((f) => f.type === "email");
    if (!emailField || !formValues[emailField.name]?.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        [emailField?.name || "_"]: "A valid email address is required for verification",
      }));
      return;
    }

    setOtpEmail(formValues[emailField.name].trim());
  };

  /**
   * Called when OTP is verified — submits the collected form data to the API.
   * Shows the success state regardless of API response to avoid confusing the user.
   */
  const handleOtpVerified = async () => {
    setOtpEmail(null);
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
        {/* Main CTA Content */}
        <div className="text-center mb-4">
          <h2
            className={`display-5 fw-bold mb-3 ${
              isBlueBackground ? "text-white" : "text-dark"
            }`}
          >
            {heading}
          </h2>
          {subheading && (
            <p
              className={`lead mb-4 ${
                isBlueBackground ? "text-white opacity-75" : "text-muted"
              }`}
            >
              {subheading}
            </p>
          )}

          {/* Contact Form Mode or CTA Buttons */}
          {style === "contact-form" && formFields && formFields.length > 0 ? (
            <div style={{ maxWidth: 520, margin: "0 auto" }}>
              {submitted ? (
                <div className={`alert ${isBlueBackground ? "alert-light" : "alert-success"} text-center`}>
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
                    <div className="mb-3 text-start" key={field.id}>
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
                      <><i className="bi bi-send me-2" />Submit</>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* CTA Buttons (original behaviour when not in contact-form mode) */
            <>
              {buttons && buttons.length > 0 && (
                <div className="d-flex flex-wrap justify-content-center gap-3 mb-5">
                  {buttons.map((button, index) => (
                    <Link
                      key={index}
                      href={button.href}
                      className={`btn btn-lg ${
                        button.variant === "primary"
                          ? isBlueBackground
                            ? "btn-light text-primary"
                            : "btn-primary"
                          : button.variant === "secondary"
                          ? "btn-secondary"
                          : isBlueBackground
                          ? "btn-outline-light"
                          : "btn-outline-primary"
                      }`}
                    >
                      {button.text}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

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

      {/* OTP verification modal — shown when user submits the contact form */}
      {otpEmail && (
        <OtpVerificationModal
          email={otpEmail}
          purpose="cta-form"
          onVerified={handleOtpVerified}
          onCancel={() => setOtpEmail(null)}
        />
      )}
    </section>
  );
}
