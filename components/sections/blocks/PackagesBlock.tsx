"use client";

import { useEffect, useState } from "react";

interface PkgRow {
  id: string; name: string; speedDown: string | null; speedUp: string | null;
  price: string; period: string | null; features: string[]; popular: boolean;
  networkName: string | null; networkColor: string | null;
}

interface Props {
  networkSlug?: string;
  columns?: number;
  heading?: string;
  darkBg?: boolean;
}

/**
 * Live Packages grid — renders a coverage-plugin network's active packages as cards,
 * fetched at render. Author picks the network in the designer; cards stay in sync
 * with whatever packages exist for that network.
 */
export default function PackagesBlock({ networkSlug, columns = 3, heading, darkBg = true }: Props) {
  const [pkgs, setPkgs] = useState<PkgRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    if (!networkSlug) { setState("empty"); return; }
    let alive = true;
    fetch(`/api/packages?network=${encodeURIComponent(networkSlug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return;
        const list: PkgRow[] = Array.isArray(d.packages) ? d.packages : [];
        setPkgs(list);
        setState(list.length ? "ready" : "empty");
      })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [networkSlug]);

  const tc = "var(--section-text, #f5f6fa)";
  const muted = "var(--section-muted, rgba(245,246,250,0.6))";

  if (state === "loading") return <div style={{ padding: 24, textAlign: "center", color: muted }}>Loading packages…</div>;
  if (state === "empty") return <div style={{ padding: 24, textAlign: "center", color: muted, fontSize: 14 }}>{networkSlug ? "No packages for this network yet." : "Pick a network in the block settings."}</div>;
  if (state === "error") return <div style={{ padding: 24, textAlign: "center", color: muted }}>Packages unavailable.</div>;

  return (
    <div>
      {heading && (
        <h3 style={{ fontFamily: "var(--theme-font-display, 'Archivo Black'), sans-serif", textTransform: "uppercase", fontSize: "clamp(20px,2.4vw,30px)", color: tc, margin: "0 0 20px" }}>{heading}</h3>
      )}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 16 }}>
        {pkgs.map((p) => (
          <div key={p.id} style={{
            position: "relative", padding: "22px 20px", borderRadius: 12,
            background: p.popular ? "rgba(227,30,36,0.10)" : "var(--theme-card-bg, rgba(255,255,255,0.04))",
            border: `1.5px solid ${p.popular ? "var(--theme-red, #E31E24)" : "var(--theme-card-border, rgba(255,255,255,0.12))"}`,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {p.popular && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--theme-red, #E31E24)" }}>★ POPULAR</span>}
            <div style={{ fontFamily: "var(--theme-font-display, 'Archivo Black'), sans-serif", fontSize: 18, color: tc }}>{p.name}</div>
            {(p.speedDown || p.speedUp) && <div style={{ fontSize: 13, color: muted }}>{[p.speedDown, p.speedUp].filter(Boolean).join(" / ")}</div>}
            <div style={{ fontFamily: "var(--theme-font-display, 'Archivo Black'), sans-serif", fontSize: "clamp(26px,3vw,38px)", color: tc, lineHeight: 1 }}>
              {p.price}<span style={{ fontSize: 13, color: muted, fontFamily: "inherit" }}>{p.period}</span>
            </div>
            {Array.isArray(p.features) && p.features.length > 0 && (
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 13, color: tc, opacity: 0.85, display: "flex", gap: 8 }}>
                    <i className="bi bi-check-circle-fill" style={{ color: "var(--bs-success, #22c55e)", fontSize: 13, marginTop: 2 }} />{f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
