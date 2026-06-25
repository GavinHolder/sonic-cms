/**
 * SEO score computation — PURE, no IO, fully unit-testable.
 *
 * Up to THREE sub-scores, each 0–100, each independently null-able:
 *  - On-Page Health       : deterministic checks over your own CMS/DB meta fields.
 *                           Always computable.
 *  - Content & Structure  : from the on-page crawler (rendered HTML) — H1, word
 *                           count, viewport, image alt, internal links. NULL until
 *                           a crawl runs.
 *  - Performance          : from Google Search Console. NULL when GSC not connected.
 *
 * Composite total = weighted average over PRESENT dimensions (renormalised):
 *   On-Page 0.5, Content 0.3, Performance 0.2.
 * When only On-Page is present, total = On-Page.
 *
 * ASSUMPTIONS:
 *  1. totalPages >= 0. When 0, page-ratio checks award full credit except
 *     sitemap-has-pages (an empty site cannot rank).
 *  2. gsc/crawl ratios are normalised 0..1 where noted; avgPosition is a raw Google
 *     position (1 = best). Caller derives these.
 *  3. Weights within each present sub-score sum to 100 (asserted by tests).
 *
 * FAILURE MODES:
 *  - NaN/undefined inputs → clamp coerces to safe 0 so a bad signal never throws.
 */

export interface SeoScoreInput {
  // ── On-page signals (always present) ──
  totalPages: number;
  pagesMissingTitle: number;
  pagesMissingDescription: number;
  pagesMissingOgImage: number;
  duplicateTitles: number;
  duplicateDescriptions: number;
  hasDefaultOgImage: boolean;
  canonicalBaseSet: boolean;
  canonicalBaseRedirects: boolean;
  structuredDataEnabled: boolean;
  napComplete: boolean;
  ga4Connected: boolean;
  gscConnected: boolean;
  sitemapHasPages: boolean;

  // ── Content & Structure signals (null when no crawl ran) ──
  crawl: null | {
    pagesCrawled: number;
    pagesWithExactlyOneH1: number;
    thinContentPages: number;       // word count below threshold
    pagesMissingViewport: number;
    imagesTotal: number;
    imagesWithAlt: number;
    pagesWithInternalLinks: number;
  };

  // ── Performance signals (null when GSC not connected) ──
  gsc: null | {
    indexedRatio: number;           // 0..1
    avgPosition: number;            // 1..N (lower better)
    ctr: number;                    // 0..1
    impressions: number;
  };
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  category: "onPage" | "content" | "performance";
  score: number;
  max: number;
  detail: string;
}

export interface SeoScoreResult {
  total: number;
  onPage: number;
  content: number | null;
  performance: number | null;
  breakdown: ScoreBreakdownItem[];
}

