/**
 * SEO Configuration
 *
 * Types and server-side utilities for persisting site-wide SEO settings.
 * Config is stored in /data/seo-config.json on the server filesystem.
 *
 * The admin editor at /admin/content/seo reads/writes via GET|PATCH /api/seo.
 * Per-page SEO fields are stored in the Page Prisma model.
 *
 * ASSUMPTIONS:
 * 1. /data directory is writable by the Next.js server process
 * 2. JSON file is valid UTF-8 (written by this module only)
 * 3. Config fields are optional — defaults fill in missing values
 *
 * FAILURE MODES:
 * - File read fails → return defaultSeoConfig (graceful degradation)
 * - File write fails → throw so API route returns 500
 * - Corrupt JSON → return defaultSeoConfig, log error
 */

export interface SeoSocialConfig {
  /** Default OG image URL (absolute preferred for social sharing) */
  ogImage: string;
  /** Twitter card type */
  twitterCard: "summary" | "summary_large_image";
  /** Twitter handle e.g. @yourcompany */
  twitterSite: string;
}

export interface SeoRobotsConfig {
  /** Paths to disallow in robots.txt (e.g. ["/admin", "/api"]) */
  disallowPaths: string[];
  /** Whether to include sitemap URL in robots.txt */
  includeSitemap: boolean;
}

export interface SeoStructuredDataConfig {
  /** Enable LocalBusiness JSON-LD schema injection on all pages */
  enabled: boolean;
  /** schema.org business type(s) e.g. ["LocalBusiness", "Store"] — JSON-LD @type accepts array */
  type: string[];
  /** Business name */
  name: string;
  /** Street address */
  streetAddress: string;
  /** City / locality */
  addressLocality: string;
  /** ISO 3166-1 alpha-2 country code e.g. "ZA" */
  addressCountry: string;
  /** Phone number in international format */
  telephone: string;
  /** Business website URL */
  url: string;
}

export interface SeoConfig {
  /** Site name appended to page titles: "Page Title | Site Name" */
  siteName: string;
  /** Title separator character(s) */
  titleSeparator: string;
  /** Fallback meta description for pages without one set */
  defaultDescription: string;
  /** Canonical base URL e.g. https://www.yourcompany.co.za (no trailing slash) */
  canonicalBase: string;
  /** Social / Open Graph defaults */
  social: SeoSocialConfig;
  /** robots.txt configuration */
  robots: SeoRobotsConfig;
  /** LocalBusiness structured data */
  structuredData: SeoStructuredDataConfig;
  /** ISO timestamp of last save */
  updatedAt: string;
}

export const defaultSeoConfig: SeoConfig = {
  siteName: "Your Company",
  titleSeparator: "|",
  defaultDescription: "Professional services for your region.",
  canonicalBase: "",
  social: {
    ogImage: "/images/logo-placeholder.svg",
    twitterCard: "summary_large_image",
    twitterSite: "",
  },
  robots: {
    disallowPaths: ["/admin", "/api"],
    includeSitemap: true,
  },
  structuredData: {
    enabled: false,
    type: ["LocalBusiness"],
    name: "",
    streetAddress: "",
    addressLocality: "",
    addressCountry: "ZA",
    telephone: "",
    url: "",
  },
  updatedAt: new Date().toISOString(),
};
