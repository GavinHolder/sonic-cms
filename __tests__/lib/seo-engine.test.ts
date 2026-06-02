import { describe, it, expect } from "vitest";
import { classifyPage, autoFillFields } from "@/lib/seo-engine";

describe("classifyPage", () => {
  const base = {
    id: "1", slug: "test",
    publishedAt: new Date(Date.now() - 5 * 86400_000),
    seoUserEditedFields: null, metaTitle: null,
  };

  it("NEW: published <14d, no GSC data, no user edits", () => {
    expect(classifyPage(base, null).classification).toBe("new");
  });

  it("PROTECTED: GSC avg position ≤ 20", () => {
    const r = classifyPage(base, { avgPosition: 5, impressions28d: 10, hasAnyData: true });
    expect(r.classification).toBe("protected");
    expect(r.reason).toContain("ranking");
  });

  it("PROTECTED: impressions > 50", () => {
    const r = classifyPage(base, { avgPosition: 80, impressions28d: 200, hasAnyData: true });
    expect(r.classification).toBe("protected");
    expect(r.reason).toContain("impression");
  });

  it("PROTECTED: published ≥30d with any GSC data", () => {
    const old = { ...base, publishedAt: new Date(Date.now() - 35 * 86400_000) };
    const r = classifyPage(old, { avgPosition: 100, impressions28d: 2, hasAnyData: true });
    expect(r.classification).toBe("protected");
    expect(r.reason).toContain("established");
  });

  it("MONITORED: published ≥14d, no GSC data", () => {
    const mid = { ...base, publishedAt: new Date(Date.now() - 20 * 86400_000) };
    expect(classifyPage(mid, null).classification).toBe("monitored");
  });

  it("returns userEditedFields parsed from JSON", () => {
    const edited = { ...base, seoUserEditedFields: '["metaTitle"]' };
    expect(classifyPage(edited, null).userEditedFields).toContain("metaTitle");
  });
});

describe("autoFillFields", () => {
  const ctx = { siteName: "Test Site", companyName: "Test Co", city: "Cape Town", canonicalBase: "https://example.com" };
  const base = { id: "1", slug: "about", title: "About Us", metaTitle: null, metaDescription: null, ogTitle: null, ogDescription: null, canonicalUrl: null, seoUserEditedFields: null };

  it("fills metaTitle as 'Page Title | Site Name'", () => {
    expect(autoFillFields(base, ctx, []).metaTitle).toBe("About Us | Test Site");
  });

  it("truncates metaTitle to 60 chars", () => {
    const long = { ...base, title: "A".repeat(55) };
    expect(autoFillFields(long, ctx, []).metaTitle!.length).toBeLessThanOrEqual(60);
  });

  it("fills metaDescription from template", () => {
    const d = autoFillFields(base, ctx, []).metaDescription!;
    expect(d).toContain("About Us");
    expect(d).toContain("Test Co");
  });

  it("fills canonicalUrl from base + slug", () => {
    expect(autoFillFields(base, ctx, []).canonicalUrl).toBe("https://example.com/about");
  });

  it("copies metaTitle to ogTitle", () => {
    const r = autoFillFields(base, ctx, []);
    expect(r.ogTitle).toBe(r.metaTitle);
  });

  it("does not fill protected fields (even when empty)", () => {
    // Field is null but protected — engine must leave it alone (not in result)
    expect(autoFillFields(base, ctx, ["metaTitle"]).metaTitle).toBeUndefined();
  });

  it("never sets noindex, nofollow, or ogImage", () => {
    const r = autoFillFields(base, ctx, []);
    expect(r).not.toHaveProperty("noindex");
    expect(r).not.toHaveProperty("nofollow");
    expect(r).not.toHaveProperty("ogImage");
  });
});
