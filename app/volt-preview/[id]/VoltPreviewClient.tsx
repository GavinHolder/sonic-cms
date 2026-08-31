"use client";

import dynamic from "next/dynamic";
import type { VoltSlots, VoltInstanceOverrides } from "@/types/volt";

const VoltBlock = dynamic(() => import("@/components/sections/VoltBlock"), { ssr: false });

interface Props {
  voltId: string;
  slots: VoltSlots;
  instanceOverrides?: VoltInstanceOverrides;
  /** Fit mode from the ?fit= param. "contain" (default) centres + aspect-locks; "cover"/"fill" are full-bleed backgrounds. */
  fit?: "contain" | "fill" | "cover";
  /** Optional linked product id — forwarded to VoltBlock to auto-populate pkg.* slots. */
  productId?: string;
  /** Real section background (resolved hex color or CSS gradient string) — see this
   * component's own comment on why this exists: a "glass" Volt fill needs real
   * same-document content behind it for backdrop-filter to actually blur. Falls back
   * to transparent (the old, pre-fix behavior) when the Designer has no section
   * background configured, so a Volt with no glass fill still looks unchanged. */
  bg?: string;
  bgGradient?: string;
  bgImage?: string;
  bgImageSize?: string;
  bgImagePosition?: string;
}

export default function VoltPreviewClient({
  voltId, slots, instanceOverrides, fit = "contain", productId,
  bg, bgGradient, bgImage, bgImageSize = "cover", bgImagePosition = "center",
}: Props) {
  const fullBleed = fit === "cover" || fit === "fill";
  return (
    <div style={{
      width: "100%",
      height: "100vh",
      // Full-bleed backgrounds fill the iframe; contain keeps the centred, aspect-locked preview.
      display: fullBleed ? "block" : "flex",
      alignItems: "center",
      justifyContent: "center",
      background: bg || "transparent",
      overflow: "hidden",
      position: "relative",
    }}>
      {bgImage && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: bgImageSize,
          backgroundPosition: bgImagePosition,
          backgroundRepeat: "no-repeat",
        }} />
      )}
      {bgGradient && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, background: bgGradient }} />
      )}
      <div style={{ position: "relative", zIndex: 2, width: fullBleed ? "100%" : undefined, height: fullBleed ? "100%" : undefined }}>
        <VoltBlock voltId={voltId} slots={slots} instanceOverrides={instanceOverrides} fitMode={fit} productId={productId} />
      </div>
    </div>
  );
}
