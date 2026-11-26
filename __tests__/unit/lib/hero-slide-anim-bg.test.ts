import { describe, it, expect } from "vitest";
import { resolveSlideAnimBg } from "@/lib/hero/hero-anim-bg";
import { DEFAULT_ANIM_BG_CONFIG } from "@/lib/anim-bg/defaults";
import {
  LINE_ART_PRESETS,
  createLineArtPresetLayer,
  lineArtPresetSvg,
  LINE_ART_LINE_LIGHT,
  LINE_ART_LINE_DARK,
  layerUsesLineColor,
  getLineArtLineColor,
  withLineArtLineColor,
} from "@/lib/anim-bg/presets";
import type { AnimBgConfig, SVGAnimationConfig } from "@/lib/anim-bg/types";

const enabledConfig = (): AnimBgConfig => ({
  ...DEFAULT_ANIM_BG_CONFIG,
  enabled: true,
  layers: [createLineArtPresetLayer("fibre-strands", { layerId: "l1" })],
});

describe("resolveSlideAnimBg — existing slides are untouched", () => {
  it("returns null for a slide with no animBg (active or not)", () => {
    const slide = { id: "s1", type: "image" as const, src: "/a.jpg" };
    const before = JSON.stringify(slide);
    expect(resolveSlideAnimBg(slide, true)).toBeNull();
    expect(resolveSlideAnimBg(slide, false)).toBeNull();
    expect(JSON.stringify(slide)).toBe(before); // never mutated / defaulted
    expect("animBg" in slide).toBe(false);
  });

  it("returns null for null/undefined slides and null animBg", () => {
    expect(resolveSlideAnimBg(undefined, true)).toBeNull();
    expect(resolveSlideAnimBg(null, true)).toBeNull();
    expect(resolveSlideAnimBg({ animBg: null }, true)).toBeNull();
  });

  it("returns null when animBg is disabled, even with layers", () => {
    expect(resolveSlideAnimBg({ animBg: { ...enabledConfig(), enabled: false } }, true)).toBeNull();
    expect(resolveSlideAnimBg({ animBg: DEFAULT_ANIM_BG_CONFIG }, true)).toBeNull();
  });

  it("returns null when enabled but there is no enabled layer", () => {
    expect(resolveSlideAnimBg({ animBg: { ...enabledConfig(), layers: [] } }, true)).toBeNull();
    const off = enabledConfig();
    const allOff = { ...off, layers: off.layers.map((l) => ({ ...l, enabled: false })) };
    expect(resolveSlideAnimBg({ animBg: allOff }, true)).toBeNull();
    // malformed stored data must not throw
    expect(resolveSlideAnimBg({ animBg: { enabled: true } as unknown as AnimBgConfig }, true)).toBeNull();
  });

  it("only the ACTIVE slide resolves a config, and by reference (no re-mount churn)", () => {
    const cfg = enabledConfig();
    expect(resolveSlideAnimBg({ animBg: cfg }, false)).toBeNull();
    expect(resolveSlideAnimBg({ animBg: cfg }, true)).toBe(cfg);
  });
});

