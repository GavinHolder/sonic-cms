"use client";

/**
 * SectionLivePreview
 *
 * Reusable admin live-preview pane. Renders the in-progress section object using
 * the REAL public renderer (DynamicSection, via the /admin/section-preview iframe
 * route) inside a scaled, viewport-simulating device frame.
 *
 * WHY AN IFRAME (not inline DynamicSection):
 *  - True CSS @media queries fire at the simulated viewport width (mobile/tablet).
 *  - Full style isolation from the admin modal (cms-section is 100vh + scroll-snap).
 *  - Ultimate error containment: a half-edited section that throws at render time
 *    crashes only the isolated iframe document, never the editor modal. A parent-side
 *    React error boundary is layered on top as belt-and-suspenders.
 *
 * INSTANT UPDATES:
 *  The `section` prop is the LIVE in-progress editing state (rebuilt on every
 *  keystroke / control change by the parent editor). This component serialises the
 *  section and re-posts it to the iframe whenever the serialised value changes — so
 *  changing a heading's weight, font size, colour, text, spacing, etc. re-renders the
 *  preview immediately, with no Save/Apply step.
 *
 * Message protocol (parent → iframe): { type: "PREVIEW_SECTION", section }
 *                    (iframe → parent): { type: "PREVIEW_READY" }
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

const PREVIEW_VIEWPORTS = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
} as const;

type Viewport = keyof typeof PREVIEW_VIEWPORTS;

// ─── Parent-side error boundary ────────────────────────────────────────────────
// The iframe already isolates render crashes; this guards the surrounding markup
// (device frame, scaling math) so the preview pane degrades gracefully instead of
// taking down the whole editor modal.
class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch() {
    /* swallow — message is shown via render() */
  }
  render() {
    if (this.state.error) {
      return (
        <div className="alert alert-warning small mb-0" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />
          Preview couldn&apos;t render this section right now. Your edits are safe —
          keep editing and it will recover.
        </div>
      );
    }
    return this.props.children;
  }
}

interface SectionLivePreviewProps {
  /** Live, in-progress section object (rebuilt by the parent on every change). */
  section: unknown;
  /** Controlled viewport. Omit to let the component manage its own toggle. */
  viewport?: Viewport;
  onViewportChange?: (v: Viewport) => void;
  /** Width budget the scaled device is fit into (px). Defaults to 640. */
  panelWidth?: number;
  /**
   * #72 — when true, overlays a static navbar stand-in pinned to the TOP of the
   * preview viewport (inside the browser-chrome frame), so the section is shown as it
   * appears on the real page beneath the site's fixed navbar. Default false → nothing
   * is rendered and the preview is byte-for-byte unchanged.
   */
  showNavbar?: boolean;
}

/**
 * PreviewNavbarStandIn (#72)
 * Static, side-effect-free stand-in for the live site's fixed navbar. Rendered as an
 * absolute overlay pinned to the TOP of the preview viewport (spanning the full scaled
 * viewport width) so the previewed section is shown exactly as on the real page — a
 * fixed navbar sitting over the hero. Mirrors the scrolled navbar's dark-glass look
 * (see .navbar-scrolled in globals.css). pointer-events:none so it never interferes
 * with scrolling or interacting with the section beneath it.
 */
function PreviewNavbarStandIn() {
  return (
    <div
      aria-hidden="true"
      className="navbar-scrolled"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        color: "#fff",
        fontSize: 12,
        letterSpacing: "0.08em",
        pointerEvents: "none",
      }}
      title="Static navbar reference — shows where the fixed site navbar sits above this section"
    >
      <span style={{ position: "absolute", left: 16, opacity: 0.55, fontSize: 18 }}>
        <i className="bi bi-list" />
      </span>
      <span style={{ fontWeight: 700, textTransform: "uppercase" }}>Your Logo</span>
      <span style={{ position: "absolute", right: 16, opacity: 0.55 }}>
        <i className="bi bi-three-dots" />
      </span>
    </div>
  );
}

