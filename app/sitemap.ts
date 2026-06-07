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
  const [pages, siteConfig] = await Promise.all([
    prisma.page.findMany({
      where: { status: "PUBLISHED", noindex: false },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.siteConfig.findUnique({
      where: { id: "singleton" },
      select: { homePage: true },
    }).catch(() => null),
  ]);

  // The page configured as homepage is served at "/" (middleware rewrite).
  // Emit it as the base URL only — listing both "/" and "/{slug}" would give
  // Google two URLs with identical content and no canonical hint.
  const homeSlug = siteConfig?.homePage?.trim() || "";

  const dbEntries: MetadataRoute.Sitemap = pages.map((p) => {
    const isHome = p.slug === "/" || p.slug === "" || (homeSlug !== "" && p.slug === homeSlug);
    return {
      url: isHome ? base : `${base}/${p.slug.replace(/^\//, "")}`,
      lastModified: p.updatedAt,
      changeFrequency: (isHome ? "weekly" : "monthly") as MetadataRoute.Sitemap[0]["changeFrequency"],
      priority: isHome ? 1.0 : 0.7,
    };
  });

  // Defensive dedupe — keeps the first (highest-priority) entry per URL
  const seen = new Set<string>();
  return dbEntries.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
