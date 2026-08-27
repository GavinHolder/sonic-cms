import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Public, no-auth read of ONE template's renderable content — deliberately a
 * minimal, separate surface from GET /api/templates (admin-only, EDITOR role,
 * returns full CmsTemplate rows for the Templates admin/library UI). A "block"
 * template's HTML/CSS is public page content the instant it's linked into a
 * live section (same trust model FlexibleSectionRenderer's own template case
 * already documents for that content) — the CRUD operations on the template
 * library need gating, this single-template content read does not.
 *
 * Used by FlexibleSectionRenderer's "template" case to resolve a linked
 * templateId's CURRENT content at render time, instead of trusting whatever
 * customHtml/customCss happen to be cached on the section block (see
 * docs/main-cms-sync-prompt.md #145 for why that copy-at-selection-time
 * design silently went stale).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await prisma.cmsTemplate.findUnique({
    where: { id },
    select: { data: true },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = (template.data ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    customHtml: typeof data.customHtml === "string" ? data.customHtml : "",
    customCss: typeof data.customCss === "string" ? data.customCss : "",
    mediaSlots: data.mediaSlots && typeof data.mediaSlots === "object" ? data.mediaSlots : {},
  });
}
