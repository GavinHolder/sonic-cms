/**
 * Motion adapter for the Animated Background system.
 *
 * Exposes `animate` / `stagger` with the SAME call signature the codebase's
 * existing Anime.js v4 choreography in `animators.ts` already uses — a single
 * `animate(target, { ...keyframeProps, ...optionProps })` call (Anime.js's
 * flat convention) with ms-based `duration`/`delay`, `loop`/`direction`, and
 * Anime.js-style ease names — translated internally to Motion's actual API
 * (`animate(target, keyframes, options)`, seconds-based duration/delay,
 * `repeat`/`repeatType`, CSS-style ease names).
 *
 * This is what lets every animator function in animators.ts become
 * engine-toggleable by swapping which `animate`/`stagger` pair it calls at
 * the top of the function — the choreography itself (DOM construction,
 * timing, stagger order, keyframe values) never needs to know which engine
 * is running underneath, since both engines accept the identical call shape.
 *
 * Property names need almost no translation: Motion's DOM animate() supports
 * translateX/translateY/rotateX/rotateY/skewX/skewY/scaleX/scaleY directly
 * (confirmed against motion-dom's CSSStyleDeclarationWithTransform type) —
 * the same names this codebase's Anime.js calls already use.
 */
import { animate as motionAnimateRaw, stagger as motionStaggerRaw } from "motion";

/** Minimal shape every call site in animators.ts actually uses on a returned
 * animation instance. Anime.js v4's own instances expose both `.play()` and
 * `.resume()` (used inconsistently across animators.ts, both work); Motion's
 * controls only expose `.play()` — `resume` is added below as an alias so
 * every existing `a.resume()` call site keeps working unchanged when swapped
 * to the Motion engine. */
export interface EngineControls {
  pause(): void;
  play(): void;
  resume(): void;
}

/** Anime.js v4 ease name -> closest Motion (CSS-style) ease name. Anime.js's
 * `steps(N)` has no direct Motion equivalent as a named ease — "linear" is
 * the closest visual approximation (used only for the typewriter cursor
 * blink in text-effects, where the exact stepping shape is not load-bearing). */
const EASE_MAP: Record<string, string> = {
  linear: "linear",
  inSine: "easeIn", outSine: "easeOut", inOutSine: "easeInOut",
  inQuad: "easeIn", outQuad: "easeOut", inOutQuad: "easeInOut",
  inCubic: "easeIn", outCubic: "easeOut", inOutCubic: "easeInOut",
  inBack: "backIn", outBack: "backOut", inOutBack: "backInOut",
};

function translateEase(ease: unknown): unknown {
  if (typeof ease !== "string") return ease;
  if (ease.startsWith("steps(")) return "linear";
  return EASE_MAP[ease] ?? "easeInOut";
}

// The complete set of Anime.js v4 *option* keys actually used anywhere in
// animators.ts today — everything else in a call's props object is a
// keyframe/target property (opacity, translateX, clipPath, ...) and is
// passed through to Motion untouched.
const OPTION_KEYS = new Set(["duration", "ease", "loop", "direction", "delay"]);

function splitPropsAndTranslateOptions(
  props: Record<string, unknown>
): { keyframes: Record<string, unknown>; options: Record<string, unknown> } {
  const keyframes: Record<string, unknown> = {};
  const rawOptions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (OPTION_KEYS.has(key) ? rawOptions : keyframes)[key] = value;
  }

  const options: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawOptions)) {
    if (key === "ease") { options.ease = translateEase(value); continue; }
    if (key === "loop") {
      // Anime.js: loop is `true` (forever), a finite number of iterations, or
      // falsy/absent (no repeat). Motion: `repeat` is a finite count, or
      // Infinity for forever.
      options.repeat = value === true ? Infinity : (typeof value === "number" ? value : 0);
      continue;
    }
    if (key === "direction") {
      // Anime.js "alternate" <-> Motion repeatType "reverse". Anime.js's other
      // direction values ("normal"/"reverse") aren't used anywhere in
      // animators.ts today, so only the one used mapping is handled.
      if (value === "alternate") options.repeatType = "reverse";
      continue;
    }
    if ((key === "duration" || key === "delay") && typeof value === "number") {
      // Anime.js: milliseconds. Motion: seconds.
      options[key] = value / 1000;
      continue;
    }
    // `delay` can also be a stagger()-produced function (see below) — passed
    // through as-is; it already returns seconds, matching what Motion expects.
    options[key] = value;
  }
  return { keyframes, options };
}

/**
 * Motion-backed `animate()` matching the Anime.js v4 call shape used
 * throughout animators.ts: `animate(target, { ...keyframes, ...options })`.
 */
export function animate(
  target: Parameters<typeof motionAnimateRaw>[0],
  props: Record<string, unknown>
): EngineControls {
  const { keyframes, options } = splitPropsAndTranslateOptions(props);
  const controls = motionAnimateRaw(
    target,
    keyframes as Parameters<typeof motionAnimateRaw>[1],
    options as Parameters<typeof motionAnimateRaw>[2]
  );
  return Object.assign(controls, { resume: () => controls.play() }) as EngineControls;
}

/**
 * Motion-backed `stagger()` matching Anime.js v4's `stagger(msPerStep)` call
 * shape — used directly as an option value, e.g. `delay: stagger(60)`.
 * Anime.js's stagger duration is milliseconds; Motion's is seconds.
 */
export function stagger(
  msPerStep: number,
  options?: Parameters<typeof motionStaggerRaw>[1]
): ReturnType<typeof motionStaggerRaw> {
  return motionStaggerRaw(msPerStep / 1000, options);
}
