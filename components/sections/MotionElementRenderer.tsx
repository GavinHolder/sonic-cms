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
      try {
        const animeModule = await import("animejs");
        animeLib = animeModule.animate;
      } catch {
        return; // Graceful degradation if anime.js unavailable
      }

      const section = document.getElementById(sectionId);
      if (!section) return;

      elements.forEach((el) => {
        const imgEl = document.getElementById(`motion-el-${el.id}`) as HTMLElement | null;
        if (!imgEl) return;

        // ── 1. Scroll parallax ───────────────────────────────────────────────
        if (el.parallax.enabled) {
          const onScroll = () => {
            const rect = section.getBoundingClientRect();
            const viewportH = window.innerHeight;
            // Progress: 0 when section top is at bottom of viewport, 1 when section bottom is at top
            const progress = 1 - (rect.top + rect.height) / (viewportH + rect.height);
            const offset = progress * rect.height * el.parallax.speed;
            imgEl.style.transform = `translateY(${offset}px)`;
          };
          window.addEventListener("scroll", onScroll, { passive: true });
          cleanups.push(() => window.removeEventListener("scroll", onScroll));
          onScroll(); // Apply initial position
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
                // Entrance animation
                if (el.entrance.enabled && animeLib) {
                  const dir = directionOffset[el.entrance.direction] ?? {};
                  animeLib({
                    targets: imgEl,
                    translateX: dir.x ? [dir.x * el.entrance.distance, 0] : [0, 0],
                    translateY: dir.y ? [dir.y * el.entrance.distance, 0] : [0, 0],
                    opacity: [0, 1],
                    duration: el.entrance.duration,
                    delay: el.entrance.delay,
                    easing: el.entrance.easing || "easeOutCubic",
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
                  animeLib({
                    targets: imgEl,
                    ...(idleParams[el.idle.type] ?? idleParams.float),
                    duration: Math.max(500, 2000 / el.idle.speed),
                    loop: true,
                    direction: "alternate",
                    easing: "easeInOutSine",
                  });
                }
              } else {
                // Exit animation
                if (el.exit.enabled && animeLib) {
                  const dir = directionOffset[el.exit.direction] ?? {};
                  animeLib({
                    targets: imgEl,
                    translateX: dir.x ? [0, dir.x * el.exit.distance] : [0, 0],
                    translateY: dir.y ? [0, dir.y * el.exit.distance] : [0, 0],
                    opacity: [1, 0],
                    duration: el.exit.duration,
                    easing: "easeInCubic",
                  });
                }
                // Stop idle
                if (el.idle.enabled && animeLib) {
                  animeLib.remove(imgEl);
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
      // Cancel any running anime instances
      if (animeLib) {
        elements.forEach((el) => {
          const imgEl = document.getElementById(`motion-el-${el.id}`);
          if (imgEl) animeLib.remove(imgEl);
        });
      }
    };
  }, [elements, sectionId]);

  if (!elements?.length) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {elements.map((el) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={el.id}
          id={`motion-el-${el.id}`}
          src={el.src}
          alt={el.alt || ""}
          style={{
            position: "absolute",
            top: el.top,
            left: el.left,
            right: el.right,
            bottom: el.bottom,
            width: el.width,
            height: "auto",
            zIndex: el.zIndex ?? 20,
            // Start hidden if entrance animation is enabled
            opacity: el.entrance.enabled ? 0 : 1,
          }}
        />
      ))}
    </div>
  );
}
