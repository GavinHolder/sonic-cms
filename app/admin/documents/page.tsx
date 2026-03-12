"use client";

import { useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import { DOC_TOPICS, DocTopic } from "@/lib/admin/docs-content";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

const Markdown = dynamic(() => import("react-markdown"), { ssr: false });

// ─── Utils ───────────────────────────────────────────────────────────────
function flattenTopics(topics: DocTopic[]): DocTopic[] {
  return topics.flatMap((t) => [
    ...(t.content ? [t] : []),
    ...(t.children ? flattenTopics(t.children) : []),
  ]);
}
function findById(topics: DocTopic[], id: string): DocTopic | null {
  for (const t of topics) {
    if (t.id === id) return t;
    if (t.children) { const f = findById(t.children, id); if (f) return f; }
  }
  return null;
}
function findParent(topics: DocTopic[], childId: string): DocTopic | null {
  for (const t of topics) {
    if (t.children?.some((c) => c.id === childId)) return t;
    if (t.children) { const f = findParent(t.children, childId); if (f) return f; }
  }
  return null;
}

// ─── SVG Illustrations ───────────────────────────────────────────────────
function ArchitectureDiagram() {
  // Perfectly centred: 3×160px boxes + 2×60px gaps = 600px total, 40px margin each side in 680px viewBox
  const boxes = [
    { x: 40,  cx: 120, label: "Landing Page",  sub: "/",      color: "#0d6efd" },
    { x: 260, cx: 340, label: "Dynamic Pages", sub: "/slug",  color: "#6610f2" },
    { x: 480, cx: 560, label: "Admin Panel",   sub: "/admin", color: "#198754" },
  ];
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 680 300" style={{ width: "100%", maxHeight: 260 }}>
        <defs>
          {/* Open chevron arrowhead — clean, antialiased, not a filled polygon */}
          <marker id="archArrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M2,2 L9,6 L2,10" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
        </defs>
        {/* Background */}
        <rect x="0" y="0" width="680" height="300" rx="12" fill="#f8f9fa" />
        {/* Title */}
        <text x="340" y="15" textAnchor="middle" fill="#9ca3af" fontSize="10" fontWeight="600" letterSpacing="0.8">CMS ARCHITECTURE</text>
        {/* Top row: 3 equally spaced boxes */}
        {boxes.map(({ x, label, sub, color }) => (
          <g key={label}>
            <rect x={x} y={24} width={160} height={66} rx="8" fill={color} opacity="0.10" stroke={color} strokeWidth="1.5" />
            <rect x={x} y={24} width={160} height={7} rx="3.5" fill={color} />
            <text x={x + 80} y={62} textAnchor="middle" fill={color} fontSize="13" fontWeight="700">{label}</text>
            <text x={x + 80} y={79} textAnchor="middle" fill={color} fontSize="11" opacity="0.75">{sub}</text>
          </g>
        ))}
        {/* Horizontal connector at mid-point between boxes and API */}
        <line x1={120} y1={118} x2={560} y2={118} stroke="#9ca3af" strokeWidth="1.4" strokeDasharray="5,4" />
        {/* Vertical dashed lines from each box down to API box, with clean chevron arrows */}
        {boxes.map(({ cx }) => (
          <line key={cx} x1={cx} y1={90} x2={cx} y2={149}
            stroke="#9ca3af" strokeWidth="1.4" strokeDasharray="5,4"
            markerEnd="url(#archArrow)" />
        ))}
        {/* Section API box — centred at x=340 */}
        <rect x="240" y="152" width="200" height="52" rx="8" fill="#0d6efd" opacity="0.10" stroke="#0d6efd" strokeWidth="1.5" />
        <rect x="240" y="152" width="200" height="7" rx="3.5" fill="#0d6efd" />
        <text x="340" y="184" textAnchor="middle" fill="#0d6efd" fontSize="13" fontWeight="700">Section API</text>
        <text x="340" y="198" textAnchor="middle" fill="#0d6efd" fontSize="11" opacity="0.75">/api/sections</text>
        {/* Arrow: API → DB */}
        <line x1={340} y1={204} x2={340} y2={244}
          stroke="#9ca3af" strokeWidth="1.4"
          markerEnd="url(#archArrow)" />
        {/* PostgreSQL DB box — centred at x=340 */}
        <rect x="200" y="247" width="280" height="46" rx="8" fill="#198754" opacity="0.10" stroke="#198754" strokeWidth="1.5" />
        <rect x="200" y="247" width="280" height="7" rx="3.5" fill="#198754" />
        <text x="340" y="276" textAnchor="middle" fill="#198754" fontSize="13" fontWeight="700">PostgreSQL Database</text>
        <text x="340" y="289" textAnchor="middle" fill="#198754" fontSize="11" opacity="0.75">via Prisma ORM</text>
      </svg>
    </div>
  );
}

function SectionStackDiagram() {
  const layers = [
    { label: "Hero Carousel", color: "#0d6efd", icon: "🎠" },
    { label: "Section 1 (Content)", color: "#6610f2", icon: "📄" },
    { label: "Section 2 (Cards)", color: "#0dcaf0", icon: "🃏" },
    { label: "Section 3 (Stats)", color: "#198754", icon: "📊" },
    { label: "Footer", color: "#6c757d", icon: "🔗" },
  ];
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 600 240" style={{ width: "100%", maxHeight: 200 }}>
        <rect x="0" y="0" width="600" height="240" rx="12" fill="#f8f9fa" />
        <text x="300" y="18" textAnchor="middle" fill="#6c757d" fontSize="10" fontWeight="500">LANDING PAGE — SECTION STACK (top → bottom)</text>
        {layers.map(({ label, color, icon }, i) => (
          <g key={label}>
            <rect x={40} y={28 + i * 40} width={520} height={34} rx="6"
              fill={color} opacity={0.13} stroke={color} strokeWidth="1.5" />
            <rect x={40} y={28 + i * 40} width={6} height={34} rx="3" fill={color} />
            <text x={62} y={50 + i * 40} fill={color} fontSize="11" fontWeight="600">{icon} {label}</text>
            <text x={540} y={50 + i * 40} textAnchor="end" fill={color} fontSize="10" opacity="0.7">
              {["100vh · snap", "100vh · snap", "100vh · snap", "100vh · snap", "auto · snap"][i]}
            </text>
          </g>
        ))}
        <text x="300" y="232" textAnchor="middle" fill="#adb5bd" fontSize="9">Each section snaps into place — CSS scroll-snap-type: y mandatory</text>
      </svg>
    </div>
  );
}

