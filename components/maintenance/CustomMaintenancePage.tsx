"use client";

import React from "react";
import type { MaintenanceTheme } from "@/components/MaintenancePage";

export default function CustomMaintenancePage({ theme = {} }: { theme?: MaintenanceTheme }) {
  const { logoUrl, companyName = "", colorScheme = "light", customImage } = theme;
  const dark = colorScheme === "dark";

  const overlayBg = dark
    ? "rgba(0,0,0,0.62)"
    : "rgba(255,255,255,0.72)";

  const fallbackBg = dark ? "#111111" : "#f5f4f1";

  return (
    <div
      className="xmm-root"
      style={{
        backgroundImage:    customImage ? `url(${customImage})` : undefined,
        backgroundColor:    customImage ? undefined : fallbackBg,
        backgroundSize:     "cover",
        backgroundPosition: "center",
      }}
    >
      <style>{css}</style>

      {/* Overlay */}
      <div className="xmm-overlay" style={{ background: overlayBg }} />

      <div className={`xmm-content ${dark ? "xmm-dark" : "xmm-light"}`}>
        {logoUrl && (
          <div className="xmm-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName || "Logo"} className="xmm-logo" />
          </div>
        )}

        <div className="xmm-badge">
          <span className="xmm-dot" />
          Maintenance Mode
        </div>

        <h1 className="xmm-heading">Be Back Soon</h1>
        <p className="xmm-sub">Making things awesome &mdash; back shortly.</p>
      </div>

      {/* Scanning line at bottom */}
      <div className={`xmm-scan-wrap ${dark ? "xmm-scan-dark" : "xmm-scan-light"}`}>
        <div className="xmm-scan" />
      </div>
    </div>
  );
}

const css = `
.xmm-root {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
}
.xmm-overlay {
  position: absolute; inset: 0;
  backdrop-filter: blur(3px);
}
.xmm-content {
  position: relative; z-index: 1;
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  padding: 48px 32px; max-width: 480px; width: 100%;
}
.xmm-logo-wrap { margin-bottom: 24px; }
.xmm-logo {
  display: block; max-width: 200px; max-height: 64px;
  width: auto; height: auto; object-fit: contain;
}

/* Light */
.xmm-light .xmm-badge  { color: #555; }
.xmm-light .xmm-dot    { background: #999; }
.xmm-light .xmm-heading { color: #111; }
.xmm-light .xmm-sub    { color: #666; }

/* Dark */
.xmm-dark .xmm-badge   { color: rgba(255,255,255,0.5); }
.xmm-dark .xmm-dot     { background: rgba(255,255,255,0.5); }
.xmm-dark .xmm-heading  { color: #fff; text-shadow: 0 2px 20px rgba(0,0,0,0.4); }
.xmm-dark .xmm-sub     { color: rgba(255,255,255,0.65); }

.xmm-badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 0.67rem; font-weight: 600;
  letter-spacing: 0.28em; text-transform: uppercase;
  margin-bottom: 12px;
}
.xmm-dot {
  width: 5px; height: 5px; border-radius: 50%;
  animation: xmm-pulse 2.4s ease-in-out infinite;
}
@keyframes xmm-pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.2 } }
.xmm-heading {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 900; letter-spacing: -0.01em;
  margin: 0 0 12px; line-height: 1.1;
}
.xmm-sub {
  font-size: 1rem; line-height: 1.7; margin: 0;
}

/* Scanning line */
.xmm-scan-wrap {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 2px; overflow: hidden; z-index: 2;
}
.xmm-scan-light { background: rgba(0,0,0,0.1); }
.xmm-scan-dark  { background: rgba(255,255,255,0.1); }
.xmm-scan {
  height: 100%; width: 30%;
  animation: xmm-sweep 2.2s ease-in-out infinite;
}
.xmm-scan-light .xmm-scan { background: linear-gradient(90deg,transparent,#333,transparent); }
.xmm-scan-dark  .xmm-scan { background: linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent); }
@keyframes xmm-sweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(430%); }
}
`;
