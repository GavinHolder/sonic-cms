"use client";

/**
 * Maintenance Mode — Construction Template
 *
 * Full-screen page shown to all public visitors when maintenance_mode is enabled.
 * Admin routes (/admin, /api) bypass this entirely.
 *
 * Theming via CSS custom properties — pass `theme` props from layout.tsx to
 * override brand colours. Defaults: Pantone 2290 C / Cool Gray 11 C / Cool Gray 4 C.
 * Suitable for any concrete / civil / heavy-industry company.
 */

export interface MaintenanceTheme {
  logoUrl?: string;
  companyName?: string;
  /** Pantone 2290 C default: #78BE20 */
  primaryColor?: string;
  /** Pantone Cool Gray 11 C default: #53565A */
  darkColor?: string;
  /** Pantone Cool Gray 4 C default: #BBBCBC */
  lightColor?: string;
}

export default function MaintenancePage({ theme = {} }: { theme?: MaintenanceTheme }) {
  const {
    logoUrl,
    companyName = "",
    primaryColor = "#78BE20",
    darkColor = "#53565A",
    lightColor = "#BBBCBC",
  } = theme;

  return (
    <div
      className="mm-root"
      style={{
        "--mm-p": primaryColor,
        "--mm-d": darkColor,
        "--mm-l": lightColor,
      } as React.CSSProperties}
    >
      <style>{css}</style>

      {/* Hazard tape — top */}
      <div className="mm-hazard mm-hazard-top" aria-hidden="true" />

      {/* Main content */}
      <div className="mm-content">

        {/* Logo */}
        {logoUrl && (
          <div className="mm-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName || "Logo"} className="mm-logo" />
          </div>
        )}

        {/* Blinking badge */}
        <div className="mm-badge" aria-label="Maintenance mode active">
          <span className="mm-badge-dot" aria-hidden="true" />
          Maintenance Mode
        </div>

        {/* Heading */}
        <h1 className="mm-heading">
          <span className="mm-h-under">Under</span>
          <span className="mm-h-main">Construction</span>
        </h1>

        {/* ── CSS Concrete Mixer Truck ── */}
        <div className="mm-scene" aria-hidden="true">
          {/* Ground + shadow */}
          <div className="mm-ground" />
          <div className="mm-shadow" />

          {/* Chassis / frame */}
          <div className="mm-chassis" />

          {/* Cab — ::before = roof cap, ::after = headlight */}
          <div className="mm-cab">
            <div className="mm-windshield" />
            <div className="mm-door" />
          </div>

          {/* Exhaust pipe + smoke */}
          <div className="mm-exhaust" />
          <div className="mm-smoke mm-s1" />
          <div className="mm-smoke mm-s2" />
          <div className="mm-smoke mm-s3" />

          {/* Rotating drum — background-position animation simulates rotation */}
          <div className="mm-drum" />

          {/* Discharge chute — ::after = concrete drip in primary colour */}
          <div className="mm-chute" />

          {/* Rear guard */}
          <div className="mm-rear-guard" />

          {/* Three wheels (front + dual rear) */}
          <div className="mm-wheel mm-wf"><div className="mm-hub" /></div>
          <div className="mm-wheel mm-wr1"><div className="mm-hub" /></div>
          <div className="mm-wheel mm-wr2"><div className="mm-hub" /></div>
        </div>

        {/* Body copy */}
        <p className="mm-sub">
          We&rsquo;re mixing something better &mdash; back shortly.
        </p>

        {/* Animated progress bar */}
        <div className="mm-bar-wrap">
          <div className="mm-bar">
            <div className="mm-bar-fill" />
          </div>
          <span className="mm-bar-label">Mixing in progress&hellip;</span>
        </div>

      </div>

      {/* Hazard tape — bottom */}
      <div className="mm-hazard mm-hazard-bottom" aria-hidden="true" />
    </div>
  );
}

/* ─── CSS ─────────────────────────────────────────────────────────────────── */

