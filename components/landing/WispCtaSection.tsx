"use client";

export default function WispCtaSection() {
  return (
    <section
      id="contact"
      className="wisp-section"
      style={{
        minHeight: "100vh",
        background: "#dc2626",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        padding: "80px max(5vw, 40px)",
        position: "relative",
      }}
    >
      <span className="wisp-ghost-num" style={{ color: "#ffffff" }}>07</span>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680 }}>
        <p className="wisp-tag" style={{ color: "rgba(255,255,255,0.6)" }}>Get Started</p>
        <h2
          style={{
            fontSize: "clamp(38px, 5vw, 64px)",
            fontWeight: 900,
            letterSpacing: "-1.5px",
            lineHeight: 1.0,
            marginBottom: 20,
          }}
        >
          Ready to get connected?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", maxWidth: 460, marginBottom: 36 }}>
          Check your address, or talk to our local team directly.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48 }}>
          <a
            href="#coverage"
            style={{
              padding: "14px 32px",
              background: "#ffffff",
              color: "#dc2626",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Check my coverage
          </a>
          <a
            href="/contact"
            style={{
              padding: "14px 32px",
              border: "1.5px solid rgba(255,255,255,0.5)",
              color: "#ffffff",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Contact us
          </a>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            { icon: "bi-whatsapp", label: "WhatsApp" },
            { icon: "bi-envelope", label: "Email" },
            { icon: "bi-telephone", label: "Phone" },
          ].map(({ icon, label }) => (
            <span
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}
            >
              <i className={`bi ${icon}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
