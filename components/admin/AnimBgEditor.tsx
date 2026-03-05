"use client";

import { useState } from "react";
import type { AnimBgConfig, AnimBgLayer, AnimBgType, BlendMode, SequenceEntry } from "@/lib/anim-bg/types";
import { DEFAULT_CONFIGS, DEFAULT_ANIM_BG_CONFIG } from "@/lib/anim-bg/defaults";
import AnimBgCustomCodeEditor from "./AnimBgCustomCodeEditor";
import MediaPickerModal from "./MediaPickerModal";
import MediaUploadModal from "./MediaUploadModal";

interface AnimBgEditorProps {
  config: AnimBgConfig;
  onChange: (c: AnimBgConfig) => void;
  colorPalette?: string[];
  /** Section background value (hex, preset name, or "gradient") for blend mode compatibility hints */
  sectionBackground?: string;
}

const BLEND_MODES: BlendMode[] = ["normal", "multiply", "screen", "overlay", "soft-light"];

// ─── Background/blend compatibility helpers ───────────────────────────────────

type BgLuminance = "light" | "dark" | "mid" | "gradient" | "unknown";
type CompatLevel = "ok" | "warn" | "bad";

function parseBgLuminance(bg?: string): BgLuminance {
  if (!bg) return "unknown";
  const presets: Record<string, BgLuminance> = {
    white: "light", gray: "light", lightblue: "light",
    blue: "mid", midnight: "dark", teal: "dark", purple: "dark",
    transparent: "unknown", gradient: "gradient",
  };
  if (presets[bg]) return presets[bg];
  if (bg.includes("gradient")) return "gradient";
  if (bg.startsWith("#") && bg.length >= 7) {
    const h = bg.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const lin = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    if (lum > 0.5) return "light";
    if (lum < 0.15) return "dark";
    return "mid";
  }
  return "unknown";
}

function blendCompat(mode: BlendMode, bgLum: BgLuminance): CompatLevel {
  if (mode === "normal" || mode === "overlay" || mode === "soft-light") return "ok";
  if (bgLum === "unknown" || bgLum === "gradient" || bgLum === "mid") return "warn";
  if (mode === "screen") return bgLum === "dark" ? "ok" : "bad";   // screen: only works on dark
  if (mode === "multiply") return bgLum === "light" ? "ok" : "bad"; // multiply: only works on light
  return "ok";
}

const COMPAT_EMOJI: Record<CompatLevel, string> = { ok: "✅", warn: "⚠️", bad: "❌" };
const COMPAT_LABEL: Record<CompatLevel, string> = { ok: "", warn: " (may fade)", bad: " (invisible — not compatible)" };

const TYPE_LABELS: Record<AnimBgType, { label: string; icon: string; desc: string }> = {
  "floating-shapes": { label: "Floating Shapes",  icon: "bi-circles",    desc: "Drifting blobs, circles, squares" },
  "moving-gradient": { label: "Moving Gradient",  icon: "bi-palette",    desc: "Panning colour gradient" },
  "particle-field":  { label: "Particle Field",   icon: "bi-stars",      desc: "Drifting particles with optional lines" },
  waves:             { label: "Waves",             icon: "bi-water",      desc: "Layered animated wave strips" },
  "parallax-drift":  { label: "Parallax Drift",   icon: "bi-arrows-move",desc: "Shapes that drift on scroll" },
  "3d-tilt":         { label: "3D Tilt",          icon: "bi-box",        desc: "Mouse/auto perspective warp" },
  "custom-code":     { label: "Custom Code",      icon: "bi-code-slash", desc: "Your own Anime.js code" },
  "3d-scene":        { label: "3D Scene",         icon: "bi-badge-3d",   desc: "Three.js WebGL model" },
  "svg-animation":   { label: "SVG Animation",    icon: "bi-filetype-svg", desc: "Custom SVG with built-in or native animations" },
  "text-effects":    { label: "Text Effects",     icon: "bi-type",         desc: "Animated text — typewriter, scramble, glitch, clip fill, intro reveal" },
};

// ─── Per-type field schema ────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: "slider" | "select" | "toggle" | "colorPicker" | "imageUpload" | "shapes" | "textarea" | "text" | "monacoEditor" | "sequenceEditor";
  min?: number; max?: number; step?: number; unit?: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
  showWhen?: { key: string; value?: unknown; notValue?: unknown };
  /** Displayed when value is undefined (old saved configs that pre-date a field being added) */
  defaultValue?: number | string | boolean;
  rows?: number;
  language?: string;
}

