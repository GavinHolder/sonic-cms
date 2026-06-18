"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { searchAddresses, resolveSuggestion, type GeoSuggestion } from "@/lib/geocoding";

interface Props {
  show: boolean;
  title?: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  initialLat?: number | null;
  initialLng?: number | null;
  onSave: (lat: number, lng: number) => void;
  onClose: () => void;
}

/**
 * Click-to-place location picker with address search + map/satellite toggle.
 * Drops (and lets you drag) a single marker and returns its lat/lng — so
 * towers/labels are placed visually instead of typing coordinates.
 */
export default function PointPickerModal({
  show, title = "Pick location", centerLat, centerLng, defaultZoom, initialLat, initialLng, onSave, onClose,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Place/move the marker (creates it on first call); optionally recenter the map.
  const placePoint = useCallback((lat: number, lng: number, recenter = false) => {
    const map = leafletMapRef.current; const L = LRef.current;
    if (!map || !L) return;
    if (markerRef.current) { markerRef.current.setLatLng([lat, lng]); }
    else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current.getLatLng();
        setPos({ lat: ll.lat, lng: ll.lng });
      });
    }
    if (recenter) map.setView([lat, lng], Math.max(map.getZoom(), 15));
    setPos({ lat, lng });
  }, []);

  useEffect(() => {
    if (!show || !mapRef.current || leafletMapRef.current) return;
    const init = async () => {
      const L = (await import("leaflet")).default ?? (await import("leaflet"));
      LRef.current = L;
      // @ts-ignore
      await import("leaflet/dist/leaflet.css");
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const startLat = initialLat ?? centerLat;
      const startLng = initialLng ?? centerLng;
      const map = L.map(mapRef.current!, { center: [startLat, startLng], zoom: defaultZoom, scrollWheelZoom: true });
      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      });
      const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Imagery &copy; Esri", maxZoom: 19,
      });
      osm.addTo(map);
      L.control.layers({ "Map": osm, "Satellite": sat }, {}, { position: "topright", collapsed: false }).addTo(map);
      leafletMapRef.current = map;
      if (initialLat != null && initialLng != null) placePoint(initialLat, initialLng);
      map.on("click", (e: any) => placePoint(e.latlng.lat, e.latlng.lng));
    };
    init();
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // Debounced address search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setSuggestions(await searchAddresses(q)); } catch { /* ignore */ } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const pickSuggestion = async (s: GeoSuggestion) => {
    setQuery(s.label); setSuggestions([]);
    const pt = await resolveSuggestion(s);
    if (pt) placePoint(pt.lat, pt.lng, true);
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1}>
        <div className="modal-dialog modal-lg" style={{ marginTop: 60 }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
            <div className="modal-header" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0"><i className="bi bi-geo-alt me-2" />{title}</h5>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>Search an address or click the map — drag the pin to fine-tune</div>
              </div>
              <button type="button" className="btn-close btn-close-white ms-auto" onClick={onClose} />
            </div>
            <div className="modal-body p-0" style={{ position: "relative" }}>
              {/* Address search overlay */}
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, width: "min(360px, 70%)" }}>
                <div style={{ position: "relative" }}>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Search address or place…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}
                  />
                  {searching && <span className="spinner-border spinner-border-sm" style={{ position: "absolute", right: 10, top: 8, color: "#6b7280" }} />}
                </div>
                {suggestions.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 8, marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: 220, overflowY: "auto" }}>
                    {suggestions.map((s, i) => (
                      <button key={i} type="button" onClick={() => pickSuggestion(s)}
                        style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "8px 12px", fontSize: 13, color: "#1f2937", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? "1px solid #f1f5f9" : "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <i className="bi bi-geo-alt text-muted me-2" />{s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div ref={mapRef} style={{ height: 460, width: "100%" }} />
            </div>
            <div className="modal-footer border-0" style={{ background: "#f9fafb", borderRadius: "0 0 12px 12px" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginRight: "auto", fontFamily: "monospace" }}>
                {pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : <span style={{ color: "#d97706" }}>Search or click the map to choose a spot</span>}
              </div>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-success px-4" disabled={!pos} onClick={() => pos && onSave(pos.lat, pos.lng)}>
                <i className="bi bi-check-lg me-1" />Use this location
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
