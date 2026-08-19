/**
 * Section Block Template Preview Page — renders a single Template block in isolation
 * (its actual sandboxed iframe, with real product data if bound), so the Flexible
 * Designer canvas shows the template's real appearance instead of a placeholder.
 * Mirrors app/volt-preview/[id]/page.tsx exactly, one level down: this route's own
 * output IS an iframe (TemplateBlock's), nested inside the Designer's own preview
 * iframe — nested iframes render fine, this isn't a special case.
 *
 * URL: /template-preview/[id]?productId=...&networkSlug=...&networkName=...&productTypeSlugs=a,b,c&tplOptions=<base64 JSON>
 *
 * `tplOptions` carries the Designer's "Template Options" map (block.props.templateOptions)
 * so the canvas preview reflects {{tpl.*}}/--tpl-* edits immediately — see
 * buildTemplatePreviewUrl() in public/flexible-designer.html for how it's built, and
 * TemplateBlock.tsx for how it's substituted (same component, same logic, both render sites).
 */
import { prisma } from "@/lib/prisma";
import TemplatePreviewClient from "./TemplatePreviewClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const template = await prisma.cmsTemplate.findUnique({
    where: { id },
    select: { data: true },
  });

  const data = (template?.data as Record<string, unknown> | null) ?? null;
  const html = (data?.customHtml as string | undefined) || "";
  const css = (data?.customCss as string | undefined) || "";

  const productTypeSlugs = sp.productTypeSlugs
    ? sp.productTypeSlugs.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  // Best-effort decode — a malformed/stale querystring value falls back to "no options"
  // rather than breaking the preview (the template's own inline defaults still apply).
  let templateOptions: Record<string, string> | undefined;
  if (sp.tplOptions) {
    try {
      const decoded: unknown = JSON.parse(Buffer.from(sp.tplOptions, "base64").toString("utf-8"));
      if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
        templateOptions = decoded as Record<string, string>;
      }
    } catch {
      templateOptions = undefined;
    }
  }

  return (
    <TemplatePreviewClient
      html={html}
      css={css}
      productId={sp.productId || undefined}
      networkSlug={sp.networkSlug || undefined}
      networkName={sp.networkName || undefined}
      productTypeSlugs={productTypeSlugs}
      templateOptions={templateOptions}
    />
  );
}
