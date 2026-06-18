"use client";

import { useEffect, useRef, useState } from "react";
import { isPointInPolygon, type CoverageCheckResult } from "@/lib/coverage-utils";
import { searchAddresses, resolveSuggestion, reverseGeocode, type GeoPrecision, type GeoSuggestion } from "@/lib/geocoding";

export interface LatLng { lat: number; lng: number }

export interface CoverageRegion {
  id: string;
  name: string;
  polygon: LatLng[];
  color: string;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  description?: string | null;
  regionType?: "GENERAL" | "FIBRE" | "WIRELESS";
  fnoProvider?: string | null;
  serviceSlug?: string | null;
  towerRef?: string | null;
}

export interface CoverageTowerData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string | null;
  networkId?: string | null;
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

export interface CoverageMapData {
  id: string;
  name: string;
  slug: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  regions: CoverageRegion[];
  labels: CoverageLabel[];
  towers?: CoverageTowerData[];
}

interface Props {
  mapData: CoverageMapData;
  height?: number | string;
  showSearch?: boolean;
  showGeolocation?: boolean;
  activeRegion?: string | null;
  onRegionClick?: (region: CoverageRegion) => void;
  onCoverageResult?: (result: CoverageCheckResult, ctx?: { address: string; lat: number; lng: number }) => void;
  // Per-network tower radius rings (procedurally drawn from package distances)
  networkRadii?: Record<string, { color: string; distances: number[] }>;
  /** Float the search bar over the map (Google-Maps style) instead of above it,
   *  and make the map fill its container edge-to-edge. */
  floatingSearch?: boolean;
}

