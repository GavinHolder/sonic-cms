import prisma from "@/lib/prisma";
import { computeSeoScore, type SeoScoreInput } from "@/lib/seo-score";

export type PageClassification = "protected" | "monitored" | "new";

export interface GscPageData {
  avgPosition: number;
  impressions28d: number;
  hasAnyData: boolean;
}

export interface ClassificationResult {
  classification: PageClassification;
  reason: string;
  userEditedFields: string[];
}

export interface FillableFields {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
}

export interface SiteContext {
  siteName: string;
  companyName: string;
  city: string;
  canonicalBase: string;
}

export interface EngineIssue {
  pageId: string;
  slug: string;
  type: "canonical_conflict" | "redirect_canonical" | "missing_meta_title" | "missing_meta_description" | "missing_og_image" | "discovered_not_indexed" | "duplicate_title" | "duplicate_description" | "canonical_base_redirect" | "multiple_h1" | "missing_h1" | "thin_content" | "missing_viewport" | "images_missing_alt";
  severity: "error" | "warning" | "info";
  message: string;
  autoFixed: boolean;
  suggestion?: string;
}

export interface EngineRunResult {
  pagesAudited: number;
  pagesAutoFilled: number;
  pagesProtected: number;
  pagesAlerted: number;
  issues: EngineIssue[];
  // Score snapshot (content null when no crawl ran; performance null when GSC off)
  score: number;
  onPageScore: number;
  contentScore: number | null;
  performanceScore: number | null;
  indexedPages: number | null;
  avgPosition: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  breakdown: import("@/lib/seo-score").ScoreBreakdownItem[];
}

