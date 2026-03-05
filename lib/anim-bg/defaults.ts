import type {
  AnimBgConfig,
  FloatingShapesConfig,
  MovingGradientConfig,
  ParticleFieldConfig,
  WavesConfig,
  ParallaxDriftConfig,
  TiltConfig,
  CustomCodeConfig,
  ThreeDSceneConfig,
  SVGAnimationConfig,
  TextEffectsConfig,
  AnimBgType,
} from "./types";

export const DEFAULT_FALLBACK_COLORS = ["#4ecdc4", "#6a82fb", "#fc466b"];

export const DEFAULT_ANIM_BG_CONFIG: AnimBgConfig = {
  enabled: false,
  layers: [],
  overlayColor: "#000000",
  overlayOpacity: 0,
};

export const DEFAULT_FLOATING_SHAPES: FloatingShapesConfig = {
  count: 8,
  sizeMin: 30,
  sizeMax: 120,
  speedMin: 8,
  speedMax: 18,
  blur: 12,
  opacityMin: 20,
  opacityMax: 60,
  shapes: ["circle", "blob", "square", "triangle"],
};

export const DEFAULT_MOVING_GRADIENT: MovingGradientConfig = {
  direction: "diagonal",
  speed: 12,
  scale: 200,
};

export const DEFAULT_PARTICLE_FIELD: ParticleFieldConfig = {
  count: 30,
  sizeMin: 2,
  sizeMax: 5,
  speed: 0.5,
  connectLines: false,
  connectionDistance: 120,
};

export const DEFAULT_WAVES: WavesConfig = {
  waveCount: 3,
  amplitude: 50,
  speed: 8,
  direction: "left",
};

export const DEFAULT_PARALLAX_DRIFT: ParallaxDriftConfig = {
  factor: 0.15,
  direction: "vertical",
  shapeCount: 5,
  shapeSize: 150,
  blur: 20,
};

export const DEFAULT_TILT: TiltConfig = {
  mode: "auto",
  intensity: 5,
  speed: 8,
  perspective: 1200,
};

export const DEFAULT_CUSTOM_CODE: CustomCodeConfig = {
  code: `// Animation code — runs with \`anime\` and \`container\` in scope.
// Must return { pause, resume, destroy }.

const el = document.createElement('div');
el.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
container.appendChild(el);

const anim = anime({
  targets: el,
  opacity: [0, 0.3, 0],
  duration: 3000,
  loop: true,
  easing: 'easeInOutSine',
});

return {
  pause:   () => anim.pause(),
  resume:  () => anim.play(),
  destroy: () => { anim.pause(); el.remove(); },
};`,
};

export const DEFAULT_3D_SCENE: ThreeDSceneConfig = {
  modelUrl: "",
  autoRotate: true,
  rotationSpeed: 1,
  cameraDistance: 5,
  lightColor: "#ffffff",
  lightIntensity: 2,
  envOpacity: 80,
};


export const DEFAULT_SVG_ANIMATION: SVGAnimationConfig = {
  svgCode: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" stroke-width="8" stroke-dasharray="502" stroke-dashoffset="502">
    <animate attributeName="stroke-dashoffset" from="502" to="0" dur="2s" repeatCount="indefinite"/>
  </circle>
  <polygon points="100,30 170,150 30,150" fill="none" stroke="currentColor" stroke-width="6" opacity="0.6">
    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="8s" repeatCount="indefinite"/>
  </polygon>
</svg>`,
  animation: "float",
  speed: 4,
  loop: true,
  scale: 60,
  posX: 50,
  posY: 50,
  colorize: true,
};

export const DEFAULT_TEXT_EFFECTS: TextEffectsConfig = {
  text:          "YOUR COMPANY",
  animation:     "typewriter",
  direction:     "left",
  fontSize:      10,
  fontWeight:    "900",
  letterSpacing: 0.1,
  posX:          50,
  posY:          50,
  fillType:      "solid",
  fillColor:     "",
  fillGradient:  "linear-gradient(135deg, #4ecdc4, #6a82fb)",
  fillMediaUrl:  "",
  speed:         1,
  stagger:       60,
  loop:          true,
  loopDelay:     1200,
  mode:          "background",
  exitEffect:    "fade",
  holdDuration:  1500,
  lineSpacing:   13,
  introBgColor:  "#000000",
  sequenceEntries: [],
  customCode: `// Text effects custom code.
// Available: container, colors, config
// Must return { pause, resume, destroy }

const el = document.createElement('div');
el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:8vw;font-weight:900;opacity:0.15;color:currentColor;';
el.textContent = config.text || 'TEXT';
container.appendChild(el);

return {
  pause:   () => {},
  resume:  () => {},
  destroy: () => el.remove(),
};`,
};

export const DEFAULT_CONFIGS: Record<AnimBgType, object> = {
  "floating-shapes": DEFAULT_FLOATING_SHAPES,
  "moving-gradient": DEFAULT_MOVING_GRADIENT,
  "particle-field":  DEFAULT_PARTICLE_FIELD,
  waves:             DEFAULT_WAVES,
  "parallax-drift":  DEFAULT_PARALLAX_DRIFT,
  "3d-tilt":         DEFAULT_TILT,
  "custom-code":     DEFAULT_CUSTOM_CODE,
  "3d-scene":        DEFAULT_3D_SCENE,
  "svg-animation":   DEFAULT_SVG_ANIMATION,
  "text-effects":    DEFAULT_TEXT_EFFECTS,
};
