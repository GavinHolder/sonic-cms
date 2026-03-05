/**
 * Animated Background System — Type Definitions
 * Stored in section.content.animBg (no migration needed)
 */

export type AnimBgType =
  | "floating-shapes"
  | "moving-gradient"
  | "particle-field"
  | "waves"
  | "parallax-drift"
  | "3d-tilt"
  | "custom-code"
  | "3d-scene"
  | "svg-animation"
  | "text-effects";

export type TextEffectsAnimation =
  | "typewriter"
  | "scramble"
  | "glitch"
  | "cascade"
  | "wave"
  | "reveal"
  | "blur-in"
  | "word-by-word"
  | "sequence"
  | "custom-code";

/** A single step in a sequence animation */
export interface SequenceEntry {
  id: string;
  /** "text" = animated text, "image" = full-frame image flash, "video" = full-frame video */
  type: "text" | "image" | "video";
  /** Text content — for type "text" */
  text: string;
  /** Per-entry animation type — for type "text". "none" = instant appear */
  animationType: string;
  /** Image or video URL — for type "image" | "video" */
  mediaUrl: string;
  /** Hold time after animation completes (ms) */
  holdMs: number;
  /** Exit transition before moving to the next entry */
  exitEffect: "fade" | "wipe" | "glitch" | "instant";
}

export type TextFillType = "solid" | "gradient" | "image-clip" | "video-clip";

export type TextDirection = "left" | "right" | "up" | "down" | "center" | "random";

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light";

export interface FloatingShapesConfig {
  count: number;        // 2–20, default 8
  sizeMin: number;      // px, default 30
  sizeMax: number;      // px, default 120
  speedMin: number;     // seconds per cycle, default 8
  speedMax: number;     // default 18
  blur: number;         // px, default 12
  opacityMin: number;   // 0–100, default 20
  opacityMax: number;   // 0–100, default 60
  shapes: Array<"circle" | "blob" | "square" | "triangle">; // default all 4
}

export interface MovingGradientConfig {
  direction: "horizontal" | "vertical" | "diagonal" | "radial";
  speed: number;       // seconds per cycle, default 12
  scale: number;       // % canvas scale, default 200
}

export interface ParticleFieldConfig {
  count: number;              // default 30
  sizeMin: number;            // px, default 2
  sizeMax: number;            // px, default 5
  speed: number;              // px/frame, default 0.5
  connectLines: boolean;      // default false
  connectionDistance: number; // px, default 120
}

export interface WavesConfig {
  waveCount: number;  // 2–5, default 3
  amplitude: number;  // px, default 50
  speed: number;      // seconds per cycle, default 8
  direction: "left" | "right";
}

export interface ParallaxDriftConfig {
  factor: number;    // 0.05–0.5, default 0.15
  direction: "vertical" | "horizontal" | "both";
  shapeCount: number; // default 5
  shapeSize: number;  // px, default 150
  blur: number;       // px, default 20
}

export interface TiltConfig {
  mode: "mouse" | "auto" | "both";
  intensity: number;   // degrees, default 5
  speed: number;       // seconds per auto-loop, default 8
  perspective: number; // px, default 1200
}

export interface CustomCodeConfig {
  code: string; // JS returning { pause, resume, destroy }
}

export interface ThreeDSceneConfig {
  modelUrl: string;        // .glb URL
  autoRotate: boolean;     // default true
  rotationSpeed: number;   // default 1
  cameraDistance: number;  // default 5
  lightColor: string;      // default "#ffffff"
  lightIntensity: number;  // default 2
  envOpacity: number;      // 0–100, default 80
}


export interface SVGAnimationConfig {
  /** Raw SVG markup to display and animate */
  svgCode: string;
  /** Built-in animation type applied to the SVG */
  animation: "none" | "draw-on" | "pulse" | "spin" | "float" | "morph";
  /** Seconds per animation cycle (default 3) */
  speed: number;
  /** Whether to loop the animation (default true) */
  loop: boolean;
  /** SVG size as % of the container's shortest dimension (default 80) */
  scale: number;
  /** Horizontal centre as % of container width (default 50) */
  posX: number;
  /** Vertical centre as % of container height (default 50) */
  posY: number;
  /** Apply a colour filter over the SVG using the layer colour palette */
  colorize: boolean;
}

export interface TextEffectsConfig {
  /** The text string to display */
  text: string;
  /** Built-in animation type, or "custom-code" for full control */
  animation: TextEffectsAnimation;
  /** Travel/reveal direction for cascade, wave, reveal animations */
  direction: TextDirection;
  /** Font size in vw units (default 8) */
  fontSize: number;
  /** CSS font-weight value (default "700") */
  fontWeight: string;
  /** Letter spacing in em (default 0.05) */
  letterSpacing: number;
  /** Horizontal centre as % of container (default 50) */
  posX: number;
  /** Vertical centre as % of container (default 50) */
  posY: number;
  /** How text fill is rendered */
  fillType: TextFillType;
  /** Colour override for "solid" fill — empty = use layer palette */
  fillColor: string;
  /** CSS gradient string for "gradient" fill */
  fillGradient: string;
  /** Image or video URL for "image-clip" / "video-clip" fill */
  fillMediaUrl: string;
  /** Overall speed multiplier: 1 = normal, 2 = twice as fast (default 1) */
  speed: number;
  /** Per-character stagger delay in ms (default 40) */
  stagger: number;
  /** Whether the animation loops continuously (default true) */
  loop: boolean;
  /** Delay between loops in ms (default 1200) */
  loopDelay: number;
  /**
   * "background": layer sits behind section content, loops as ambient decoration.
   * "intro": layer covers section content, plays once then exits to reveal content.
   */
  mode: "background" | "intro";
  /** Exit transition used in intro mode (default "fade") */
  exitEffect: "fade" | "wipe" | "glitch" | "instant";
  /** How long (ms) the text is held at full visibility before the exit starts (default 1500) */
  holdDuration: number;
  /** Custom JS code — only used when animation === "custom-code" */
  customCode: string;
  /**
   * Vertical gap between lines when text contains newlines (in vw units).
   * Defaults to fontSize × 1.3 if not set.
   */
  lineSpacing?: number;
  /**
   * Background color shown behind the intro overlay — covers section content until
   * the intro exits. Only relevant when mode === "intro". Default "#000000".
   */
  introBgColor?: string;
  /**
   * Sequence entries — used only when animation === "sequence".
   * Each entry plays one after another, mixing text and media.
   */
  sequenceEntries?: SequenceEntry[];
}

export type AnimBgPresetConfig =
  | FloatingShapesConfig
  | MovingGradientConfig
  | ParticleFieldConfig
  | WavesConfig
  | ParallaxDriftConfig
  | TiltConfig
  | CustomCodeConfig
  | ThreeDSceneConfig
  | SVGAnimationConfig
  | TextEffectsConfig;

export interface AnimBgLayer {
  id: string;
  type: AnimBgType;
  enabled: boolean;
  opacity: number;          // 0–100
  blendMode: BlendMode;
  useColorPalette: boolean; // true = use section.colorPalette
  colors: string[];         // custom colors (when useColorPalette=false)
  config: AnimBgPresetConfig;
}

export interface AnimBgConfig {
  enabled: boolean;
  layers: AnimBgLayer[];    // max 3
  overlayColor: string;     // "#000000" or "#ffffff"
  overlayOpacity: number;   // 0–80
}

/** Uniform handle returned by every animator function */
export interface AnimatorHandle {
  pause(): void;
  resume(): void;
  destroy(): void;
  /** Skip intro immediately (only meaningful for text-effects intro-mode layers) */
  skip?(): void;
}