function EditorTabsDiagram() {
  const tabs = [
    { label: "Content", icon: "✏️", color: "#0d6efd" },
    { label: "Background", icon: "🖼", color: "#6610f2" },
    { label: "Animation", icon: "✨", color: "#fd7e14" },
    { label: "Overlay", icon: "💬", color: "#0dcaf0" },
    { label: "Triangle", icon: "△", color: "#20c997" },
    { label: "Spacing", icon: "↔", color: "#6c757d" },
    { label: "Preview", icon: "👁", color: "#d63384" },
  ];
  const W = 86; const gap = 2;
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 640 180" style={{ width: "100%", maxHeight: 160 }}>
        <rect x="0" y="0" width="640" height="180" rx="12" fill="#f8f9fa" />
        <text x="320" y="18" textAnchor="middle" fill="#6c757d" fontSize="10" fontWeight="500">SECTION EDITOR — MODAL TABS</text>
        {tabs.map(({ label, icon, color }, i) => {
          const x = 10 + i * (W + gap);
          const isActive = i === 0;
          return (
            <g key={label}>
              <rect x={x} y={28} width={W} height={44} rx="6"
                fill={isActive ? color : "#fff"} stroke={color}
                strokeWidth={isActive ? 0 : 1.5} opacity={isActive ? 1 : 0.7} />
              <text x={x + W / 2} y={48} textAnchor="middle"
                fill={isActive ? "#fff" : color} fontSize="14">{icon}</text>
              <text x={x + W / 2} y={63} textAnchor="middle"
                fill={isActive ? "#fff" : color} fontSize="9" fontWeight="600">{label}</text>
            </g>
          );
        })}
        {/* Active tab content area */}
        <rect x="10" y="78" width="620" height="88" rx="6" fill="#fff" stroke="#dee2e6" strokeWidth="1.5" />
        <text x="320" y="108" textAnchor="middle" fill="#6c757d" fontSize="11">Selected tab content renders here</text>
        <text x="320" y="126" textAnchor="middle" fill="#adb5bd" fontSize="10">Configure heading, body text, images, cards, stats or CTA button</text>
        <rect x="20" y="138" width="180" height="20" rx="4" fill="#0d6efd" opacity="0.12" />
        <text x="110" y="152" textAnchor="middle" fill="#0d6efd" fontSize="9">Heading field</text>
        <rect x="210" y="138" width="180" height="20" rx="4" fill="#0d6efd" opacity="0.12" />
        <text x="300" y="152" textAnchor="middle" fill="#0d6efd" fontSize="9">Body text field</text>
        <rect x="400" y="138" width="100" height="20" rx="4" fill="#198754" opacity="0.2" />
        <text x="450" y="152" textAnchor="middle" fill="#198754" fontSize="9">Save ✓</text>
        <rect x="510" y="138" width="100" height="20" rx="4" fill="#dc3545" opacity="0.12" />
        <text x="560" y="152" textAnchor="middle" fill="#dc3545" fontSize="9">Cancel ✗</text>
      </svg>
    </div>
  );
}

