/**
 * Shared scroll-triggered ENTRANCE observer (ONE SYSTEM PER CONCERN).
 *
 * Every "animate in when scrolled into view" trigger on public pages goes through
 * createEntranceObserver() + isEntranceVisible() instead of a raw IntersectionObserver
 * with `{ threshold: ENTRANCE_VISIBILITY_THRESHOLD }` and an `entry.isIntersecting` check.
 *
 * WHY THIS EXISTS (2026-09-30):
 * ENTRANCE_VISIBILITY_THRESHOLD (0.5) was first applied as a plain IntersectionObserver
 * `threshold`. intersectionRatio is measured against the TARGET's own box, so a target
 * that can never have half of its own box on screen at once never fires, and whatever it
 * gates stays at its pre-animation state (opacity:0 / counter "0") forever:
 *   - targets taller than 2 viewports: MotionElementRenderer observes the whole <section>;
 *     SectionTextOverlay and the full-bleed Volt frame (FullBleedVoltLayer → VoltRenderer)
 *     are inset:0 over the whole section — and multi-mode (grows to content / multiLimit
 *     screens), dynamic (N×100vh) and phone natural-height FLEXIBLE sections can all
 *     exceed 2 screens (app/globals.css [data-content-mode] + max-width:767px rules);
 *   - targets more than half clipped SIDEWAYS (wider than the viewport, or cropped by an
 *     overflow:hidden ancestor).
 * The previous per-site thresholds (0.08-0.3) only failed beyond ~3-12 screens.
 *
 * ASSUMPTIONS:
 * 1. Callers act only when isEntranceVisible(entry) is true; one-shot callers disconnect
 *    after acting (MotionElementRenderer and the "pulse" sub-element effect do not — they
 *    rely on the transition-only delivery below).
 * 2. The implicit root (the viewport) is the relevant root; #snap-container is 100vh, so
 *    rootBounds.height ≈ the snapport height.
 *
 * BEHAVIOUR vs the plain 0.5 threshold (never LATER for any target):
 * - Target no taller than the viewport and not clipped sideways: IDENTICAL — visible iff
 *   intersectionRatio >= 0.5 (the vertical-extent test reduces to the same ratio).
 * - Taller target: visible once its visible part covers half the viewport height.
 * - Sideways-clipped target: visible once half of its height is on screen.
 *
 * FAILURE MODES (residual):
 * - A target more than half clipped VERTICALLY by an ancestor (e.g. bleeding past a
 *   section's top/bottom edge) still never fires — same as the plain 0.5 threshold.
 * - A target taller than 100 viewports never crosses the 0.01 step → never fires.
 * - rootBounds null (cross-origin iframe root) → falls back to window.innerHeight.
 */
import { ENTRANCE_VISIBILITY_THRESHOLD } from "./animation-constants";

/**
 * Threshold steps for entrance observers. Includes ENTRANCE_VISIBILITY_THRESHOLD itself, so
 * ordinary targets get a callback at exactly the same 0.5 crossing as before, plus finer
 * steps below it so targets whose own ratio can never reach 0.5 still get callbacks while
 * they scroll in (a 3-screen section crosses 0.2 once 60% of the viewport is covered).
 */
export const ENTRANCE_OBSERVER_THRESHOLDS: readonly number[] = [
  0, 0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, ENTRANCE_VISIBILITY_THRESHOLD,
];

/** The subset of IntersectionObserverEntry the visibility test reads (keeps it unit-testable). */
export type EntranceEntry = Pick<
  IntersectionObserverEntry,
  "isIntersecting" | "intersectionRatio" | "intersectionRect" | "boundingClientRect" | "rootBounds"
>;

/**
 * True once the target counts as "scrolled into view" for an entrance animation:
 * its own intersectionRatio reaches ENTRANCE_VISIBILITY_THRESHOLD, OR its visible height
 * reaches that fraction of min(its own height, the root's height).
 */
export function isEntranceVisible(entry: EntranceEntry): boolean {
  if (!entry.isIntersecting) return false;
  if (entry.intersectionRatio >= ENTRANCE_VISIBILITY_THRESHOLD) return true;
  const rootHeight =
    entry.rootBounds?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0);
  const targetHeight = entry.boundingClientRect.height;
  const reachableHeight = rootHeight > 0 ? Math.min(targetHeight, rootHeight) : targetHeight;
  return entry.intersectionRect.height >= ENTRANCE_VISIBILITY_THRESHOLD * reachableHeight;
}

/**
 * Drop-in replacement for `new IntersectionObserver(callback, { threshold: ENTRANCE_VISIBILITY_THRESHOLD })`.
 *
 * The finer threshold list above produces a callback at every step; this forwards only a
 * target's FIRST observation and genuine isEntranceVisible() flips, so callers see the same
 * callback pattern the single 0.5 threshold produced (initial + each crossing), not one
 * per step. Callers must test isEntranceVisible(entry), not entry.isIntersecting.
 */
export function createEntranceObserver(callback: IntersectionObserverCallback): IntersectionObserver {
  const lastVisible = new WeakMap<Element, boolean>();
  return new IntersectionObserver(
    (entries, observer) => {
      const changed = entries.filter((entry) => {
        const visible = isEntranceVisible(entry);
        const previous = lastVisible.get(entry.target);
        lastVisible.set(entry.target, visible);
        return previous === undefined || previous !== visible;
      });
      if (changed.length > 0) callback(changed, observer);
    },
    { threshold: [...ENTRANCE_OBSERVER_THRESHOLDS] },
  );
}
