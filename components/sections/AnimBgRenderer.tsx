"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimBgConfig, AnimBgLayer, AnimatorHandle } from "@/lib/anim-bg/types";
import { DEFAULT_FALLBACK_COLORS } from "@/lib/anim-bg/defaults";

interface AnimBgRendererProps {
  config: AnimBgConfig;
  colorPalette?: string[];
  /** Pass either a React ref OR a section element ID — one of the two is required */
  sectionRef?: React.RefObject<HTMLElement | null>;
  sectionId?: string;
  /** Section background value (hex, preset name, or "gradient") — used to auto-correct bad blend modes */
  sectionBackground?: string;
}

type BgLuminance = "light" | "dark" | "mid" | "gradient" | "unknown";

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

/** Auto-correct blend modes that are invisible on the current background */
function getEffectiveBlendMode(mode: string, bgLum: BgLuminance): string {
  if (mode === "screen" && bgLum === "light") return "normal";
  if (mode === "multiply" && bgLum === "dark") return "normal";
  return mode;
}

export default function AnimBgRenderer({ config, colorPalette, sectionRef, sectionId, sectionBackground }: AnimBgRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handlesRef   = useRef<AnimatorHandle[]>([]);
  const [showSkip, setShowSkip] = useState(false);

  // ── Intro blocker: derived synchronously from config so it renders immediately
  // (before the async animator import resolves), preventing a flash of section content.
  const introLayer = useMemo(() => {
    if (!config?.enabled) return null;
    return (config.layers || []).find(
      l => l.enabled && l.type === "text-effects" && (l.config as { mode?: string })?.mode === "intro"
    ) ?? null;
  }, [config]);

  const [introCompleted, setIntroCompleted] = useState(false);

  // Reset intro blocker whenever the intro layer config changes
  useEffect(() => {
    if (introLayer) setIntroCompleted(false);
  }, [introLayer]);

  useEffect(() => {
    if (!config?.enabled || !containerRef.current) return;

    const activeLayers = (config.layers || []).filter((layer) => layer.enabled);

    if (activeLayers.length === 0) return;

    const handles: AnimatorHandle[] = [];
    handlesRef.current = handles;
    const bgLum = parseBgLuminance(sectionBackground);

    // Show skip button if any layer is text-effects intro mode
    const introLayers = activeLayers.filter(
      l => l.type === "text-effects" && (l.config as { mode?: string })?.mode === "intro"
    );
    if (introLayers.length > 0) setShowSkip(true);

    // Track current visibility — used after async imports resolve to decide start/pause
    let sectionVisible = false;

    const resolveColors = (layer: AnimBgLayer): string[] => {
      if (layer.useColorPalette) {
        return colorPalette?.length ? colorPalette : DEFAULT_FALLBACK_COLORS;
      }
      return layer.colors?.length ? layer.colors : DEFAULT_FALLBACK_COLORS;
    };

    const mountLayer = async (layer: AnimBgLayer, layerEl: HTMLElement) => {
      const colors = resolveColors(layer);
      const { config: layerConfig } = layer;
      let handle: AnimatorHandle | null = null;
      const { type } = layer;

      if (type === "floating-shapes") {
        const { floatingShapesAnimator } = await import("@/lib/anim-bg/animators");
        handle = floatingShapesAnimator(layerEl, layerConfig as Parameters<typeof floatingShapesAnimator>[1], colors);
      } else if (type === "moving-gradient") {
        const { movingGradientAnimator } = await import("@/lib/anim-bg/animators");
        handle = movingGradientAnimator(layerEl, layerConfig as Parameters<typeof movingGradientAnimator>[1], colors);
      } else if (type === "particle-field") {
        const { particleFieldAnimator } = await import("@/lib/anim-bg/animators");
        handle = particleFieldAnimator(layerEl, layerConfig as Parameters<typeof particleFieldAnimator>[1], colors);
      } else if (type === "waves") {
        const { wavesAnimator } = await import("@/lib/anim-bg/animators");
        handle = wavesAnimator(layerEl, layerConfig as Parameters<typeof wavesAnimator>[1], colors);
      } else if (type === "parallax-drift") {
        const { parallaxDriftAnimator } = await import("@/lib/anim-bg/animators");
        const snapEl = document.getElementById("snap-container") || document.documentElement;
        handle = parallaxDriftAnimator(layerEl, layerConfig as Parameters<typeof parallaxDriftAnimator>[1], colors, snapEl as HTMLElement);
      } else if (type === "3d-tilt") {
        const { tiltAnimator } = await import("@/lib/anim-bg/animators");
        const sectionEl = sectionRef?.current || (sectionId ? document.getElementById(sectionId) : null) || layerEl;
        handle = tiltAnimator(layerEl, layerConfig as Parameters<typeof tiltAnimator>[1], sectionEl);
      } else if (type === "3d-scene") {
        const { threeDSceneAnimator } = await import("@/lib/anim-bg/animators");
        handle = threeDSceneAnimator(layerEl, layerConfig as Parameters<typeof threeDSceneAnimator>[1]);
      } else if (type === "custom-code") {
        const { customCodeAnimator } = await import("@/lib/anim-bg/animators");
        handle = customCodeAnimator(layerEl, layerConfig as Parameters<typeof customCodeAnimator>[1]);
      } else if (type === "svg-animation") {
        const { svgAnimationAnimator } = await import("@/lib/anim-bg/animators");
        handle = svgAnimationAnimator(layerEl, layerConfig as Parameters<typeof svgAnimationAnimator>[1], colors);
      } else if (type === "text-effects") {
        const { textEffectsAnimator } = await import("@/lib/anim-bg/animators");
        const sectionEl = sectionRef?.current || (sectionId ? document.getElementById(sectionId) : null);
        const isIntro = (layerConfig as { mode?: string })?.mode === "intro";

        // Support textItems array — multiple independent animated text elements
        // in one layer, each with its own position, animation type, fill, and font.
        // textItems fields use legacy names: animationType, x, y, fillImageUrl.
        const textItems = (layerConfig as any)?.textItems;
        if (Array.isArray(textItems) && textItems.length > 0) {
          for (const item of textItems) {
            const itemConfig = {
              mode: (layerConfig as any).mode || "background",
              text:          item.text          ?? "",
              animation:     item.animationType ?? item.animation ?? "typewriter",
              posX:          item.x             ?? item.posX      ?? 50,
              posY:          item.y             ?? item.posY      ?? 50,
              fontSize:      item.fontSize      ?? 8,
              fontWeight:    String(item.fontWeight ?? "700"),
              letterSpacing: item.letterSpacing ?? 0.05,
              direction:     item.direction     ?? "random",
              fillType:      item.fillType      ?? "solid",
              fillColor:     item.fillColor     ?? "",
              fillGradient:  item.fillGradient  ?? "",
              fillMediaUrl:  item.fillImageUrl  ?? item.fillMediaUrl ?? "",
              speed:         item.speed         ?? 50,
              stagger:       item.stagger       ?? 30,
              loop:          item.loop          !== false,
              loopDelay:     item.loopDelay     ?? 800,
            };
            const h = textEffectsAnimator(layerEl, itemConfig as Parameters<typeof textEffectsAnimator>[1], colors, sectionEl);
            if (h) {
              handles.push(h);
              h.pause();
              if (sectionVisible) h.resume();
            }
          }
          return; // all sub-handles already pushed — skip the single-handle block below
        }

        handle = textEffectsAnimator(
          layerEl,
          layerConfig as Parameters<typeof textEffectsAnimator>[1],
          colors,
          sectionEl,
          isIntro ? () => { setShowSkip(false); setIntroCompleted(true); } : undefined
        );
      }

      if (handle) {
        handles.push(handle);
        // ALWAYS start paused — only resume if section is currently visible.
        // This prevents animations from firing off-screen on page load and
        // completing/looping before the user scrolls to the section.
        handle.pause();
        if (sectionVisible) handle.resume();
      }
    };

    // ── IntersectionObserver setup ──────────────────────────────────────────
    // IMPORTANT: Set up BEFORE mounting layers so sectionVisible is correct
    // when the async mountLayer calls resolve.
    let observer: IntersectionObserver | null = null;
    const observeTarget = sectionRef?.current || (sectionId ? document.getElementById(sectionId) : null);

    if (observeTarget) {
      // Initialise visibility from current bounding box
      const rect = observeTarget.getBoundingClientRect();
      sectionVisible = rect.top < window.innerHeight && rect.bottom > 0;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            sectionVisible = entry.isIntersecting;
            if (entry.isIntersecting) {
              handles.forEach(h => h.resume());
            } else {
              handles.forEach(h => h.pause());
            }
          });
        },
        // 90% visible = section has snapped fully into view (not just partially scrolled in)
        { threshold: 0.9 }
      );
      observer.observe(observeTarget);
    } else {
      // No observe target available — assume visible so animations play
      sectionVisible = true;
    }

    // ── Mount layers (async dynamic imports) ───────────────────────────────
    const layerEls: HTMLElement[] = [];

    activeLayers.forEach((layer, idx) => {
      const layerEl = document.createElement("div");
      const effectiveBlend = getEffectiveBlendMode(layer.blendMode || "normal", bgLum);
      layerEl.style.cssText = [
        "position:absolute",
        "inset:0",
        `z-index:${idx + 1}`,
        `opacity:${layer.opacity / 100}`,
        `mix-blend-mode:${effectiveBlend}`,
        "pointer-events:none",
        "overflow:hidden",
      ].join(";");
      containerRef.current!.appendChild(layerEl);
      layerEls.push(layerEl);
      mountLayer(layer, layerEl);
    });

    return () => {
      handles.forEach(h => h.destroy());
      layerEls.forEach(el => el.remove());
      observer?.disconnect();
      handlesRef.current = [];
      setShowSkip(false);
    };
  }, [config, colorPalette, sectionRef, sectionId, sectionBackground]);

  if (!config?.enabled) return null;

  const overlayStyle: React.CSSProperties = config.overlayOpacity > 0 ? {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    background: config.overlayColor || "#000000",
    opacity: config.overlayOpacity / 100,
    pointerEvents: "none",
  } : {};

  // Intro blocker background color
  const introBg = introLayer ? ((introLayer.config as { introBgColor?: string })?.introBgColor || "#000000") : "#000000";

  return (
    <>
      {/* Synchronous intro blocker — renders immediately (before async import) to
          prevent a flash of section content while the animator loads. Stays visible
          until the intro animation signals completion via onDone. */}
      {introLayer && !introCompleted && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            background: introBg,
            pointerEvents: "none",
          }}
        />
      )}

      <div
        ref={containerRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}
      />
      {config.overlayOpacity > 0 && (
        <div aria-hidden="true" style={overlayStyle} />
      )}
      {showSkip && (
        <button
          onClick={() => {
            handlesRef.current.forEach(h => h.skip?.());
            setShowSkip(false);
            setIntroCompleted(true);
          }}
          style={{
            position: "absolute",
            bottom: "24px",
            right: "24px",
            zIndex: 30,
            padding: "8px 18px",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "6px",
            fontSize: "13px",
            fontFamily: "inherit",
            letterSpacing: "0.05em",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            pointerEvents: "all",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.75)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.55)")}
          aria-label="Skip intro"
        >
          Skip Intro ⏭
        </button>
      )}
    </>
  );
}
