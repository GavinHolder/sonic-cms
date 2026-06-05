"use client";

const STATS = [
  { num: "99.9%", label: "Uptime SLA" },
  { num: "15min", label: "Response time" },
  { num: "24/7", label: "Support" },
  { num: "SA", label: "Local team" },
];

const BADGES = ["No call centres", "WhatsApp support", "Local engineers", "SA-owned"];

export default function WispWhyUsSection() {
  return (
    <section
      id="why-us"
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
      <span className="wisp-ghost-num">06</span>

      <div className="container-fluid px-0">
        <div className="row mb-5">
          <div className="col-lg-7">
            <p className="wisp-tag">Why Us</p>
            <h2
              style={{
                fontSize: "clamp(38px, 5vw, 64px)",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                lineHeight: 1.0,
              }}
            >
              Local. Fast.
              <br />
              <span className="wisp-red">Reliable.</span>
            </h2>
          </div>
        </div>

        <div className="row g-4 mb-5">
          {STATS.map(({ num, label }) => (
            <div key={label} className="col-6 col-md-3">
              <div className="wisp-card" style={{ textAlign: "center", padding: "32px 20px" }}>
                <p
                  style={{
                    fontSize: "clamp(40px, 5vw, 64px)",
                    fontWeight: 900,
                    color: "#dc2626",
                    lineHeight: 1,
                    margin: "0 0 8px",
                    letterSpacing: "-1px",
                  }}
                >
                  {num}
                </p>
                <p style={{ fontSize: 13, color: "var(--theme-muted)", margin: 0 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {BADGES.map((b, i) => (
            <span
              key={b}
              className="wisp-badge"
              style={i === 3 ? { borderColor: "rgba(220,38,38,0.3)", color: "#dc2626" } : {}}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
