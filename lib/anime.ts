/**
 * Anime.js Animation Utilities
 *
 * Centralized animation helpers using Anime.js for all UI animations
 * Replaces Framer Motion for lightweight, performant animations
 */

import anime from "animejs/lib/anime.es.js";

// Re-exported for backward compatibility with any existing `@/lib/anime`
// consumer — actual values live in lib/animation-constants.ts, which has no
// animejs import so it's safe for code that gets bundled into the server/
// homepage graph. See that file for why this split exists.
export { STANDARD_EASING, STANDARD_DURATION, ENTRANCE_VISIBILITY_THRESHOLD } from "./animation-constants";
import { STANDARD_EASING, STANDARD_DURATION } from "./animation-constants";

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
