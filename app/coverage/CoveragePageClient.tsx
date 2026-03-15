"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

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
}

function MapSkeleton() {
  return (
    <div
      style={{
        height: 520,
        width: "100%",
        borderRadius: 12,
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ textAlign: "center", color: "#9ca3af" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #e5e7eb",
            borderTopColor: "#4a7c59",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, margin: 0 }}>Loading map…</p>
      </div>
    </div>
  );
}

interface Props {
  initialMaps: CoverageMapData[];
}

export default function CoveragePageClient({ initialMaps }: Props) {
  const [maps, setMaps] = useState<CoverageMapData[]>(initialMaps);
  const [activeMapId, setActiveMapId] = useState<string>(initialMaps[0]?.id ?? "");
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  const activeMap = maps.find((m) => m.id === activeMapId) ?? null;

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", paddingTop: 90 }}>
      {/* Hero banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1f2937 0%, #374151 60%, #4a7c59 100%)",
          padding: "48px 24px 56px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(74,124,89,0.25)", border: "1px solid rgba(74,124,89,0.5)",
              borderRadius: 20, padding: "4px 14px", marginBottom: 16,
              fontSize: 13, color: "#86efac", fontWeight: 500,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Delivery Coverage
          </div>
          <h1
            style={{
              color: "#fff", fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 800, margin: "0 0 14px", lineHeight: 1.15,
            }}
          >
            Where We Deliver
          </h1>
          <p style={{ color: "#d1d5db", fontSize: 17, margin: 0, lineHeight: 1.6 }}>
            Find your area on the map — explore our delivery regions and see which
            zones we service in your area.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }}>
        {maps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#6b7280" }}>
            <i className="bi bi-map" style={{ fontSize: 48, display: "block", marginBottom: 16 }} />
            <h3 style={{ color: "#1f2937", marginBottom: 8 }}>No coverage maps available</h3>
            <p>Check back soon — we&apos;re expanding our coverage.</p>
          </div>
        ) : (
          <>
            {/* Map tabs (only shown when multiple maps exist) */}
            {maps.length > 1 && (
              <div style={{ marginBottom: 28 }}>
                <div
                  style={{
                    display: "flex", gap: 8, flexWrap: "wrap",
                    borderBottom: "2px solid #e5e7eb", paddingBottom: 0,
                  }}
                >
                  {maps.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setActiveMapId(m.id); setActiveRegion(null); }}
                      style={{
                        padding: "10px 22px",
                        border: "none",
                        background: "transparent",
                        borderBottom: activeMapId === m.id ? "3px solid #4a7c59" : "3px solid transparent",
                        color: activeMapId === m.id ? "#4a7c59" : "#6b7280",
                        fontWeight: activeMapId === m.id ? 700 : 500,
                        fontSize: 15,
                        cursor: "pointer",
                        marginBottom: -2,
                        transition: "all 0.15s",
                      }}
                    >
                      <i className="bi bi-map-fill me-2" style={{ fontSize: 13 }} />
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMap && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 28 }}>
                {/* Map description */}
                {activeMap.description && (
                  <p style={{ color: "#4b5563", fontSize: 16, margin: 0, lineHeight: 1.6 }}>
                    {activeMap.description}
                  </p>
                )}

                {/* Main map + region list */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: activeMap.regions.length > 0 ? "1fr 280px" : "1fr",
                    gap: 24,
                    alignItems: "start",
                  }}
                >
                  {/* Map viewer */}
                  <div>
                    <CoverageMapViewer
                      mapData={activeMap}
                      height={520}
                      showSearch
                      showGeolocation
                      activeRegion={activeRegion}
                      onRegionClick={(region) =>
                        setActiveRegion((prev) => (prev === region.id ? null : region.id))
                      }
                    />
                  </div>

                  {/* Region list sidebar */}
                  {activeMap.regions.length > 0 && (
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "14px 18px",
                          borderBottom: "1px solid #f3f4f6",
                          background: "#f9fafb",
                        }}
                      >
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1f2937", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                          Delivery Regions
                        </h3>
                      </div>
                      <div style={{ maxHeight: 460, overflowY: "auto" }}>
                        {activeMap.regions.map((region) => {
                          const isActive = activeRegion === region.id;
                          return (
                            <button
                              key={region.id}
                              onClick={() => setActiveRegion(isActive ? null : region.id)}
                              style={{
                                display: "flex", alignItems: "center", gap: 12,
                                width: "100%", padding: "12px 18px",
                                border: "none", textAlign: "left",
                                background: isActive ? "#f0fdf4" : "transparent",
                                borderLeft: isActive ? "3px solid #4a7c59" : "3px solid transparent",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              <span
                                style={{
                                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                                  background: region.color,
                                  border: `2px solid ${region.strokeColor}`,
                                }}
                              />
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
                                  {region.name}
                                </div>
                                {region.description && (
                                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                    {region.description}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA strip */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #1f2937, #374151)",
                    borderRadius: 12, padding: "28px 32px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 16,
                  }}
                >
                  <div>
                    <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>
                      Don&apos;t see your area?
                    </h3>
                    <p style={{ color: "#9ca3af", margin: 0, fontSize: 14 }}>
                      We&apos;re expanding — contact us to check if we can deliver to you.
                    </p>
                  </div>
                  <a
                    href="/#contact"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      background: "#4a7c59", color: "#fff",
                      padding: "12px 24px", borderRadius: 8,
                      fontWeight: 600, fontSize: 15, textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <i className="bi bi-telephone" />
                    Contact Us
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
