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
 * 4. With `colorize: true` the animator also exposes the layer's SECOND colour (already
 *    sanitised by its safeColor) as the CSS variable `--anim-bg-color-2`. The neutral
 *    lines read it with the near-white default as fallback, so a one-colour layer keeps
 *    the original look and the colour never gets interpolated into markup.
 * 5. The animator marks the root `data-anim-paused` while paused (off-screen); the CSS
 *    below pauses the keyframes on that attribute.
 *
 * FAILURE MODES:
 * - Light backgrounds: the neutral lines default to near-white and fade out. Give the
 *   layer a second colour (LINE_ART_LINE_DARK) — see ASSUMPTIONS #4.
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
  { id: "fibre-strands",   label: "Fibre network",   icon: "bi-bezier2",      desc: "A trunk line, cabinets and straight drops, a light running to each premises" },
  { id: "community-links", label: "Community links", icon: "bi-people",       desc: "People joined by lines, one pulse of light at a time" },
  { id: "town-network",    label: "Town network",    icon: "bi-diagram-3",    desc: "Dots joined by lines that draw in, gently pulsing" },
  { id: "signal-rings",    label: "Signal mast",     icon: "bi-broadcast",    desc: "A mast with sector panels and dishes, slow rings fading from its top" },
  { id: "voice-waveform",  label: "Voice waveform",  icon: "bi-soundwave",    desc: "A row of soft bars rising and falling" },
];

/** Default neutral line colour — near-white, for dark slides/sections. */
export const LINE_ART_LINE_LIGHT = "#f4f5f8";
/** Neutral line colour for LIGHT slides/sections (dark lines on a pale background). */
export const LINE_ART_LINE_DARK = "#1f2937";

/** Neutral line colour for the non-accent strokes (used at low opacity): the layer's
 *  second colour when it has one, else the near-white default. */
const INK = `var(--anim-bg-color-2,${LINE_ART_LINE_LIGHT})`;

// Scoped to the presets' own `abp-` classes: a <style> inside inline SVG applies to the whole
// page, and every svg-animation layer carries data-anim-paused while paused, so an unscoped
// `[data-anim-paused] *` would also freeze the CSS keyframes of an unrelated custom SVG layer
// in any other section on the same page.
const PAUSED = '[data-anim-paused] [class^="abp-"]{animation-play-state:paused!important}';

const REDUCED = "@media (prefers-reduced-motion: reduce)";

type Pt = [number, number];

