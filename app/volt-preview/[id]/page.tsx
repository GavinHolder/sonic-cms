/**
 * Volt Preview Page — renders a single Volt element in isolation.
 * Used as an iframe source in the Flexible Designer canvas
 * so Volt blocks show their actual design, not a placeholder.
 *
 * URL: /volt-preview/[id]?title=...&body=...&icon=...&image=...&action=...&overrides=<base64JSON>&fit=cover
 *
 * The `overrides` param is a base64-encoded JSON string of VoltInstanceOverrides,
 * mapping layerId → { fill?, visible? }. Applied at render time without modifying
 * the master Volt design.
 */
import type { VoltSlots, VoltInstanceOverrides } from "@/types/volt";
import VoltPreviewClient from "./VoltPreviewClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}

export default async function VoltPreviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const slots: VoltSlots = {
    title:       sp.title       || undefined,
    body:        sp.body        || undefined,
    icon:        sp.icon        || undefined,
    imageUrl:    sp.imageUrl    || undefined,
    imageAlt:    sp.imageAlt    || undefined,
    actionLabel: sp.actionLabel || undefined,
  };

  let instanceOverrides: VoltInstanceOverrides | undefined;
  if (sp.overrides) {
    try {
      const decoded = Buffer.from(sp.overrides, 'base64').toString('utf-8');
      instanceOverrides = JSON.parse(decoded) as VoltInstanceOverrides;
    } catch {
      // Ignore malformed overrides — fall back to master design
    }
  }

  // Fit mode: "cover"/"fill" render the volt as a full-bleed background; default "contain".
  const fit = sp.fit === "cover" || sp.fit === "fill" ? sp.fit : "contain";

  // Optional linked product — VoltBlock fetches it and auto-populates pkg.* slots so
  // the designer preview reflects the live product's values.
  const productId = sp.productId || undefined;

  // Real section background (color/gradient/image), forwarded by the Designer canvas
  // (buildVoltPreviewUrl in flexible-designer.html) so a "glass"/frosted-blur Volt fill
  // (backdrop-filter in VoltRenderer.tsx) has something authentic behind it to blur —
  // backdrop-filter only sees same-document content, never across this iframe's own
  // boundary into the parent Designer canvas. Plain CSS values only (a resolved hex/
  // gradient string, a URL, size/position keywords) — never HTML, so no sanitization
  // needed beyond what React's style prop already guarantees.
  const bg = sp.bg || undefined;
  const bgGradient = sp.bgGradient || undefined;
  const bgImage = sp.bgImage || undefined;
  const bgImageSize = sp.bgImageSize || "cover";
  const bgImagePosition = sp.bgImagePosition || "center";

  return (
    <VoltPreviewClient
      voltId={id}
      slots={slots}
      instanceOverrides={instanceOverrides}
      fit={fit}
      productId={productId}
      bg={bg}
      bgGradient={bgGradient}
      bgImage={bgImage}
      bgImageSize={bgImageSize}
      bgImagePosition={bgImagePosition}
    />
  );
}
