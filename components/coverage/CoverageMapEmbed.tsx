"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import CoverageMapViewer from "./CoverageMapViewer";
import type { CoverageCheckResult } from "@/lib/coverage-utils";

interface LatLng { lat: number; lng: number; }
interface CoverageRegion {
  id: string; name: string; polygon: LatLng[]; color: string; opacity: number;
  strokeColor: string; strokeWidth: number; description?: string | null;
}
interface CoverageLabel {
  id: string; text: string; lat: number; lng: number; fontSize: number;
  fontFamily: string; color: string; bgColor?: string | null; bold: boolean;
}
interface CoverageTower { id: string; name: string; lat: number; lng: number; description?: string | null; }
interface CoverageMapData {
  id: string; name: string; slug: string;
  centerLat: number; centerLng: number; defaultZoom: number;
  regions: CoverageRegion[]; labels: CoverageLabel[]; towers?: CoverageTower[];
}

interface Props {
  slug: string;
  height?: number;
  showSearch?: boolean;
  showGeolocation?: boolean;
  /** Render the address-check result panel under the map (default true). */
  showResults?: boolean;
  /** Destination for the result call-to-action. For wireless hits the matched
   *  service slug is appended as `?service=<slug>`. No CTA shown if empty. */
  resultCtaUrl?: string;
  fibreCtaLabel?: string;
  wirelessCtaLabel?: string;
  missMessage?: string;
}

/** Humanise an FNO provider key like "sonic_infraco" → "Sonic Infraco". */
function humanise(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export default function CoverageMapEmbed({
  slug, height = 480, showSearch = true, showGeolocation = true,
  showResults = true,
  resultCtaUrl = "",
  fibreCtaLabel = "View plans",
  wirelessCtaLabel = "Select plan",
  missMessage = "No coverage at this address yet.",
}: Props) {
  const [mapData, setMapData] = useState<CoverageMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CoverageCheckResult | null>(null);

  useEffect(() => {
    if (!slug) { setError("No map slug configured"); setLoading(false); return; }
    fetch(`/api/coverage-maps/${slug}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("Map not found");
        return r.json();
      })
      .then((data) => { setMapData(data); setLoading(false); })
      .catch(() => { setError("Coverage map unavailable"); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#4a7c59", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ margin: 0, fontSize: 13 }}>Loading map…</p>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>{error || "No map data"}</p>
      </div>
    );
  }

  return (
    <div>
      <CoverageMapViewer
        mapData={mapData}
        height={height}
        showSearch={showSearch}
        showGeolocation={showGeolocation}
        onCoverageResult={showResults ? setResult : undefined}
      />

      {showResults && result && (
        <div style={{ marginTop: 12 }}>
          {result.type === "fibre" && (
            <div className="cov-result cov-result-hit">
              <i className="bi bi-check-circle-fill" style={{ color: "var(--theme-red, #16a34a)" }} />
              <span>
                Covered{result.fnoProvider ? <> by <strong>{humanise(result.fnoProvider)}</strong></> : result.regionName ? <> — <strong>{result.regionName}</strong></> : ""}
              </span>
              {resultCtaUrl && (
                <a className="cov-result-cta" href={resultCtaUrl}>{fibreCtaLabel} →</a>
              )}
            </div>
          )}

          {result.type === "wireless" && result.services && result.services.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.services.map((svc) => (
                <div key={svc.serviceSlug} className="cov-service-card">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{svc.name}</div>
                    {svc.towerRef && <div style={{ fontSize: 12, color: "var(--theme-muted, #6b7280)" }}>Tower: {svc.towerRef}</div>}
                    {svc.description && <div style={{ fontSize: 12, color: "var(--theme-muted, #6b7280)", marginTop: 2 }}>{svc.description}</div>}
                  </div>
                  {resultCtaUrl && (
                    <a className="cov-result-cta" style={{ whiteSpace: "nowrap" }}
                      href={`${resultCtaUrl}${resultCtaUrl.includes("?") ? "&" : "?"}service=${encodeURIComponent(svc.serviceSlug)}`}>
                      {wirelessCtaLabel} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.type === "miss" && (
            <div className="cov-result cov-result-miss">
              <i className="bi bi-x-circle" />
              <span>{missMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
