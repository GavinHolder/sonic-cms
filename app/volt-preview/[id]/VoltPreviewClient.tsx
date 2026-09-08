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
      {/* Always a definite 100%/100% box (not just for fullBleed) — VoltBlock's "contain"
          fitMode chain (VoltRenderer's useMeasuredContain ResizeObserver, see that file's
          hasExplicitHeight/useMeasuredContain comment) needs a REAL parent height to
          inherit down through VoltBlock's own height:"100%" container. Leaving width/height
          `undefined` here for the (default, non-fullBleed) "contain" case made this wrapper
          — and therefore VoltBlock/VoltRenderer beneath it — collapse to 0×0: this flex
          parent uses alignItems:"center" (not "stretch"), so an auto-sized flex item never
          picks up the flex container's 100vh height on its own. A 0×0 Volt renders nothing
          (including its glass overlay, which is sized off the same chain), so the iframe
          showed blank/transparent — through which the Designer canvas's own background
          shows, looking like the volt was replaced by whatever sits behind it. */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
        <VoltBlock voltId={voltId} slots={slots} instanceOverrides={instanceOverrides} fitMode={fit} productId={productId} />
      </div>
    </div>
  );
}
