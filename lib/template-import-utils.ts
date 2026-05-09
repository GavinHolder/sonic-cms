import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import AdmZip from "adm-zip";
import { NextResponse } from "next/server";

const UPLOAD_DIR = join(process.cwd(), "public", "images", "uploads");

export const IMAGE_EXTS  = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
export const SVG_EXT     = ".svg";
export const VIDEO_EXTS  = new Set([".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"]);

export interface ImportAnalysisItem {
  type: string;
  detail: string;
  suggestion?: string;
  occurrences?: string[];  // raw values (paths, numbers, etc.) — powers inline fix UI
}

export interface ImportAnalysis {
  autoHandled: ImportAnalysisItem[];
  needsAttention: ImportAnalysisItem[];
}

export function toSlotName(entryName: string): string {
  const base = entryName.split("/").pop() ?? entryName;
  const withoutExt = base.includes(".") ? base.split(".").slice(0, -1).join(".") : base;
  return withoutExt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "media";
}

export function dedupeSlotName(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

/** Extract {{cms.media.SLOTNAME}} tokens from HTML in order of first appearance. */
export function extractMediaTokens(html: string): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of html.matchAll(/\{\{cms\.media\.([a-z0-9-]+)\}\}/gi)) {
    const name = m[1].toLowerCase();
    if (!seen.has(name)) { seen.add(name); ordered.push(name); }
  }
  return ordered;
}

/**
 * Resolve the mediaSlots key for an uploaded image.
 * Priority:
 *   1. Exact match between filename-derived name and an available token.
 *   2. Normalised similarity (strip dashes/underscores and compare).
 *   3. Next unused token in order of appearance.
 *   4. Fallback: filename-derived name (deduplicated).
 */
export function resolveSlotName(
  entryName: string,
  tokens: string[],
  usedTokens: Set<string>,
  seenSlots: Map<string, number>,
): string {
  const fileBase = toSlotName(entryName);

  const available = (t: string) => !usedTokens.has(t);

  // 1. Exact match
  const exact = tokens.find(t => t === fileBase && available(t));
  if (exact) { usedTokens.add(exact); return exact; }

  // 2. Normalised similarity (ignore separators)
  const norm = (s: string) => s.replace(/[-_]/g, "");
  const similar = tokens.find(t => available(t) && norm(t) === norm(fileBase));
  if (similar) { usedTokens.add(similar); return similar; }

  // 3. Order-based: next unused token
  const next = tokens.find(available);
  if (next) { usedTokens.add(next); return next; }

  // 4. Fallback: filename-derived with dedup
  return dedupeSlotName(fileBase, seenSlots);
}

