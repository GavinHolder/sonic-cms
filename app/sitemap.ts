export const dynamic = 'force-dynamic';

import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { fetchSeoConfig } from "@/lib/metadata-generator";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seoConfig = await fetchSeoConfig();
  const base = seoConfig.canonicalBase?.replace(/\/$/, "") || "";

  // All published, indexable pages (exclude the landing page — already listed above)
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED", noindex: false, NOT: { slug: "/" } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const pageUrls: MetadataRoute.Sitemap = pages.map((p) => ({
    url: base ? `${base}/${p.slug}`.replace(/\/$/, "") : `/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: base || "/",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...pageUrls,
  ];
}
