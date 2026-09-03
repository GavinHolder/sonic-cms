"use client";

import { useMemo, useState } from "react";
import {
  regionsAndTowersToGeoJson,
  regionsAndTowersToKml,
  type ExportRegion,
  type ExportTower,
} from "@/lib/coverage-geojson-export";

interface Props {
  mapName: string;
  mapSlug: string;
  regions: ExportRegion[];
  towers: ExportTower[];
  onClose: () => void;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A simple checklist section shared by the Regions and Towers panes below —
 * same "select all / select none / individual toggle" behavior either way. */
function Checklist<T extends { id: string; name: string }>({
  items,
  excluded,
  onToggle,
  onSelectAll,
  onSelectNone,
  emptyLabel,
}: {
  items: T[];
  excluded: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  emptyLabel: string;
}) {
  const selectedCount = items.length - items.filter((i) => excluded.has(i.id)).length;
  if (items.length === 0) {
    return <div style={{ fontSize: 12.5, color: "#9ca3af", padding: "10px 0" }}>{emptyLabel}</div>;
  }
  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span style={{ fontSize: 12, color: "#6b7280" }}>{selectedCount} of {items.length} selected</span>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-sm btn-link p-0" style={{ fontSize: 12 }} onClick={onSelectAll}>Select all</button>
          <button type="button" className="btn btn-sm btn-link p-0 text-danger" style={{ fontSize: 12 }} onClick={onSelectNone}>Select none</button>
        </div>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        {items.map((item, i) => (
          <label
            key={item.id}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
              fontSize: 13, borderBottom: i < items.length - 1 ? "1px solid #f3f4f6" : "none",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!excluded.has(item.id)}
              onChange={() => onToggle(item.id)}
            />
            <span style={{ color: "#1f2937" }}>{item.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Lets an admin pick exactly which regions and towers go into an export,
 * rather than always dumping the whole map. Selection defaults to "everything
 * included" (nothing excluded) so a quick full export still only takes one
 * click — unchecking items narrows it down from there.
 */
export default function ExportMapModal({ mapName, mapSlug, regions, towers, onClose }: Props) {
  const [excludedRegionIds, setExcludedRegionIds] = useState<Set<string>>(new Set());
  const [excludedTowerIds, setExcludedTowerIds] = useState<Set<string>>(new Set());

  const toggleRegion = (id: string) =>
    setExcludedRegionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const toggleTower = (id: string) =>
    setExcludedTowerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const selectedRegions = useMemo(() => regions.filter((r) => !excludedRegionIds.has(r.id)), [regions, excludedRegionIds]);
  const selectedTowers = useMemo(() => towers.filter((t) => !excludedTowerIds.has(t.id)), [towers, excludedTowerIds]);
  const nothingSelected = selectedRegions.length === 0 && selectedTowers.length === 0;

  const handleDownload = (format: "geojson" | "kml") => {
    if (nothingSelected) return;
    if (format === "geojson") {
      const fc = regionsAndTowersToGeoJson(selectedRegions, selectedTowers);
      downloadBlob(JSON.stringify(fc, null, 2), `${mapSlug}.geojson`, "application/geo+json");
    } else {
      const kml = regionsAndTowersToKml(mapName, selectedRegions, selectedTowers);
      downloadBlob(kml, `${mapSlug}.kml`, "application/vnd.google-earth.kml+xml");
    }
    onClose();
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1}>
        <div className="modal-dialog modal-lg" style={{ marginTop: 70 }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
            <div className="modal-header" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0">
                  <i className="bi bi-file-earmark-arrow-down me-2" />Export Map
                </h5>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                  Choose what to include from <strong style={{ color: "#e5e7eb" }}>{mapName}</strong>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white ms-auto" onClick={onClose} />
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                <i className="bi bi-pentagon me-1" />Regions
              </div>
              <Checklist
                items={regions}
                excluded={excludedRegionIds}
                onToggle={toggleRegion}
                onSelectAll={() => setExcludedRegionIds(new Set())}
                onSelectNone={() => setExcludedRegionIds(new Set(regions.map((r) => r.id)))}
                emptyLabel="No regions on this map"
              />

              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", margin: "18px 0 6px" }}>
                <i className="bi bi-broadcast-pin me-1" />Towers
              </div>
              <Checklist
                items={towers}
                excluded={excludedTowerIds}
                onToggle={toggleTower}
                onSelectAll={() => setExcludedTowerIds(new Set())}
                onSelectNone={() => setExcludedTowerIds(new Set(towers.map((t) => t.id)))}
                emptyLabel="No towers on this map"
              />
            </div>

            <div className="modal-footer border-0" style={{ background: "#f9fafb", borderRadius: "0 0 12px 12px" }}>
              <button type="button" className="btn btn-outline-secondary me-auto" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-outline-success" disabled={nothingSelected} onClick={() => handleDownload("geojson")}>
                <i className="bi bi-download me-1" />GeoJSON
              </button>
              <button type="button" className="btn btn-success px-4" disabled={nothingSelected} onClick={() => handleDownload("kml")}>
                <i className="bi bi-download me-1" />KML
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
