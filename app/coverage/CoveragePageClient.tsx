"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CoverageCheckResult } from "@/lib/coverage-utils";

// Leaflet CSS — loaded client-side only
import "leaflet/dist/leaflet.css";

const CoverageMapViewer = dynamic(
  () => import("@/components/coverage/CoverageMapViewer"),
  { ssr: false, loading: () => <MapSkeleton /> }
);

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
  regionType?: "GENERAL" | "FIBRE" | "WIRELESS";
  fnoProvider?: string | null;
  serviceSlug?: string | null;
  towerRef?: string | null;
}

interface CoverageTower {
  id: string;
  name: string;
  lat: number;
  lng: number;
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
  description?: string | null;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  regions: CoverageRegion[];
  labels: CoverageLabel[];
  towers?: CoverageTower[];
}

/** Humanise an FNO provider key like "sonic_infraco" → "Sonic Infraco". */
function humaniseFno(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function MapSkeleton() {
  return (
    <div style={{ height: "100%", width: "100%", background: "#eef1f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#9ca3af" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#4a7c59", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, margin: 0 }}>Loading map…</p>
      </div>
    </div>
  );
}

interface Props {
  initialMaps: CoverageMapData[];
}

interface FoundService {
  key: string;
  name: string;
  detail: string;
  tower?: string | null;
  icon: string;
}

export default function CoveragePageClient({ initialMaps }: Props) {
  const [maps] = useState<CoverageMapData[]>(initialMaps);
  const [activeMapId, setActiveMapId] = useState<string>(initialMaps[0]?.id ?? "");
  const [result, setResult] = useState<CoverageCheckResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const activeMap = maps.find((m) => m.id === activeMapId) ?? null;

  const services: FoundService[] = useMemo(() => {
    if (!result) return [];
    if (result.type === "fibre") {
      return [{
        key: "fibre",
        name: "Fibre",
        detail: result.fnoProvider ? `via ${humaniseFno(result.fnoProvider)}` : (result.regionName || "Fibre to the home"),
        icon: "bi-ethernet",
      }];
    }
    if (result.type === "wireless") {
      return (result.services || []).map((s) => ({
        key: s.serviceSlug,
        name: s.name,
        detail: s.description || "Fixed wireless",
        tower: s.towerRef,
        icon: "bi-broadcast-pin",
      }));
    }
    return [];
  }, [result]);

  function handleResult(r: CoverageCheckResult) {
    setResult(r);
    setSelected(null);
    setModalOpen(true);
  }

  const isMiss = result?.type === "miss";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100dvh - var(--navbar-height, 96px))",
        marginTop: "var(--navbar-height, 96px)",
        background: "#eef1f4",
      }}
    >
      {/* Map selector — only when more than one map exists */}
      {maps.length > 1 && (
        <select
          value={activeMapId}
          onChange={(e) => { setActiveMapId(e.target.value); setResult(null); setModalOpen(false); }}
          style={{
            position: "absolute", top: 16, left: 16, zIndex: 901,
            padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
            background: "#fff", fontSize: 14, fontWeight: 600, color: "#1f2937",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)", cursor: "pointer",
          }}
        >
          {maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}

      {/* Full-page map with floating address search */}
      {activeMap ? (
        <CoverageMapViewer
          mapData={activeMap}
          height="100%"
          floatingSearch
          showSearch
          showGeolocation
          onCoverageResult={handleResult}
        />
      ) : (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
          <div style={{ textAlign: "center" }}>
            <i className="bi bi-map" style={{ fontSize: 48, display: "block", marginBottom: 16 }} />
            <h3 style={{ color: "#1f2937" }}>No coverage maps available</h3>
          </div>
        </div>
      )}

      {/* Results modal — services found at the confirmed address */}
      {modalOpen && result && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, 100%)", background: "#fff", borderRadius: 16,
              boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden",
              maxHeight: "calc(100dvh - 120px)", display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: isMiss ? "#f1f5f9" : "#ecfdf5", color: isMiss ? "#64748b" : "#16a34a",
                }}>
                  <i className={`bi ${isMiss ? "bi-x-circle" : "bi-check-circle-fill"}`} />
                </span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                  {isMiss ? "No coverage yet" : "Available at this address"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Close"
                style={{ border: "none", background: "transparent", fontSize: 20, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>
                <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 20, overflowY: "auto" }}>
              {isMiss ? (
                <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
                  We don&apos;t have coverage at this address yet — we&apos;re expanding all the time.
                  Try a nearby address, or get in touch and we&apos;ll let you know when we reach you.
                </p>
              ) : (
                <>
                  <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: 13 }}>
                    {services.length > 1
                      ? `${services.length} services reach this address — choose one to get connected:`
                      : "Choose a service to get connected:"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {services.map((s) => {
                      const active = selected === s.key;
                      return (
                        <button
                          key={s.key}
                          onClick={() => setSelected(s.key)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                            padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                            background: active ? "#ecfdf5" : "#fff",
                            border: `2px solid ${active ? "#4a7c59" : "#e5e7eb"}`,
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{
                            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            background: active ? "#4a7c59" : "#f1f5f9", color: active ? "#fff" : "#475569", fontSize: 18,
                          }}>
                            <i className={`bi ${s.icon}`} />
                          </span>
                          <span style={{ flex: 1 }}>
                            <span style={{ display: "block", fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{s.name}</span>
                            <span style={{ display: "block", fontSize: 12.5, color: "#64748b" }}>{s.detail}</span>
                            {s.tower && <span style={{ display: "block", fontSize: 11.5, color: "#94a3b8" }}>Tower: {s.tower}</span>}
                          </span>
                          <i className={`bi ${active ? "bi-check-circle-fill" : "bi-circle"}`} style={{ color: active ? "#4a7c59" : "#cbd5e1", fontSize: 18 }} />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10 }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ flex: "0 0 auto", padding: "12px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {isMiss ? "Try another" : "Search again"}
              </button>
              <a
                href="/#contact"
                aria-disabled={!isMiss && !selected}
                onClick={(e) => { if (!isMiss && !selected) e.preventDefault(); }}
                style={{
                  flex: 1, padding: "12px 18px", borderRadius: 10, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: (!isMiss && !selected) ? "#cbd5e1" : "#4a7c59", color: "#fff",
                  fontWeight: 700, fontSize: 14,
                  pointerEvents: (!isMiss && !selected) ? "none" : "auto",
                }}
              >
                <i className="bi bi-telephone" />
                {isMiss ? "Notify me" : "Get connected"}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
