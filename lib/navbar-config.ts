/**
 * Navbar Configuration
 *
 * Types and server-side utilities for persisting navbar settings.
 * Config is stored in /data/navbar-config.json on the server filesystem.
 *
 * The admin editor at /admin/content/navbar reads/writes via GET|PATCH /api/navbar.
 * The Navbar component can also fetch from /api/navbar to apply live config.
 *
 * ASSUMPTIONS:
 * 1. /data directory is writable by the Next.js server process
 * 2. JSON file is valid UTF-8 (written by this module only)
 * 3. Config fields are optional — defaults fill in missing values
 *
 * FAILURE MODES:
 * - File read fails → return defaultNavbarConfig (graceful degradation)
 * - File write fails → throw so API route returns 500
 * - Corrupt JSON → return defaultNavbarConfig, log error
 */

export interface NavbarCtaButton {
  /** Whether the CTA button is shown */
  show: boolean;
  /** Button label text */
  text: string;
  /** Visual style variant */
  style: "solid" | "outlined" | "ghost";
  /**
   * Link target. One of:
   *  - External URL: any URL or path (e.g. "/client-login", "https://...")
   *  - Section anchor: "#<sectionId>"
   *  - Dynamic page slug: "/<slug>"
   */
  href: string;
  /**
   * Explicit link mode for admin editor.
   * Stored so the editor always renders the correct tab on reload.
   */
  linkMode: "external" | "anchor" | "page";
}

export interface NavbarScrolledBackground {
  /** Hex or rgb color for the scrolled navbar background */
  color: string;
  /** Opacity 0–100 */
  opacity: number;
}

export interface NavbarConfig {
  /** Logo image URL (relative or absolute) */
  logoSrc: string;
  /** Logo alt text for accessibility */
  logoAlt: string;
  /** Logo display height in pixels */
  logoHeight: number;
  /** Logo display width in pixels (0 = auto) */
  logoWidth: number;
  /** CTA button configuration */
  cta: NavbarCtaButton;
  /** Background style when user has scrolled */
  scrolledBackground: NavbarScrolledBackground;
  /**
   * Color-matched navbar (opt-in, default false).
   * When true AND the top-most section of the current page has a SOLID color
   * background (no image / gradient / animated bg), the navbar adopts that exact
   * color while it sits over that first section, with auto-contrasting text/icons.
   * When false, or when the top section is not a solid color, navbar behaviour is
   * unchanged (byte-for-byte identical to the pre-feature default).
   */
  colorMatchTopSection?: boolean;
  /** ISO timestamp of last save */
  updatedAt: string;
}

export const defaultNavbarConfig: NavbarConfig = {
  logoSrc: "/images/logo-placeholder.svg",
  logoAlt: "Your Company",
  logoHeight: 44,
  logoWidth: 0,
  cta: {
    show: true,
    text: "Client Login",
    style: "solid",
    href: "/client-login",
    linkMode: "external",
  },
  scrolledBackground: {
    color: "#ffffff",
    opacity: 100,
  },
  colorMatchTopSection: false,
  updatedAt: new Date().toISOString(),
};
