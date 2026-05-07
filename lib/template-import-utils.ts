import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "images", "uploads");

export const IMAGE_EXTS  = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
export const SVG_EXT     = ".svg";
export const VIDEO_EXTS  = new Set([".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"]);

export interface ImportAnalysisItem {
  type: string;
  detail: string;
  suggestion?: string;
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
      suggestion: "Replace each <form> with {{cms.form.YOUR-FORM-SLUG}} to wire up a CMS-managed form. Create your form first in Content → Forms.",
    });
  }

  const videoSrcs = [...html.matchAll(/<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map(m => m[1])
    .filter(isLocalPath);
  if (videoSrcs.length > 0) {
    items.push({
      type: "VIDEO",
      detail: `${videoSrcs.length} video source${videoSrcs.length > 1 ? "s" : ""} with local path (${videoSrcs.slice(0, 2).join(", ")}${videoSrcs.length > 2 ? "…" : ""})`,
      suggestion: "Upload each video via Media Library, then add a named media slot and use {{cms.media.SLOTNAME}} as the src.",
    });
  }

  const telLinks = [...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map(m => m[1]);
  if (telLinks.length > 0) {
    items.push({
      type: "PHONE",
      detail: `Hardcoded phone number${telLinks.length > 1 ? "s" : ""} in tel: link${telLinks.length > 1 ? "s" : ""}: ${telLinks.slice(0, 2).join(", ")}`,
      suggestion: 'Replace with href="tel:{{cms.phone}}" — value comes from Site Config → Contact Info.',
    });
  }

  const mailLinks = [...html.matchAll(/href=["']mailto:([^"'?]+)/gi)].map(m => m[1]);
  if (mailLinks.length > 0) {
    items.push({
      type: "EMAIL",
      detail: `Hardcoded email${mailLinks.length > 1 ? "s" : ""} in mailto: link${mailLinks.length > 1 ? "s" : ""}: ${mailLinks.slice(0, 2).join(", ")}`,
      suggestion: 'Replace with href="mailto:{{cms.email}}" — value comes from Site Config → Contact Info.',
    });
  }

  const bgMatches = [...html.matchAll(/background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi)]
    .map(m => m[1])
    .filter(isLocalPath);
  if (bgMatches.length > 0) {
    items.push({
      type: "BACKGROUND",
      detail: `${bgMatches.length} inline background-image URL${bgMatches.length > 1 ? "s" : ""} with local path`,
      suggestion: "These should already be wired as {{cms.media.SLOTNAME}} if their image file was in the ZIP. If not, upload via Media Library and add a media slot.",
    });
  }

  // Remaining local <img> src references (not already using {{cms.media.*}})
  const localImgSrcs = [...html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map(m => m[1])
    .filter(src => isLocalPath(src) && !src.includes("{{cms."));
  if (localImgSrcs.length > 0) {
    items.push({
      type: "LOCAL_IMG",
      detail: `${localImgSrcs.length} <img> src${localImgSrcs.length > 1 ? "s" : ""} still pointing to local path${localImgSrcs.length > 1 ? "s" : ""}: ${localImgSrcs.slice(0, 2).join(", ")}${localImgSrcs.length > 2 ? "…" : ""}`,
      suggestion: "Re-import with a ZIP containing these image files to auto-upload and wire them. Or upload manually via Media Library and replace src with {{cms.media.SLOTNAME}}.",
    });
  }

  const cdnLinks = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](https?:\/\/[^"']+)["']/gi)]
    .map(m => m[1]);
  if (cdnLinks.length > 0) {
    items.push({
      type: "CDN",
      detail: `${cdnLinks.length} external CDN stylesheet${cdnLinks.length > 1 ? "s" : ""} referenced`,
      suggestion: "CDN links (Bootstrap, FontAwesome, etc.) work fine as-is. Optionally copy the URL into the CSS Files tab in the Standalone Editor for centralized management.",
    });
  }

  return { needsAttention: items };
}
