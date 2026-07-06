"use client";

/**
 * /admin/section-preview
 *
 * Standalone page used as an iframe src by the reusable admin live-preview pane
 * (components/admin/SectionLivePreview.tsx). Receives the in-progress section JSON
 * via postMessage, then renders it using the REAL public renderer (DynamicSection)
 * at the iframe's actual viewport width — so CSS @media queries fire correctly for
 * mobile/tablet simulation, and every section type (Normal, CTA, Flexible, etc.)
 * renders exactly as it will on the live site.
 *
 * Message protocol (parent → iframe):
 *   { type: "PREVIEW_SECTION", section: <SectionData JSON object> }
 *
 * Rendered inside a minimal shell (no navbar/footer). An error boundary keeps a
 * half-edited/malformed section from white-screening the iframe.
 */

import React, { useEffect, useState, useRef } from "react";
import DynamicSection from "@/components/sections/DynamicSection";

// Contains render errors from a half-edited section within the iframe document.
class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey: string },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; resetKey: string }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    // Recover automatically once the section changes (next edit).
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: "#b45309", fontFamily: "sans-serif" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          This section can&apos;t be rendered as currently configured.
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
            Keep editing — the preview recovers on your next change.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // Force-enable so disabled sections still preview; never mutate the source object.
  const previewSection = { ...sectionData, enabled: true };
  const resetKey = (() => {
    try {
      return JSON.stringify(sectionData);
    } catch {
      return String(Date.now());
    }
  })();

  return (
    // #snap-container is required so all mobile/responsive CSS rules in globals.css apply
    // (those rules are scoped to #snap-container section.cms-section / .flexible-section)
    <div id="snap-container" style={{ margin: 0, padding: 0 }}>
      <PreviewErrorBoundary resetKey={resetKey}>
        <DynamicSection section={previewSection} />
      </PreviewErrorBoundary>
    </div>
  );
}
