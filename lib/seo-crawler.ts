/**
 * On-page crawler — fetches the RENDERED HTML of published pages and extracts the
 * structural signals an external audit (e.g. Seobility) checks but stored DB meta
 * fields cannot tell us: H1 count, word count, internal/external links, image alt
 * coverage, and the mobile viewport tag.
 *
 * Design constraints:
 *  - Dependency-free: regex/string parsing, no jsdom/cheerio.
 *  - Bounded: at most `maxPages` fetches, `concurrency` at a time, per-request timeout.
 *  - NEVER throws: a failed/blocked/slow page is recorded as { ok: false } and skipped
 *    from aggregates. A missing/unreachable base URL yields an empty outcome.
 *
 * ASSUMPTIONS:
 *  1. baseUrl is an absolute origin (https://host) with no trailing slash enforced here.
 *  2. Server can reach baseUrl (public site). If not, every fetch fails → crawl is
 *     treated as "did not run" by the caller (aggregate.pagesCrawled === 0).
 */

export const THIN_CONTENT_WORDS = 250;

export interface CrawlPageResult {
  id: string;
  slug: string;
  url: string;
  ok: boolean;
  h1Count: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imagesTotal: number;
  imagesWithAlt: number;
  hasViewport: boolean;
  error?: string;
}

export interface CrawlAggregate {
  pagesCrawled: number;
  pagesWithExactlyOneH1: number;
  thinContentPages: number;
  pagesMissingViewport: number;
  imagesTotal: number;
  imagesWithAlt: number;
  pagesWithInternalLinks: number;
}

export interface CrawlOutcome {
  results: CrawlPageResult[];
  aggregate: CrawlAggregate;
}

export interface CrawlTarget {
  id: string;
  slug: string;
}

export interface CrawlOptions {
  maxPages?: number;
  concurrency?: number;
  timeoutMs?: number;
}

function countWords(html: string): number {
  // Isolate body if present, strip script/style, strip tags, collapse whitespace.
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  let text = bodyMatch ? bodyMatch[1] : html;
  text = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").filter(Boolean).length;
}

function parseHtml(html: string, baseHost: string): Omit<CrawlPageResult, "id" | "slug" | "url" | "ok"> {
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

  // Images
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const imagesTotal = imgTags.length;
  const imagesWithAlt = imgTags.filter((t) => /\balt\s*=\s*["'][^"']+["']/i.test(t)).length;

  // Links
  let internalLinks = 0;
  let externalLinks = 0;
  const hrefRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1].trim();
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    if (href.startsWith("/")) {
      internalLinks++;
    } else if (/^https?:\/\//i.test(href)) {
      try {
        const host = new URL(href).host;
        if (baseHost && host === baseHost) internalLinks++;
        else externalLinks++;
      } catch {
        externalLinks++;
      }
    }
  }

  return {
    h1Count,
    wordCount: countWords(html),
    internalLinks,
    externalLinks,
    imagesTotal,
    imagesWithAlt,
    hasViewport,
  };
}

async function crawlOne(
  base: string,
  baseHost: string,
  target: CrawlTarget,
  timeoutMs: number,
): Promise<CrawlPageResult> {
  const slugPath = target.slug === "/" || target.slug === "" ? "" : `/${target.slug.replace(/^\//, "")}`;
  const url = `${base}${slugPath}`;
  const blank: CrawlPageResult = {
    id: target.id, slug: target.slug, url, ok: false,
    h1Count: 0, wordCount: 0, internalLinks: 0, externalLinks: 0,
    imagesTotal: 0, imagesWithAlt: 0, hasViewport: false,
  };
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "WhiteLabelCMS-SEO-Crawler/1.0" },
    });
    if (!res.ok) return { ...blank, error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html/i.test(ct)) return { ...blank, error: `Non-HTML (${ct})` };
    const html = await res.text();
    return { id: target.id, slug: target.slug, url, ok: true, ...parseHtml(html, baseHost) };
  } catch (err) {
    return { ...blank, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

/** Run targets through a fixed-size concurrency pool. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function crawlSite(
  baseUrl: string,
  targets: CrawlTarget[],
  opts: CrawlOptions = {},
): Promise<CrawlOutcome> {
  const empty: CrawlOutcome = {
    results: [],
    aggregate: {
      pagesCrawled: 0, pagesWithExactlyOneH1: 0, thinContentPages: 0,
      pagesMissingViewport: 0, imagesTotal: 0, imagesWithAlt: 0, pagesWithInternalLinks: 0,
    },
  };

  const base = (baseUrl || "").replace(/\/$/, "");
  if (!base || !/^https?:\/\//i.test(base) || targets.length === 0) return empty;

  let baseHost = "";
  try { baseHost = new URL(base).host; } catch { return empty; }

  const maxPages = opts.maxPages ?? 25;
  const concurrency = opts.concurrency ?? 3;
  const timeoutMs = opts.timeoutMs ?? 8_000;

  const slice = targets.slice(0, maxPages);
  const results = await pool(slice, concurrency, (t) => crawlOne(base, baseHost, t, timeoutMs));

  const ok = results.filter((r) => r.ok);
  const aggregate: CrawlAggregate = {
    pagesCrawled: ok.length,
    pagesWithExactlyOneH1: ok.filter((r) => r.h1Count === 1).length,
    thinContentPages: ok.filter((r) => r.wordCount < THIN_CONTENT_WORDS).length,
    pagesMissingViewport: ok.filter((r) => !r.hasViewport).length,
    imagesTotal: ok.reduce((a, r) => a + r.imagesTotal, 0),
    imagesWithAlt: ok.reduce((a, r) => a + r.imagesWithAlt, 0),
    pagesWithInternalLinks: ok.filter((r) => r.internalLinks > 0).length,
  };

  return { results, aggregate };
}
