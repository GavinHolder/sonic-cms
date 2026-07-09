"use client";

import { useEffect, useRef, useCallback } from "react";
import { saveDesignerData } from "@/lib/page-manager";

interface DesignerPageEditorModalProps {
  slug: string;
  title: string;
  /** Current designer JSON string (or null for a blank canvas) */
  designerData: string | null;
  onSave: (data: string) => void;
  onClose: () => void;
}

/**
 * Full-screen designer editor for Designer page type.
 *
 * Opens the flexible-designer.html iframe in an overlay that covers
 * the entire viewport. Unlike the section editor, this always uses
 * contentMode="multi" so the canvas is unbounded (no 100vh snap).
 *
 * PostMessage protocol (same as FlexibleSectionEditorModal):
 *   iframe → parent: FLEXIBLE_DESIGNER_READY
 *   parent → iframe: FLEXIBLE_DESIGNER_INIT  { payload: JSON }
 *   iframe → parent: FLEXIBLE_DESIGNER_SAVE  { payload: JSON }  — save without close
 *   iframe → parent: FLEXIBLE_DESIGNER_DONE  { payload: JSON }  — save and close
 */
export default function DesignerPageEditorModal({
  slug,
  title,
  designerData,
  onSave,
  onClose,
}: DesignerPageEditorModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (!e.data?.type) return;

      if (e.data.type === "FLEXIBLE_DESIGNER_READY") {
        // Send the current page data (or a blank multi-mode canvas)
        const basePayload = designerData || JSON.stringify({
          contentMode: "multi",
          layoutType: "preset",
          grid: { rows: 2, cols: 3, gap: 16 },
          preset: "2-col-split",
          blocks: [],
        });
        // #68 — forward the page's configured section background so the designer canvas
        // can preview it (view-only in the designer). Mirrors FlexibleSectionEditorModal:
        // parse the payload, attach a normalized `sectionBackground` in the exact shape
        // flexible-designer.html's readSectionBgFromPayload expects, then re-stringify. A
        // designer page has no separate section object, so the bg fields are read off the
        // persisted designer payload itself. No bg present → payload sent unchanged.
        let initPayload = basePayload;
        try {
          const obj = JSON.parse(basePayload);
          if (obj && !obj.sectionBackground &&
              (obj.background != null || obj.bgImageUrl || obj.gradient)) {
            obj.sectionBackground = {
              background: obj.background,
              bgImageUrl: obj.bgImageUrl || "",
              bgImageSize: obj.bgImageSize,
              bgImagePosition: obj.bgImagePosition,
              bgImageRepeat: obj.bgImageRepeat,
              bgImageOpacity: obj.bgImageOpacity,
              gradient: obj.gradient,
            };
            initPayload = JSON.stringify(obj);
          }
        } catch { /* non-JSON payload — send as-is */ }
        iframeRef.current?.contentWindow?.postMessage(
          { type: "FLEXIBLE_DESIGNER_INIT", payload: initPayload },
          "*"
        );
      }

      if (e.data.type === "FLEXIBLE_DESIGNER_SAVE") {
        // Auto-persist without closing the editor
        saveDesignerData(slug, e.data.payload);
        onSave(e.data.payload);
      }

      if (e.data.type === "FLEXIBLE_DESIGNER_DONE") {
        saveDesignerData(slug, e.data.payload);
        onSave(e.data.payload);
        onClose();
      }

      if (e.data.type === "FLEXIBLE_DESIGNER_PREVIEW") {
        // Designer wants to preview — just close the overlay
        onClose();
      }
    },
    [slug, designerData, onSave, onClose]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          backgroundColor: "#16213e",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <i className="bi bi-grid-1x2" style={{ color: "#6a82fb", fontSize: "1.1rem" }}></i>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
            Designer Page Editor
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.8rem",
              borderLeft: "1px solid rgba(255,255,255,0.2)",
              paddingLeft: "0.75rem",
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
            Changes auto-saved · Press Done in designer to close
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "6px",
              color: "#fff",
              padding: "0.3rem 0.7rem",
              cursor: "pointer",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
            title="Close editor"
          >
            <i className="bi bi-x-lg"></i>
            Close
          </button>
        </div>
      </div>

      {/* Designer iframe — fills remaining height */}
      <iframe
        ref={iframeRef}
        src="/flexible-designer.html"
        style={{
          flex: 1,
          border: "none",
          width: "100%",
          display: "block",
        }}
        title={`Designer: ${title}`}
      />
    </div>
  );
}
