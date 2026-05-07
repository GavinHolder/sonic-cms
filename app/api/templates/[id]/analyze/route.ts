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
  const mediaSlots = (data.mediaSlots as Record<string, string>) ?? {};
  const { needsAttention } = analyzeHtml(html, false, mediaSlots);
  const slotCount = Object.keys(mediaSlots).length;
  const autoHandled = slotCount > 0
    ? [{ type: "MEDIA_SLOTS", detail: `${slotCount} media slot${slotCount > 1 ? "s" : ""} already wired ({{cms.media.*}} in place)` }]
    : [];

  const [formPages, mediaAssets, coverageMaps] = await Promise.all([
    prisma.page.findMany({
      where: { type: "FORM", enabled: true },
      select: { slug: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
      select: { id: true, url: true, thumbnailUrl: true, filename: true, altText: true, mimeType: true, width: true, height: true },
    }),
    prisma.coverageMap.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { analysis: { autoHandled, needsAttention }, mediaSlots, formPages, mediaAssets, coverageMaps, htmlLength: html.length },
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

  let body: { customHtml?: string; mediaSlots?: Record<string, string> };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.customHtml !== "string" && body.mediaSlots === undefined)
    return NextResponse.json({ error: "customHtml or mediaSlots required" }, { status: 400 });

  const existingData = template.data as Record<string, unknown>;
  const updatePayload: Record<string, unknown> = { ...existingData };
  if (typeof body.customHtml === "string") updatePayload.customHtml = body.customHtml;
  if (body.mediaSlots !== undefined) updatePayload.mediaSlots = body.mediaSlots;

  await prisma.cmsTemplate.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { data: updatePayload as any },
  });

  return NextResponse.json({ success: true });
}
