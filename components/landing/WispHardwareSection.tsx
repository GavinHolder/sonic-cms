"use client";

const HARDWARE = [
  {
    emoji: "📡",
    title: "Routers & CPE",
    brands: "MikroTik · TP-Link · Huawei",
    href: "/hardware/routers",
    label: "Browse router range",
  },
  {
    emoji: "🗼",
    title: "Wireless Antennas",
    brands: "Ubiquiti · Mimosa · MikroTik",
    href: "/hardware/antennas",
    label: "Browse antenna range",
  },
  {
    emoji: "🔌",
    title: "Fibre Equipment",
    brands: "ONTs · ONUs · Patch panels",
    href: "/hardware/fibre",
    label: "Browse fibre equipment",
  },
];

export default function WispHardwareSection() {
  return (
    <section
      id="hardware"
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
      <span className="wisp-ghost-num">05</span>

      <div className="container-fluid px-0">
        <div className="row mb-5">
          <div className="col-lg-7">
            <p className="wisp-tag">Equipment</p>
            <h2
              style={{
                fontSize: "clamp(38px, 5vw, 64px)",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                lineHeight: 1.0,
              }}
            >
              Hardware we
              <br />
              <span className="wisp-red">trust.</span>
            </h2>
          </div>
        </div>

        <div className="row g-4">
          {HARDWARE.map((hw) => (
            <div key={hw.title} className="col-md-4">
              <div className="wisp-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 40, marginBottom: 16, display: "block" }}>{hw.emoji}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{hw.title}</h3>
                <p style={{ fontSize: 13, color: "var(--theme-muted)", marginBottom: "auto", paddingBottom: 20 }}>
                  {hw.brands}
                </p>
                <a
                  href={hw.href}
                  style={{
                    color: "#dc2626",
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  {hw.label} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
