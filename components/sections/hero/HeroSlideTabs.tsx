"use client";

import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import type { HeroTabsPalette } from "@/lib/hero/hero-slide-extras";

/** Tab bar heights (px) — HeroCarousel reserves the same amount above the bar for its content. */
export const HERO_TABS_HEIGHT = 76;
export const HERO_TABS_HEIGHT_NARROW = 56;

/**
 * Static rules for the hero slide tab bar. Colours arrive as custom properties on the bar
 * (--ht-*), so one stylesheet serves light and dark slides. The narrow layout (number only,
 * label hidden, shorter bar) applies at <= 860px, and also via .hero-tabs--narrow so a forced
 * mobile viewport (admin preview) gets it regardless of the real window width.
 * Only transform is animated (the progress line); z-index 26 sits above the hero's bottom
 * controls (20) and stats strip (25).
 */
const HERO_TABS_CSS = `
.hero-tabs{position:absolute;left:0;right:0;bottom:0;z-index:26;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);border-top:1px solid var(--ht-line);background:var(--ht-bg);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);isolation:isolate}
.hero-tab{position:relative;min-width:0;min-height:${HERO_TABS_HEIGHT}px;padding:14px clamp(10px,2vw,28px);text-align:left;background:none;border:0;border-right:1px solid var(--ht-line);color:var(--ht-text);cursor:pointer;font:inherit;line-height:1.2}
.hero-tab:last-child{border-right:0}
.hero-tab:hover{color:var(--ht-text-active);background:var(--ht-hover)}
.hero-tab:active{background:var(--ht-line)}
.hero-tab[aria-current="true"]{color:var(--ht-text-active)}
.hero-tab:focus-visible{outline:3px solid var(--ht-focus);outline-offset:-3px}
.hero-tab-num{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.14em;font-variant-numeric:tabular-nums}
.hero-tab-label{display:block;margin-top:4px;font-size:clamp(13px,1.2vw,17px);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hero-tab-bar{position:absolute;left:0;top:-1px;width:100%;height:3px;background:var(--ht-accent);transform:scaleX(0);transform-origin:left;pointer-events:none}
.hero-tab[aria-current="true"] .hero-tab-bar{transform:scaleX(1)}
.hero-tab[aria-current="true"] .hero-tab-bar--run{transform:scaleX(0);animation:hero-tab-fill var(--ht-dur,7000ms) linear forwards}
@keyframes hero-tab-fill{to{transform:scaleX(1)}}
.hero-tabs--narrow .hero-tab{min-height:${HERO_TABS_HEIGHT_NARROW}px;text-align:center;padding-left:4px;padding-right:4px}
.hero-tabs--narrow .hero-tab-label{display:none}
@media (max-width:860px){
.hero-tab{min-height:${HERO_TABS_HEIGHT_NARROW}px;text-align:center;padding-left:4px;padding-right:4px}
.hero-tab-label{display:none}
}
@media (prefers-reduced-motion:reduce){
.hero-tab[aria-current="true"] .hero-tab-bar--run{animation:none;transform:scaleX(1)}
}
`;

interface HeroSlideTabsProps {
  labels: string[];
  current: number;
  onSelect: (index: number) => void;
  palette: HeroTabsPalette;
  /** Colour of the active tab's progress line. */
  accent: string;
  /** True while autoplay is actually advancing: the line fills over `durationMs`. False = a full, static line. */
  running: boolean;
  durationMs: number;
  /** Force the narrow layout (mobile viewport forced by the admin preview). */
  narrow: boolean;
}

/**
 * Full-width slide tabs along the bottom of the hero.
 *
 * ASSUMPTIONS:
 * 1. Rendered only inside HeroCarousel's root (position: relative; overflow: hidden) — the bar is absolute.
 * 2. `labels.length` equals the slide count and is > 1 (the caller gates on heroTabsEnabled).
 * 3. `onSelect` is cheap and idempotent (it is the carousel's own goToSlide).
 *
 * FAILURE MODES:
 * - Very many slides -> columns get narrow -> labels ellipsis, numbers stay readable.
 * - Label hidden on narrow screens -> each button carries the full label in aria-label.
 * - Reduced motion -> no fill animation; the active tab shows a full static line.
 */
export default function HeroSlideTabs({ labels, current, onSelect, palette, accent, running, durationMs, narrow }: HeroSlideTabsProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (to: number) => {
    const next = (to + labels.length) % labels.length;
    onSelect(next);
    buttonsRef.current[next]?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); move(current + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); move(current - 1); }
    else if (e.key === "Home") { e.preventDefault(); move(0); }
    else if (e.key === "End") { e.preventDefault(); move(labels.length - 1); }
  };

  const vars = {
    "--ht-bg": palette.background,
    "--ht-line": palette.line,
    "--ht-text": palette.text,
    "--ht-text-active": palette.textActive,
    "--ht-hover": palette.hover,
    "--ht-focus": palette.focus,
    "--ht-accent": accent,
    "--ht-dur": `${Math.max(0, durationMs)}ms`,
  } as CSSProperties;

  return (
    <>
      <style>{HERO_TABS_CSS}</style>
      <div
        className={`hero-tabs${narrow ? " hero-tabs--narrow" : ""}`}
        role="group"
        aria-label="Choose a slide"
        style={vars}
        onKeyDown={onKeyDown}
      >
        {labels.map((label, index) => {
          const active = index === current;
          return (
            <button
              key={index}
              ref={(el) => { buttonsRef.current[index] = el; }}
              type="button"
              className="hero-tab"
              aria-current={active ? "true" : undefined}
              aria-label={`${label}, slide ${index + 1} of ${labels.length}`}
              onClick={() => onSelect(index)}
            >
              {/* Keyed on the running state so the fill restarts with the autoplay timer. */}
              <span
                key={active && running ? "run" : "still"}
                className={`hero-tab-bar${active && running ? " hero-tab-bar--run" : ""}`}
                aria-hidden="true"
              />
              <span className="hero-tab-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="hero-tab-label" aria-hidden="true">{label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
