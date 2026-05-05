"use client";

import { useEffect, useRef } from "react";
import type { MotionElement } from "@/types/section";

interface MotionElementRendererProps {
  elements: MotionElement[];
  sectionId: string;
}

/**
 * MotionElementRenderer
 *
 * Renders parallax/motion overlay images on top of a section.
 * Z-index 20: above content (5), lower-third (10), below text anim (30).
 *
 * Animation modes:
 *  1. Scroll parallax  — passive scroll listener → translateY
 *  2. Entrance         — IntersectionObserver enter → anime.js tween
 *  3. Exit             — IntersectionObserver exit → anime.js tween
 *  4. Idle loop        — anime.js loop while section visible
 *
 * ASSUMPTIONS:
 * 1. Parent section has `id={sectionId}` on its DOM element
 * 2. anime.js 4.2 is installed (dynamic import)
 * 3. Each MotionElement has a unique `id`
 * 4. Parent section has position: relative (wrapSection in DynamicSection ensures this)
 *
 * FAILURE MODES:
 * - Section not found by id → animations silently skipped (no crash)
 * - Image element not in DOM → animations silently skipped
 * - anime.js import fails → silently falls back to no animation
 */
export default function MotionElementRenderer({ elements, sectionId }: MotionElementRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elements?.length) return;

    let animeLib: any = null;
    const cleanups: (() => void)[] = [];

    async function init() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let animeUtils: any = null;
      try {
        const animeModule = await import("animejs");
        animeLib = animeModule.animate;
        // animejs v4: utils.remove() replaces the old anime.remove() static method
        animeUtils = (animeModule as any).utils ?? null;
      } catch {
        return; // Graceful degradation if anime.js unavailable
      }

      const section = document.getElementById(sectionId);
      if (!section) return;

      elements.forEach((el) => {
        const imgEl = document.getElementById(`motion-el-${el.id}`) as HTMLElement | null;
        if (!imgEl) return;

        // ── 1. Scroll parallax (vertical + optional horizontal) ─────────────
        const hasVertParallax = el.parallax.enabled;
        const hasHorizParallax = el.horizontalParallax;
        if (hasVertParallax || hasHorizParallax) {
          const horizAmount = (el.horizontalParallaxAmount ?? 60) / 2;
          const onScroll = () => {
            const rect = section.getBoundingClientRect();
            const viewportH = window.innerHeight;
            const progress = 1 - (rect.top + rect.height) / (viewportH + rect.height);
            const ty = hasVertParallax ? progress * rect.height * el.parallax.speed : 0;
            const tx = hasHorizParallax ? (progress - 0.5) * horizAmount * 2 : 0;
            imgEl.style.transform = `translateX(${tx}px) translateY(${ty}px)`;
          };
          const scrollEl = document.getElementById("snap-container") || window as unknown as HTMLElement;
          (scrollEl as HTMLElement).addEventListener("scroll", onScroll, { passive: true });
          cleanups.push(() => (scrollEl as HTMLElement).removeEventListener("scroll", onScroll));
          onScroll();
        }

        // ── 2 & 3. Entrance / Exit via IntersectionObserver ─────────────────
        const directionOffset: Record<string, { x?: number; y?: number }> = {
          top: { y: -1 },
          bottom: { y: 1 },
          left: { x: -1 },
          right: { x: 1 },
        };

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                // Entrance animation — animejs v4: animate(target, options)
                if (el.entrance.enabled && animeLib) {
                  const dir = directionOffset[el.entrance.direction] ?? {};
                  const targetOpacity = (el.opacity ?? 100) / 100;
                  animeLib(imgEl, {
                    translateX: dir.x ? [dir.x * el.entrance.distance, 0] : [0, 0],
                    translateY: dir.y ? [dir.y * el.entrance.distance, 0] : [0, 0],
                    opacity: [0, targetOpacity],
                    duration: el.entrance.duration,
                    delay: el.entrance.delay,
                    ease: el.entrance.easing || "outCubic",
                  });
                }
                // Idle loop
                if (el.idle.enabled && animeLib) {
                  const idleParams: Record<string, object> = {
                    float: { translateY: [`-${el.idle.amplitude}px`, `${el.idle.amplitude}px`] },
                    bob: { translateY: [0, `-${el.idle.amplitude}px`] },
                    rotate: { rotate: `+=${el.idle.amplitude}` },
                    pulse: { scale: [1, 1 + el.idle.amplitude / 100] },
                    sway: { rotateZ: [`-${el.idle.amplitude}deg`, `${el.idle.amplitude}deg`] },
                  };
                  animeLib(imgEl, {
                    ...(idleParams[el.idle.type] ?? idleParams.float),
                    duration: Math.max(500, 2000 / el.idle.speed),
                    loop: true,
                    alternate: true,
                    ease: "inOutSine",
                  });
                }
              } else {
                // Exit animation
                if (el.exit.enabled && animeLib) {
                  const dir = directionOffset[el.exit.direction] ?? {};
                  animeLib(imgEl, {
                    translateX: dir.x ? [0, dir.x * el.exit.distance] : [0, 0],
                    translateY: dir.y ? [0, dir.y * el.exit.distance] : [0, 0],
                    opacity: [1, 0],
                    duration: el.exit.duration,
                    ease: "inCubic",
                  });
                }
                // Stop idle — animejs v4: utils.remove(target)
                if (el.idle.enabled && animeUtils) {
                  try { animeUtils.remove(imgEl); } catch { /* graceful */ }
                }
              }
            });
          },
          { threshold: 0.1 }
        );

        observer.observe(section);
        cleanups.push(() => observer.disconnect());
      });
    }

    init();

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [elements, sectionId]);

  if (!elements?.length) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {elements.map((el) => {
        const elType = el.type || "image";
        const layerZIndex: Record<string, number> = {
          "behind": 5,
          "above-lower-third": 15,
          "above-content": 25,
        };
        const zIndex = el.layer ? (layerZIndex[el.layer] ?? 5) : (el.zIndex ?? 5);
        const opacity = el.entrance.enabled ? 0 : (el.opacity ?? 100) / 100;

        const filterCss = el.filterPreset === "silhouette"
          ? "grayscale(1) brightness(2) contrast(2.5)"
          : el.filterPreset === "custom"
          ? (el.customFilter || "none")
          : "none";

        const commonStyle: React.CSSProperties = {
          position: "absolute",
          top: el.top,
          left: el.left,
          right: el.right,
          bottom: el.bottom,
          width: el.width,
          zIndex,
          opacity,
          ...(filterCss !== "none" ? { filter: filterCss } : {}),
          ...(el.mixBlendMode ? { mixBlendMode: el.mixBlendMode } : {}),
        };

        if (elType === "video") {
          return (
            <video
              key={el.id}
              id={`motion-el-${el.id}`}
              src={el.src}
              autoPlay
              loop
              muted
              playsInline
              style={{
                ...commonStyle,
                height: "auto",
                aspectRatio: "9/16",
                objectFit: "cover",
              }}
            />
          );
        }

        // image (default) and volt both render as <img>
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={el.id}
            id={`motion-el-${el.id}`}
            src={el.src}
            alt={el.alt || ""}
            style={{
              ...commonStyle,
              height: "auto",
            }}
          />
        );
      })}
    </div>
  );
}
