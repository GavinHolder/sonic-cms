import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";
import { analyzeHtml, processZip } from "@/lib/template-import-utils";

interface Ctx { params: Promise<{ id: string }> }

/** GET — analyse current HTML + return CMS form pages for the dropdown */
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const template = await prisma.cmsTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = template.data as Record<string, unknown>;
  const html = (data.customHtml as string) ?? "";
  const { needsAttention } = analyzeHtml(html);

  const mediaSlots = (data.mediaSlots as Record<string, string>) ?? {};
  const slotCount = Object.keys(mediaSlots).length;
  const autoHandled = slotCount > 0
    ? [{ type: "MEDIA_SLOTS", detail: `${slotCount} media slot${slotCount > 1 ? "s" : ""} already wired ({{cms.media.*}} in place)` }]
    : [];

  // Fetch FORM-type pages for the dropdown
  const formPages = await prisma.page.findMany({
    where: { type: "FORM", enabled: true },
    select: { slug: true, title: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: { analysis: { autoHandled, needsAttention }, mediaSlots, formPages, htmlLength: html.length },
  });
}

/** POST (multipart + .zip) — re-import template from ZIP, update DB in place */
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const template = await prisma.cmsTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let formData: FormData;
  try { formData = await req.formData(); } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".zip"))
    return NextResponse.json({ error: "Only .zip files are supported for re-import" }, { status: 400 });

  const importResult = await processZip(await file.arrayBuffer());
  if (!importResult.ok) return importResult;

  const importJson = await importResult.json() as {
    success: boolean;
    data: { html: string; css: string; mediaSlots: Record<string, string>; analysis: unknown };
  };
  if (!importJson.success) return NextResponse.json(importJson, { status: 400 });

  const { html, css, mediaSlots, analysis } = importJson.data;
  const existingData = template.data as Record<string, unknown>;
  await prisma.cmsTemplate.update({
    where: { id },
    data: { data: { ...existingData, customHtml: html, customCss: css, mediaSlots } },
  });

  return NextResponse.json({ success: true, data: { html, css, mediaSlots, analysis } });
}

/** PATCH — save inline HTML fixes applied in the Analyse modal */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = requireRole(req, "EDITOR");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const template = await prisma.cmsTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { customHtml?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.customHtml !== "string")
    return NextResponse.json({ error: "customHtml required" }, { status: 400 });

  const existingData = template.data as Record<string, unknown>;
  await prisma.cmsTemplate.update({
    where: { id },
    data: { data: { ...existingData, customHtml: body.customHtml } },
  });

  return NextResponse.json({ success: true });
}
