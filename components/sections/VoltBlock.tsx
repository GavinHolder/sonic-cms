"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { VoltElementData, VoltSlots, VoltInstanceOverrides } from "@/types/volt";
import { packageSlotValues, type PackageLike } from "@/lib/packages/format";

const VoltRenderer = dynamic(() => import("@/components/volt/VoltRenderer"), { ssr: false });
const Volt3DRenderer = dynamic(() => import("./Volt3DRenderer"), { ssr: false });

// Hoisted so this style object keeps a stable reference across renders instead
// of being a fresh literal every time — one less spurious prop change reaching
// VoltRenderer (see VoltRenderer.tsx `layers` memoization for the related fix).
const INHERIT_RADIUS_STYLE: React.CSSProperties = { borderRadius: "inherit" };

interface VoltBlockProps {
  voltId: string;
  slots?: VoltSlots;
  /** Per-instance layer overrides — applied without modifying the master Volt design */
  instanceOverrides?: VoltInstanceOverrides;
  /** Fit behaviour inside the block cell. "contain" (default), "fill", or "cover" (full-bleed background) */
  fitMode?: "contain" | "fill" | "cover";
  /**
   * Optional coverage-plugin Package id. When set, the package's live values
   * (name, price, speed, options…) are fetched and merged into the slots, so a
   * slot whose contentFieldHint is `pkg.name`/`price`/`speed`… auto-populates
   * from the product. Manual slot text is preserved when no product is linked
   * or a field isn't bound.
   */
  productId?: string;
}

export default function VoltBlock({ voltId, slots = {}, instanceOverrides, fitMode = "contain", productId }: VoltBlockProps) {
  const [volt, setVolt] = useState<VoltElementData | null>(null);
  const [error, setError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [productSlots, setProductSlots] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Data-bound product: fetch the linked package and derive its slot values.
  // Graceful degradation — any failure/empty result leaves productSlots empty,
  // so the card falls back to whatever manual slot text was authored.
  useEffect(() => {
    if (!productId) { setProductSlots({}); return; }
    let active = true;
    fetch(`/api/packages?ids=${encodeURIComponent(productId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!active) return;
        const pkg = data && Array.isArray(data.packages) ? (data.packages[0] as PackageLike | undefined) : undefined;
        setProductSlots(pkg ? packageSlotValues(pkg) : {});
      })
      .catch(() => { if (active) setProductSlots({}); });
    return () => { active = false; };
  }, [productId]);

  useEffect(() => {
    if (!voltId) return;
    // Fetch once per voltId. The public route now returns 200 with `volt: null`
    // for missing/not-public references (instead of 404), so a stale reference
    // resolves cleanly to a placeholder with no repeated failed requests and no
    // browser console 404 spam. A genuine network failure still falls to .catch().
    let active = true;
    fetch(`/api/public/volt/${voltId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!active) return;
        if (data && data.volt) setVolt(data.volt as VoltElementData);
        else setError(true); // missing / not public → clean "unavailable" placeholder
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
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
    fitMode === "cover"
      // Full-bleed background: fill the cell in BOTH axes and crop overflow.
      ? { width: "100%", height: "100%", position: "relative", overflow: allowOverflow ? 'visible' : 'hidden' }
      : fitMode === "fill"
      ? { width: "100%", height: "100%", position: "relative", overflow: allowOverflow ? 'visible' : undefined }
      // "contain": height:"100%" propagates the parent-given cell height down to
      // VoltRenderer's measured-contain fit (see VoltRenderer.tsx useMeasuredContain) —
      // without it the renderer never learns the cell's real height and falls back to
      // its pre-measurement aspect-locked box.
      : { width: "100%", height: "100%", maxWidth: "100%", position: "relative", overflow: allowOverflow ? 'visible' : undefined };

  const layers3D = volt.layers.filter(
    l => l.type === "3d-object" && l.visible !== false && l.object3DData?.assetUrl
  );

  // Merge live product values over the authored slots. Keys are disjoint from the
  // base slots, so this is additive — manual title/body/etc. stay intact.
  const mergedSlots: VoltSlots = Object.keys(productSlots).length ? { ...slots, ...productSlots } : slots;

  return (
    <div ref={containerRef} style={containerStyle}>
      <VoltRenderer voltElement={volt} slots={mergedSlots} instanceOverrides={instanceOverrides} style={INHERIT_RADIUS_STYLE} onHoverChange={setIsHovered} fitMode={fitMode} />
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