export async function uploadImageBuffer(buffer: Buffer, entryName: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const rawFilename = (entryName.split("/").pop() ?? "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
  const base = rawFilename.split(".").slice(0, -1).join(".") || "upload";
  const timestamp = Date.now();
  const outName = `${base}-${timestamp}.webp`;
  await sharp(buffer)
    .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(join(UPLOAD_DIR, outName));
  return `/images/uploads/${outName}`;
}

export async function uploadSvgBuffer(buffer: Buffer, entryName: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const rawFilename = (entryName.split("/").pop() ?? "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
  const base = rawFilename.split(".").slice(0, -1).join(".") || "upload";
  const timestamp = Date.now();
  const outName = `${base}-${timestamp}.svg`;
  await writeFile(join(UPLOAD_DIR, outName), buffer);
  return `/images/uploads/${outName}`;
}

export function replaceLocalRef(content: string, filename: string, replacement: string): string {
  const esc = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const attrRe = new RegExp(
    `((?:src|href|srcset|data-src|data-background|poster)=["'])([^"']*\\/)?${esc}(["'])`,
    "gi"
  );
  const urlRe = new RegExp(
    `(url\\(["']?)([^"')]*\\/)?${esc}(["']?\\))`,
    "gi"
  );
  return content
    .replace(attrRe, `$1${replacement}$3`)
    .replace(urlRe, `$1${replacement}$3`);
}

export function isLocalPath(src: string): boolean {
  return !src.startsWith("http://") && !src.startsWith("https://") &&
         !src.startsWith("//") && !src.startsWith("data:") && !src.startsWith("/");
}

/** Humanize a media slot name for display labels. */
export function humanizeSlot(name: string): string {
  const map: Record<string, string> = {
    "hero-bg":            "Hero Background",
    "hero-bg-2":          "Hero Background (Slide 2)",
    "hero-bg-3":          "Hero Background (Slide 3)",
    "about-img":          "About Section Image",
    "coverage-img":       "Coverage Area Image",
    "coverage-map-slug":  "Coverage Map",
    "logo":               "Logo",
  };
  if (map[name]) return map[name];
  const proj = name.match(/^project(\d+)$/);
  if (proj) return `Project ${proj[1]} Image`;
  const gal = name.match(/^gallery(\d+)$/);
  if (gal) return `Gallery Image ${gal[1]}`;
  return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Analyse HTML for CMS integration issues.
 * localOnly=true        → only flag relative paths (no leading / or http) — used during ZIP import.
 * localOnly=false       → flag ALL image/video/background sources.
 * existingSlots         → already-assigned media slots; detected slots not re-surfaced if assigned.
 */
export function analyzeHtml(
  html: string,
  localOnly = true,
  existingSlots: Record<string, string> = {},
): { needsAttention: ImportAnalysisItem[] } {
  const items: ImportAnalysisItem[] = [];

  const validSrc = (src: string) =>
    !!src && !src.startsWith("data:") && !src.includes("{{cms.");

  const includeSrc = (src: string) =>
    localOnly ? isLocalPath(src) : validSrc(src);

  // ── Forms ─────────────────────────────────────────────────────────────────
  const formMatches = html.match(/<form\b/gi);
  if (formMatches) {
    items.push({
      type: "FORM",
      detail: `${formMatches.length} <form> element${formMatches.length > 1 ? "s" : ""} found`,
      suggestion: "Select a CMS form from the dropdown to replace the form HTML automatically.",
    });
  }

  // ── Videos (src on <video> / <source>) ───────────────────────────────────
  const uniqueVideoSrcs = [...new Set(
    [...html.matchAll(/<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["']/gi)]
      .map(m => m[1]).filter(includeSrc)
  )];
  if (uniqueVideoSrcs.length > 0) {
    items.push({
      type: "VIDEO",
      detail: `${uniqueVideoSrcs.length} video source${uniqueVideoSrcs.length > 1 ? "s" : ""}`,
      suggestion: "Pick a video from the Media Library to replace each source.",
      occurrences: uniqueVideoSrcs,
    });
  }

  // ── Phone ─────────────────────────────────────────────────────────────────
  const uniquePhones = [...new Set(
    [...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map(m => m[1])
  )];
  if (uniquePhones.length > 0) {
    items.push({
      type: "PHONE",
      detail: `Hardcoded phone${uniquePhones.length > 1 ? "s" : ""}: ${uniquePhones.join(", ")}`,
      suggestion: 'One click replaces all tel: links with {{cms.phone}}.',
      occurrences: uniquePhones,
    });
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  const uniqueEmails = [...new Set(
    [...html.matchAll(/href=["']mailto:([^"'?]+)/gi)].map(m => m[1])
  )];
  if (uniqueEmails.length > 0) {
    items.push({
      type: "EMAIL",
      detail: `Hardcoded email${uniqueEmails.length > 1 ? "s" : ""}: ${uniqueEmails.join(", ")}`,
      suggestion: 'One click replaces all mailto: links with {{cms.email}}.',
      occurrences: uniqueEmails,
    });
  }

  // ── Background images (CSS url() + data-background attr) ─────────────────
  const cssBgSrcs  = [...html.matchAll(/background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi)].map(m => m[1]);
  const dataBgSrcs = [...html.matchAll(/data-background=["']([^"']+)["']/gi)].map(m => m[1]);
  const uniqueBgSrcs = [...new Set([...cssBgSrcs, ...dataBgSrcs].filter(includeSrc))];
  if (uniqueBgSrcs.length > 0) {
    items.push({
      type: "BACKGROUND",
      detail: `${uniqueBgSrcs.length} background image${uniqueBgSrcs.length > 1 ? "s" : ""}`,
      suggestion: "Pick an image from the Media Library for each background.",
      occurrences: uniqueBgSrcs,
    });
  }

  // ── Image sources (src + data-src + poster) ───────────────────────────────
  const imgSrcs    = [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1]);
  const dataSrcs   = [...html.matchAll(/<img\b[^>]*\bdata-src=["']([^"']+)["']/gi)].map(m => m[1]);
  const posterSrcs = [...html.matchAll(/\bposter=["']([^"']+)["']/gi)].map(m => m[1]);
  const uniqueImgSrcs = [...new Set(
    [...imgSrcs, ...dataSrcs, ...posterSrcs].filter(includeSrc)
  )];
  if (uniqueImgSrcs.length > 0) {
    items.push({
      type: "LOCAL_IMG",
      detail: `${uniqueImgSrcs.length} image${uniqueImgSrcs.length > 1 ? "s" : ""}`,
      suggestion: "Pick from the Media Library to replace each image.",
      occurrences: uniqueImgSrcs,
    });
  }

  // ── CDN stylesheets ───────────────────────────────────────────────────────
  const cdnLinks = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](https?:\/\/[^"']+)["']/gi)]
    .map(m => m[1]);
  if (cdnLinks.length > 0) {
    items.push({
      type: "CDN",
      detail: `${cdnLinks.length} external CDN stylesheet${cdnLinks.length > 1 ? "s" : ""} (no action needed)`,
      suggestion: "CDN links work fine as-is. Optionally move them to the CSS Files tab in the Standalone Editor.",
    });
  }

  // ── Hardcoded logo image ──────────────────────────────────────────────────
  if (!localOnly) {
    const logoImgs = [...html.matchAll(/<img\b([^>]+)>/gi)].filter(m => {
      const attrs = m[1];
      const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
      if (!srcMatch || srcMatch[1].includes("{{cms.")) return false;
      return /logo/i.test(srcMatch[1]) ||
             /\balt=["'][^"']*logo[^"']*["']/i.test(attrs) ||
             /\bclass=["'][^"']*logo[^"']*["']/i.test(attrs);
    });
    if (logoImgs.length > 0) {
      items.push({
        type: "LOGO",
        detail: `${logoImgs.length} hardcoded logo image${logoImgs.length > 1 ? "s" : ""} — replace with {{cms.logo}}`,
        suggestion: "One click replaces all logo images with {{cms.logo}}.",
      });
    }

    // ── Hardcoded address ─────────────────────────────────────────────────
    const addrMatch = html.match(/\b\d+\s+\w[\w\s]*\b(?:Street|Road|Ave|Avenue|Drive|Lane|Str|Rd|Blvd|Boulevard|Crescent|Close|Way)\b/i);
    if (addrMatch) {
      items.push({
        type: "ADDRESS",
        detail: "Possible hardcoded address detected",
        suggestion: "Replace with {{cms.address}}, {{cms.city}} variables.",
      });
    }

    // ── {{cms.media.*}} slots in HTML (only in analyze mode, not ZIP import) ─
    const detectedSlots = [...new Set(
      [...html.matchAll(/\{\{cms\.media\.([a-z0-9-]+)\}\}/gi)].map(m => m[1])
    )].filter(slot => !(slot in existingSlots));

    for (const slot of detectedSlots) {
      if (slot.includes("coverage-map")) {
        items.push({ type: "COVERAGE_MAP_SLOT", detail: `Coverage map slot — select which map to display`, occurrences: [slot] });
      } else if (slot === "logo") {
        items.push({ type: "LOGO_SLOT", detail: `Logo slot — set in Site Config → Branding`, occurrences: [slot] });
      } else {
        items.push({ type: "MEDIA_SLOT", detail: `Assign image for {{cms.media.${slot}}}`, occurrences: [slot] });
      }
    }
  }

  return { needsAttention: items };
}

export interface ZipImportResult {
  html: string;
  css: string;
  mediaSlots: Record<string, string>;
  analysis: { autoHandled: ImportAnalysisItem[]; needsAttention: ImportAnalysisItem[] };
}

/**
 * Process a ZIP buffer: extract HTML/CSS/JS, upload images, replace local
 * refs with {{cms.media.*}}, and return an analysis of what was handled.
 * Shared by the import route and the analyze re-import route.
 */
export async function processZip(arrayBuffer: ArrayBuffer): Promise<NextResponse> {
  const buffer = Buffer.from(arrayBuffer);
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    return NextResponse.json({ error: "Invalid or corrupt ZIP file" }, { status: 400 });
  }

  const entries = zip.getEntries().filter(e => !e.isDirectory);

  const htmlEntries = entries.filter(e => {
    const n = e.entryName.toLowerCase();
    return n.endsWith(".html") || n.endsWith(".htm");
  });
  const cssEntries  = entries.filter(e => e.entryName.toLowerCase().endsWith(".css"));
  const jsEntries   = entries.filter(e => {
    const n = e.entryName.toLowerCase();
    return (n.endsWith(".js") || n.endsWith(".jsx")) && !n.endsWith(".min.js");
  });
  const imageEntries = entries.filter(e => IMAGE_EXTS.has("." + (e.entryName.toLowerCase().split(".").pop() ?? "")));
  const svgEntries   = entries.filter(e => e.entryName.toLowerCase().endsWith(SVG_EXT));
  const videoEntries = entries.filter(e => VIDEO_EXTS.has("." + (e.entryName.toLowerCase().split(".").pop() ?? "")));

  const indexEntry = htmlEntries.find(e => {
    const base = e.entryName.split("/").pop()?.toLowerCase() ?? "";
    return base === "index.html" || base === "index.htm";
  }) ?? htmlEntries[0];

  if (!indexEntry) {
    return NextResponse.json({ error: "No HTML file found in ZIP" }, { status: 400 });
  }

  let html = indexEntry.getData().toString("utf8");

  // Build filename→content lookup maps for CSS and JS/JSX files
  const cssMap = new Map<string, string>();
  for (const e of cssEntries) {
    const base = (e.entryName.split("/").pop() ?? "").toLowerCase();
    cssMap.set(base, e.getData().toString("utf8"));
  }
  const jsMap = new Map<string, { content: string; entryName: string }>();
  for (const e of jsEntries) {
    const base = (e.entryName.split("/").pop() ?? "").toLowerCase();
    jsMap.set(base, { content: e.getData().toString("utf8"), entryName: e.entryName });
  }

  // ── Inline CSS: replace <link rel="stylesheet" href="local.css"> → <style>…</style>
  const inlinedCss = new Set<string>();
  html = html.replace(/<link\b([^>]*)\bhref=["']([^"']+\.css)["'][^>]*\/?>/gi, (match, _attrs, href) => {
    if (href.startsWith("http") || href.startsWith("//") || href.startsWith("data:")) return match;
    const base = (href.split("/").pop() ?? "").toLowerCase();
    const content = cssMap.get(base);
    if (!content) return match;
    inlinedCss.add(base);
    return `<style>/* ${base} */\n${content}\n</style>`;
  });

  // ── Inline JS/JSX: replace <script src="local.js"></script> → <script>…</script>
  //    Preserves type attribute (e.g. type="text/babel" for JSX)
  const inlinedJs = new Set<string>();
  html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*><\/script>/gi, (match, attrs, src) => {
    if (src.startsWith("http") || src.startsWith("//") || src.startsWith("data:")) return match;
    const base = (src.split("/").pop() ?? "").toLowerCase();
    const entry = jsMap.get(base);
    if (!entry) return match;
    inlinedJs.add(base);
    const typeMatch = (attrs as string).match(/\btype=["']([^"']+)["']/i);
    const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : "";
    return `<script${typeAttr}>/* ${base} */\n${entry.content}\n</script>`;
  });

  // ── Any CSS not referenced in HTML → store in the separate css field
  const remainingCssParts: string[] = [];
  for (const e of cssEntries) {
    const base = (e.entryName.split("/").pop() ?? "").toLowerCase();
    if (!inlinedCss.has(base)) {
      remainingCssParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
    }
  }

  // ── Any JS not referenced in HTML → append before </body>
  const remainingJsParts: string[] = [];
  for (const e of jsEntries) {
    const base = (e.entryName.split("/").pop() ?? "").toLowerCase();
    if (!inlinedJs.has(base)) {
      remainingJsParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
    }
  }
  if (remainingJsParts.length > 0) {
    const scriptBlock = `<script>\n${remainingJsParts.join("\n\n")}\n</script>`;
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${scriptBlock}\n</body>`)
      : html + "\n" + scriptBlock;
  }

  const mediaSlots: Record<string, string> = {};
  const uploadedImages: string[] = [];
  const uploadErrors: string[] = [];
  const seenSlots = new Map<string, number>();
  let css = remainingCssParts.join("\n\n");

  // Scan HTML for pre-existing {{cms.media.*}} tokens so uploaded images can be
  // keyed to the names the template already expects, not raw filenames.
  const existingTokens = extractMediaTokens(html);
  const usedTokens = new Set<string>();

  for (const e of imageEntries) {
    try {
      const slotName = resolveSlotName(e.entryName, existingTokens, usedTokens, seenSlots);
      const uploadedUrl = await uploadImageBuffer(e.getData(), e.entryName);
      mediaSlots[slotName] = uploadedUrl;
      const imgFilename = e.entryName.split("/").pop()!;
      const cmsVar = `{{cms.media.${slotName}}}`;
      html = replaceLocalRef(html, imgFilename, cmsVar);
      css  = replaceLocalRef(css,  imgFilename, cmsVar);
      uploadedImages.push(`${imgFilename} → ${slotName}`);
    } catch (err) {
      uploadErrors.push(`${e.entryName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const e of svgEntries) {
    try {
      const slotName = resolveSlotName(e.entryName, existingTokens, usedTokens, seenSlots);
      const uploadedUrl = await uploadSvgBuffer(e.getData(), e.entryName);
      mediaSlots[slotName] = uploadedUrl;
      const svgFilename = e.entryName.split("/").pop()!;
      const cmsVar = `{{cms.media.${slotName}}}`;
      html = replaceLocalRef(html, svgFilename, cmsVar);
      css  = replaceLocalRef(css,  svgFilename, cmsVar);
      uploadedImages.push(`${svgFilename} → ${slotName}`);
    } catch (err) {
      uploadErrors.push(`${e.entryName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const autoHandled: ImportAnalysisItem[] = [];
  if (uploadedImages.length > 0)  autoHandled.push({ type: "IMAGES", detail: `${uploadedImages.length} image${uploadedImages.length > 1 ? "s" : ""} uploaded and wired as media slots` });
  if (uploadErrors.length > 0)    autoHandled.push({ type: "IMAGE_ERRORS", detail: `${uploadErrors.length} image${uploadErrors.length > 1 ? "s" : ""} could not be uploaded: ${uploadErrors.join("; ")}` });
  if (inlinedCss.size > 0)        autoHandled.push({ type: "CSS", detail: `${inlinedCss.size} CSS file${inlinedCss.size > 1 ? "s" : ""} inlined into HTML (removed <link> tags)` });
  if (remainingCssParts.length > 0) autoHandled.push({ type: "CSS", detail: `${remainingCssParts.length} unreferenced CSS file${remainingCssParts.length > 1 ? "s" : ""} merged into template CSS field` });
  if (inlinedJs.size > 0)         autoHandled.push({ type: "JS", detail: `${inlinedJs.size} JS/JSX file${inlinedJs.size > 1 ? "s" : ""} inlined into HTML (removed <script src> tags)` });
  if (remainingJsParts.length > 0) autoHandled.push({ type: "JS", detail: `${remainingJsParts.length} unreferenced JS file${remainingJsParts.length > 1 ? "s" : ""} appended before </body>` });

  const { needsAttention } = analyzeHtml(html);
  if (videoEntries.length > 0) {
    const vnames = videoEntries.map(e => e.entryName.split("/").pop()).join(", ");
    needsAttention.push({
      type: "VIDEO_FILES",
      detail: `${videoEntries.length} video file${videoEntries.length > 1 ? "s" : ""} in ZIP not auto-uploaded: ${vnames}`,
      suggestion: "Upload each video via Media Library (up to 200 MB), then add a named media slot.",
    });
  }

  return NextResponse.json({ success: true, data: { html, css, mediaSlots, analysis: { autoHandled, needsAttention } } });
}
