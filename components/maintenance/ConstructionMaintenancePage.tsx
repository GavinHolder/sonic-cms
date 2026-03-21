"use client";

import React from "react";
import type { MaintenanceTheme } from "@/components/MaintenancePage";

export default function ConstructionMaintenancePage({ theme = {} }: { theme?: MaintenanceTheme }) {
  const {
    logoUrl,
    companyName = "",
    colorScheme  = "light",
    primaryColor = "#78BE20",
    darkColor    = "#53565A",
    lightColor   = "#BBBCBC",
  } = theme;

  const dark = colorScheme === "dark";

  return (
    <div
      className={`cmm-root ${dark ? "cmm-dark" : "cmm-light"}`}
      style={{
        "--mm-p": primaryColor,
        "--mm-d": darkColor,
        "--mm-l": lightColor,
      } as React.CSSProperties}
    >
      <style>{css}</style>

      {/* Hazard tape — top */}
      <div className="cmm-tape cmm-tape-top" aria-hidden="true" />

      <div className="cmm-content">
        {logoUrl && (
          <div className="cmm-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName || "Logo"} className="cmm-logo" />
          </div>
        )}

        <div className="cmm-badge">
          <span className="cmm-dot" />
          Under Maintenance
        </div>

        <h1 className="cmm-heading">Under Construction</h1>

        {/* Mixer truck — drum rotation only, no wheel spin, no smoke */}
        <div className="cmm-scene" aria-hidden="true">
          <div className="cmm-ground" />
          <div className="cmm-chassis" />
          <div className="cmm-cab">
            <div className="cmm-windshield" />
            <div className="cmm-door" />
          </div>
          <div className="cmm-drum" />
          <div className="cmm-chute" />
          {/* Static wheels — no spin animation */}
          <div className="cmm-wheel cmm-wf"><div className="cmm-hub" /></div>
          <div className="cmm-wheel cmm-wr1"><div className="cmm-hub" /></div>
          <div className="cmm-wheel cmm-wr2"><div className="cmm-hub" /></div>
        </div>

        <p className="cmm-sub">Making things awesome &mdash; back shortly.</p>
      </div>

      {/* Hazard tape — bottom */}
      <div className="cmm-tape cmm-tape-bottom" aria-hidden="true" />
    </div>
  );
}

