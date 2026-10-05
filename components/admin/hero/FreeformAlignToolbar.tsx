"use client";

/**
 * Alignment + snap toolbar for the Hero editor's freeform surfaces. Acts on every selected
 * element: click an element to select just it; shift/ctrl+click to add/remove it from a
 * multi-selection. Distribute needs 3+. Presentational only - the parent owns the maths.
 * Shared by the desktop drag surface (SlideEditor's FreeformDragSurface) and the Tablet /
 * Mobile canvas (HeroRealCanvas) so the two can never grow different toolbars.
 */
interface FreeformAlignToolbarProps {
  selectedCount: number;
  snapEnabled: boolean;
  onAlignH: (which: "left" | "center" | "right") => void;
  onAlignV: (which: "top" | "middle" | "bottom") => void;
  onDistributeH: () => void;
  onDistributeV: () => void;
  onToggleSnap: () => void;
}

export default function FreeformAlignToolbar({
  selectedCount,
  snapEnabled,
  onAlignH,
  onAlignV,
  onDistributeH,
  onDistributeV,
  onToggleSnap,
}: FreeformAlignToolbarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
      <div className="btn-group btn-group-sm" role="group" aria-label="Horizontal alignment">
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount === 0} title="Align left" onClick={() => onAlignH("left")}>
          <i className="bi bi-align-start"></i>
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount === 0} title="Align centre" onClick={() => onAlignH("center")}>
          <i className="bi bi-align-center"></i>
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount === 0} title="Align right" onClick={() => onAlignH("right")}>
          <i className="bi bi-align-end"></i>
        </button>
      </div>
      <div className="btn-group btn-group-sm" role="group" aria-label="Vertical alignment">
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount === 0} title="Align top" onClick={() => onAlignV("top")}>
          <i className="bi bi-align-top"></i>
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount === 0} title="Align middle" onClick={() => onAlignV("middle")}>
          <i className="bi bi-align-middle"></i>
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount === 0} title="Align bottom" onClick={() => onAlignV("bottom")}>
          <i className="bi bi-align-bottom"></i>
        </button>
      </div>
      <div className="btn-group btn-group-sm" role="group" aria-label="Distribute spacing">
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount < 3} title="Distribute horizontally (select 3+)" onClick={onDistributeH}>
          <i className="bi bi-distribute-horizontal"></i>
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={selectedCount < 3} title="Distribute vertically (select 3+)" onClick={onDistributeV}>
          <i className="bi bi-distribute-vertical"></i>
        </button>
      </div>
      <button
        type="button"
        className={`btn btn-sm ${snapEnabled ? "btn-secondary" : "btn-outline-secondary"}`}
        title={snapEnabled ? "Snapping on — click to disable" : "Snapping off — click to enable"}
        onClick={onToggleSnap}
      >
        <i className="bi bi-magnet me-1"></i>Snap
      </button>
      {selectedCount === 0 && <span style={{ fontSize: 11, color: "#94a3b8" }}>Click an element to align it (shift-click for multiple)</span>}
      {selectedCount === 1 && <span style={{ fontSize: 11, color: "#94a3b8" }}>1 selected</span>}
      {selectedCount > 1 && <span style={{ fontSize: 11, color: "#94a3b8" }}>{selectedCount} selected</span>}
    </div>
  );
}
