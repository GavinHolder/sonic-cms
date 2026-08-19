/**
 * Section Block Template Preview Page — renders a single Template block in isolation
 * (its actual sandboxed iframe, with real product data if bound), so the Flexible
 * Designer canvas shows the template's real appearance instead of a placeholder.
 * Mirrors app/volt-preview/[id]/page.tsx exactly, one level down: this route's own
 * output IS an iframe (TemplateBlock's), nested inside the Designer's own preview
 * iframe — nested iframes render fine, this isn't a special case.
 *
 * URL: /template-preview/[id]?productId=...&networkSlug=...&networkName=...&productTypeSlugs=a,b,c
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

  return (
    <TemplatePreviewClient
      html={html}
      css={css}
      productId={sp.productId || undefined}
      networkSlug={sp.networkSlug || undefined}
      networkName={sp.networkName || undefined}
      productTypeSlugs={productTypeSlugs}
    />
  );
}
