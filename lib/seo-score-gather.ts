/**
 * Live SEO-score gather — read-only, cheap, for the admin Score tab GET endpoint.
 *
 * Unlike runSeoEngine() this does NO writes, NO auto-fill, and does NOT re-query
 * Google Search Console (it reuses the GSC metrics from the latest persisted run).
 * It produces a fresh ON-PAGE breakdown so the admin sees current state without
 * waiting for a full scheduled run.
 */

import prisma from "@/lib/prisma";
import { computeSeoScore, type SeoScoreResult } from "@/lib/seo-score";

export interface GatheredScore {
  result: SeoScoreResult;
  metrics: {
    totalPages: number;
    gscConnected: boolean;
  };
}

const PLACEHOLDER_OG = "/images/logo-placeholder.svg";

export async function gatherSeoScore(): Promise<GatheredScore> {
  const [siteConfig, pages, ga4Row, lastRun] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: "singleton" } }),
    prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, title: true, metaTitle: true, metaDescription: true, ogImage: true },
    }),
    prisma.systemSettings.findUnique({ where: { key: "ga4_measurement_id" } }).catch(() => null),
    prisma.seoEngineRun
      .findFirst({ where: { status: "success" }, orderBy: { runAt: "desc" } })
      .catch(() => null),
  ]);

  // seo-config.json (canonical base, structured data, default OG image)
  let canonicalBase = "", structuredDataEnabled = false, defaultOgImage = "";
  try {
    const { readFile } = await import("fs/promises");
    const pathMod = await import("path");
    const raw = await readFile(pathMod.join(process.cwd(), "data", "seo-config.json"), "utf-8");
    const cfg = JSON.parse(raw) as {
      canonicalBase?: string;
      structuredData?: { enabled?: boolean };
      social?: { ogImage?: string };
    };
    canonicalBase = cfg.canonicalBase ?? "";
    structuredDataEnabled = cfg.structuredData?.enabled === true;
    defaultOgImage = cfg.social?.ogImage ?? "";
  } catch { /* no config yet */ }

  // Single, fast canonical redirect probe (best-effort).
  let canonicalBaseRedirects = false;
  if (canonicalBase) {
    try {
      const res = await fetch(canonicalBase, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(6_000),
      });
      canonicalBaseRedirects = res.redirected;
    } catch { /* unreachable — leave as false */ }
  }

  // GSC connection state (no live query — reuse last run's metrics).
  let gscConnected = false;
  try {
    const { getStoredToken } = await import("@/lib/gsc-client");
    const token = await getStoredToken();
    gscConnected = !!token?.siteUrl;
  } catch { /* gsc client unavailable */ }

  // Duplicate + missing counts
  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const p of pages) {
    const t = (p.metaTitle ?? p.title).toLowerCase();
    titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
    if (p.metaDescription) {
      const d = p.metaDescription.toLowerCase();
      descCounts.set(d, (descCounts.get(d) ?? 0) + 1);
    }
  }

  const ga4Connected = !!ga4Row?.value && /^G-[A-Z0-9]+$/i.test(ga4Row.value.trim());

  const gsc =
    gscConnected && lastRun && lastRun.impressions != null
      ? {
          indexedRatio: pages.length > 0 ? (lastRun.indexedPages ?? 0) / pages.length : 0,
          avgPosition: lastRun.avgPosition ?? 0,
          ctr: lastRun.ctr ?? 0,
          impressions: lastRun.impressions ?? 0,
        }
      : null;

  const result = computeSeoScore({
    totalPages: pages.length,
    pagesMissingTitle: pages.filter((p) => !p.metaTitle).length,
    pagesMissingDescription: pages.filter((p) => !p.metaDescription).length,
    pagesMissingOgImage: pages.filter((p) => !p.ogImage).length,
    duplicateTitles: Array.from(titleCounts.values()).filter((c) => c > 1).length,
    duplicateDescriptions: Array.from(descCounts.values()).filter((c) => c > 1).length,
    hasDefaultOgImage: !!defaultOgImage && defaultOgImage !== PLACEHOLDER_OG,
    canonicalBaseSet: !!canonicalBase,
    canonicalBaseRedirects,
    structuredDataEnabled,
    napComplete: !!(
      siteConfig?.companyName?.trim() &&
      siteConfig?.address?.trim() &&
      siteConfig?.phone?.trim() &&
      siteConfig?.city?.trim()
    ),
    ga4Connected,
    gscConnected,
    sitemapHasPages: pages.length > 0,
    crawl: null, // live gather is meta-only; content score comes from the scheduled run
    gsc,
  });

  return { result, metrics: { totalPages: pages.length, gscConnected } };
}
