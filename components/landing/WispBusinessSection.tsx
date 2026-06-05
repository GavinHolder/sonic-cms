"use client";

const CARDS = [
  {
    icon: "bi-ethernet",
    title: "Enterprise Connectivity",
    body: "Dedicated bandwidth, business-grade SLAs, redundant links. We build the infrastructure your operation runs on.",
  },
  {
    icon: "bi-telephone-fill",
    title: "VoIP & Voice",
    body: "Hosted PBX, SIP trunks, number porting and local PSTN breakout. Full voice stack managed by our team.",
  },
  {
    icon: "bi-wifi",
    title: "WiFi Rollout",
    body: "End-to-end managed deployments for offices, estates and campuses. Planning, hardware, installation and monitoring.",
  },
  {
    icon: "bi-people-fill",
    title: "Hotspot Solutions",
    body: "Captive portals, guest WiFi and venue connectivity for retail, hospitality and events. We handle the complexity.",
  },
];

export default function WispBusinessSection() {
  return (
    <section
      id="business"
      className="wisp-section wisp-diagonal"
      style={{
        minHeight: "100vh",
        background: "#0a1628",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        padding: "80px max(5vw, 40px)",
        position: "relative",
      }}
    >
      <span className="wisp-ghost-num" style={{ color: "#ffffff" }}>04</span>

      <div className="container-fluid px-0">
        <div className="row mb-5">
          <div className="col-lg-7">
            <p className="wisp-tag" style={{ color: "rgba(255,255,255,0.4)" }}>Business & Enterprise</p>
            <h2
              style={{
                fontSize: "clamp(38px, 5vw, 64px)",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                lineHeight: 1.0,
                marginBottom: 16,
              }}
            >
              Your business.
              <br />
              <span style={{ color: "#dc2626" }}>Our backbone.</span>
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.45)", maxWidth: 480 }}>
              Business-ready infrastructure, local support and the full communication stack — delivered by a team that picks up the phone.
            </p>
          </div>
        </div>

        <div className="row g-4 mb-5">
          {CARDS.map((card) => (
            <div key={card.title} className="col-md-6 col-xl-3">
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "28px 24px",
                  height: "100%",
                  transition: "border-color 0.2s, background 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.5)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }}
              >
                <i className={`bi ${card.icon}`} style={{ fontSize: 28, color: "#dc2626", marginBottom: 16, display: "block" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{card.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.5)", margin: 0 }}>{card.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <a
            href="/contact"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              border: "1.5px solid rgba(255,255,255,0.3)",
              color: "#fff",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Talk to us about your business →
          </a>
        </div>
      </div>
    </section>
  );
}
