import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCmsSiteData, replaceCmsVars } from "@/lib/cms-site-data";
import { fetchSeoConfig, buildStructuredData } from "@/lib/metadata-generator";
import type { FormField } from "@/types/page";
import { PageType } from "@prisma/client";

export const dynamic = "force-dynamic";

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFormHtml(slug: string, title: string, fields: FormField[]): string {
  const fieldHtml = fields.map(f => {
    const label = `<label for="cms-f-${escHtml(f.id)}">${escHtml(f.label)}${f.required ? " *" : ""}</label>`;
    const req = f.required ? " required" : "";
    const ph = f.placeholder ? ` placeholder="${escHtml(f.placeholder)}"` : "";

    if (f.type === "textarea") {
      return `<div>${label}<textarea id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${ph}${req}></textarea></div>`;
    }
    if (f.type === "select") {
      const opts = (f.options ?? []).map(o => {
        const val = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        return `<option value="${escHtml(val)}">${escHtml(lbl)}</option>`;
      }).join("");
      return `<div>${label}<select id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${req}><option value="">Select...</option>${opts}</select></div>`;
    }
    if (f.type === "checkbox") {
      return `<div style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${req}>${label}</div>`;
    }
    const inputType = f.type === "phone" ? "tel" : f.type;
    return `<div>${label}<input type="${inputType}" id="cms-f-${escHtml(f.id)}" name="${escHtml(f.name)}"${ph}${req}></div>`;
  }).join("\n");

  return `<form data-cms-form data-source="${escHtml(title)}" style="display:flex;flex-direction:column;gap:1rem">\n${fieldHtml}\n<div><button type="submit">Submit</button></div>\n</form>`;
}

interface StandaloneSeoFields {
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  noindex: boolean;
  nofollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
}

/**
 * Build SEO head/body injections for a standalone page.
 *
 * Standalone pages return raw HTML and bypass app/layout.tsx entirely, so every
 * site-wide SEO feature (JSON-LD, canonical, head/body scripts, GA4, og: meta)
 * must be injected here explicitly — mirroring what layout.tsx does for normal pages.
 *
 * ASSUMPTIONS:
 * 1. publicPath is the ORIGINAL public pathname ("/" for homepage rewrite, "/{slug}" otherwise)
 * 2. html may or may not already contain a given tag — never double-inject
 * 3. seoConfig.canonicalBase may be empty → canonical tag omitted (matches buildMetadata)
 * 4. headScripts/bodyScripts/ga4Id come from SystemSettings (admin-only write — trusted)
 *
 * FAILURE MODES:
 * - SystemSettings query fails → setting treated as empty (graceful, page still renders)
 * - Template already has the tag → skipped (template author wins)
 * - Invalid GA4 id → skipped (same /^G-[A-Z0-9]+$/i guard as layout.tsx)
 */
