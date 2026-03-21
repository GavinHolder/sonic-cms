/**
 * Metadata Generator
 *
 * Builds Next.js Metadata objects for any page.
 * Cascade priority: Page-specific → Site defaults → Hard defaults
 *
 * ASSUMPTIONS:
 * 1. fetchSeoConfig() reads from the filesystem (server-side only)
 * 2. page parameter may be null (homepage passes null)
 * 3. canonicalBase may be empty string — canonical tags are omitted if so
 *
 * FAILURE MODES:
 * - seo-config.json missing → uses defaultSeoConfig (graceful)
 * - page has no metaTitle → falls back to page.title → falls back to siteName
 * - ogImage is relative path → works for same-origin but may not for social crawlers
 *   (advise clients to set an absolute canonicalBase)
 */

import type { Metadata } from "next";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { defaultSeoConfig, type SeoConfig } from "@/lib/seo-config";

const CONFIG_FILE = path.join(process.cwd(), "data", "seo-config.json");

export async function fetchSeoConfig(): Promise<SeoConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) return defaultSeoConfig;
    const raw = await readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultSeoConfig,
      ...parsed,
      social: { ...defaultSeoConfig.social, ...parsed.social },
      robots: { ...defaultSeoConfig.robots, ...parsed.robots },
      structuredData: { ...defaultSeoConfig.structuredData, ...parsed.structuredData },
    };
  } catch {
    return defaultSeoConfig;
  }
}

export interface PageSeoData {
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
  slug?: string;
}

export function buildMetadata(page: PageSeoData | null, seoConfig: SeoConfig): Metadata {
  const siteName = seoConfig.siteName || "Your Company";
  const sep = seoConfig.titleSeparator || "|";
  const base = seoConfig.canonicalBase?.replace(/\/$/, "") || "";

  // Title cascade
  const pageTitle = page?.metaTitle || page?.title;
  const title = pageTitle ? `${pageTitle} ${sep} ${siteName}` : siteName;

  // Description cascade
  const description = page?.metaDescription || seoConfig.defaultDescription || "";

  // OG fields
  const ogTitle = page?.ogTitle || page?.metaTitle || page?.title || siteName;
  const ogDescription = page?.ogDescription || description;
  const ogImage = page?.ogImage || seoConfig.social.ogImage || "";

  // Canonical URL
  const canonicalUrl =
    page?.canonicalUrl ||
    (base && page?.slug !== undefined ? `${base}/${page.slug}`.replace(/\/$/, "") || base : undefined);

  // Robots directives
  const robotsParts: string[] = [];
  robotsParts.push(page?.noindex ? "noindex" : "index");
  robotsParts.push(page?.nofollow ? "nofollow" : "follow");

  const metadata: Metadata = {
    title,
    description,
    ...(page?.metaKeywords ? { keywords: page.metaKeywords } : {}),
    robots: robotsParts.join(", "),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      siteName,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
    },
    twitter: {
      card: seoConfig.social.twitterCard || "summary_large_image",
      ...(seoConfig.social.twitterSite ? { site: seoConfig.social.twitterSite } : {}),
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
  };

  if (canonicalUrl) {
    metadata.alternates = { canonical: canonicalUrl };
  }

  return metadata;
}

/**
 * Build JSON-LD LocalBusiness structured data script tag content.
 * Returns null if structured data is disabled in config.
 */
export function buildStructuredData(seoConfig: SeoConfig): string | null {
  const sd = seoConfig.structuredData;
  if (!sd.enabled || !sd.name) return null;

  // Normalise: legacy configs may store type as a string
  const typeValue = Array.isArray(sd.type)
    ? (sd.type.length === 1 ? sd.type[0] : sd.type)
    : sd.type || "LocalBusiness";

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": typeValue,
    name: sd.name,
    ...(sd.telephone ? { telephone: sd.telephone } : {}),
    ...(sd.url ? { url: sd.url } : {}),
    ...(sd.streetAddress || sd.addressLocality
      ? {
          address: {
            "@type": "PostalAddress",
            ...(sd.streetAddress ? { streetAddress: sd.streetAddress } : {}),
            ...(sd.addressLocality ? { addressLocality: sd.addressLocality } : {}),
            ...(sd.addressCountry ? { addressCountry: sd.addressCountry } : {}),
          },
        }
      : {}),
  };

  // Escape </script> to prevent injection when inlined in HTML
  return JSON.stringify(schema).replace(/<\/script>/gi, "<\\/script>");
}
