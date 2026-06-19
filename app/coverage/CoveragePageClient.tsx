"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CoverageCheckResult, CoverageNetworkResult, CoveragePackage } from "@/lib/coverage-utils";
import "leaflet/dist/leaflet.css";

const CoverageMapViewer = dynamic(() => import("@/components/coverage/CoverageMapViewer"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

interface LatLng { lat: number; lng: number; }
interface CoverageRegion { id: string; name: string; polygon: LatLng[]; color: string; opacity: number; strokeColor: string; strokeWidth: number; description?: string | null; regionType?: "GENERAL" | "FIBRE" | "WIRELESS"; fnoProvider?: string | null; serviceSlug?: string | null; towerRef?: string | null; }
interface CoverageTower { id: string; name: string; lat: number; lng: number; description?: string | null; networkId?: string | null; }
interface CoverageLabel { id: string; text: string; lat: number; lng: number; fontSize: number; fontFamily: string; color: string; bgColor?: string | null; bold: boolean; }
interface CoverageMapData { id: string; name: string; slug: string; description?: string | null; centerLat: number; centerLng: number; defaultZoom: number; regions: CoverageRegion[]; labels: CoverageLabel[]; towers?: CoverageTower[]; }

const CATEGORY_LABEL: Record<string, string> = { FNO: "Fibre", WISP: "Wireless ISP", WIRELESS: "Fixed Wireless" };

function MapSkeleton() {
  return (
    <div style={{ height: "100%", width: "100%", background: "#0a0d18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#9ca3af" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#E31E24", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, margin: 0 }}>Loading map…</p>
      </div>
    </div>
  );
}

interface Props {
  initialMaps: CoverageMapData[];
  networkRadii?: Record<string, { color: string; distances: number[] }>;
}

const RED = "#E31E24";

export default function CoveragePageClient({ initialMaps, networkRadii }: Props) {
  const [maps] = useState<CoverageMapData[]>(initialMaps);
  const [activeMapId, setActiveMapId] = useState<string>(initialMaps[0]?.id ?? "");
  const [result, setResult] = useState<CoverageCheckResult | null>(null);
  const [address, setAddress] = useState("");
  const [open, setOpen] = useState(false);

  const [networkId, setNetworkId] = useState<string | null>(null);
  const [dataTerm, setDataTerm] = useState<string | null>(null);
  const [pickedData, setPickedData] = useState<string | null>(null);
  const [addons, setAddons] = useState<Set<string>>(new Set());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const activeMap = maps.find((m) => m.id === activeMapId) ?? null;
  const networks: CoverageNetworkResult[] = result?.networks ?? [];
  const isMiss = !!result && !(result.hit ?? networks.length > 0);
  const net = networks.find((n) => n.id === networkId) ?? networks[0] ?? null;

  const dataPkgs = (net?.packages ?? []).filter((p) => (p.kind ?? "DATA") !== "VAS");
  const vasPkgs = (net?.packages ?? []).filter((p) => p.kind === "VAS");
  const dataTerms = [...new Set(dataPkgs.map((p) => p.term).filter(Boolean) as string[])];
  const shownData = dataTerm ? dataPkgs.filter((p) => p.term === dataTerm) : dataPkgs;
  const hasAnyPackage = dataPkgs.length > 0 || vasPkgs.length > 0;

  // VAS grouped by category
  const vasByCategory: Record<string, CoveragePackage[]> = {};
  for (const p of vasPkgs) { const c = p.category || "Add-ons"; (vasByCategory[c] ||= []).push(p); }

  function handleResult(r: CoverageCheckResult, ctx?: { address: string }) {
    setResult(r);
    setAddress(ctx?.address ?? "");
    const firstNet = (r.networks ?? [])[0] ?? null;
    setNetworkId(firstNet?.id ?? null);
    const firstTerms = [...new Set(((firstNet?.packages ?? []).filter((p) => (p.kind ?? "DATA") !== "VAS").map((p) => p.term).filter(Boolean)) as string[])];
    setDataTerm(firstTerms[0] ?? null);
    setPickedData(null); setAddons(new Set());
    setName(""); setEmail(""); setPhone(""); setError(""); setSubmitted(false);
    setOpen(true);
  }

  function selectNetwork(id: string) {
    setNetworkId(id);
    const n = networks.find((x) => x.id === id);
    const terms = [...new Set(((n?.packages ?? []).filter((p) => (p.kind ?? "DATA") !== "VAS").map((p) => p.term).filter(Boolean)) as string[])];
    setDataTerm(terms[0] ?? null);
    setPickedData(null); setAddons(new Set());
  }

  const toggleAddon = (id: string) => setAddons((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const canSubmit = isMiss || !!pickedData || (!isMiss && !hasAnyPackage);

  async function submitLead() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/coverage/lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), phone: phone.trim(),
          address, mapSlug: activeMap?.slug,
          networkId: net?.id ?? null,
          packageId: pickedData,
          addonIds: [...addons],
          miss: isMiss,
        }),
      });
      if (res.ok) setSubmitted(true);
      else setError("Something went wrong — please try again.");
    } catch { setError("Connection error — please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", background: "#0a0d18", overflow: "hidden" }}>
      {/* kill any focus ring / flash on the map container */}
      <style>{`.leaflet-container, .leaflet-container:focus, .leaflet-container *:focus { outline: none !important; }`}</style>

      <a href="/" style={{ position: "absolute", top: 16, left: 16, zIndex: 901, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: "rgba(6,8,15,0.85)", color: "#fff", textDecoration: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
        <i className="bi bi-arrow-left" /> Back to site
      </a>

      {maps.length > 1 && (
        <select value={activeMapId} onChange={(e) => { setActiveMapId(e.target.value); setResult(null); setOpen(false); }}
          style={{ position: "absolute", top: 16, left: 170, zIndex: 901, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(6,8,15,0.85)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)" }}>
          {maps.map((m) => <option key={m.id} value={m.id} style={{ color: "#000" }}>{m.name}</option>)}
        </select>
      )}

      {activeMap ? (
        <CoverageMapViewer mapData={activeMap as never} height="100%" floatingSearch showSearch showGeolocation onCoverageResult={handleResult} networkRadii={networkRadii} />
      ) : (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
          <div style={{ textAlign: "center" }}><i className="bi bi-map" style={{ fontSize: 48, display: "block", marginBottom: 16 }} /><h3 style={{ color: "#fff" }}>No coverage maps available</h3></div>
        </div>
      )}

      {/* ── Right-side results panel ─────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, right: 0, height: "100%", width: "min(33vw, 460px)", minWidth: 340,
        background: "#0f1322", color: "#f5f6fa", boxShadow: "-12px 0 40px rgba(0,0,0,0.45)",
        borderLeft: `1px solid rgba(255,255,255,0.08)`, zIndex: 1500,
        transform: open ? "translateX(0)" : "translateX(105%)", transition: "transform .35s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Archivo Black', sans-serif", fontSize: 18, textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              {isMiss ? "Not covered yet" : submitted ? "You're on the list" : "Services & Packages"}
            </h2>
            {address && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{address}</div>}
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1 }}><i className="bi bi-x-lg" /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <i className="bi bi-check-circle-fill" style={{ fontSize: 44, color: "#22c55e" }} />
              <p style={{ marginTop: 14, fontSize: 15, color: "#cbd5e1" }}>
                Thanks {name.split(" ")[0]}! {isMiss ? "We'll notify you the moment we reach you." : "Our team will contact you shortly to get you connected."}
              </p>
            </div>
          ) : isMiss ? (
            <>
              <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>We don&apos;t reach this address yet — but we&apos;re expanding fast. Leave your details and we&apos;ll let you know the moment coverage arrives.</p>
              <LeadForm {...{ name, setName, email, setEmail, phone, setPhone, error }} />
            </>
          ) : !hasAnyPackage ? (
            <>
              <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>Good news — coverage is available here{networks.length ? ` via ${networks.map((n) => n.name).join(", ")}` : ""}. Leave your details and our team will sort out the right package.</p>
              <LeadForm {...{ name, setName, email, setEmail, phone, setPhone, error }} />
            </>
          ) : (
            <>
              {/* Networks */}
              {networks.length > 1 && (
                <div style={{ marginBottom: 18 }}>
                  <SectionLabel>Choose your network</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {networks.map((n) => {
                      const active = n.id === net?.id;
                      return (
                        <button key={n.id} onClick={() => selectNetwork(n.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, cursor: "pointer", background: active ? "rgba(227,30,36,0.12)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${active ? RED : "rgba(255,255,255,0.12)"}`, color: "inherit" }}>
                          {n.logoUrl ? <img src={n.logoUrl} alt={n.name} style={{ height: 18, maxWidth: 90, objectFit: "contain" }} /> : <strong style={{ fontSize: 13 }}>{n.name}</strong>}
                          <span style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{CATEGORY_LABEL[n.category] ?? n.category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data term toggle */}
              {dataTerms.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  <SectionLabel>Service term</SectionLabel>
                  <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 }}>
                    {dataTerms.map((t) => (
                      <button key={t} onClick={() => setDataTerm(t)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: dataTerm === t ? RED : "transparent", color: dataTerm === t ? "#fff" : "#cbd5e1" }}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data packages */}
              {dataPkgs.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <SectionLabel>{net?.packages.some((p) => p.kind === "VAS") ? "Data" : "Packages"}</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {shownData.map((p) => <PriceCard key={p.id} p={p} selected={pickedData === p.id} onClick={() => setPickedData(p.id)} mode="radio" />)}
                  </div>
                </div>
              )}

              {/* Value-added services */}
              {vasPkgs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel>Value-added services <span style={{ color: "#64748b", textTransform: "none", letterSpacing: 0 }}>(optional add-ons)</span></SectionLabel>
                  {Object.entries(vasByCategory).map(([cat, pkgs]) => (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", margin: "4px 0 6px" }}>{cat}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {pkgs.map((p) => <PriceCard key={p.id} p={p} selected={addons.has(p.id)} onClick={() => toggleAddon(p.id)} mode="check" />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact form — once a data package is picked */}
              {pickedData && (
                <div style={{ marginTop: 6, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#cbd5e1" }}>Get connected — enter your details:</p>
                  <LeadForm {...{ name, setName, email, setEmail, phone, setPhone, error }} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={submitLead} disabled={!canSubmit || submitting}
              style={{ width: "100%", padding: "13px 18px", borderRadius: 9, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: (!canSubmit || submitting) ? "rgba(255,255,255,0.12)" : RED, color: "#fff", fontWeight: 700, fontSize: 14, cursor: (!canSubmit || submitting) ? "not-allowed" : "pointer" }}>
              {submitting ? "Sending…" : <><i className="bi bi-telephone" /> {isMiss ? "Notify me" : "Get connected"}</>}
            </button>
            {!isMiss && hasAnyPackage && !pickedData && <div style={{ fontSize: 11.5, color: "#64748b", textAlign: "center", marginTop: 8 }}>Pick a data package to continue</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E31E24", marginBottom: 8 }}>{children}</div>;
}

function PriceCard({ p, selected, onClick, mode }: { p: CoveragePackage; selected: boolean; onClick: () => void; mode: "radio" | "check" }) {
  return (
    <button onClick={onClick} style={{ position: "relative", textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer", width: "100%", background: selected ? "rgba(227,30,36,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${selected ? RED : "rgba(255,255,255,0.1)"}`, color: "inherit", transition: "all .15s" }}>
      {p.popular && <span style={{ position: "absolute", top: 10, right: 12, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: RED }}>★ POPULAR</span>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14.5 }}>
          <i className={`bi ${mode === "check" ? (selected ? "bi-check-square-fill" : "bi-square") : (selected ? "bi-record-circle-fill" : "bi-circle")}`} style={{ color: selected ? RED : "#64748b", marginRight: 8, fontSize: 13 }} />
          {p.name}
        </span>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 19, whiteSpace: "nowrap" }}>{p.price}<span style={{ fontSize: 11, color: "#94a3b8" }}>{p.period}</span></span>
      </div>
      <div style={{ marginLeft: 22, marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#94a3b8" }}>
        {(p.speedDown || p.speedUp) && <span>{[p.speedDown && `↓ ${p.speedDown}`, p.speedUp && `↑ ${p.speedUp}`].filter(Boolean).join("  ")}</span>}
        {p.term && <span style={{ color: "#64748b" }}>· {p.term}</span>}
      </div>
      {Array.isArray(p.features) && p.features.length > 0 && (
        <div style={{ marginLeft: 22, marginTop: 6, display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
          {p.features.slice(0, 4).map((f, i) => <span key={i} style={{ fontSize: 11.5, color: "#cbd5e1" }}><i className="bi bi-check" style={{ color: "#22c55e" }} /> {f}</span>)}
        </div>
      )}
    </button>
  );
}

function LeadForm({ name, setName, email, setEmail, phone, setPhone, error }: {
  name: string; setName: (v: string) => void; email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void; error: string;
}) {
  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, marginBottom: 8, outline: "none" };
  return (
    <div>
      <input style={inputStyle} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {error && <div style={{ color: "#f87171", fontSize: 12.5, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
