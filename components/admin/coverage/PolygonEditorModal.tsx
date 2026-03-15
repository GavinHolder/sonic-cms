"use client";

import { useEffect, useRef, useState } from "react";

interface LatLng { lat: number; lng: number; }

interface Props {
  show: boolean;
  regionName: string;
  existingPolygon: LatLng[];
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  color: string;
  strokeColor: string;
  onSave: (polygon: LatLng[]) => void;
  onClose: () => void;
}

export default function PolygonEditorModal({
  show, regionName, existingPolygon, centerLat, centerLng, defaultZoom,
  color, strokeColor, onSave, onClose,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const drawnLayerRef = useRef<any>(null);
  const drawControlRef = useRef<any>(null);
  const [polygon, setPolygon] = useState<LatLng[]>(existingPolygon);
  const [pointCount, setPointCount] = useState(existingPolygon.length);

  useEffect(() => {
    if (!show || !mapRef.current || leafletMapRef.current) return;

    const init = async () => {
      const L = (await import("leaflet")).default ?? (await import("leaflet"));
      await import("leaflet-draw");
      // @ts-ignore
      await import("leaflet/dist/leaflet.css");
      // @ts-ignore
      await import("leaflet-draw/dist/leaflet.draw.css");

      // Fix default icon
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLng],
        zoom: defaultZoom,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Draw layer group
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnLayerRef.current = drawnItems;

      // Load existing polygon if present
      if (existingPolygon.length >= 3) {
        const latlngs = existingPolygon.map((p) => [p.lat, p.lng] as [number, number]);
        const poly = L.polygon(latlngs, {
          color: strokeColor,
          fillColor: color,
          fillOpacity: 0.4,
          weight: 2,
        });
        drawnItems.addLayer(poly);
        map.fitBounds(poly.getBounds(), { padding: [20, 20] });
      }

      // Draw control
      // @ts-ignore — leaflet-draw types incomplete
      const drawControl = new L.Control.Draw({
        // @ts-ignore
        edit: { featureGroup: drawnItems, poly: { allowIntersection: false } },
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: { color: strokeColor, fillColor: color, fillOpacity: 0.4, weight: 2 },
          },
          polyline: false, rectangle: false, circle: false,
          circlemarker: false, marker: false,
        },
      });
      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      // Events
      map.on(L.Draw.Event.CREATED, (e: any) => {
        // Remove existing polygon
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        const pts = (e.layer.getLatLngs()[0] as any[]).map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
        setPolygon(pts);
        setPointCount(pts.length);
      });

      map.on(L.Draw.Event.EDITED, () => {
        const layers = drawnItems.getLayers();
        if (layers.length > 0) {
          const pts = ((layers[0] as any).getLatLngs()[0] as any[]).map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
          setPolygon(pts);
          setPointCount(pts.length);
        }
      });

      map.on(L.Draw.Event.DELETED, () => {
        setPolygon([]);
        setPointCount(0);
      });

      leafletMapRef.current = map;
    };

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        drawnLayerRef.current = null;
        drawControlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1}>
        <div className="modal-dialog modal-xl" style={{ marginTop: 70, marginBottom: 20 }}>
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
            <div className="modal-header" style={{ background: "#1f2937", borderRadius: "12px 12px 0 0" }}>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0">
                  <i className="bi bi-pentagon me-2" />Draw Polygon — {regionName}
                </h5>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                  Use the toolbar on the map to draw or edit the delivery region polygon
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white ms-auto" onClick={onClose} />
            </div>

            <div className="modal-body p-0">
              {/* Instruction bar */}
              <div
                style={{
                  background: "#f0fdf4", border: "none", borderBottom: "1px solid #d1fae5",
                  padding: "10px 20px", fontSize: 13, color: "#065f46",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <i className="bi bi-info-circle me-1" />
                <span>
                  Click the <strong>polygon tool</strong> (pentagon icon) in the top-left toolbar, click points to define the region, then
                  double-click to close. Use <strong>Edit layers</strong> to adjust. Points: <strong>{pointCount}</strong>
                </span>
              </div>

              <div ref={mapRef} style={{ height: 500, width: "100%" }} />
            </div>

            <div className="modal-footer border-0" style={{ background: "#f9fafb", borderRadius: "0 0 12px 12px" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginRight: "auto" }}>
                {pointCount >= 3
                  ? <><i className="bi bi-check-circle-fill text-success me-1" />{pointCount} points defined</>
                  : <><i className="bi bi-exclamation-circle text-warning me-1" />Draw a polygon (minimum 3 points)</>}
              </div>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-success px-4"
                onClick={() => onSave(polygon)}
                disabled={pointCount < 3}
              >
                <i className="bi bi-check-lg me-1" />Save Polygon
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