describe("line-art presets", () => {
  it("offers exactly the five presets with unique ids", () => {
    const ids = LINE_ART_PRESETS.map((p) => p.id);
    expect(ids).toEqual(["fibre-strands", "community-links", "town-network", "signal-rings", "voice-waveform"]);
    expect(new Set(ids).size).toBe(5);
    for (const p of LINE_ART_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.desc.length).toBeGreaterThan(0);
    }
  });

  it.each(LINE_ART_PRESETS.map((p) => p.id))("%s resolves to a valid svg-animation layer", (id) => {
    const layer = createLineArtPresetLayer(id, { layerId: "x", accent: "#ff0000" });
    expect(layer.id).toBe("x");
    expect(layer.type).toBe("svg-animation");
    expect(layer.enabled).toBe(true);
    expect(layer.opacity).toBeGreaterThan(0);
    expect(layer.opacity).toBeLessThanOrEqual(100);
    expect(layer.blendMode).toBe("normal");
    expect(layer.useColorPalette).toBe(false);
    expect(layer.colors).toEqual(["#ff0000"]);

    const c = layer.config as SVGAnimationConfig;
    expect(c.animation).toBe("none");
    expect(c.colorize).toBe(true);
    expect(c.scale).toBe(100);
    expect(c.posX).toBe(50);
    expect(c.posY).toBe(50);
    expect(c.svgCode).toBe(lineArtPresetSvg(id)); // deterministic

    // usable inside an enabled config on a slide
    const cfg: AnimBgConfig = { ...DEFAULT_ANIM_BG_CONFIG, enabled: true, layers: [layer] };
    expect(resolveSlideAnimBg({ animBg: cfg }, true)).toBe(cfg);
  });

  it.each(LINE_ART_PRESETS.map((p) => p.id))("%s SVG is well-formed, scoped, subtle and motion-safe", (id) => {
    const svg = lineArtPresetSvg(id);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith("</svg></svg>")).toBe(true);
    // root has no viewBox (the animator forces "meet" on it); the nested svg covers the box
    expect(svg.match(/viewBox=/g)?.length).toBe(1);
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
    // XML-safe + no script / handlers / external refs
    expect(svg).not.toMatch(/&|<script|\son\w+=|href=|url\(/i);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    // every opening element is closed
    const opens = (svg.match(/<(?!\/)[a-z]+[^>]*[^/]>/g) || []).length;
    const closes = (svg.match(/<\/[a-z]+>/g) || []).length;
    expect(opens).toBe(closes);
    // accent is configurable (currentColor ← layer colour), CSS is namespaced
    expect(svg).toContain("currentColor");
    const classes = [...svg.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(" "));
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.every((c) => c.startsWith("abp-"))).toBe(true);
    const keyframes = [...svg.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
    expect(keyframes.length).toBeGreaterThan(0);
    expect(keyframes.every((k) => k.startsWith("abp-"))).toBe(true);
    // reduced motion stops the art
    expect(svg).toMatch(/@media \(prefers-reduced-motion: reduce\)\{[^}]*animation:none/);
    // thin lines, low opacity, slow loops
    for (const m of svg.matchAll(/stroke-width:([\d.]+)/g)) expect(Number(m[1])).toBeLessThanOrEqual(1.5);
    for (const m of svg.matchAll(/opacity:([\d.]+)/g)) expect(Number(m[1])).toBeLessThanOrEqual(0.8);
    for (const m of svg.matchAll(/animation:[\w-]+ ([\d.]+)s [\w-]+ infinite/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(6);
      expect(Number(m[1])).toBeLessThanOrEqual(10);
    }
    for (const m of svg.matchAll(/animation-duration:([\d.]+)s/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(6);
      expect(Number(m[1])).toBeLessThanOrEqual(10);
    }
  });

  it("falls back to a default accent and a generated id", () => {
    const a = createLineArtPresetLayer("signal-rings");
    expect(a.colors).toHaveLength(1);
    expect(a.colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(a.id).toContain("signal-rings");
  });
});

describe("line-art presets — configurable neutral line colour", () => {
  const ids = LINE_ART_PRESETS.map((p) => p.id);

  it.each(ids)("%s keeps the original near-white look by default (one colour, CSS fallback)", (id) => {
    const layer = createLineArtPresetLayer(id, { layerId: "x" });
    expect(layer.colors).toHaveLength(1);
    expect(getLineArtLineColor(layer)).toBe(LINE_ART_LINE_LIGHT);
    const svg = lineArtPresetSvg(id);
    // the default is only ever the var() fallback — never a hard-coded stroke/fill
    expect(svg.split(LINE_ART_LINE_LIGHT).length - 1).toBe(svg.split(`var(--anim-bg-color-2,${LINE_ART_LINE_LIGHT})`).length - 1);
    // pausable when the hero/section is off-screen
    expect(svg).toContain("[data-anim-paused] *{animation-play-state:paused!important}");
  });

  it.each(ids)("%s never interpolates the chosen line colour into the markup", (id) => {
    const hostile = `#000"/><script>alert(1)</script>`;
    const layer = createLineArtPresetLayer(id, { layerId: "x", accent: "#ff0000", lineColor: hostile });
    const svg = (layer.config as SVGAnimationConfig).svgCode;
    expect(svg).toBe(lineArtPresetSvg(id)); // markup is colour-independent
    expect(svg).not.toContain("script");
    expect(svg).not.toContain(LINE_ART_LINE_DARK);
    expect(layer.colors).toEqual(["#ff0000", hostile]); // travels as data; the animator's safeColor sanitises it
  });

  it("uses the neutral line colour in every preset except the accent-only waveform", () => {
    for (const id of ids) {
      const layer = createLineArtPresetLayer(id);
      expect(layerUsesLineColor(layer)).toBe(id !== "voice-waveform");
    }
  });

  it("createLineArtPresetLayer({ lineColor }) stores it as the second colour", () => {
    const layer = createLineArtPresetLayer("town-network", { accent: "#e11d48", lineColor: LINE_ART_LINE_DARK });
    expect(layer.colors).toEqual(["#e11d48", LINE_ART_LINE_DARK]);
    expect(layer.useColorPalette).toBe(false);
    expect(getLineArtLineColor(layer)).toBe(LINE_ART_LINE_DARK);
  });

  it("withLineArtLineColor sets/replaces the second colour without mutating", () => {
    const base = createLineArtPresetLayer("fibre-strands", { layerId: "x", accent: "#123456" });
    const frozen = JSON.stringify(base);
    const dark = withLineArtLineColor(base, LINE_ART_LINE_DARK);
    expect(JSON.stringify(base)).toBe(frozen);
    expect(dark).not.toBe(base);
    expect(dark.colors).toEqual(["#123456", LINE_ART_LINE_DARK]);
    expect(dark.config).toBe(base.config);
    const back = withLineArtLineColor({ ...dark, colors: [...dark.colors, "#abcdef"], useColorPalette: true }, LINE_ART_LINE_LIGHT);
    expect(back.colors).toEqual(["#123456", LINE_ART_LINE_LIGHT, "#abcdef"]);
    expect(back.useColorPalette).toBe(false);
    // no accent stored → a valid default accent is supplied
    expect(withLineArtLineColor({ ...base, colors: [] }, LINE_ART_LINE_DARK).colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("layerUsesLineColor is false for other layers and malformed configs", () => {
    expect(layerUsesLineColor({ type: "waves", config: {} as never })).toBe(false);
    expect(layerUsesLineColor({ type: "svg-animation", config: { svgCode: "<svg/>" } as never })).toBe(false);
    expect(layerUsesLineColor({ type: "svg-animation", config: undefined as never })).toBe(false);
  });

  it("the two selectable line colours are plain, distinct hex values", () => {
    expect(LINE_ART_LINE_LIGHT).toMatch(/^#[0-9a-f]{6}$/);
    expect(LINE_ART_LINE_DARK).toMatch(/^#[0-9a-f]{6}$/);
    expect(LINE_ART_LINE_LIGHT).not.toBe(LINE_ART_LINE_DARK);
  });
});
