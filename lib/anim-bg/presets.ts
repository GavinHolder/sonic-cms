/**
 * Animated Background System — subtle line-art presets.
 *
 * Each preset is NOT a new animator: it resolves to an ordinary `svg-animation`
 * layer (see svgAnimationAnimator in animators.ts) whose SVG carries its own CSS
 * keyframes. So every consumer of the shared system (FLEXIBLE / normal sections,
 * hero slides) gets them through the one existing renderer.
 *
 * ASSUMPTIONS:
 * 1. svgAnimationAnimator injects `svgCode` into the page DOM, so the <style>
 *    block applies document-wide — every class / keyframe is prefixed `abp-`.
 * 2. svgAnimationAnimator forces `preserveAspectRatio="xMidYMid meet"` on the ROOT
 *    <svg>. The root therefore has no viewBox and the art lives in a nested <svg>
 *    that covers the box (`slice`), so it fills any hero/section aspect ratio.
 * 3. With `colorize: true` the animator sets the root's CSS `color` to the layer's
 *    first colour — the accent is `currentColor`, editable in the layer's colours.
 *
 * FAILURE MODES:
 * - Light backgrounds: the neutral "ink" lines are a fixed near-white and fade out.
 *   The accent-coloured parts remain; pick a darker accent or another preset.
 * - prefers-reduced-motion: every preset stops its own keyframes (static art).
 */
import type { AnimBgLayer, SVGAnimationConfig } from "./types";
import { DEFAULT_FALLBACK_COLORS } from "./defaults";

export type LineArtPresetId =
  | "fibre-strands"
  | "community-links"
  | "town-network"
  | "signal-rings"
  | "voice-waveform";

export interface LineArtPreset {
  id: LineArtPresetId;
  label: string;
  desc: string;
  icon: string;
}

export const LINE_ART_PRESETS: LineArtPreset[] = [
  { id: "fibre-strands",   label: "Fibre strands",   icon: "bi-bezier2",      desc: "Faint curved strands, a light running along each" },
  { id: "community-links", label: "Community links", icon: "bi-people",       desc: "People joined by lines, one pulse of light at a time" },
  { id: "town-network",    label: "Town network",    icon: "bi-diagram-3",    desc: "Dots joined by lines that draw in, gently pulsing" },
  { id: "signal-rings",    label: "Signal rings",    icon: "bi-broadcast",    desc: "Slow rings expanding from one point and fading" },
  { id: "voice-waveform",  label: "Voice waveform",  icon: "bi-soundwave",    desc: "A row of soft bars rising and falling" },
];

/** Neutral line colour for the non-accent strokes (near-white, used at low opacity). */
const INK = "#f4f5f8";

const REDUCED = "@media (prefers-reduced-motion: reduce)";

type Pt = [number, number];

/** Wrap art in the root/nested <svg> pair described in ASSUMPTIONS #2. */
function wrap(css: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<style>${css}</style>` +
    `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">${body}</svg>` +
    `</svg>`
  );
}