async function buildSeoInjections(
  html: string,
  page: StandaloneSeoFields,
  publicPath: string
): Promise<{ html: string; headBlock: string; bodyBlock: string }> {
  const getSetting = (key: string) =>
    prisma.systemSettings.findUnique({ where: { key } }).then(r => r?.value || "").catch(() => "");

  const [seoConfig, headScripts, bodyScripts, ga4Id] = await Promise.all([
    fetchSeoConfig(),
    getSetting("custom_head_scripts"),
    getSetting("custom_body_scripts"),
    getSetting("ga4_measurement_id"),
  ]);

  const base = (seoConfig.canonicalBase || "").replace(/\/$/, "");
  const headParts: string[] = [];

  // ── Per-page SEO fields (replace in template where present, else inject) ──
  if (page.metaTitle) {
    const titleTag = `<title>${escHtml(page.metaTitle)}</title>`;
    if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
      html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, () => titleTag);
    } else {
      headParts.push(titleTag);
    }
  }

  if (page.metaDescription) {
    const descTag = `<meta name="description" content="${escHtml(page.metaDescription)}">`;
    if (/<meta\s[^>]*name=["']description["'][^>]*>/i.test(html)) {
      html = html.replace(/<meta\s[^>]*name=["']description["'][^>]*\/?>/i, () => descTag);
    } else {
      headParts.push(descTag);
    }
  }

  // ── Robots (noindex/nofollow) ──
  if ((page.noindex || page.nofollow) && !/name=["']robots["']/i.test(html)) {
    const robotsVal = [page.noindex ? "noindex" : "index", page.nofollow ? "nofollow" : "follow"].join(", ");
    headParts.push(`<meta name="robots" content="${escHtml(robotsVal)}">`);
  }

  // ── Canonical — homepage rewrite canonicalises to base, others to their slug ──
  if (!/rel=["']canonical["']/i.test(html)) {
    const canonical =
      page.canonicalUrl ||
      (base ? (publicPath === "/" ? base : `${base}${publicPath}`) : "");
    if (canonical) headParts.push(`<link rel="canonical" href="${escHtml(canonical)}">`);
  }

  // ── og:/twitter meta — page fields with seo-config fallbacks ──
  const ogTitle = page.ogTitle || page.metaTitle || page.title;
  const ogDescription = page.ogDescription || page.metaDescription || seoConfig.defaultDescription || "";
  const rawOgImage = page.ogImage || seoConfig.social.ogImage || "";
  const ogImage = rawOgImage.startsWith("/") && base ? `${base}${rawOgImage}` : rawOgImage;
  const canonicalHref = page.canonicalUrl || (base ? (publicPath === "/" ? base : `${base}${publicPath}`) : "");

  if (!/property=["']og:type["']/i.test(html)) {
    headParts.push(`<meta property="og:type" content="website">`);
  }
  if (ogTitle && !/property=["']og:title["']/i.test(html)) {
    headParts.push(`<meta property="og:title" content="${escHtml(ogTitle)}">`);
  }
  if (ogDescription && !/property=["']og:description["']/i.test(html)) {
    headParts.push(`<meta property="og:description" content="${escHtml(ogDescription)}">`);
  }
  if (ogImage && !/property=["']og:image["']/i.test(html)) {
    headParts.push(`<meta property="og:image" content="${escHtml(ogImage)}">`);
  }
  if (canonicalHref && !/property=["']og:url["']/i.test(html)) {
    headParts.push(`<meta property="og:url" content="${escHtml(canonicalHref)}">`);
  }
  if (seoConfig.siteName && !/property=["']og:site_name["']/i.test(html)) {
    headParts.push(`<meta property="og:site_name" content="${escHtml(seoConfig.siteName)}">`);
  }
  if (!/name=["']twitter:card["']/i.test(html)) {
    headParts.push(`<meta name="twitter:card" content="${escHtml(seoConfig.social.twitterCard || "summary_large_image")}">`);
    if (ogTitle) headParts.push(`<meta name="twitter:title" content="${escHtml(ogTitle)}">`);
    if (ogDescription) headParts.push(`<meta name="twitter:description" content="${escHtml(ogDescription)}">`);
    if (ogImage) headParts.push(`<meta name="twitter:image" content="${escHtml(ogImage)}">`);
    if (seoConfig.social.twitterSite) headParts.push(`<meta name="twitter:site" content="${escHtml(seoConfig.social.twitterSite)}">`);
  }

  // ── Keywords ──
  if (page.metaKeywords && !/name=["']keywords["']/i.test(html)) {
    headParts.push(`<meta name="keywords" content="${escHtml(page.metaKeywords)}">`);
  }

  // ── JSON-LD structured data (admin Structured Data feature) ──
  if (!html.includes("application/ld+json")) {
    const jsonLd = buildStructuredData(seoConfig);
    if (jsonLd) headParts.push(`<script type="application/ld+json">${jsonLd}</script>`);
  }

  // ── GA4 — same validation guard as app/layout.tsx ──
  if (ga4Id && /^G-[A-Z0-9]+$/i.test(ga4Id) && !html.includes("googletagmanager.com/gtag")) {
    headParts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>`);
    headParts.push(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');</script>`);
  }

  // ── Custom head scripts (GSC verification tag, pixels, etc.) — raw, trusted ──
  if (headScripts && !html.includes(headScripts.trim())) {
    headParts.push(headScripts);
  }

  const bodyBlock = bodyScripts && !html.includes(bodyScripts.trim()) ? bodyScripts : "";

  return { html, headBlock: headParts.join("\n"), bodyBlock };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const page = await prisma.page.findUnique({
    where: { slug, type: "STANDALONE", enabled: true },
    select: {
      customHtml: true, customCss: true, customCssUrls: true, title: true, mediaSlots: true,
      metaTitle: true, metaDescription: true, metaKeywords: true,
      noindex: true, nofollow: true,
      ogTitle: true, ogDescription: true, ogImage: true, canonicalUrl: true,
    },
  });

  if (!page) {
    return new NextResponse("Not Found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const siteData = await getCmsSiteData();
  let html = replaceCmsVars(page.customHtml || "", siteData);
  let css = replaceCmsVars(page.customCss || "", siteData);

  // Layer 2: media slot replacement
  const mediaSlots = (page.mediaSlots && typeof page.mediaSlots === "object" && !Array.isArray(page.mediaSlots))
    ? (page.mediaSlots as Record<string, string>)
    : {};
  html = html.replace(/\{\{cms\.media\.([a-z0-9_-]+)\}\}/g, (_, name: string) => mediaSlots[name] ?? "");
  css  = css.replace( /\{\{cms\.media\.([a-z0-9_-]+)\}\}/g, (_, name: string) => mediaSlots[name] ?? "");

  // Layer 3: form injection
  let formsInjected = false;
  const formMatches = [...html.matchAll(/\{\{cms\.form\.([a-z0-9-]+)\}\}/g)];
  for (const [match, formSlug] of formMatches) {
    const formPage = await prisma.page.findUnique({
      where: { slug: formSlug, type: PageType.FORM, enabled: true },
      select: { formConfig: true, title: true },
    });
    const fields = formPage
      ? ((formPage.formConfig as { fields?: FormField[] } | null)?.fields ?? [])
      : [];
    const formHtml = formPage
      ? buildFormHtml(formSlug, formPage.title, fields)
      : `<!-- CMS form '${formSlug}' not found -->`;
    html = html.replace(match, formHtml);
    if (formPage) formsInjected = true;
  }

  const cssUrls: string[] = (() => {
    try { return JSON.parse(page.customCssUrls || "[]"); } catch { return []; }
  })();

  // Inject external CSS + inline styles before </head>
  const headParts = [
    ...cssUrls.map((url: string) => `<link rel="stylesheet" href="${url}">`),
    css ? `<style>${css}</style>` : "",
  ].filter(Boolean).join("\n");

  if (headParts) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${headParts}\n</head>`);
    } else {
      html = headParts + "\n" + html;
    }
  }

  // Inject forms script before </body>
  if (formsInjected) {
    const script = `<script src="/cms-forms.js"></script>`;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${script}\n</body>`);
    } else {
      html = html + "\n" + script;
    }
  }

  if (!html.trim()) {
    html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escHtml(page.title)}</title></head><body style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#6b7280;text-align:center"><div><h2 style="font-size:24px;margin-bottom:8px">${escHtml(page.title)}</h2><p>No HTML content yet. Edit this page in Admin &rarr; Pages.</p></div></body></html>`;
  }

  // ── SEO injection ─────────────────────────────────────────────────────────
  // x-pathname carries the ORIGINAL public path, set by middleware before the
  // rewrite ("/" for homepage, "/{slug}" for direct slug access). Direct hits
  // to /standalone/{slug} (no rewrite) normalise to "/{slug}".
  const xPathname = request.headers.get("x-pathname") || "";
  let publicPath = xPathname && !xPathname.startsWith("/standalone") ? xPathname : `/${slug}`;

  // If this page IS the configured homepage, canonicalise to "/" even when
  // reached via its slug — otherwise "/" and "/{slug}" would carry two
  // different canonicals for identical content (duplicate-content signal).
  if (publicPath !== "/") {
    const homeSlug = await prisma.siteConfig.findUnique({
      where: { id: "singleton" },
      select: { homePage: true },
    }).then(c => c?.homePage?.trim() || "").catch(() => "");
    if (homeSlug === slug) publicPath = "/";
  }

  const seo = await buildSeoInjections(html, page, publicPath);
  html = seo.html;

  // Function replacers — script content may contain "$&"-style sequences that
  // String.replace would otherwise expand as replacement patterns.
  if (seo.headBlock) {
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, () => `${seo.headBlock}\n</head>`);
    } else {
      html = seo.headBlock + "\n" + html;
    }
  }

  if (seo.bodyBlock) {
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, () => `${seo.bodyBlock}\n</body>`);
    } else {
      html = html + "\n" + seo.bodyBlock;
    }
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
