export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { fetchSeoConfig } from "@/lib/metadata-generator";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seoConfig = await fetchSeoConfig();

  // Sitemaps require absolute URLs — prefer canonical base, fall back to env
  const base = (
    seoConfig.canonicalBase ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/$/, "");

  // Without an absolute base we can't produce a valid sitemap
  if (!base) return [];

  // All published, indexable pages — including homepage slug "/"
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED", noindex: false },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  // Static code-defined routes (not stored in DB as Pages)
  // client-login is intentionally excluded — noindex, no SEO value
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/services`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/support`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/equipment`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/coverage`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/calculator`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const dbEntries: MetadataRoute.Sitemap = pages.map((p) => {
    const isHome = p.slug === "/" || p.slug === "";
    return {
      url: isHome ? base : `${base}/${p.slug.replace(/^\//, "")}`,
      lastModified: p.updatedAt,
      changeFrequency: (isHome ? "weekly" : "monthly") as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: isHome ? 1.0 : 0.7,
    };
  });

  return [...dbEntries, ...staticRoutes];
}
