"use client";

import { useRef, useState } from "react";
import { parseGeoJsonRegions, type ParsedRegion, type SkippedFeature } from "@/lib/coverage-geojson-import";

interface Props {
  show: boolean;
  mapName: string;
  /** Current region count on the target map — fallback "Region N" names start here. */
  existingRegionCount: number;
  onImport: (regions: ParsedRegion[]) => Promise<void>;
  onClose: () => void;
}

type Stage = "pick" | "preview";

export default function ImportRegionsModal({ show, mapName, existingRegionCount, onImport, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [regions, setRegions] = useState<ParsedRegion[]>([]);
  const [skipped, setSkipped] = useState<SkippedFeature[]>([]);
  const [showSkipped, setShowSkipped] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setStage("pick");
    setFileName("");
    setParseError("");
    setRegions([]);
    setSkipped([]);
    setShowSkipped(false);
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setParseError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const json = JSON.parse(text);
        const result = parseGeoJsonRegions(json, existingRegionCount);
        if (result.regions.length === 0) {
          setParseError("No Polygon/MultiPolygon features found in this file — nothing to import.");
          setSkipped(result.skipped);
          return;
        }
        setRegions(result.regions);
        setSkipped(result.skipped);
        setStage("preview");
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Could not parse this file as GeoJSON");
      }
    };
    reader.onerror = () => setParseError("Could not read this file");
    reader.readAsText(file);
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      await onImport(regions);
      handleClose();
    } catch {
      // onImport's caller (parent) is responsible for toasting the failure; keep the
      // preview open so the admin doesn't have to re-upload after a transient error.
      setImporting(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={importing ? undefined : handleClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1}>
        <div className="modal-dialog modal-lg" style={{ marginTop: 70 }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
            <div className="modal-header" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0">
                  <i className="bi bi-file-earmark-arrow-up me-2" />Import Regions (GeoJSON)
                </h5>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                  Bulk-create regions on <strong style={{ color: "#e5e7eb" }}>{mapName}</strong> from a GeoJSON file
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white ms-auto" onClick={handleClose} disabled={importing} />
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              {stage === "pick" && (
                <>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: "2px dashed #d1d5db", borderRadius: 10, padding: "36px 20px",
                      textAlign: "center", cursor: "pointer", background: "#f9fafb",
                    }}
                  >
                    <i className="bi bi-cloud-upload" style={{ fontSize: 28, color: "#9ca3af", display: "block", marginBottom: 8 }} />
                    <div style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Click to choose a .geojson / .json file</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                      A GeoJSON FeatureCollection of Polygon / MultiPolygon features
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".geojson,.json,application/geo+json,application/json"
                    className="d-none"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) processFile(f);
                      e.target.value = "";
                    }}
                  />
                  {fileName && !parseError && (
                    <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 10 }}>
                      <i className="bi bi-file-earmark-text me-1" />{fileName}
                    </div>
                  )}
                  {parseError && (
                    <div className="alert alert-danger mt-3 mb-0" style={{ fontSize: 13 }}>
                      <i className="bi bi-exclamation-triangle-fill me-2" />{parseError}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 16, lineHeight: 1.5 }}>
                    <i className="bi bi-info-circle me-1" />
                    KML, KMZ and Shapefile aren&apos;t supported here — convert to GeoJSON first (e.g. via a GIS tool
                    or <code>geojson.io</code>).
                  </div>
                </>
              )}

              {stage === "preview" && (
                <>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-file-earmark-text text-muted" />
                    <span style={{ fontSize: 13, color: "#374151" }}>{fileName}</span>
                  </div>

                  <div className="d-flex gap-3 mb-3">
                    <div style={{ flex: 1, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}>{regions.length}</div>
                      <div style={{ fontSize: 12, color: "#166534" }}>region{regions.length === 1 ? "" : "s"} will be created</div>
                    </div>
                    {skipped.length > 0 && (
                      <div style={{ flex: 1, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#d97706" }}>{skipped.length}</div>
                        <div style={{ fontSize: 12, color: "#92400e" }}>feature{skipped.length === 1 ? "" : "s"} skipped</div>
                      </div>
                    )}
                  </div>

                  {skipped.length > 0 && (
                    <div className="mb-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setShowSkipped((v) => !v)}
                      >
                        <i className={`bi ${showSkipped ? "bi-chevron-up" : "bi-chevron-down"} me-1`} />
                        {showSkipped ? "Hide" : "Show"} skipped features
                      </button>
                      {showSkipped && (
                        <div style={{ maxHeight: 160, overflowY: "auto", marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}>
                          {skipped.map((s) => (
                            <div key={s.index} style={{ padding: "6px 10px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
                              <strong style={{ color: "#374151" }}>Feature #{s.index}</strong> — {s.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Regions to import</div>
                  <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    {regions.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", justifyContent: "space-between", padding: "7px 12px",
                          fontSize: 13, borderBottom: i < regions.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}
                      >
                        <span style={{ color: "#1f2937" }}>{r.name}</span>
                        <span style={{ color: "#9ca3af" }}>{r.polygon.length} pts</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>
                    <i className="bi bi-palette me-1" />
                    Imported regions use the default styling (color, opacity, stroke) — adjust individually afterward.
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer border-0" style={{ background: "#f9fafb", borderRadius: "0 0 12px 12px" }}>
              {stage === "preview" && (
                <button
                  type="button"
                  className="btn btn-outline-secondary me-auto"
                  onClick={reset}
                  disabled={importing}
                >
                  <i className="bi bi-arrow-left me-1" />Choose a different file
                </button>
              )}
              <button type="button" className="btn btn-outline-secondary" onClick={handleClose} disabled={importing}>
                Cancel
              </button>
              {stage === "preview" && (
                <button type="button" className="btn btn-success px-4" onClick={handleConfirm} disabled={importing || regions.length === 0}>
                  {importing ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Importing…</>
                  ) : (
                    <><i className="bi bi-check-lg me-1" />Import {regions.length} region{regions.length === 1 ? "" : "s"}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