const css = `
/* ── Root ─────────────────────────────────────────────────────────────────── */
.cmm-root {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  overflow: hidden;
}

/* ── Light ─────────────────────────────────────────────────────────────────── */
.cmm-light {
  background: #f4f1ec;
  /* Subtle concrete grain */
  background-image: repeating-linear-gradient(
    0deg, transparent 0px, transparent 4px,
    rgba(0,0,0,0.018) 4px, rgba(0,0,0,0.018) 5px
  );
}
.cmm-light .cmm-tape {
  background: repeating-linear-gradient(
    -50deg,
    #f59e0b 0px, #f59e0b 20px,
    #1a1a1a 20px, #1a1a1a 40px
  );
  opacity: 0.75;
}
.cmm-light .cmm-badge  { color: #888; }
.cmm-light .cmm-dot    { background: #aaa; }
.cmm-light .cmm-heading { color: #1a1a1a; }
.cmm-light .cmm-sub    { color: #888; }
.cmm-light .cmm-ground { background: #d0cab8; }
.cmm-light .cmm-chassis { background: linear-gradient(180deg, var(--mm-d) 0%, #888 100%); }
.cmm-light .cmm-drum   {
  background: repeating-linear-gradient(
    -55deg,
    var(--mm-d) 0px, var(--mm-d) 14px,
    #9a9a9a 14px, #9a9a9a 28px
  );
  border-color: #ccc;
}
.cmm-light .cmm-wheel  { border-color: var(--mm-d); background: #ddd; }
.cmm-light .cmm-hub::before { background: #aaa; border-color: #888; }

/* ── Dark ─────────────────────────────────────────────────────────────────── */
.cmm-dark {
  background: #0f0f0f;
  background-image:
    repeating-linear-gradient(0deg,
      transparent 0px, transparent 3px,
      rgba(255,255,255,0.011) 3px, rgba(255,255,255,0.011) 4px);
}
.cmm-dark .cmm-tape {
  background: repeating-linear-gradient(
    -50deg,
    var(--mm-p) 0px, var(--mm-p) 20px,
    #111 20px, #111 40px
  );
  opacity: 0.85;
}
.cmm-dark .cmm-badge   { color: var(--mm-p); }
.cmm-dark .cmm-dot     { background: var(--mm-p); }
.cmm-dark .cmm-heading  { color: #f0f0f0; }
.cmm-dark .cmm-sub     { color: var(--mm-l); }
.cmm-dark .cmm-ground  { background: linear-gradient(90deg, #1a1a1a, var(--mm-d) 50%, #1a1a1a); }
.cmm-dark .cmm-chassis { background: linear-gradient(180deg, var(--mm-d) 0%, #1c1c1c 100%); }
.cmm-dark .cmm-drum    {
  background: repeating-linear-gradient(
    -55deg,
    var(--mm-d) 0px, var(--mm-d) 14px,
    #383838 14px, #383838 28px
  );
  border-color: #1a1a1a;
  border-right-color: #5c5c5c;
}
.cmm-dark .cmm-wheel   { border-color: var(--mm-d); background: #111; }
.cmm-dark .cmm-hub::before { background: #444; border-color: #666; }

/* ── Hazard tape ───────────────────────────────────────────────────────────── */
.cmm-tape {
  position: fixed; left: 0; right: 0; height: 36px;
}
.cmm-tape-top    { top: 0; }
.cmm-tape-bottom { bottom: 0; }

/* ── Content ───────────────────────────────────────────────────────────────── */
.cmm-content {
  display: flex; flex-direction: column;
  align-items: center; z-index: 1;
  padding: 56px 24px;
  width: 100%; max-width: 500px;
}
.cmm-logo-wrap {
  margin-bottom: 20px;
  padding: 8px 18px;
}
.cmm-logo {
  display: block; max-width: 200px; max-height: 60px;
  width: auto; height: auto; object-fit: contain;
}
.cmm-badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 0.67rem; font-weight: 600;
  letter-spacing: 0.28em; text-transform: uppercase;
  margin-bottom: 10px;
}
.cmm-dot {
  width: 5px; height: 5px; border-radius: 50%;
  animation: cmm-pulse 2.4s ease-in-out infinite;
}
@keyframes cmm-pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.2 } }

.cmm-heading {
  font-size: clamp(2rem, 7vw, 3.8rem);
  font-weight: 900; letter-spacing: 0.02em;
  text-transform: uppercase; margin: 0 0 20px; line-height: 1;
}

/* ── Truck scene ───────────────────────────────────────────────────────────── */
.cmm-scene {
  position: relative; width: 300px; height: 130px;
  margin-bottom: 18px; flex-shrink: 0;
}
.cmm-ground {
  position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
  border-radius: 2px;
}
.cmm-chassis {
  position: absolute; bottom: 4px; left: 10px;
  width: 272px; height: 26px;
  border-radius: 3px 2px 2px 3px;
  border-top: 2px solid rgba(255,255,255,0.12);
}
.cmm-cab {
  position: absolute; bottom: 30px; left: 10px;
  width: 76px; height: 58px;
  background: linear-gradient(160deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%);
  border-radius: 5px 3px 2px 2px;
  border-right: 3px solid #b45309;
}
.cmm-cab::before {
  content: '';
  position: absolute; top: -10px; left: 0; right: -3px; height: 14px;
  background: linear-gradient(180deg, #fbbf24, #f59e0b);
  border-radius: 6px 6px 0 0;
}
.cmm-cab::after {
  content: '';
  position: absolute; top: 16px; left: -5px;
  width: 7px; height: 12px;
  background: rgba(255,250,180,0.95);
  border-radius: 2px 0 0 2px;
  box-shadow: -5px 0 12px rgba(255,248,100,0.4);
}
.cmm-windshield {
  position: absolute; top: 5px; left: 5px;
  width: 28px; height: 38px;
  background: linear-gradient(135deg, rgba(140,210,235,0.8), rgba(50,120,200,0.5));
  border-radius: 3px 2px 2px 3px;
  border: 1px solid rgba(255,255,255,0.2);
}
.cmm-door {
  position: absolute; bottom: 5px; right: 4px;
  width: 34px; height: 28px;
  border: 1px solid rgba(0,0,0,0.14); border-radius: 2px;
}

/* Drum — one rotation animation only */
.cmm-drum {
  position: absolute; bottom: 30px; left: 78px;
  width: 135px; height: 72px;
  border-radius: 8px 48px 48px 8px;
  border: 3px solid;
  animation: cmm-roll 3s linear infinite;
  box-shadow: inset 0 0 18px rgba(0,0,0,0.3);
}
@keyframes cmm-roll {
  from { background-position: 0 0; }
  to   { background-position: 56px 56px; }
}

.cmm-chute {
  position: absolute; bottom: 36px; left: 202px;
  width: 48px; height: 9px;
  background: #888; border-radius: 2px 3px 3px 2px;
  transform: rotate(28deg); transform-origin: 0% 50%;
  border: 1px solid #555;
}
.cmm-chute::after {
  content: '';
  position: absolute; right: -3px; bottom: -5px;
  width: 10px; height: 8px;
  background: var(--mm-p);
  border-radius: 2px 3px 5px 2px; opacity: 0.7;
}

/* Wheels — static, no spin */
.cmm-wheel {
  position: absolute; bottom: -1px;
  width: 34px; height: 34px;
  border-radius: 50%;
  border: 4px solid;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}
.cmm-hub {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.cmm-hub::before {
  content: '';
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid;
}
.cmm-wf  { left: 32px; }
.cmm-wr1 { left: 174px; }
.cmm-wr2 { left: 202px; }

/* ── Subtitle ─────────────────────────────────────────────────────────────── */
.cmm-sub {
  font-size: clamp(0.875rem, 2vw, 1rem);
  text-align: center; margin: 0; line-height: 1.7;
}

@media (max-width: 360px) {
  .cmm-scene { transform: scale(0.82); transform-origin: center top; }
}
`;
