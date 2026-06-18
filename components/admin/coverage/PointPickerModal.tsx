"use client";

import { useEffect, useRef, useState } from "react";

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
 * Click-to-place location picker. Drops (and lets you drag) a single marker on a
 * Leaflet map and returns its lat/lng — so towers/labels are placed visually
 * instead of typing coordinates.
 */
export default function PointPickerModal({
  show, title = "Pick location", centerLat, centerLng, defaultZoom, initialLat, initialLng, onSave, onClose,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    if (!show || !mapRef.current || leafletMapRef.current) return;
    const init = async () => {
      const L = (await import("leaflet")).default ?? (await import("leaflet"));
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
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).addTo(map);

      const place = (lat: number, lng: number) => {
        if (markerRef.current) { markerRef.current.setLatLng([lat, lng]); }
        else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const ll = markerRef.current.getLatLng();
            setPos({ lat: ll.lat, lng: ll.lng });
          });
        }
        setPos({ lat, lng });
      };
      if (initialLat != null && initialLng != null) place(initialLat, initialLng);
      map.on("click", (e: any) => place(e.latlng.lat, e.latlng.lng));
      leafletMapRef.current = map;
    };
    init();
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; markerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1}>
        <div className="modal-dialog modal-lg" style={{ marginTop: 70 }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
            <div className="modal-header" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0"><i className="bi bi-geo-alt me-2" />{title}</h5>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>Click the map to drop the pin — drag it to fine-tune</div>
              </div>
              <button type="button" className="btn-close btn-close-white ms-auto" onClick={onClose} />
            </div>
            <div className="modal-body p-0">
              <div ref={mapRef} style={{ height: 460, width: "100%" }} />
            </div>
            <div className="modal-footer border-0" style={{ background: "#f9fafb", borderRadius: "0 0 12px 12px" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginRight: "auto", fontFamily: "monospace" }}>
                {pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : <span style={{ color: "#d97706" }}>Click the map to choose a spot</span>}
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