export default function CoverageMapViewer({
  mapData,
  height = 500,
  showSearch = true,
  showGeolocation = true,
  activeRegion,
  onRegionClick,
  onCoverageResult,
  floatingSearch = false,
  networkRadii,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const polygonLayersRef = useRef<Map<string, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [userLocated, setUserLocated] = useState(false);
  // On touch devices, map starts locked — tap "Tap to interact" overlay to enable drag
  const [mapActive, setMapActive] = useState(false);
  const isTouchDevice = typeof window !== "undefined" && "ontouchstart" in window;
  // Address autocomplete — precise lookup so a street address resolves to exact coords
  const searchMarkerRef = useRef<any>(null);
  const justSelectedRef = useRef(false);
  const onMapClickRef = useRef<(lat: number, lng: number) => void>(() => {});
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

      // Guard against maps saved without a valid center/zoom — feeding Leaflet a
      // null/NaN center throws and blanks the page. Fall back to the map's data,
      // then to a sane regional default, so the map always renders.
      const safeLat  = Number.isFinite(mapData.centerLat)  ? mapData.centerLat  : -34.34;
      const safeLng  = Number.isFinite(mapData.centerLng)  ? mapData.centerLng  : 19.23;
      const safeZoom = Number.isFinite(mapData.defaultZoom) && mapData.defaultZoom > 0 ? mapData.defaultZoom : 10;
      const map = L.map(mapRef.current!, {
        center: [safeLat, safeLng],
        zoom: safeZoom,
        zoomControl: true,
        // Full-page (floatingSearch): intuitive scroll-zoom + drag, like Google Maps.
        // Embedded inline: keep scroll/drag locked so the map doesn't hijack page
        // scrolling — the user taps the overlay to activate.
        scrollWheelZoom: floatingSearch ? true : false,
        dragging: floatingSearch ? true : !("ontouchstart" in window),
      });

      // Base layers — street map + satellite imagery, toggle in the corner
      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      });
      const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Imagery &copy; Esri", maxZoom: 19,
      });
      osm.addTo(map);
      L.control.layers({ "Map": osm, "Satellite": sat }, {}, { position: "topright", collapsed: false }).addTo(map);

      // Click-to-place: clicking the map reverse-geocodes the point to a real address
      if (showSearch) {
        map.on("click", (e: any) => onMapClickRef.current(e.latlng.lat, e.latlng.lng));
      }

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

        // In search mode a click on a region should place a pin + check coverage,
        // so don't bind a popup that would swallow the click.
        if (region.description && !showSearch) {
          poly.bindPopup(
            `<strong style="color:#1f2937">${region.name}</strong><br/><span style="color:#6b7280;font-size:13px">${region.description}</span>`,
            { closeButton: true }
          );
        }

        poly.on("click", (e: any) => {
          onRegionClick?.(region);
          if (showSearch) onMapClickRef.current(e.latlng.lat, e.latlng.lng);
        });
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

      // Tower markers — pulsing red pin
      (mapData.towers ?? []).forEach((tower) => {
        if (!tower.lat || !tower.lng) return;
        const icon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:20px;height:20px">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;background:#dc2626;border-radius:50%;border:2px solid #fff;z-index:2"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:rgba(220,38,38,0.25);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const marker = L.marker([tower.lat, tower.lng], { icon });
        if (tower.name) marker.bindTooltip(tower.name, { direction: "top" });
        if (tower.description) marker.bindPopup(`<strong>${tower.name}</strong><br/><span style="color:#6b7280;font-size:13px">${tower.description}</span>`);
        marker.addTo(map);
        // Procedural radius rings — one per distinct package distance of the tower's network
        const nr = tower.networkId ? networkRadii?.[tower.networkId] : undefined;
        if (nr) {
          for (const d of nr.distances) {
            L.circle([tower.lat, tower.lng], { radius: d, color: nr.color, weight: 1, opacity: 0.7, fillColor: nr.color, fillOpacity: 0.05 })
              .bindTooltip(`${d >= 1000 ? (d / 1000) + " km" : d + " m"}`, { sticky: true })
              .addTo(map);
          }
        }
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
    }).catch((err) => {
      // Never let a map-init failure white-screen the page.
      console.error("Coverage map failed to initialise:", err);
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

  // Debounced address autocomplete — suggest precise street addresses as the user types
  useEffect(() => {
    if (!showSearch) return;
    if (justSelectedRef.current) { justSelectedRef.current = false; return; }
    const q = searchQuery.trim();
    if (q.length < 4) { setSuggestions([]); setShowSuggestions(false); return; }
    const t = setTimeout(async () => {
      try {
        const results = await searchAddresses(q);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch { /* network hiccup — ignore, button still works */ }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, showSearch]);

  // Pan to a point and drop a pin (always), then run the coverage check — but only
  // surface a result (open the package modal) when the location is precise enough
  // (a street address, not a bare suburb/town). "area" precision shows a hint instead.
  // enforcePrecision gates TYPED searches to street/address level (a bare suburb
  // shows a hint instead of a result). A deliberate map CLICK is already an exact
  // point, so it passes enforcePrecision=false and always runs the check.
  const resolveAndCheck = async (lat: number, lng: number, precision: GeoPrecision, enforcePrecision = true) => {
    setSearchError("");
    const map = leafletMapRef.current;
    if (map) {
      map.setView([lat, lng], precision === "area" && enforcePrecision ? 13 : 16);
      try {
        const L = await import("leaflet");
        if (searchMarkerRef.current) map.removeLayer(searchMarkerRef.current);
        searchMarkerRef.current = L.marker([lat, lng]).addTo(map);
      } catch { /* marker is cosmetic */ }
    }
    if (enforcePrecision && precision === "area") {
      setSearchError("That's an area, not a property. Enter a full street address (e.g. 5 West End Street, Sandbaai) or click your exact spot on the map.");
      return;
    }
    if (onCoverageResult) {
      const checkRes = await fetch(`/api/coverage-maps/public/${mapData.slug}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const result: CoverageCheckResult = await checkRes.json();
      onCoverageResult(result, { address: searchQuery.trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
    }
  };

  const selectSuggestion = async (s: GeoSuggestion) => {
    justSelectedRef.current = true;
    setSearchQuery(s.label);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearching(true);
    try {
      const pt = await resolveSuggestion(s);
      if (pt) await resolveAndCheck(pt.lat, pt.lng, pt.precision);
      else setSearchError("Couldn't resolve that address. Try another, or click your spot on the map.");
    } finally {
      setSearching(false);
    }
  };

  // Click anywhere on the map → reverse-geocode to the nearest real address → check
  onMapClickRef.current = async (lat: number, lng: number) => {
    setSearching(true);
    setShowSuggestions(false);
    try {
      const r = await reverseGeocode(lat, lng);
      if (r) {
        justSelectedRef.current = true;
        setSearchQuery(r.label);
      }
      // A click is an explicit precise point — always check (don't gate on the
      // best-effort reverse-geocode precision).
      await resolveAndCheck(lat, lng, r?.precision ?? "street", false);
    } catch {
      setSearchError("Couldn't look up that point. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || !leafletMapRef.current) return;
    setSearching(true);
    setSearchError("");
    setShowSuggestions(false);
    try {
      const top = suggestions[0] ?? (await searchAddresses(q, 1))[0];
      if (!top) {
        setSearchError("Address not found. Pick from the suggestions, or click your spot on the map.");
        return;
      }
      const pt = await resolveSuggestion(top);
      if (!pt) {
        setSearchError("Couldn't resolve that address. Try another, or click your spot on the map.");
        return;
      }
      await resolveAndCheck(pt.lat, pt.lng, pt.precision);
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", ...(floatingSearch ? { height } : {}) }}>
      {/* Search bar — floating overlay (Google-Maps style) or stacked above the map */}
      {showSearch && (
        <form
          onSubmit={handleSearch}
          style={floatingSearch
            ? { position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 900, width: "min(560px, calc(100% - 32px))" }
            : { marginBottom: 12, position: "relative" }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <i
                className="bi bi-search"
                style={{
                  position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                  color: "#6b7280", fontSize: 18, pointerEvents: "none", zIndex: 1,
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = "#4a7c59"; if (suggestions.length) setShowSuggestions(true); }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; setTimeout(() => setShowSuggestions(false), 150); }}
                placeholder="Enter your street address…"
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 48px",
                  fontSize: 16,
                  border: "2px solid #e5e7eb",
                  borderRadius: 10,
                  outline: "none",
                  background: "#fff",
                  color: "#1f2937",
                  transition: "border-color 0.2s",
                  boxShadow: floatingSearch ? "0 6px 20px rgba(0,0,0,0.18)" : "none",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              style={{
                padding: "14px 24px",
                background: "#4a7c59",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: floatingSearch ? "0 6px 20px rgba(0,0,0,0.18)" : "none",
              }}
            >
              {searching ? "Checking…" : "Check"}
            </button>
          </div>

          {/* Address autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 950,
                listStyle: "none", margin: 0, padding: 6, background: "#fff",
                border: "1px solid #e5e7eb", borderRadius: 12,
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)", maxHeight: 300, overflowY: "auto",
              }}
            >
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    style={{
                      display: "flex", gap: 10, width: "100%", textAlign: "left",
                      padding: "10px 12px", border: "none", background: "transparent",
                      borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#374151", lineHeight: 1.4,
                    }}
                  >
                    <i className="bi bi-geo-alt" style={{ color: "#4a7c59", marginTop: 2, flexShrink: 0 }} />
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchError && (
            <p style={{
              color: "#dc2626", fontSize: 13, marginTop: 6,
              ...(floatingSearch ? { background: "#fff", padding: "6px 10px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" } : {}),
            }}>{searchError}</p>
          )}
        </form>
      )}

      {/* Map container + touch activation overlay */}
      <div style={floatingSearch
        ? { position: "absolute", inset: 0, overflow: "hidden" }
        : { position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <div
          ref={mapRef}
          style={{ height: floatingSearch ? "100%" : height, width: "100%" }}
        />
        {/* On touch devices, show "tap to interact" overlay until user taps.
            This prevents the map from hijacking the page scroll gesture.
            Skipped in full-page mode where the map IS the page. */}
        {isTouchDevice && !mapActive && !floatingSearch && (
          <div
            onClick={() => {
              setMapActive(true);
              leafletMapRef.current?.dragging?.enable();
              leafletMapRef.current?.scrollWheelZoom?.enable();
            }}
            style={{
              position: "absolute", inset: 0, zIndex: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.25)", cursor: "pointer",
              backdropFilter: "blur(1px)",
            }}
          >
            <div style={{
              background: "#fff", borderRadius: 8, padding: "10px 20px",
              fontWeight: 600, fontSize: 14, color: "#1f2937",
              display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              <i className="bi bi-hand-index-thumb" style={{ fontSize: 18 }} />
              Tap to interact with map
            </div>
          </div>
        )}
      </div>

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
