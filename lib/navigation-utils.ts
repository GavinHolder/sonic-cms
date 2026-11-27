/**
 * Navigation utility functions for smooth scrolling between sections
 */

// Global flag to prevent useScrollSnap from interfering during programmatic navigation
let isNavigating = false;

/**
 * Check if programmatic navigation is in progress
 */
export const getIsNavigating = (): boolean => isNavigating;

/**
 * Scroll to a specific section by ID
 * Uses #snap-container as the scroll container (matches the snap system).
 * Falls back to window.scrollTo for non-snap pages (admin, etc.).
 */
export const scrollToSection = (sectionId: string): void => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  isNavigating = true;

  const container = document.getElementById("snap-container");

  if (container) {
    // Snap container mode: scroll within the container
    const elementTop = (element as HTMLElement).offsetTop;
    container.scrollTo({ top: elementTop, behavior: "smooth" });
  } else {
    // Fallback: standard window scroll
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elementTop, behavior: "smooth" });
  }

  // Clear navigation flag after scroll completes
  setTimeout(() => {
    isNavigating = false;
  }, 1000);
};

/**
 * Resolve a URL "#hash" to a SECTION ROOT inside #snap-container, or null.
 * The hash is untrusted input: it is only ever used as an id lookup
 * (getElementById), never as a selector string.
 *
 * Only section roots qualify, not any element that happens to carry an id
 * (form fields, motion elements, ...). There is no single marker shared by every
 * root, so the three real shapes are accepted: `.cms-section` (all content
 * sections), `.hero-carousel` (HeroCarousel root) and the `<footer>` section root.
 */
export const findHashSection = (hash: string): HTMLElement | null => {
  if (hash.length < 2 || hash[0] !== "#") return null;
  let id = "";
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  if (!id) return null;
  const container = document.getElementById("snap-container");
  const element = document.getElementById(id);
  if (!container || !element || element === container || !container.contains(element)) return null;
  const isSectionRoot =
    element.classList.contains("cms-section") ||
    element.classList.contains("hero-carousel") ||
    element.tagName === "FOOTER";
  return isSectionRoot ? element : null;
};

/**
 * Scroll to the section named by a URL "#hash" once it exists in the DOM.
 *
 * Needed because a page that LOADS with a #section hash stays on the hero: the
 * layout resets #snap-container to the top on mount / route change, and sections
 * can mount after the browser's own fragment scroll has already run.
 *
 * ASSUMPTIONS:
 * 1. Section roots carry id={section.id} and live inside #snap-container.
 * 2. Called from an effect, so the first attempt (next task) runs after the
 *    layout's own scroll-to-top resets.
 *
 * FAILURE MODES:
 * - No hash / malformed hash / no matching section → nothing happens (gives up after timeoutMs).
 * - User starts interacting while we wait → cancelled, so it never fights the user.
 * - Section inside a positioned wrapper (Lower Third / Motion Elements wrapSection,
 *   ScrollStageWrapper) → offsetTop would be wrapper-relative, so the target is
 *   measured against the container with getBoundingClientRect instead.
 * - Scrolls at most once per call; the returned function cancels a pending attempt.
 */
export const scrollToHashSectionWhenReady = (
  hash: string,
  { intervalMs = 100, timeoutMs = 8000 }: { intervalMs?: number; timeoutMs?: number } = {},
): (() => void) => {
  if (hash.length < 2) return () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;
  let waited = 0;
  let stopped = false;
  const userEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    userEvents.forEach((type) => window.removeEventListener(type, stop));
  };

  const attempt = (): void => {
    if (stopped) return;
    const element = findHashSection(hash);
    const container = document.getElementById("snap-container");
    if (element && container) {
      stop();
      const top =
        container.scrollTop + element.getBoundingClientRect().top - container.getBoundingClientRect().top;
      // Same navigation guard scrollToSection() raises, so useScrollSnap stays out of the way.
      isNavigating = true;
      container.scrollTo({ top, behavior: "smooth" });
      setTimeout(() => {
        isNavigating = false;
      }, 1000);
      return;
    }
    if (waited >= timeoutMs) {
      stop();
      return;
    }
    waited += intervalMs;
    timer = setTimeout(attempt, intervalMs);
  };

  userEvents.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  timer = setTimeout(attempt, 0);
  return stop;
};

/**
 * Scroll to the top of the page (hero section)
 */
export const scrollToTop = (): void => {
  const container = document.getElementById("snap-container");
  if (container) {
    container.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

/**
 * Scroll up one section
 */
export const scrollUpOneSection = (
  currentSection: number,
  sections: string[],
): void => {
  if (currentSection > 0) {
    scrollToSection(sections[currentSection - 1]);
  }
};
