import prisma from "@/lib/prisma";

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
  type: "canonical_conflict" | "redirect_canonical" | "missing_meta_title" | "missing_meta_description" | "missing_og_image" | "discovered_not_indexed" | "duplicate_title" | "duplicate_description" | "canonical_base_redirect";
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
  try {
    const { readFile } = await import("fs/promises");
    const pathMod = await import("path");
    const raw = await readFile(pathMod.join(process.cwd(), "data", "seo-config.json"), "utf-8");
    const cfg = JSON.parse(raw) as { canonicalBase?: string; siteName?: string };
    canonicalBase = cfg.canonicalBase ?? "";
    siteName = cfg.siteName ?? siteName;
  } catch { /* no config yet */ }

  const ctx: SiteContext = {
    siteName,
    companyName: siteConfig?.companyName ?? "",
    city: siteConfig?.city ?? "",
    canonicalBase,
  };

  // Check canonical base for redirects
  if (canonicalBase) {
    const check = await checkCanonicalBaseRedirects(canonicalBase);
    if (check.redirected) {
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

  // Fetch GSC data (best-effort)
  const gscMap = new Map<string, GscPageData>();
  try {
    const { getStoredToken, fetchSearchAnalytics } = await import("@/lib/gsc-client");
    const token = await getStoredToken();
    if (token?.siteUrl) {
      const end = new Date(), start = new Date(end.getTime() - 28 * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const rows = await fetchSearchAnalytics(token.siteUrl, fmt(start), fmt(end), ["page"], 500);
      for (const row of rows) {
        const slug = row.keys[0].replace(token.siteUrl, "").replace(/^\//, "");
        gscMap.set(slug, { avgPosition: row.position, impressions28d: row.impressions, hasAnyData: true });
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

  return { pagesAudited: pages.length, pagesAutoFilled, pagesProtected, pagesAlerted, issues };
}
