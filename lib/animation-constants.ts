/**
 * Animation constants with no runtime dependency on the `animejs` package.
 *
 * Split out of lib/anime.ts so that server-bundled code (anything reachable
 * from app/page.tsx, e.g. SectionTextOverlay.tsx -> DynamicSection.tsx ->
 * HomepageClient.tsx) can use ENTRANCE_VISIBILITY_THRESHOLD without pulling
 * in lib/anime.ts's top-level `import anime from "animejs/lib/anime.es.js"`
 * — that deep path doesn't exist in the installed animejs 4.2.2 (v3-only
 * package layout; v4 only ships `dist/`), so Turbopack's production build
 * fails wherever it gets bundled. Nothing in this codebase currently uses
 * lib/anime.ts's anime-dependent helpers (fadeIn/slideUp/etc. — confirmed
 * via a repo-wide import search), only this threshold constant, which never
 * needed the animejs import in the first place.
 */

// Standard easing/duration used by lib/anime.ts's Anime.js helpers.
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
 *
 * Apply it via lib/entrance-observer.ts (createEntranceObserver + isEntranceVisible),
 * never as a raw IntersectionObserver threshold - see that file for why.
 */
export const ENTRANCE_VISIBILITY_THRESHOLD = 0.5;