const ANIM_BG_SCHEMAS: Record<AnimBgType, FieldDef[]> = {
  "floating-shapes": [
    { key: "count",      label: "Shape Count",  type: "slider", min: 2,  max: 20,  unit: "",   hint: "More shapes = richer but heavier" },
    { key: "sizeMin",    label: "Min Size",     type: "slider", min: 10, max: 200, unit: "px" },
    { key: "sizeMax",    label: "Max Size",     type: "slider", min: 10, max: 300, unit: "px" },
    { key: "speedMin",   label: "Min Speed",    type: "slider", min: 2,  max: 30,  unit: "s",  hint: "Seconds per animation cycle" },
    { key: "speedMax",   label: "Max Speed",    type: "slider", min: 2,  max: 60,  unit: "s" },
    { key: "blur",       label: "Blur",         type: "slider", min: 0,  max: 40,  unit: "px", hint: "Softens shapes" },
    { key: "opacityMin", label: "Min Opacity",  type: "slider", min: 0,  max: 100, unit: "%" },
    { key: "opacityMax", label: "Max Opacity",  type: "slider", min: 0,  max: 100, unit: "%" },
    { key: "shapes",     label: "Shape Types",  type: "shapes" },
  ],
  "moving-gradient": [
    { key: "direction", label: "Direction",    type: "select", options: [{ value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertical" }, { value: "diagonal", label: "Diagonal" }, { value: "radial", label: "Radial" }] },
    { key: "speed",     label: "Speed",        type: "slider", min: 3,   max: 30,  unit: "s",  hint: "Higher = slower" },
    { key: "scale",     label: "Canvas Scale", type: "slider", min: 150, max: 300, unit: "%" },
  ],
  "particle-field": [
    { key: "count",              label: "Particle Count",   type: "slider", min: 5,   max: 80,  unit: "" },
    { key: "sizeMin",            label: "Min Size",         type: "slider", min: 1,   max: 8,   unit: "px" },
    { key: "sizeMax",            label: "Max Size",         type: "slider", min: 2,   max: 12,  unit: "px" },
    { key: "speed",              label: "Drift Speed",      type: "slider", min: 0.1, max: 3,   unit: "",   step: 0.1 },
    { key: "connectLines",       label: "Connect Lines",    type: "toggle", hint: "Draw lines between nearby particles" },
    { key: "connectionDistance", label: "Line Distance",    type: "slider", min: 50,  max: 200, unit: "px", showWhen: { key: "connectLines", value: true } },
  ],
  waves: [
    { key: "waveCount", label: "Wave Layers", type: "slider", min: 2, max: 5,   unit: "" },
    { key: "amplitude", label: "Wave Height", type: "slider", min: 10, max: 120, unit: "px" },
    { key: "speed",     label: "Speed",       type: "slider", min: 3, max: 20,  unit: "s" },
    { key: "direction", label: "Direction",   type: "select", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] },
  ],
  "parallax-drift": [
    { key: "factor",     label: "Parallax Factor", type: "slider", min: 0.05, max: 0.5, unit: "", step: 0.05, hint: "0.1 = subtle, 0.5 = strong" },
    { key: "direction",  label: "Direction",       type: "select", options: [{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }, { value: "both", label: "Both" }] },
    { key: "shapeCount", label: "Shape Count",     type: "slider", min: 2, max: 10,  unit: "" },
    { key: "shapeSize",  label: "Shape Size",      type: "slider", min: 50, max: 400, unit: "px" },
    { key: "blur",       label: "Blur",            type: "slider", min: 0, max: 40,  unit: "px" },
  ],
  "3d-tilt": [
    { key: "mode",        label: "Mode",        type: "select", options: [{ value: "mouse", label: "Mouse-driven" }, { value: "auto", label: "Auto-loop" }, { value: "both", label: "Both" }], hint: "Mouse: tilts on hover. Auto: continuous loop." },
    { key: "intensity",   label: "Intensity",   type: "slider", min: 1, max: 15, unit: "°" },
    { key: "speed",       label: "Auto Speed",  type: "slider", min: 2, max: 20, unit: "s", showWhen: { key: "mode", value: "auto" } },
    { key: "perspective", label: "Perspective", type: "slider", min: 800, max: 2000, unit: "px", hint: "Higher = flatter" },
  ],
  "custom-code": [],  // rendered specially below
  "3d-scene": [
    { key: "modelUrl",       label: "3D Model",        type: "imageUpload", hint: "Upload a .glb or .gltf file" },
    { key: "autoRotate",     label: "Auto-rotate",     type: "toggle" },
    { key: "rotationSpeed",  label: "Rotation Speed",  type: "slider", min: 0.1, max: 5, unit: "", step: 0.1, showWhen: { key: "autoRotate", value: true } },
    { key: "cameraDistance", label: "Camera Distance", type: "slider", min: 1, max: 20, unit: "" },
    { key: "lightColor",     label: "Light Color",     type: "colorPicker" },
    { key: "lightIntensity", label: "Light Intensity", type: "slider", min: 0, max: 5, unit: "", step: 0.1 },
    { key: "envOpacity",     label: "Canvas Opacity",  type: "slider", min: 0, max: 100, unit: "%" },
  ],
  "svg-animation": [
    { key: "svgCode",    label: "SVG Code",           type: "textarea", rows: 8,
      hint: "Paste raw SVG markup. Use <animate> / <animateTransform> for native animations." },
    { key: "animation",  label: "Animation Type", type: "select", options: [
        { value: "float",    label: "Float — gentle up/down drift" },
        { value: "pulse",    label: "Pulse — rhythmic scale + opacity breathe" },
        { value: "spin",     label: "Spin — continuous rotation" },
        { value: "draw-on",  label: "Draw On — stroke path reveal" },
        { value: "morph",    label: "Morph — subtle skew warp" },
        { value: "none",     label: "None — use only SVG-native animations" },
      ],
      hint: "The Anime.js effect applied on top of the SVG's own <animate> tags" },
    { key: "speed",    label: "Animation Speed",   type: "slider", min: 0.5, max: 20,  step: 0.5, unit: "s", hint: "Seconds per animation cycle" },
    { key: "scale",    label: "Size (% container)", type: "slider", min: 10,  max: 150, unit: "%", hint: "SVG size relative to the section's shortest side" },
    { key: "posX",     label: "Position X",         type: "slider", min: 0,   max: 100, unit: "%", hint: "Horizontal centre (0 = left, 100 = right)" },
    { key: "posY",     label: "Position Y",         type: "slider", min: 0,   max: 100, unit: "%", hint: "Vertical centre (0 = top, 100 = bottom)" },
    { key: "colorize", label: "Tint with palette",  type: "toggle",  hint: "Apply the layer colour palette to SVG strokes and fills" },
    { key: "loop",     label: "Loop",               type: "toggle",  hint: "Loop the Anime.js animation continuously" },
  ],
  "text-effects": [
    // ── Mode (critical toggle — shown first) ───────────────────────────────
    { key: "mode", label: "Mode", type: "select", options: [
        { value: "background", label: "Background — ambient layer behind content, loops" },
        { value: "intro",      label: "Intro — plays once over content then exits to reveal" },
      ],
      hint: "Background: decorative layer behind your section. Intro: plays as a full-screen reveal then steps aside." },
    // ── Content & typography ───────────────────────────────────────────────
    { key: "text", label: "Text", type: "textarea", rows: 3,
      hint: "One line per row — separate rows with Enter. Each row animates independently." },
    { key: "lineSpacing", label: "Line Spacing", type: "slider", min: 1, max: 40, unit: "vw", step: 0.5,
      hint: "Vertical gap between rows in vw units. Only visible with multi-line text." },
    { key: "fontSize",     label: "Font Size",     type: "slider", min: 2,   max: 30,  unit: "vw", step: 0.5, hint: "Size relative to viewport width — 10vw ≈ full-width for ~5 chars" },
    { key: "fontWeight",   label: "Font Weight",   type: "select", options: [
        { value: "400", label: "Regular (400)" },
        { value: "700", label: "Bold (700)" },
        { value: "900", label: "Black (900)" },
      ] },
    { key: "letterSpacing", label: "Letter Spacing", type: "slider", min: -0.1, max: 0.5, unit: "em", step: 0.01 },
    { key: "posX", label: "Position X", type: "slider", min: 0, max: 100, unit: "%", hint: "Horizontal centre of the text" },
    { key: "posY", label: "Position Y", type: "slider", min: 0, max: 100, unit: "%", hint: "Vertical centre of the text" },
    // ── Animation type ─────────────────────────────────────────────────────
    { key: "animation", label: "Animation", type: "select", options: [
        { value: "typewriter",   label: "Typewriter — characters appear one by one with cursor" },
        { value: "scramble",     label: "Scramble — chars randomise then resolve to final text" },
        { value: "glitch",       label: "Glitch — distortion burst with random substitution" },
        { value: "cascade",      label: "Cascade — characters fly in from a direction" },
        { value: "wave",         label: "Wave — characters ripple in a sine wave" },
        { value: "reveal",       label: "Reveal — text wipes in like a curtain" },
        { value: "blur-in",      label: "Blur In — text sharpens from blur with opacity" },
        { value: "word-by-word", label: "Word by Word — each word appears sequentially" },
        { value: "sequence",     label: "Sequence — chain text/images/videos with mixed effects" },
        { value: "custom-code",  label: "Custom Code — write your own animation" },
      ] },
    { key: "direction", label: "Direction", type: "select", options: [
        { value: "left",   label: "Left → right (default)" },
        { value: "right",  label: "Right → left" },
        { value: "up",     label: "Up → down" },
        { value: "down",   label: "Down → up" },
        { value: "center", label: "Centre outward" },
        { value: "random", label: "Random" },
      ],
      hint: "Travel direction for cascade, wave, reveal, typewriter",
      showWhen: { key: "animation", notValue: "custom-code" } },
    // ── Speed & timing ─────────────────────────────────────────────────────
    { key: "speed",       label: "Speed",          type: "slider", min: 0.2, max: 4, step: 0.1, unit: "×", hint: "1 = normal, 2 = twice as fast" },
    { key: "stagger",     label: "Char Stagger",   type: "slider", min: 10, max: 200, unit: "ms", hint: "Delay between each character animating in" },
    { key: "loop",        label: "Loop",           type: "toggle", hint: "Repeat the animation continuously (background mode only)" },
    { key: "loopDelay",   label: "Loop Delay",     type: "slider", min: 0, max: 5000, unit: "ms", hint: "Pause between loops", showWhen: { key: "loop", value: true } },
    // ── Intro mode options ─────────────────────────────────────────────────
    { key: "holdDuration", label: "Hold Duration", type: "slider", min: 0, max: 6000, unit: "ms",
      hint: "How long the text stays visible at full opacity before the exit starts",
      showWhen: { key: "mode", value: "intro" } },
    { key: "exitEffect", label: "Exit Effect", type: "select", options: [
        { value: "fade",    label: "Fade — smooth opacity fade out" },
        { value: "wipe",    label: "Wipe — horizontal curtain wipe" },
        { value: "glitch",  label: "Glitch — flicker and snap away" },
        { value: "instant", label: "Instant — remove immediately" },
      ],
      hint: "How the text exits to reveal the section content",
      showWhen: { key: "mode", value: "intro" } },
    { key: "introBgColor", label: "Intro Background", type: "colorPicker",
      hint: "Opaque colour covering section content during the intro animation",
      showWhen: { key: "mode", value: "intro" } },
    // ── Fill / colour ──────────────────────────────────────────────────────
    { key: "fillType", label: "Fill Type", type: "select", options: [
        { value: "solid",      label: "Solid colour" },
        { value: "gradient",   label: "Gradient" },
        { value: "image-clip", label: "Image clip — image plays inside letterforms" },
        { value: "video-clip", label: "Video clip — video plays inside letterforms" },
      ] },
    { key: "fillColor",    label: "Colour Override",  type: "colorPicker", hint: "Override for solid fill. Leave #000000 or blank to use layer palette.",
      showWhen: { key: "fillType", value: "solid" } },
    { key: "fillGradient", label: "Gradient",          type: "text",    hint: "CSS gradient string, e.g. linear-gradient(135deg, #f00, #00f)",
      showWhen: { key: "fillType", value: "gradient" } },
    { key: "fillMediaUrl", label: "Image / Video URL", type: "imageUpload",
      hint: "URL of the image or video to clip inside the letterforms",
      showWhen: { key: "fillType", notValue: "solid" } },
    // ── Sequence entries ────────────────────────────────────────────────────
    { key: "sequenceEntries", label: "Sequence", type: "sequenceEditor",
      hint: "Text, image, and video entries that play one after another",
      showWhen: { key: "animation", value: "sequence" } },
    // ── Custom code ────────────────────────────────────────────────────────
    { key: "customCode", label: "Custom Animation Code", type: "monacoEditor", language: "javascript", rows: 14,
      hint: "Available: container, colors, config. Must return { pause, resume, destroy }.",
      showWhen: { key: "animation", value: "custom-code" } },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId() {
  return `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function newLayer(type: AnimBgType): AnimBgLayer {
  return {
    id: genId(),
    type,
    enabled: true,
    opacity: 80,
    blendMode: "normal",
    useColorPalette: true,
    colors: ["#4ecdc4", "#6a82fb", "#fc466b"],
    config: { ...DEFAULT_CONFIGS[type] } as any,
  };
}

// ─── Sequence Editor ─────────────────────────────────────────────────────────

const SEQ_ANIM_OPTIONS = [
  { value: "typewriter",   label: "Typewriter" },
  { value: "scramble",     label: "Scramble" },
  { value: "glitch",       label: "Glitch" },
  { value: "cascade",      label: "Cascade" },
  { value: "wave",         label: "Wave" },
  { value: "reveal",       label: "Reveal" },
  { value: "blur-in",      label: "Blur In" },
  { value: "word-by-word", label: "Word by Word" },
  { value: "none",         label: "None (instant appear)" },
];

const SEQ_EXIT_OPTIONS = [
  { value: "fade",    label: "Fade" },
  { value: "wipe",    label: "Wipe" },
  { value: "glitch",  label: "Glitch" },
  { value: "instant", label: "Instant" },
];

function SequenceEditor({
  entries,
  onChange,
}: {
  entries: SequenceEntry[];
  onChange: (entries: SequenceEntry[]) => void;
}) {
  const addEntry = (type: "text" | "image" | "video") => {
    const entry: SequenceEntry = {
      id: `seq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      text: type === "text" ? "YOUR COMPANY" : "",
      animationType: "typewriter",
      mediaUrl: "",
      holdMs: 1000,
      exitEffect: "fade",
    };
    onChange([...entries, entry]);
  };

  const updateEntry = (id: string, patch: Partial<SequenceEntry>) => {
    onChange(entries.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  const moveEntry = (id: string, dir: -1 | 1) => {
    const idx = entries.findIndex(e => e.id === id);
    if (idx < 0) return;
    const next = [...entries];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  };

  return (
    <div>
      {entries.length === 0 && (
        <div
          className="text-center py-3 border rounded text-muted mb-2"
          style={{ borderStyle: "dashed", fontSize: "0.78rem" }}
        >
          <i className="bi bi-collection-play d-block mb-1 fs-5 opacity-40" />
          No entries yet — add text, images, or videos below.
        </div>
      )}

      {entries.map((entry, idx) => (
        <div key={entry.id} className="border rounded p-2 mb-2" style={{ background: "#f9f9fb", fontSize: "0.78rem" }}>
          {/* Entry header */}
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="d-flex flex-column" style={{ lineHeight: 1 }}>
              <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                disabled={idx === 0} onClick={() => moveEntry(entry.id, -1)}>
                <i className="bi bi-chevron-up" style={{ fontSize: "0.65rem" }} />
              </button>
              <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                disabled={idx === entries.length - 1} onClick={() => moveEntry(entry.id, 1)}>
                <i className="bi bi-chevron-down" style={{ fontSize: "0.65rem" }} />
              </button>
            </div>

            <select
              className="form-select form-select-sm"
              value={entry.type}
              style={{ width: "auto", fontSize: "0.75rem" }}
              onChange={(e) => updateEntry(entry.id, { type: e.target.value as "text" | "image" | "video" })}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>

            <span className="text-muted ms-auto" style={{ fontSize: "0.7rem" }}>#{idx + 1}</span>

            <button type="button" className="btn btn-outline-danger btn-sm p-1"
              onClick={() => removeEntry(entry.id)}>
              <i className="bi bi-x" />
            </button>
          </div>

          {/* Content fields */}
          {entry.type === "text" ? (
            <div className="row g-2 mb-2">
              <div className="col-7">
                <input type="text" className="form-control form-control-sm"
                  placeholder='Text to display (use \n for new line)...'
                  value={entry.text}
                  onChange={(e) => updateEntry(entry.id, { text: e.target.value })}
                  style={{ fontSize: "0.75rem" }}
                />
              </div>
              <div className="col-5">
                <select className="form-select form-select-sm" value={entry.animationType}
                  style={{ fontSize: "0.75rem" }}
                  onChange={(e) => updateEntry(entry.id, { animationType: e.target.value })}>
                  {SEQ_ANIM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="mb-2">
              <input type="text" className="form-control form-control-sm"
                placeholder="/images/... or https://... URL"
                value={entry.mediaUrl}
                onChange={(e) => updateEntry(entry.id, { mediaUrl: e.target.value })}
                style={{ fontSize: "0.75rem" }}
              />
            </div>
          )}

          {/* Hold duration + exit effect */}
          <div className="row g-2 align-items-center">
            <div className="col-7">
              <label className="form-label mb-0" style={{ fontSize: "0.7rem" }}>
                Hold: <strong>{entry.holdMs}ms</strong>
              </label>
              <input type="range" className="form-range"
                min={100} max={5000} step={100} value={entry.holdMs}
                onChange={(e) => updateEntry(entry.id, { holdMs: Number(e.target.value) })}
              />
            </div>
            <div className="col-5">
              <label className="form-label mb-1" style={{ fontSize: "0.7rem" }}>Exit</label>
              <select className="form-select form-select-sm" value={entry.exitEffect}
                style={{ fontSize: "0.75rem" }}
                onChange={(e) => updateEntry(entry.id, { exitEffect: e.target.value as SequenceEntry["exitEffect"] })}>
                {SEQ_EXIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}

      {/* Add entry buttons */}
      <div className="d-flex gap-2 flex-wrap mt-1">
        <button type="button" className="btn btn-outline-primary btn-sm" style={{ fontSize: "0.75rem" }}
          onClick={() => addEntry("text")}>
          <i className="bi bi-type me-1" />Add Text
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" style={{ fontSize: "0.75rem" }}
          onClick={() => addEntry("image")}>
          <i className="bi bi-image me-1" />Add Image
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" style={{ fontSize: "0.75rem" }}
          onClick={() => addEntry("video")}>
          <i className="bi bi-camera-video me-1" />Add Video
        </button>
      </div>
    </div>
  );
}

// ─── Field renderer ──────────────────────────────────────────────────────────

function LayerField({
  fieldDef,
  value,
  allConfig,
  onChange,
}: {
  fieldDef: FieldDef;
  value: unknown;
  allConfig: Record<string, unknown>;
  onChange: (val: unknown) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  if (fieldDef.showWhen) {
    const sw = fieldDef.showWhen;
    const cur = allConfig[sw.key];
    if (sw.value    !== undefined && cur !== sw.value)    return null;
    if (sw.notValue !== undefined && cur === sw.notValue) return null;
  }

  // Use defaultValue when config field is undefined (e.g. old saved configs pre-dating this field)
  const strVal  = (value as string)  ?? (fieldDef.defaultValue as string  ?? "");
  const numVal  = (value as number)  ?? (fieldDef.defaultValue as number  ?? 0);
  const boolVal = value !== undefined ? !!(value) : !!(fieldDef.defaultValue);

  switch (fieldDef.type) {
    case "slider":
      return (
        <div className="d-flex align-items-center gap-2">
          <input type="range" className="form-range flex-grow-1"
            min={fieldDef.min ?? 0} max={fieldDef.max ?? 100} step={fieldDef.step ?? 1}
            value={numVal} onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="badge bg-secondary" style={{ minWidth: 42, fontSize: "0.7rem" }}>
            {numVal}{fieldDef.unit || ""}
          </span>
        </div>
      );

    case "select":
      return (
        <select className="form-select form-select-sm" value={strVal}
          onChange={(e) => onChange(e.target.value)}
        >
          {(fieldDef.options || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case "toggle":
      return (
        <div className="form-check form-switch mb-0">
          <input className="form-check-input" type="checkbox" checked={boolVal}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="form-check-label small">{boolVal ? "On" : "Off"}</label>
        </div>
      );

    case "colorPicker":
      return (
        <div className="input-group input-group-sm">
          <input type="color" className="form-control form-control-color form-control-sm"
            value={strVal || "#ffffff"} style={{ width: 40, padding: "2px" }}
            onChange={(e) => onChange(e.target.value)}
          />
          <input type="text" className="form-control form-control-sm font-monospace"
            value={strVal} placeholder="#ffffff"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "imageUpload":
      return (
        <>
          <div className="input-group input-group-sm">
            <input type="text" className="form-control form-control-sm"
              value={strVal} placeholder="/images/... or .glb URL"
              onChange={(e) => onChange(e.target.value)}
            />
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPicker(true)}>
              <i className="bi bi-folder2-open" />
            </button>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setShowUpload(true)}>
              <i className="bi bi-cloud-upload" />
            </button>
          </div>
          <MediaPickerModal isOpen={showPicker} onClose={() => setShowPicker(false)}
            onSelect={(url) => { onChange(url); setShowPicker(false); }} filterType="image" />
          <MediaUploadModal isOpen={showUpload} onClose={() => setShowUpload(false)}
            onUploadComplete={(url) => { onChange(url); setShowUpload(false); }} acceptedTypes="*/*" />
        </>
      );

    case "shapes":
      return <ShapesToggle value={value as string[]} onChange={onChange} />;

    case "textarea":
      return (
        <textarea
          className="form-control form-control-sm font-monospace"
          rows={fieldDef.rows ?? 6}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontSize: "0.72rem", resize: "vertical" }}
          spellCheck={false}
        />
      );

    case "text":
      return (
        <input
          type="text"
          className="form-control form-control-sm"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fieldDef.hint}
        />
      );

    case "monacoEditor":
      // Rendered as a full-width row — see table row special handling below
      return (
        <AnimBgCustomCodeEditor
          code={strVal}
          onChange={(code) => onChange(code)}
        />
      );

    case "sequenceEditor":
      return (
        <SequenceEditor
          entries={(value as SequenceEntry[]) || []}
          onChange={(entries) => onChange(entries)}
        />
      );

    default:
      return null;
  }
}

function ShapesToggle({ value, onChange }: { value: string[]; onChange: (v: unknown) => void }) {
  const ALL = ["circle", "blob", "square", "triangle"];
  const current = value || ALL;
  const toggle = (s: string) => {
    const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
    if (next.length > 0) onChange(next);
  };
  return (
    <div className="d-flex gap-2 flex-wrap">
      {ALL.map(s => (
        <button key={s} type="button"
          className={`btn btn-sm ${current.includes(s) ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => toggle(s)}
          style={{ fontSize: "0.75rem", padding: "2px 8px" }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

export default function AnimBgEditor({ config, onChange, colorPalette, sectionBackground }: AnimBgEditorProps) {
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const cfg = config || DEFAULT_ANIM_BG_CONFIG;
  const bgLum = parseBgLuminance(sectionBackground);

  const update = (patch: Partial<AnimBgConfig>) => onChange({ ...cfg, ...patch });

  const updateLayer = (id: string, patch: Partial<AnimBgLayer>) => {
    update({ layers: cfg.layers.map(l => l.id === id ? { ...l, ...patch } : l) });
  };

  const updateLayerConfig = (id: string, patch: Record<string, unknown>) => {
    update({
      layers: cfg.layers.map(l =>
        l.id === id ? { ...l, config: { ...l.config, ...patch } } : l
      ),
    });
  };

  const addLayer = (type: AnimBgType) => {
    if (cfg.layers.length >= 3) return;
    update({ layers: [...cfg.layers, newLayer(type)] });
    setShowAddMenu(false);
  };

  const removeLayer = (id: string) => {
    update({ layers: cfg.layers.filter(l => l.id !== id) });
    if (expandedLayer === id) setExpandedLayer(null);
  };

  const moveLayer = (id: string, dir: -1 | 1) => {
    const idx = cfg.layers.findIndex(l => l.id === id);
    if (idx < 0) return;
    const next = [...cfg.layers];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    update({ layers: next });
  };

  return (
    <div>
      {/* Enable toggle */}
      <div className="d-flex align-items-center gap-3 mb-4 p-3 border rounded">
        <div className="form-check form-switch mb-0 flex-grow-1">
          <input className="form-check-input" type="checkbox" id="animBgEnabled"
            checked={cfg.enabled} onChange={(e) => update({ enabled: e.target.checked })}
          />
          <label className="form-check-label fw-semibold" htmlFor="animBgEnabled">
            <i className="bi bi-stars me-2" />
            Enable Animated Background
          </label>
        </div>
        <small className="text-muted">Up to 3 layered animation presets</small>
      </div>

      {cfg.enabled && (
        <>
          {/* Background context note */}
          {bgLum !== "unknown" && (
            <div className="alert alert-secondary small py-2 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-circle-half" />
              <span>
                Section background detected as <strong>{bgLum}</strong>.{" "}
                {bgLum === "light" && "Use normal, multiply, overlay, or soft-light blend modes."}
                {bgLum === "dark"  && "Use normal, screen, overlay, or soft-light blend modes."}
                {bgLum === "mid"   && "Most blend modes work — test to confirm."}
                {bgLum === "gradient" && "Gradient backgrounds: normal, overlay, or soft-light are safest."}
              </span>
            </div>
          )}

          {/* Intensity overlay */}
          <div className="mb-4 p-3 border rounded bg-light">
            <h6 className="fw-semibold mb-3">
              <i className="bi bi-circle-half me-2" />
              Intensity Overlay
            </h6>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Overlay Color</label>
                <div className="input-group input-group-sm">
                  <input type="color" className="form-control form-control-color"
                    value={cfg.overlayColor || "#000000"} style={{ width: 40, padding: "2px" }}
                    onChange={(e) => update({ overlayColor: e.target.value })}
                  />
                  <input type="text" className="form-control font-monospace"
                    value={cfg.overlayColor || "#000000"}
                    onChange={(e) => update({ overlayColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-8">
                <label className="form-label small fw-semibold">Opacity: {cfg.overlayOpacity}%</label>
                <input type="range" className="form-range"
                  min={0} max={80} value={cfg.overlayOpacity}
                  onChange={(e) => update({ overlayOpacity: Number(e.target.value) })}
                />
                <small className="text-muted">Semi-transparent veil over all layers (0 = off, 60 = recommended)</small>
              </div>
            </div>
          </div>

          {/* Layer list */}
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-semibold mb-0">
                <i className="bi bi-stack me-2" />
                Animation Layers ({cfg.layers.length}/3)
              </h6>
              <div className="position-relative">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={cfg.layers.length >= 3}
                  onClick={() => setShowAddMenu(!showAddMenu)}
                >
                  <i className="bi bi-plus me-1" />
                  Add Layer
                </button>
                {showAddMenu && (
                  <div className="dropdown-menu show" style={{ position: "absolute", right: 0, top: "110%", zIndex: 200, minWidth: "220px" }}>
                    {(Object.entries(TYPE_LABELS) as [AnimBgType, typeof TYPE_LABELS[AnimBgType]][]).map(([t, info]) => (
                      <button key={t} className="dropdown-item d-flex align-items-center gap-2"
                        onClick={() => addLayer(t)}
                      >
                        <i className={`bi ${info.icon} text-primary`} style={{ width: 18 }} />
                        <div>
                          <div className="fw-semibold small">{info.label}</div>
                          <div className="text-muted" style={{ fontSize: "0.72rem" }}>{info.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {cfg.layers.length === 0 && (
              <div className="text-center py-4 border rounded text-muted" style={{ borderStyle: "dashed" }}>
                <i className="bi bi-layers d-block mb-2 fs-3 opacity-50" />
                No layers yet — click "Add Layer" to get started.
              </div>
            )}

            {/* Accordion */}
            <div className="accordion">
              {cfg.layers.map((layer, idx) => {
                const info = TYPE_LABELS[layer.type];
                const isOpen = expandedLayer === layer.id;
                const schema = ANIM_BG_SCHEMAS[layer.type];

                return (
                  <div key={layer.id} className="accordion-item mb-2 border rounded overflow-hidden">
                    <h2 className="accordion-header">
                      <div className="d-flex align-items-center px-3 py-2" style={{ background: isOpen ? "#f0f4ff" : "#fff" }}>
                        {/* Reorder */}
                        <div className="d-flex flex-column me-2">
                          <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                            disabled={idx === 0} onClick={() => moveLayer(layer.id, -1)}>
                            <i className="bi bi-chevron-up" style={{ fontSize: "0.7rem" }} />
                          </button>
                          <button type="button" className="btn btn-link btn-sm p-0 text-muted"
                            disabled={idx === cfg.layers.length - 1} onClick={() => moveLayer(layer.id, 1)}>
                            <i className="bi bi-chevron-down" style={{ fontSize: "0.7rem" }} />
                          </button>
                        </div>

                        {/* Enable toggle */}
                        <div className="form-check form-switch me-2 mb-0">
                          <input className="form-check-input" type="checkbox"
                            checked={layer.enabled}
                            onChange={(e) => updateLayer(layer.id, { enabled: e.target.checked })}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Expand */}
                        <button
                          type="button"
                          className={`flex-grow-1 text-start border-0 bg-transparent fw-semibold small d-flex align-items-center gap-2 ${!layer.enabled ? "text-muted opacity-50" : ""}`}
                          onClick={() => setExpandedLayer(isOpen ? null : layer.id)}
                        >
                          <i className={`bi ${info.icon} text-primary`} />
                          {info.label}
                          <span className="badge bg-light text-dark border fw-normal ms-1" style={{ fontSize: "0.68rem" }}>
                            {layer.opacity}%
                          </span>
                          <span className="badge bg-secondary bg-opacity-25 text-secondary fw-normal" style={{ fontSize: "0.68rem" }}>
                            {layer.blendMode}
                          </span>
                        </button>

                        {/* Delete */}
                        <button type="button" className="btn btn-outline-danger btn-sm"
                          onClick={() => removeLayer(layer.id)}>
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </h2>

                    {isOpen && (
                      <div className="accordion-body py-3 px-3">
                        {/* Layer-level controls */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Opacity: {layer.opacity}%</label>
                            <input type="range" className="form-range"
                              min={0} max={100} value={layer.opacity}
                              onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Blend Mode</label>
                            <select className="form-select form-select-sm"
                              value={layer.blendMode}
                              onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value as BlendMode })}
                            >
                              {BLEND_MODES.map(m => {
                                const compat = blendCompat(m, bgLum);
                                return (
                                  <option key={m} value={m} disabled={compat === "bad"}>
                                    {COMPAT_EMOJI[compat]} {m}{COMPAT_LABEL[compat]}
                                  </option>
                                );
                              })}
                            </select>
                            {blendCompat(layer.blendMode, bgLum) === "bad" && (
                              <div className="alert alert-danger small py-1 px-2 mt-2 mb-0">
                                <i className="bi bi-eye-slash me-1" />
                                <strong>{layer.blendMode}</strong> is invisible on this background — switch to <strong>normal</strong>.
                              </div>
                            )}
                            {blendCompat(layer.blendMode, bgLum) === "warn" && (
                              <div className="text-warning small mt-1">
                                <i className="bi bi-exclamation-triangle me-1" />
                                May fade on some backgrounds.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Color controls */}
                        <div className="mb-3 p-2 rounded" style={{ background: "#f8f9fa" }}>
                          <div className="form-check form-switch mb-2">
                            <input className="form-check-input" type="checkbox" id={`pal-${layer.id}`}
                              checked={layer.useColorPalette}
                              onChange={(e) => updateLayer(layer.id, { useColorPalette: e.target.checked })}
                            />
                            <label className="form-check-label small" htmlFor={`pal-${layer.id}`}>
                              Use Section Color Palette
                              {colorPalette?.length ? (
                                <span className="ms-2 d-inline-flex gap-1">
                                  {colorPalette.slice(0, 5).map((c, i) => (
                                    <span key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c, display: "inline-block" }} />
                                  ))}
                                </span>
                              ) : <span className="ms-1 text-muted">(no palette set)</span>}
                            </label>
                          </div>
                          {!layer.useColorPalette && (
                            <div>
                              <label className="form-label small fw-semibold">Custom Colors</label>
                              <div className="d-flex gap-2 flex-wrap">
                                {layer.colors.map((c, ci) => (
                                  <input key={ci} type="color" className="form-control form-control-color"
                                    value={c} style={{ width: 36, height: 32, padding: "2px" }}
                                    onChange={(e) => {
                                      const next = [...layer.colors];
                                      next[ci] = e.target.value;
                                      updateLayer(layer.id, { colors: next });
                                    }}
                                  />
                                ))}
                                {layer.colors.length < 6 && (
                                  <button type="button" className="btn btn-outline-secondary btn-sm"
                                    onClick={() => updateLayer(layer.id, { colors: [...layer.colors, "#ffffff"] })}>
                                    <i className="bi bi-plus" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Type-specific schema */}
                        {layer.type === "custom-code" ? (
                          <AnimBgCustomCodeEditor
                            code={(layer.config as any).code || ""}
                            onChange={(code) => updateLayerConfig(layer.id, { code })}
                          />
                        ) : schema.length > 0 ? (
                          <table className="table table-sm table-borderless mb-0" style={{ tableLayout: "fixed" }}>
                            <colgroup>
                              <col style={{ width: "36%" }} />
                              <col style={{ width: "64%" }} />
                            </colgroup>
                            <tbody>
                              {schema.map((fd) => {
                                // Hide entire row (label + input) when showWhen condition is not met.
                                // Note: LayerField also checks showWhen internally, but without this
                                // outer check the label row renders with an empty input cell.
                                if (fd.showWhen) {
                                  const sw = fd.showWhen;
                                  const cur = (layer.config as any)[sw.key];
                                  if (sw.value    !== undefined && cur !== sw.value)    return null;
                                  if (sw.notValue !== undefined && cur === sw.notValue) return null;
                                }
                                // monacoEditor and sequenceEditor rows span full width
                                if (fd.type === "monacoEditor" || fd.type === "sequenceEditor") {
                                  return (
                                    <tr key={fd.key}>
                                      <td colSpan={2} className="pt-2">
                                        <label className="form-label form-label-sm mb-1 fw-semibold text-secondary" style={{ fontSize: "0.8rem" }}>
                                          {fd.label}
                                        </label>
                                        {fd.hint && <div className="form-text mt-0 mb-1" style={{ fontSize: "0.7rem" }}>{fd.hint}</div>}
                                        <LayerField
                                          fieldDef={fd}
                                          value={(layer.config as any)[fd.key]}
                                          allConfig={layer.config as unknown as Record<string, unknown>}
                                          onChange={(val) => updateLayerConfig(layer.id, { [fd.key]: val })}
                                        />
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={fd.key}>
                                    <td className="align-middle pe-2">
                                      <label className="form-label form-label-sm mb-0 fw-semibold text-secondary" style={{ fontSize: "0.8rem" }}>
                                        {fd.label}
                                      </label>
                                      {fd.hint && <div className="form-text mt-0" style={{ fontSize: "0.7rem" }}>{fd.hint}</div>}
                                    </td>
                                    <td className="align-middle">
                                      <LayerField
                                        fieldDef={fd}
                                        value={(layer.config as any)[fd.key]}
                                        allConfig={layer.config as unknown as Record<string, unknown>}
                                        onChange={(val) => updateLayerConfig(layer.id, { [fd.key]: val })}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {cfg.layers.length >= 3 && (
            <div className="alert alert-info small py-2">
              <i className="bi bi-info-circle me-1" />
              Maximum 3 layers reached. Remove a layer to add a different one.
            </div>
          )}

          <div className="alert alert-secondary small py-2 mt-2">
            <i className="bi bi-phone me-1" />
            On mobile (&lt;768px), only <strong>Floating Shapes</strong> and <strong>Moving Gradient</strong> run — all other types are skipped for performance.
          </div>
        </>
      )}
    </div>
  );
}
