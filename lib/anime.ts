/**
 * Anime.js Animation Utilities
 *
 * Centralized animation helpers using Anime.js for all UI animations
 * Replaces Framer Motion for lightweight, performant animations
 */

import anime from "animejs/lib/anime.es.js";

// Standard easing used throughout the app
export const STANDARD_EASING = "cubicBezier(0.4, 0, 0.2, 1)"; // easeInOutCubic
export const STANDARD_DURATION = 600; // milliseconds

/**
 * Shared IntersectionObserver `threshold` for every ONE-SHOT scroll-triggered
 * entrance animation (text/heading reveals, stat counters, Volt entrance/timeline
 * effects, motion-element entrances, etc.) across the CMS.
 *
 * ASSUMPTIONS:
 * 1. Public pages scroll inside `#snap-container` with CSS scroll-snap
 *    (`scroll-snap-align: start`, `scroll-snap-stop: always`, `scroll-behavior:
 *    smooth` — see app/globals.css). Each section transitions from ~0% to
 *    ~100% visible in a single fast native scroll (roughly 300-500ms), not a
 *    slow continuous scroll.
 * 2. Every call site using this constant disconnects its observer after the
 *    first qualifying entry (one-shot) — this value is not meant for
 *    continuous/looping or exit-triggered observers, which have different
 *    timing needs and should keep their own threshold.
 *
 * FAILURE MODES THIS PREVENTS:
 * - A low threshold (this codebase previously used values between 0 and 0.3
 *   at different call sites) is calibrated for a normal continuously-scrolling
 *   page, where "10-30% visible" means "the user is starting to scroll past
 *   it". On a scroll-snap page it instead means "the snap transition just
 *   began" — the entrance animation fires and often finishes WHILE the
 *   section is still sliding into place, so by the time the snap settles the
 *   user never actually sees it play (reported live bug, 2026-09-29).
 *
 * VALIDATION:
 * - 0.5 keeps the animation from starting until the section is at least half
 *   snapped into view (comfortably past the transition's midpoint, i.e. the
 *   user is already "in the process of scrolling into it"), while staying
 *   safely below 1.0 — a 100vh section can fail to ever report an exact 1.0
 *   intersectionRatio on some zoom/DPR combinations due to sub-pixel
 *   rounding, which would otherwise mean the entrance never fires at all.
 */
export const ENTRANCE_VISIBILITY_THRESHOLD = 0.5;

/**
 * Fade In Animation
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function fadeIn(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [0, 1],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Fade Out Animation
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function fadeOut(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [1, 0],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Slide Up Animation
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function slideUp(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Slide Down Animation
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function slideDown(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [0, 1],
    translateY: [-20, 0],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Slide In From Left
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function slideInLeft(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [0, 1],
    translateX: [-30, 0],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Slide In From Right
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function slideInRight(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [0, 1],
    translateX: [30, 0],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Scale In (Zoom In) Animation
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function scaleIn(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Scale Out (Zoom Out) Animation
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function scaleOut(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    opacity: [1, 0],
    scale: [1, 0.9],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Stagger Animation
 * Animate multiple elements with a delay between each
 * @param target - CSS selector or NodeList
 * @param animation - Animation function
 * @param staggerDelay - Delay between each element (ms)
 */
export function staggerAnimation(
  target: string | NodeListOf<HTMLElement>,
  animation: "fadeIn" | "slideUp" | "slideInLeft" | "slideInRight" | "scaleIn",
  staggerDelay: number = 100
) {
  const animations = {
    fadeIn: { opacity: [0, 1] },
    slideUp: { opacity: [0, 1], translateY: [20, 0] },
    slideInLeft: { opacity: [0, 1], translateX: [-30, 0] },
    slideInRight: { opacity: [0, 1], translateX: [30, 0] },
    scaleIn: { opacity: [0, 1], scale: [0.9, 1] },
  };

  return anime({
    targets: target,
    ...animations[animation],
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    delay: anime.stagger(staggerDelay),
  });
}

/**
 * Scroll-Triggered Animation
 * Animate elements when they enter the viewport
 * @param target - CSS selector
 * @param animation - Animation type
 * @param threshold - Intersection threshold (0-1)
 */
export function scrollTrigger(
  target: string,
  animation: "fadeIn" | "slideUp" | "slideInLeft" | "slideInRight" | "scaleIn",
  threshold: number = 0.1
) {
  const elements = document.querySelectorAll(target);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const animations = {
            fadeIn: () => fadeIn(entry.target as HTMLElement),
            slideUp: () => slideUp(entry.target as HTMLElement),
            slideInLeft: () => slideInLeft(entry.target as HTMLElement),
            slideInRight: () => slideInRight(entry.target as HTMLElement),
            scaleIn: () => scaleIn(entry.target as HTMLElement),
          };

          animations[animation]();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold }
  );

  elements.forEach((el) => {
    // Set initial state
    (el as HTMLElement).style.opacity = "0";
    observer.observe(el);
  });

  return observer;
}

/**
 * Bounce Animation (for buttons, interactive elements)
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function bounce(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    translateY: [0, -10, 0],
    duration: 600,
    easing: "easeInOutQuad",
    ...options,
  });
}

/**
 * Pulse Animation (for notifications, badges)
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function pulse(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    scale: [1, 1.1, 1],
    duration: 800,
    easing: "easeInOutQuad",
    loop: true,
    ...options,
  });
}

/**
 * Shake Animation (for error states)
 * @param target - CSS selector or DOM element
 * @param options - Animation options
 */
export function shake(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    translateX: [0, -10, 10, -10, 10, 0],
    duration: 500,
    easing: "easeInOutQuad",
    ...options,
  });
}

/**
 * Rotate Animation
 * @param target - CSS selector or DOM element
 * @param degrees - Rotation angle
 * @param options - Animation options
 */
export function rotate(
  target: string | HTMLElement | NodeListOf<HTMLElement>,
  degrees: number = 360,
  options?: anime.AnimeParams
) {
  return anime({
    targets: target,
    rotate: degrees,
    duration: STANDARD_DURATION,
    easing: STANDARD_EASING,
    ...options,
  });
}

/**
 * Timeline for complex sequential animations
 * @returns Anime.js timeline instance
 */
export function createTimeline(options?: anime.AnimeParams) {
  return anime.timeline({
    easing: STANDARD_EASING,
    duration: STANDARD_DURATION,
    ...options,
  });
}

/**
 * Stop all running animations on a target
 * @param target - CSS selector or DOM element
 */
export function stopAnimations(target: string | HTMLElement | NodeListOf<HTMLElement>) {
  const runningAnimations = anime.running;
  runningAnimations.forEach((animation: any) => {
    const animTargets = animation.animatables.map((a: any) => a.target);
    const targetElements = typeof target === "string" ? document.querySelectorAll(target) : [target];

    targetElements.forEach((el) => {
      if (animTargets.includes(el)) {
        animation.pause();
      }
    });
  });
}
