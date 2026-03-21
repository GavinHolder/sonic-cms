"use client";

import React from "react";
import type { MaintenanceTheme } from "@/components/MaintenancePage";

export default function PlainMaintenancePage({ theme = {} }: { theme?: MaintenanceTheme }) {
  const { logoUrl, companyName = "", colorScheme = "light" } = theme;
  const dark = colorScheme === "dark";

  return (
    <div className={`pmm-root ${dark ? "pmm-dark" : "pmm-light"}`}>
      <style>{css}</style>

      <div className="pmm-inner">
        {logoUrl && (
          <div className="pmm-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName || "Logo"} className="pmm-logo" />
          </div>
        )}

        <div className="pmm-badge">
          <span className="pmm-dot" />
          Maintenance Mode
        </div>

        <h1 className="pmm-heading">We'll Be Right Back</h1>

        <p className="pmm-sub">
          Making things awesome &mdash; back shortly.
        </p>
      </div>

      {/* Single subtle animation: thin scanning line at bottom */}
      <div className="pmm-scan-wrap">
        <div className="pmm-scan" />
      </div>
    </div>
  );
}

const css = `
/* ── Base ─────────────────────────────────────────────────────────────────── */
.pmm-root {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
}

/* ── Light (default) ──────────────────────────────────────────────────────── */
.pmm-light { background: #ffffff; }

.pmm-light .pmm-logo-wrap {
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 28px; margin-bottom: 28px;
}
.pmm-light .pmm-badge  { color: #888; }
.pmm-light .pmm-dot    { background: #aaa; }
.pmm-light .pmm-heading { color: #111111; }
.pmm-light .pmm-sub    { color: #777; }
.pmm-light .pmm-scan-wrap { background: #e8e8e8; }
.pmm-light .pmm-scan   { background: linear-gradient(90deg, transparent, #555, transparent); }

/* ── Dark ─────────────────────────────────────────────────────────────────── */
.pmm-dark  { background: #111111; }

.pmm-dark .pmm-logo-wrap {
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 28px; margin-bottom: 28px;
}
.pmm-dark .pmm-badge   { color: #555; }
.pmm-dark .pmm-dot     { background: #555; }
.pmm-dark .pmm-heading  { color: #f0f0f0; }
.pmm-dark .pmm-sub     { color: #555; }
.pmm-dark .pmm-scan-wrap { background: rgba(255,255,255,0.06); }
.pmm-dark .pmm-scan    { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); }

/* ── Layout ───────────────────────────────────────────────────────────────── */
.pmm-inner {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  padding: 0 32px; max-width: 480px; width: 100%;
}
.pmm-logo-wrap { width: 100%; display: flex; justify-content: center; }
.pmm-logo {
  display: block; max-width: 200px; max-height: 64px;
  width: auto; height: auto; object-fit: contain;
}

.pmm-badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.28em;
  text-transform: uppercase; margin-bottom: 18px;
}
.pmm-dot {
  width: 5px; height: 5px; border-radius: 50%;
  animation: pmm-pulse 2.4s ease-in-out infinite;
}
@keyframes pmm-pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.2 } }

.pmm-heading {
  font-size: clamp(2rem, 5.5vw, 3.2rem);
  font-weight: 800; letter-spacing: -0.02em;
  margin: 0 0 14px; line-height: 1.1;
}
.pmm-sub {
  font-size: 1rem; line-height: 1.7; margin: 0;
}

/* ── Scanning line ────────────────────────────────────────────────────────── */
.pmm-scan-wrap {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 2px; overflow: hidden;
}
.pmm-scan {
  height: 100%; width: 30%;
  animation: pmm-sweep 2.2s ease-in-out infinite;
}
@keyframes pmm-sweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(430%); }
}
`;
