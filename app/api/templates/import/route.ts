import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { requireRole } from "@/lib/api-middleware";
import {
  IMAGE_EXTS, SVG_EXT, VIDEO_EXTS,
  toSlotName, dedupeSlotName,
  uploadImageBuffer, uploadSvgBuffer,
  replaceLocalRef, analyzeHtml,
  ImportAnalysisItem,
} from "@/lib/template-import-utils";

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
      data: { html, css: "", mediaSlots: {}, analysis: { autoHandled: [], needsAttention } },
    });
  }

  // ── ZIP file ───────────────────────────────────────────────────────────────
  if (filename.endsWith(".zip")) {
    return processZip(req, await file.arrayBuffer());
  }

  return NextResponse.json({ error: "Only .html and .zip files are supported" }, { status: 400 });
}

export async function processZip(
  _req: NextRequest | null,
  arrayBuffer: ArrayBuffer
): Promise<NextResponse> {
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
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${scriptBlock}\n</body>`);
    } else {
      html += "\n" + scriptBlock;
    }
  }

  // ── Upload images ──────────────────────────────────────────────────────────
  const mediaSlots: Record<string, string> = {};
  const uploadedImages: string[] = [];
  const uploadErrors: string[] = [];
  const seenSlots = new Map<string, number>();
  let css = cssParts.join("\n\n");

  for (const e of imageEntries) {
    try {
      const baseSlot = toSlotName(e.entryName);
      const slotName = dedupeSlotName(baseSlot, seenSlots);
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
      const baseSlot = toSlotName(e.entryName);
      const slotName = dedupeSlotName(baseSlot, seenSlots);
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

  // ── Build analysis ─────────────────────────────────────────────────────────
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

  if (videoEntries.length > 0) {
    const vnames = videoEntries.map(e => e.entryName.split("/").pop()).join(", ");
    needsAttention.push({
      type: "VIDEO_FILES",
      detail: `${videoEntries.length} video file${videoEntries.length > 1 ? "s" : ""} in ZIP not auto-uploaded: ${vnames}`,
      suggestion: "Upload each video separately via Media Library (up to 200 MB), then add a named media slot and replace the src attribute.",
    });
  }

  return NextResponse.json({
    success: true,
    data: { html, css, mediaSlots, analysis: { autoHandled, needsAttention } },
  });
}