/** Straight segment a→b, trimmed by `gap` px at both ends (so lines stop short of a node). */
function segment(a: Pt, b: Pt, gap: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = (dx / len) * gap;
  const uy = (dy / len) * gap;
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M${r(a[0] + ux)} ${r(a[1] + uy)} L${r(b[0] - ux)} ${r(b[1] - uy)}`;
}

function fibreStrands(): string {
  const css =
    `.abp-fs-faint{fill:none;stroke:${INK};stroke-width:1;opacity:.12}` +
    `.abp-fs-streak{fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-dasharray:6 94;opacity:.6;animation:abp-fs-run 9s linear infinite}` +
    `@keyframes abp-fs-run{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}` +
    `${REDUCED}{.abp-fs-streak{animation:none}}`;
  let body = "";
  for (let i = 0; i < 14; i++) {
    const y = 140 + i * 46;
    const bend = 60 + (i % 5) * 26;
    const d = `M620 ${y} C900 ${y - bend}, 1200 ${y + bend}, 1620 ${y - 20}`;
    const delay = -((i * 1.7) % 9);
    const dur = 8 + (i % 4) * 0.5; // 8–9.5s
    body += `<path class="abp-fs-faint" d="${d}"/>`;
    body += `<path class="abp-fs-streak" pathLength="100" d="${d}" style="animation-delay:${delay.toFixed(1)}s;animation-duration:${dur}s"/>`;
  }
  return wrap(css, body);
}

function communityLinks(): string {
  const people: Pt[] = [[800, 560], [930, 400], [1080, 610], [1210, 360], [1370, 530], [1040, 230], [1300, 710], [1480, 330], [1160, 480]];
  const links: Array<[number, number]> = [[0, 1], [1, 2], [1, 5], [5, 3], [2, 8], [8, 3], [3, 4], [2, 6], [4, 6], [3, 7], [4, 7], [1, 8]];
  // One pulse at a time: each pulse is visible only for its own slot of the shared cycle.
  const slot = 1.5; // seconds a single pulse takes
  const cycle = 9;  // 6 pulses × 1.5s
  const pulseLinks = [0, 2, 5, 6, 8, 10];
  const css =
    `.abp-cl-link{fill:none;stroke:${INK};stroke-width:1;opacity:.2}` +
    `.abp-cl-person{fill:none;stroke:${INK};stroke-width:1.25;stroke-linecap:round;opacity:.3;animation:abp-cl-blink 6s ease-in-out infinite}` +
    `.abp-cl-pulse{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-dasharray:8 200;stroke-dashoffset:8;opacity:0;animation:abp-cl-travel ${cycle}s linear infinite}` +
    `@keyframes abp-cl-blink{0%,100%{opacity:.3}50%{opacity:.6}}` +
    `@keyframes abp-cl-travel{0%{stroke-dashoffset:8;opacity:0}2%{opacity:.8}13%{opacity:.8}16%,100%{stroke-dashoffset:-100;opacity:0}}` +
    `${REDUCED}{.abp-cl-person,.abp-cl-pulse{animation:none}}`;
  let body = "";
  links.forEach(([a, b]) => {
    body += `<path class="abp-cl-link" d="${segment(people[a], people[b], 26)}"/>`;
  });
  pulseLinks.forEach((li, n) => {
    const [a, b] = links[li];
    body += `<path class="abp-cl-pulse" pathLength="100" d="${segment(people[a], people[b], 26)}" style="animation-delay:${(n * slot).toFixed(1)}s"/>`;
  });
  people.forEach(([x, y], i) => {
    // head and shoulders, drawn as a thin outline
    const d = `M${x - 6} ${y - 9} a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M${x - 13} ${y + 14} a13 11 0 0 1 26 0`;
    body += `<path class="abp-cl-person" d="${d}" style="animation-delay:${(i * 0.5).toFixed(1)}s"/>`;
  });
  return wrap(css, body);
}

function townNetwork(): string {
  const pts: Pt[] = [[820, 250], [980, 180], [1130, 300], [1290, 220], [1420, 360], [1010, 430], [1210, 520], [1380, 600], [900, 600]];
  const links: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [5, 8], [2, 6]];
  const css =
    `.abp-tn-link{fill:none;stroke:${INK};stroke-width:1;opacity:.2;stroke-dasharray:100;stroke-dashoffset:100;animation:abp-tn-draw 3.4s ease-out forwards}` +
    `.abp-tn-node{fill:currentColor;opacity:.3;animation:abp-tn-blink 6s ease-in-out infinite}` +
    `@keyframes abp-tn-draw{to{stroke-dashoffset:0}}` +
    `@keyframes abp-tn-blink{0%,100%{opacity:.3}50%{opacity:.6}}` +
    `${REDUCED}{.abp-tn-link{animation:none;stroke-dashoffset:0}.abp-tn-node{animation:none}}`;
  let body = "";
  links.forEach(([a, b], i) => {
    body += `<path class="abp-tn-link" pathLength="100" d="${segment(pts[a], pts[b], 8)}" style="animation-delay:${(0.4 + i * 0.26).toFixed(2)}s"/>`;
  });
  pts.forEach(([x, y], i) => {
    body += `<circle class="abp-tn-node" cx="${x}" cy="${y}" r="4" style="animation-delay:${(i * 0.5).toFixed(1)}s"/>`;
  });
  return wrap(css, body);
}

function signalRings(): string {
  const cx = 1150;
  const cy = 430;
  const css =
    `.abp-sr-ring{fill:none;stroke:currentColor;stroke-width:1;opacity:0;transform-origin:${cx}px ${cy}px;animation:abp-sr-ping 7s ease-out infinite}` +
    `.abp-sr-mast{fill:none;stroke:${INK};stroke-width:1.5;opacity:.35}` +
    `.abp-sr-dot{fill:currentColor;opacity:.6}` +
    `@keyframes abp-sr-ping{0%{transform:scale(.15);opacity:.4}100%{transform:scale(1);opacity:0}}` +
    `${REDUCED}{.abp-sr-ring{animation:none;opacity:.25}.abp-sr-r1{transform:scale(.35)}.abp-sr-r2{transform:scale(.65)}}`;
  let body = "";
  for (let i = 0; i < 3; i++) {
    body += `<circle class="abp-sr-ring abp-sr-r${i + 1}" cx="${cx}" cy="${cy}" r="420" style="animation-delay:${(i * 2.3).toFixed(1)}s"/>`;
  }
  body += `<path class="abp-sr-mast" d="M${cx} ${cy} V760 M${cx - 30} 760 H${cx + 30}"/>`;
  body += `<circle class="abp-sr-dot" cx="${cx}" cy="${cy}" r="5"/>`;
  return wrap(css, body);
}

function voiceWaveform(): string {
  const css =
    `.abp-vw-bar{fill:currentColor;opacity:.3;transform-box:fill-box;transform-origin:center;animation:abp-vw-talk 6s ease-in-out infinite}` +
    `@keyframes abp-vw-talk{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}` +
    `${REDUCED}{.abp-vw-bar{animation:none;transform:scaleY(.6)}}`;
  let body = "";
  for (let i = 0; i < 34; i++) {
    const h = 60 + Math.round(Math.abs(Math.sin(i * 0.55)) * 300 + (i % 3) * 30);
    body += `<rect class="abp-vw-bar" x="${760 + i * 24}" y="${450 - h / 2}" width="10" height="${h}" rx="5" style="animation-delay:${(-i * 0.38).toFixed(2)}s"/>`;
  }
  return wrap(css, body);
}

const BUILDERS: Record<LineArtPresetId, () => string> = {
  "fibre-strands":   fibreStrands,
  "community-links": communityLinks,
  "town-network":    townNetwork,
  "signal-rings":    signalRings,
  "voice-waveform":  voiceWaveform,
};

/** The SVG markup (with its own CSS animation) for a preset. Pure + deterministic. */
export function lineArtPresetSvg(id: LineArtPresetId): string {
  return BUILDERS[id]();
}

/**
 * Resolve a preset to a ready-to-use `svg-animation` layer.
 * `accent` (hex) becomes the layer's single custom colour — editable afterwards
 * in the layer's "Custom Colors".
 */
export function createLineArtPresetLayer(
  id: LineArtPresetId,
  opts: { layerId?: string; accent?: string } = {}
): AnimBgLayer {
  const config: SVGAnimationConfig = {
    svgCode: lineArtPresetSvg(id),
    animation: "none", // motion comes from the SVG's own CSS keyframes
    speed: 8,
    loop: true,
    scale: 100,
    posX: 50,
    posY: 50,
    colorize: true,
  };
  return {
    id: opts.layerId ?? `layer-${id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "svg-animation",
    enabled: true,
    opacity: 100, // subtlety is baked into the art's own low opacities
    blendMode: "normal",
    useColorPalette: false,
    colors: [opts.accent || DEFAULT_FALLBACK_COLORS[0]],
    config,
  };
}
