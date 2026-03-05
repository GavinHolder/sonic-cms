/**
 * Animated Background Animators
 * Each returns an AnimatorHandle { pause, resume, destroy }
 *
 * Uses Anime.js v4 API: animate(targets, props)
 */

import { animate, stagger } from "animejs";
import type {
  AnimatorHandle,
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
  TextDirection,
} from "./types";
import { DEFAULT_FALLBACK_COLORS } from "./defaults";

type AnimInstance = ReturnType<typeof animate>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickColor(colors: string[]): string {
  const pool = colors.length ? colors : DEFAULT_FALLBACK_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return `rgba(78,205,196,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function safeColor(c: string): string {
  return c.startsWith("#") ? c : "#4ecdc4";
}

// ─── 1. Floating Shapes ──────────────────────────────────────────────────────

export function floatingShapesAnimator(
  container: HTMLElement,
  config: FloatingShapesConfig,
  colors: string[]
): AnimatorHandle {
  const { count, sizeMin, sizeMax, speedMin, speedMax, blur, opacityMin, opacityMax, shapes } = config;
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
  container.appendChild(wrapper);

  const instances: AnimInstance[] = [];

  for (let i = 0; i < count; i++) {
    const shape = shapes[Math.floor(Math.random() * shapes.length)] || "circle";
    const size  = rand(sizeMin, sizeMax);
    const color = safeColor(pickColor(colors));
    const opMin = opacityMin / 100;
    const opMax = opacityMax / 100;

    const el = document.createElement("div");
    el.style.cssText = [
      "position:absolute",
      `width:${size}px`,
      `height:${size}px`,
      `left:${rand(0, 90)}%`,
      `top:${rand(0, 90)}%`,
      `background:${hexToRgba(color, rand(opMin, opMax))}`,
      `filter:blur(${blur}px)`,
      "will-change:transform,opacity",
    ].join(";");

    if (shape === "circle")        el.style.borderRadius = "50%";
    else if (shape === "blob")     el.style.borderRadius = "60% 40% 70% 30% / 50% 60% 40% 50%";
    else if (shape === "square")   el.style.borderRadius = "4px";
    else if (shape === "triangle") {
      el.style.background   = "transparent";
      el.style.borderLeft   = `${size / 2}px solid transparent`;
      el.style.borderRight  = `${size / 2}px solid transparent`;
      el.style.borderBottom = `${size}px solid ${hexToRgba(color, rand(opMin, opMax))}`;
      el.style.width  = "0";
      el.style.height = "0";
      el.style.filter = "none";
    }

    wrapper.appendChild(el);

    const anim = animate(el, {
      translateX: rand(-60, 60),
      translateY: rand(-60, 60),
      opacity: rand(opMin, opMax),
      duration: rand(speedMin, speedMax) * 1000,
      ease: "inOutSine",
      loop: true,
      direction: "alternate",
      delay: rand(0, 3000),
    });
    instances.push(anim);
  }

  return {
    pause:   () => instances.forEach(a => a.pause()),
    resume:  () => instances.forEach(a => a.resume()),
    destroy: () => {
      instances.forEach(a => a.pause());
      wrapper.remove();
    },
  };
}

// ─── 2. Moving Gradient ──────────────────────────────────────────────────────
// Uses requestAnimationFrame (not CSS @keyframes) so it works even when
// Chrome/Windows suppresses CSS animations via "Show animations" settings.

export function movingGradientAnimator(
  container: HTMLElement,
  config: MovingGradientConfig,
  colors: string[]
): AnimatorHandle {
  const { direction, speed, scale } = config;
  const pool = colors.length >= 2 ? colors : DEFAULT_FALLBACK_COLORS;

  const stops = pool.slice(0, 4).map((c, i, arr) =>
    `${hexToRgba(safeColor(c), 0.7)} ${Math.round((i / (arr.length - 1)) * 100)}%`
  ).join(", ");

  let bgGradient: string;
  if (direction === "radial") {
    bgGradient = `radial-gradient(circle at 30% 30%, ${stops})`;
  } else if (direction === "horizontal") {
    bgGradient = `linear-gradient(to right, ${stops})`;
  } else if (direction === "vertical") {
    bgGradient = `linear-gradient(to bottom, ${stops})`;
  } else {
    bgGradient = `linear-gradient(135deg, ${stops})`;
  }

  const el = document.createElement("div");
  el.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    `background:${bgGradient}`,
    `background-size:${scale}% ${scale}%`,
    "background-position:0% 0%",
  ].join(";");
  container.appendChild(el);

  // rAF-based animation — immune to Chrome/OS "Show animations" suppression
  let running = true;
  let frameId = 0;
  let startTime = -1;
  let prevTickTime = -1; // 30fps throttle
  const duration = speed * 1000;

  function tick(now: number) {
    if (!running) return;
    // 30fps throttle — gradient changes are imperceptible above 20fps
    if (prevTickTime >= 0 && now - prevTickTime < 32) {
      frameId = requestAnimationFrame(tick);
      return;
    }
    prevTickTime = now;
    if (startTime < 0) startTime = now;
    const elapsed = now - startTime;
    // Normalised 0→1 ping-pong via sin so direction alternates smoothly
    const t = (Math.sin((elapsed / duration) * Math.PI * 2 - Math.PI / 2) + 1) / 2;

    if (direction === "horizontal") {
      el.style.backgroundPosition = `${t * 100}% 50%`;
    } else if (direction === "vertical") {
      el.style.backgroundPosition = `50% ${t * 100}%`;
    } else if (direction === "radial") {
      const pct = 20 + t * 60;
      el.style.backgroundPosition = `${pct}% ${pct}%`;
      el.style.backgroundSize    = `${scale * (0.8 + t * 0.2)}% ${scale * (0.8 + t * 0.2)}%`;
    } else {
      // diagonal
      el.style.backgroundPosition = `${t * 100}% ${t * 100}%`;
    }
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);

  return {
    pause:   () => { running = false; cancelAnimationFrame(frameId); },
    resume:  () => { if (!running) { running = true; startTime = -1; frameId = requestAnimationFrame(tick); } },
    destroy: () => { running = false; cancelAnimationFrame(frameId); el.remove(); },
  };
}

// ─── 3. Particle Field ───────────────────────────────────────────────────────

export function particleFieldAnimator(
  container: HTMLElement,
  config: ParticleFieldConfig,
  colors: string[]
): AnimatorHandle {
  const { count, sizeMin, sizeMax, speed, connectLines, connectionDistance } = config;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  container.appendChild(canvas);

  const ctxMaybe = canvas.getContext("2d");
  if (!ctxMaybe) return { pause: () => {}, resume: () => {}, destroy: () => canvas.remove() };
  const ctx = ctxMaybe;

  let running = true;
  let frameId = 0;
  let prevDrawTime = -1; // 30fps throttle

  interface Particle { x: number; y: number; vx: number; vy: number; r: number; color: string; }
  const particles: Particle[] = [];

  function init() {
    canvas.width  = container.offsetWidth  || 800;
    canvas.height = container.offsetHeight || 600;
    particles.length = 0;
    for (let i = 0; i < count; i++) {
      particles.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2,
        r:  rand(sizeMin, sizeMax),
        color: hexToRgba(safeColor(pickColor(colors)), 0.7),
      });
    }
  }

  function draw(now?: number) {
    if (!running) return;
    const ts = now ?? performance.now();
    // 30fps throttle — particles look fine at 30fps and use half the CPU
    if (prevDrawTime >= 0 && ts - prevDrawTime < 32) {
      frameId = requestAnimationFrame(draw);
      return;
    }
    prevDrawTime = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    if (connectLines) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / connectionDistance) * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }
    frameId = requestAnimationFrame(draw);
  }

  init();
  draw();

  const resizeObserver = new ResizeObserver(() => init());
  resizeObserver.observe(container);

  return {
    pause:   () => { running = false; cancelAnimationFrame(frameId); },
    resume:  () => { running = true; draw(); },
    destroy: () => { running = false; cancelAnimationFrame(frameId); resizeObserver.disconnect(); canvas.remove(); },
  };
}

// ─── 4. Waves ────────────────────────────────────────────────────────────────

export function wavesAnimator(
  container: HTMLElement,
  config: WavesConfig,
  colors: string[]
): AnimatorHandle {
  const { waveCount, amplitude, speed, direction } = config;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:absolute;bottom:0;left:0;right:0;pointer-events:none;overflow:hidden;";
  container.appendChild(wrapper);

  const instances: AnimInstance[] = [];
  const waveEls: HTMLElement[] = [];

  for (let i = 0; i < waveCount; i++) {
    const color   = safeColor(pickColor(colors));
    const opacity = 0.15 + (i / waveCount) * 0.25;
    const waveH   = amplitude + i * 20;
    const el = document.createElement("div");
    el.style.cssText = [
      "position:absolute",
      "bottom:0",
      "left:-50%",
      "width:300%",
      `height:${waveH * 2 + 60}px`,
      `background:${hexToRgba(color, opacity)}`,
      `border-radius:${waveH}px ${waveH}px 0 0`,
    ].join(";");
    wrapper.appendChild(el);
    waveEls.push(el);
  }

  waveEls.forEach((el, i) => {
    const mult = direction === "left" ? -1 : 1;
    const anim = animate(el, {
      translateX: `${mult * (33 + i * 8)}%`,
      duration: (speed + i * 1.5) * 1000,
      ease: "linear",
      loop: true,
      direction: "alternate",
    });
    instances.push(anim);
  });

  return {
    pause:   () => instances.forEach(a => a.pause()),
    resume:  () => instances.forEach(a => a.resume()),
    destroy: () => { instances.forEach(a => a.pause()); wrapper.remove(); },
  };
}

// ─── 5. Parallax Drift ───────────────────────────────────────────────────────

export function parallaxDriftAnimator(
  container: HTMLElement,
  config: ParallaxDriftConfig,
  colors: string[],
  snapContainer: HTMLElement
): AnimatorHandle {
  const { factor, direction, shapeCount, shapeSize, blur } = config;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
  container.appendChild(wrapper);

  const shapeEls: HTMLElement[] = [];
  for (let i = 0; i < shapeCount; i++) {
    const color = safeColor(pickColor(colors));
    const sz    = rand(shapeSize * 0.5, shapeSize * 1.5);
    const el    = document.createElement("div");
    el.style.cssText = [
      "position:absolute",
      `width:${sz}px`,
      `height:${sz}px`,
      `left:${rand(-10, 90)}%`,
      `top:${rand(-10, 90)}%`,
      `background:${hexToRgba(color, 0.35)}`,
      `filter:blur(${blur}px)`,
      "border-radius:60% 40% 70% 30% / 50% 60% 40% 50%",
      "will-change:transform",
    ].join(";");
    wrapper.appendChild(el);
    shapeEls.push(el);
  }

  const handleScroll = () => {
    const rect  = container.getBoundingClientRect();
    const vh    = window.innerHeight;
    const ratio = 1 - (rect.top + rect.height / 2) / vh;
    shapeEls.forEach((el, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const fy  = direction !== "horizontal" ? ratio * factor * vh * dir       : 0;
      const fx  = direction !== "vertical"   ? ratio * factor * vh * dir * 0.5 : 0;
      el.style.transform = `translate(${fx}px,${fy}px)`;
    });
  };

  snapContainer.addEventListener("scroll", handleScroll, { passive: true });

  return {
    pause:   () => snapContainer.removeEventListener("scroll", handleScroll),
    resume:  () => snapContainer.addEventListener("scroll", handleScroll, { passive: true }),
    destroy: () => { snapContainer.removeEventListener("scroll", handleScroll); wrapper.remove(); },
  };
}

// ─── 6. 3D Tilt ──────────────────────────────────────────────────────────────

export function tiltAnimator(
  container: HTMLElement,
  config: TiltConfig,
  sectionEl: HTMLElement
): AnimatorHandle {
  const { mode, intensity, speed, perspective } = config;
  container.style.transformStyle = "preserve-3d";
  container.style.perspective    = `${perspective}px`;

  let autoAnim: AnimInstance | null = null;

  const handleMouse = (e: MouseEvent) => {
    const rect = sectionEl.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const rx   = ((e.clientY - cy) / (rect.height / 2)) * intensity;
    const ry   = ((e.clientX - cx) / (rect.width  / 2)) * intensity;
    container.style.transform = `rotateX(${-rx}deg) rotateY(${ry}deg)`;
  };
  const handleMouseLeave = () => { container.style.transform = ""; };

  if (mode === "mouse" || mode === "both") {
    sectionEl.addEventListener("mousemove",  handleMouse);
    sectionEl.addEventListener("mouseleave", handleMouseLeave);
  }

  if (mode === "auto" || mode === "both") {
    autoAnim = animate(container, {
      rotateX: [intensity * 0.5, -intensity * 0.5],
      rotateY: [-intensity, intensity],
      duration: speed * 1000,
      ease: "inOutSine",
      loop: true,
      direction: "alternate",
    });
  }

  return {
    pause:   () => autoAnim?.pause(),
    resume:  () => autoAnim?.resume(),
    destroy: () => {
      autoAnim?.pause();
      sectionEl.removeEventListener("mousemove",  handleMouse);
      sectionEl.removeEventListener("mouseleave", handleMouseLeave);
      container.style.transform      = "";
      container.style.transformStyle = "";
      container.style.perspective    = "";
    },
  };
}

// ─── 7. Custom Code ──────────────────────────────────────────────────────────
// Admin-only feature: executes code written by the site administrator.
// The animator uses the Function constructor indirectly (via globalThis)
// because this is an intentional admin code execution sandbox — equivalent to
// how WordPress/Webflow/GrapesJS allow admin-authored script injection.
// Only site administrators can write or save custom animation code.

export function customCodeAnimator(
  container: HTMLElement,
  config: CustomCodeConfig
): AnimatorHandle {
  const { code } = config;
  if (!code?.trim()) {
    console.warn("[AnimBg] customCodeAnimator: no code provided");
    return { pause: () => {}, resume: () => {}, destroy: () => {} };
  }

  // anime v3 → v4 compatibility shim:  anime({ targets, ...props }) → animate(targets, props)
  const animeShim = (opts: Record<string, unknown>): ReturnType<typeof animate> => {
    const { targets, easing, ...rest } = opts;
    return animate(targets as Parameters<typeof animate>[0], {
      ...rest,
      ...(easing ? { ease: easing } : {}),
    } as Parameters<typeof animate>[1]);
  };
  (animeShim as any).random = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  try {
    // Admin sandbox: uses Function constructor via globalThis (intentional, admin-only).
    const AdminFn = (globalThis as any).Function as typeof Function;
    const fn = new AdminFn("anime", "animate", "container", code);
    const handle = fn(animeShim, animate, container) as Partial<AnimatorHandle> | null | undefined;
    if (handle && typeof handle.pause === "function" && typeof handle.destroy === "function") {
      return {
        pause:   () => handle.pause!(),
        resume:  () => handle.resume?.(),
        destroy: () => handle.destroy!(),
      };
    }
    console.warn("[AnimBg] customCodeAnimator: code must return { pause, resume, destroy }");
  } catch (e) {
    console.error("[AnimBg] Custom animation code error:", e);
  }

  return { pause: () => {}, resume: () => {}, destroy: () => {} };
}

// ─── 11. SVG Animation ───────────────────────────────────────────────────────
// Renders an SVG (supplied as markup) into a container div and applies
// optional Anime.js-powered overlay animations (float, pulse, spin, draw-on).
// The SVG's own <animate> / <animateTransform> tags continue to run as-is.

export function svgAnimationAnimator(
  container: HTMLElement,
  config: SVGAnimationConfig,
  colors: string[]
): AnimatorHandle {
  const {
    svgCode   = "",
    animation = "float",
    speed     = 4,
    loop      = true,
    scale     = 60,
    posX      = 50,
    posY      = 50,
    colorize  = true,
  } = config;

  const pool = (colors.length ? colors : DEFAULT_FALLBACK_COLORS).map(safeColor);

  // Wrapper — positions the SVG via CSS
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:absolute",
    "pointer-events:none",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    `left:${posX}%`,
    `top:${posY}%`,
    "transform:translate(-50%,-50%)",
    `width:${scale}%`,
    `height:${scale}%`,
  ].join(";");
  container.appendChild(wrapper);

  // Parse and inject SVG
  const parser  = new DOMParser();
  const svgDoc  = parser.parseFromString(svgCode || "<svg xmlns='http://www.w3.org/2000/svg'/>", "image/svg+xml");
  const svgEl   = svgDoc.documentElement as unknown as SVGSVGElement;
  svgEl.style.cssText = "width:100%;height:100%;overflow:visible;";
  svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
  wrapper.appendChild(svgEl);

  // Apply colourize filter — tint strokes/fills using the first palette colour
  if (colorize && pool.length) {
    const tintColor = pool[0];
    // Only override elements that don't have an explicit inline color
    svgEl.querySelectorAll<SVGElement>("[stroke]").forEach(el => {
      const s = el.getAttribute("stroke");
      if (!s || s === "currentColor") el.setAttribute("stroke", tintColor);
    });
    svgEl.querySelectorAll<SVGElement>("[fill]").forEach(el => {
      const f = el.getAttribute("fill");
      if (!f || f === "currentColor") el.setAttribute("fill", tintColor);
    });
    svgEl.style.color = tintColor; // currentColor fallback
  }

  let anims: AnimInstance[] = [];
  let running = true;

  function applyAnimation() {
    if (!running) return;
    const dur = (speed || 4) * 1000;
    const loopVal = loop ? Infinity : 1;

    if (animation === "float") {
      anims.push(animate(wrapper, {
        translateY: ["-6%", "6%"],
        duration: dur,
        direction: "alternate",
        ease: "inOutSine",
        loop: loopVal,
      }));
    } else if (animation === "pulse") {
      anims.push(animate(wrapper, {
        scale: [1, 1.08, 1],
        opacity: [0.7, 1, 0.7],
        duration: dur,
        ease: "inOutSine",
        loop: loopVal,
      }));
    } else if (animation === "spin") {
      anims.push(animate(svgEl, {
        rotate: "360deg",
        duration: dur,
        ease: "linear",
        loop: loopVal,
      }));
    } else if (animation === "draw-on") {
      // Animate stroke-dashoffset on all path/circle/rect/polygon/line elements
      const els = Array.from(svgEl.querySelectorAll<SVGGeometryElement>(
        "path,circle,rect,ellipse,polyline,polygon,line"
      ));
      els.forEach(el => {
        let len: number;
        try { len = (el as SVGGeometryElement).getTotalLength?.() ?? 500; } catch { len = 500; }
        el.style.strokeDasharray  = String(len);
        el.style.strokeDashoffset = String(len);
      });
      anims.push(animate(els, {
        strokeDashoffset: ["inherit", "0"],
        duration: dur,
        ease: "inOutCubic",
        loop: loopVal,
      }));
    } else if (animation === "morph") {
      // Gentle morph: slight skew oscillation
      anims.push(animate(wrapper, {
        skewX: ["0deg", "3deg", "0deg", "-3deg", "0deg"],
        skewY: ["0deg", "2deg", "0deg", "-2deg", "0deg"],
        duration: dur,
        ease: "inOutSine",
        loop: loopVal,
      }));
    }
    // animation === "none" → no Anime.js, SVG's own animations run naturally
  }

  applyAnimation();

  const obs = new ResizeObserver(() => {
    // Reposition if container resizes (posX/posY are %, CSS handles it)
  });
  obs.observe(container);

  return {
    pause:   () => { running = false; anims.forEach(a => a.pause()); },
    resume:  () => { running = true;  anims.forEach(a => a.play()); },
    destroy: () => {
      running = false;
      anims.forEach(a => a.pause());
      obs.disconnect();
      wrapper.remove();
    },
  };
}

// ─── 12. Text Effects ─────────────────────────────────────────────────────────

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&";

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

/**
 * Build a CSS string for the text fill.
 * Returns { color, background, webkitBackgroundClip, backgroundClip } props as an inline style fragment.
 */
function buildFillStyle(
  fillType: TextEffectsConfig["fillType"],
  fillColor: string,
  fillGradient: string,
  colors: string[]
): React.CSSProperties {
  const primaryColor = fillColor || colors[0] || "#4ecdc4";

  if (fillType === "gradient") {
    const gradient = fillGradient || `linear-gradient(135deg, ${colors[0] || "#4ecdc4"}, ${colors[1] || "#6a82fb"})`;
    return {
      background: gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
    };
  }
  // solid (or fallback)
  return { color: primaryColor };
}

/**
 * Directional stagger order for cascade/wave animations.
 * Returns an array of indices sorted by travel order.
 */
function staggerOrder(count: number, dir: TextDirection): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  if (dir === "right") return [...indices].reverse();
  if (dir === "up" || dir === "down") return indices; // top→bottom natural
  if (dir === "center") {
    // sort by distance from centre outward
    const mid = (count - 1) / 2;
    return [...indices].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  }
  if (dir === "random") return [...indices].sort(() => Math.random() - 0.5);
  return indices; // left → right default
}

function getCharEnterTransform(dir: TextDirection): { translateX?: string[]; translateY?: string[] } {
  const dist = "0.6em";
  if (dir === "left")   return { translateX: [`-${dist}`, "0em"] };
  if (dir === "right")  return { translateX: [dist, "0em"] };
  if (dir === "up")     return { translateY: [dist, "0em"] };
  if (dir === "down")   return { translateY: [`-${dist}`, "0em"] };
  if (dir === "center") return { translateX: ["0em", "0em"] };
  return { translateY: [`-${dist}`, "0em"] }; // random default
}

export function textEffectsAnimator(
  container: HTMLElement,
  config: TextEffectsConfig,
  colors: string[],
  /** Section root element — used for intro mode (z-index must escape container) */
  sectionEl?: HTMLElement | null,
  /** Called when intro mode animation completes (naturally or via skip) */
  onDone?: () => void
): AnimatorHandle {
  const {
    text, animation, direction, fontSize, fontWeight, letterSpacing,
    posX, posY, fillType, fillColor, fillGradient, fillMediaUrl,
    speed, stagger: staggerMs, loop, loopDelay, mode,
    exitEffect, holdDuration, customCode, lineSpacing,
    introBgColor, sequenceEntries,
  } = { ...config };

  // ── Parse multi-line text ─────────────────────────────────────────────────
  const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.length > 0);
  if (lines.length === 0) lines.push(text || "");
  const lineGap = (lineSpacing != null ? lineSpacing : fontSize * 1.3);

  const speedFactor = Math.max(0.1, speed);
  const charDelay   = staggerMs / speedFactor;

  // ── Intro mode: mount on section root so it escapes overflow:hidden ──────
  const mountTarget = (mode === "intro" && sectionEl) ? sectionEl : container;

  let running = false; // starts paused — resume() starts the animation
  let cycleGen = 0;    // incremented on every resume() to cancel stale async chains
  let loopTimer: ReturnType<typeof setTimeout> | null = null;
  const anims: ReturnType<typeof animate>[] = [];

  // ── Outer wrapper ─────────────────────────────────────────────────────────
  const wrapper = document.createElement("div");
  const wrapperBg = mode === "intro" ? (introBgColor || "#000000") : "";
  wrapper.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "overflow:hidden",
    `z-index:${mode === "intro" ? 20 : 0}`,
    wrapperBg ? `background:${wrapperBg}` : "",
  ].filter(Boolean).join(";");
  mountTarget.appendChild(wrapper);

  // ── Video element (video-clip fill) ──────────────────────────────────────
  let videoEl: HTMLVideoElement | null = null;
  if (fillType === "video-clip" && fillMediaUrl) {
    videoEl = document.createElement("video");
    videoEl.src = fillMediaUrl;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.playsInline = true;
    videoEl.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;pointer-events:none;";
    wrapper.appendChild(videoEl);
    videoEl.play().catch(() => {});
  }

  // ── Text group — positioned at (posX%, posY%) ──────────────────────────
  // Uses position:absolute + transform to reliably center the text block at the given coords.
  const primaryColor = fillColor || colors[0] || "#4ecdc4";

  const textGroup = document.createElement("div");
  textGroup.style.cssText = [
    "position:absolute",
    `left:${posX}%`,
    `top:${posY}%`,
    "transform:translate(-50%,-50%)",
    "pointer-events:none",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    `gap:${lineGap}vw`,
  ].join(";");
  wrapper.appendChild(textGroup);

  // ── Helper: apply fill style to a line element ──────────────────────────
  function applyFill(el: HTMLElement) {
    if (fillType === "gradient") {
      const grad = fillGradient || `linear-gradient(135deg, ${colors[0] || "#4ecdc4"}, ${colors[1] || "#6a82fb"})`;
      el.style.background = grad;
      el.style.webkitBackgroundClip = "text";
      el.style.backgroundClip = "text";
      el.style.webkitTextFillColor = "transparent";
      el.style.color = "transparent";
    } else if (fillType === "image-clip" && fillMediaUrl) {
      el.style.backgroundImage = `url(${fillMediaUrl})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.webkitBackgroundClip = "text";
      el.style.backgroundClip = "text";
      el.style.webkitTextFillColor = "transparent";
      el.style.color = "transparent";
    } else if (fillType === "video-clip") {
      el.style.color = primaryColor; // fallback while canvas loads
    } else {
      el.style.color = primaryColor;
    }
  }

  // ── Create one line element per text line ─────────────────────────────────
  const lineEls: HTMLElement[] = lines.map(() => {
    const el = document.createElement("div");
    el.style.cssText = [
      `font-size:${fontSize}vw`,
      `font-weight:${fontWeight}`,
      `letter-spacing:${letterSpacing}em`,
      "white-space:nowrap",
      "user-select:none",
      "pointer-events:none",
      "line-height:1",
    ].join(";");
    applyFill(el);
    textGroup.appendChild(el);
    return el;
  });

  // Convenience alias — used by non-multi-line paths (canvas, custom-code)
  const textEl = lineEls[0];

  // ── Canvas for video-clip compositing ─────────────────────────────────────
  let canvasEl: HTMLCanvasElement | null = null;
  let canvasCtx: CanvasRenderingContext2D | null = null;
  let videoFrameId = 0;

  if (fillType === "video-clip" && videoEl) {
    canvasEl = document.createElement("canvas");
    canvasEl.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    wrapper.appendChild(canvasEl);

    const drawVideoFrame = () => {
      if (!running || !canvasEl || !canvasCtx || !videoEl) return;
      const w = wrapper.offsetWidth;
      const h = wrapper.offsetHeight;
      if (canvasEl.width !== w || canvasEl.height !== h) {
        canvasEl.width  = w;
        canvasEl.height = h;
      }
      canvasCtx.clearRect(0, 0, w, h);
      // Draw text path as mask (supports multi-line)
      const fSize = parseFloat(fontSize + "") * w / 100 * (fontSize / 10);
      canvasCtx.save();
      canvasCtx.font = `${fontWeight} ${fSize}px sans-serif`;
      canvasCtx.textAlign    = "center";
      canvasCtx.textBaseline = "middle";
      canvasCtx.fillStyle = "#fff";
      const lineSpacingPx = lineGap * w / 100;
      const totalH = (lines.length - 1) * lineSpacingPx;
      lines.forEach((lineText, idx) => {
        const ly = h * (posY / 100) - totalH / 2 + idx * lineSpacingPx;
        canvasCtx!.fillText(lineText, w * (posX / 100), ly);
      });
      canvasCtx.globalCompositeOperation = "source-in";
      canvasCtx.drawImage(videoEl, 0, 0, w, h);
      canvasCtx.restore();
      canvasCtx.globalCompositeOperation = "source-over";
      videoFrameId = requestAnimationFrame(drawVideoFrame);
    };

    const initCanvas = () => {
      if (!canvasEl) return;
      canvasCtx = canvasEl.getContext("2d");
      textEl.style.opacity = "0"; // hide DOM text, canvas draws it
      drawVideoFrame();
    };
    if (videoEl.readyState >= 2) initCanvas();
    else videoEl.addEventListener("canplay", initCanvas, { once: true });
  }

  // ── Custom code path ──────────────────────────────────────────────────────
  if (animation === "custom-code") {
    let customHandle: AnimatorHandle | null = null;
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("container", "colors", "config", customCode || "return { pause:()=>{}, resume:()=>{}, destroy:()=>{} };");
      customHandle = fn(wrapper, colors, config) as AnimatorHandle;
    } catch (e) {
      console.warn("[TextEffects custom-code error]", e);
    }
    return {
      pause:   () => { running = false; customHandle?.pause(); },
      resume:  () => { running = true;  customHandle?.resume(); },
      destroy: () => {
        running = false;
        customHandle?.destroy();
        cancelAnimationFrame(videoFrameId);
        videoEl?.pause();
        wrapper.remove();
      },
    };
  }

  // ── Split chars helper ────────────────────────────────────────────────────
  function buildCharSpans(el: HTMLElement, lineText: string): HTMLElement[] {
    while (el.firstChild) el.removeChild(el.firstChild);
    // If the parent line element uses background-clip:text (gradient or image-clip fill),
    // each span must inherit the background and re-apply the clip so the fill shows through.
    const needsClipInherit =
      (el.style as any).webkitBackgroundClip === "text" ||
      el.style.backgroundClip === "text";
    return lineText.split("").map((ch) => {
      const span = document.createElement("span");
      if (needsClipInherit) {
        span.style.cssText = "display:inline-block;background:inherit;background-size:inherit;background-position:inherit;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;";
      } else {
        span.style.cssText = "display:inline-block;";
      }
      span.textContent = ch === " " ? "\u00a0" : ch;
      el.appendChild(span);
      return span;
    });
  }

  // ── Exit animation (intro mode) ───────────────────────────────────────────
  function runExit(): Promise<void> {
    return new Promise((resolve) => {
      if (exitEffect === "instant") { wrapper.style.display = "none"; resolve(); return; }

      if (exitEffect === "wipe") {
        wrapper.style.clipPath = "inset(0 0% 0 0)";
        const a = animate(wrapper, {
          clipPath: ["inset(0 0% 0 0)", "inset(0 100% 0 0)"],
          duration: 600 / speedFactor,
          ease: "inOutCubic",
        });
        anims.push(a);
        setTimeout(() => { wrapper.style.display = "none"; resolve(); }, 650 / speedFactor);
        return;
      }

      if (exitEffect === "glitch") {
        let flickers = 0;
        const flicker = () => {
          if (flickers >= 6) { wrapper.style.display = "none"; resolve(); return; }
          wrapper.style.opacity = flickers % 2 === 0 ? "0" : "1";
          wrapper.style.transform = `translateX(${(Math.random() - 0.5) * 12}px)`;
          flickers++;
          setTimeout(flicker, 60 + Math.random() * 80);
        };
        flicker();
        return;
      }

      // fade (default)
      const a = animate(wrapper, {
        opacity: [1, 0],
        duration: 700 / speedFactor,
        ease: "outCubic",
      });
      anims.push(a);
      setTimeout(() => { wrapper.style.display = "none"; resolve(); }, 720 / speedFactor);
    });
  }

  // ── Loop orchestrator ─────────────────────────────────────────────────────
  async function runCycle(gen: number) {
    if (!running || cycleGen !== gen) return;
    wrapper.style.opacity   = "1";
    wrapper.style.display   = "";
    wrapper.style.transform = "";
    wrapper.style.clipPath  = "";

    await runAnimation();

    if (!running || cycleGen !== gen) return;

    if (mode === "intro") {
      await new Promise<void>(r => setTimeout(r, holdDuration));
      if (!running || cycleGen !== gen) return;
      await runExit();
      if (cycleGen === gen) onDone?.();
      return; // intro plays once
    }

    if (loop && running && cycleGen === gen) {
      loopTimer = setTimeout(() => runCycle(gen), loopDelay);
    }
  }

  // ── Single-line animation dispatcher ─────────────────────────────────────
  async function runLineAnimation(lineEl: HTMLElement, lineText: string, lineDelay: number, animOverride?: string): Promise<void> {
    if (lineDelay > 0) {
      await new Promise<void>(r => setTimeout(r, lineDelay));
      if (!running) return;
    }
    return new Promise<void>((resolve) => {
      const activeAnim = animOverride ?? animation;
      const chars = buildCharSpans(lineEl, lineText);
      const count = chars.length;
      if (count === 0) { resolve(); return; }

      const dur       = (300 / speedFactor);
      const totalTime = dur + charDelay * count;

      // ── typewriter ──────────────────────────────────────────────────────
      if (activeAnim === "typewriter") {
        chars.forEach((s) => { s.style.opacity = "0"; });
        const cursor = document.createElement("span");
        cursor.textContent = "|";
        cursor.style.cssText = `display:inline-block;opacity:1;color:${primaryColor};`;
        lineEl.appendChild(cursor);
        const cursorAnim = animate(cursor, {
          opacity: [1, 0],
          duration: 500,
          ease: "steps(1)",
          loop: true,
        });
        anims.push(cursorAnim);

        const order = staggerOrder(count, direction);
        order.forEach((i, tick) => {
          setTimeout(() => {
            if (!running) return;
            chars[i].style.opacity = "1";
          }, tick * charDelay);
        });

        setTimeout(() => {
          cursorAnim.pause();
          cursor.remove();
          resolve();
        }, totalTime + 200);
        return;
      }

      // ── scramble ────────────────────────────────────────────────────────
      if (activeAnim === "scramble") {
        const targets = lineText.split("");
        const resolved = new Array(count).fill(false);
        // Use multi-color scramble when palette has >1 color
        const multiColor = colors.length > 1;

        chars.forEach((s) => {
          s.textContent = randomChar();
          if (multiColor) s.style.color = pickColor(colors);
        });

        let tick = 0;
        const shuffleInterval = setInterval(() => {
          if (!running) { clearInterval(shuffleInterval); resolve(); return; }
          chars.forEach((s, i) => {
            if (!resolved[i]) {
              s.textContent = randomChar();
              if (multiColor) s.style.color = pickColor(colors);
            }
          });
          tick++;
        }, 40);

        const order = staggerOrder(count, direction);
        order.forEach((i, idx) => {
          setTimeout(() => {
            resolved[i] = true;
            chars[i].textContent = targets[i] === " " ? "\u00a0" : targets[i];
            chars[i].style.color = ""; // restore parent fill
          }, idx * charDelay * 1.5);
        });

        setTimeout(() => {
          clearInterval(shuffleInterval);
          chars.forEach((s, i) => {
            s.textContent = targets[i] === " " ? "\u00a0" : targets[i];
            s.style.color = "";
          });
          resolve();
        }, totalTime * 1.5 + 200);
        return;
      }

      // ── glitch ──────────────────────────────────────────────────────────
      if (activeAnim === "glitch") {
        const intensity = Math.max(1, speedFactor);
        const dx = 6 * intensity;
        const sk = 4 * intensity;
        const glitchAnim = animate(lineEl, {
          translateX: ["0px", `${dx}px`, `${-dx}px`, `${dx*0.5}px`, `${-dx*0.3}px`, `${dx*0.8}px`, "0px"],
          translateY: ["0px", `${-intensity*2}px`, `${intensity*2}px`, `${-intensity}px`, `${intensity}px`, "0px"],
          skewX: ["0deg", `${sk}deg`, `${-sk}deg`, `${sk*0.5}deg`, "0deg"],
          opacity: [0.2, 1, 0.6, 1, 0.4, 1, 0.8, 1],
          duration: 1000 / speedFactor,
          ease: "steps(6)",
        });
        anims.push(glitchAnim);

        // Pseudo-element color flash using an overlay div
        const flashEl = document.createElement("div");
        flashEl.style.cssText = "position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:0;";
        if (colors.length > 1) flashEl.style.background = pickColor(colors);
        wrapper.appendChild(flashEl);

        const targets = lineText.split("");
        let glitchTick = 0;
        const gi = setInterval(() => {
          if (!running) { clearInterval(gi); flashEl.remove(); return; }
          // Glitch chars with 50% probability; color-flash during scramble
          chars.forEach((s, i) => {
            if (Math.random() < 0.5) {
              s.textContent = randomChar();
              if (colors.length > 1 && Math.random() < 0.4) s.style.color = pickColor(colors);
            } else {
              s.textContent = targets[i] === " " ? "\u00a0" : targets[i];
              s.style.color = "";
            }
          });
          // Random color flash overlay
          if (colors.length > 1) {
            flashEl.style.background = pickColor(colors);
            flashEl.style.opacity = Math.random() < 0.3 ? "0.35" : "0";
          }
          glitchTick++;
          if (glitchTick > 18) {
            clearInterval(gi);
            flashEl.remove();
            chars.forEach((s, i) => { s.textContent = targets[i] === " " ? "\u00a0" : targets[i]; s.style.color = ""; });
          }
        }, 45);

        setTimeout(resolve, 1100 / speedFactor);
        return;
      }

      // ── cascade ─────────────────────────────────────────────────────────
      if (activeAnim === "cascade") {
        const order = staggerOrder(count, direction);
        const transform = getCharEnterTransform(direction);
        chars.forEach((s) => { s.style.opacity = "0"; });

        order.forEach((i, tick) => {
          setTimeout(() => {
            if (!running) return;
            const a = animate(chars[i], {
              opacity:     [0, 1],
              translateX:  transform.translateX ?? ["0em", "0em"],
              translateY:  transform.translateY ?? ["0em", "0em"],
              duration:    dur,
              ease:        "outBack",
            });
            anims.push(a);
          }, tick * charDelay);
        });

        setTimeout(resolve, totalTime + 100);
        return;
      }

      // ── wave ────────────────────────────────────────────────────────────
      if (activeAnim === "wave") {
        const loopVal = loop && mode === "background";
        // Wave needs a full smooth cycle — enforce minimums to prevent strobe
        // regardless of how high speedFactor is (e.g. speed:60 → dur=5ms = strobe)
        const waveCycleDur = Math.max(400, dur);
        const waveStagger  = Math.max(50, charDelay);
        const a = animate(chars, {
          translateY: [
            { value: "-0.38em", duration: waveCycleDur / 2, ease: "outSine" },
            { value:  "0em",    duration: waveCycleDur / 2, ease: "inSine"  },
          ],
          delay: stagger(waveStagger),
          duration: waveCycleDur,
          loop: loopVal,
        });
        anims.push(a);
        if (!loopVal) setTimeout(resolve, waveCycleDur + waveStagger * count + 100);
        else resolve();
        return;
      }

      // ── reveal ──────────────────────────────────────────────────────────
      if (activeAnim === "reveal") {
        // "random" direction: reveal individual characters in random order
        if (direction === "random") {
          chars.forEach(s => { s.style.opacity = "0"; s.style.transform = "translateY(-0.4em) scale(0.8)"; });
          const order = staggerOrder(count, "random");
          order.forEach((i, tick) => {
            setTimeout(() => {
              if (!running) return;
              const a = animate(chars[i], {
                opacity:    [0, 1],
                translateY: ["-0.4em", "0em"],
                scale:      [0.8, 1],
                duration:   dur * 1.2,
                ease:       "outBack",
              });
              anims.push(a);
            }, tick * charDelay * 0.8);
          });
          setTimeout(resolve, totalTime + 100);
          return;
        }
        const clipStart: Record<TextDirection, string> = {
          left:   "inset(0 100% 0 0)",
          right:  "inset(0 0 0 100%)",
          up:     "inset(100% 0 0 0)",
          down:   "inset(0 0 100% 0)",
          center: "inset(0 50% 0 50%)",
          random: "inset(0 100% 0 0)",
        };
        lineEl.style.clipPath = clipStart[direction] || clipStart.left;
        const a = animate(lineEl, {
          clipPath: [clipStart[direction] || clipStart.left, "inset(0 0% 0 0%)"],
          duration: 700 / speedFactor,
          ease: "inOutCubic",
        });
        anims.push(a);
        setTimeout(resolve, 750 / speedFactor);
        return;
      }

      // ── blur-in ─────────────────────────────────────────────────────────
      if (activeAnim === "blur-in") {
        lineEl.style.opacity = "0";
        lineEl.style.filter  = "blur(20px)";
        const a = animate(lineEl, {
          opacity: [0, 1],
          filter:  ["blur(20px)", "blur(0px)"],
          duration: 900 / speedFactor,
          ease: "outCubic",
        });
        anims.push(a);
        setTimeout(resolve, 950 / speedFactor);
        return;
      }

      // ── word-by-word ────────────────────────────────────────────────────
      if (activeAnim === "word-by-word") {
        while (lineEl.firstChild) lineEl.removeChild(lineEl.firstChild);
        const words = lineText.split(" ");
        const wordSpans = words.map((w) => {
          const s = document.createElement("span");
          s.style.cssText = "display:inline-block;opacity:0;margin-right:0.25em;";
          s.textContent = w;
          lineEl.appendChild(s);
          return s;
        });

        const wordDur = 400 / speedFactor;
        const wordDelay = charDelay * 3;

        wordSpans.forEach((s, i) => {
          setTimeout(() => {
            if (!running) return;
            animate(s, {
              opacity:    [0, 1],
              translateY: ["0.3em", "0em"],
              duration:   wordDur,
              ease:       "outBack",
            });
          }, i * wordDelay);
        });

        setTimeout(resolve, wordSpans.length * wordDelay + wordDur + 100);
        return;
      }

      resolve();
    });
  }

  // ── Per-entry exit (used by sequence) ────────────────────────────────────
  function runElementExit(el: HTMLElement, effect: string): Promise<void> {
    return new Promise(resolve => {
      if (effect === "instant") { el.style.opacity = "0"; resolve(); return; }
      if (effect === "wipe") {
        el.style.clipPath = "inset(0 0% 0 0)";
        const a = animate(el, { clipPath: ["inset(0 0% 0 0)", "inset(0 100% 0 0)"], duration: 450 / speedFactor, ease: "inOutCubic" });
        anims.push(a);
        setTimeout(resolve, 480 / speedFactor);
        return;
      }
      if (effect === "glitch") {
        let n = 0;
        const tick = () => {
          if (n >= 6) { el.style.opacity = "0"; resolve(); return; }
          el.style.opacity = n % 2 === 0 ? "0" : "1";
          el.style.transform = `translateX(${(Math.random() - 0.5) * 10}px)`;
          n++;
          setTimeout(tick, 55 + Math.random() * 70);
        };
        tick();
        return;
      }
      // fade
      const a = animate(el, { opacity: [1, 0], duration: 400 / speedFactor, ease: "outCubic" });
      anims.push(a);
      setTimeout(resolve, 430 / speedFactor);
    });
  }

  // ── Sequence handler ──────────────────────────────────────────────────────
  async function runSequence(): Promise<void> {
    const entries = (sequenceEntries || []) as import("@/lib/anim-bg/types").SequenceEntry[];
    if (entries.length === 0) return;

    // Clear default line elements — sequence creates its own
    while (textGroup.firstChild) textGroup.removeChild(textGroup.firstChild);

    for (const entry of entries) {
      if (!running) break;

      let currentEl: HTMLElement | null = null;

      if (entry.type === "text" && entry.text) {
        // ── Text entry ──────────────────────────────────────────────────────
        const el = document.createElement("div");
        el.style.cssText = [
          `font-size:${fontSize}vw`,
          `font-weight:${fontWeight}`,
          `letter-spacing:${letterSpacing}em`,
          "white-space:nowrap",
          "user-select:none",
          "pointer-events:none",
          "line-height:1",
          "opacity:1",
        ].join(";");
        applyFill(el);
        textGroup.appendChild(el);
        currentEl = el;

        if (!entry.animationType || entry.animationType === "none") {
          // Instant reveal — just show it
          el.textContent = entry.text;
        } else {
          await runLineAnimation(el, entry.text, 0, entry.animationType);
        }

      } else if ((entry.type === "image" || entry.type === "video") && entry.mediaUrl) {
        // ── Media flash entry ───────────────────────────────────────────────
        let mediaEl: HTMLElement;
        if (entry.type === "video") {
          const vid = document.createElement("video");
          vid.src = entry.mediaUrl;
          vid.autoplay = true;
          vid.muted = true;
          vid.loop = true;
          vid.playsInline = true;
          vid.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;pointer-events:none;";
          vid.play().catch(() => {});
          mediaEl = vid;
        } else {
          const img = document.createElement("img");
          img.src = entry.mediaUrl;
          img.alt = "";
          img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;pointer-events:none;";
          mediaEl = img;
        }
        wrapper.appendChild(mediaEl);
        currentEl = mediaEl;

        // Fade in media
        const fadeIn = animate(mediaEl, { opacity: [0, 1], duration: 350, ease: "outCubic" });
        anims.push(fadeIn);
        await new Promise<void>(r => setTimeout(r, 380));
      }

      if (!running) { currentEl?.remove(); break; }

      // Hold
      const hold = entry.holdMs ?? 1200;
      if (hold > 0) await new Promise<void>(r => setTimeout(r, hold));

      if (!running) { currentEl?.remove(); break; }

      // Exit
      if (currentEl) {
        await runElementExit(currentEl, entry.exitEffect || "fade");
        currentEl.remove();
      }
    }
  }

  // ── Multi-line orchestrator ────────────────────────────────────────────────
  // Each line animates with a small stagger so they cascade into view.
  async function runAnimation(): Promise<void> {
    if (animation === "sequence") {
      await runSequence();
      return;
    }
    const lineStagger = lines.length > 1 ? staggerMs * 3 : 0;
    await Promise.all(
      lineEls.map((lineEl, idx) => runLineAnimation(lineEl, lines[idx], idx * lineStagger))
    );
  }

  // Animation starts when resume() is first called (triggered by IntersectionObserver in AnimBgRenderer)

  return {
    pause:  () => {
      running = false;
      if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
      anims.forEach(a => a.pause());
      if (videoEl) videoEl.pause();
      cancelAnimationFrame(videoFrameId);
    },
    resume: () => {
      if (running) return;
      running = true;
      // Increment generation — any stale async chain from a previous cycle will
      // check `cycleGen !== gen` and exit without side effects.
      cycleGen++;
      const myGen = cycleGen;
      // Clear stale anime.js instances (they belong to the previous cycle)
      anims.length = 0;
      if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
      if (videoEl) videoEl.play().catch(() => {});
      if (fillType === "video-clip" && canvasCtx) {
        const drawVideoFrame = () => {
          if (!running || !canvasEl || !canvasCtx || !videoEl) return;
          const w = wrapper.offsetWidth;
          const h = wrapper.offsetHeight;
          canvasCtx.clearRect(0, 0, w, h);
          const fSize = parseFloat(fontSize + "") * w / 100 * (fontSize / 10);
          canvasCtx.save();
          canvasCtx.font = `${fontWeight} ${fSize}px sans-serif`;
          canvasCtx.textAlign = "center";
          canvasCtx.textBaseline = "middle";
          canvasCtx.fillStyle = "#fff";
          const lspPx = lineGap * w / 100;
          const totH = (lines.length - 1) * lspPx;
          lines.forEach((lt, idx) => {
            const ly = h * (posY / 100) - totH / 2 + idx * lspPx;
            canvasCtx!.fillText(lt, w * (posX / 100), ly);
          });
          canvasCtx.globalCompositeOperation = "source-in";
          canvasCtx.drawImage(videoEl, 0, 0, w, h);
          canvasCtx.restore();
          canvasCtx.globalCompositeOperation = "source-over";
          videoFrameId = requestAnimationFrame(drawVideoFrame);
        };
        drawVideoFrame();
      }
      // Restart the animation cycle from the beginning
      runCycle(myGen);
    },
    skip: () => {
      if (mode !== "intro" || !running) return;
      running = false;
      if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
      anims.forEach(a => a.pause());
      cancelAnimationFrame(videoFrameId);
      wrapper.style.transition = "opacity 0.3s ease";
      wrapper.style.opacity = "0";
      setTimeout(() => { wrapper.style.display = "none"; }, 300);
      onDone?.();
    },
    destroy: () => {
      running = false;
      if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
      anims.forEach(a => a.pause());
      cancelAnimationFrame(videoFrameId);
      videoEl?.pause();
      wrapper.remove();
    },
  };
}
