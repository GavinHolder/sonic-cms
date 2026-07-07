"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback, useId, useMemo } from "react";
import dynamic from "next/dynamic";
import type { FlexibleSection, FlexibleElement, FlexibleAnimationType } from "@/types/section";
import type { AnimBgConfig } from "@/lib/anim-bg/types";
import { DEFAULT_ANIM_BG_CONFIG } from "@/lib/anim-bg/defaults";
import { designerBlockToElement } from "@/lib/flexible/legacy-to-designer";
import { resolvePackageTokens, type PackageLike } from "@/lib/packages/tokens";
import { animate } from "animejs";

const AnimBgRenderer    = dynamic(() => import("./AnimBgRenderer"), { ssr: false });
const ScrollStageWrapper = dynamic(() => import("./scroll-stage/ScrollStageWrapper"), { ssr: false });
const CoverageMapEmbed   = dynamic(() => import("@/components/coverage/CoverageMapEmbed"), { ssr: false });
const ProjectsGallery    = dynamic(() => import("@/components/sections/ProjectsGallery"), { ssr: false });
const VoltBlock                = dynamic(() => import("@/components/sections/VoltBlock"), { ssr: false });
const InteractiveProductCard   = dynamic(() => import("@/components/sections/blocks/InteractiveProductCard"), { ssr: false });
const ScrollStoryBlock         = dynamic(() => import("@/components/sections/blocks/ScrollStoryBlock"), { ssr: false });
const EditorialBlock           = dynamic(() => import("@/components/sections/blocks/EditorialBlock"), { ssr: false });
const PricingTabsBlock         = dynamic(() => import("@/components/sections/blocks/PricingTabsBlock"), { ssr: false });
const GalleryCtaBlock          = dynamic(() => import("@/components/sections/blocks/GalleryCtaBlock"), { ssr: false });
const PackagesBlock            = dynamic(() => import("@/components/sections/blocks/PackagesBlock"), { ssr: false });

interface FlexibleSectionRendererProps {
  section: FlexibleSection;
}

