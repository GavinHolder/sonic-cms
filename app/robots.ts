export const dynamic = 'force-dynamic';

import type { MetadataRoute } from "next";
import { fetchSeoConfig } from "@/lib/metadata-generator";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seoConfig = await fetchSeoConfig();
  const base = seoConfig.canonicalBase?.replace(/\/$/, "") || "";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: seoConfig.robots.disallowPaths,
    },
    ...(seoConfig.robots.includeSitemap && base
      ? { sitemap: `${base}/sitemap.xml` }
      : {}),
  };
}
