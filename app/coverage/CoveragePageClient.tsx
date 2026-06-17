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
interface CoverageTower { id: string; name: string; lat: number; lng: number; description?: string | null; }
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

interface Props { initialMaps: CoverageMapData[]; }

export default function CoveragePageClient({ initialMaps }: Props) {
  const [maps] = useState<CoverageMapData[]>(initialMaps);
  const [activeMapId, setActiveMapId] = useState<string>(initialMaps[0]?.id ?? "");
  const [result, setResult] = useState<CoverageCheckResult | null>(null);
  const [address, setAddress] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pick, setPick] = useState<{ network: CoverageNetworkResult; pkg: CoveragePackage } | null>(null);

  // lead form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const activeMap = maps.find((m) => m.id === activeMapId) ?? null;
  const networks: CoverageNetworkResult[] = result?.networks ?? [];
  const isMiss = !!result && !(result.hit ?? networks.length > 0);

  function handleResult(r: CoverageCheckResult, ctx?: { address: string }) {
    setResult(r);
    setAddress(ctx?.address ?? "");
    setPick(null);
    setName(""); setEmail(""); setPhone(""); setError(""); setSubmitted(false);
    setModalOpen(true);
  }

  async function submitLead() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/coverage/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), phone: phone.trim(),
          address, mapSlug: activeMap?.slug,
          networkId: pick?.network.id ?? null,
          packageId: pick?.pkg.id ?? null,
          miss: isMiss,
        }),
      });
      if (res.ok) setSubmitted(true);
      else setError("Something went wrong — please try again.");
    } catch { setError("Connection error — please try again."); }
    finally { setSubmitting(false); }
  }

  const canSubmit = isMiss || !!pick;

  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", background: "#0a0d18" }}>
      {/* Back to site */}
      <a href="/" style={{
        position: "absolute", top: 16, left: 16, zIndex: 901,
        display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderRadius: 8, background: "rgba(6,8,15,0.85)", color: "#fff", textDecoration: "none",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
      }}>
        <i className="bi bi-arrow-left" /> Back to site
      </a>

      {maps.length > 1 && (
        <select value={activeMapId}
          onChange={(e) => { setActiveMapId(e.target.value); setResult(null); setModalOpen(false); }}
          style={{ position: "absolute", top: 16, left: 170, zIndex: 901, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(6,8,15,0.85)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)" }}>
          {maps.map((m) => <option key={m.id} value={m.id} style={{ color: "#000" }}>{m.name}</option>)}
        </select>
      )}

      {activeMap ? (
        <CoverageMapViewer mapData={activeMap as never} height="100%" floatingSearch showSearch showGeolocation onCoverageResult={handleResult} />
      ) : (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
          <div style={{ textAlign: "center" }}><i className="bi bi-map" style={{ fontSize: 48, display: "block", marginBottom: 16 }} /><h3 style={{ color: "#fff" }}>No coverage maps available</h3></div>
        </div>
      )}

      {/* Result modal */}
      {modalOpen && result && (
        <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(6,8,15,0.7)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(540px, 100%)", background: "#0f1322", color: "#f5f6fa", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden", maxHeight: "calc(100dvh - 80px)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: isMiss ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.15)", color: isMiss ? "#94a3b8" : "#22c55e" }}>
                  <i className={`bi ${isMiss ? "bi-x-circle" : "bi-check-circle-fill"}`} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, fontFamily: "'Archivo Black', sans-serif", textTransform: "uppercase", letterSpacing: "-0.01em" }}>
                    {isMiss ? "Not covered yet" : submitted ? "You're on the list" : "Available here"}
                  </h3>
                  {address && <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{address}</span>}
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Close" style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}><i className="bi bi-x-lg" style={{ fontSize: 16 }} /></button>
            </div>

            {/* Body */}
            <div style={{ padding: 20, overflowY: "auto" }}>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <i className="bi bi-check-circle-fill" style={{ fontSize: 40, color: "#22c55e" }} />
                  <p style={{ marginTop: 14, fontSize: 15, color: "#cbd5e1" }}>
                    Thanks {name.split(" ")[0]}! {isMiss ? "We'll let you know the moment we reach you." : `Our team will contact you about ${pick?.pkg.name} on ${pick?.network.name}.`}
                  </p>
                </div>
              ) : isMiss ? (
                <>
                  <p style={{ margin: "0 0 16px", color: "#cbd5e1", fontSize: 14, lineHeight: 1.6 }}>
                    We don&apos;t reach this address yet — but we&apos;re expanding fast. Leave your details and we&apos;ll notify you the moment coverage arrives.
                  </p>
                  <LeadForm {...{ name, setName, email, setEmail, phone, setPhone, error }} />
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 14px", color: "#94a3b8", fontSize: 13 }}>
                    {networks.length > 1 ? `${networks.length} networks reach this address — pick a package:` : "Choose a package to get connected:"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {networks.map((n) => (
                      <div key={n.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: n.color }} />
                          <strong style={{ fontSize: 14 }}>{n.name}</strong>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E31E24", border: "1px solid rgba(227,30,36,0.4)", borderRadius: 99, padding: "2px 8px" }}>
                            {CATEGORY_LABEL[n.category] ?? n.category}
                          </span>
                        </div>
                        {n.packages.length === 0 ? (
                          <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>Available — contact us for packages.</p>
                        ) : (
                          <div style={{ display: "grid", gap: 8 }}>
                            {n.packages.map((p) => {
                              const active = pick?.pkg.id === p.id;
                              return (
                                <button key={p.id} onClick={() => setPick({ network: n, pkg: p })}
                                  style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer", background: active ? "rgba(227,30,36,0.12)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${active ? "#E31E24" : "rgba(255,255,255,0.1)"}`, color: "inherit", transition: "all .15s" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name} {p.popular && <span style={{ fontSize: 9, color: "#E31E24", marginLeft: 4 }}>★ POPULAR</span>}</span>
                                    <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, whiteSpace: "nowrap" }}>{p.price}<span style={{ fontSize: 11, color: "#94a3b8" }}>{p.period}</span></span>
                                  </div>
                                  {(p.speedDown || p.speedUp) && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{[p.speedDown, p.speedUp].filter(Boolean).join(" / ")}</div>}
                                  {Array.isArray(p.features) && p.features.length > 0 && (
                                    <div style={{ fontSize: 11.5, color: "#cbd5e1", marginTop: 6, display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
                                      {p.features.slice(0, 4).map((f, i) => <span key={i}><i className="bi bi-check" style={{ color: "#22c55e" }} /> {f}</span>)}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {pick && (
                    <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#cbd5e1" }}>Get connected to <strong>{pick.pkg.name}</strong> on <strong>{pick.network.name}</strong>:</p>
                      <LeadForm {...{ name, setName, email, setEmail, phone, setPhone, error }} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!submitted && (
              <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10 }}>
                <button onClick={() => setModalOpen(false)} style={{ flex: "0 0 auto", padding: "12px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#cbd5e1", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  {isMiss ? "Try another" : "Search again"}
                </button>
                <button onClick={submitLead} disabled={!canSubmit || submitting}
                  style={{ flex: 1, padding: "12px 18px", borderRadius: 9, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: (!canSubmit || submitting) ? "rgba(255,255,255,0.12)" : "#E31E24", color: "#fff", fontWeight: 700, fontSize: 14, cursor: (!canSubmit || submitting) ? "not-allowed" : "pointer" }}>
                  {submitting ? "Sending…" : <><i className="bi bi-telephone" /> {isMiss ? "Notify me" : "Get connected"}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