/** Sanitize a URL for use inside CSS url() — only allows safe patterns */
const safeUrl = (url: string) => /^(https?:\/\/|\/)[^"')]*$/.test(url) ? url : "";

/** Convert hex color + opacity (0-100) to rgba string — used for block/sub-element transparent backgrounds */
function applyBgOpacity(hex: string, opacity: number): string {
  if (!hex || hex === "transparent" || opacity >= 100) return hex || "transparent";
  const full = hex.replace("#", "").replace(/^(.)(.)(.)$/, "$1$1$2$2$3$3");
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity / 100})`;
}

/** Inline styles injected once for hover/animation effects */
const FLEXIBLE_CSS = `
  .flexible-card {
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s cubic-bezier(0.4,0,0.2,1);
    will-change: transform;
  }
  .flexible-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgba(0,0,0,0.25) !important;
  }
  .flexible-card.card-glass {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .flexible-card.card-glow:hover {
    box-shadow: 0 0 30px var(--card-glow-color, rgba(9,105,218,0.5)) !important;
  }
  .flexible-stats {
    transition: transform 0.3s ease;
  }
  .flexible-stats:hover { transform: scale(1.05); }
  .flexible-element-button a {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .flexible-element-button a:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  }
  @keyframes flex-pulse-glow {
    0%, 100% { box-shadow: 0 0 12px var(--glow-color, #0969da); }
    50%       { box-shadow: 0 0 32px var(--glow-color, #0969da), 0 0 60px var(--glow-color, #0969da); }
  }
  .flexible-card.card-pulse-glow { animation: flex-pulse-glow 2.5s ease-in-out infinite; }
  @keyframes flex-rgb-glow {
    0%   { box-shadow: 0 0 16px #ff0000, 0 0 32px #ff000066; }
    16%  { box-shadow: 0 0 16px #ff8800, 0 0 32px #ff880066; }
    33%  { box-shadow: 0 0 16px #ffff00, 0 0 32px #ffff0066; }
    50%  { box-shadow: 0 0 16px #00ff00, 0 0 32px #00ff0066; }
    66%  { box-shadow: 0 0 16px #0088ff, 0 0 32px #0088ff66; }
    83%  { box-shadow: 0 0 16px #8800ff, 0 0 32px #8800ff66; }
    100% { box-shadow: 0 0 16px #ff0000, 0 0 32px #ff000066; }
  }
  .flexible-card.card-rgb { animation: flex-rgb-glow 3s linear infinite; }
  @keyframes flex-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .flexible-card.card-shimmer::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: flex-shimmer 2.5s linear infinite;
    border-radius: inherit;
    pointer-events: none;
  }
  .flex-banner-float-left  { float: left;  margin-right: 24px; margin-bottom: 16px; }
  .flex-banner-float-right { float: right; margin-left:  24px; margin-bottom: 16px; }

  /* ── Designer block scroll animations ───────────────────────────────── */
  .flex-block-hidden { opacity: 0 !important; }
  @keyframes flex-ba-fadeIn    { from{opacity:0}                                           to{opacity:1} }
  @keyframes flex-ba-slideUp   { from{opacity:0;transform:translateY(48px)}                to{opacity:1;transform:none} }
  @keyframes flex-ba-slideDown { from{opacity:0;transform:translateY(-48px)}               to{opacity:1;transform:none} }
  @keyframes flex-ba-slideInLeft  { from{opacity:0;transform:translateX(-60px)}            to{opacity:1;transform:none} }
  @keyframes flex-ba-slideInRight { from{opacity:0;transform:translateX(60px)}             to{opacity:1;transform:none} }
  @keyframes flex-ba-scaleIn   { from{opacity:0;transform:scale(0.75)}                     to{opacity:1;transform:none} }
  @keyframes flex-ba-zoomIn    { from{opacity:0;transform:scale(1.18)}                     to{opacity:1;transform:none} }
  @keyframes flex-ba-flipInX   { from{opacity:0;transform:perspective(800px) rotateX(-80deg)} to{opacity:1;transform:perspective(800px) rotateX(0)} }
  @keyframes flex-ba-flipInY   { from{opacity:0;transform:perspective(800px) rotateY(-80deg)} to{opacity:1;transform:perspective(800px) rotateY(0)} }
  @keyframes flex-ba-bounceIn  { 0%{opacity:0;transform:scale(0.3)} 55%{opacity:1;transform:scale(1.08)} 80%{transform:scale(0.96)} 100%{transform:scale(1)} }
  @keyframes flex-ba-rotateIn  { from{opacity:0;transform:rotate(-180deg) scale(0.5)}      to{opacity:1;transform:none} }
  .flex-ba-fadeIn     { animation: flex-ba-fadeIn     0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-slideUp    { animation: flex-ba-slideUp    0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-slideDown  { animation: flex-ba-slideDown  0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-slideInLeft    { animation: flex-ba-slideInLeft  0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-slideInRight   { animation: flex-ba-slideInRight 0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-scaleIn    { animation: flex-ba-scaleIn    0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
  .flex-ba-zoomIn     { animation: flex-ba-zoomIn     0.55s cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-flipInX    { animation: flex-ba-flipInX    0.7s  cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-flipInY    { animation: flex-ba-flipInY    0.7s  cubic-bezier(0.16,1,0.3,1) both; }
  .flex-ba-bounceIn   { animation: flex-ba-bounceIn   0.8s  cubic-bezier(0.36,0.07,0.19,0.97) both; }
  .flex-ba-rotateIn   { animation: flex-ba-rotateIn   0.7s  cubic-bezier(0.16,1,0.3,1) both; }

  /* ── Designer block visual effects ──────────────────────────────────── */
  .db-effect-glow       { box-shadow: 0 0 20px var(--db-glow-color, rgba(9,105,218,0.5)); transition: box-shadow 0.3s ease, transform 0.3s ease; }
  .db-effect-glow:hover { box-shadow: 0 0 40px var(--db-glow-color, rgba(9,105,218,0.75)), 0 8px 32px rgba(0,0,0,0.15) !important; }
  @keyframes db-pulse-glow { 0%,100%{ box-shadow:0 0 14px var(--db-glow-color,#0969da); } 50%{ box-shadow:0 0 36px var(--db-glow-color,#0969da),0 0 64px var(--db-glow-color,#0969da); } }
  .db-effect-pulse-glow { animation: db-pulse-glow 2.5s ease-in-out infinite; }
  @keyframes db-rgb { 0%{box-shadow:0 0 18px #ff0000} 16%{box-shadow:0 0 18px #ff8800} 33%{box-shadow:0 0 18px #ffff00} 50%{box-shadow:0 0 18px #00ff00} 66%{box-shadow:0 0 18px #0088ff} 83%{box-shadow:0 0 18px #8800ff} 100%{box-shadow:0 0 18px #ff0000} }
  .db-effect-rgb { animation: db-rgb 3s linear infinite; }
  .db-effect-shimmer::after { content:''; position:absolute; inset:0; pointer-events:none; border-radius:inherit; background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.22) 50%,transparent 100%); background-size:200% 100%; animation:flex-shimmer 2.5s linear infinite; }

  /* ── Box shadow presets ──────────────────────────────────────────────── */
  .db-shadow-sm   { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .db-shadow-md   { box-shadow: 0 4px 18px rgba(0,0,0,0.14); }
  .db-shadow-lg   { box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
  .db-shadow-xl   { box-shadow: 0 16px 60px rgba(0,0,0,0.28); }
  .db-shadow-glow { box-shadow: 0 0 32px var(--db-glow-color, rgba(9,105,218,0.45)); }

  /* ── Mosaic grid layout ─────────────────────────────────────────────── */
  .flex-mosaic-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    width: 100%;
  }
  @media (max-width: 767px) {
    .flex-mosaic-grid > * { grid-column: 1 / -1 !important; grid-row: auto !important; }
  }

  /* ── Section header variants ────────────────────────────────────────── */
  .flex-section-header-split {
    display: flex;
    align-items: flex-end;
    gap: 40px;
  }
  .flex-section-header-split .fsh-heading { flex: 0 0 60%; }
  .flex-section-header-split .fsh-lead    { flex: 1 1 40%; padding-bottom: 4px; }
  @media (max-width: 767px) {
    .flex-section-header-split { flex-direction: column; gap: 16px; }
    .flex-section-header-split .fsh-heading,
    .flex-section-header-split .fsh-lead { flex: 1 1 auto; width: 100%; }
  }

  /* ── Section footer row ─────────────────────────────────────────────── */
  .flex-section-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 20px;
    border-top: 1px solid var(--cms-line, rgba(255,255,255,0.1));
    margin-top: 20px;
    font-size: 13px;
    opacity: 0.65;
  }
  .flex-section-footer em { font-style: normal; color: var(--bs-success, #22c55e); }
  .flex-section-footer-btn {
    white-space: nowrap;
    background: none;
    border: 1px solid currentColor;
    border-radius: 4px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-decoration: none;
    color: inherit;
    transition: opacity 0.2s;
  }
  .flex-section-footer-btn:hover { opacity: 0.7; }

  /* ── Numbered steps block ───────────────────────────────────────────── */
  .flex-steps-block { display: flex; flex-direction: column; }
  .flex-step-row {
    display: grid;
    align-items: start;
    padding: 20px 0;
  }
  .flex-step-number {
    font-size: clamp(48px, 6vw, 64px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--bs-success, #22c55e);
  }

  /* ── Sonic "service row" variant (steps with tag + chips) ───────────────── */
  .flex-step-row--rich {
    grid-template-columns: 96px minmax(0, 1.05fr) minmax(0, 1.25fr);
    gap: 32px;
    padding: 36px 0;
    position: relative;
  }
  .flex-step-row--rich .flex-step-number {
    font-family: var(--theme-font-display, 'Archivo Black'), sans-serif;
    font-size: clamp(38px, 4.4vw, 64px);
    color: transparent;
    -webkit-text-stroke: 1.4px rgba(255,255,255,0.22);
    transition: -webkit-text-stroke-color 0.45s ease, color 0.45s ease;
  }
  .flex-step-row--rich:hover .flex-step-number {
    -webkit-text-stroke-color: var(--theme-red, #E31E24);
    color: rgba(227,30,36,0.10);
  }
  .flex-step-row--rich .flex-step-heading {
    margin: 0 0 10px;
    font-family: var(--theme-font-display, 'Archivo Black'), sans-serif;
    font-size: clamp(20px, 2.4vw, 32px);
    line-height: 1.04;
    letter-spacing: -0.01em;
  }
  .flex-step-tag {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--theme-font-mono, 'JetBrains Mono'), monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--theme-red, #E31E24);
  }
  .flex-step-tag::before {
    content: "";
    width: 18px; height: 2px;
    background: var(--theme-red, #E31E24);
    display: inline-block;
  }
  .flex-step-desc { margin: 0 0 16px; opacity: 0.72; font-size: 15px; line-height: 1.6; }
  .flex-step-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .flex-step-chip {
    font-size: 12px;
    padding: 7px 13px;
    border-radius: 999px;
    border: 1px solid var(--theme-card-border, rgba(255,255,255,0.12));
    background: var(--theme-card-bg, rgba(255,255,255,0.03));
    opacity: 0.9;
  }
  .flex-step-row--rich::after {
    content: "";
    position: absolute;
    left: 0; bottom: -1px;
    height: 2px; width: 0;
    background: linear-gradient(90deg, var(--theme-red, #E31E24), transparent);
    transition: width 0.55s ease;
  }
  .flex-step-row--rich:hover::after { width: 62%; }
  @media (max-width: 768px) {
    .flex-step-row--rich { grid-template-columns: 56px 1fr; gap: 18px; padding: 26px 0; }
    .flex-step-row--rich .flex-step-side { grid-column: 1 / -1; }
  }

  /* ── Numbered card (ghost outline number + hover) ───────────────────────── */
  .flex-card-default { transition: background 0.3s ease; height: 100%; }
  .flex-card-number {
    font-family: var(--theme-font-display, 'Archivo Black'), sans-serif;
    font-size: clamp(38px, 4vw, 58px);
    line-height: 1;
    color: transparent;
    -webkit-text-stroke: 1.3px rgba(255,255,255,0.18);
    margin-bottom: 20px;
    transition: -webkit-text-stroke-color 0.4s ease, color 0.4s ease;
  }
  .flex-card-numbered:hover .flex-card-number {
    -webkit-text-stroke-color: var(--theme-red, #E31E24);
    color: rgba(227,30,36,0.09);
  }
  .flex-card-heading {
    font-family: var(--theme-font-display, 'Archivo Black'), sans-serif;
    letter-spacing: -0.01em;
  }

  /* ── Photo strip block ──────────────────────────────────────────────── */
  .flex-photo-strip {
    display: grid;
    width: 100%;
    overflow: hidden;
  }
  .flex-photo-strip-cell {
    background-size: cover;
    background-position: center;
    transition: filter 0.3s ease;
  }
  .flex-photo-strip-cell.hover-brightness:hover { filter: brightness(1); }

  /* ── Photo-card block — full-bleed image card with slide-up hover panel ─ */
  .photo-card-block { cursor: pointer; }
  .photo-card-bg {
    position: absolute; inset: 0;
    width: 100%; height: 100%; object-fit: cover; object-position: center;
    filter: brightness(0.7);
    transition: filter 0.45s ease, transform 0.5s ease;
    will-change: transform, filter;
  }
  .photo-card-block:hover .photo-card-bg {
    filter: brightness(1.05);
    transform: scale(1.04);
  }
  .photo-card-static {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 20px 22px; z-index: 1;
    transition: opacity 0.3s ease;
  }
  .photo-card-block:hover .photo-card-static { opacity: 0; }
  .photo-card-hover {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 24px 22px; z-index: 2;
    transform: translateY(100%);
    transition: transform 0.45s cubic-bezier(0.33, 1, 0.68, 1);
  }
  .photo-card-block:hover .photo-card-hover { transform: translateY(0); }

  /* ── Marquee / animated stat strip ──────────────────────────────────────── */
  .flex-marquee {
    position: relative; overflow: hidden; width: 100%;
    border-top: 1px solid var(--cms-line, rgba(255,255,255,0.10));
    border-bottom: 1px solid var(--cms-line, rgba(255,255,255,0.10));
    padding: 18px 0;
  }
  .flex-marquee-track {
    display: flex; width: max-content; white-space: nowrap;
    animation-name: flex-marquee-scroll;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    will-change: transform;
  }
  .flex-marquee:hover .flex-marquee-track.pause { animation-play-state: paused; }
  @keyframes flex-marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) { .flex-marquee-track { animation: none; } }
  .flex-marquee-item {
    display: inline-flex; align-items: center; gap: 28px; padding: 0 28px;
    font-family: var(--theme-font-display, 'Archivo Black'), sans-serif;
    text-transform: uppercase; font-size: 15px; letter-spacing: 0.05em;
    color: var(--section-muted, rgba(255,255,255,0.6));
  }
  .flex-marquee-item--stat {
    flex-direction: row; align-items: baseline; gap: 10px; text-transform: none;
  }
  .flex-marquee-item--stat .mq-v {
    font-family: var(--theme-font-display, 'Archivo Black'), sans-serif;
    font-size: clamp(22px, 2.4vw, 34px); line-height: 1; color: var(--section-text, #fff);
  }
  .flex-marquee-item--stat .mq-l {
    font-family: var(--theme-font-mono, 'JetBrains Mono'), monospace;
    font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  }
  .flex-marquee-sep { color: var(--theme-red, #E31E24); font-size: 11px; }
`;

/** Mosaic size preset → [colSpan, rowSpan] */
const MOSAIC_PRESETS: Record<string, [number, number]> = {
  "s-lg":   [6, 2],
  "s-md":   [4, 2],
  "s-sm":   [4, 1],
  "s-tall": [4, 2],
  "s-wide": [8, 1],
  "s-mid":  [6, 1],
};

/** Module-level flag so FLEXIBLE_CSS is only injected into <head> once per page load. */
let styleInjected = false;

/**
 * FlexibleSectionRenderer — top-level section component for the FLEXIBLE section type.
 *
 * Responsibilities:
 * - Inject shared CSS animations and card effects once into <head>
 * - Render an optional background image layer and optional animated background
 * - Render optional header/footer graphic overlays
 * - Delegate block rendering to DesignerBlocksRenderer (designer mockup format)
 *   or to GridLayout / AbsoluteLayout / PresetLayout (classic FlexibleElement format)
 */
export default function FlexibleSectionRenderer({ section }: FlexibleSectionRendererProps) {
  const { content, background, paddingTop, paddingBottom, paddingTopMobile, paddingBottomMobile } = section;
  // contentMode: "single" = 100vh snap section; "multi" = free-growing height
  const contentMode = section.contentMode || (content as any).contentMode || "single";
  const {
    layout = { type: "preset" as const, preset: "2-col-split" as const },
    elements = [],
    headerGraphic,
    footerGraphic,
    sectionHeading,
    sectionSubheading,
    sectionEyebrow,
    sectionLead,
    sectionHeaderVariant = "centered",
    sectionFooter,
  } = content as typeof content & {
    sectionHeading?: string;
    sectionSubheading?: string;
    sectionEyebrow?: string;
    sectionLead?: string;
    sectionHeaderVariant?: "centered" | "split";
    sectionFooter?: { leftText?: string; rightButton?: { label: string; href: string } };
  };
  const mosaicMode = (layout as any).layoutMode === "mosaic";
  // Designer data (mockup format) — used when elements array is empty
  const designerData = (content as any).designerData as string | Record<string, unknown> | null | undefined;

  // Scroll Stage config — only active when contentMode === "multi" and enabled
  const scrollStage = (content as any).scrollStage as import("./scroll-stage/types").ScrollStageConfig | undefined;
  const scrollStageActive = contentMode === "multi" && scrollStage?.enabled === true && (scrollStage.zones?.length ?? 0) > 0;
  // Tracks the current scroll stage zone so content column shows only the active zone's blocks
  const [scrollStageZone, setScrollStageZone] = useState(0);

  // Animated background config from content.animBg
  const animBg: AnimBgConfig = (content as any).animBg || DEFAULT_ANIM_BG_CONFIG;

  // Decorative watermark (oversized faded number/word, top-right) — content.watermark
  const watermarkText = ((content as any).watermark as string | undefined)?.trim() || "";
  // Diagonal slab — clip the section at an angle top & bottom — content.diagonalSlab
  const diagonalSlab = (content as any).diagonalSlab === true;

  // Section ref passed to AnimBgRenderer for IntersectionObserver
  const sectionRef = useRef<HTMLElement>(null);

  // Background image fields stored directly on section (not inside content)
  const bgImageUrl      = (section as any).bgImageUrl      as string | undefined;
  const bgImageSize     = (section as any).bgImageSize     as string | undefined;
  const bgImagePosition = (section as any).bgImagePosition as string | undefined;
  const bgImageRepeat   = (section as any).bgImageRepeat   as string | undefined;
  const bgImageOpacity  = (section as any).bgImageOpacity  as number | undefined;

  // Inject shared card/animation CSS once — avoids duplicate <style> tags on re-renders
  useEffect(() => {
    if (styleInjected) return;
    const el = document.createElement("style");
    el.textContent = FLEXIBLE_CSS;
    document.head.appendChild(el);
    styleInjected = true;
  }, []);

  // Resolve the background to a CSS color/gradient string and determine text contrast
  const bgColor  = resolveBgColor(background);
  const darkBg   = isDarkBackground(background);
  // Gradient backgrounds require the `background` shorthand instead of `background-color`
  const isBgGrad = isGradient(bgColor);
  // When the section background is a theme token, default text follows the theme
  // (so it flips with light/dark). Otherwise keep the contrast-based hex defaults.
  const themedBg     = isThemeToken(background);
  const sectionText  = themedBg ? "var(--theme-text)"  : (darkBg ? "#fff" : "#212529");
  const sectionMuted = themedBg ? "var(--theme-muted)" : (darkBg ? "rgba(255,255,255,0.7)" : "#6c757d");
  // Section gradient OVERLAY (content.gradient, set in the Background tab). It was saved
  // but never drawn, so a gradient configured over a bg image did nothing (#59). Build the
  // CSS here and render it as a scrim over the image below.
  const gradCfg = (content as any).gradient as { enabled?: boolean; preset?: { direction?: string; color?: string; startOpacity?: number; endOpacity?: number } } | undefined;
  const gradCss: string | null = (() => {
    const p = gradCfg?.preset;
    if (!p) return null;
    const so = p.startOpacity ?? 0, eo = p.endOpacity ?? 0;
    if (so <= 0 && eo <= 0) return null;
    const h = (p.color || "#000000").replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) || 0, g = parseInt(h.slice(2, 4), 16) || 0, b = parseInt(h.slice(4, 6), 16) || 0;
    const DIR: Record<string, string> = { top: "to top", bottom: "to bottom", left: "to left", right: "to right", topLeft: "to top left", topRight: "to top right", bottomLeft: "to bottom left", bottomRight: "to bottom right" };
    return `linear-gradient(${DIR[p.direction || "bottom"] || "to bottom"}, rgba(${r},${g},${b},${so / 100}), rgba(${r},${g},${b},${eo / 100}))`;
  })();

  return (
    <section
      ref={sectionRef}
      id={section.id}
      className="cms-section flexible-section"
      data-content-mode={contentMode || "single"}
      style={{
        "--section-bg":  isBgGrad ? "#0f0c29" : bgColor,
        "--section-text":  sectionText,
        "--section-muted": sectionMuted,
        "--section-pt":  `${paddingTop  ?? 80}px`,
        "--section-pb":  `${paddingBottom ?? 80}px`,
        ...(paddingTopMobile != null && { "--section-pt-mobile": `${paddingTopMobile}px` }),
        ...(paddingBottomMobile != null && { "--section-pb-mobile": `${paddingBottomMobile}px` }),
        position: "relative",
        ...(isBgGrad ? { background: bgColor } : {}),
        ...(diagonalSlab ? { clipPath: "polygon(0 4%, 100% 0, 100% 96%, 0 100%)", overflow: "hidden" } : {}),
      } as React.CSSProperties}
    >
      {/* Decorative watermark — oversized faded number/word, top-right */}
      {watermarkText && (
        <span aria-hidden="true" className="cms-section-watermark">{watermarkText}</span>
      )}

      {/* Background image layer — absolute fill, z-index 0, below everything */}
      {bgImageUrl && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: bgImageSize || "cover",
            backgroundPosition: bgImagePosition || "center",
            backgroundRepeat: bgImageRepeat || "no-repeat",
            opacity: (bgImageOpacity ?? 100) / 100,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Gradient overlay (scrim) over the bg image — colour/direction/opacity from the
          Background tab's gradient controls. z-index 1 = above the image, below content. */}
      {gradCss && bgImageUrl && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, background: gradCss, pointerEvents: "none" }} />
      )}

      {/* Animated background layers — rendered below content (z-index 0–10).
          Disabled when a background image is set (bgImageUrl takes priority). */}
      {animBg?.enabled && !bgImageUrl && (
        <AnimBgRenderer
          config={animBg}
          colorPalette={section.colorPalette}
          sectionRef={sectionRef}
          sectionBackground={background}
        />
      )}

      {headerGraphic?.enabled && (
        <div className="section-header-graphic" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 }}>
          <GraphicRenderer config={headerGraphic} />
        </div>
      )}

      <div
        className="section-content-wrapper"
        style={{
          position: "relative",
          zIndex: 11,
          // Scroll stage: remove padding and overflow so sticky columns work against #snap-container
          ...(scrollStageActive ? { paddingTop: 0, paddingBottom: 0, overflow: "visible", height: "auto" } : {}),
        }}
      >
        {/* Section header — above content when sectionHeading is configured */}
        {sectionHeading && !scrollStageActive && (
          <div className="container-fluid">
            <SectionHeader
              heading={sectionHeading}
              subheading={sectionSubheading}
              eyebrow={sectionEyebrow}
              lead={sectionLead}
              variant={sectionHeaderVariant}
              darkBg={darkBg}
            />
          </div>
        )}

        {scrollStageActive ? (
          <ScrollStageWrapper
            config={scrollStage!}
            multiLimit={scrollStage!.zones.length}
            contentPaddingTop={paddingTop ?? 100}
            contentPaddingBottom={paddingBottom ?? 100}
            onActiveZoneChange={setScrollStageZone}
          >
            <div className="container-fluid px-0" style={{ overflow: 'hidden', height: '100%' }}>
              {designerData
                ? <DesignerBlocksRenderer designerData={designerData} darkBg={darkBg} scrollStageZone={scrollStageZone} />
                : <>
                    {layout.type === "grid"     && <GridLayout    layout={layout} elements={elements} darkBg={darkBg} />}
                    {layout.type === "absolute" && <AbsoluteLayout elements={elements} darkBg={darkBg} />}
                    {layout.type === "preset"   && <PresetLayout  preset={layout.preset!} elements={elements} darkBg={darkBg} />}
                  </>
              }
            </div>
          </ScrollStageWrapper>
        ) : (
          <div className="container-fluid">
            {/* If we have designer data (mockup block format), render that first */}
            {designerData
              ? <DesignerBlocksRenderer designerData={designerData} darkBg={darkBg} />
              : <>
                  {mosaicMode
                    ? <MosaicLayout elements={elements} layout={layout as any} darkBg={darkBg} />
                    : <>
                        {layout.type === "grid"     && <GridLayout    layout={layout} elements={elements} darkBg={darkBg} />}
                        {layout.type === "absolute" && <AbsoluteLayout elements={elements} darkBg={darkBg} />}
                        {layout.type === "preset"   && <PresetLayout  preset={layout.preset!} elements={elements} darkBg={darkBg} />}
                      </>
                  }
                </>
            }
          </div>
        )}

        {/* Section footer row */}
        {sectionFooter && !scrollStageActive && (
          <div className="container-fluid">
            <div className="flex-section-footer">
              {sectionFooter.leftText && (
                <SectionFooterText text={sectionFooter.leftText} />
              )}
              {sectionFooter.rightButton && (
                <a href={sectionFooter.rightButton.href} className="flex-section-footer-btn">
                  {sectionFooter.rightButton.label} →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {footerGraphic?.enabled && (
        <div className="section-footer-graphic" style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1 }}>
          <GraphicRenderer config={footerGraphic} />
        </div>
      )}
    </section>
  );
}

// ─── Section header / footer components ─────────────────────────────────────

function SectionHeader({ heading, subheading, eyebrow, lead, variant, darkBg }: {
  heading: string; subheading?: string; eyebrow?: string; lead?: string;
  variant?: "centered" | "split"; darkBg: boolean;
}) {
  const tc = "var(--section-text)";
  const isSplit = variant === "split";

  return (
    <div className={`flex-section-header${isSplit ? " flex-section-header-split" : " text-center"}`} style={{ marginBottom: "32px" }}>
      <div className={isSplit ? "fsh-heading" : undefined}>
        {eyebrow && (
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--bs-success, #22c55e)", marginBottom: "12px" }}>
            {eyebrow}
          </p>
        )}
        <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1.1, color: tc, margin: 0 }}>
          {renderAccentText(heading)}
        </h2>
        {!isSplit && subheading && (
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: tc, opacity: 0.7, marginTop: "12px", marginBottom: 0 }}>
            {subheading}
          </p>
        )}
      </div>
      {isSplit && (lead || subheading) && (
        <div className="fsh-lead">
          <p style={{ fontSize: "clamp(15px, 1.8vw, 17px)", color: tc, opacity: 0.72, lineHeight: 1.6, margin: 0 }}>
            {lead || subheading}
          </p>
        </div>
      )}
    </div>
  );
}

/** Renders section footer left-text, converting [em]...[/em] to green-coloured spans */
function SectionFooterText({ text }: { text: string }) {
  const parts = text.split(/(\[em\].*?\[\/em\])/g);
  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[em\](.*)\[\/em\]$/);
        if (match) return <em key={i}>{match[1]}</em>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ─── Mosaic grid layout ──────────────────────────────────────────────────────

function MosaicLayout({ elements, layout, darkBg }: {
  elements: FlexibleElement[];
  layout: { gridAutoRows?: number; gridGap?: number; };
  darkBg: boolean;
}) {
  const rowH = layout.gridAutoRows ?? 180;
  const gap  = layout.gridGap ?? 14;

  return (
    <div
      className="flex-mosaic-grid"
      style={{ gridAutoRows: `${rowH}px`, gap: `${gap}px` }}
    >
      {elements.map(el => {
        const preset = el.position.mosaicPreset ? MOSAIC_PRESETS[el.position.mosaicPreset] : null;
        const colSpan = el.position.colSpan ?? (preset ? preset[0] : 12);
        const rowSpan = el.position.rowSpan ?? (preset ? preset[1] : 1);
        const elStyle = (el as any).style || {};
        return (
          <div
            key={el.id}
            style={{
              gridColumn: `span ${colSpan}`,
              gridRow: `span ${rowSpan}`,
              overflow: "hidden",
              borderRadius: elStyle.borderRadius ?? 4,
              position: "relative",
              ...(elStyle.backgroundColor ? { backgroundColor: elStyle.backgroundColor } : {}),
              ...(elStyle.backgroundImage ? {
                backgroundImage: `url(${elStyle.backgroundImage})`,
                backgroundSize: elStyle.backgroundSize || "cover",
                backgroundPosition: elStyle.backgroundPosition || "center",
              } : {}),
            }}
          >
            <FlexibleElementRenderer element={el} darkBg={darkBg} />
          </div>
        );
      })}
    </div>
  );
}

/** Thin wrapper used by MosaicLayout to render individual FlexibleElement blocks */
function FlexibleElementRenderer({ element, darkBg }: { element: FlexibleElement; darkBg: boolean }) {
  const tc = "var(--section-text)";
  const c = element.content;

  switch (element.type) {
    case "steps": return <StepsBlock c={c} tc={tc} />;
    case "marquee": return <MarqueeBlock c={c} />;
    case "packages": return <PackagesBlock networkSlug={c.networkSlug} columns={c.packageColumns} darkBg={darkBg} />;
    case "pricing-tabs": return <PricingTabsBlock content={c as Record<string, unknown>} darkBg={darkBg} />;
    case "photo-strip": return <PhotoStripBlock c={c} />;
    case "stats": return (
      <div style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <StatsBlockEnhanced c={c} tc={tc} />
      </div>
    );
    case "image": return c.imageSrc ? (
      <div style={{ width: "100%", height: "100%", backgroundImage: `url(${c.imageSrc})`, backgroundSize: c.imageFit || "cover", backgroundPosition: "center" }} />
    ) : null;
    default: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cx = c as any;
      const hasImg = !!(element as any).style?.backgroundImage;
      const numbered = !hasImg && !!cx.cardNumber;
      return (
        <div
          className={`flex-card-default${numbered ? " flex-card-numbered" : ""}`}
          style={{
            height: "100%", display: "flex", flexDirection: "column",
            justifyContent: numbered ? "flex-start" : hasImg ? "flex-end" : "center",
            ...(hasImg ? { background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)" } : { padding: numbered ? "28px" : "26px", color: tc }),
          }}
        >
          {numbered && <div className="flex-card-number" aria-hidden="true">{cx.cardNumber}</div>}
          <div style={{ padding: hasImg ? "16px 20px" : 0 }}>
            {cx.eyebrow    && <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--bs-success, #22c55e)", margin: "0 0 8px" }}>{cx.eyebrow}</p>}
            {cx.heading    && <h3 className={numbered ? "flex-card-heading" : "flex-card-heading"} style={{ margin: "0 0 8px", fontSize: numbered ? "clamp(16px, 1.9vw, 21px)" : "clamp(15px, 1.8vw, 19px)", fontWeight: 700, color: hasImg ? "#fff" : tc }}>{cx.heading}</h3>}
            {cx.subheading && <p style={{ margin: "0 0 4px", opacity: 0.85, fontSize: "13px", fontWeight: 600, color: hasImg ? "rgba(255,255,255,0.85)" : tc }}>{cx.subheading}</p>}
            {cx.text       && <p style={{ margin: 0, opacity: hasImg ? 0.6 : 0.75, fontSize: numbered ? "13.5px" : "13px", lineHeight: numbered ? 1.55 : 1.5, color: hasImg ? "#fff" : tc }}>{cx.text}</p>}
            {Array.isArray(cx.chips) && cx.chips.length > 0 && (
              <div className="flex-step-chips" style={{ marginTop: "16px" }}>
                {(cx.chips as string[]).map((chip, ci) => <span key={ci} className="flex-step-chip">{chip}</span>)}
              </div>
            )}
          </div>
        </div>
      );
    }
  }
}

// ─── New block type components ────────────────────────────────────────────────

/** Numbered steps block — 64px green counter + heading + subtext per step */
function StepsBlock({ c, tc }: { c: FlexibleElement["content"]; tc: string }) {
  const steps = c.steps || [];
  const numW  = c.stepsNumberWidth ?? 120;
  const hasDividers = c.stepsDividers !== false;
  const hasLastDiv  = c.stepsLastDivider !== false;
  // "rich" (Sonic service-row) layout activates when any step carries a tag or chips.
  const rich = steps.some((s) => {
    const x = s as Record<string, unknown>;
    return !!x.tag || (Array.isArray(x.chips) && x.chips.length > 0);
  });

  return (
    <div className="flex-steps-block" style={{ color: tc }}>
      {steps.map((step, i) => {
        const x = step as Record<string, unknown>;
        const chips = Array.isArray(x.chips) ? (x.chips as string[]) : [];
        return (
          <div
            key={i}
            className={`flex-step-row${rich ? " flex-step-row--rich" : ""}`}
            style={{
              gridTemplateColumns: rich ? undefined : `${numW}px 1fr`,
              borderTop: hasDividers ? `1px solid ${tc}22` : "none",
              borderBottom: hasLastDiv && i === steps.length - 1 ? `1px solid ${tc}22` : "none",
            }}
          >
            <div className="flex-step-number">{step.number}</div>
            {rich ? (
              <>
                <div className="flex-step-main">
                  <p className="flex-step-heading">{step.heading}</p>
                  {!!x.tag && <p className="flex-step-tag">{x.tag as string}</p>}
                </div>
                <div className="flex-step-side">
                  {step.subtext && <p className="flex-step-desc">{step.subtext}</p>}
                  {chips.length > 0 && (
                    <div className="flex-step-chips">
                      {chips.map((chip, ci) => (
                        <span key={ci} className="flex-step-chip">{chip}</span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ paddingTop: "8px" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "clamp(15px, 2vw, 18px)" }}>{step.heading}</p>
                {step.subtext && <p style={{ margin: 0, opacity: 0.65, fontSize: "14px", lineHeight: 1.5 }}>{step.subtext}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Photo strip — equal-width columns of background images */
function PhotoStripBlock({ c }: { c: FlexibleElement["content"] }) {
  const images = c.photoStripImages || [];
  const cols   = c.photoStripColumns ?? (images.length || 4);
  const height = c.photoStripHeight ?? 180;
  const gap    = c.photoStripGap ?? 4;
  const hover  = c.photoStripHoverBrightness !== false;

  return (
    <div
      className="flex-photo-strip"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, height: `${height}px`, gap: `${gap}px` }}
    >
      {images.map((img, i) => (
        <div
          key={i}
          className={`flex-photo-strip-cell${hover ? " hover-brightness" : ""}`}
          role="img"
          aria-label={img.alt || ""}
          style={{
            backgroundImage: `url(${img.src})`,
            filter: hover ? "brightness(0.85)" : "none",
          }}
        />
      ))}
    </div>
  );
}

/**
 * MarqueeBlock — animated horizontal strip (the design's town/stat marquee).
 * Items duplicated once so a -50% translate loops seamlessly. Speed (seconds),
 * direction (left/right via animation-direction), pause-on-hover and separator
 * glyph are all author-configurable. Respects prefers-reduced-motion (CSS).
 */
function MarqueeBlock({ c }: { c: FlexibleElement["content"] }) {
  const items = c.marqueeItems || [];
  if (items.length === 0) return null;
  const speed = c.marqueeSpeed ?? 36;
  const direction = c.marqueeDirection === "right" ? "reverse" : "normal";
  const pause = c.marqueePauseOnHover !== false;
  const style = c.marqueeStyle ?? "town";
  const sep = c.marqueeSeparator ?? "star";
  const sepGlyph = sep === "star" ? "✦" : sep === "dot" ? "•" : sep === "bar" ? "|" : "";
  // Duplicate the list so translateX(-50%) wraps seamlessly
  const loop = [...items, ...items];

  return (
    <div className="flex-marquee">
      <div
        className={`flex-marquee-track${pause ? " pause" : ""}`}
        style={{ animationDuration: `${speed}s`, animationDirection: direction }}
      >
        {loop.map((it, i) => (
          <span
            key={i}
            className={`flex-marquee-item${style === "stat" ? " flex-marquee-item--stat" : ""}`}
            aria-hidden={i >= items.length ? true : undefined}
          >
            {style === "stat" && it.value ? (
              <>
                <span className="mq-v">{it.value}</span>
                <span className="mq-l">{it.label}</span>
              </>
            ) : (
              it.label
            )}
            {sepGlyph && <span className="flex-marquee-sep" aria-hidden="true">{sepGlyph}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Numbered step card with optional horizontal connector line on the right edge */
function HowStepsBlock({ p, darkBg }: { p: Record<string, unknown>; darkBg: boolean }) {
  const accent = (p.accentColor as string) || "var(--bs-success, #22c55e)";
  const textColor = "var(--section-text)";
  return (
    <div style={{ position: "relative", height: "100%", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, lineHeight: 1, color: accent, letterSpacing: "-0.04em" }}>
        {(p.stepNumber as string) || "01"}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: textColor, lineHeight: 1.2 }}>
        {(p.title as string) || "Step Title"}
      </div>
      <div style={{ fontSize: "14px", color: darkBg ? "rgba(255,255,255,0.7)" : "#6c757d", lineHeight: 1.55 }}>
        {(p.description as string) || ""}
      </div>
      {!p.isLast && (
        <div style={{
          position: "absolute", right: -1, top: "50%", transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderLeft: `10px solid ${accent}`,
        }} />
      )}
    </div>
  );
}

/** Contact form block — submits to /api/contact, fields configurable via props */
function ContactFormBlock({ p, darkBg }: { p: Record<string, unknown>; darkBg: boolean }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const fields = (p.fields as Record<string, boolean>) || { name: true, email: true, message: true };
  const successMsg = (p.successMessage as string) || "Thank you! We'll be in touch shortly.";
  const submitLabel = (p.submitLabel as string) || "Send Message";
  const formTitle = p.formTitle as string | undefined;
  // NOTE: p.emailTo is intentionally NOT sent to the API — the recipient is
  // resolved server-side from the block config to prevent open-relay abuse.
  // Booking-form extensions: preferred-date + location selector.
  const locationOptions = (Array.isArray(p.locationOptions) ? (p.locationOptions as string[]) : []).filter(Boolean);
  const locationLabel = (p.locationLabel as string) || "Preferred location";
  const dateLabel = (p.dateLabel as string) || "Preferred date";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "14px",
    borderRadius: 6, border: `1px solid ${darkBg ? "rgba(255,255,255,0.2)" : "#ced4da"}`,
    background: darkBg ? "rgba(255,255,255,0.07)" : "#fff",
    color: darkBg ? "#fff" : "#212529",
    outline: "none",
    // Keep native controls (e.g. type="date" text + calendar icon) legible on dark backgrounds
    colorScheme: darkBg ? "dark" : "light",
  };

  const handleChange = (field: string, value: string) =>
    setFormValues(prev => ({ ...prev, [field]: value }));

  // Default-select the first location so a value is always submitted even if the
  // visitor never clicks the pre-highlighted option (single-clinic case).
  useEffect(() => {
    if (fields.location && !formValues.location && locationOptions.length > 0) {
      setFormValues(prev => ({ ...prev, location: locationOptions[0] }));
    }
  }, [fields.location, formValues.location, locationOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // pageSlug lets the API log the lead against (and resolve the recipient
        // from) the page this form lives on. emailTo is never sent — see above.
        body: JSON.stringify({ ...formValues, pageSlug: window.location.pathname }),
      });
      if (res.ok) { setSubmitted(true); }
      else { setError("Something went wrong. Please try again."); }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        <i className="bi bi-check-circle-fill" style={{ fontSize: "2.5rem", color: "var(--bs-success, #22c55e)" }} />
        <p style={{ marginTop: 12, fontSize: "16px", color: darkBg ? "#fff" : "#212529" }}>{successMsg}</p>
      </div>
    );
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", fontWeight: 600, marginBottom: 4,
    color: darkBg ? "rgba(255,255,255,0.75)" : "#495057",
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      {formTitle && (
        <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: 4, color: darkBg ? "#fff" : "#212529" }}>
          {formTitle}
        </div>
      )}
      {fields.name && (
        <div>
          <label style={labelStyle}>Name</label>
          <input required style={inputStyle} value={formValues.name || ""} onChange={e => handleChange("name", e.target.value)} placeholder="Your name" />
        </div>
      )}
      {fields.email && (
        <div>
          <label style={labelStyle}>Email</label>
          <input required type="email" style={inputStyle} value={formValues.email || ""} onChange={e => handleChange("email", e.target.value)} placeholder="you@email.com" />
        </div>
      )}
      {fields.phone && (
        <div>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={formValues.phone || ""} onChange={e => handleChange("phone", e.target.value)} placeholder="+27 000 000 0000" />
        </div>
      )}
      {fields.subject && (
        <div>
          <label style={labelStyle}>Subject</label>
          <input style={inputStyle} value={formValues.subject || ""} onChange={e => handleChange("subject", e.target.value)} placeholder="Subject" />
        </div>
      )}
      {fields.location && locationOptions.length > 0 && (
        <div>
          <label style={labelStyle}>{locationLabel}</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {locationOptions.map((opt) => {
              const active = (formValues.location || locationOptions[0]) === opt;
              return (
                <label
                  key={opt}
                  style={{
                    flex: locationOptions.length <= 3 ? 1 : undefined,
                    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                    padding: "10px 14px", borderRadius: 8, fontSize: 14,
                    border: `1px solid ${active ? "var(--bs-success, #2BB3CC)" : darkBg ? "rgba(255,255,255,0.2)" : "#ced4da"}`,
                    background: active ? (darkBg ? "rgba(43,179,204,0.18)" : "#D6F1F7") : (darkBg ? "rgba(255,255,255,0.07)" : "#fff"),
                    color: darkBg ? "#fff" : "#212529",
                  }}
                >
                  <input type="radio" name="location" value={opt} checked={active} onChange={() => handleChange("location", opt)} style={{ accentColor: "var(--bs-success, #2BB3CC)" }} />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      {fields.date && (
        <div>
          <label style={labelStyle}>{dateLabel}</label>
          <input type="date" style={inputStyle} value={formValues.date || ""} onChange={e => handleChange("date", e.target.value)} />
        </div>
      )}
      {fields.message && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <label style={labelStyle}>Message</label>
          <textarea
            required
            rows={4}
            style={{ ...inputStyle, resize: "vertical", flex: 1 }}
            value={formValues.message || ""}
            onChange={e => handleChange("message", e.target.value)}
            placeholder="Your message…"
          />
        </div>
      )}
      {error && <div style={{ fontSize: "13px", color: "#dc3545" }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "10px 24px", background: "var(--bs-success, #22c55e)", color: "#fff",
          border: "none", borderRadius: 6, fontWeight: 600, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}

/** Enhanced stats block — animated countUp + style variants (stacked / counter / row-dividers) */
function StatsBlockEnhanced({ c, tc }: { c: FlexibleElement["content"]; tc: string }) {
  const numRef     = useRef<HTMLSpanElement>(null);
  const animDone   = useRef(false);
  const numStr     = c.statsNumber || "0";
  const prefix     = c.statsPrefix || "";
  const suffix     = c.statsSuffix || "";
  const dispSuffix = c.statsDisplaySuffix || c.statsLabel || "";
  const duration   = c.statsCountDuration ?? 1600;
  const animate    = c.statsAnimateOnScroll !== false;
  const variant    = c.statsStyleVariant || "stacked";
  const accentColor = c.statsAccentColor || "var(--bs-success, #22c55e)";

  useEffect(() => {
    if (!animate || !numRef.current) return;
    const match = numStr.match(/^(\d[\d,.]*)(.*)/);
    if (!match) return;
    const target = parseFloat(match[1].replace(/,/g, ""));
    if (isNaN(target)) return;
    const el = numRef.current;
    el.textContent = prefix + "0" + suffix;
    animDone.current = false;

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || animDone.current) return;
      animDone.current = true;
      obs.disconnect();
      const start = performance.now();
      function step(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(eased * target).toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.3 });

    if (numRef.current.parentElement) obs.observe(numRef.current.parentElement);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numStr, duration, animate]);

  if (variant === "stacked") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 700, color: accentColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <span ref={numRef}>{prefix}{numStr}{suffix}</span>
        </div>
        {dispSuffix && <p style={{ margin: "8px 0 0", fontSize: "13px", opacity: 0.65, color: tc, letterSpacing: "0.06em", textTransform: "uppercase" }}>{dispSuffix}</p>}
      </div>
    );
  }

  if (variant === "counter") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span ref={numRef} style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, color: tc, fontVariantNumeric: "tabular-nums" }}>
          {prefix}{numStr}{suffix}
        </span>
        {dispSuffix && <span style={{ fontSize: "13px", color: accentColor, fontWeight: 700 }}>{dispSuffix}</span>}
      </div>
    );
  }

  // row-dividers
  return (
    <div style={{ borderTop: `1px solid ${tc}22`, borderBottom: `1px solid ${tc}22`, padding: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span ref={numRef} style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, color: accentColor, fontVariantNumeric: "tabular-nums" }}>
          {prefix}{numStr}{suffix}
        </span>
        {dispSuffix && <span style={{ fontSize: "14px", color: tc, opacity: 0.7 }}>{dispSuffix}</span>}
      </div>
    </div>
  );
}

// ─── Designer block helpers ───────────────────────────────────────────────────

/**
 * BlockStyleInjector — mounts a bare style element and keeps its textContent
 * in sync with the css prop via a ref+effect.
 * Used to apply per-block customCss from the designer without global side-effects.
 */
function BlockStyleInjector({ css }: { css: string }) {
  const ref = useRef<HTMLStyleElement>(null);
  // Sync CSS string into the DOM node whenever the prop changes
  useEffect(() => { if (ref.current) ref.current.textContent = css; }, [css]);
  return <style ref={ref} />;
}

// ─── Designer Blocks Renderer (mockup format) ────────────────────────────────

/** Pixel coordinates and dimensions for a block within the designer canvas. */
type PixelPos = { x: number; y: number; w: number; h: number };

/**
 * Convert an absolute pixel value to a percentage of a canvas dimension.
 * Guards against non-finite inputs (e.g. undefined or NaN from JSON) by defaulting to 0.
 */
function pct(px: unknown, canvas: number): string {
  const n = isFinite(Number(px)) ? Number(px) : 0;
  return ((n / canvas) * 100).toFixed(3) + "%";
}

/**
 * Return the correct PixelPos for the current screen width using
 * the responsive breakpoints matching the designer canvas (mobile ≤575, tablet ≤991).
 * Falls back to the desktop pixelPos or a safe default if none is defined.
 */
function pickPos(block: { pixelPos?: PixelPos; tabletPos?: PixelPos; mobilePos?: PixelPos }, screenW: number): PixelPos {
  if (screenW <= 575 && block.mobilePos) return block.mobilePos;
  if (screenW <= 991 && block.tabletPos) return block.tabletPos;
  return block.pixelPos || { x: 0, y: 0, w: 300, h: 180 };
}

/**
 * Return the canonical canvas reference width for the active breakpoint.
 * This is needed to convert pixel positions to correct percentages — each
 * breakpoint has its own canvas width (mobile=375, tablet=768, desktop=variable).
 */
function canvasRefW(block: { pixelPos?: PixelPos; tabletPos?: PixelPos; mobilePos?: PixelPos }, desktopCW: number, screenW: number): number {
  if (screenW <= 575 && block.mobilePos) return 375;
  if (screenW <= 991 && block.tabletPos) return 768;
  return desktopCW;
}

/**
 * DesignerBlocksRenderer — parses the JSON blob saved by flexible-designer.html
 * and renders the contained blocks using the correct layout engine:
 *   - "free"  → absolute percentage-based positioning
 *   - "grid"  → CSS grid with row/col coordinates from block.position
 *   - preset  → flex fallback (single-row or stacked for multi-section mode)
 *
 * Tracks window width via state so blocks re-position correctly across breakpoints.
 * Renders a graceful error message if designerData fails to parse.
 */
// Resolve {{pkg.*}} tokens in a block's string props (+ string-array items like
// chips) and its sub-elements' props, using the block's bound package. Used for the
// mosaic render path (designerBlockToElement) so card heading/subheading/chips bind.
function resolveBlockTokens<T extends { props?: Record<string, unknown>; subElements?: SubEl[] }>(block: T, pkg: PackageLike | null | undefined): T {
  if (!pkg) return block;
  const resolveProps = (props?: Record<string, unknown>) => props
    ? Object.fromEntries(Object.entries(props).map(([k, v]) => [
        k,
        typeof v === "string" ? resolvePackageTokens(v, pkg)
          : Array.isArray(v) ? v.map((x) => (typeof x === "string" ? resolvePackageTokens(x, pkg) : x))
          : v,
      ]))
    : props;
  return {
    ...block,
    props: resolveProps(block.props),
    subElements: block.subElements?.map((s) => ({ ...s, props: resolveProps(s.props) as Record<string, unknown> })),
  };
}

function DesignerBlocksRenderer({ designerData, darkBg, scrollStageZone }: { designerData: string | Record<string, unknown>; darkBg: boolean; scrollStageZone?: number }) {
  // Hooks must be called before any conditional returns
  const [screenW, setScreenW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  // Update screen width on resize so responsive positions re-calculate
  useEffect(() => {
    const onResize = () => setScreenW(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Measured width of the free-mode stage container — drives the 1:1 scale factor so the
  // live section is a pixel-exact scaled copy of the designer canvas (see free-mode branch).
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  // Mount gate — the free-mode mobile reflow (screenW <= 768) must only apply AFTER
  // hydration, otherwise SSR (which has no window) and the first client paint disagree
  // and React throws a hydration mismatch. Desktop scaled-stage renders identically on
  // both, so it stays the pre-mount default.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Coverage-plugin package binding ───────────────────────────────────────
  // Collect every package referenced by a bound card, fetch them once, and expose
  // a map so {{pkg.*}} tokens resolve in the mosaic render path.
  const packageIds = useMemo(() => {
    try {
      const d = typeof designerData === "string" ? JSON.parse(designerData) : designerData;
      const ids = new Set<string>();
      for (const b of ((d?.blocks as Array<{ props?: { packageId?: string } }>) || [])) {
        if (b?.props?.packageId) ids.add(String(b.props.packageId));
      }
      return [...ids];
    } catch { return []; }
  }, [designerData]);
  const [packageMap, setPackageMap] = useState<Record<string, PackageLike>>({});
  useEffect(() => {
    if (packageIds.length === 0) { setPackageMap({}); return; }
    let alive = true;
    fetch(`/api/packages?ids=${packageIds.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.packages) setPackageMap(Object.fromEntries((d.packages as PackageLike[]).map((pp) => [pp.id, pp]))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [packageIds]);

  // ── Google Font loading ───────────────────────────────────────────────────
  // The designer stores a chosen font as props.fontFamily (e.g. "'Poppins', sans-serif")
  // and the render path applies it as CSS — but nothing LOADS the webfont in the
  // published page. Without the stylesheet the browser falls back to the default
  // family, so a saved font appears to "revert to default" on save/reload.
  // Collect every family referenced by blocks + sub-elements and inject the
  // matching Google Fonts stylesheet once (guarded by a derived id).
  // TODO(custom-fonts): user-UPLOADED font files (not Google Fonts) need a stored
  // @font-face source (URL/API) before they can load here — out of scope for now.
  // Each family is loaded with the UNION of weights actually used by elements of
  // that family (plus 400/700 defaults) — requesting only 400;700 made e.g. a
  // fontWeight 300 paragraph fall back to synthetic/400, wrapping differently
  // than the designer canvas (#90).
  const designerFonts = useMemo(() => {
    const GENERIC = new Set(["inherit", "sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace"]);
    const famWeights = new Map<string, Set<number>>();
    const normWeight = (w: unknown): number | null => {
      if (typeof w === "number" && Number.isFinite(w)) return w;
      if (typeof w === "string") {
        const t = w.trim().toLowerCase();
        if (t === "bold") return 700;
        if (t === "normal" || t === "regular") return 400;
        const n = parseInt(t, 10);
        if (Number.isFinite(n)) return n;
      }
      return null;
    };
    const add = (props?: Record<string, unknown>) => {
      const v = props?.fontFamily;
      if (typeof v !== "string") return;
      const m = v.match(/'([^']+)'/) || v.match(/^([^,]+)/);
      const name = (m ? m[1] : v).trim().replace(/^["']|["']$/g, "");
      if (!name || name.startsWith("-") || GENERIC.has(name.toLowerCase())) return;
      let ws = famWeights.get(name);
      if (!ws) { ws = new Set([400, 700]); famWeights.set(name, ws); }
      const w = normWeight(props?.fontWeight);
      if (w !== null && w >= 100 && w <= 900) ws.add(Math.round(w / 100) * 100);
    };
    try {
      const d = typeof designerData === "string" ? JSON.parse(designerData) : designerData;
      for (const b of ((d?.blocks as Array<{ props?: Record<string, unknown>; subElements?: Array<{ props?: Record<string, unknown> }> }>) || [])) {
        add(b?.props);
        for (const se of (b?.subElements || [])) add(se?.props);
      }
    } catch { /* parse errors handled in the render try/catch below */ }
    // css2 API requires the wght@ list in ascending order
    return [...famWeights.entries()].map(([family, ws]) => ({ family, weights: [...ws].sort((a, b) => a - b) }));
  }, [designerData]);
  useEffect(() => {
    for (const { family, weights } of designerFonts) {
      const wght = weights.join(";");
      const id = "gf-" + family.replace(/\s+/g, "-") + "-" + weights.join("_");
      if (document.getElementById(id)) continue;
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${wght}&display=swap`;
      document.head.appendChild(l);
    }
  }, [designerFonts]);

  try {
    const data = typeof designerData === 'string' ? JSON.parse(designerData) : designerData;
    const blocks: Array<{
      id: number; type: string;
      position?: { row: number; col: number; colSpan?: number; rowSpan?: number; section?: number };
      verticalAlign?: "top" | "center" | "bottom";
      pixelPos?: PixelPos;
      tabletPos?: PixelPos;
      mobilePos?: PixelPos;
      props?: Record<string, unknown>;
      subElements?: SubEl[];
    }> = data.blocks || [];

    // Nothing to render — return null to avoid empty DOM nodes
    if (blocks.length === 0) {
      return null;
    }

    const isFreeMode = data.positionMode === "free" || data.layoutType === "free";
    const isMulti    = data.contentMode === "multi";
    // multiLimit defines how many 100vh screens the section spans in multi mode
    const multiLimit = isMulti ? (data.multiLimit || 1) : 1;
    // -1 = mobile signal: show all zones stacked, normal multi layout
    const isMobileScrollStage = scrollStageZone === -1;
    // In scroll stage desktop mode use 100% so content fills the sticky column (prevents internal scroll)
    const isScrollStage = scrollStageZone !== undefined && !isMobileScrollStage;
    // Single sections: use calc to fill the padding-adjusted content area so the grid
    // doesn't overflow .section-content-wrapper and get clipped by overflow:hidden.
    // The CSS vars --section-pt / --section-pb are set as inline styles on the <section> element
    // and cascade down here, so they resolve correctly at every viewport.
    // Use max() to match the actual padding-top applied by .section-content-wrapper
    // (which enforces min 100px navbar clearance via max(--section-pt, --navbar-height)).
    // Without this, the grid is taller than available space and content spills out.
    const containerH = isScrollStage ? "100%" : (isMulti ? `${multiLimit * 100}vh` : "calc(100vh - max(var(--section-pt, 100px), var(--navbar-height, 100px)) - var(--section-pb, 80px))");
    // Filter blocks to active zone when in scroll stage desktop mode
    const filteredBlocks = isScrollStage
      ? blocks.filter(b => (b.position?.section ?? 0) === scrollStageZone)
      : blocks;

    // ── Mosaic layout mode (legacy parity) ────────────────────────────────
    // designerData authored in mosaic mode — including payloads synthesised from a
    // legacy `content.elements` mosaic section — renders through the SAME
    // MosaicLayout / FlexibleElementRenderer used by the legacy `content.elements`
    // path. Reusing the existing renderer guarantees byte-identical output (chips,
    // card styles, gridAutoRows) with no duplicated layout/card code.
    // Guard: only fires when mosaic is explicitly declared, so existing grid/preset/
    // free designerData sections are completely unaffected.
    if ((data.layout as { layoutMode?: string } | undefined)?.layoutMode === "mosaic" || data.layoutType === "mosaic") {
      const mosaicEls = filteredBlocks.map((b) => {
        const pkg = b.props?.packageId ? packageMap[String(b.props.packageId)] : null;
        return designerBlockToElement(resolveBlockTokens(b, pkg));
      });
      const mLayout = data.layout as { gridAutoRows?: number; gridGap?: number } | undefined;
      return (
        <MosaicLayout
          elements={mosaicEls}
          layout={{ gridAutoRows: mLayout?.gridAutoRows, gridGap: mLayout?.gridGap }}
          darkBg={darkBg}
        />
      );
    }

    // ── Free / absolute positioning mode — 1:1 SCALED STAGE ────────────────
    // The designer canvas is a fixed cw×ch px stage with px fonts. To render EXACTLY like
    // the designer at any viewport, we reproduce that stage in absolute PX (children exactly
    // as designed) and scale the WHOLE stage by (containerWidth / cw). The live section is
    // then a pixel-exact scaled photograph of the canvas — identical wrapping, sizes and
    // positions at every width. (Percent-positions + px-fonts could never be 1:1; that drift
    // was the recurring "designer ≠ live" bug.)
    if (isFreeMode) {
      const cw = data.designerCanvasW || 1440;
      const ch = data.designerCanvasH || 900;

      // ── Mobile: smart, readable reflow (≤768px, post-mount) ─────────────────
      // Replaces the tiny scaled photograph with a single-column reading-order stack
      // whose inter-element gaps mirror the design's grouping (adjacent/overlapping
      // elements stay tight; far-apart ones get a normal gap). See FreeReflowStack.
      if (mounted && screenW <= 768) {
        return (
          <FreeReflowStack
            blocks={filteredBlocks}
            designerCanvasW={cw}
            containerW={stageW || screenW || cw}
            darkBg={darkBg}
          />
        );
      }

      // ── Desktop: 1:1 scaled stage — pixel-exact copy of the designer canvas ─────
      const scale = (stageW || screenW || cw) / cw;
      return (
        <div ref={stageRef} style={{
          position: "relative",
          width: "100%",
          height: Math.round(ch * scale),
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: cw, height: ch,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}>
            {filteredBlocks.map((block) => {
              // Always the DESKTOP design layout — the whole stage scales, so there is no
              // per-breakpoint reflow by default (exact 1:1). Per-breakpoint mobile layouts
              // are a future opt-in.
              const pos = block.pixelPos || { x: 0, y: 0, w: 300, h: 180 };
              const subs = (block.subElements || []) as SubEl[];
              const isContainer = block.type === "text" || block.type === "text-block" || block.type === "card";
              if (isContainer && subs.length > 0) {
                // ── Designer-chrome geometry — measured 1:1 against the canvas ──────
                // The canvas does NOT place a child's text at (block.x + se.x): the
                // designer's .container-block has a 2px border, its .cb-content applies
                // the block's padding props (paddingTop/Bottom ?? 16, paddingX ?? 20),
                // and every .sub-element wrapper adds a 1px border + 6px 10px padding
                // (box-sizing: border-box, min-width 60px). So on the canvas the text
                // box actually sits at block + child + (2+padX+1+10, 2+padT+1+6) and
                // FLOWING text wraps at (se.w − 22)px, not se.w. Reproducing these
                // wrapper metrics — instead of raw (block.x+se.x, width se.w) — is what
                // makes live positions AND line breaks land exactly like the canvas.
                // A null se.w fills the padded content box, exactly like the designer's
                // `calc(100% - 0px)` inside .sub-elements-list (= pos.w − 2·padX).
                // No overflow:hidden here, so an oversized heading wraps like the
                // canvas does — it can never left-clip (the old #79 cutoff came from
                // clipping, which this wrapper doesn't do).
                const bp   = (block.props || {}) as Record<string, unknown>;
                const padT = Number(bp.paddingTop ?? 16);
                const padX = Number(bp.paddingX   ?? 20);
                return subs.map((sub, si) => (
                  <div key={String(block.id) + "-" + si} style={{
                    position: "absolute",
                    left: (pos.x || 0) + 2 + padX + (sub.x || 0),
                    top:  (pos.y || 0) + 2 + padT + (sub.y || 0),
                    width: sub.w != null ? sub.w : Math.max((pos.w || 0) - 2 * padX, 0),
                    minWidth: 60,
                    height: sub.h != null ? sub.h : undefined,
                    padding: "6px 10px",
                    border: "1px solid transparent",
                    boxSizing: "border-box",
                  }}>
                    <DesignerSubElement sub={sub} exact darkBg={darkBg} />
                  </div>
                ));
              }
              // Non-container block (hero, image, packages, etc.): whole block at its design px box.
              return (
                <div key={block.id} style={{
                  position: "absolute",
                  left: pos.x, top: pos.y, width: pos.w, height: pos.h,
                  overflow: "hidden",
                }}>
                  <DesignerBlock block={block} darkBg={darkBg} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // ── Grid layout mode ──────────────────────────────────────────────────
    const isGrid = data.layoutType === "grid";
    const cols   = data.grid?.cols || 3;
    const rows   = data.grid?.rows || 2;
    // In multi-section mode the grid must accommodate rows from all stacked sections
    // In scroll stage mode only one zone is shown at a time, so totalRows = rows
    const totalRows = isScrollStage ? rows : rows * multiLimit;
    const gap    = data.grid?.gap  ?? 16;
    const gridH  = containerH;

    if (isGrid) {
      // ── Smart row sizing ────────────────────────────────────────────────
      // If grid.rowHeights is provided (e.g. ['auto','1fr']), use it directly.
      // Otherwise auto-detect: text-only rows → 'auto' (shrink to content);
      // rows with volt/card/image/other content → '1fr' (fill remaining space).
      // This prevents the classic "heading takes 50% of section height" gap.
      const gridTemplateRows = (() => {
        const explicit = (data.grid as Record<string, unknown> | undefined)?.rowHeights as string[] | undefined;
        if (explicit && explicit.length > 0) {
          return Array.from({ length: totalRows }, (_, i) => explicit[i % explicit.length]).join(" ");
        }
        // Build a type-set per absolute row number
        const rowTypes: Record<number, Set<string>> = {};
        for (let r = 1; r <= totalRows; r++) rowTypes[r] = new Set();
        filteredBlocks.forEach(block => {
          const pos = block.position || {};
          const row = (pos as Record<string, number>).row ?? 1;
          const span = (pos as Record<string, number>).rowSpan ?? 1;
          const section = (pos as Record<string, number>).section ?? 0;
          const absStart = isScrollStage ? row : section * rows + row;
          for (let r = absStart; r < absStart + span; r++) {
            if (rowTypes[r]) rowTypes[r].add(block.type);
          }
        });
        // Visual block types that benefit from filling available space (have aspect ratios
        // or are designed to scale). All other types (text, card, button, etc.) are
        // content-driven and should collapse to their natural height.
        const FILL_TYPES = new Set(["volt", "image", "3d-object", "video", "canvas", "photo-card", "coverage-map", "projects-gallery", "gallery-cta"]);
        return Array.from({ length: totalRows }, (_, i) => {
          const types = rowTypes[i + 1];
          // A row gets '1fr' only if it contains a visual/fill block type.
          // Text, card, stat, and empty rows collapse to content height ('auto').
          const hasFillBlock = [...types].some(t => FILL_TYPES.has(t));
          return hasFillBlock ? "1fr" : "auto";
        }).join(" ");
      })();

      return (
        <div
          className="flexible-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows,
            gap: `${gap}px`,
            minHeight: gridH,
            // Start content from top — auto rows size to content, 1fr rows fill remaining space
            alignContent: "start",
          }}
        >
          {filteredBlocks.map((block) => {
            const pos           = block.position || { row: 1, col: 1, colSpan: 1, rowSpan: 1, section: 0 };
            // In scroll stage mode blocks are already filtered to active zone — no section offset needed
            const sectionOffset = isScrollStage ? 0 : (pos.section || 0) * rows;
            const absoluteRow   = sectionOffset + pos.row;
            const alignSelfMap = { top: "start", center: "center", bottom: "end" } as const;
            const blockHeightAuto = (block.props as Record<string, unknown>)?.heightMode === "auto";
            return (
              <div key={block.id} style={{
                gridColumn: `${pos.col} / span ${pos.colSpan || 1}`,
                gridRow:    `${absoluteRow} / span ${pos.rowSpan || 1}`,
                alignSelf: blockHeightAuto ? "start" : (block.verticalAlign ? alignSelfMap[block.verticalAlign] : "stretch"),
                minHeight: 0,
                // Allow slight overflow for decorative elements that extend beyond their bounds
                overflow: "visible",
              }}>
                <DesignerBlock block={block} darkBg={darkBg} />
              </div>
            );
          })}
        </div>
      );
    }

    // Preset / fallback: flex layout
    // In multi mode blocks stack vertically, each taking an equal fraction of the total height
    return (
      <div style={{
        display: "flex",
        flexDirection: isMulti ? "column" : "row",
        flexWrap: isMulti ? "nowrap" : "wrap",
        gap: `${gap ?? 16}px`,
        minHeight: gridH,
      }}>
        {filteredBlocks.map((block) => (
          <div key={block.id} style={{ flex: isMulti ? `0 0 calc(${100 / multiLimit}%)` : "1 1 280px", minWidth: 0 }}>
            <DesignerBlock block={block} darkBg={darkBg} />
          </div>
        ))}
      </div>
    );
  } catch {
    // JSON.parse or property access failed — show a non-crashing fallback
    return <div className="text-muted text-center py-4">Unable to render section layout.</div>;
  }
}

/**
 * DesignerBlock — renders a single block from the flexible-designer JSON format.
 *
 * Handles:
 * - Shell construction (background image/gradient, border, glow, shadow, shimmer)
 * - Optional per-block customCss injection via BlockStyleInjector
 * - Optional overlay colour layer (z-index 1) above the background
 * - Scroll-triggered entrance animation via IntersectionObserver
 * - Content delegation to renderInner() which switches on block.type
 */
type SubEl = { type: string; props?: Record<string, unknown>; x?: number; y?: number; w?: number | null; h?: number | null };

/**
 * Groups sub-elements into columns by clustering their x positions.
 * Sub-elements within 80px of each other horizontally are considered the same column.
 * Each column's elements are sorted by their y position (top to bottom).
 * Returns a single-element array (one column) when layout is vertical-only.
 */
function groupSubsByColumn(subs: SubEl[]): SubEl[][] {
  if (subs.length === 0) return [];
  const BUCKET = 80;
  const buckets = new Map<number, SubEl[]>();
  for (const sub of subs) {
    const key = Math.floor((sub.x ?? 0) / BUCKET) * BUCKET;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(sub);
  }
  return Array.from(buckets.keys())
    .sort((a, b) => a - b)
    .map(k => buckets.get(k)!.sort((a, b) => (a.y ?? 0) - (b.y ?? 0)));
}

function DesignerBlock({ block, darkBg }: {
  block: { type: string; props?: Record<string, unknown>; subElements?: SubEl[] };
  darkBg: boolean;
}) {
  const blockRef    = useRef<HTMLDivElement>(null);
  // Stats countUp: ref to the number display element
  const statsNumRef = useRef<HTMLDivElement>(null);
  const statsAnimDone = useRef(false);
  const p = block.props || {};
  // Default text colour based on the section's background luminance
  const tc = "var(--section-text)";
  const subs = block.subElements || [];

  // ── Card → Package binding ────────────────────────────────────────────────
  // When a card is bound to a package, fetch it so {{pkg.*}} tokens in the card's
  // label / sub-element text resolve to live values at render.
  const boundPackageId = (p.packageId as string | undefined) || undefined;
  const [boundPkg, setBoundPkg] = useState<PackageLike | null>(null);
  useEffect(() => {
    if (!boundPackageId) { setBoundPkg(null); return; }
    let alive = true;
    fetch(`/api/packages?ids=${encodeURIComponent(boundPackageId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setBoundPkg(d?.packages?.[0] ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [boundPackageId]);

  // ── Stats countUp animation ──────────────────────────────────────────────
  // Triggered once when the stats block first enters the viewport.
  // Extracts the leading numeric part from p.number (e.g. "20+" → 20, "15" → 15)
  // and animates 0 → target using ease-out cubic via rAF.
  // Skipped when p.animateCount === false (designer toggle) or the value is non-numeric.
  useEffect(() => {
    if (block.type !== "stats" || subs.length > 0) return; // only for inline stats
    if (p.animateCount === false) return;                   // designer-disabled
    const numStr = String(p.number || "");
    const match  = numStr.match(/^([^0-9]*)(\d[\d,.]*)(.*)$/);
    if (!match) return; // non-numeric label like "SANS 878" — skip automatically
    const prefix = match[1];
    const target = parseFloat(match[2].replace(/,/g, ""));
    const suffix = match[3];
    if (isNaN(target) || !statsNumRef.current) return;
    const el = statsNumRef.current;
    const duration = Number(p.animationDuration) > 0 ? Number(p.animationDuration) : 1600;
    statsAnimDone.current = false;
    el.textContent = prefix + "0" + suffix;

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || statsAnimDone.current) return;
      statsAnimDone.current = true;
      obs.disconnect();
      const start = performance.now();
      function step(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        el.textContent = prefix + Math.round(eased * target).toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.3 });

    if (blockRef.current) obs.observe(blockRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.type, p.number, p.animateCount, p.animationDuration]);

  // Padding / gap helpers
  /** Build padding CSS from block props, falling back to the provided defaults. */
  function blockPadding(defaultPx: string, defaultPxX: string): React.CSSProperties {
    const pt  = p.paddingTop    !== undefined ? `${Number(p.paddingTop)}px`    : defaultPx;
    const pb  = p.paddingBottom !== undefined ? `${Number(p.paddingBottom)}px` : defaultPx;
    const pxv = p.paddingX      !== undefined ? `${Number(p.paddingX)}px`      : defaultPxX;
    return { paddingTop: pt, paddingBottom: pb, paddingLeft: pxv, paddingRight: pxv };
  }
  const blockGap    = p.gap !== undefined ? `${Number(p.gap)}px` : undefined;
  const borderRadius = p.borderRadius !== undefined ? `${Number(p.borderRadius)}px` : "8px";

  // ── Scroll-in animation ────────────────────────────────────────────────
  const scrollAnim = (p.scrollAnim as string) || "none";
  // Hide the block immediately then reveal it with the chosen CSS animation class
  // the first time the block intersects the viewport (one-shot, observer disconnects).
  useEffect(() => {
    if (scrollAnim === "none" || !blockRef.current) return;
    const el = blockRef.current;
    el.classList.add("flex-block-hidden");
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.classList.remove("flex-block-hidden");
        el.classList.add(`flex-ba-${scrollAnim}`);
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [scrollAnim]);

  // ── Visual shell props ─────────────────────────────────────────────────
  const bgImageSafe  = safeUrl((p.bgImage as string) || "");
  const bgGradient   = (p.bgGradient as string) || "";
  const overlayColor = (p.bgOverlayColor as string) || "#000000";
  const overlayOpac  = Number(p.bgOverlayOpacity ?? 0);
  const borderWidthV    = Number(p.borderWidth ?? 0);
  const borderColorV    = (p.borderColor as string) || "";
  const borderTopWidthV = Number(p.borderTopWidth ?? 0);
  const borderTopColorV = (p.borderTopColor as string) || "";
  const boxShadowPre = (p.boxShadow as string) || "none";
  const cardEffect   = (p.cardEffect as string) || "none";
  const glowColor    = (p.glowColor as string) || "";
  const customCss    = (p.customCss as string) || "";
  // Tracks whether an external background (image or gradient) overrides the default bg
  const hasExtBg     = !!(bgImageSafe || bgGradient);

  // Divider is standalone — render as a plain <hr> with no shell wrapper
  if (block.type === "divider") {
    return <hr style={{ borderColor: (p.dividerColor as string) || "#dee2e6", borderWidth: `${Number(p.thickness) || 2}px 0 0`, margin: "8px 0" }} />;
  }

  // Build CSS class list for the shell: effect and shadow preset classes
  const shellClasses = ["flex-designer-block"];
  // shimmer uses ::before pseudo-element so it needs its own class rather than db-effect-shimmer
  if (cardEffect === "shimmer") shellClasses.push("db-effect-shimmer");
  else if (cardEffect !== "none") shellClasses.push(`db-effect-${cardEffect}`);
  if (boxShadowPre !== "none") shellClasses.push(`db-shadow-${boxShadowPre}`);

  const heightAuto = (p?.heightMode as string) === "auto";
  const shellStyle: React.CSSProperties = {
    position: "relative", height: heightAuto ? "auto" : "100%", overflow: heightAuto ? "visible" : "hidden", borderRadius,
    ...(bgImageSafe ? { background: `url("${bgImageSafe}") center/cover no-repeat` } : {}),
    ...(!bgImageSafe && bgGradient ? { background: bgGradient } : {}),
    ...(borderWidthV > 0 && borderColorV ? { border: `${borderWidthV}px solid ${borderColorV}` } : {}),
    ...(borderTopWidthV > 0 && borderTopColorV ? { borderTop: `${borderTopWidthV}px solid ${borderTopColorV}` } : {}),
    ...(glowColor ? { ["--db-glow-color" as string]: glowColor } : {}),
  };

  /**
   * renderInner — switch dispatcher that returns the inner JSX for the block.
   * Each case maps a block type string to its dedicated render output.
   * Called inside the shell wrapper so the shell handles background/overlay/effects.
   */
  function renderInner(): React.ReactNode {
    switch (block.type) {
      // ── hero: full-bleed heading + subtext + optional CTA button ──────────
      case "hero":
        return (
          <div style={{
            background: hasExtBg ? "transparent" : ((p.bgColor as string) || "#1e3a5f"),
            color: (p.textColor as string) || "#fff",
            padding: "40px 24px", height: "100%",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center",
          }}>
            {!!p.heading && <h2 style={{ margin: 0, marginBottom: "12px", fontSize: "clamp(20px,3vw,36px)", fontWeight: 700 }}>{renderAccentText(p.heading as string)}</h2>}
            {!!p.subtext && <p style={{ margin: 0, opacity: 0.85, fontSize: "clamp(14px,2vw,18px)" }}>{p.subtext as string}</p>}
            {!!p.showBtn && !!p.btnText && (
              <a href={String(p.btnNavTarget || "#")} style={{ marginTop: "20px", background: (p.btnColor as string) || "#0d6efd", color: (p.btnTextColor as string) || "#fff", padding: "10px 24px", borderRadius: "6px", textDecoration: "none", fontWeight: 600, fontSize: "14px" }}>{p.btnText as string}</a>
            )}
          </div>
        );

      // ── card: content container with optional glass morphism effect ──────
      case "card": {
        const cardGlass = (p.glassEffect as string) || "none";
        // Determine translucent background for glass variants; null means no glass
        const cardGlassBg = cardGlass === "light" ? "rgba(255,255,255,0.15)" : cardGlass === "dark" ? "rgba(0,0,0,0.35)" : null;
        // If an external background is set, keep card bg transparent so the shell bg shows through
        const cardBg = cardGlassBg ?? (hasExtBg ? "transparent" : ((p.bgColor as string) || "transparent"));
        const cardGlassStyle: React.CSSProperties = cardGlassBg ? {
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${cardGlass === "light" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)"}`,
        } : {};
        return (
          <div style={{
            background: cardBg, color: (p.textColor as string) || tc,
            height: heightAuto ? "auto" : "100%", ...cardGlassStyle,
            display: "flex", flexDirection: "column", gap: blockGap,
            ...blockPadding("24px", "24px"),
          }}>
            {!!p.label && <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>{resolvePackageTokens(p.label as string, boundPkg)}</h3>}
            {subs.map((sub, i) => <DesignerSubElement key={i} sub={sub} pkg={boundPkg} />)}
          </div>
        );
      }

      // ── text-block / text: sub-element container with optional glass effect ─
      case "text-block":
      case "text": {
        const tbGlass = (p.glassEffect as string) || "none";
        // Same glass logic as card — light/dark/none
        const tbGlassBg = tbGlass === "light" ? "rgba(255,255,255,0.15)" : tbGlass === "dark" ? "rgba(0,0,0,0.35)" : null;
        const tbBg = tbGlassBg ?? (hasExtBg ? "transparent" : ((p.bgColor as string) || "transparent"));
        const tbGlassStyle: React.CSSProperties = tbGlassBg ? {
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${tbGlass === "light" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)"}`,
        } : {};
        const outerStyle: React.CSSProperties = {
          background: tbBg, color: (p.textColor as string) || tc,
          textAlign: (p.textAlign as React.CSSProperties["textAlign"]) || undefined,
          height: "100%", ...tbGlassStyle, ...blockPadding("20px", "0px"),
        };
        // Detect multi-column layouts (e.g. 2-col, 3-col presets) from sub-element x positions.
        // On mobile (col-12) all columns stack vertically — true mobile-first behaviour.
        const columns = groupSubsByColumn(subs);
        if (columns.length > 1) {
          const colClass = columns.length === 2 ? "col-12 col-md-6"
                         : columns.length === 3 ? "col-12 col-md-4"
                         : "col-12 col-md-3";
          return (
            <div style={outerStyle}>
              <div className="row g-3">
                {columns.map((col, ci) => (
                  <div key={ci} className={colClass} style={{ display: "flex", flexDirection: "column", gap: blockGap }}>
                    {col.map((sub, i) => <DesignerSubElement key={i} sub={sub} />)}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div style={{ ...outerStyle, display: "flex", flexDirection: "column", gap: blockGap }}>
            {subs.map((sub, i) => <DesignerSubElement key={i} sub={sub} />)}
          </div>
        );
      }

      // ── banner: coloured strip with centred heading or sub-elements ─────
      case "banner":
        return (
          <div style={{
            background: hasExtBg ? "transparent" : ((p.bgColor as string) || "#1e3a5f"),
            color: (p.textColor as string) || "#fff",
            height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: blockGap || "12px", ...blockPadding("24px", "24px"),
          }}>
            {subs.length > 0
              ? subs.map((sub, i) => <DesignerSubElement key={i} sub={sub} />)
              : !!p.heading && <span style={{ fontSize: "18px", fontWeight: 600 }}>{renderAccentText(p.heading as string)}</span>
            }
          </div>
        );

      // ── stats: centred metric display — number (animated countUp), label, icon ─
      case "stats": {
        // Apply bgOpacity (0-100) to produce transparent rgba background when needed
        const statsBgRaw  = (p.bgColor as string) || "transparent";
        const statsBgOpac = p.bgOpacity !== undefined ? Number(p.bgOpacity) : 100;
        const statsBg     = hasExtBg ? "transparent" : applyBgOpacity(statsBgRaw, statsBgOpac);
        const statsColor  = (p.textColor as string) || tc;
        return (
          <div style={{
            background: statsBg,
            color: statsColor,
            // Responsive padding: scales with viewport height so content fits in short rows
            padding: "clamp(6px, 1.5vh, 24px)",
            height: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
            overflow: "hidden",
          }}>
            {subs.length > 0
              ? subs.map((sub, i) => <DesignerSubElement key={i} sub={sub} />)
              : <>
                  {!!p.icon && (
                    <i
                      className={`bi ${p.icon as string}`}
                      style={{ fontSize: "clamp(1rem, 2.2vh, 2.2rem)", marginBottom: "clamp(3px, 0.6vh, 10px)", color: statsColor, opacity: 0.8 }}
                    />
                  )}
                  {/* statsNumRef drives countUp animation — set in useEffect above */}
                  {!!p.number && (
                    <div ref={statsNumRef} style={{ fontSize: "clamp(1.4rem, 3.2vh, 2.6rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
                      {p.number as string}
                    </div>
                  )}
                  {!!p.statLabel && (
                    <div style={{ fontSize: "clamp(10px, 1.3vh, 13px)", opacity: 0.65, marginTop: "clamp(3px, 0.6vh, 6px)", fontWeight: 500, letterSpacing: "0.02em" }}>
                      {p.statLabel as string}
                    </div>
                  )}
                </>
            }
          </div>
        );
      }

      // ── image: single image or multi-image carousel ───────────────────────
      case "image": {
        const carouselImages = p.images as Array<{ url: string; alt?: string }> | undefined;
        if (carouselImages && carouselImages.length > 0) {
          return (
            <ImageCarousel
              images={carouselImages}
              columns={Number(p.columns) || 1}
              displayMode={(p.displayMode as string) || "static"}
              transition={(p.transition as string) || "slide"}
              interval={Number(p.interval) || 4}
            />
          );
        }
        return (
          <div style={{ height: "100%", overflow: "hidden", minHeight: "200px" }}>
            {p.src
              ? <img src={p.src as string} alt={(p.alt as string) || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#adb5bd", background: "#f8f9fa" }}><i className="bi bi-image" style={{ fontSize: "3rem" }} /></div>
            }
          </div>
        );
      }

      // ── video: autoplay/loop cover video with poster and empty-state icon ─
      case "video":
        return (
          <div style={{ height: "100%", overflow: "hidden", minHeight: "200px", background: "#000" }}>
            {p.src
              ? <video src={p.src as string} poster={(p.poster as string) || undefined} autoPlay={!!p.autoplay} loop={!!p.loop} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#adb5bd" }}><i className="bi bi-play-circle" style={{ fontSize: "3rem" }} /></div>
            }
          </div>
        );

      // ── html: raw HTML block — only shown as placeholder in admin preview;
      //    actual HTML is rendered server-side via the FlexibleElement pipeline ─
      case "html":
        return (
          <div style={{ height: "100%", color: tc, padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, fontSize: "0.8rem" }}>
            HTML block — visible on live page
          </div>
        );

      // ── coverage-map: embedded Leaflet coverage map ───────────────────────
      case "coverage-map":
        return (
          <div style={{ padding: "20px 0", height: "100%" }}>
            <CoverageMapEmbed
              slug={(p.mapSlug as string) || ""}
              height={(p.mapHeight as number) || 480}
              showSearch={(p.showSearch as boolean) !== false}
              showGeolocation={(p.showGeolocation as boolean) !== false}
              showResults={(p.showResults as boolean) !== false}
              resultCtaUrl={(p.resultCtaUrl as string) || ""}
              fibreCtaLabel={(p.fibreCtaLabel as string) || undefined}
              wirelessCtaLabel={(p.wirelessCtaLabel as string) || undefined}
              missMessage={(p.missMessage as string) || undefined}
            />
          </div>
        );

      // ── photo-card: full-bleed image card with slide-up hover info panel ───
      case "photo-card": {
        const pcImg    = safeUrl((p.bgImageUrl as string) || "");
        const pcTitle  = (p.title    as string) || "";
        const pcLoc    = (p.location as string) || "";
        const pcBadge  = (p.badge    as string) || "";
        const pcPanel  = (p.panelBg  as string) || "rgba(45,90,61,0.97)";
        return (
          <div className="photo-card-block" style={{ position: "relative", height: "100%", overflow: "hidden", borderRadius }}>
            {/* Background image — use <img> for reliable external URL loading */}
            {pcImg
              ? <img src={pcImg} alt="" aria-hidden className="photo-card-bg" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
              : <div className="photo-card-bg" style={{ background: "#374151" }} />
            }
            {/* Persistent dark gradient at bottom */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)", zIndex: 0 }} />
            {/* Static label (visible when not hovering) */}
            <div className="photo-card-static">
              {pcBadge && <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#86efac", marginBottom: 6 }}>{pcBadge}</div>}
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>{pcTitle}</div>
              {pcLoc && <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{pcLoc}</div>}
            </div>
            {/* Hover slide-up panel */}
            <div className="photo-card-hover" style={{ background: pcPanel }}>
              {pcBadge && <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#86efac", marginBottom: 10 }}>{pcBadge}</div>}
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.25 }}>{pcTitle}</div>
              {pcLoc && <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>{pcLoc}</div>}
              <a href="#contact" style={{ fontSize: "13px", fontWeight: 700, color: "#86efac", textDecoration: "none" }}>View Project Details →</a>
            </div>
          </div>
        );
      }

      // ── projects-gallery: photo gallery of completed projects ─────────────
      case "projects-gallery":
        return (
          <div style={{ padding: "20px 0", height: "100%" }}>
            <ProjectsGallery
              heading={(p.heading as string) || "Our Projects"}
              subtext={(p.subtext as string) || ""}
              textColor={(p.textColor as string) || "#1f2937"}
              columns={(p.columns as number) || 3}
            />
          </div>
        );

      // ── volt: renders a Volt Studio layered element with live hover animations ──
      case "volt": {
        const voltId = p.voltId as string | undefined;
        if (!voltId) {
          return (
            <div style={{ padding: "20px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6c757d" }}>
              <span style={{ fontSize: "12px" }}>No Volt element selected</span>
            </div>
          );
        }
        // Build slots — support both flat props (slotTitle, slotBody…) and nested props.slots object
        const nested = (p.slots && typeof p.slots === "object" ? p.slots : {}) as Record<string, string>;
        const voltSlots = {
          title:       (p.slotTitle as string)       || nested.title       || undefined,
          body:        (p.slotBody as string)        || nested.body        || undefined,
          imageUrl:    (p.slotImageUrl as string)    || nested.imageUrl    || undefined,
          imageAlt:    (p.slotImageAlt as string)    || nested.imageAlt    || undefined,
          actionLabel: (p.slotActionLabel as string) || nested.actionLabel || undefined,
          actionHref:  (p.slotActionHref as string)  || nested.actionHref  || undefined,
          badge:       (p.slotBadge as string)       || nested.badge       || undefined,
          icon:        (p.slotIcon as string)        || nested.icon        || undefined,
        };
        return (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <VoltBlock voltId={voltId} slots={voltSlots} fitMode="contain" />
          </div>
        );
      }

      // ── interactive-3d-card: hover-driven 3D product card (custom GLB or procedural fallback) ──
      case "interactive-3d-card": {
        return (
          <InteractiveProductCard
            title={(p.title as string) || undefined}
            subtitle={(p.subtitle as string) || undefined}
            description={(p.description as string) || undefined}
            accentColor={(p.accentColor as string) || undefined}
            bg={(p.bg as string) || undefined}
            modelUrl={(p.modelUrl as string) || undefined}
            modelScale={typeof p.modelScale === "number" ? p.modelScale : 1}
            shapeFrom={(p.shapeFrom as "right" | "left" | "bottom" | "top") || "right"}
          />
        );
      }

      // ── scroll-story: scroll-pinned Three.js 3D storytelling block ────────────
      case "scroll-story":
        return (
          <ScrollStoryBlock block={block} />
        );

      // ── editorial: magazine-style text layout with obstacle-avoidance (pretext) ─
      case "editorial":
        return (
          <EditorialBlock props={{
            text:        (p.text        as string)  ?? '',
            fontFamily:  (p.fontFamily  as string)  ?? 'Merriweather',
            fontSize:    (p.fontSize    as number)  ?? 18,
            lineHeight:  (p.lineHeight  as number)  ?? 1.6,
            textColor:   (p.textColor   as string)  ?? '#212529',
            bgColor:     (p.bgColor     as string)  ?? 'transparent',
            obstacles:   Array.isArray(p.obstacles) ? p.obstacles : [],
            customCss:   (p.customCss   as string)  ?? '',
          }} />
        );

      // ── steps: numbered steps with large accent counter ──────────────────────
      case "steps":
        return <StepsBlock c={{ steps: p.steps as any, stepsDividers: p.stepsDividers as any, stepsLastDivider: p.stepsLastDivider as any, stepsNumberWidth: p.stepsNumberWidth as any }} tc={tc} />;

      // ── photo-strip: horizontal strip of background images ───────────────────
      case "photo-strip":
        return <PhotoStripBlock c={{ photoStripImages: p.images as any, photoStripHeight: p.height as any, photoStripGap: p.gap as any, photoStripHoverBrightness: p.hoverBrightness as any, photoStripColumns: p.columns as any }} />;

      // ── marquee: animated horizontal stat/town strip ─────────────────────────
      case "marquee":
        return <MarqueeBlock c={{
          marqueeItems: p.marqueeItems as any,
          marqueeSpeed: p.marqueeSpeed as any,
          marqueeDirection: p.marqueeDirection as any,
          marqueePauseOnHover: p.marqueePauseOnHover as any,
          marqueeSeparator: p.marqueeSeparator as any,
          marqueeStyle: p.marqueeStyle as any,
        }} />;

      case "packages":
        return <PackagesBlock networkSlug={p.networkSlug as string | undefined} columns={p.packageColumns as number | undefined} heading={p.heading as string | undefined} darkBg={darkBg} />;

      case "contact-form":
        return <ContactFormBlock p={p} darkBg={darkBg} />;

      case "how-steps": {
        const accent = (p.accentColor as string) || "var(--cms-accent, #4caf50)";
        const isLast = !!(p.isLast);
        const textColor = darkBg ? "#fff" : "#1a1a1a";
        return (
          <div style={{ position: "relative", padding: "24px 16px", height: "100%", display: "flex", flexDirection: "column" }}>
            {!isLast && (
              <div style={{
                position: "absolute", top: "36px", right: "-1px",
                width: "50%", height: "2px",
                background: `repeating-linear-gradient(90deg, ${accent} 0, ${accent} 6px, transparent 6px, transparent 12px)`,
                zIndex: 1,
              }} />
            )}
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: accent, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "16px", marginBottom: "12px",
              flexShrink: 0,
            }}>
              {(p.stepNumber as string) || "01"}
            </div>
            <div style={{ fontWeight: 700, fontSize: "17px", color: textColor, marginBottom: "8px" }}>
              {(p.title as string) || "Step Title"}
            </div>
            <div style={{ fontSize: "14px", color: darkBg ? "rgba(255,255,255,0.75)" : "#666", lineHeight: 1.55 }}>
              {(p.description as string) || "Step description goes here."}
            </div>
          </div>
        );
      }

      // ── gallery-cta: parallax image collage with CTA button ─────────────────
      case "gallery-cta":
        return (
          <GalleryCtaBlock
            heading={(p.heading as string) || "Explore Our Gallery"}
            subtext={(p.subtext as string) || ""}
            accentWord={(p.accentWord as string) || ""}
            buttonText={(p.buttonText as string) || "View Gallery"}
            buttonUrl={(p.buttonUrl as string) || "/gallery"}
            categorySlug={(p.categorySlug as string) || ""}
            stat1Value={(p.stat1Value as string) || ""}
            stat1Label={(p.stat1Label as string) || "Photos"}
            stat2Value={(p.stat2Value as string) || ""}
            stat2Label={(p.stat2Label as string) || "Categories"}
            accentColor={(p.accentColor as string) || "#f59e0b"}
            overlayOpacity={typeof p.overlayOpacity === "number" ? p.overlayOpacity : 55}
            textColor={(p.textColor as string) || "#ffffff"}
          />
        );

      // ── default: unknown block type — render the type name as a placeholder ─
      default:
        return (
          <div style={{ padding: "20px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6c757d" }}>
            <span style={{ fontSize: "12px" }}>{block.type}</span>
          </div>
        );
    }
  }

  return (
    <div ref={blockRef} className={shellClasses.join(" ")} style={shellStyle}>
      {customCss && <BlockStyleInjector css={customCss} />}
      {overlayOpac > 0 && (
        <div aria-hidden style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: overlayColor, opacity: overlayOpac / 100, borderRadius: "inherit",
        }} />
      )}
      <div style={{ position: "relative", zIndex: 2, height: "100%" }}>
        {renderInner()}
      </div>
    </div>
  );
}

/**
 * DesignerSubElement — renders a single sub-element within a designer block.
 *
 * Sub-elements are the leaf-level content pieces (heading, paragraph, button, image,
 * badge, divider, icon) defined in a block's subElements array from the designer JSON.
 *
 * When the sub-element has any visual override (background, clip-path, opacity, etc.),
 * it wraps the content in a shell div so those styles don't bleed into the element itself.
 * If there are no overrides, the content is returned unwrapped to keep the DOM shallow.
 *
 * Per-element customCss is scoped with a unique class generated by useId() so rules
 * from different sub-elements do not interfere with each other.
 */
/**
 * DesignerSubElement — renders a single sub-element inside a DesignerBlock.
 *
 * Handles:
 * - Per-type inner content (heading, paragraph, button, image, badge, divider, icon)
 * - Optional visual shell wrapper for background/clip/opacity overrides
 * - Per-element entrance animations (countUp, zoomIn, pulse, fadeIn, slideUp,
 *   bounceIn, blurIn, typewriter) triggered on first viewport intersection
 */
/**
 * Estimate a sub-element's rendered height (in design px) when its height is auto/unset.
 * Only used to WEIGHT the reflow gap between stacked elements, so an approximate line
 * count is sufficient — it never sets an actual box height.
 */
function estimateSubHeight(sub: SubEl, w: number): number {
  const p = sub.props || {};
  const fs = Number(p.fontSize) || (sub.type === "heading" ? 22 : sub.type === "icon" ? 48 : 15);
  const lh = Number(p.lineHeight) || (sub.type === "heading" ? 1.2 : 1.6);
  if (sub.type === "icon") return Number(p.size) || 48;
  if (sub.type === "paragraph" || sub.type === "heading") {
    const text = String(p.text || "");
    const cpl  = Math.max(1, Math.floor(w / (fs * 0.52))); // ~chars per line at this size
    const lines = Math.max(1, Math.ceil(text.length / cpl));
    return fs * lh * lines;
  }
  return fs * lh;
}

type ReflowBlock = { id: number; type: string; pixelPos?: PixelPos; props?: Record<string, unknown>; subElements?: SubEl[] };
type ReflowLeaf = {
  top: number; left: number; width: number; height: number;
  textAlign: React.CSSProperties["textAlign"];
  node: React.ReactNode;
  aspect?: number | null; // non-container block design aspect (w/h), else null
  minH?: number;          // non-container block fallback min-height when no aspect
};

/**
 * FreeReflowStack — the free-mode MOBILE layout (≤768px). Instead of shrinking the whole
 * designer canvas into a tiny scaled photograph, it lays the design's leaves out as a
 * single readable column:
 *  1. Collect leaves — every sub-element of a container block (absolute box = block
 *     pixelPos + sub {x,y,w,h}) and every non-container block (its pixelPos box).
 *  2. Order them in READING ORDER — top banded to ~24px rows, then left-to-right.
 *  3. Stack them full-width; the GAP between two consecutive leaves mirrors how close
 *     they were in the design: rendered = clamp(4, originalGap * scaleGuess, 28). So
 *     elements that overlapped or sat adjacent (e.g. a paragraph and the emphasized
 *     heading continuing its sentence) render tight and read as connected, while
 *     far-apart elements keep a normal gap. Fonts become readable fluid clamps (mobile).
 */
function FreeReflowStack({ blocks, designerCanvasW, containerW, darkBg }: {
  blocks: ReflowBlock[]; designerCanvasW: number; containerW: number; darkBg: boolean;
}) {
  const isContainerType = (t: string) => t === "text" || t === "text-block" || t === "card";

  const leaves: ReflowLeaf[] = [];
  for (const block of blocks) {
    const pos  = block.pixelPos || { x: 0, y: 0, w: 300, h: 180 };
    const subs = (block.subElements || []) as SubEl[];
    if (isContainerType(block.type) && subs.length > 0) {
      subs.forEach((sub, si) => {
        const w = sub.w != null ? sub.w : pos.w;
        const h = sub.h != null ? sub.h : estimateSubHeight(sub, w);
        leaves.push({
          top: (pos.y || 0) + (sub.y || 0),
          left: (pos.x || 0) + (sub.x || 0),
          width: w, height: h,
          textAlign: (sub.props?.textAlign as React.CSSProperties["textAlign"]) || undefined,
          node: <DesignerSubElement key={String(block.id) + "-" + si} sub={sub} mobile />,
        });
      });
    } else {
      const aspect = pos.w > 0 && pos.h > 0 ? pos.w / pos.h : null;
      leaves.push({
        top: pos.y || 0, left: pos.x || 0, width: pos.w, height: pos.h,
        textAlign: undefined,
        aspect,
        minH: aspect ? undefined : Math.max(80, Math.min(pos.h || 0, 420)),
        node: <DesignerBlock key={block.id} block={block} darkBg={darkBg} />,
      });
    }
  }

  // Reading order: band the top to ~24px rows so near-level elements read left-to-right,
  // then fall back to source order for exact ties.
  const band = (y: number) => Math.round(y / 24);
  const ordered = leaves
    .map((leaf, i) => ({ leaf, i }))
    .sort((a, b) => band(a.leaf.top) - band(b.leaf.top) || a.leaf.left - b.leaf.left || a.i - b.i)
    .map((x) => x.leaf);

  // scaleGuess ≈ how much the design is compressed horizontally into the phone column.
  const scaleGuess = designerCanvasW > 0 ? containerW / designerCanvasW : 0.26;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: "0 20px" }}>
      {ordered.map((leaf, i) => {
        const prev = i > 0 ? ordered[i - 1] : null;
        let marginTop = 0;
        if (prev) {
          const originalGap = leaf.top - (prev.top + prev.height);
          marginTop = Math.max(4, Math.min(28, originalGap * scaleGuess));
        }
        const isBlock = leaf.aspect !== undefined || leaf.minH !== undefined;
        return (
          <div key={i} style={{ width: "100%", marginTop, textAlign: leaf.textAlign }}>
            {isBlock ? (
              <div style={{
                position: "relative", width: "100%", overflow: "hidden",
                ...(leaf.aspect ? { aspectRatio: `${leaf.aspect}` } : {}),
                ...(leaf.minH != null ? { minHeight: leaf.minH } : {}),
              }}>
                {leaf.node}
              </div>
            ) : leaf.node}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Fluid font size for the free-mode mobile reflow. Maps a fixed design px size to a
 * `clamp(floor, vw, designPx)` so headings/paragraphs are readable on small screens
 * (never the tiny scaled-down px they'd get from the desktop stage) yet never exceed
 * their designed size on wider phones. floor and vw formulas are fixed by spec.
 */
function mobileFontClamp(px: number): string {
  const floor = Math.round(Math.min(Math.max(14, px * 0.5), 44));
  const vw = (px / 14.4) * 1.55;
  return `clamp(${floor}px, ${vw.toFixed(2)}vw, ${px}px)`;
}

/**
 * DesignerSubElement flags:
 * - `exact`  (desktop free stage): reproduce the designer canvas 1:1 — the wrapper
 *   width governs wrapping, so suppress the paragraph maxWidth the designer never
 *   applies, match its white-space (pre-wrap + break-word) so line breaks land
 *   identically, and apply the designer's own text-metric DEFAULTS (heading
 *   line-height 1.2, paragraph 14px/1.6, text-align left, letter-spacing 0,
 *   text-transform none, #212529 text) instead of inheriting the site theme's —
 *   the canvas resolves un-set props to those values, so inheriting anything else
 *   changes wrap width/line height and breaks the 1:1 match.
 * - `darkBg` (with exact): keeps the default text colour inherited on dark section
 *   backgrounds (the white designer canvas can't represent those) so default-colour
 *   text never renders near-black on black.
 * - `mobile` (free reflow): render readable fluid fonts via mobileFontClamp and let
 *   text wrap naturally at full column width.
 */
function DesignerSubElement({ sub, pkg, mobile, exact, darkBg }: { sub: SubEl; pkg?: PackageLike | null; mobile?: boolean; exact?: boolean; darkBg?: boolean }) {
  const uid    = useId();
  // Sanitise the React useId string (contains colons) for use as a CSS class name
  const scopeClass = `dsub-${uid.replace(/:/g, "")}`;
  const styleRef   = useRef<HTMLStyleElement>(null);
  const rawP   = sub.props || {};
  // When the parent card is bound to a package, resolve {{pkg.*}} tokens in any
  // string prop (text, etc.) so sub-elements render live package values.
  const p: Record<string, unknown> = pkg
    ? Object.fromEntries(Object.entries(rawP).map(([k, v]) => [k, typeof v === "string" ? resolvePackageTokens(v, pkg) : v]))
    : rawP;

  // Outlined (hollow) text — matches the designer's per-sub `outlined` flag and the
  // established .cms-outline convention (globals.css): transparent glyph FILL + a stroke
  // in the outline colour. Previously the renderer left the fill opaque, so outlined
  // headings (e.g. INTERNET, ROCK SOLID) rendered SOLID on the live page while the canvas
  // showed them HOLLOW (#84). Designer stroke values: outlineWidth||1 px, outlineColor||#000.
  const outlinedStyle: React.CSSProperties = p.outlined
    ? {
        WebkitTextFillColor: "transparent",
        WebkitTextStroke: `${Number(p.outlineWidth) || 1}px ${(p.outlineColor as string) || "#000000"}`,
      }
    : {};

  // ── Animation props ───────────────────────────────────────────────────────
  const animEffect   = (p.animEffect   as string) || "none";
  const animDuration = Number(p.animDuration) || 1000;
  const animDelay    = Number(p.animDelay)    || 0;
  const animRepeat   = !!p.animRepeat;
  // Ref to the animation wrapper div (anime.js targets this element)
  const subRef       = useRef<HTMLDivElement>(null);
  // Ref to the <span> used for countUp / typewriter text animation
  const countSpanRef = useRef<HTMLSpanElement>(null);
  // Prevent retriggering non-looping animations
  const animDone     = useRef(false);

  // Trigger entrance animation when sub-element first enters the viewport
  useEffect(() => {
    if (animEffect === "none" || sub.type === "divider" || !subRef.current) return;
    const el = subRef.current;
    animDone.current = false;

    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (!animRepeat && animDone.current) return;
      animDone.current = true;
      // Pulse loops so we don't disconnect — everything else disconnects after first trigger
      if (animEffect !== "pulse") obs.disconnect();

      const doAnim = () => {
        switch (animEffect) {
          case "countUp": {
            // Animate the counter span from 0 → target number using rAF ease-out cubic
            const span = countSpanRef.current;
            if (!span) return;
            const target = Number(span.dataset.target) || 0;
            const start  = performance.now();
            function stepCount(now: number) {
              const t = Math.min((now - start) / animDuration, 1);
              const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
              span!.textContent = Math.round(eased * target).toLocaleString();
              if (t < 1) requestAnimationFrame(stepCount);
            }
            requestAnimationFrame(stepCount);
            break;
          }
          case "zoomIn":
            animate(el, { scale: [0.3, 1], opacity: [0, 1], duration: animDuration, ease: "spring(1, 80, 10, 8)" });
            break;
          case "pulse":
            // Loop: scale up and back down continuously
            animate(el, { scale: [1, 1.1, 1], duration: animDuration, ease: "easeInOutSine", loop: animRepeat ? true : 1 });
            break;
          case "fadeIn":
            animate(el, { opacity: [0, 1], duration: animDuration, ease: "cubicBezier(0.4,0,0.2,1)" });
            break;
          case "slideUp":
            animate(el, { translateY: [40, 0], opacity: [0, 1], duration: animDuration, ease: "cubicBezier(0.4,0,0.2,1)" });
            break;
          case "bounceIn":
            animate(el, { scale: [0.3, 1.08, 0.95, 1.02, 1], opacity: [0, 1, 1, 1, 1], duration: animDuration, ease: "spring(1, 80, 10, 0)" });
            break;
          case "blurIn":
            animate(el, { filter: ["blur(14px)", "blur(0px)"], opacity: [0, 1], duration: animDuration, ease: "cubicBezier(0.4,0,0.2,1)" });
            break;
          case "typewriter": {
            // Reveal full text one character at a time
            const span = countSpanRef.current;
            if (!span) return;
            const fullText = span.dataset.fulltext || "";
            span.textContent = "";
            let i = 0;
            const charDur = animDuration / Math.max(fullText.length, 1);
            function typeNext() {
              if (i < fullText.length) { span!.textContent = fullText.slice(0, ++i); setTimeout(typeNext, charDur); }
            }
            typeNext();
            break;
          }
        }
      };

      // Respect the per-element delay setting
      if (animDelay > 0) setTimeout(doAnim, animDelay);
      else doAnim();
    }, { threshold: 0.2 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [animEffect, animDuration, animDelay, animRepeat, sub.type]);

  // ── Visual layer props ────────────────────────────────────────────────────
  const bgColor    = (p.bgColor    as string) || "";
  const bgImage    = safeUrl((p.bgImage    as string) || "");
  const bgGradient = (p.bgGradient as string) || "";
  const clipPath   = (p.clipPath   as string) || "";
  // Convert 0-100 opacity prop to a CSS 0.0-1.0 value; undefined means inherit
  const elOpacity  = p.opacity    !== undefined ? Number(p.opacity) / 100 : undefined;
  const zIdx       = p.zIndex     !== undefined ? Number(p.zIndex)        : undefined;
  const elPad      = p.elPadding  !== undefined ? `${Number(p.elPadding)}px` : undefined;
  const elRadius   = p.elRadius   !== undefined ? `${Number(p.elRadius)}px`  : undefined;
  const customCss  = (p.customCss  as string) || "";

  // button and badge render bgColor inside inner() — don't let bgColor trigger a shell wrapper
  const bgColorForShell = (sub.type === "button" || sub.type === "badge") ? "" : bgColor;
  // Determine whether a shell wrapper is needed for any visual override
  const hasShell = !!(bgColorForShell || bgImage || bgGradient || clipPath ||
                      elOpacity !== undefined || zIdx !== undefined || elPad || elRadius || customCss);

  // Inject scoped customCss into the accompanying <style> element whenever it changes
  useEffect(() => {
    if (styleRef.current && customCss) {
      styleRef.current.textContent = `.${scopeClass}{${customCss}}`;
    }
  }, [customCss, scopeClass]);

  // ── Inner content per type ────────────────────────────────────────────────
  /**
   * inner — switch dispatcher that returns the raw JSX for the sub-element type.
   * Kept separate from the shell so the same content can be rendered with or without a wrapper.
   */
  function inner(): React.ReactNode {
    switch (sub.type) {
      // ── heading: styled block-level heading (not a semantic h-tag — respects font props) ─
      case "heading": {
        const mb   = p.marginBottom !== undefined ? `${Number(p.marginBottom)}px` : "8px";
        const text = (p.text as string) || "Heading";
        // countUp: extract a numeric value from the text and animate 0→num
        const cuMatch = animEffect === "countUp" ? text.match(/^([^0-9]*)(\d[\d,.]*)(.*)$/) : null;
        const cuNum   = cuMatch ? parseFloat(cuMatch[2].replace(/[,.]/g, "")) : NaN;
        const textContent = (cuMatch && !isNaN(cuNum))
          ? <>{cuMatch[1]}<span ref={countSpanRef} data-target={String(cuNum)}>0</span>{cuMatch[3]}</>
          : animEffect === "typewriter"
          ? <span ref={countSpanRef} data-fulltext={text} />
          : text;
        return (
          <div style={{
            fontSize:      mobile ? mobileFontClamp(Number(p.fontSize) || 22) : `${Number(p.fontSize) || 22}px`,
            fontFamily:    (p.fontFamily as string) || undefined,
            fontWeight:    (p.fontWeight as string) || "700",
            // exact: designer headings resolve an un-set colour to #212529 (.se-heading),
            // NOT the inherited theme colour — except on dark section backgrounds.
            color:         (p.color as string) || (exact && !darkBg ? "#212529" : undefined),
            textAlign:     (p.textAlign as React.CSSProperties["textAlign"]) || (exact ? "left" : undefined),
            // exact: designer heading default line-height is 1.2 (`p.lineHeight||1.2`);
            // inheriting the page's 1.5 made an 80px heading 120px tall vs 96px on canvas.
            lineHeight:    p.lineHeight !== undefined ? Number(p.lineHeight) : (exact ? 1.2 : undefined),
            letterSpacing: p.letterSpacing !== undefined ? `${Number(p.letterSpacing)}px` : (exact ? "0px" : undefined),
            textTransform: (p.textTransform as React.CSSProperties["textTransform"]) || (exact ? "none" : undefined),
            // Match the designer canvas white-space so line breaks land identically (#79).
            // Designer heading: `white-space: p.textWrap||'normal'` + .se-heading break-word.
            ...(exact ? { whiteSpace: (p.textWrap as React.CSSProperties["whiteSpace"]) || ("normal" as const), overflowWrap: "break-word" as const } : {}),
            ...outlinedStyle,
            marginBottom:  hasShell ? 0 : mb,
            marginTop:     0,
          }}>
            {typeof textContent === "string" ? renderAccentText(textContent) : textContent}
          </div>
        );
      }
      // ── paragraph: flowing text block with configurable typography ──────
      case "paragraph": {
        const mb   = p.marginBottom !== undefined ? `${Number(p.marginBottom)}px` : "8px";
        const text = (p.text as string) || "";
        const cuMatch = animEffect === "countUp" ? text.match(/^([^0-9]*)(\d[\d,.]*)(.*)$/) : null;
        const cuNum   = cuMatch ? parseFloat(cuMatch[2].replace(/[,.]/g, "")) : NaN;
        const textContent = (cuMatch && !isNaN(cuNum))
          ? <>{cuMatch[1]}<span ref={countSpanRef} data-target={String(cuNum)}>0</span>{cuMatch[3]}</>
          : animEffect === "typewriter"
          ? <span ref={countSpanRef} data-fulltext={text} />
          : text;
        // In `exact` (desktop 1:1) and `mobile` (reflow) modes the wrapper/column width is
        // authoritative — the designer never applies a paragraph maxWidth, so honouring it
        // here would wrap the text narrower than the canvas, growing an extra line and making
        // a neighbouring absolute element overlap on the live page (#79). Suppress it.
        const constrainWidth = !exact && !mobile && !!p.maxWidth && Number(p.maxWidth) > 0;
        return (
          <p style={{
            // exact: designer paragraph defaults are 14px / line-height 1.6
            // (`p.fontSize||14`, `p.lineHeight||1.6`) — not the renderer's legacy 15/1.65.
            fontSize:      mobile ? mobileFontClamp(Number(p.fontSize) || 15) : `${Number(p.fontSize) || (exact ? 14 : 15)}px`,
            fontFamily:    (p.fontFamily as string) || undefined,
            fontWeight:    (p.fontWeight as string) || undefined,
            color:         (p.color as string) || (exact && !darkBg ? "#212529" : undefined),
            textAlign:     (p.textAlign as React.CSSProperties["textAlign"]) || (exact ? "left" : undefined),
            lineHeight:    p.lineHeight !== undefined ? Number(p.lineHeight) : (exact ? 1.6 : 1.65),
            letterSpacing: p.letterSpacing !== undefined ? `${Number(p.letterSpacing)}px` : (exact ? "0px" : undefined),
            textTransform: (p.textTransform as React.CSSProperties["textTransform"]) || (exact ? "none" : undefined),
            maxWidth:      constrainWidth ? `${Number(p.maxWidth)}px` : undefined,
            marginLeft:    constrainWidth ? "auto" : undefined,
            marginRight:   constrainWidth ? "auto" : undefined,
            // Match the designer's `.se-paragraph` wrapping (pre-wrap keeps authored line
            // breaks; break-word prevents long tokens from widening the box) so height is 1:1.
            // No word-break here — the designer never sets it, and its min-content sizing
            // differs from overflow-wrap, which can change where lines break.
            ...(exact ? { whiteSpace: (p.textWrap as React.CSSProperties["whiteSpace"]) || "pre-wrap", overflowWrap: "break-word" as const } : {}),
            ...outlinedStyle,
            marginBottom:  hasShell ? 0 : mb,
            marginTop:     0,
          }}>
            {textContent}
          </p>
        );
      }
      // ── button: anchor styled as a button, navigates to navTarget ────────
      case "button": {
        const px   = p.paddingX     !== undefined ? Number(p.paddingX)     : 20;
        const py   = p.paddingY     !== undefined ? Number(p.paddingY)     : 8;
        const br   = p.borderRadius !== undefined ? `${Number(p.borderRadius)}px` : "6px";
        const mt   = p.marginTop    !== undefined ? `${Number(p.marginTop)}px`    : "4px";
        const icon = p.icon as string | undefined;
        return (
          <a href={String(p.navTarget || "#")} style={{
            display:        "inline-block",
            alignSelf:      "center",
            width:          "fit-content",
            background:     (p.bgColor   as string) || "#0d6efd",
            color:          (p.textColor as string) || "#fff",
            padding:        `${py}px ${px}px`,
            borderRadius:   br,
            textDecoration: "none",
            fontWeight:     600,
            fontSize:       "14px",
            marginTop:      mt,
          }}>
            {icon && <i className={`bi ${icon} me-1`} />}
            {(p.text as string) || "Button"}
          </a>
        );
      }
      // ── image: inline image with optional clip-path and opacity override ─
      case "image": {
        const imgRadius = p.elRadius !== undefined ? `${Number(p.elRadius)}px` : "6px";
        const imgOpacity = p.opacity !== undefined ? Number(p.opacity) / 100 : undefined;
        return p.src
          ? <img src={p.src as string} alt={(p.alt as string) || ""} style={{
              maxWidth:     "100%",
              display:      "block",
              borderRadius: imgRadius,
              marginBottom: "8px",
              ...(imgOpacity !== undefined ? { opacity: imgOpacity } : {}),
              ...(clipPath ? { clipPath } : {}),
            }} />
          : null;
      }
      // ── badge: pill-shaped inline label ──────────────────────────────────
      case "badge": {
        const br = p.borderRadius !== undefined ? `${Number(p.borderRadius)}px` : "20px";
        return (
          <span style={{
            display:       "inline-block",
            background:    (p.bgColor   as string) || "#0d6efd",
            color:         (p.textColor as string) || "#fff",
            padding:       "2px 10px",
            borderRadius:  br,
            fontSize:      p.fontSize ? `${Number(p.fontSize)}px` : "11px",
            fontWeight:    700,
            marginBottom:  hasShell ? 0 : "8px",
            letterSpacing: "0.5px",
          }}>
            {(p.text as string) || "Badge"}
          </span>
        );
      }
      // ── divider: simple horizontal rule with configurable colour ─────────
      case "divider":
        return <hr style={{ borderColor: (p.dividerColor as string) || "#dee2e6", borderTopWidth: `${Number(p.thickness ?? 2)}px`, borderStyle: "solid", borderLeft: "none", borderRight: "none", borderBottom: "none", margin: "8px 0" }} />;
      // ── icon: Bootstrap Icon with configurable size and colour ────────────
      case "icon":
        return (
          <i className={`bi ${(p.iconName as string) || "bi-star"}`} style={{
            fontSize:   mobile ? mobileFontClamp(Number(p.size) || 48) : `${Number(p.size) || 48}px`,
            color:      (p.color as string) || "#0d6efd",
            display:    "block",
            textAlign:  (p.textAlign as React.CSSProperties["textAlign"]) || "left",
          }} />
        );
      // Unknown sub-element type — render nothing
      default:
        return null;
    }
  }

  // Divider needs no shell and no animation wrapper
  if (sub.type === "divider") return inner() as React.ReactElement;

  // ── Shell wrapper with visual layer ──────────────────────────────────────
  // Priority order for backgrounds: image > gradient > solid colour (first match wins)
  const shellStyle: React.CSSProperties = {
    ...(bgImage     ? { background: `url("${bgImage}") center/cover no-repeat` }      : {}),
    ...(!bgImage && bgGradient ? { background: bgGradient }                           : {}),
    ...(!bgImage && !bgGradient && bgColorForShell ? { backgroundColor: bgColorForShell } : {}),
    ...(clipPath    ? { clipPath }                                                     : {}),
    ...(elOpacity   !== undefined  ? { opacity: elOpacity }                           : {}),
    // zIndex requires position:relative to take effect
    ...(zIdx        !== undefined  ? { position: "relative" as const, zIndex: zIdx }  : {}),
    ...(elPad       ? { padding: elPad }                                              : {}),
    // overflow:hidden clips content to the rounded corners
    ...(elRadius    ? { borderRadius: elRadius, overflow: "hidden" as const }         : {}),
    marginBottom: p.marginBottom !== undefined ? `${Number(p.marginBottom)}px` : "8px",
  };

  // Build the content node (shell or bare)
  const contentNode = hasShell
    ? (
      <div className={scopeClass} style={shellStyle}>
        {customCss && <style ref={styleRef} />}
        {inner()}
      </div>
    )
    : <>{inner()}</>;

  // When an animation effect is active, wrap in a ref div so anime.js can target it
  if (animEffect !== "none") {
    return <div ref={subRef}>{contentNode}</div>;
  }

  return contentNode;
}

// ─── Layout Engines ───────────────────────────────────────────────────────────

/**
 * GridLayout — renders FlexibleElements into an explicit row×column grid.
 *
 * Builds a 2-D array (grid[row][col]) by placing each element at its declared
 * grid coordinates (1-indexed, converted to 0-indexed internally).
 *
 * A `consumed` matrix tracks columns that are covered by a preceding element's
 * gridColSpan so those cells are skipped during rendering (avoids empty ghost cells).
 *
 * Rendered using CSS flexbox rows with percentage-based column widths so the layout
 * degrades gracefully when the container is narrower than expected.
 */
function GridLayout({ layout, elements, darkBg }: {
  layout: FlexibleSection["content"]["layout"];
  elements: FlexibleElement[];
  darkBg: boolean;
}) {
  const { gridRows = 1, gridCols = 12, gridGap = 20 } = layout;

  // Initialise an empty 2-D array of element buckets indexed by [row][col]
  const grid: FlexibleElement[][][] = Array.from({ length: gridRows }, () =>
    Array.from({ length: gridCols }, () => [])
  );

  // Place each grid-mode element into the correct cell (0-indexed)
  elements.forEach((el) => {
    if (el.position.mode === "grid" && el.position.gridRow && el.position.gridCol) {
      const r = el.position.gridRow - 1;
      const c = el.position.gridCol - 1;
      if (r >= 0 && r < gridRows && c >= 0 && c < gridCols) grid[r][c].push(el);
    }
  });

  // Mark columns that are spanned by a multi-column element so they are not rendered separately
  const consumed: boolean[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
  elements.forEach((el) => {
    if (el.position.mode === "grid" && el.position.gridRow && el.position.gridCol) {
      const r = el.position.gridRow - 1;
      const c = el.position.gridCol - 1;
      const span = (el.position.gridColSpan || 1) - 1;
      for (let i = 1; i <= span && c + i < gridCols; i++) consumed[r][c + i] = true;
    }
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${gridGap}px` }}>
      {grid.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: "flex", gap: `${gridGap}px`, alignItems: "stretch" }}>
          {row.map((cell, colIdx) => {
            // Skip cells that are consumed by a spanning element starting in a previous column
            if (consumed[rowIdx][colIdx]) return null;
            const colSpan = cell[0]?.position.gridColSpan || 1;
            // Calculate percentage width as a fraction of the total columns
            const pct     = (colSpan / gridCols) * 100;
            // Render an empty spacer for cells with no elements
            if (cell.length === 0) {
              return <div key={colIdx} style={{ flex: `0 0 ${pct}%` }} />;
            }
            return (
              // Subtract a proportional share of the gap from the cell width to maintain alignment
              <div key={colIdx} style={{ flex: `0 0 calc(${pct}% - ${(gridGap * (gridCols - 1) / gridCols)}px)`, minWidth: 0 }}>
                {cell.map((el) => <ElementRenderer key={el.id} element={el} darkBg={darkBg} />)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * AbsoluteLayout — renders FlexibleElements with CSS absolute positioning.
 * Each element's position, size and z-index come directly from el.position.
 * Only elements with position.mode === "absolute" are rendered; others are filtered out.
 */
function AbsoluteLayout({ elements, darkBg }: { elements: FlexibleElement[]; darkBg: boolean }) {
  return (
    <div style={{ position: "relative", minHeight: "400px" }}>
      {elements
        .filter((el) => el.position.mode === "absolute")
        .map((el) => (
          <div key={el.id} style={{ position: "absolute", left: el.position.x || "0", top: el.position.y || "0", width: el.position.width || "auto", height: el.position.height || "auto", zIndex: el.position.zIndex || 1 }}>
            <ElementRenderer element={el} darkBg={darkBg} />
          </div>
        ))}
    </div>
  );
}

/**
 * PresetLayout — renders FlexibleElements using Bootstrap responsive column classes.
 *
 * The `preset` string maps to a fixed array of col-md-* classes. Elements are placed
 * into columns in order, cycling back to the start when there are more elements than
 * columns (idx % colClasses.length).
 *
 * Falls back to "col-12" (full width) for unknown preset names.
 */
function PresetLayout({ preset, elements, darkBg }: { preset: string; elements: FlexibleElement[]; darkBg: boolean }) {
  // Maps preset name to Bootstrap column classes for each column position
  const colClassMap: Record<string, string[]> = {
    "2-col-split":           ["col-md-6", "col-md-6"],
    "3-col-grid":            ["col-md-4", "col-md-4", "col-md-4"],
    "asymmetric-2col-60-40": ["col-md-7", "col-md-5"],
    "asymmetric-2col-40-60": ["col-md-5", "col-md-7"],
    "4-col-grid":            ["col-md-3", "col-md-3", "col-md-3", "col-md-3"],
  };
  const colClasses = colClassMap[preset] || ["col-12"];
  return (
    <div className="row g-3">
      {elements.map((el, idx) => (
        // Cycle through the column class array so extra elements wrap to the pattern
        <div key={el.id} className={colClasses[idx % colClasses.length]}>
          <ElementRenderer element={el} darkBg={darkBg} />
        </div>
      ))}
    </div>
  );
}

// ─── Element Renderer ─────────────────────────────────────────────────────────

/**
 * ElementRenderer — wrapper component for all FlexibleElement types.
 *
 * Responsibilities:
 * - Build a style object from element.styling (background, colour, font, spacing…)
 * - Set up a one-shot IntersectionObserver to trigger the entrance animation when
 *   the element first enters the viewport (animateElement via Anime.js)
 * - Dispatch to the correct leaf component based on element.type
 *
 * The element starts invisible (opacity=0) when an animation is configured and
 * becomes visible only after the observer fires, preventing a flash of content.
 */
function ElementRenderer({ element, darkBg }: { element: FlexibleElement; darkBg: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  // Set up scroll-triggered entrance animation — fires once then disconnects
  useEffect(() => {
    if (!element.animation?.type || !ref.current) return;
    const el = ref.current;
    // Hide the element before the animation starts to prevent a FOUC
    el.style.opacity = "0";
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { animateElement(el, element.animation!); observer.disconnect(); }
        });
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [element.animation]);

  // backgroundGradient takes priority over backgroundColor
  const rawBg      = element.styling?.backgroundGradient || element.styling?.backgroundColor;
  // CSS gradient strings require the `background` shorthand rather than `background-color`
  const bgIsCssGrad = rawBg && isGradient(rawBg);

  const style: React.CSSProperties = {
    ...(bgIsCssGrad ? { background: rawBg } : { backgroundColor: rawBg }),
    color:       element.styling?.textColor || (darkBg ? "#ffffff" : undefined),
    fontSize:    element.styling?.fontSize ? `${element.styling.fontSize}px` : undefined,
    fontWeight:  element.styling?.fontWeight,
    fontFamily:  element.styling?.fontFamily,
    padding:     element.styling?.padding,
    margin:      element.styling?.margin,
    borderRadius:element.styling?.borderRadius,
    boxShadow:   element.styling?.boxShadow,
    clipPath:    element.styling?.clipPath,
    textAlign:   element.styling?.textAlign as React.CSSProperties["textAlign"],
    height:      "100%",
  };

  return (
    <div ref={ref} className={`flexible-element flexible-element-${element.type}`} style={style}>
      {element.type === "text"    && <TextElement    element={element} darkBg={darkBg} />}
      {element.type === "image"   && <ImageElement   element={element} />}
      {element.type === "video"   && <VideoElement   element={element} />}
      {element.type === "button"  && <ButtonElement  element={element} />}
      {element.type === "banner"  && <BannerElement  element={element} />}
      {element.type === "card"    && <CardElement    element={element} />}
      {element.type === "stats"   && <StatsElement   element={element} />}
      {element.type === "divider" && <DividerElement element={element} />}
      {element.type === "html"    && <HTMLElement    element={element} />}
      {element.type === "hero"    && <HeroElement    element={element} />}
      {element.type === "isp-price-card" && <IspPriceCardElement element={element} />}
    </div>
  );
}

// ─── Element Components ───────────────────────────────────────────────────────

/**
 * TextElement — renders a rich text block with an optional badge, heading, subheading,
 * and HTML body text. The fallback text colour adapts to the section's background luminance
 * so content remains readable on both light and dark backgrounds.
 */
function TextElement({ element, darkBg }: { element: FlexibleElement; darkBg: boolean }) {
  const { heading, subheading, text, badge, badgeColor, accent, headingAlign } = element.content;
  // Use explicit textColor, or fall back to white/dark based on section background
  const fallbackColor = element.styling?.textColor || (darkBg ? "#ffffff" : "#1a1a1a");

  return (
    <div className="text-element" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {badge && (
        <span className="badge mb-2 d-inline-block" style={{ background: badgeColor || accent || "#0969da", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 12px", borderRadius: "20px" }}>
          {badge}
        </span>
      )}
      {heading && (
        <h2 style={{ fontWeight: element.styling?.fontWeight || 800, fontSize: element.styling?.fontSize ? `${element.styling.fontSize}px` : "2rem", textAlign: (headingAlign || element.styling?.textAlign) as React.CSSProperties["textAlign"] || "inherit", margin: "0 0 8px", color: fallbackColor, lineHeight: 1.2 }}>
          {renderAccentText(heading)}
        </h2>
      )}
      {subheading && (
        <h4 style={{ fontWeight: 400, opacity: 0.75, fontSize: "1.1rem", margin: "0 0 12px", color: fallbackColor }}>
          {subheading}
        </h4>
      )}
      {text && (
        <div
          style={{ color: fallbackColor, opacity: 0.9 }}
          /* SECURITY: admin-only CMS content, not public user input */
          dangerouslySetInnerHTML={{ __html: text }}
        />
      )}
    </div>
  );
}

/**
 * ImageElement — renders a cover-fit image with an optional colour overlay and caption bar.
 * imageHeight (in px) controls the container height; defaults to "100%" for fluid layouts.
 */
function ImageElement({ element }: { element: FlexibleElement }) {
  const { imageSrc, imageAlt, imageOverlay, imageHeight, imageFit = "cover", imageCaption } = element.content;
  return (
    <div style={{ position: "relative", borderRadius: element.styling?.borderRadius, overflow: "hidden", height: imageHeight ? `${imageHeight}px` : "100%", minHeight: "140px" }}>
      <img src={imageSrc} alt={imageAlt || ""} style={{ width: "100%", height: "100%", objectFit: imageFit as React.CSSProperties["objectFit"], display: "block" }} />
      {imageOverlay && <div style={{ position: "absolute", inset: 0, background: imageOverlay }} />}
      {imageCaption && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: "12px", padding: "6px 12px" }}>{imageCaption}</div>}
    </div>
  );
}

/**
 * VideoElement — renders a native HTML5 video element. Muted is defaulted to true
 * unless explicitly set to false; browsers require muted for autoplay to work.
 */
function VideoElement({ element }: { element: FlexibleElement }) {
  const { videoSrc, videoPoster, autoplay, loop, muted, videoHeight, controls } = element.content;
  return (
    <video src={videoSrc} poster={videoPoster} autoPlay={autoplay} loop={loop} muted={muted !== false} controls={controls} style={{ width: "100%", height: videoHeight ? `${videoHeight}px` : "auto", display: "block", borderRadius: element.styling?.borderRadius }} />
  );
}

/**
 * ButtonElement — renders a Bootstrap-styled anchor button.
 * Variant ("filled", "outline", "dark", "ghost") and size ("sm", "md", "lg") props
 * are mapped to Bootstrap utility classes. textAlign drives flexbox justification.
 */
function ButtonElement({ element }: { element: FlexibleElement }) {
  const { buttonText, buttonHref = "#", buttonVariant = "filled", buttonIcon, buttonSize = "md", buttonFullWidth } = element.content;
  // Map size string to Bootstrap button-size class
  const sizeClass    = buttonSize === "lg" ? "btn-lg" : buttonSize === "sm" ? "btn-sm" : "";
  // Map variant string to Bootstrap button variant class
  const variantClass = buttonVariant === "filled" ? "btn-primary" : buttonVariant === "outline" ? "btn-outline-primary" : buttonVariant === "dark" ? "btn-dark" : "btn-link";
  // Map textAlign to a flexbox justify-content value for the wrapper div
  const justify      = element.styling?.textAlign === "center" ? "center" : element.styling?.textAlign === "right" ? "flex-end" : "flex-start";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: justify, height: "100%", padding: "8px 0" }}>
      <a href={buttonHref} className={`btn ${variantClass} ${sizeClass}${buttonFullWidth ? " w-100" : ""}`} style={{ borderRadius: "8px" }}>
        {buttonIcon && <i className={`bi ${buttonIcon} me-2`}></i>}
        {buttonText}
      </a>
    </div>
  );
}

/**
 * BannerElement — full-width or floated image/video/gradient banner with optional
 * heading, subheading and CTA button overlaid on top.
 *
 * bannerType: "image" | "video" | "gradient"
 * bannerFloat: "left" | "right" — allows text content to flow around the banner
 * bannerOverlay: semi-transparent scrim colour applied over media for text legibility
 */
function BannerElement({ element }: { element: FlexibleElement }) {
  const { bannerType = "image", bannerSrc, bannerHeight = 280, bannerGradient, bannerHeading, bannerSubheading, bannerTextPosition = "center", bannerButton, bannerOverlay = "rgba(0,0,0,0.38)", bannerFloat, bannerFloatWidth = "45%" } = element.content;
  const hasContent  = bannerHeading || bannerSubheading || bannerButton;
  // Maps the bannerTextPosition string to a CSS alignItems value for flexbox centring
  const alignMap: Record<string, React.CSSProperties["alignItems"]> = { left: "flex-start", center: "center", right: "flex-end" };
  // CSS float class is applied when the banner should wrap inline with adjacent text
  const floatClass  = bannerFloat === "left" ? "flex-banner-float-left" : bannerFloat === "right" ? "flex-banner-float-right" : "";

  return (
    <div className={`banner-element ${floatClass}`} style={{ height: `${bannerHeight}px`, overflow: "hidden", position: "relative", borderRadius: element.styling?.borderRadius || "12px", ...(bannerFloat ? { width: bannerFloatWidth, display: "inline-block" } : {}) }}>
      {/* Background layer: gradient takes priority over image/video */}
      {bannerGradient ? (
        <div style={{ position: "absolute", inset: 0, background: bannerGradient }} />
      ) : bannerType === "image" && bannerSrc ? (
        <img src={bannerSrc} alt="Banner" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : bannerType === "video" && bannerSrc ? (
        <video src={bannerSrc} autoPlay loop muted style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      {hasContent && <div style={{ position: "absolute", inset: 0, background: bannerOverlay }} />}
      {hasContent && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: alignMap[bannerTextPosition] || "center", padding: "32px", color: "#fff", textAlign: bannerTextPosition as React.CSSProperties["textAlign"] }}>
          {bannerHeading && <h3 style={{ fontWeight: 800, fontSize: "1.6rem", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{bannerHeading}</h3>}
          {bannerSubheading && <p style={{ margin: "8px 0 0", opacity: 0.85, fontSize: "0.95rem" }}>{bannerSubheading}</p>}
          {bannerButton && (
            <a href={bannerButton.href || "#"} className="btn btn-light btn-sm mt-3" style={{ borderRadius: "6px", alignSelf: alignMap[bannerTextPosition] || "center" }}>
              {bannerButton.icon && <i className={`bi ${bannerButton.icon} me-1`}></i>}
              {bannerButton.text}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CardElement — Bootstrap card with support for five background types (default, colour,
 * gradient, image, image+gradient overlay) and five visual effects (glass, glow, RGB,
 * shimmer, pulse-glow) applied via FLEXIBLE_CSS classes.
 *
 * cardBgType drives which CSS background value is constructed. When an external background
 * is present, the text colour automatically defaults to white for legibility.
 */
function CardElement({ element }: { element: FlexibleElement }) {
  const { cardBgType = "default", cardBgColor, cardBgGradient, cardBgImage, cardBgImageGradient, cardEffect = "default", cardGlowColor, cardTitle, cardBody, cardImage, cardImageHeight = 180, cardButton, cardBadge, cardBadgeColor, cardTags, cardIcon, cardTextColor, cardFooter } = element.content;

  // Determine the CSS background value from the active background type
  let background: string | undefined;
  if      (cardBgType === "gradient"       && cardBgGradient) background = cardBgGradient;
  else if (cardBgType === "image"          && cardBgImage)    background = `url(${cardBgImage}) center/cover no-repeat`;
  // image-gradient composites a gradient scrim over the image using CSS multiple-background syntax
  else if (cardBgType === "image-gradient" && cardBgImage)    background = `${cardBgImageGradient || "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))"}, url(${cardBgImage}) center/cover no-repeat`;
  else if (cardBgColor)                                        background = cardBgColor;

  const isGlass    = cardEffect === "glass";
  // Auto-set white text when a background image/gradient is present
  const textColor  = cardTextColor || (background ? "#ffffff" : undefined);
  // Compose Bootstrap + FLEXIBLE_CSS class names, filtering out empty strings for clean output
  const cssClasses = ["card", "flexible-card", "h-100", isGlass ? "card-glass" : "", cardEffect === "glow" ? "card-glow" : "", cardEffect === "rgb" ? "card-rgb" : "", cardEffect === "shimmer" ? "card-shimmer" : "", cardEffect === "pulse-glow" ? "card-pulse-glow" : ""].filter(Boolean).join(" ");

  const cardStyle: React.CSSProperties = {
    background:    isGlass ? "rgba(255,255,255,0.12)" : background,
    border:        isGlass ? "1px solid rgba(255,255,255,0.25)" : undefined,
    borderRadius:  element.styling?.borderRadius || "14px",
    boxShadow:     element.styling?.boxShadow || "0 4px 24px rgba(0,0,0,0.14)",
    color:         textColor,
    position:      "relative",
    overflow:      "hidden",
    "--card-glow-color": cardGlowColor || "rgba(9,105,218,0.55)",
  } as React.CSSProperties;

  return (
    <div className={cssClasses} style={cardStyle}>
      {cardImage && cardBgType !== "image" && cardBgType !== "image-gradient" && (
        <div style={{ height: `${cardImageHeight}px`, overflow: "hidden" }}>
          <img src={cardImage} alt="Card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div className="card-body" style={{ padding: "20px 22px" }}>
        {cardIcon && <div style={{ marginBottom: "12px" }}><i className={`bi ${cardIcon}`} style={{ fontSize: "2rem", color: cardGlowColor || "#0969da" }}></i></div>}
        {cardBadge && <span className="badge mb-2 d-inline-block" style={{ background: cardBadgeColor || "#0969da", fontSize: "10px", letterSpacing: "0.06em", borderRadius: "12px", padding: "4px 10px" }}>{cardBadge}</span>}
        {cardTitle && <h5 className="card-title" style={{ fontWeight: 700, marginBottom: "8px" }}>{cardTitle}</h5>}
        {cardBody  && <p  className="card-text"  style={{ opacity: 0.82, fontSize: "0.9rem", lineHeight: 1.6 }}>{cardBody}</p>}
        {cardTags  && (
          <div className="d-flex flex-wrap gap-1 mb-3">
            {(Array.isArray(cardTags) ? cardTags : [cardTags]).map((tag: string, i: number) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>{tag}</span>
            ))}
          </div>
        )}
        {cardButton && (
          <a href={cardButton.href || "#"} className={`btn btn-sm mt-1 ${cardButton.variant === "outline" ? "btn-outline-light" : cardButton.variant === "ghost" ? "btn-link" : "btn-primary"}`} style={{ borderRadius: "6px", fontSize: "13px" }}>
            {cardButton.icon && <i className={`bi ${cardButton.icon} me-1`}></i>}
            {cardButton.text}
          </a>
        )}
      </div>
      {cardFooter && <div className="card-footer" style={{ background: "rgba(0,0,0,0.12)", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", opacity: 0.75, padding: "10px 22px" }}>{cardFooter}</div>}
    </div>
  );
}

/**
 * StatsElement — centred metric display with a large number, label, optional icon,
 * optional sub-label, and optional trend indicator (up/down arrow + value).
 * Supports a glass morphism background via the statsGlass flag.
 */
function StatsElement({ element }: { element: FlexibleElement }) {
  const { statsNumber, statsLabel, statsIcon, statsSubLabel, statsAccentColor, statsTrend, statsTrendValue, statsGlass } = element.content;
  const accent = statsAccentColor || "#0969da";

  return (
    <div className="flexible-stats" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", textAlign: "center", height: "100%", borderRadius: element.styling?.borderRadius || "12px", ...(statsGlass ? { background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" } : {}) }}>
      {statsIcon && <i className={`bi ${statsIcon}`} style={{ fontSize: "2.4rem", color: accent, marginBottom: "10px" }}></i>}
      <div style={{ fontSize: "2.8rem", fontWeight: 800, lineHeight: 1, color: accent, fontVariantNumeric: "tabular-nums" }}>{statsNumber}</div>
      <div style={{ fontSize: "0.9rem", fontWeight: 600, marginTop: "6px", opacity: 0.85 }}>{statsLabel}</div>
      {statsSubLabel   && <div style={{ fontSize: "0.78rem", opacity: 0.6, marginTop: "4px" }}>{statsSubLabel}</div>}
      {statsTrend      && <div style={{ marginTop: "8px", fontSize: "12px", color: statsTrend === "up" ? "#22c55e" : "#ef4444" }}><i className={`bi bi-arrow-${statsTrend === "up" ? "up" : "down"}-right me-1`}></i>{statsTrendValue}</div>}
    </div>
  );
}

/**
 * DividerElement — horizontal visual separator with three style variants:
 *   "line"     — solid coloured rule (default)
 *   "dots"     — three dots with the middle at full opacity
 *   "gradient" — line that fades to transparent at both ends
 *
 * When dividerLabel is set, the line is split into two equal segments flanking the label text.
 */
function DividerElement({ element }: { element: FlexibleElement }) {
  const { dividerType = "line", dividerHeight = 2, dividerColor = "#dee2e6", dividerLabel } = element.content;

  // Label variant: two <hr> segments with the label centred between them
  if (dividerLabel) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0" }}>
        <hr style={{ flex: 1, height: `${dividerHeight}px`, background: dividerColor, border: "none", margin: 0 }} />
        <span style={{ fontSize: "12px", fontWeight: 600, opacity: 0.6, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>{dividerLabel}</span>
        <hr style={{ flex: 1, height: `${dividerHeight}px`, background: dividerColor, border: "none", margin: 0 }} />
      </div>
    );
  }
  // Dots variant: three circles, centre one at full opacity for visual emphasis
  if (dividerType === "dots") {
    return <div style={{ display: "flex", justifyContent: "center", gap: "8px", margin: "20px 0" }}>{[0,1,2].map(i => <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: dividerColor, display: "inline-block", opacity: i === 1 ? 1 : 0.4 }} />)}</div>;
  }
  // Gradient variant: rule that fades at both ends using a symmetric gradient
  if (dividerType === "gradient") {
    return <hr style={{ height: `${dividerHeight}px`, background: `linear-gradient(to right, transparent, ${dividerColor}, transparent)`, border: "none", margin: "20px 0" }} />;
  }
  // Default line variant
  return <hr style={{ height: `${dividerHeight}px`, backgroundColor: dividerColor, border: "none", margin: "20px 0" }} />;
}

/**
 * HTMLElement — injects raw HTML from element.content.html directly into the DOM.
 * Restricted to admin-authored CMS content; not safe for arbitrary user input.
 */
function HTMLElement({ element }: { element: FlexibleElement }) {
  /* SECURITY: admin-only CMS content */
  /* Replaces {{cms.*}} template vars using window.__CMS_SITE injected by layout.tsx */
  const raw = element.content.html || "";
  const html = typeof window !== "undefined" && (window as any).__CMS_SITE
    ? raw.replace(/\{\{cms\.logo\}\}/g, (window as any).__CMS_SITE.logoUrl ?? "")
        .replace(/\{\{cms\.company\}\}/g, (window as any).__CMS_SITE.companyName ?? "")
        .replace(/\{\{cms\.tagline\}\}/g, (window as any).__CMS_SITE.tagline ?? "")
        .replace(/\{\{cms\.phone\}\}/g, (window as any).__CMS_SITE.phone ?? "")
        .replace(/\{\{cms\.email\}\}/g, (window as any).__CMS_SITE.email ?? "")
        .replace(/\{\{cms\.address\}\}/g, (window as any).__CMS_SITE.address ?? "")
        .replace(/\{\{cms\.city\}\}/g, (window as any).__CMS_SITE.city ?? "")
        .replace(/\{\{cms\.postal\}\}/g, (window as any).__CMS_SITE.postalCode ?? "")
        .replace(/\{\{cms\.country\}\}/g, (window as any).__CMS_SITE.country ?? "")
        .replace(/\{\{cms\.copyright\}\}/g, (window as any).__CMS_SITE.copyrightText ?? "")
        .replace(/\{\{cms\.facebook\}\}/g, (window as any).__CMS_SITE.facebook ?? "")
        .replace(/\{\{cms\.instagram\}\}/g, (window as any).__CMS_SITE.instagram ?? "")
        .replace(/\{\{cms\.twitter\}\}/g, (window as any).__CMS_SITE.twitter ?? "")
        .replace(/\{\{cms\.linkedin\}\}/g, (window as any).__CMS_SITE.linkedin ?? "")
        .replace(/\{\{cms\.youtube\}\}/g, (window as any).__CMS_SITE.youtube ?? "")
        .replace(/\{\{cms\.tiktok\}\}/g, (window as any).__CMS_SITE.tiktok ?? "")
    : raw;
  return <div className="html-element" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * HeroElement — full-bleed hero section embedded within a FlexibleElement.
 *
 * Supports background image, autoplay cover video, and/or a gradient overlay.
 * heroType "full-hero" expands to 100vh; "mini-hero" defaults to 320px minimum height.
 * When both gradient and a dark overlay would appear, only the gradient is shown to avoid
 * double-darkening the background.
 */
function HeroElement({ element }: { element: FlexibleElement }) {
  const { heroType = "mini-hero", backgroundImage, backgroundVideo, gradient, gradientOpacity = 100, heroHeading, heroSubheading, heroText, heroButton, heroSecondButton, heroAlign = "center", heroMinHeight } = element.content;
  // full-hero fills the entire viewport; mini-hero has a fixed minimum height
  const minH   = heroMinHeight || (heroType === "full-hero" ? "100vh" : "320px");
  const alignMap: Record<string, React.CSSProperties["alignItems"]> = { left: "flex-start", center: "center", right: "flex-end" };
  const hasContent = heroHeading || heroSubheading || heroText || heroButton;

  return (
    <div className={`hero-element ${heroType}`} style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined, backgroundSize: "cover", backgroundPosition: "center", minHeight: minH, position: "relative", borderRadius: element.styling?.borderRadius || "14px", overflow: "hidden" }}>
      {/* Video layer — renders below gradient (zIndex 0); muted required for autoplay */}
      {backgroundVideo && (
        <video autoPlay loop muted playsInline style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      )}
      {/* Gradient scrim — applied above the image/video layer */}
      {gradient && <div style={{ position: "absolute", inset: 0, background: typeof gradient === "string" ? gradient : undefined, opacity: gradientOpacity / 100, zIndex: 1 }} />}
      {/* Fallback dark overlay — only shown when no gradient is configured, to maintain text legibility */}
      {!gradient && hasContent && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1 }} />}
      {hasContent && (
        <div style={{ position: "relative", zIndex: 2, minHeight: minH, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: alignMap[heroAlign] || "center", padding: "40px 36px", color: "#fff", textAlign: heroAlign as React.CSSProperties["textAlign"] }}>
          {heroHeading    && <h2 style={{ fontWeight: 900, fontSize: "2.4rem", textShadow: "0 2px 16px rgba(0,0,0,0.45)", margin: 0, lineHeight: 1.15 }}>{heroHeading}</h2>}
          {heroSubheading && <p  style={{ fontSize: "1.1rem", opacity: 0.88, margin: "12px 0 0", maxWidth: "580px" }}>{heroSubheading}</p>}
          {/* SECURITY: admin-only CMS content */}
          {heroText && <div style={{ margin: "16px 0 0", opacity: 0.82 }} dangerouslySetInnerHTML={{ __html: heroText }} />}
          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap", justifyContent: heroAlign === "center" ? "center" : undefined }}>
            {heroButton       && <a href={heroButton.href       || "#"} className="btn btn-primary btn-lg"      style={{ borderRadius: "8px", fontWeight: 600 }}>{heroButton.icon       && <i className={`bi ${heroButton.icon} me-2`}></i>}{heroButton.text}</a>}
            {heroSecondButton && <a href={heroSecondButton.href || "#"} className="btn btn-outline-light btn-lg" style={{ borderRadius: "8px", fontWeight: 600 }}>{heroSecondButton.icon && <i className={`bi ${heroSecondButton.icon} me-2`}></i>}{heroSecondButton.text}</a>}
          </div>
        </div>
      )}
    </div>
  );
}

// ISPPriceCard placeholder — component not yet implemented
function ISPPriceCard(props: Record<string, any>) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, textAlign: "center" }}>
      <strong>{props.packageName || "Package"}</strong>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{props.price || "R0"}</div>
      <div>{props.downloadSpeed ?? 0} {props.speedUnit || "Mbps"}</div>
    </div>
  );
}

// ─── IspPriceCardElement — wraps ISPPriceCard for FlexibleElement content ────

/**
 * IspPriceCardElement — adapter that reads ISP pricing data from a FlexibleElement's
 * content record and renders the shared ISPPriceCard component.
 *
 * Performs the same prop-extraction and type-coercion as the DesignerBlock isp-price-card
 * case so both entry points produce identical card output.
 */
function IspPriceCardElement({ element }: { element: FlexibleElement }) {
  const c = element.content as Record<string, unknown>;
  const pkg      = (c.packageType as string) || "fibre";
  // Ensure numeric types regardless of whether the stored value is a string or number
  const dlNum    = parseFloat(String(c.downloadSpeed ?? 0)) || 0;
  const ulNum    = parseFloat(String(c.uploadSpeed   ?? 0)) || 0;
  // Features are stored as a newline-delimited string; split and filter empty lines
  const features = (String(c.features || "")).split("\n").filter(Boolean);
  // Select the appropriate Bootstrap Icon class for the package type
  const pkgIcon  = pkg === "wifi" ? "bi-wifi" : pkg === "lte" ? "bi-reception-4" : pkg === "fwa" ? "bi-broadcast" : "bi-lightning-charge";
  return (
    <ISPPriceCard
      packageName={(c.packageName as string) || "Package"}
      packageIcon={pkgIcon}
      packageType={pkg}
      price={(c.price as string) || "R0"}
      priceLabel={(c.priceLabel as string) || "/pm"}
      downloadSpeed={dlNum}
      uploadSpeed={ulNum}
      speedUnit={(c.speedUnit as string) || "Mbps"}
      features={features}
      isFeatured={!!(c.isFeatured)}
      featuredLabel={(c.featuredLabel as string) || "MOST POPULAR"}
      accentColor={(c.accentColor as string) || "#4ecdc4"}
      cardBg={(c.cardBgColor as string) || "#0f172a"}
      textColor={(c.textColor as string) || "#ffffff"}
      buttonText={(c.buttonText as string) || "Get Started"}
      buttonHref={(c.navTarget as string) || "#"}
      cardPreset={(c.cardPreset as any) || "aurora"}
      expandMode={(c.expandMode as any) || "flip"}
      headerImage={(c.headerImage as string) || ""}
    />
  );
}

// ─── Graphic Renderer ─────────────────────────────────────────────────────────

/**
 * GraphicRenderer — renders a decorative graphic element used for header/footer overlays.
 *
 * Supports three types:
 *   "image"    — an <img> tag spanning the full container width/height
 *   "gradient" — a CSS gradient fill (useful for fade-in/fade-out edge effects)
 *   "shape"    — a solid-colour div clipped by a CSS clipPath (e.g. triangles)
 *
 * opacity (0-100) and blendMode (CSS mix-blend-mode) allow compositing over the section background.
 */
function GraphicRenderer({ config }: { config: any }) {
  const { type, height, opacity = 100, blendMode = "normal" } = config;
  return (
    <div style={{ height: `${height}px`, opacity: opacity / 100, mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"] }}>
      {type === "image"    && <img src={config.image} alt="Graphic" style={{ width: "100%", height: "100%" }} />}
      {type === "gradient" && <div style={{ background: config.gradient || "linear-gradient(to bottom, #000, transparent)", height: "100%" }} />}
      {type === "shape"    && <div style={{ background: config.color || "#000", height: "100%", clipPath: config.clipPath }} />}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * resolveBgColor — converts a background preset name or raw CSS value to a concrete
 * CSS color or gradient string.
 *
 * Preset names (white, gray, blue, etc.) map to specific values including CSS gradient
 * strings for the midnight/teal/purple presets. Unknown strings are returned as-is,
 * allowing arbitrary hex colours and CSS gradient strings to pass through.
 */
function resolveBgColor(background?: string): string {
  const BG_PRESETS: Record<string, string> = {
    white:       "#ffffff",
    gray:        "#f8f9fa",
    blue:        "#1e3a5f",
    lightblue:   "#e8f4fd",
    transparent: "transparent",
    dark:        "#0d1117",
    midnight:    "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    teal:        "linear-gradient(135deg, #0d4a4a, #0a2a2a)",
    purple:      "linear-gradient(135deg, #2d1b69, #11073f)",
  };
  if (!background) return "#ffffff";
  return BG_PRESETS[background] ?? background;
}

/**
 * isDarkBackground — determines whether the section background is dark enough that
 * white text should be used for contrast.
 *
 * Strategy:
 * 1. Check known-dark/known-light preset name lists for O(1) lookup
 * 2. Treat any CSS gradient as dark (gradients are typically dark in this design system)
 * 3. For hex colours, calculate the W3C relative luminance with standard coefficients
 *    (0.299 R + 0.587 G + 0.114 B) and compare against the 0.5 threshold
 */
/**
 * isThemeToken — true if the value references a theme CSS custom property
 * (e.g. "var(--theme-surface)"). Such values flip with the [data-theme] toggle,
 * so contrast can't be computed statically; default text follows --theme-text.
 */
function isThemeToken(value?: string): boolean {
  return typeof value === "string" && value.indexOf("var(--theme") === 0;
}

/**
 * renderAccentText — converts an inline accent marker `**word**` in heading text
 * into an accent-coloured span (`.cms-accent` → var(--theme-red)). Lets authors
 * highlight one word per heading from a plain text field. Returns the raw string
 * unchanged when no marker is present.
 */
/**
 * renderAccentText — inline markup in headings/labels:
 *   **word**  → red accent  (.cms-accent)
 *   __word__  → outlined / hollow letters (.cms-outline — transparent fill + stroke)
 * Both can be mixed in one string. Plain text returns unchanged.
 */
function renderAccentText(text: string): React.ReactNode {
  if (!text || (text.indexOf("**") === -1 && text.indexOf("__") === -1)) return text;
  // Split while KEEPING the delimited tokens so order is preserved.
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    const accent = part.match(/^\*\*([^*]+)\*\*$/);
    if (accent) return <span key={i} className="cms-accent">{accent[1]}</span>;
    const outline = part.match(/^__([^_]+)__$/);
    if (outline) return <span key={i} className="cms-outline">{outline[1]}</span>;
    return part;
  });
}

function isDarkBackground(background?: string): boolean {
  if (!background) return false;
  const dark = ["blue", "dark", "midnight", "teal", "purple"];
  if (dark.includes(background)) return true;
  const light = ["white", "gray", "lightblue", "transparent"];
  if (light.includes(background)) return false;
  const resolved = resolveBgColor(background);
  // CSS gradient strings — treated as dark
  if (isGradient(resolved)) return true;
  // Hex colour — compute luminance with W3C coefficients
  if (resolved.startsWith("#") && resolved.length >= 7) {
    const r = parseInt(resolved.slice(1, 3), 16);
    const g = parseInt(resolved.slice(3, 5), 16);
    const b = parseInt(resolved.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  }
  return false;
}

/**
 * isGradient — returns true if the CSS value string is a gradient (linear or radial).
 * Used to decide whether to apply the `background` shorthand instead of `background-color`.
 */
function isGradient(value?: string): boolean {
  if (!value) return false;
  return value.includes("gradient") || value.startsWith("linear-") || value.startsWith("radial-");
}

/**
 * animateElement — triggers an Anime.js entrance animation on a DOM element.
 *
 * The animation type string maps to a predefined keyframe definition (defs).
 * bounceIn uses a spring easing for a natural overshoot; all others use
 * cubicBezier(0.4, 0, 0.2, 1) (Material Design standard easing).
 *
 * The element's opacity is cleared first so the animation can take full control
 * from its initial keyframe value (avoids a flash where opacity=0 persists).
 */
function animateElement(element: HTMLElement, animation: FlexibleElement["animation"]) {
  const { type, duration = 600, delay = 0 } = animation!;
  // Keyframe definitions indexed by animation type string
  const defs: Record<string, any> = {
    fadeIn:       { opacity: [0, 1] },
    slideUp:      { translateY: [30, 0],  opacity: [0, 1] },
    slideDown:    { translateY: [-30, 0], opacity: [0, 1] },
    slideInLeft:  { translateX: [-40, 0], opacity: [0, 1] },
    slideInRight: { translateX: [40, 0],  opacity: [0, 1] },
    scaleIn:      { scale: [0.85, 1],     opacity: [0, 1] },
    zoomIn:       { scale: [1.15, 1],     opacity: [0, 1] },
    flipInX:      { rotateX: [90, 0],     opacity: [0, 1] },
    flipInY:      { rotateY: [90, 0],     opacity: [0, 1] },
    bounceIn:     { scale: [0.3, 1.08, 0.95, 1.02, 1], opacity: [0, 1, 1, 1, 1] },
    rotateIn:     { rotate: [-15, 0],     opacity: [0, 1], scale: [0.9, 1] },
  };
  // Clear the hidden state set by ElementRenderer before animation starts
  element.style.opacity = "";
  if (defs[type!]) {
    animate(element, {
      ...defs[type!],
      duration,
      delay,
      // bounceIn needs spring physics for the overshoot; others use standard ease-in-out
      ease: type === "bounceIn" ? "spring(1, 80, 10, 0)" : "cubicBezier(0.4, 0, 0.2, 1)",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageCarousel — multi-image carousel for the "image" block type
// ─────────────────────────────────────────────────────────────────────────────
function ImageCarousel({
  images, columns, displayMode, transition, interval,
}: {
  images: Array<{ url: string; alt?: string }>;
  columns: number;
  displayMode: string;
  transition: string;
  interval: number;
}) {
  const cols = Math.max(1, Math.min(3, columns));
  const maxIndex = Math.max(0, images.length - cols);
  const [index, setIndex] = useState(() =>
    displayMode === "random" ? Math.floor(Math.random() * Math.max(1, images.length)) : 0
  );
  const isFade = transition === "fade";

  // Auto-rotate
  useEffect(() => {
    if (displayMode !== "auto-rotate" || images.length <= cols) return;
    const t = setInterval(() => setIndex((i) => i >= maxIndex ? 0 : i + 1), interval * 1000);
    return () => clearInterval(t);
  }, [displayMode, interval, images.length, cols, maxIndex]);

  const transitionCss = (() => {
    if (isFade)              return undefined;
    if (transition === "snap") return "transform 0ms";
    if (transition === "ease") return "transform 600ms ease-in-out";
    return "transform 400ms ease"; // slide default
  })();

  const slideWidthPct = 100 / cols;

  const btnStyle: React.CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 36, height: 36, borderRadius: "50%", border: "none",
    background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 20,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 5, lineHeight: 1,
  };

  const showNav = images.length > cols;

  return (
    <div style={{ height: "100%", minHeight: 200, position: "relative", overflow: "hidden" }}>
      {isFade ? (
        // Fade mode: stack all images, animate opacity
        images.map((img, i) => (
          <div key={i} style={{
            position: "absolute", inset: 0,
            opacity: i === index ? 1 : 0,
            transition: "opacity 500ms ease",
            pointerEvents: i === index ? "auto" : "none",
          }}>
            <img src={img.url} alt={img.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ))
      ) : (
        // Slide/ease/snap mode: translate strip
        <div style={{
          display: "flex", height: "100%", width: "100%",
          transform: `translateX(-${index * slideWidthPct}%)`,
          transition: transitionCss,
        }}>
          {images.map((img, i) => (
            <div key={i} style={{ flexShrink: 0, width: `${slideWidthPct}%`, height: "100%" }}>
              <img src={img.url} alt={img.alt || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ))}
        </div>
      )}

      {showNav && (
        <>
          <button style={{ ...btnStyle, left: 8 }} disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}>‹</button>
          <button style={{ ...btnStyle, right: 8 }} disabled={index >= maxIndex}
            onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}>›</button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 5 }}>
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} style={{
              width: i === index ? 16 : 8, height: 8, borderRadius: 4, border: "none", padding: 0,
              background: i === index ? "#fff" : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "all 200ms",
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
