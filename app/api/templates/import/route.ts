import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { requireRole } from "@/lib/api-middleware";

const UPLOAD_DIR = join(process.cwd(), "public", "images", "uploads");

const IMAGE_EXTS  = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);
const SVG_EXT     = ".svg";
const VIDEO_EXTS  = new Set([".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"]);

export interface ImportAnalysisItem {
  type: string;
  detail: string;
  suggestion?: string;
}

export interface ImportAnalysis {
  autoHandled: ImportAnalysisItem[];
  needsAttention: ImportAnalysisItem[];
}

// Convert a file path to a clean slot name: "images/hero-bg.jpg" → "hero-bg"
function toSlotName(entryName: string): string {
  const base = entryName.split("/").pop() ?? entryName;
  const withoutExt = base.includes(".") ? base.split(".").slice(0, -1).join(".") : base;
  return withoutExt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "media";
}

// Ensure slot names are unique across uploads
function dedupeSlotName(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

async function uploadImageBuffer(buffer: Buffer, entryName: string): Promise<string> {
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

async function uploadSvgBuffer(buffer: Buffer, entryName: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const rawFilename = (entryName.split("/").pop() ?? "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
  const base = rawFilename.split(".").slice(0, -1).join(".") || "upload";
  const timestamp = Date.now();
  const outName = `${base}-${timestamp}.svg`;
  await writeFile(join(UPLOAD_DIR, outName), buffer);
  return `/images/uploads/${outName}`;
}

// Replace all occurrences of a local asset filename with a CMS variable in HTML/CSS
function replaceLocalRef(content: string, filename: string, replacement: string): string {
  const esc = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // src/href/srcset/data-src attributes
  const attrRe = new RegExp(
    `((?:src|href|srcset|data-src|data-background|poster)=["'])([^"']*\\/)?${esc}(["'])`,
    "gi"
  );
  // url() in inline styles or CSS
  const urlRe = new RegExp(
    `(url\\(["']?)([^"')]*\\/)?${esc}(["']?\\))`,
    "gi"
  );
  return content
    .replace(attrRe, `$1${replacement}$3`)
    .replace(urlRe, `$1${replacement}$3`);
}

// Check if a src value is local (not a CDN/absolute URL)
function isLocalPath(src: string): boolean {
  return !src.startsWith("http://") && !src.startsWith("https://") &&
         !src.startsWith("//") && !src.startsWith("data:") && !src.startsWith("/");
}

function analyzeHtml(html: string): { needsAttention: ImportAnalysisItem[] } {
  const items: ImportAnalysisItem[] = [];

  // Forms
  const formMatches = html.match(/<form\b/gi);
  if (formMatches) {
    items.push({
      type: "FORM",
      detail: `${formMatches.length} <form> element${formMatches.length > 1 ? "s" : ""} found`,
      suggestion: "Replace each <form> with {{cms.form.YOUR-FORM-SLUG}} to wire up a CMS-managed form. Create your form first in Content → Forms.",
    });
  }

  // Video elements with local src
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

  // tel: links with hardcoded numbers
  const telLinks = [...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map(m => m[1]);
  if (telLinks.length > 0) {
    items.push({
      type: "PHONE",
      detail: `Hardcoded phone number${telLinks.length > 1 ? "s" : ""} in tel: link${telLinks.length > 1 ? "s" : ""}: ${telLinks.slice(0, 2).join(", ")}`,
      suggestion: 'Replace with href="tel:{{cms.phone}}" — value comes from Site Config → Contact Info.',
    });
  }

  // mailto: links with hardcoded emails
  const mailLinks = [...html.matchAll(/href=["']mailto:([^"'?]+)/gi)].map(m => m[1]);
  if (mailLinks.length > 0) {
    items.push({
      type: "EMAIL",
      detail: `Hardcoded email${mailLinks.length > 1 ? "s" : ""} in mailto: link${mailLinks.length > 1 ? "s" : ""}: ${mailLinks.slice(0, 2).join(", ")}`,
      suggestion: 'Replace with href="mailto:{{cms.email}}" — value comes from Site Config → Contact Info.',
    });
  }

  // CTA / hero background images in inline style (background-image with local path)
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

  // External CDN stylesheets (info — these are fine as-is, just flagging)
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

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const filename = file.name.toLowerCase();

  // ── Plain HTML file ────────────────────────────────────────────────────────
  if (filename.endsWith(".html") || filename.endsWith(".htm")) {
    const html = await file.text();
    const { needsAttention } = analyzeHtml(html);
    return NextResponse.json({
      success: true,
      data: {
        html,
        css: "",
        mediaSlots: {},
        analysis: { autoHandled: [], needsAttention },
      },
    });
  }

  // ── ZIP file ───────────────────────────────────────────────────────────────
  if (filename.endsWith(".zip")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      return NextResponse.json({ error: "Invalid or corrupt ZIP file" }, { status: 400 });
    }

    const entries = zip.getEntries().filter(e => !e.isDirectory);

    // Categorise entries by extension
    const htmlEntries = entries.filter(e => {
      const n = e.entryName.toLowerCase();
      return n.endsWith(".html") || n.endsWith(".htm");
    });
    const cssEntries = entries.filter(e => e.entryName.toLowerCase().endsWith(".css"));
    const jsEntries  = entries.filter(e => {
      const n = e.entryName.toLowerCase();
      return n.endsWith(".js") && !n.endsWith(".min.js");
    });
    const imageEntries = entries.filter(e => {
      const ext = "." + (e.entryName.toLowerCase().split(".").pop() ?? "");
      return IMAGE_EXTS.has(ext);
    });
    const svgEntries = entries.filter(e => e.entryName.toLowerCase().endsWith(SVG_EXT));
    const videoEntries = entries.filter(e => {
      const ext = "." + (e.entryName.toLowerCase().split(".").pop() ?? "");
      return VIDEO_EXTS.has(ext);
    });

    // Pick index.html or first HTML
    const indexEntry = htmlEntries.find(e => {
      const base = e.entryName.split("/").pop()?.toLowerCase() ?? "";
      return base === "index.html" || base === "index.htm";
    }) ?? htmlEntries[0];

    if (!indexEntry) {
      return NextResponse.json({ error: "No HTML file found in ZIP" }, { status: 400 });
    }

    let html = indexEntry.getData().toString("utf8");

    // Merge CSS files
    const cssParts: string[] = [];
    for (const e of cssEntries) {
      cssParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
    }

    // Inject non-minified JS before </body>
    const jsParts: string[] = [];
    for (const e of jsEntries) {
      jsParts.push(`/* ${e.entryName} */\n${e.getData().toString("utf8")}`);
    }
    if (jsParts.length > 0) {
      const scriptBlock = `<script>\n${jsParts.join("\n\n")}\n</script>`;
      if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, `${scriptBlock}\n</body>`);
      } else {
        html += "\n" + scriptBlock;
      }
    }

    // ── Upload images and wire media slots ─────────────────────────────────
    const mediaSlots: Record<string, string> = {};
    const uploadedImages: string[] = [];
    const uploadErrors: string[] = [];
    const seenSlots = new Map<string, number>();
    let css = cssParts.join("\n\n");

    // Process raster images
    for (const e of imageEntries) {
      try {
        const baseSlot = toSlotName(e.entryName);
        const slotName = dedupeSlotName(baseSlot, seenSlots);
        const imgBuffer = e.getData();
        const uploadedUrl = await uploadImageBuffer(imgBuffer, e.entryName);
        mediaSlots[slotName] = uploadedUrl;

        const imgFilename = e.entryName.split("/").pop()!;
        const cmsVar = `{{cms.media.${slotName}}}`;
        html = replaceLocalRef(html, imgFilename, cmsVar);
        css  = replaceLocalRef(css, imgFilename, cmsVar);
        uploadedImages.push(`${imgFilename} → ${slotName}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        uploadErrors.push(`${e.entryName}: ${msg}`);
      }
    }

    // Process SVGs
    for (const e of svgEntries) {
      try {
        const baseSlot = toSlotName(e.entryName);
        const slotName = dedupeSlotName(baseSlot, seenSlots);
        const svgBuffer = e.getData();
        const uploadedUrl = await uploadSvgBuffer(svgBuffer, e.entryName);
        mediaSlots[slotName] = uploadedUrl;

        const svgFilename = e.entryName.split("/").pop()!;
        const cmsVar = `{{cms.media.${slotName}}}`;
        html = replaceLocalRef(html, svgFilename, cmsVar);
        css  = replaceLocalRef(css, svgFilename, cmsVar);
        uploadedImages.push(`${svgFilename} → ${slotName}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        uploadErrors.push(`${e.entryName}: ${msg}`);
      }
    }

    // ── Build analysis ─────────────────────────────────────────────────────
    const autoHandled: ImportAnalysisItem[] = [];

    if (uploadedImages.length > 0) {
      autoHandled.push({
        type: "IMAGES",
        detail: `${uploadedImages.length} image${uploadedImages.length > 1 ? "s" : ""} uploaded and wired as media slots`,
      });
    }
    if (uploadErrors.length > 0) {
      autoHandled.push({
        type: "IMAGE_ERRORS",
        detail: `${uploadErrors.length} image${uploadErrors.length > 1 ? "s" : ""} could not be uploaded: ${uploadErrors.join("; ")}`,
      });
    }
    if (jsParts.length > 0) {
      autoHandled.push({
        type: "JS",
        detail: `${jsParts.length} JS file${jsParts.length > 1 ? "s" : ""} bundled inline before </body> (minified files skipped)`,
      });
    }
    if (cssEntries.length > 0) {
      autoHandled.push({
        type: "CSS",
        detail: `${cssEntries.length} CSS file${cssEntries.length > 1 ? "s" : ""} merged into template CSS field`,
      });
    }

    const { needsAttention } = analyzeHtml(html);

    // Flag video files in ZIP that couldn't be auto-uploaded
    if (videoEntries.length > 0) {
      const vnames = videoEntries.map(e => e.entryName.split("/").pop()).join(", ");
      needsAttention.push({
        type: "VIDEO_FILES",
        detail: `${videoEntries.length} video file${videoEntries.length > 1 ? "s" : ""} in ZIP not auto-uploaded: ${vnames}`,
        suggestion: "Upload each video separately via Media Library (up to 200 MB), then add a named media slot in the page editor and replace the src attribute.",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        html,
        css,
        mediaSlots,
        analysis: { autoHandled, needsAttention },
      },
    });
  }

  return NextResponse.json(
    { error: "Only .html and .zip files are supported" },
    { status: 400 }
  );
}