function SectionLivePreviewInner({
  section,
  viewport: controlledViewport,
  onViewportChange,
  panelWidth = 640,
  showNavbar = false,
}: SectionLivePreviewProps) {
  const [uncontrolledViewport, setUncontrolledViewport] = useState<Viewport>("desktop");
  const viewport = controlledViewport ?? uncontrolledViewport;
  const setViewport = onViewportChange ?? setUncontrolledViewport;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const lastSent = useRef<string>("");

  // Keep the latest section in a ref so the mount-only READY handler always posts
  // current data (avoids a stale closure on first send).
  const sectionRef = useRef<unknown>(section);
  sectionRef.current = section;

  const sendSection = () => {
    const s = sectionRef.current;
    try {
      lastSent.current = JSON.stringify(s);
    } catch {
      lastSent.current = "";
    }
    iframeRef.current?.contentWindow?.postMessage(
      { type: "PREVIEW_SECTION", section: s },
      "*"
    );
  };

  // Handshake: iframe announces readiness, we push the current section.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "PREVIEW_READY") {
        iframeReady.current = true;
        sendSection();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Serialise once per render; re-post only when the content actually changes.
  const sectionJson = useMemo(() => {
    try {
      return JSON.stringify(section);
    } catch {
      return "";
    }
  }, [section]);

  useEffect(() => {
    if (iframeReady.current && sectionJson && sectionJson !== lastSent.current) {
      sendSection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionJson]);

  // ─── Scaling / device-frame math ─────────────────────────────────────────────
  const vw = PREVIEW_VIEWPORTS[viewport];
  const scale = Math.min(1, panelWidth / vw);
  // Mobile stacks vertically and can far exceed one viewport height — give it room.
  const viewportH = viewport === "mobile" ? 1500 : 812;
  const scaledW = Math.round(scale * vw);
  const scaledH = Math.round(scale * viewportH);
  const maxVisibleH = scale >= 1 ? Math.min(scaledH, 700) : scaledH;
  const deviceRadius = viewport === "desktop" ? 4 : viewport === "tablet" ? 12 : 20;
  const chromeH = viewport === "desktop" ? 26 : 18;

  return (
    <div>
      {/* Viewport toggle */}
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <span className="text-muted small me-1">Preview as:</span>
        {(Object.keys(PREVIEW_VIEWPORTS) as Viewport[]).map((vp) => (
          <button
            key={vp}
            type="button"
            className={`btn btn-sm ${viewport === vp ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setViewport(vp)}
          >
            <i
              className={`bi me-1 ${
                vp === "desktop" ? "bi-laptop" : vp === "tablet" ? "bi-tablet" : "bi-phone"
              }`}
            />
            {vp.charAt(0).toUpperCase() + vp.slice(1)}
            <span className="ms-1" style={{ fontSize: 11, opacity: 0.7 }}>
              {PREVIEW_VIEWPORTS[vp]}px
            </span>
          </button>
        ))}
        <span className="badge bg-success bg-opacity-10 text-success ms-auto">
          <i className="bi bi-broadcast me-1" />
          Live
        </span>
      </div>

      {/* Preview stage — neutral background, device centered */}
      <div
        style={{
          background: "#dee2e6",
          borderRadius: 12,
          padding: "16px 16px 14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Device frame */}
        <div
          style={{
            width: scaledW,
            borderRadius: deviceRadius + 2,
            boxShadow: "0 6px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08)",
            border: "2px solid #adb5bd",
            overflow: "hidden",
            background: "#fff",
            flexShrink: 0,
          }}
        >
          {/* Device chrome */}
          {viewport === "desktop" ? (
            <div
              style={{
                background: "#f1f3f5",
                borderBottom: "1px solid #ced4da",
                height: chromeH,
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                gap: 5,
                flexShrink: 0,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57", flexShrink: 0 }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e", flexShrink: 0 }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840", flexShrink: 0 }} />
              <div style={{ flex: 1, margin: "0 6px", height: 13, background: "#dee2e6", borderRadius: 3 }} />
            </div>
          ) : (
            <div
              style={{
                background: "#f1f3f5",
                borderBottom: "1px solid #ced4da",
                height: chromeH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: viewport === "mobile" ? 56 : 72,
                  height: 4,
                  borderRadius: 2,
                  background: "#adb5bd",
                }}
              />
            </div>
          )}

          {/* Scaled iframe content */}
          <div
            style={{
              width: scaledW,
              height: maxVisibleH,
              overflow: scale >= 1 ? "auto" : "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: vw,
                height: viewportH,
                transformOrigin: "top left",
                transform: `scale(${scale})`,
              }}
            >
              <iframe
                key={viewport} /* remount on viewport change so @media re-evaluates */
                ref={iframeRef}
                src="/admin/section-preview"
                style={{ width: vw, height: viewportH, border: "none", display: "block" }}
                title={`Section preview at ${vw}px`}
                onLoad={() => {
                  if (iframeReady.current) sendSection();
                }}
              />
            </div>
            {/* #72 — navbar overlay, pinned to the top of the scaled viewport, over the section */}
            {showNavbar && <PreviewNavbarStandIn />}
          </div>
        </div>

        {/* Dimension ruler */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", width: scaledW, gap: 6 }}>
          <div style={{ flex: 1, height: 1, background: "#adb5bd" }} />
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              color: "#495057",
            }}
          >
            {vw}px viewport (true @media)
          </span>
          <div style={{ flex: 1, height: 1, background: "#adb5bd" }} />
        </div>
      </div>
    </div>
  );
}

export default function SectionLivePreview(props: SectionLivePreviewProps) {
  return (
    <PreviewErrorBoundary>
      <SectionLivePreviewInner {...props} />
    </PreviewErrorBoundary>
  );
}
