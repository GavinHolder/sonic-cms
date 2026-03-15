"use client";

/**
 * /admin/section-preview
 *
 * Standalone page used as an iframe src for the Preview tab viewport simulation
 * in FlexibleSectionEditorModal. Receives the section JSON via postMessage, then
 * renders it using FlexibleSectionRenderer at the iframe's actual viewport width,
 * so CSS @media queries fire correctly for mobile/tablet simulation.
 *
 * Message protocol (from parent → iframe):
 *   { type: "PREVIEW_SECTION", section: <SectionData JSON object> }
 *
 * The page renders the section inside a minimal shell (no navbar/footer).
 */

import { useEffect, useState, useRef } from "react";
import FlexibleSectionRenderer from "@/components/sections/FlexibleSectionRenderer";

export default function SectionPreviewPage() {
  const [sectionData, setSectionData] = useState<any>(null);
  const ready = useRef(false);

  useEffect(() => {
    // Signal parent that the iframe is ready to receive section data
    const notify = () => {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    };

    const handler = (e: MessageEvent) => {
      if (e.data?.type === "PREVIEW_SECTION" && e.data.section) {
        setSectionData(e.data.section);
      }
    };

    window.addEventListener("message", handler);
    // Notify on mount (parent may have already sent data before iframe loaded)
    if (!ready.current) {
      ready.current = true;
      notify();
    }

    return () => window.removeEventListener("message", handler);
  }, []);

  if (!sectionData) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
        Loading preview…
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, overflow: "hidden" }}>
      <FlexibleSectionRenderer section={sectionData} />
    </div>
  );
}
