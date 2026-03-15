"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import CoverageMapViewer from "./CoverageMapViewer";

interface LatLng { lat: number; lng: number; }
interface CoverageRegion {
  id: string; name: string; polygon: LatLng[]; color: string; opacity: number;
  strokeColor: string; strokeWidth: number; description?: string | null;
}
interface CoverageLabel {
  id: string; text: string; lat: number; lng: number; fontSize: number;
  fontFamily: string; color: string; bgColor?: string | null; bold: boolean;
}
interface CoverageMapData {
  id: string; name: string; slug: string;
  centerLat: number; centerLng: number; defaultZoom: number;
  regions: CoverageRegion[]; labels: CoverageLabel[];
}

interface Props {
  slug: string;
  height?: number;
  showSearch?: boolean;
  showGeolocation?: boolean;
}

export default function CoverageMapEmbed({ slug, height = 480, showSearch = true, showGeolocation = true }: Props) {
  const [mapData, setMapData] = useState<CoverageMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <CoverageMapViewer
      mapData={mapData}
      height={height}
      showSearch={showSearch}
      showGeolocation={showGeolocation}
    />
  );
}
