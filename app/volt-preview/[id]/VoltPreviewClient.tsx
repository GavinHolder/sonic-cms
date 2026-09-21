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
}

export default function VoltPreviewClient({ voltId, slots, instanceOverrides, fit = "contain" }: Props) {
  const fullBleed = fit === "cover" || fit === "fill";
  return (
    <div style={{
      width: "100%",
      height: "100vh",
      // Full-bleed backgrounds fill the iframe; contain keeps the centred, aspect-locked preview.
      display: fullBleed ? "block" : "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      overflow: "hidden",
    }}>
      <VoltBlock voltId={voltId} slots={slots} instanceOverrides={instanceOverrides} fitMode={fit} />
    </div>
  );
}
