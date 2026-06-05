"use client";

import { useState } from "react";
import CoverageMapViewer, { type CoverageMapData } from "@/components/coverage/CoverageMapViewer";
import type { CoverageCheckResult } from "@/lib/coverage-utils";

interface Props {
  mapData: CoverageMapData | null;
}

const FNO_LABELS: Record<string, string> = {
  sonic_infraco: "Sonic Infraco",
  openserve: "Openserve",
};

export default function WispFibreSection({ mapData }: Props) {
  const [result, setResult] = useState<CoverageCheckResult | null>(null);

  return (
    <section
      id="coverage"
      className="wisp-section"
      style={{
        minHeight: "100vh",
        background: "var(--theme-surface)",
        color: "var(--theme-text)",
        display: "flex",
        alignItems: "center",
        padding: "80px max(5vw, 40px)",
        position: "relative",
      }}
    >
      <span className="wisp-ghost-num">02</span>

      <div className="container-fluid px-0">
        <div className="row g-5 align-items-center">
          {/* Left — copy */}
          <div className="col-lg-5">
            <p className="wisp-tag">Residential Fibre</p>
            <h2
              style={{
                fontSize: "clamp(38px, 5vw, 64px)",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                lineHeight: 1.0,
                marginBottom: 20,
              }}
            >
              Fibre to your
              <br />
              <span className="wisp-red">door.</span>
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--theme-muted)", marginBottom: 24 }}>
              Direct fibre connections across two networks. Check your address to see which FNO serves your street.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
              <span className="wisp-badge">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1d4ed8", display: "inline-block" }} />
                Sonic Infraco
              </span>
              <span className="wisp-badge" style={{ opacity: 0.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0369a1", display: "inline-block" }} />
                Openserve — coming soon
              </span>
            </div>

            {result?.type === "fibre" && (
              <div className="wisp-result-bar fibre">
                <i className="bi bi-check-circle-fill" style={{ color: "#dc2626" }} />
                <span>
                  Covered by{" "}
                  <strong>{FNO_LABELS[result.fnoProvider ?? ""] ?? result.regionName ?? "fibre network"}</strong>
                </span>
                <a
                  href="/packages"
                  style={{
                    marginLeft: "auto",
                    padding: "4px 14px",
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  View plans →
                </a>
              </div>
            )}
            {result?.type === "miss" && (
              <div className="wisp-result-bar miss">
                <i className="bi bi-x-circle" />
                <span>No fibre coverage at this address yet</span>
                <a href="#wireless" style={{ marginLeft: "auto", color: "#dc2626", fontWeight: 700, textDecoration: "none", fontSize: 12 }}>
                  Check wireless ↓
                </a>
              </div>
            )}
          </div>

          {/* Right — map */}
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
                Coverage map not configured yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
