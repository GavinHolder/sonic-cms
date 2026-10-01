import type { FormField } from "@/types/page";

/**
 * Default embedded contact form for a CTA section in "contact-form" mode.
 * ONE source of truth: used by the live renderer (CTAFooter) and the admin
 * CTASectionEditor so the editor shows exactly the fields the live page shows.
 * The email field is the one the OTP verification flow keys off (type "email").
 */
export const DEFAULT_CTA_FORM_FIELDS: FormField[] = [
  { id: "cta-name", type: "text", label: "Full name", name: "name", required: true, placeholder: "Your full name" },
  { id: "cta-email", type: "email", label: "Email", name: "email", required: true, placeholder: "you@example.com" },
  { id: "cta-phone", type: "phone", label: "Phone", name: "phone", required: false, placeholder: "Your phone number" },
  { id: "cta-message", type: "textarea", label: "Message", name: "message", required: false, placeholder: "How can we help?" },
];

/** Authored fields if any, otherwise the shared defaults. */
export function resolveCtaFormFields(fields?: FormField[] | null): FormField[] {
  return fields && fields.length > 0 ? fields : DEFAULT_CTA_FORM_FIELDS;
}

export interface SectionBgImageProps {
  bgImageUrl?: string | null;
  bgImageSize?: string | null;
  bgImagePosition?: string | null;
  bgImageRepeat?: string | null;
  bgImageOpacity?: number | null;
}

/**
 * Style for an absolutely-positioned background-image layer built from a
 * section's real bgImage* columns. Returns null when there is no image.
 */
export function sectionBgImageLayerStyle(
  p: SectionBgImageProps,
  fallbackUrl?: string | null,
): import("react").CSSProperties | null {
  const url = p.bgImageUrl || fallbackUrl;
  if (!url) return null;
  const opacity = typeof p.bgImageOpacity === "number" ? Math.min(100, Math.max(0, p.bgImageOpacity)) / 100 : 1;
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage: `url("${url.replace(/"/g, "%22")}")`,
    backgroundSize: p.bgImageSize || "cover",
    backgroundPosition: p.bgImagePosition || "center",
    backgroundRepeat: p.bgImageRepeat || "no-repeat",
    opacity,
  };
}
