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
  // `bg=0` (2026-09-21, Flexible Designer canvas) = background forwarding OFF:
  // every bg* param is ignored and the document stays fully transparent so the
  // parent canvas's own background shows through around the Volt's shape.
  const bgOff = sp.bg === "0";
  const bg = !bgOff && sp.bg ? sp.bg : undefined;
  const bgGradient = !bgOff && sp.bgGradient ? sp.bgGradient : undefined;
  const bgImage = !bgOff && sp.bgImage ? sp.bgImage : undefined;
  const bgImageSize = sp.bgImageSize || "cover";
  const bgImagePosition = sp.bgImagePosition || "center";

  // Background "window", as PERCENTAGES of this block's own on-canvas size — see
  // buildVoltPreviewUrl() in flexible-designer.html for why percentages (not the
  // Designer-canvas pixels this used to carry): VoltRenderer positions the window
  // inside its own `useMeasuredContain` scale transform, whose box is sized in
  // rendered CSS px, not Designer-canvas px — percentages of the block's own size
  // divide that unit mismatch out entirely. Optional: only sent when the Designer
  // could measure its canvas; parsed defensively since URL query values are
  // attacker-controllable strings.
  const parseWindowPct = (v: string | undefined) => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const parseWindowOffsetPct = (v: string | undefined) => {
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const bgWindowWPct = !bgOff ? parseWindowPct(sp.bgWindowWPct) : undefined;
  const bgWindowHPct = !bgOff ? parseWindowPct(sp.bgWindowHPct) : undefined;
  const bgWindowXPct = !bgOff ? parseWindowOffsetPct(sp.bgWindowXPct) : undefined;
  const bgWindowYPct = !bgOff ? parseWindowOffsetPct(sp.bgWindowYPct) : undefined;

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
      bgWindowWPct={bgWindowWPct}
      bgWindowHPct={bgWindowHPct}
      bgWindowXPct={bgWindowXPct}
      bgWindowYPct={bgWindowYPct}
    />
  );
}