/** Wrap art in the root/nested <svg> pair described in ASSUMPTIONS #2. */
function wrap(css: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<style>${css}${PAUSED}</style>` +
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
    `.abp-fn-faint{fill:none;stroke:${INK};stroke-width:1;opacity:.12}` +
    `.abp-fn-trunk{stroke-width:1.5;opacity:.3}` +
    `.abp-fn-streak{fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:90 1080;opacity:.8;animation:abp-fn-run 9s linear infinite}` +
    `.abp-fn-premise,.abp-fn-cab{fill:${INK};opacity:.3;animation:abp-fn-blink 6s ease-in-out infinite}` +
    `.abp-fn-src{fill:none;stroke:${INK};stroke-width:1.5;opacity:.35}` +
    `@keyframes abp-fn-run{from{stroke-dashoffset:1170}to{stroke-dashoffset:0}}` +
    `@keyframes abp-fn-blink{0%,100%{opacity:.3}50%{opacity:.6}}` +
    `${REDUCED}{.abp-fn-streak,.abp-fn-premise,.abp-fn-cab{animation:none}}`;
  const src: Pt = [800, 470];                                  // where the trunk comes in
  const cabs: Pt[] = [[900, 470], [1160, 470], [1400, 470]];   // street cabinets on the trunk
  // [cabinet index, route from the cabinet to the premises] — straight runs, 45° chamfered corners
  const drops: Array<[number, Pt[]]> = [
    [0, [[960, 410], [960, 250], [1020, 190], [1140, 190]]],
    [0, [[960, 530], [960, 660], [1010, 710], [1100, 710]]],
    [1, [[1220, 410], [1220, 300], [1280, 240], [1420, 240]]],
    [1, [[1220, 530], [1220, 620], [1270, 670], [1360, 670]]],
    [2, [[1460, 410], [1460, 340], [1560, 340]]],
    [2, [[1460, 530], [1460, 600], [1570, 600]]],
    [2, [[1600, 470]]],
  ];
  const line = (pts: Pt[]) => "M" + pts.map((p) => p.join(" ")).join(" L");
  let body = `<path class="abp-fn-faint abp-fn-trunk" d="${line([src, [1600, 470]])}"/>`;
  drops.forEach(([c, pts]) => {
    body += `<path class="abp-fn-faint" d="${line([cabs[c], ...pts])}"/>`;
  });
  drops.forEach(([c, pts], i) => {
    // light leaves the source and runs the whole route to the premises
    const delay = -((i * 1.9) % 9);
    const dur = 8 + (i % 3); // 8–10s
    body += `<path class="abp-fn-streak" pathLength="1170" d="${line([src, cabs[c], ...pts])}" style="animation-delay:${delay.toFixed(1)}s;animation-duration:${dur}s"/>`;
    const [x, y] = pts[pts.length - 1];
    body += `<rect class="abp-fn-premise" x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" style="animation-delay:${(i * 0.5).toFixed(1)}s"/>`;
  });
  cabs.forEach(([x, y], i) => {
    body += `<circle class="abp-fn-cab" cx="${x}" cy="${y}" r="5" style="animation-delay:${((i + 2) * 0.5).toFixed(1)}s"/>`;
  });
  body += `<circle class="abp-fn-src" cx="${src[0]}" cy="${src[1]}" r="9"/>`;
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
  // A lattice mast: rings from its top (cx, cy), tapering from halfTop to halfBase at the base.
  const cx = 1180;
  const cy = 250;
  const base = 860;
  const halfTop = 14;
  const halfBase = 78;
  const bays = 9;
  const half = (y: number) => halfTop + (halfBase - halfTop) * ((y - cy) / (base - cy));
  const r = (n: number) => Math.round(n * 10) / 10;
  const css =
    `.abp-sm-ring{fill:none;stroke:currentColor;stroke-width:1;opacity:0;transform-origin:${cx}px ${cy}px;animation:abp-sm-ping 7s ease-out infinite}` +
    `.abp-sm-mast{fill:none;stroke:${INK};stroke-width:1.5;stroke-linejoin:round;opacity:.35}` +
    // No slide background colour is available here, so solid parts get a faint tint of the line colour.
    `.abp-sm-panel,.abp-sm-dish,.abp-sm-feed{fill:${INK};fill-opacity:.3}` +
    `.abp-sm-dot{fill:currentColor;opacity:.6}` +
    `@keyframes abp-sm-ping{0%{transform:scale(.15);opacity:.4}100%{transform:scale(1);opacity:0}}` +
    `${REDUCED}{.abp-sm-ring{animation:none;opacity:.25}.abp-sm-r1{transform:scale(.35)}.abp-sm-r2{transform:scale(.65)}}`;
  let body = "";
  for (let i = 0; i < 3; i++) {
    body += `<circle class="abp-sm-ring abp-sm-r${i + 1}" cx="${cx}" cy="${cy}" r="420" style="animation-delay:${(i * 2.3).toFixed(1)}s"/>`;
  }
  let d = `M${cx - halfTop} ${cy} L${cx - halfBase} ${base} M${cx + halfTop} ${cy} L${cx + halfBase} ${base}`;
  for (let i = 0; i <= bays; i++) {
    const y = cy + ((base - cy) / bays) * i;
    const w = half(y);
    d += ` M${r(cx - w)} ${r(y)} H${r(cx + w)}`; // horizontal brace
    if (i < bays) {
      const y2 = cy + ((base - cy) / bays) * (i + 1);
      const w2 = half(y2);
      d += ` M${r(cx - w)} ${r(y)} L${r(cx + w2)} ${r(y2)} M${r(cx + w)} ${r(y)} L${r(cx - w2)} ${r(y2)}`; // X bracing
    }
  }
  d += ` M${cx} ${cy} V${cy - 46}`; // top spike
  body += `<path class="abp-sm-mast" d="${d}"/>`;
  // Sector antennas: tall rectangular panels on stand-off brackets near the top.
  // Lines stop at each shape's edge (the shapes are not opaque, so nothing may run through them).
  const sectors: Array<[number, number]> = [[-1, 304], [1, 304]];
  sectors.forEach(([side, y]) => {
    const px = cx + side * (half(y) + 18);
    const edge = r(px - side * 4.5);
    body += `<path class="abp-sm-mast" d="M${r(cx + side * half(y - 15))} ${y - 15} H${edge} M${r(cx + side * half(y + 15))} ${y + 15} H${edge}"/>`;
    body += `<rect class="abp-sm-mast abp-sm-panel" x="${r(px - 4.5)}" y="${y - 28}" width="9" height="56" rx="3"/>`;
  });
  // Microwave dishes, seen side-on: bowl, mount arm and feed.
  const dishes: Array<[number, number, number]> = [[1, 420, 20], [-1, 500, 16], [1, 590, 13]];
  dishes.forEach(([side, y, rad]) => {
    const X = cx + side * (half(y) + rad + 12); // the bowl's rim (straight chord)
    const feed = X + side * rad * 0.55;
    body += `<path class="abp-sm-mast" d="M${r(cx + side * half(y))} ${y} H${r(X - side * rad * 0.5)} M${r(X)} ${y} H${r(feed - side * 2.2)}"/>`;
    body += `<path class="abp-sm-mast abp-sm-dish" d="M${r(X)} ${y - rad} Q${r(X - side * rad)} ${y} ${r(X)} ${y + rad} Z"/>`;
    body += `<circle class="abp-sm-mast abp-sm-feed" cx="${r(feed)}" cy="${y}" r="2.2"/>`;
  });
  body += `<circle class="abp-sm-dot" cx="${cx}" cy="${cy - 46}" r="5"/>`;
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
 * `accent` (hex) becomes the layer's first custom colour. `lineColor` (hex), when given,
 * becomes the second = the neutral lines; omitted → one colour → near-white default lines.
 * Both stay editable in the layer's "Custom Colors".
 */
