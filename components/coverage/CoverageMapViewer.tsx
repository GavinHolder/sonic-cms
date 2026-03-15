"use client";

import { useEffect, useRef, useState } from "react";

interface LatLng { lat: number; lng: number; }

interface CoverageRegion {
  id: string;
  name: string;
  polygon: LatLng[];
  color: string;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  description?: string | null;
}

interface CoverageLabel {
  id: string;
  text: string;
  lat: number;
  lng: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor?: string | null;
  bold: boolean;
}

interface CoverageMapData {
  id: string;
  name: string;
  slug: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  regions: CoverageRegion[];
  labels: CoverageLabel[];
}

interface Props {
  mapData: CoverageMapData;
  height?: number;
  showSearch?: boolean;
  showGeolocation?: boolean;
  activeRegion?: string | null;
  onRegionClick?: (region: CoverageRegion) => void;
}

export default function CoverageMapViewer({
  mapData,
  height = 500,
  showSearch = true,
  showGeolocation = true,
  activeRegion,
  onRegionClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const polygonLayersRef = useRef<Map<string, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [userLocated, setUserLocated] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Dynamically import Leaflet (SSR-safe)
    import("leaflet").then((L) => {
      // Fix default marker icon paths broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [mapData.centerLat, mapData.centerLng],
        zoom: mapData.defaultZoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Draw polygons
      mapData.regions.forEach((region) => {
        if (!region.polygon || region.polygon.length < 3) return;

        const latlngs = region.polygon.map((p) => [p.lat, p.lng] as [number, number]);
        const poly = L.polygon(latlngs, {
          color: region.strokeColor,
          weight: region.strokeWidth,
          fillColor: region.color,
          fillOpacity: region.opacity,
        }).addTo(map);

        poly.bindTooltip(region.name, {
          permanent: false,
          direction: "center",
          className: "coverage-tooltip",
        });

        if (region.description) {
          poly.bindPopup(
            `<strong style="color:#1f2937">${region.name}</strong><br/><span style="color:#6b7280;font-size:13px">${region.description}</span>`,
            { closeButton: true }
          );
        }

        poly.on("click", () => onRegionClick?.(region));
        polygonLayersRef.current.set(region.id, poly);
      });

      // Draw text labels as divIcons
      mapData.labels.forEach((label) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            font-family: ${label.fontFamily}, sans-serif;
            font-size: ${label.fontSize}px;
            font-weight: ${label.bold ? "bold" : "normal"};
            color: ${label.color};
            background: ${label.bgColor ?? "transparent"};
            padding: ${label.bgColor ? "2px 6px" : "0"};
            border-radius: 3px;
            white-space: nowrap;
            text-shadow: 0 1px 3px rgba(0,0,0,0.6);
            pointer-events: none;
          ">${label.text}</div>`,
          iconAnchor: [0, 0],
        });
        L.marker([label.lat, label.lng], { icon, interactive: false }).addTo(map);
      });

      leafletMapRef.current = map;

      // Auto-geolocation
      if (showGeolocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], Math.max(mapData.defaultZoom, 11));
            setUserLocated(true);

            // Highlight the region containing the user
            mapData.regions.forEach((region) => {
              const poly = polygonLayersRef.current.get(region.id);
              if (poly && isPointInPolygon({ lat: latitude, lng: longitude }, region.polygon)) {
                poly.openPopup();
              }
            });
          },
          () => { /* geolocation denied — use default center */ }
        );
      }
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Highlight active region when prop changes
  useEffect(() => {
    if (!leafletMapRef.current) return;
    import("leaflet").then((L) => {
      polygonLayersRef.current.forEach((poly, regionId) => {
        const region = mapData.regions.find((r) => r.id === regionId);
        if (!region) return;
        const isActive = activeRegion === regionId;
        poly.setStyle({
          fillOpacity: isActive ? Math.min(region.opacity + 0.2, 0.85) : region.opacity,
          weight: isActive ? region.strokeWidth + 1 : region.strokeWidth,
        });
      });
    });
  }, [activeRegion]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !leafletMapRef.current) return;

    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=za`,
        { headers: { "Accept-Language": "en" } }
      );
      const results = await res.json();
      if (results.length === 0) {
        setSearchError("Location not found. Try a different search term.");
      } else {
        const { lat, lon, display_name } = results[0];
        leafletMapRef.current.setView([parseFloat(lat), parseFloat(lon)], 12);
      }
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Search bar */}
      {showSearch && (
        <form onSubmit={handleSearch} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <i
                className="bi bi-search"
                style={{
                  position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                  color: "#6b7280", fontSize: 18, pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your town, city or area…"
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 48px",
                  fontSize: 16,
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  outline: "none",
                  background: "#fff",
                  color: "#1f2937",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#4a7c59"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              style={{
                padding: "14px 28px",
                background: "#4a7c59",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {searching ? "Searching…" : "Check Coverage"}
            </button>
          </div>
          {searchError && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{searchError}</p>
          )}
        </form>
      )}

      {/* Map container */}
      <div
        ref={mapRef}
        style={{
          height,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      />

      {userLocated && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "#4a7c59", color: "#fff", padding: "6px 14px", borderRadius: 20,
          fontSize: 13, fontWeight: 500, zIndex: 1000, pointerEvents: "none",
        }}>
          <i className="bi bi-geo-alt-fill me-1" />Showing your area
        </div>
      )}
    </div>
  );
}

// Ray-casting algorithm for point-in-polygon
function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