const css = `
/* ── Root ─────────────────────────────────────────────────────────────────── */
.mm-root {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: hidden;
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  /* Dark concrete texture */
  background-color: #0f0f0f;
  background-image:
    repeating-linear-gradient(0deg,
      transparent 0px, transparent 3px,
      rgba(255,255,255,0.011) 3px, rgba(255,255,255,0.011) 4px),
    repeating-linear-gradient(90deg,
      transparent 0px, transparent 7px,
      rgba(255,255,255,0.006) 7px, rgba(255,255,255,0.006) 8px);
}

/* ── Hazard tape ───────────────────────────────────────────────────────────── */
.mm-hazard {
  position: fixed; left: 0; right: 0; height: 42px;
  background: repeating-linear-gradient(
    -50deg,
    var(--mm-p) 0px,   var(--mm-p) 21px,
    #111       21px,   #111       42px
  );
  opacity: 0.9;
}
.mm-hazard-top    { top: 0; }
.mm-hazard-bottom { bottom: 0; }

/* ── Content ───────────────────────────────────────────────────────────────── */
.mm-content {
  display: flex; flex-direction: column;
  align-items: center; z-index: 1;
  padding: 60px 24px;
  width: 100%; max-width: 480px;
}

/* ── Logo ─────────────────────────────────────────────────────────────────── */
.mm-logo-wrap {
  margin-bottom: 18px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.07);
}
.mm-logo {
  display: block;
  max-width: 200px; max-height: 56px;
  width: auto; height: auto;
  object-fit: contain;
}

/* ── Badge ─────────────────────────────────────────────────────────────────── */
.mm-badge {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.67rem; font-weight: 700; letter-spacing: 0.32em;
  text-transform: uppercase; color: var(--mm-p);
  margin-bottom: 10px;
}
.mm-badge-dot {
  width: 6px; height: 6px;
  background: var(--mm-p); border-radius: 50%;
  animation: mm-blink 1.5s step-start infinite;
}
@keyframes mm-blink { 0%,100%{ opacity:1 } 50%{ opacity:0 } }

/* ── Heading ───────────────────────────────────────────────────────────────── */
.mm-heading {
  margin: 0 0 20px; text-align: center; line-height: 1;
  display: flex; flex-direction: column; align-items: center;
}
.mm-h-under {
  font-size: clamp(0.8rem, 2.2vw, 1.1rem);
  font-weight: 300; letter-spacing: 0.65em;
  text-transform: uppercase; color: var(--mm-l);
  margin-bottom: 2px;
}
.mm-h-main {
  font-size: clamp(2.4rem, 8.5vw, 5.5rem);
  font-weight: 900; letter-spacing: 0.04em;
  text-transform: uppercase; color: #f5f5f5;
  text-shadow: 0 3px 0 rgba(0,0,0,0.8), 0 0 60px rgba(120,190,32,0.08);
  -webkit-text-stroke: 2px rgba(120,190,32,0.28);
}

/* ── Truck scene ───────────────────────────────────────────────────────────── */
/*
  Scene: 340 × 140px. All truck parts absolutely positioned within.
  Truck faces LEFT (cab on left = front). Drum behind, chute at rear-right.

  Vertical reference (from scene bottom=0):
    Ground:   0 – 5 px
    Chassis:  5 – 33 px  (height 28)
    Cab:      33 – 97 px (height 64)  left: 12
    Drum:     33 – 113px (height 80)  left: 88
    Exhaust:  97 – 129px              left: 70
    Wheels:  bottom: -1px (straddle ground/chassis)
*/
.mm-scene {
  position: relative;
  width: 340px; height: 140px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

/* Ground strip */
.mm-ground {
  position: absolute; bottom: 0; left: 0; right: 0; height: 5px;
  background: linear-gradient(90deg, #1a1a1a, var(--mm-d) 35%, #454545 65%, #1a1a1a);
  border-radius: 3px;
}

/* Ground shadow under truck */
.mm-shadow {
  position: absolute; bottom: 3px; left: 50px;
  width: 240px; height: 8px;
  background: rgba(0,0,0,0.65); border-radius: 50%;
  filter: blur(4px);
}

/* Chassis / frame */
.mm-chassis {
  position: absolute; bottom: 5px; left: 12px;
  width: 308px; height: 28px;
  background: linear-gradient(180deg, var(--mm-d) 0%, #1c1c1c 100%);
  border-radius: 3px 2px 2px 3px;
  border-top: 2px solid #666;
}

/* Cab body */
.mm-cab {
  position: absolute; bottom: 33px; left: 12px;
  width: 84px; height: 64px;
  background: linear-gradient(170deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%);
  border-radius: 5px 3px 2px 2px;
  border-right: 3px solid #b45309;
}
/* Cab roof cap */
.mm-cab::before {
  content: '';
  position: absolute; top: -12px; left: 0; right: -3px;
  height: 16px;
  background: linear-gradient(180deg, #fbbf24, #f59e0b);
  border-radius: 7px 7px 0 0;
  border-top: 2px solid #d97706;
}
/* Headlight */
.mm-cab::after {
  content: '';
  position: absolute; top: 18px; left: -6px;
  width: 8px; height: 14px;
  background: rgba(255,250,180,0.95);
  border-radius: 2px 0 0 2px;
  box-shadow: -6px 0 14px rgba(255,248,100,0.55);
}

/* Windshield */
.mm-windshield {
  position: absolute; top: 5px; left: 5px;
  width: 32px; height: 44px;
  background: linear-gradient(135deg, rgba(140,210,235,0.8), rgba(50,120,200,0.5));
  border-radius: 3px 2px 2px 3px;
  border: 1.5px solid rgba(255,255,255,0.28);
}
.mm-windshield::after {
  content: '';
  position: absolute; top: 5px; left: 4px;
  width: 9px; height: 14px;
  background: rgba(255,255,255,0.38);
  border-radius: 2px; transform: skewX(-6deg);
}

/* Door */
.mm-door {
  position: absolute; bottom: 6px; right: 5px;
  width: 38px; height: 32px;
  border: 1.5px solid rgba(0,0,0,0.16);
  border-radius: 2px;
}
.mm-door::after {
  content: '';
  position: absolute; top: 50%; right: 5px;
  width: 8px; height: 3px; margin-top: -1.5px;
  background: rgba(0,0,0,0.2); border-radius: 2px;
}

/* Exhaust pipe */
.mm-exhaust {
  position: absolute; bottom: 97px; left: 70px;
  width: 9px; height: 32px;
  background: linear-gradient(90deg, #555, var(--mm-d));
  border-radius: 4px 4px 2px 2px;
}
.mm-exhaust::before {
  content: '';
  position: absolute; top: -5px; left: -2px;
  width: 13px; height: 8px;
  background: var(--mm-d); border-radius: 6px 6px 0 0;
}

/* Smoke puffs */
.mm-smoke {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(200,200,200,0.18) 0%, transparent 70%);
  animation: mm-puff 2.4s ease-out infinite;
}
.mm-s1 { width: 14px; height: 14px; left: 66px; bottom: 112px; animation-delay: 0s; }
.mm-s2 { width: 20px; height: 20px; left: 62px; bottom: 122px; animation-delay: 0.75s; }
.mm-s3 { width: 28px; height: 28px; left: 57px; bottom: 133px; animation-delay: 1.5s; }
@keyframes mm-puff {
  0%   { opacity: 0.5;  transform: scale(1)   translateY(0);   }
  100% { opacity: 0;    transform: scale(2.2) translateY(-16px); }
}

/* Mixer drum — background-position scrolls to simulate rotation */
.mm-drum {
  position: absolute; bottom: 33px; left: 88px;
  width: 152px; height: 80px;
  background: repeating-linear-gradient(
    -55deg,
    var(--mm-d)  0px, var(--mm-d)  14px,
    #383838      14px, #383838     28px
  );
  border-radius: 10px 55px 55px 10px;
  border: 3px solid #1a1a1a;
  border-right-color: #5c5c5c;
  animation: mm-roll 2s linear infinite;
  box-shadow: inset 0 0 22px rgba(0,0,0,0.4);
}
.mm-drum::before {
  content: '';
  position: absolute; top: 8px; left: 8px; right: 12px; bottom: 8px;
  border-radius: 6px 44px 44px 6px;
  border: 1px solid rgba(255,255,255,0.055);
}
@keyframes mm-roll {
  from { background-position: 0 0; }
  to   { background-position: 56px 56px; }
}

/* Discharge chute */
.mm-chute {
  position: absolute; bottom: 40px; left: 228px;
  width: 55px; height: 10px;
  background: #666;
  border-radius: 2px 3px 4px 2px;
  transform: rotate(28deg); transform-origin: 0% 50%;
  border: 1px solid #333;
}
/* Concrete drip at chute tip in primary colour */
.mm-chute::after {
  content: '';
  position: absolute; right: -4px; bottom: -6px;
  width: 12px; height: 9px;
  background: var(--mm-p);
  border-radius: 2px 4px 6px 2px;
  opacity: 0.75;
}

/* Rear guard */
.mm-rear-guard {
  position: absolute; bottom: 5px; right: 10px;
  width: 12px; height: 22px;
  background: var(--mm-d);
  border-left: 2px solid #666;
  border-radius: 0 2px 2px 0;
}

/* Wheels */
.mm-wheel {
  position: absolute; bottom: -1px;
  width: 38px; height: 38px;
  background: #111; border-radius: 50%;
  border: 4px solid var(--mm-d);
  box-shadow: inset 0 0 0 4px #1a1a1a, 0 2px 6px rgba(0,0,0,0.65);
  animation: mm-spin 2s linear infinite;
}
@keyframes mm-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.mm-hub {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.mm-hub::before {
  content: '';
  width: 14px; height: 14px;
  background: #444; border-radius: 50%;
  border: 2px solid #666;
  box-shadow: 0 0 0 2px #1a1a1a;
}
.mm-wf  { left: 38px; }
.mm-wr1 { left: 195px; }
.mm-wr2 { left: 226px; }

/* ── Subtitle ─────────────────────────────────────────────────────────────── */
.mm-sub {
  font-size: clamp(0.9rem, 2.4vw, 1.1rem);
  color: var(--mm-l);
  text-align: center; margin: 0 0 18px; line-height: 1.75;
}

/* ── Progress bar ─────────────────────────────────────────────────────────── */
.mm-bar-wrap {
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  width: 100%; max-width: 300px;
}
.mm-bar {
  width: 100%; height: 5px;
  background: rgba(255,255,255,0.07);
  border-radius: 3px; overflow: hidden;
}
.mm-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3d6b0a, var(--mm-p), #a8d840);
  border-radius: 3px;
  animation: mm-pour 3.5s ease-in-out infinite;
}
@keyframes mm-pour {
  0%,100% { width: 18%; }
  50%     { width: 86%; }
}
.mm-bar-label {
  font-size: 0.68rem; letter-spacing: 0.2em;
  text-transform: uppercase; color: #4a4a4a; font-weight: 600;
}

/* ── Mobile ───────────────────────────────────────────────────────────────── */
@media (max-width: 380px) {
  .mm-scene { transform: scale(0.85); transform-origin: center top; }
  .mm-h-main { font-size: 2.4rem; }
}
`;