export function createLineArtPresetLayer(
  id: LineArtPresetId,
  opts: { layerId?: string; accent?: string; lineColor?: string } = {}
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
    colors: opts.lineColor
      ? [opts.accent || DEFAULT_FALLBACK_COLORS[0], opts.lineColor]
      : [opts.accent || DEFAULT_FALLBACK_COLORS[0]],
    config,
  };
}

/** True for a layer whose SVG reads the configurable neutral line colour (the presets above). */
export function layerUsesLineColor(layer: Pick<AnimBgLayer, "type" | "config">): boolean {
  if (layer.type !== "svg-animation") return false;
  const code = (layer.config as Partial<SVGAnimationConfig> | undefined)?.svgCode;
  return typeof code === "string" && code.includes("--anim-bg-color-2");
}

/** The layer's current neutral line colour (its second custom colour, else the default). */
export function getLineArtLineColor(layer: Pick<AnimBgLayer, "colors">): string {
  return layer.colors?.[1] || LINE_ART_LINE_LIGHT;
}

/** New layer with the neutral line colour set (second custom colour). Never mutates. */
export function withLineArtLineColor(layer: AnimBgLayer, lineColor: string): AnimBgLayer {
  const accent = layer.colors?.[0] || DEFAULT_FALLBACK_COLORS[0];
  return { ...layer, useColorPalette: false, colors: [accent, lineColor, ...(layer.colors || []).slice(2)] };
}