function AnimBgLayerDiagram() {
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 600 200" style={{ width: "100%", maxHeight: 180 }}>
        <rect x="0" y="0" width="600" height="200" rx="12" fill="#f8f9fa" />
        <text x="300" y="18" textAnchor="middle" fill="#6c757d" fontSize="10" fontWeight="500">ANIMBD — LAYERED CANVAS SYSTEM</text>
        {/* Section content layer */}
        <rect x="20" y="28" width="360" height="155" rx="8" fill="#212529" stroke="#495057" strokeWidth="1.5" />
        <text x="200" y="46" textAnchor="middle" fill="#6c757d" fontSize="9">SECTION (content + background)</text>
        {/* Canvas layer 1 */}
        <rect x="30" y="52" width="340" height="35" rx="6" fill="#0d6efd" opacity="0.2" stroke="#0d6efd" strokeWidth="1" strokeDasharray="4,2" />
        <text x="200" y="73" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="600">Canvas Layer 1 — e.g. Particles</text>
        {/* Canvas layer 2 */}
        <rect x="30" y="93" width="340" height="35" rx="6" fill="#6610f2" opacity="0.2" stroke="#6610f2" strokeWidth="1" strokeDasharray="4,2" />
        <text x="200" y="114" textAnchor="middle" fill="#a78bfa" fontSize="10" fontWeight="600">Canvas Layer 2 — e.g. WiFi Pulse</text>
        {/* Canvas layer 3 */}
        <rect x="30" y="133" width="340" height="35" rx="6" fill="#fd7e14" opacity="0.15" stroke="#fd7e14" strokeWidth="1" strokeDasharray="4,2" />
        <text x="200" y="154" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="600">Canvas Layer 3 — e.g. Gradient</text>
        {/* Legend */}
        <rect x="400" y="30" width="185" height="140" rx="8" fill="#fff" stroke="#dee2e6" strokeWidth="1.5" />
        <text x="492" y="48" textAnchor="middle" fill="#212529" fontSize="10" fontWeight="700">Layer Settings</text>
        {[
          ["Type", "Particles"],
          ["Blend Mode", "screen"],
          ["Opacity", "0.7"],
          ["Speed", "0.5x"],
          ["Pause off-screen", "✓"],
          ["Max layers", "3"],
        ].map(([key, val], i) => (
          <g key={key}>
            <text x="410" y={65 + i * 17} fill="#6c757d" fontSize="9">{key}:</text>
            <text x="575" y={65 + i * 17} textAnchor="end" fill="#0d6efd" fontSize="9" fontWeight="600">{val}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function FlexibleDesignerDiagram() {
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 620 200" style={{ width: "100%", maxHeight: 180 }}>
        <rect x="0" y="0" width="620" height="200" rx="12" fill="#f8f9fa" />
        <text x="310" y="18" textAnchor="middle" fill="#6c757d" fontSize="10" fontWeight="500">FLEXIBLE SECTION DESIGNER LAYOUT</text>
        {/* Left elements panel */}
        <rect x="10" y="28" width="110" height="158" rx="6" fill="#fff" stroke="#dee2e6" strokeWidth="1.5" />
        <text x="65" y="44" textAnchor="middle" fill="#212529" fontSize="9" fontWeight="700">Elements</text>
        {["Text", "Image", "Button", "Card", "Video", "Banner", "Stats"].map((el, i) => (
          <g key={el}>
            <rect x="18" y={50 + i * 19} width="94" height="16" rx="4" fill="#0d6efd" opacity="0.1" stroke="#0d6efd" strokeWidth="0.8" />
            <text x="65" y={62 + i * 19} textAnchor="middle" fill="#0d6efd" fontSize="8.5">+ {el}</text>
          </g>
        ))}
        {/* Main canvas */}
        <rect x="128" y="28" width="360" height="158" rx="6" fill="#212529" stroke="#495057" strokeWidth="1.5" />
        <text x="308" y="46" textAnchor="middle" fill="#6c757d" fontSize="9">CANVAS (drag & drop)</text>
        {/* Example elements on canvas */}
        <rect x="138" y="52" width="340" height="28" rx="4" fill="#0d6efd" opacity="0.3" stroke="#0d6efd" strokeWidth="1" />
        <text x="308" y="70" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="600">Hero Text Element</text>
        <rect x="138" y="86" width="160" height="55" rx="4" fill="#6610f2" opacity="0.2" stroke="#6610f2" strokeWidth="1" />
        <text x="218" y="117" textAnchor="middle" fill="#c084fc" fontSize="8">Image</text>
        <rect x="306" y="86" width="172" height="55" rx="4" fill="#198754" opacity="0.15" stroke="#198754" strokeWidth="1" />
        <text x="392" y="117" textAnchor="middle" fill="#4ade80" fontSize="8">Content Block</text>
        <rect x="138" y="147" width="100" height="28" rx="4" fill="#0d6efd" opacity="0.8" />
        <text x="188" y="165" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Button</text>
        <rect x="248" y="147" width="230" height="28" rx="4" fill="#fd7e14" opacity="0.15" stroke="#fd7e14" strokeWidth="1" />
        <text x="363" y="165" textAnchor="middle" fill="#fb923c" fontSize="8">Stats Row</text>
        {/* Right settings panel */}
        <rect x="496" y="28" width="114" height="158" rx="6" fill="#fff" stroke="#dee2e6" strokeWidth="1.5" />
        <text x="553" y="44" textAnchor="middle" fill="#212529" fontSize="9" fontWeight="700">Properties</text>
        {["Font size", "Color", "Padding", "Animation", "Border"].map((prop, i) => (
          <g key={prop}>
            <text x="506" y={58 + i * 19} fill="#6c757d" fontSize="8">{prop}</text>
            <rect x="506" y={61 + i * 19} width="95" height="10" rx="3" fill="#f1f3f5" stroke="#dee2e6" strokeWidth="0.8" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function ElementStylingDiagram() {
  const tabs = ["Content", "Style", "Animate"];
  const styleFields = [
    { label: "Text Color", type: "swatch", color: "#6366f1" },
    { label: "BG Gradient", type: "gradient" },
    { label: "Border Color", type: "swatch", color: "#0d6efd" },
    { label: "Box Shadow", type: "select", val: "Large" },
    { label: "Visual Effect", type: "select", val: "Shimmer" },
  ];
  const animFields = [
    { label: "Scroll Animation", val: "Slide Up" },
  ];
  const effects = [
    { label: "Hover Glow", color: "#6366f1" },
    { label: "Shimmer Sweep", color: "#f59e0b" },
    { label: "RGB Glow", color: "#ec4899" },
    { label: "Pulse Glow", color: "#10b981" },
  ];
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 680 240" style={{ width: "100%", maxHeight: 220 }}>
        <defs>
          <linearGradient id="egCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f0c29" />
            <stop offset="50%" stopColor="#302b63" />
            <stop offset="100%" stopColor="#24243e" />
          </linearGradient>
          <linearGradient id="egShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="680" height="240" rx="12" fill="#f8f9fa" />
        <text x="340" y="16" textAnchor="middle" fill="#6c757d" fontSize="10" fontWeight="600" letterSpacing="0.8">ELEMENT BLOCK EDITOR — 3-TAB SYSTEM</text>

        {/* ── Left: Tab editor panel ── */}
        <rect x="12" y="24" width="260" height="202" rx="8" fill="#fff" stroke="#dee2e6" strokeWidth="1.5" />
        {/* Tab bar */}
        {tabs.map((t, i) => (
          <g key={t}>
            <rect x={14 + i * 86} y={26} width={86} height={24} rx="4"
              fill={i === 1 ? "#0d6efd" : "#f1f3f5"}
              stroke={i === 1 ? "#0d6efd" : "none"} />
            <text x={57 + i * 86} y={42} textAnchor="middle"
              fill={i === 1 ? "#fff" : "#6c757d"} fontSize="9" fontWeight={i === 1 ? "700" : "400"}>{t}</text>
          </g>
        ))}
        {/* Style tab fields */}
        {styleFields.map((f, i) => (
          <g key={f.label}>
            <text x={20} y={68 + i * 30} fill="#495057" fontSize="8.5" fontWeight="500">{f.label}</text>
            <rect x={20} y={72 + i * 30} width={246} height={18} rx="4" fill="#f8f9fa" stroke="#dee2e6" strokeWidth="0.8" />
            {f.type === "swatch" && (
              <>
                <rect x={24} y={75 + i * 30} width={12} height={12} rx="2" fill={f.color} />
                <text x={40} y={85 + i * 30} fill="#495057" fontSize="7.5">{f.color}</text>
              </>
            )}
            {f.type === "gradient" && (
              <>
                <rect x={24} y={75 + i * 30} width={30} height={12} rx="2" fill="url(#egCard)" />
                <text x={58} y={85 + i * 30} fill="#6c757d" fontSize="7"  fontStyle="italic">linear-gradient(135°,#0f0c29,…)</text>
              </>
            )}
            {f.type === "select" && (
              <text x={24} y={85 + i * 30} fill="#0d6efd" fontSize="7.5" fontWeight="600">{f.val} ▾</text>
            )}
          </g>
        ))}

        {/* ── Middle: Block preview with gradient bg ── */}
        <rect x="284" y="24" width="200" height="202" rx="8" fill="url(#egCard)" stroke="#302b63" strokeWidth="1.5" />
        <text x="384" y="42" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" letterSpacing="0.5">BLOCK PREVIEW</text>
        {/* Shimmer sweep */}
        <rect x="284" y="24" width="200" height="202" rx="8" fill="url(#egShimmer)" />
        {/* Glow border */}
        <rect x="285" y="25" width="198" height="200" rx="7" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.7" />
        {/* Block content */}
        <rect x="300" y="60" width="168" height="28" rx="4" fill="rgba(99,102,241,0.25)" />
        <text x="384" y="78" textAnchor="middle" fill="#c7d2fe" fontSize="10" fontWeight="700">Heading Text</text>
        <rect x="300" y="96" width="168" height="40" rx="4" fill="rgba(255,255,255,0.05)" />
        <text x="384" y="112" textAnchor="middle" fill="#e2e8f0" fontSize="8">Supporting paragraph goes here</text>
        <text x="384" y="126" textAnchor="middle" fill="#e2e8f0" fontSize="8">with rich text styling.</text>
        <rect x="334" y="148" width="100" height="24" rx="6" fill="#6366f1" opacity="0.9" />
        <text x="384" y="164" textAnchor="middle" fill="#fff" fontSize="8.5" fontWeight="600">Get Started →</text>
        {/* Shadow indicator */}
        <rect x="285" y="222" width="198" height="4" rx="2" fill="rgba(0,0,0,0.18)" />

        {/* ── Right: Effect legend ── */}
        <rect x="496" y="24" width="172" height="202" rx="8" fill="#fff" stroke="#dee2e6" strokeWidth="1.5" />
        <text x="582" y="40" textAnchor="middle" fill="#212529" fontSize="9" fontWeight="700">Visual Effects</text>
        {effects.map((e, i) => (
          <g key={e.label}>
            <rect x={506} y={48 + i * 42} width={152} height={34} rx="6"
              fill={`${e.color}15`} stroke={e.color} strokeWidth="1.2" />
            <circle cx={520} cy={65 + i * 42} r={7} fill={e.color} opacity="0.8" />
            <text x={534} y={62 + i * 42} fill={e.color} fontSize="8.5" fontWeight="700">{e.label}</text>
            <text x={534} y={74 + i * 42} fill="#6c757d" fontSize="7.5">
              {["On hover: glow halo", "Continuous sweep", "RGB border cycle", "Breathing pulse"][i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HeroCarouselDiagram() {
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 600 180" style={{ width: "100%", maxHeight: 160 }}>
        <rect x="0" y="0" width="600" height="180" rx="12" fill="#f8f9fa" />
        <text x="300" y="18" textAnchor="middle" fill="#6c757d" fontSize="10" fontWeight="500">HERO CAROUSEL — SLIDE STRUCTURE</text>
        {/* Main slide */}
        <rect x="20" y="28" width="380" height="140" rx="8" fill="#0d6efd" opacity="0.12" stroke="#0d6efd" strokeWidth="1.5" />
        <text x="210" y="55" textAnchor="middle" fill="#0d6efd" fontSize="11" fontWeight="700">Active Slide (full-screen 100vh)</text>
        {/* Background image indicator */}
        <rect x="30" y="62" width="360" height="50" rx="4" fill="#0d6efd" opacity="0.2" />
        <text x="210" y="91" textAnchor="middle" fill="#0d6efd" fontSize="9">Background Image / Video / Color</text>
        <text x="210" y="104" textAnchor="middle" fill="#0d6efd" fontSize="8" opacity="0.7">(supports mobile-specific image or solid color)</text>
        {/* Text overlay */}
        <rect x="30" y="118" width="200" height="40" rx="4" fill="rgba(0,0,0,0.3)" />
        <text x="130" y="135" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">Heading Text</text>
        <text x="130" y="150" textAnchor="middle" fill="#e9ecef" fontSize="8">Subheading / CTA button</text>
        {/* Dots */}
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={200 + i * 16} cy={152} r={i === 0 ? 5 : 4}
            fill={i === 0 ? "#0d6efd" : "#fff"} opacity={i === 0 ? 1 : 0.5} />
        ))}
        {/* Slide thumbnails */}
        <text x="430" y="44" textAnchor="middle" fill="#6c757d" fontSize="9" fontWeight="700">Slide List</text>
        {[1, 2, 3, 4].map((n) => (
          <g key={n}>
            <rect x="410" y={48 + (n - 1) * 28} width="160" height="22" rx="4"
              fill={n === 1 ? "#0d6efd" : "#fff"} opacity={n === 1 ? 0.9 : 1}
              stroke={n === 1 ? "#0d6efd" : "#dee2e6"} strokeWidth="1" />
            <text x="490" y={63 + (n - 1) * 28} textAnchor="middle"
              fill={n === 1 ? "#fff" : "#6c757d"} fontSize="8">Slide {n} {n === 1 ? "(active)" : ""}</text>
          </g>
        ))}
        <rect x="410" y={48 + 4 * 28} width="160" height="22" rx="4" fill="#198754" opacity="0.2" stroke="#198754" strokeWidth="1" strokeDasharray="3,2" />
        <text x="490" y={63 + 4 * 28} textAnchor="middle" fill="#198754" fontSize="8">+ Add Slide</text>
      </svg>
    </div>
  );
}

function NavbarDiagram() {
  return (
    <div className="doc-illustration">
      <svg viewBox="0 0 620 140" style={{ width: "100%", maxHeight: 130 }}>
        <rect x="0" y="0" width="620" height="140" rx="12" fill="#f8f9fa" />
        <text x="310" y="18" textAnchor="middle" fill="#6c757d" fontSize="10" fontWeight="500">NAVBAR — TRANSPARENT → SCROLLED STATES</text>
        {/* Transparent state */}
        <rect x="10" y="28" width="290" height="50" rx="6" fill="rgba(0,0,0,0.6)" />
        <text x="155" y="43" textAnchor="middle" fill="#adb5bd" fontSize="8" fontWeight="500">TRANSPARENT (at top)</text>
        <text x="30" y="62" fill="#fff" fontSize="10">☰</text>
        <text x="155" y="62" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">CMS</text>
        <rect x="218" y="52" width="72" height="20" rx="4" fill="#0d6efd" />
        <text x="254" y="66" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Client Login</text>
        {/* Scrolled state */}
        <rect x="318" y="28" width="290" height="50" rx="6" fill="#fff" stroke="#dee2e6" strokeWidth="1" />
        <text x="463" y="43" textAnchor="middle" fill="#adb5bd" fontSize="8" fontWeight="500">SCROLLED (white + shadow)</text>
        <text x="338" y="62" fill="#212529" fontSize="10">☰</text>
        <text x="370" y="62" fill="#212529" fontSize="9" fontWeight="600">CMS</text>
        <text x="430" y="62" fill="#0d6efd" fontSize="8.5">Home</text>
        <text x="465" y="62" fill="#0d6efd" fontSize="8.5">Plans</text>
        <text x="499" y="62" fill="#0d6efd" fontSize="8.5">Support</text>
        <rect x="526" y="52" width="72" height="20" rx="4" fill="#0d6efd" />
        <text x="562" y="66" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="600">Client Login</text>
        {/* Arrow */}
        <text x="307" y="58" textAnchor="middle" fill="#6c757d" fontSize="16">→</text>
        {/* Mobile row */}
        <rect x="10" y="88" width="600" height="42" rx="6" fill="#f1f3f5" stroke="#dee2e6" strokeWidth="1" />
        <text x="310" y="103" textAnchor="middle" fill="#6c757d" fontSize="8.5" fontWeight="500">MOBILE DROPDOWN (hamburger opens overlay)</text>
        {["Home", "Plans", "Support", "Client Login"].map((item, i) => (
          <g key={item}>
            <rect x={15 + i * 148} y={108} width={138} height={16} rx="4"
              fill={item === "Client Login" ? "#0d6efd" : "#fff"}
              stroke={item === "Client Login" ? "#0d6efd" : "#dee2e6"} strokeWidth="1" />
            <text x={84 + i * 148} y={120} textAnchor="middle"
              fill={item === "Client Login" ? "#fff" : "#495057"} fontSize="8">{item}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Map topic IDs to illustrations ──────────────────────────────────────
const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  "overview": <ArchitectureDiagram />,
  "section-types": <SectionStackDiagram />,
  "editor-overview": <EditorTabsDiagram />,
  "tab-animation": <AnimBgLayerDiagram />,
  "anim-overview": <AnimBgLayerDiagram />,
  "flex-overview": <FlexibleDesignerDiagram />,
  "flex-styling": <ElementStylingDiagram />,
  "hero-overview": <HeroCarouselDiagram />,
  "nav-overview": <NavbarDiagram />,
};

// ─── Animation live previews ──────────────────────────────────────────────
const ANIM_PREVIEWS: Record<string, React.ReactNode> = {
  "anim-floating": (
    <div className="anim-preview" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`float-shape float-shape-${i}`}
          style={{ position:"absolute", width: `${14 + i * 6}px`, height: `${14 + i * 6}px`, opacity: 0.65 - i * 0.07,
            borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "4px" : "50% 20%",
            background: ["#60a5fa","#a78bfa","#34d399","#fb923c","#f472b6","#38bdf8"][i],
            top: ["20%","50%","15%","60%","35%","75%"][i], left: ["10%","25%","55%","70%","85%","40%"][i],
            animation: `floatAnim ${3 + i * 0.8}s ease-in-out infinite alternate`, animationDelay: `${i * 0.4}s` }} />
      ))}
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.4)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-gradient": (
    <div className="anim-preview" style={{ animation: "gradShift 3s ease infinite", backgroundSize: "400% 400%",
      background: "linear-gradient(135deg,#667eea,#764ba2,#06b6d4,#10b981,#f59e0b,#ef4444)" }}>
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.5)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-particles": (
    <div className="anim-preview" style={{ background: "#0a0a1a" }}>
      {[...Array(24)].map((_, i) => (
        <div key={i} style={{ position:"absolute", width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`,
          left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 100}%`, borderRadius:"50%",
          background: "#60a5fa", opacity: 0.3 + (i % 4) * 0.17,
          animation: `particleFade ${2 + (i % 3)}s ease-in-out infinite alternate`, animationDelay: `${i * 0.12}s` }} />
      ))}
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.4)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-waves": (
    <div className="anim-preview" style={{ background: "linear-gradient(180deg,#0369a1,#0c4a6e)", overflow:"hidden" }}>
      <svg viewBox="0 0 400 80" style={{ position:"absolute", bottom:0, width:"100%", height:"70%" }}>
        <path d="M0,30 C80,10 160,50 240,30 C320,10 360,50 400,30 L400,80 L0,80 Z" fill="rgba(255,255,255,0.18)" style={{ animation:"waveDrift 2.5s ease-in-out infinite alternate" }} />
        <path d="M0,40 C100,20 200,60 300,40 C350,28 380,50 400,40 L400,80 L0,80 Z" fill="rgba(255,255,255,0.12)" style={{ animation:"waveDrift 3s ease-in-out infinite alternate-reverse" }} />
        <path d="M0,50 C120,35 220,65 320,50 C360,42 385,58 400,50 L400,80 L0,80 Z" fill="rgba(255,255,255,0.08)" style={{ animation:"waveDrift 2s ease-in-out infinite alternate" }} />
      </svg>
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.5)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-fibre": (
    <div className="anim-preview" style={{ background:"#000" }}>
      <svg viewBox="0 0 300 80" style={{ width:"100%", height:"100%" }}>
        {[...Array(10)].map((_, i) => <line key={i} x1="0" y1={8 + i * 8} x2="300" y2={8 + i * 8} stroke={["#3b82f6","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#6366f1","#60a5fa","#a78bfa"][i]} strokeWidth="0.4" opacity="0.25" />)}
        {[0,1,2,3,4].map((i) => (
          <circle key={i} r="3" fill={["#60a5fa","#a78bfa","#34d399","#fb923c","#f472b6"][i]} style={{ filter:"blur(0.5px)", animation:`fibrePulse ${1 + i * 0.3}s linear infinite`, animationDelay:`${i * 0.6}s` }}>
            <animateMotion dur={`${1 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.6}s`} path={`M0,${8 + i * 16} L300,${8 + i * 16}`} />
          </circle>
        ))}
      </svg>
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.4)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-wifi": (
    <div className="anim-preview" style={{ background:"linear-gradient(135deg,#1e3a5f,#0f172a)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg viewBox="0 0 120 90" style={{ width:"60%", height:"90%" }}>
        <circle cx="60" cy="78" r="5" fill="#3b82f6" />
        {[1,2,3,4].map((i) => (
          <path key={i} d={`M${60-i*13},${78-i*11} A${i*13},${i*11} 0 0,1 ${60+i*13},${78-i*11}`}
            stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round"
            style={{ animation:`wifiPulse 1.8s ease-out infinite`, animationDelay:`${i*0.3}s`, opacity:0 }} />
        ))}
      </svg>
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.4)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-parallax": (
    <div className="anim-preview" style={{ background:"#111827", overflow:"hidden" }}>
      {[{s:70,y:15,x:10,c:"#1e3a5f",sp:"7s"},{s:50,y:35,x:55,c:"#312e81",sp:"5s"},{s:32,y:55,x:30,c:"#1e40af",sp:"3.5s"},{s:18,y:20,x:72,c:"#60a5fa",sp:"2.5s"},{s:12,y:65,x:82,c:"#a78bfa",sp:"2s"}].map((l,i)=>(
        <div key={i} style={{ position:"absolute", width:l.s, height:l.s*0.6, top:`${l.y}%`, left:`${l.x}%`, background:l.c, borderRadius:"50%", animation:`parallaxDrift ${l.sp} ease-in-out infinite alternate`, animationDelay:`${i*0.6}s`, opacity:0.7 }} />
      ))}
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.4)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-tilt": (
    <div className="anim-preview" style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:100, height:70, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius:10,
        boxShadow:"0 20px 40px rgba(0,0,0,0.6)", animation:"tilt3d 3s ease-in-out infinite alternate", transformStyle:"preserve-3d" }} />
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.4)",fontSize:"0.65rem" }}>LIVE PREVIEW</div>
    </div>
  ),
  "anim-custom": (
    <div className="anim-preview" style={{ background:"#111827", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"monospace", fontSize:"0.7rem", color:"#60a5fa", lineHeight:1.6, padding:12 }}>
        <span style={{color:"#a78bfa"}}>ctx</span>.<span style={{color:"#34d399"}}>clearRect</span>(<span style={{color:"#f9a8d4"}}>0,0,w,h</span>);<br/>
        <span style={{color:"#a78bfa"}}>ctx</span>.<span style={{color:"#34d399"}}>arc</span>(<span style={{color:"#fbbf24"}}>x</span>, <span style={{color:"#fbbf24"}}>y</span>, <span style={{color:"#fbbf24"}}>r</span>);<br/>
        <span style={{color:"#a78bfa"}}>ctx</span>.<span style={{color:"#34d399"}}>fill</span>();<br/>
        <span style={{color:"#6b7280"}}>// ∞ requestAnimationFrame</span>
      </div>
      <div style={{ position:"absolute",bottom:6,right:10,color:"rgba(255,255,255,0.4)",fontSize:"0.65rem" }}>CODE PREVIEW</div>
    </div>
  ),
};

// ─── Tree node ────────────────────────────────────────────────────────────
function TreeNode({ topic, selectedId, onSelect }: {
  topic: DocTopic; selectedId: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!(topic.children?.length);
  const isActive = selectedId === topic.id;

  if (hasChildren) return (
    <li>
      <button className="tree-group-btn" onClick={() => setOpen(o => !o)}>
        {topic.icon && <i className={`bi ${topic.icon} tree-icon`} />}
        <span className="flex-grow-1">{topic.label}</span>
        <i className={`bi bi-chevron-${open ? "down" : "right"} tree-chevron`} />
      </button>
      {open && (
        <ul className="tree-children">
          {topic.children!.map(c => <TreeNode key={c.id} topic={c} selectedId={selectedId} onSelect={onSelect} />)}
        </ul>
      )}
    </li>
  );

  return (
    <li>
      <button className={`tree-leaf-btn${isActive ? " active" : ""}`}
        onClick={() => topic.content && onSelect(topic.id)}>
        {topic.icon && <i className={`bi ${topic.icon} tree-icon`} />}
        <span>{topic.label}</span>
      </button>
    </li>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const allLeaves = useMemo(() => flattenTopics(DOC_TOPICS), []);
  const [selectedId, setSelectedId] = useState<string>(allLeaves[0]?.id ?? "");
  const [treeSearch, setTreeSearch] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentBodyRef = useRef<HTMLDivElement>(null);

  const selectedTopic = findById(DOC_TOPICS, selectedId);
  const parentTopic = findParent(DOC_TOPICS, selectedId);
  const illustration = ILLUSTRATIONS[selectedId] ?? null;
  const animPreview = ANIM_PREVIEWS[selectedId] ?? null;

  const matchCount = useMemo(() => {
    if (!contentSearch.trim() || !selectedTopic?.content) return 0;
    return (selectedTopic.content.match(new RegExp(contentSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
  }, [contentSearch, selectedTopic]);

  const treeFiltered = treeSearch.trim()
    ? allLeaves.filter(t => t.label.toLowerCase().includes(treeSearch.toLowerCase()) || t.content?.toLowerCase().includes(treeSearch.toLowerCase()))
    : null;

  function selectTopic(id: string) {
    setSelectedId(id);
    setContentSearch("");
    setSidebarOpen(false);
    contentBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AdminLayout title="Documentation" subtitle="Complete reference for all CMS features, sections, and settings">
      <style>{`
        /* ── Keyframes ── */
        @keyframes floatAnim { from{transform:translateY(0) rotate(0deg)} to{transform:translateY(-14px) rotate(18deg)} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes particleFade { from{opacity:0.15;transform:scale(0.8)} to{opacity:1;transform:scale(1.5)} }
        @keyframes waveDrift { from{transform:translateX(0)} to{transform:translateX(-24px)} }
        @keyframes wifiPulse { 0%{opacity:0;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.1)} }
        @keyframes parallaxDrift { from{transform:translate(0,0)} to{transform:translate(10px,-8px)} }
        @keyframes tilt3d { 0%{transform:perspective(220px) rotateX(12deg) rotateY(-18deg)} 100%{transform:perspective(220px) rotateX(-12deg) rotateY(18deg)} }
        @keyframes fibrePulse { 0%{opacity:0} 40%{opacity:1} 100%{opacity:0} }

        /* ── Shell: fixed viewport height, internal scroll ── */
        .docs-shell {
          display: flex;
          height: calc(100vh - 140px);
          min-height: 400px;
          border: 1px solid #dee2e6;
          border-radius: 0.5rem;
          overflow: hidden;
          background: #fff;
        }

        /* ── Sidebar ── */
        .docs-sidebar {
          width: 260px; min-width: 220px; flex-shrink: 0;
          background: #f8f9fa; border-right: 1px solid #dee2e6;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .docs-sidebar-header { padding: 10px 10px 10px; border-bottom: 1px solid #dee2e6; background: #fff; }
        .docs-sidebar-tree { flex: 1; min-height: 0; overflow-y: auto; padding: 6px; }
        .docs-sidebar-tree::-webkit-scrollbar { width: 3px; }
        .docs-sidebar-tree::-webkit-scrollbar-thumb { background: #ced4da; border-radius: 3px; }
        .docs-sidebar-tree > ul { list-style: none; padding: 0; margin: 0; }

        /* ── Tree ── */
        .tree-group-btn {
          display: flex; align-items: center; gap: 5px; width: 100%;
          border: none; background: transparent; padding: 5px 5px 5px 4px;
          border-radius: 5px; font-size: 0.785rem; font-weight: 700;
          color: #343a40; cursor: pointer; text-align: left;
          transition: background 0.1s;
        }
        .tree-group-btn:hover { background: #e9ecef; }
        .tree-leaf-btn {
          display: flex; align-items: center; gap: 5px; width: 100%;
          border: none; background: transparent; padding: 4px 5px 4px 4px;
          border-radius: 5px; font-size: 0.77rem; color: #6c757d;
          cursor: pointer; text-align: left; transition: background 0.1s, color 0.1s;
        }
        .tree-leaf-btn:hover { background: #e9ecef; color: #212529; }
        .tree-leaf-btn.active { background: #cfe2ff; color: #084298; font-weight: 600; }
        .tree-children { list-style: none; padding: 1px 0 3px 12px !important; margin: 0 !important; border-left: 2px solid #dee2e6; margin-left: 8px !important; }
        .tree-icon { font-size: 0.72rem; width: 13px; flex-shrink: 0; }
        .tree-chevron { font-size: 0.6rem; opacity: 0.4; margin-left: auto; }

        /* ── Right content panel ── */
        .docs-right {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .docs-toolbar {
          flex-shrink: 0;
          padding: 8px 14px; border-bottom: 1px solid #dee2e6; background: #fff;
          display: flex; align-items: center; gap: 10px; min-height: 46px;
        }
        .docs-body {
          flex: 1; min-height: 0;
          overflow-y: auto;
          padding: 1.5rem 2rem 2rem;
        }
        .docs-body::-webkit-scrollbar { width: 5px; }
        .docs-body::-webkit-scrollbar-thumb { background: #ced4da; border-radius: 4px; }

        /* ── SVG illustration wrapper ── */
        .doc-illustration {
          margin-bottom: 1.5rem;
          border-radius: 10px; overflow: hidden;
          border: 1px solid #dee2e6; background: #f8f9fa;
        }
        .doc-illustration svg { display: block; }

        /* ── Anim live preview ── */
        .anim-preview {
          position: relative; width: 100%; height: 110px;
          border-radius: 10px; overflow: hidden; margin-bottom: 1.5rem;
          border: 1px solid rgba(255,255,255,0.08);
        }

        /* ── Markdown ── */
        .docs-md h1 { font-size: 1.45rem; font-weight: 700; color: #212529; border-bottom: 2px solid #dee2e6; padding-bottom: 0.5rem; margin-bottom: 1rem; }
        .docs-md h2 { font-size: 1.05rem; font-weight: 700; color: #0d6efd; margin-top: 1.75rem; margin-bottom: 0.4rem; }
        .docs-md h3 { font-size: 0.95rem; font-weight: 600; color: #343a40; margin-top: 1.2rem; margin-bottom: 0.3rem; }
        .docs-md h4 { font-size: 0.82rem; font-weight: 600; color: #6c757d; margin-top: 1rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.06em; }
        .docs-md p { font-size: 0.875rem; line-height: 1.75; color: #495057; margin-bottom: 0.65rem; }
        .docs-md ul,.docs-md ol { font-size: 0.875rem; color: #495057; padding-left: 1.4rem; margin-bottom: 0.65rem; }
        .docs-md li { margin-bottom: 0.18rem; line-height: 1.65; }
        .docs-md hr { border: none; border-top: 1px solid #dee2e6; margin: 1.2rem 0; }
        .docs-md strong { color: #212529; font-weight: 600; }
        .docs-md em { color: #6c757d; }
        .docs-md code { background: #f1f3f5; color: #0d6efd; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.82em; font-family: 'Fira Code','Courier New',monospace; border: 1px solid #e9ecef; }
        .docs-md pre { background: #212529; color: #e9ecef; padding: 0.9rem 1.1rem; border-radius: 8px; overflow-x: auto; margin: 0.9rem 0; font-size: 0.77rem; line-height: 1.6; border: 1px solid #343a40; }
        .docs-md pre code { background: transparent; color: inherit; padding: 0; font-size: inherit; border: none; }
        .docs-md table { width: 100%; border-collapse: collapse; margin: 0.9rem 0; font-size: 0.835rem; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
        .docs-md thead { background: #0d6efd; color: #fff; }
        .docs-md thead th { padding: 0.45rem 0.7rem; font-weight: 600; text-align: left; font-size: 0.79rem; }
        .docs-md tbody tr:nth-child(odd) { background: #f8f9fa; }
        .docs-md tbody tr:hover { background: #e7f1ff; }
        .docs-md td { padding: 0.38rem 0.7rem; color: #495057; border-bottom: 1px solid #e9ecef; vertical-align: top; }
        .docs-md td:first-child { font-weight: 500; color: #212529; white-space: nowrap; }
        .docs-md blockquote { border-left: 4px solid #0d6efd; background: #f0f7ff; padding: 0.6rem 1rem; margin: 0.85rem 0; border-radius: 0 6px 6px 0; }
        .docs-md blockquote p { color: #084298; margin: 0; font-size: 0.85rem; }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .docs-shell { flex-direction: column; height: auto; overflow: visible; }
          .docs-sidebar { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid #dee2e6; overflow: hidden; max-height: 0; transition: max-height 0.3s ease; }
          .docs-sidebar.open { max-height: 50vh; }
          .docs-right { min-height: 60vh; }
          .docs-body { padding: 1rem 1rem 1.5rem; }
          .mobile-btn { display: flex !important; }
          .hide-mobile { display: none !important; }
        }
        @media (min-width: 768px) {
          .mobile-btn { display: none !important; }
        }
      `}</style>

      <div className="docs-shell">
        {/* ── Sidebar ── */}
        <aside className={`docs-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="docs-sidebar-header">
            <div className="position-relative">
              <i className="bi bi-search position-absolute" style={{ top:"50%",left:8,transform:"translateY(-50%)",color:"#adb5bd",fontSize:"0.72rem",pointerEvents:"none" }} />
              <input type="text" className="form-control form-control-sm" placeholder="Filter topics…"
                value={treeSearch} onChange={e => setTreeSearch(e.target.value)}
                style={{ paddingLeft:26,fontSize:"0.78rem" }} />
              {treeSearch && (
                <button className="btn btn-link p-0 position-absolute border-0" onClick={() => setTreeSearch("")}
                  style={{ top:"50%",right:6,transform:"translateY(-50%)",color:"#adb5bd",lineHeight:1 }}>
                  <i className="bi bi-x" style={{ fontSize:"0.9rem" }} />
                </button>
              )}
            </div>
          </div>
          <div className="docs-sidebar-tree">
            {treeFiltered ? (
              <>
                <p className="text-muted px-1 mb-1" style={{ fontSize:"0.72rem" }}>
                  {treeFiltered.length} result{treeFiltered.length !== 1 ? "s" : ""}
                </p>
                {treeFiltered.length === 0
                  ? <p className="text-muted px-1" style={{ fontSize:"0.78rem" }}>No results.</p>
                  : treeFiltered.map(t => (
                    <button key={t.id} className={`tree-leaf-btn w-100 mb-1${selectedId === t.id ? " active" : ""}`}
                      onClick={() => { selectTopic(t.id); setTreeSearch(""); }}>
                      {t.icon && <i className={`bi ${t.icon} tree-icon`} />}
                      <span>{t.label}</span>
                    </button>
                  ))
                }
              </>
            ) : (
              <ul>
                {DOC_TOPICS.map(topic => (
                  <TreeNode key={topic.id} topic={topic} selectedId={selectedId} onSelect={selectTopic} />
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Right panel ── */}
        <div className="docs-right">
          {/* Toolbar */}
          <div className="docs-toolbar">
            <button className="btn btn-sm btn-outline-secondary mobile-btn" style={{ display:"none",flexShrink:0 }}
              onClick={() => setSidebarOpen(o => !o)}>
              <i className={`bi bi-${sidebarOpen ? "x" : "list"}`} />
            </button>
            {/* Breadcrumb */}
            <nav className="flex-grow-1 hide-mobile" style={{ fontSize:"0.75rem",color:"#6c757d",minWidth:0 }}>
              <i className="bi bi-book me-1" />Docs
              {parentTopic && <><span className="mx-1">›</span><span>{parentTopic.label}</span></>}
              {selectedTopic && <><span className="mx-1">›</span><strong style={{ color:"#212529" }}>{selectedTopic.label}</strong></>}
            </nav>
            {/* In-content search */}
            <div className="d-flex align-items-center gap-2" style={{ flexShrink:0 }}>
              <div className="position-relative">
                <i className="bi bi-search position-absolute" style={{ top:"50%",left:7,transform:"translateY(-50%)",color:"#adb5bd",fontSize:"0.68rem",pointerEvents:"none" }} />
                <input type="text" className="form-control form-control-sm" placeholder="Search in topic…"
                  value={contentSearch} onChange={e => setContentSearch(e.target.value)}
                  style={{ paddingLeft:24,fontSize:"0.77rem",width:190 }} />
                {contentSearch && (
                  <button className="btn btn-link p-0 position-absolute border-0" onClick={() => setContentSearch("")}
                    style={{ top:"50%",right:5,transform:"translateY(-50%)",color:"#adb5bd",lineHeight:1 }}>
                    <i className="bi bi-x" style={{ fontSize:"0.85rem" }} />
                  </button>
                )}
              </div>
              {contentSearch && (
                <span className={`badge rounded-pill ${matchCount > 0 ? "bg-primary" : "bg-secondary"}`}
                  style={{ fontSize:"0.68rem",minWidth:22,textAlign:"center" }}>
                  {matchCount}
                </span>
              )}
            </div>
          </div>

          {/* Content body — this is the scrollable area */}
          <div ref={contentBodyRef} className="docs-body">
            {selectedTopic?.content ? (
              <article className="docs-md">
                {/* SVG illustration if available */}
                {illustration}
                {/* Animated live preview if available */}
                {animPreview}
                {/* Search notice */}
                {contentSearch.trim() && (
                  <div className={`alert py-2 px-3 mb-3 ${matchCount > 0 ? "alert-primary" : "alert-secondary"}`} style={{ fontSize:"0.8rem" }}>
                    <i className="bi bi-search me-1" />
                    {matchCount > 0
                      ? <>{matchCount} match{matchCount !== 1 ? "es" : ""} for "<strong>{contentSearch}</strong>"</>
                      : <>No matches for "<strong>{contentSearch}</strong>"</>}
                  </div>
                )}
                {/* Markdown content */}
                <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{selectedTopic.content}</Markdown>
              </article>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center text-center" style={{ paddingTop:"4rem",color:"#adb5bd" }}>
                <i className="bi bi-book-open" style={{ fontSize:"3rem",marginBottom:"1rem",opacity:0.35 }} />
                <p className="fw-semibold mb-1" style={{ color:"#6c757d" }}>Select a topic from the left panel</p>
                <p style={{ fontSize:"0.85rem" }}>{allLeaves.length} documentation pages available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
