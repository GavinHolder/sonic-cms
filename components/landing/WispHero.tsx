"use client";

export default function WispHero() {
  return (
    <section
      className="wisp-section"
      style={{
        height: "100vh",
        background: "#0a1628",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 max(5vw, 40px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      <span className="wisp-ghost-num" style={{ color: "#ffffff" }}>01</span>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680 }}>
        <p className="wisp-tag" style={{ color: "rgba(255,255,255,0.4)" }}>WISP · FNO · VoIP · Enterprise</p>
        <h1
          style={{
            fontSize: "clamp(52px, 8vw, 96px)",
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 1.0,
            marginBottom: 20,
          }}
        >
          Your region.
          <br />
          <span style={{ color: "#dc2626" }}>Connected.</span>
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 480,
            marginBottom: 32,
          }}
        >
          Fibre, wireless, VoIP and enterprise connectivity — built and supported locally.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
          <a
            href="#coverage"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#dc2626",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Check my coverage
          </a>
          <a
            href="#services"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              border: "1.5px solid rgba(255,255,255,0.25)",
              color: "rgba(255,255,255,0.85)",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Our services
          </a>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["2 FNO networks", "99.9% uptime", "24/7 local support"].map((b) => (
            <span
              key={b}
              className="wisp-badge"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)" }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
