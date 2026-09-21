import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** The only template type the live renderer ever links to (Designer "template" block). */
export const PUBLIC_TEMPLATE_TYPE = "block";

/**
 * Public, no-auth read of ONE "block" template's renderable content — deliberately a
 * minimal, separate surface from GET /api/templates (admin-only, EDITOR role,
 * returns full CmsTemplate rows for the Templates admin/library UI). A "block"
 * template's HTML/CSS is public page content the instant it's linked into a
 * live section (same trust model FlexibleSectionRenderer's own template case
 * already documents for that content) — the CRUD operations on the template
 * library need gating, this single-template content read does not.
 *
 * SECURITY: restricted to templateType "block". Standalone / section / page
 * templates are drafts or authoring material that may never have been published
 * (a standalone template can hold unpublished HTML, contact details, embed
 * snippets), so an id of any other type answers 404 — indistinguishable from a
 * missing id. Ids are uuids, but a uuid is not a secret.
 *
 * Used by FlexibleSectionRenderer's "template" case to resolve a linked
 * templateId's CURRENT content at render time, instead of trusting whatever
 * customHtml/customCss happen to be cached on the section block (that
 * copy-at-selection-time design silently went stale when the library template
 * was edited afterwards).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = await prisma.cmsTemplate.findFirst({
    where: { id, templateType: PUBLIC_TEMPLATE_TYPE },
    select: { data: true },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = (template.data ?? {}) as Record<string, unknown>;
  return NextResponse.json(
    {
      customHtml: typeof data.customHtml === "string" ? data.customHtml : "",
      customCss: typeof data.customCss === "string" ? data.customCss : "",
      mediaSlots: data.mediaSlots && typeof data.mediaSlots === "object" ? data.mediaSlots : {},
    },
    // Short shared cache: a live page can fan out one fetch per template block per
    // visitor; an admin edit still shows up within a minute.
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } }
  );
}
