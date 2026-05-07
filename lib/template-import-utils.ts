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

export function analyzeHtml(html: string): { needsAttention: ImportAnalysisItem[] } {
  const items: ImportAnalysisItem[] = [];

  const formMatches = html.match(/<form\b/gi);
  if (formMatches) {
    items.push({
      type: "FORM",
      detail: `${formMatches.length} <form> element${formMatches.length > 1 ? "s" : ""} found`,
      suggestion: "Select a CMS form from the dropdown to replace the form HTML automatically.",
    });
  }

  const uniqueVideoSrcs = [...new Set(
    [...html.matchAll(/<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["']/gi)]
      .map(m => m[1]).filter(isLocalPath)
  )];
  if (uniqueVideoSrcs.length > 0) {
    items.push({
      type: "VIDEO",
      detail: `${uniqueVideoSrcs.length} video source${uniqueVideoSrcs.length > 1 ? "s" : ""} with local path`,
      suggestion: "Pick a video from the Media Library to replace each source.",
      occurrences: uniqueVideoSrcs,
    });
  }

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

  const uniqueBgSrcs = [...new Set(
    [...html.matchAll(/background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi)]
      .map(m => m[1]).filter(isLocalPath)
  )];
  if (uniqueBgSrcs.length > 0) {
    items.push({
      type: "BACKGROUND",
      detail: `${uniqueBgSrcs.length} background-image${uniqueBgSrcs.length > 1 ? "s" : ""} with local path`,
      suggestion: "Pick an image from the Media Library for each background.",
      occurrences: uniqueBgSrcs,
    });
  }

  const uniqueLocalImgSrcs = [...new Set(
    [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)]
      .map(m => m[1]).filter(src => isLocalPath(src) && !src.includes("{{cms."))
  )];
  if (uniqueLocalImgSrcs.length > 0) {
    items.push({
      type: "LOCAL_IMG",
      detail: `${uniqueLocalImgSrcs.length} image src${uniqueLocalImgSrcs.length > 1 ? "s" : ""} with local path`,
      suggestion: "Pick from the Media Library to replace each image source.",
      occurrences: uniqueLocalImgSrcs,
    });
  }

  const cdnLinks = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](https?:\/\/[^"']+)["']/gi)]
    .map(m => m[1]);
  if (cdnLinks.length > 0) {
    items.push({
      type: "CDN",
      detail: `${cdnLinks.length} external CDN stylesheet${cdnLinks.length > 1 ? "s" : ""} (no action needed)`,
      suggestion: "CDN links work fine as-is. Optionally move them to the CSS Files tab in the Standalone Editor.",
    });
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
    return n.endsWith(".js") && !n.endsWith(".min.js");
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
  const cssParts: string[] = [];
  for (const e of cssEntries) {
    cssParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
  }

  const jsParts: string[] = [];
  for (const e of jsEntries) {
    jsParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
  }
  if (jsParts.length > 0) {
    const scriptBlock = `<script>\n${jsParts.join("\n\n")}\n</script>`;
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${scriptBlock}\n</body>`)
      : html + "\n" + scriptBlock;
  }

  const mediaSlots: Record<string, string> = {};
  const uploadedImages: string[] = [];
  const uploadErrors: string[] = [];
  const seenSlots = new Map<string, number>();
  let css = cssParts.join("\n\n");

  for (const e of imageEntries) {
    try {
      const slotName = dedupeSlotName(toSlotName(e.entryName), seenSlots);
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
      const slotName = dedupeSlotName(toSlotName(e.entryName), seenSlots);
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
  if (uploadedImages.length > 0) autoHandled.push({ type: "IMAGES", detail: `${uploadedImages.length} image${uploadedImages.length > 1 ? "s" : ""} uploaded and wired as media slots` });
  if (uploadErrors.length > 0)   autoHandled.push({ type: "IMAGE_ERRORS", detail: `${uploadErrors.length} image${uploadErrors.length > 1 ? "s" : ""} could not be uploaded: ${uploadErrors.join("; ")}` });
  if (jsParts.length > 0)        autoHandled.push({ type: "JS",  detail: `${jsParts.length} JS file${jsParts.length > 1 ? "s" : ""} bundled inline before </body>` });
  if (cssEntries.length > 0)     autoHandled.push({ type: "CSS", detail: `${cssEntries.length} CSS file${cssEntries.length > 1 ? "s" : ""} merged into template CSS field` });

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