function parseUserEditedFields(raw: string | null): string[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

export function classifyPage(
  page: { id: string; slug: string; publishedAt: Date | null; seoUserEditedFields: string | null; metaTitle: string | null },
  gscData: GscPageData | null,
): ClassificationResult {
  const userEditedFields = parseUserEditedFields(page.seoUserEditedFields);
  const ageDays = page.publishedAt ? (Date.now() - page.publishedAt.getTime()) / 86400_000 : 0;

  if (gscData?.avgPosition && gscData.avgPosition <= 20)
    return { classification: "protected", reason: "ranking in top 20 positions", userEditedFields };
  if (gscData?.impressions28d && gscData.impressions28d > 50)
    return { classification: "protected", reason: "high impression volume (>50/28d)", userEditedFields };
  if (ageDays >= 30 && gscData?.hasAnyData)
    return { classification: "protected", reason: "established page (≥30 days, indexed)", userEditedFields };
  if (ageDays < 14 && !gscData?.hasAnyData && userEditedFields.length === 0)
    return { classification: "new", reason: "new page — safe to auto-fill", userEditedFields };
  return { classification: "monitored", reason: "monitored — alert only", userEditedFields };
}

export function autoFillFields(
  page: { id: string; slug: string; title: string; metaTitle: string | null; metaDescription: string | null; ogTitle: string | null; ogDescription: string | null; canonicalUrl: string | null; seoUserEditedFields: string | null },
  ctx: SiteContext,
  protectedFields: string[],
): FillableFields {
  const result: FillableFields = {};
  const skip = new Set(protectedFields);

  if (!page.metaTitle && !skip.has("metaTitle")) {
    const raw = `${page.title} | ${ctx.siteName}`;
    result.metaTitle = raw.length > 60 ? raw.slice(0, 57) + "…" : raw;
  }
  if (!page.metaDescription && !skip.has("metaDescription")) {
    result.metaDescription = `${page.title} — ${ctx.companyName} in ${ctx.city}`.slice(0, 155);
  }
  if (!page.ogTitle && !skip.has("ogTitle")) {
    const src = result.metaTitle ?? page.metaTitle;
    if (src) result.ogTitle = src;
  }
  if (!page.ogDescription && !skip.has("ogDescription")) {
    const src = result.metaDescription ?? page.metaDescription;
    if (src) result.ogDescription = src;
  }
  if (!page.canonicalUrl && !skip.has("canonicalUrl") && ctx.canonicalBase) {
    result.canonicalUrl = `${ctx.canonicalBase}/${page.slug}`;
  }
  return result;
}

export interface CanonicalCheckResult {
  redirected: boolean;
  finalUrl: string;
  error?: string;
}

export async function checkCanonicalBaseRedirects(url: string): Promise<CanonicalCheckResult> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8_000) });
    return { redirected: res.redirected, finalUrl: res.url };
  } catch (err) {
    return { redirected: false, finalUrl: url, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function runSeoEngine(): Promise<EngineRunResult> {
  const issues: EngineIssue[] = [];
  let pagesAutoFilled = 0, pagesProtected = 0, pagesAlerted = 0;

  // Load site context
  const siteConfig = await prisma.siteConfig.findUnique({ where: { id: "singleton" } });
  let canonicalBase = "", siteName = siteConfig?.companyName ?? "Site";
  let structuredDataEnabled = false, defaultOgImage = "";
  try {
    const { readFile } = await import("fs/promises");
    const pathMod = await import("path");
    const raw = await readFile(pathMod.join(process.cwd(), "data", "seo-config.json"), "utf-8");
    const cfg = JSON.parse(raw) as {
      canonicalBase?: string; siteName?: string;
      structuredData?: { enabled?: boolean };
      social?: { ogImage?: string };
    };
    canonicalBase = cfg.canonicalBase ?? "";
    siteName = cfg.siteName ?? siteName;
    structuredDataEnabled = cfg.structuredData?.enabled === true;
    defaultOgImage = cfg.social?.ogImage ?? "";
  } catch { /* no config yet */ }

  const ctx: SiteContext = {
    siteName,
    companyName: siteConfig?.companyName ?? "",
    city: siteConfig?.city ?? "",
    canonicalBase,
  };

  // Check canonical base for redirects
  let canonicalBaseRedirects = false;
  if (canonicalBase) {
    const check = await checkCanonicalBaseRedirects(canonicalBase);
    if (check.redirected) {
      canonicalBaseRedirects = true;
      issues.push({
        pageId: "site", slug: "site", type: "canonical_base_redirect", severity: "error", autoFixed: false,
        message: `canonicalBase "${canonicalBase}" redirects to "${check.finalUrl}". Google ignores your canonical tags.`,
        suggestion: `Update canonicalBase to "${check.finalUrl}" in SEO Settings → Site.`,
      });
    }
    if (check.error) {
      issues.push({ pageId: "site", slug: "site", type: "canonical_base_redirect", severity: "warning", autoFixed: false, message: `Cannot verify canonicalBase: ${check.error}` });
    }
  }

  // Fetch published pages
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, publishedAt: true, metaTitle: true, metaDescription: true, ogTitle: true, ogDescription: true, ogImage: true, canonicalUrl: true, noindex: true, seoUserEditedFields: true, seoProtectedReason: true },
  });

  // Fetch GSC data (best-effort). Also aggregate site-wide performance metrics
  // (clicks + CTR + impression-weighted position) for the SEO score.
  const gscMap = new Map<string, GscPageData>();
  let gscConnected = false;
  let totalClicks = 0, totalImpressions = 0, weightedPositionSum = 0;
  try {
    const { getStoredToken, fetchSearchAnalytics } = await import("@/lib/gsc-client");
    const token = await getStoredToken();
    if (token?.siteUrl) {
      gscConnected = true;
      const end = new Date(), start = new Date(end.getTime() - 28 * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const rows = await fetchSearchAnalytics(token.siteUrl, fmt(start), fmt(end), ["page"], 500);
      for (const row of rows) {
        const slug = row.keys[0].replace(token.siteUrl, "").replace(/^\//, "");
        gscMap.set(slug, { avgPosition: row.position, impressions28d: row.impressions, hasAnyData: true });
        totalClicks += row.clicks;
        totalImpressions += row.impressions;
        weightedPositionSum += row.position * row.impressions;
      }
    }
  } catch { /* GSC unavailable — safe to continue */ }

  // Duplicate detection
  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const p of pages) {
    const t = (p.metaTitle ?? p.title).toLowerCase();
    titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
    if (p.metaDescription) descCounts.set(p.metaDescription.toLowerCase(), (descCounts.get(p.metaDescription.toLowerCase()) ?? 0) + 1);
  }

  // Process each page
  for (const page of pages) {
    const gscData = gscMap.get(page.slug) ?? null;
    const { classification, reason, userEditedFields } = classifyPage(page, gscData);
    let pageHasIssues = false;

    if (classification === "protected") {
      pagesProtected++;
      await prisma.page.update({ where: { id: page.id }, data: { seoProtectedReason: reason } });
    }

    // Canonical redirect check (cap at 15 pages to avoid rate limits)
    if (canonicalBase && pages.indexOf(page) < 15) {
      const pageUrl = page.canonicalUrl ?? `${canonicalBase}/${page.slug}`;
      try {
        const check = await checkCanonicalBaseRedirects(pageUrl);
        if (check.redirected) {
          const autoFixed = classification !== "protected" && !userEditedFields.includes("canonicalUrl");
          if (autoFixed) {
            await prisma.page.update({ where: { id: page.id }, data: { canonicalUrl: check.finalUrl, seoLastAutoFilled: new Date() } });
          }
          issues.push({
            pageId: page.id, slug: page.slug, type: "redirect_canonical", severity: "error", autoFixed,
            message: `Canonical "${pageUrl}" redirects to "${check.finalUrl}".${autoFixed ? " Auto-fixed." : ""}`,
            suggestion: autoFixed ? undefined : `Update canonical to "${check.finalUrl}"`,
          });
          pageHasIssues = true;
        }
      } catch { /* skip on network error */ }
    }

    // Standard audit checks
    if (!page.metaTitle) { issues.push({ pageId: page.id, slug: page.slug, type: "missing_meta_title", severity: "warning", message: "No meta title set", autoFixed: false }); pageHasIssues = true; }
    if (!page.metaDescription) { issues.push({ pageId: page.id, slug: page.slug, type: "missing_meta_description", severity: "error", message: "Missing meta description", autoFixed: false }); pageHasIssues = true; }
    if (!page.ogImage) { issues.push({ pageId: page.id, slug: page.slug, type: "missing_og_image", severity: "warning", message: "No OG image set", autoFixed: false }); pageHasIssues = true; }

    const titleKey = (page.metaTitle ?? page.title).toLowerCase();
    if ((titleCounts.get(titleKey) ?? 0) > 1) { issues.push({ pageId: page.id, slug: page.slug, type: "duplicate_title", severity: "error", message: "Duplicate title across pages", autoFixed: false }); pageHasIssues = true; }
    if (page.metaDescription && (descCounts.get(page.metaDescription.toLowerCase()) ?? 0) > 1) { issues.push({ pageId: page.id, slug: page.slug, type: "duplicate_description", severity: "error", message: "Duplicate meta description", autoFixed: false }); pageHasIssues = true; }

    // Auto-fill (NEW pages only)
    if (classification === "new") {
      const filled = autoFillFields(page, ctx, userEditedFields);
      if (Object.keys(filled).length > 0) {
        await prisma.page.update({ where: { id: page.id }, data: { ...filled, seoLastAutoFilled: new Date() } });
        pagesAutoFilled++;
      }
    }

    if (pageHasIssues) pagesAlerted++;
  }

  // ── Compute SEO score snapshot ──
  const ga4Row = await prisma.systemSettings
    .findUnique({ where: { key: "ga4_measurement_id" } })
    .catch(() => null);
  const ga4Connected = !!ga4Row?.value && /^G-[A-Z0-9]+$/i.test(ga4Row.value.trim());

  const pagesMissingTitle = pages.filter((p) => !p.metaTitle).length;
  const pagesMissingDescription = pages.filter((p) => !p.metaDescription).length;
  const pagesMissingOgImage = pages.filter((p) => !p.ogImage).length;
  const duplicateTitles = Array.from(titleCounts.values()).filter((c) => c > 1).length;
  const duplicateDescriptions = Array.from(descCounts.values()).filter((c) => c > 1).length;
  const indexedPages = gscConnected ? pages.filter((p) => gscMap.has(p.slug)).length : null;

  const PLACEHOLDER_OG = "/images/logo-placeholder.svg";
  const napComplete = !!(
    siteConfig?.companyName?.trim() &&
    siteConfig?.address?.trim() &&
    siteConfig?.phone?.trim() &&
    siteConfig?.city?.trim()
  );

  const gscInput = gscConnected
    ? {
        indexedRatio: pages.length > 0 ? (indexedPages ?? 0) / pages.length : 0,
        avgPosition: totalImpressions > 0 ? weightedPositionSum / totalImpressions : 0,
        ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        impressions: totalImpressions,
      }
    : null;

  // ── On-page crawl (rendered HTML) — bounded, best-effort. Needs a reachable
  //    canonical base; skipped gracefully otherwise. Feeds the Content sub-score. ──
  const CRAWL_CAP = 25;
  let crawlInput: SeoScoreInput["crawl"] = null;
  if (canonicalBase) {
    try {
      const { crawlSite, THIN_CONTENT_WORDS } = await import("@/lib/seo-crawler");
      const outcome = await crawlSite(
        canonicalBase,
        pages.map((p) => ({ id: p.id, slug: p.slug })),
        { maxPages: CRAWL_CAP },
      );
      if (outcome.aggregate.pagesCrawled > 0) {
        crawlInput = outcome.aggregate;
        for (const r of outcome.results) {
          if (!r.ok) continue;
          if (r.h1Count === 0) {
            issues.push({ pageId: r.id, slug: r.slug, type: "missing_h1", severity: "warning", message: "Page has no H1 heading", autoFixed: false });
          } else if (r.h1Count > 1) {
            issues.push({ pageId: r.id, slug: r.slug, type: "multiple_h1", severity: "warning", message: `Page has ${r.h1Count} H1 headings (should be exactly one)`, autoFixed: false });
          }
          if (r.wordCount < THIN_CONTENT_WORDS) {
            issues.push({ pageId: r.id, slug: r.slug, type: "thin_content", severity: "info", message: `Thin content — ${r.wordCount} words (aim for ${THIN_CONTENT_WORDS}+)`, autoFixed: false });
          }
          if (!r.hasViewport) {
            issues.push({ pageId: r.id, slug: r.slug, type: "missing_viewport", severity: "warning", message: "No mobile viewport meta tag", autoFixed: false });
          }
          if (r.imagesTotal > 0 && r.imagesWithAlt < r.imagesTotal) {
            issues.push({ pageId: r.id, slug: r.slug, type: "images_missing_alt", severity: "info", message: `${r.imagesTotal - r.imagesWithAlt}/${r.imagesTotal} images missing alt text`, autoFixed: false });
          }
        }
      }
    } catch { /* crawler unavailable — skip content scoring */ }
  }

  const scoreInput: SeoScoreInput = {
    totalPages: pages.length,
    pagesMissingTitle,
    pagesMissingDescription,
    pagesMissingOgImage,
    duplicateTitles,
    duplicateDescriptions,
    hasDefaultOgImage: !!defaultOgImage && defaultOgImage !== PLACEHOLDER_OG,
    canonicalBaseSet: !!canonicalBase,
    canonicalBaseRedirects,
    structuredDataEnabled,
    napComplete,
    ga4Connected,
    gscConnected,
    sitemapHasPages: pages.length > 0,
    crawl: crawlInput,
    gsc: gscInput,
  };
  const scoreResult = computeSeoScore(scoreInput);

  return {
    pagesAudited: pages.length,
    pagesAutoFilled,
    pagesProtected,
    pagesAlerted,
    issues,
    score: scoreResult.total,
    onPageScore: scoreResult.onPage,
    contentScore: scoreResult.content,
    performanceScore: scoreResult.performance,
    indexedPages,
    avgPosition: gscInput ? gscInput.avgPosition : null,
    impressions: gscConnected ? totalImpressions : null,
    clicks: gscConnected ? totalClicks : null,
    ctr: gscInput ? gscInput.ctr : null,
    breakdown: scoreResult.breakdown,
  };
}
