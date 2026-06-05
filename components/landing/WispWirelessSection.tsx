"use client";

import { useState } from "react";
import CoverageMapViewer, { type CoverageMapData } from "@/components/coverage/CoverageMapViewer";
import type { CoverageCheckResult } from "@/lib/coverage-utils";

interface Props {
  mapData: CoverageMapData | null;
}

export default function WispWirelessSection({ mapData }: Props) {
  const [result, setResult] = useState<CoverageCheckResult | null>(null);

  return (
    <section
      id="wireless"
      className="wisp-section"
      style={{
        minHeight: "100vh",
        background: "var(--theme-bg)",
        color: "var(--theme-text)",
        display: "flex",
        alignItems: "center",
        padding: "80px max(5vw, 40px)",
        position: "relative",
      }}
    >
      <span className="wisp-ghost-num">03</span>

      <div className="container-fluid px-0">
        <div className="row g-5 align-items-center flex-lg-row-reverse">
          {/* Right — copy */}
          <div className="col-lg-5">
            <p className="wisp-tag">Wireless Broadband</p>
            <h2
              style={{
                fontSize: "clamp(38px, 5vw, 64px)",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                lineHeight: 1.0,
                marginBottom: 20,
              }}
            >
              No cables.
              <br />
              <span className="wisp-red">No limits.</span>
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--theme-muted)", marginBottom: 24 }}>
              Fixed wireless via our tower network. Multiple service tiers available — search your address to see what reaches you.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {[
                { color: "#6d28d9", label: "Standard WiFi — up to 25 Mbps" },
                { color: "#dc2626", label: "Airfibre — up to 100 Mbps" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--theme-muted)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>

            {result?.type === "wireless" && result.services && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.services.map((svc) => (
                  <div key={svc.serviceSlug} className="wisp-card" style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{svc.name}</p>
                        {svc.towerRef && (
                          <p style={{ fontSize: 12, color: "var(--theme-muted)", margin: "2px 0 0" }}>
                            Tower: {svc.towerRef}
                          </p>
                        )}
                        {svc.description && (
                          <p style={{ fontSize: 12, color: "var(--theme-muted)", margin: "4px 0 0" }}>{svc.description}</p>
                        )}
                      </div>
                      <a
                        href={`/packages?service=${svc.serviceSlug}`}
                        style={{
                          padding: "6px 14px",
                          background: "#dc2626",
                          color: "#fff",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Select plan →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result?.type === "miss" && (
              <div className="wisp-result-bar miss">
                <i className="bi bi-x-circle" />
                <span>No wireless coverage at this address</span>
              </div>
            )}
          </div>

          {/* Left — map */}
          <div className="col-lg-7">
            {mapData ? (
              <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--theme-border)" }}>
                <CoverageMapViewer
                  mapData={mapData}
                  height={460}
                  showSearch
                  showGeolocation
                  onCoverageResult={setResult}
                />
              </div>
            ) : (
              <div
                style={{
                  height: 460,
                  background: "var(--theme-card-bg)",
                  border: "1px solid var(--theme-border)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--theme-muted)",
                  fontSize: 14,
                }}
              >
                Wireless coverage map not configured yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