const clamp01 = (n: number): number =>
  !Number.isFinite(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n;

const clampPos = (n: number): number => (!Number.isFinite(n) || n < 0 ? 0 : n);

/** Ratio of items passing a per-item check. Empty set → full credit (1). */
function ratio(total: number, passing: number): number {
  const t = clampPos(total);
  if (t === 0) return 1;
  return clamp01(clampPos(passing) / t);
}

/** Ratio of pages passing a per-page check expressed as a "missing" count. */
function passRatio(total: number, missing: number): number {
  const t = clampPos(total);
  if (t === 0) return 1;
  return clamp01((t - clampPos(missing)) / t);
}

/** Average-position → 0..1 quality band (1 = best). */
function positionBand(pos: number): number {
  const p = clampPos(pos);
  if (p === 0) return 0;
  if (p <= 3) return 1;
  if (p <= 10) return 0.8;
  if (p <= 20) return 0.5;
  if (p <= 50) return 0.25;
  return 0.1;
}

export function computeSeoScore(input: SeoScoreInput): SeoScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];

  const add = (
    key: string,
    label: string,
    category: "onPage" | "content" | "performance",
    fraction: number,
    max: number,
    detail: string,
  ): number => {
    const score = Math.round(clamp01(fraction) * max);
    breakdown.push({ key, label, category, score, max, detail });
    return score;
  };

  // ── On-Page Health (weights sum to 100) ──
  let onPage = 0;
  {
    onPage += add("meta_titles", "Meta titles present", "onPage",
      passRatio(input.totalPages, input.pagesMissingTitle), 12,
      `${input.totalPages - input.pagesMissingTitle}/${input.totalPages} pages have a meta title`);

    onPage += add("meta_descriptions", "Meta descriptions present", "onPage",
      passRatio(input.totalPages, input.pagesMissingDescription), 14,
      `${input.totalPages - input.pagesMissingDescription}/${input.totalPages} pages have a meta description`);

    onPage += add("no_dupe_titles", "No duplicate titles", "onPage",
      input.duplicateTitles === 0 ? 1 : 0, 8,
      input.duplicateTitles === 0 ? "All titles unique" : `${input.duplicateTitles} duplicate title(s)`);

    onPage += add("no_dupe_descriptions", "No duplicate descriptions", "onPage",
      input.duplicateDescriptions === 0 ? 1 : 0, 8,
      input.duplicateDescriptions === 0 ? "All descriptions unique" : `${input.duplicateDescriptions} duplicate description(s)`);

    onPage += add("og_image", "Default social image set", "onPage",
      input.hasDefaultOgImage ? 1 : 0, 8,
      input.hasDefaultOgImage ? "Default OG image configured" : "No default OG image");

    const canonicalFraction = !input.canonicalBaseSet ? 0 : input.canonicalBaseRedirects ? 0.5 : 1;
    onPage += add("canonical", "Canonical URL set & resolving", "onPage", canonicalFraction, 14,
      !input.canonicalBaseSet ? "Canonical base URL not set"
        : input.canonicalBaseRedirects ? "Canonical base redirects — Google ignores canonical tags"
        : "Canonical base set and resolves directly");

    onPage += add("nap", "Business NAP complete", "onPage",
      input.napComplete ? 1 : 0, 12,
      input.napComplete ? "Name, address, phone, locality all set" : "Name/street/phone/locality incomplete");

    onPage += add("structured_data", "Structured data enabled", "onPage",
      input.structuredDataEnabled ? 1 : 0, 8,
      input.structuredDataEnabled ? "LocalBusiness JSON-LD enabled" : "Structured data disabled");

    onPage += add("ga4", "Google Analytics connected", "onPage",
      input.ga4Connected ? 1 : 0, 6,
      input.ga4Connected ? "GA4 measurement ID set" : "GA4 not connected");

    onPage += add("gsc", "Search Console connected", "onPage",
      input.gscConnected ? 1 : 0, 4,
      input.gscConnected ? "Search Console connected" : "Search Console not connected");

    onPage += add("sitemap", "Sitemap has pages", "onPage",
      input.sitemapHasPages ? 1 : 0, 6,
      input.sitemapHasPages ? "Published pages present" : "No published pages");
  }
  onPage = Math.min(100, Math.max(0, Math.round(onPage)));

  // ── Content & Structure (weights sum to 100) — only when a crawl ran ──
  let content: number | null = null;
  if (input.crawl) {
    const c = input.crawl;
    let con = 0;

    con += add("single_h1", "Exactly one H1 per page", "content",
      ratio(c.pagesCrawled, c.pagesWithExactlyOneH1), 25,
      `${c.pagesWithExactlyOneH1}/${c.pagesCrawled} pages have exactly one H1`);

    con += add("content_depth", "Sufficient content (not thin)", "content",
      passRatio(c.pagesCrawled, c.thinContentPages), 20,
      `${c.pagesCrawled - c.thinContentPages}/${c.pagesCrawled} pages have enough content`);

    con += add("viewport", "Mobile viewport tag", "content",
      passRatio(c.pagesCrawled, c.pagesMissingViewport), 15,
      `${c.pagesCrawled - c.pagesMissingViewport}/${c.pagesCrawled} pages set a viewport`);

    con += add("image_alt", "Image alt coverage", "content",
      ratio(c.imagesTotal, c.imagesWithAlt), 20,
      c.imagesTotal === 0 ? "No images" : `${c.imagesWithAlt}/${c.imagesTotal} images have alt text`);

    con += add("internal_links", "Internal linking", "content",
      ratio(c.pagesCrawled, c.pagesWithInternalLinks), 20,
      `${c.pagesWithInternalLinks}/${c.pagesCrawled} pages link internally`);

    content = Math.min(100, Math.max(0, Math.round(con)));
  }

  // ── Performance (weights sum to 100) — only when GSC connected ──
  let performance: number | null = null;
  if (input.gsc) {
    const g = input.gsc;
    let perf = 0;

    perf += add("indexed_ratio", "Pages indexed", "performance", clamp01(g.indexedRatio), 35,
      `${Math.round(clamp01(g.indexedRatio) * 100)}% of pages indexed by Google`);

    perf += add("avg_position", "Average search position", "performance", positionBand(g.avgPosition), 30,
      g.avgPosition > 0 ? `Average position ${g.avgPosition.toFixed(1)}` : "No ranking data yet");

    perf += add("ctr", "Click-through rate", "performance", clamp01(g.ctr / 0.05), 20,
      `${(clamp01(g.ctr) * 100).toFixed(1)}% CTR`);

    const impFraction = clampPos(g.impressions) > 0
      ? clamp01(Math.log10(clampPos(g.impressions) + 1) / 4)
      : 0;
    perf += add("impressions", "Search impressions", "performance", impFraction, 15,
      `${clampPos(g.impressions).toLocaleString()} impressions (28d)`);

    performance = Math.min(100, Math.max(0, Math.round(perf)));
  }

  // ── Composite: weighted average over present dimensions ──
  const dims: Array<{ v: number; w: number }> = [{ v: onPage, w: 0.5 }];
  if (content !== null) dims.push({ v: content, w: 0.3 });
  if (performance !== null) dims.push({ v: performance, w: 0.2 });
  const wsum = dims.reduce((a, d) => a + d.w, 0);
  const total = Math.round(dims.reduce((a, d) => a + d.v * d.w, 0) / wsum);

  return { total, onPage, content, performance, breakdown };
}
