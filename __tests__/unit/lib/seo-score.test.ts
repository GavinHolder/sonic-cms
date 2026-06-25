import { describe, it, expect } from "vitest";
import { computeSeoScore, type SeoScoreInput } from "@/lib/seo-score";

const perfectOnPage: SeoScoreInput = {
  totalPages: 5,
  pagesMissingTitle: 0,
  pagesMissingDescription: 0,
  pagesMissingOgImage: 0,
  duplicateTitles: 0,
  duplicateDescriptions: 0,
  hasDefaultOgImage: true,
  canonicalBaseSet: true,
  canonicalBaseRedirects: false,
  structuredDataEnabled: true,
  napComplete: true,
  ga4Connected: true,
  gscConnected: true,
  sitemapHasPages: true,
  crawl: null,
  gsc: null,
};

const perfectCrawl = {
  pagesCrawled: 10,
  pagesWithExactlyOneH1: 10,
  thinContentPages: 0,
  pagesMissingViewport: 0,
  imagesTotal: 20,
  imagesWithAlt: 20,
  pagesWithInternalLinks: 10,
};

const perfectGsc = { indexedRatio: 1, avgPosition: 2, ctr: 0.1, impressions: 10_000 };

describe("computeSeoScore", () => {
  it("scores a perfect on-page site at 100 and total = onPage when no other dims", () => {
    const r = computeSeoScore(perfectOnPage);
    expect(r.onPage).toBe(100);
    expect(r.content).toBeNull();
    expect(r.performance).toBeNull();
    expect(r.total).toBe(100);
  });

  it("on-page breakdown weights sum to exactly 100", () => {
    const r = computeSeoScore(perfectOnPage);
    const onPageMax = r.breakdown.filter((b) => b.category === "onPage").reduce((a, b) => a + b.max, 0);
    expect(onPageMax).toBe(100);
  });

  it("content breakdown weights sum to exactly 100 when a crawl is present", () => {
    const r = computeSeoScore({ ...perfectOnPage, crawl: perfectCrawl });
    const contentMax = r.breakdown.filter((b) => b.category === "content").reduce((a, b) => a + b.max, 0);
    expect(contentMax).toBe(100);
    expect(r.content).toBe(100);
  });

  it("performance breakdown weights sum to exactly 100 when GSC is present", () => {
    const r = computeSeoScore({ ...perfectOnPage, gsc: perfectGsc });
    const perfMax = r.breakdown.filter((b) => b.category === "performance").reduce((a, b) => a + b.max, 0);
    expect(perfMax).toBe(100);
    expect(r.performance).toBe(100);
  });

  it("blends three present dimensions (all perfect → 100)", () => {
    const r = computeSeoScore({ ...perfectOnPage, crawl: perfectCrawl, gsc: perfectGsc });
    expect(r.onPage).toBe(100);
    expect(r.content).toBe(100);
    expect(r.performance).toBe(100);
    expect(r.total).toBe(100);
  });

  it("renormalises composite over present dimensions", () => {
    // onPage 100, content 0, no performance → 100*0.5 + 0*0.3 over weight 0.8 = 62.5 → 63
    const r = computeSeoScore({
      ...perfectOnPage,
      crawl: { ...perfectCrawl, pagesWithExactlyOneH1: 0, thinContentPages: 10, pagesMissingViewport: 10, imagesWithAlt: 0, pagesWithInternalLinks: 0 },
    });
    expect(r.onPage).toBe(100);
    expect(r.content).toBe(0);
    expect(r.total).toBe(63);
  });

  it("an empty new site (no config) scores the expected on-page floor of 42", () => {
    const r = computeSeoScore({
      totalPages: 0,
      pagesMissingTitle: 0,
      pagesMissingDescription: 0,
      pagesMissingOgImage: 0,
      duplicateTitles: 0,
      duplicateDescriptions: 0,
      hasDefaultOgImage: false,
      canonicalBaseSet: false,
      canonicalBaseRedirects: false,
      structuredDataEnabled: false,
      napComplete: false,
      ga4Connected: false,
      gscConnected: false,
      sitemapHasPages: false,
      crawl: null,
      gsc: null,
    });
    // titles(12) + descriptions(14) + no-dupe-titles(8) + no-dupe-descriptions(8) = 42
    expect(r.onPage).toBe(42);
    expect(r.total).toBe(42);
  });

  it("gives half credit when the canonical base redirects", () => {
    const full = computeSeoScore(perfectOnPage);
    const redirecting = computeSeoScore({ ...perfectOnPage, canonicalBaseRedirects: true });
    // canonical is worth 14; half credit loses 7
    expect(full.onPage - redirecting.onPage).toBe(7);
  });

  it("never throws and returns finite scores on NaN / negative inputs", () => {
    const r = computeSeoScore({
      ...perfectOnPage,
      totalPages: Number.NaN,
      pagesMissingTitle: -5,
      pagesMissingDescription: Number.NaN,
      crawl: { ...perfectCrawl, pagesCrawled: Number.NaN, imagesTotal: -3 },
      gsc: { indexedRatio: Number.NaN, avgPosition: -1, ctr: Number.NaN, impressions: -100 },
    });
    expect(Number.isFinite(r.total)).toBe(true);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it("treats image-alt as full credit when there are no images", () => {
    const r = computeSeoScore({
      ...perfectOnPage,
      crawl: { ...perfectCrawl, imagesTotal: 0, imagesWithAlt: 0 },
    });
    const altItem = r.breakdown.find((b) => b.key === "image_alt");
    expect(altItem?.score).toBe(altItem?.max);
  });
});
