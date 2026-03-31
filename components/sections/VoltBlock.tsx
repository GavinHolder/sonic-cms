"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { VoltElementData, VoltSlots, VoltInstanceOverrides } from "@/types/volt";

const VoltRenderer = dynamic(() => import("@/components/volt/VoltRenderer"), { ssr: false });
const Volt3DRenderer = dynamic(() => import("./Volt3DRenderer"), { ssr: false });

interface VoltBlockProps {
  voltId: string;
  slots?: VoltSlots;
  /** Per-instance layer overrides — applied without modifying the master Volt design */
  instanceOverrides?: VoltInstanceOverrides;
  /** Fit behaviour inside the block cell. "contain" (default) or "fill" */
  fitMode?: "contain" | "fill";
}

export default function VoltBlock({ voltId, slots = {}, instanceOverrides, fitMode = "contain" }: VoltBlockProps) {
  const [volt, setVolt] = useState<VoltElementData | null>(null);
  const [error, setError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!voltId) return;
    fetch(`/api/public/volt/${voltId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setVolt(data.volt as VoltElementData))
      .catch(() => setError(true));
  }, [voltId]);

  if (error) {
    return (
      <div style={{ padding: "20px", color: "#6c757d", fontSize: "12px", textAlign: "center" }}>
        Volt element unavailable
      </div>
    );
  }

  if (!volt) {
    return (
      <div style={{ width: "100%", aspectRatio: "4/3", background: "rgba(0,0,0,0.06)", borderRadius: "8px" }}
        aria-hidden="true"
      />
    );
  }

  const allowOverflow = volt.canvasOverflow === 'visible'

  const containerStyle: React.CSSProperties =
    fitMode === "fill"
      ? { width: "100%", height: "100%", position: "relative", overflow: allowOverflow ? 'visible' : undefined }
      : { width: "100%", maxWidth: "100%", position: "relative", overflow: allowOverflow ? 'visible' : undefined };

  const layers3D = volt.layers.filter(
    l => l.type === "3d-object" && l.visible !== false && l.object3DData?.assetUrl
  );

  return (
    <div ref={containerRef} style={containerStyle}>
      <VoltRenderer voltElement={volt} slots={slots} instanceOverrides={instanceOverrides} style={{ borderRadius: "inherit" }} onHoverChange={setIsHovered} />
      {layers3D.map(l => (
        <Volt3DRenderer
          key={l.id}
          data={l.object3DData!}
          x={l.x}
          y={l.y}
          width={l.width}
          height={l.height}
          sectionRef={containerRef}
          isHovered={isHovered}
        />
      ))}
    </div>
  );
}
