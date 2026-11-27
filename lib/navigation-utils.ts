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
 * Remove a "#<section id>" from the address bar once it has done its job, so a reload
 * starts at the top of the page instead of jumping back to that section.
 *
 * ASSUMPTIONS:
 * 1. Called AFTER the scroll to the section was started (by the browser, by
 *    scrollToSection, or by scrollToHashSectionWhenReady). It never scrolls itself.
 * 2. history.replaceState changes only the URL of the CURRENT entry: no new entry, no
 *    navigation, no hashchange/popstate event, no scroll.
 * 3. Pathname and search are untouched, so usePathname/useSearchParams consumers
 *    (ClientLayout's scroll-to-top reset, TemplateBlock's ?product=) see no change.
 *
 * FAILURE MODES:
 * - Hash is not a section root (form field, unknown id, malformed encoding) → left alone.
 * - /admin → left alone, same as the scroll helper's caller.
 * - Next's App Router marks its own history entries with `__NA` and IGNORES a
 *   replaceState that carries it; its router would then still hold the old URL and write
 *   the hash back on its next update. So the marker is left out of the state handed over:
 *   Next's history patch then records the new URL and re-adds its own fields. Every other
 *   key of history.state is passed through unchanged.
 *
 * Returns true when the hash was removed.
 */
export const stripSectionHash = (
  loc: Pick<Location, "hash" | "pathname" | "search"> = window.location,
  hist: Pick<History, "state" | "replaceState"> = window.history,
): boolean => {
  if (loc.pathname.startsWith("/admin")) return false;
  if (!findHashSection(loc.hash)) return false;
  let state: unknown = hist.state;
  if (state !== null && typeof state === "object" && "__NA" in state) {
    const copy: Record<string, unknown> = { ...state };
    delete copy.__NA;
    state = copy;
  }
  hist.replaceState(state, "", loc.pathname + loc.search);
  return true;
};

/**
 * The admin preview of the landing page. It renders the sections of page slug "/", so a
 * link to "/" clicked there means "this page".
 */
export const LANDING_PAGE_PREVIEW_PATH = "/preview/landing-page";

export type TemplateLinkResult =
  /** Nothing to do. */
  | { kind: "ignore" }
  /** mailto:/tel: — hand `url` (the href as written) to the browser. */
  | { kind: "protocol"; url: string }
  /** Another origin — open `url` in a new tab. */
  | { kind: "external"; url: string }
  /** Same site, but the template asked for a new tab — open `url` in a new tab. */
  | { kind: "new-tab"; url: string }
  /**
   * Link to the page being viewed. `target` is the URL to hand to the router when `push`
   * is true (it differs from the current one); `sectionId` is the element to scroll to.
   */
  | { kind: "same-page"; target: string; push: boolean; sectionId?: string }
  /** Same site, another page — full load of `url`. */
  | { kind: "navigate"; url: string };

/**
 * Decide what a link clicked inside a sandboxed section template should do in the parent
 * page. Pure: it only reads its arguments (and the DOM, through `isSection`), so the
 * caller performs the side effect.
 *
 * ASSUMPTIONS:
 * 1. `href` is untrusted (template markup). It is only ever parsed, never executed.
 * 2. `loc` is the parent window's location; `loc.href` is the base for relative links.
 * 3. The caller has already checked the message source and the user activation.
 *
 * FAILURE MODES:
 * - "/\evil.com", "//evil.com", "/<tab>/evil.com" look local to a string-prefix test but
 *   browsers normalise them to another host → the PARSED origin is compared, never a prefix.
 * - javascript:, data:, any non-http(s) scheme other than mailto:/tel: → ignored.
 * - Malformed or oversized href → ignored, never thrown.
 * - Inside /admin navigating away could lose unsaved work → ignored.
 * - "/#section" on the landing-page preview would load the host root (the admin login on
 *   the admin host) → treated as this page, and the target is built from the CURRENT path.
 */
export const resolveTemplateLink = (
  rawHref: string,
  loc: Pick<Location, "href" | "origin" | "pathname" | "search" | "hash">,
  {
    newTab = false,
    isSection = (hash: string): boolean => findHashSection(hash) !== null,
  }: { newTab?: boolean; isSection?: (hash: string) => boolean } = {},
): TemplateLinkResult => {
  const href = rawHref.trim();
  if (!href || href.length > 2048) return { kind: "ignore" };
  if (loc.pathname.startsWith("/admin")) return { kind: "ignore" };
  if (/^(mailto|tel):/i.test(href)) return { kind: "protocol", url: href };
  let url: URL;
  try {
    url = new URL(href, loc.href);
  } catch {
    return { kind: "ignore" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { kind: "ignore" };
  if (url.origin !== loc.origin) return { kind: "external", url: url.href };
  if (newTab) return { kind: "new-tab", url: url.href };
  const samePage =
    url.pathname === loc.pathname || (loc.pathname === LANDING_PAGE_PREVIEW_PATH && url.pathname === "/");
  if (!samePage) return { kind: "navigate", url: url.href };
  // A #hash that names a section is only a scroll target: it is kept out of the pushed URL,
  // so a reload starts at the top instead of jumping back.
  const target = loc.pathname + url.search + (isSection(url.hash) ? "" : url.hash);
  const push = target !== loc.pathname + loc.search + loc.hash;
  let sectionId = "";
  if (url.hash.length > 1) {
    try {
      sectionId = decodeURIComponent(url.hash.slice(1));
    } catch {
      sectionId = "";
    }
  }
  return sectionId ? { kind: "same-page", target, push, sectionId } : { kind: "same-page", target, push };
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
 *
 * Callbacks (both optional, at most one fires, neither fires on timeout or when the
 * returned cancel function is used): `onScrolled` right after the scroll was issued,
 * `onUserCancel` when the visitor's own input cancelled the pending scroll.
 */
export const scrollToHashSectionWhenReady = (
  hash: string,
  {
    intervalMs = 100,
    timeoutMs = 8000,
    onScrolled,
    onUserCancel,
  }: { intervalMs?: number; timeoutMs?: number; onScrolled?: () => void; onUserCancel?: () => void } = {},
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
    userEvents.forEach((type) => window.removeEventListener(type, onUserInput));
  };

  const onUserInput = (): void => {
    if (stopped) return;
    stop();
    onUserCancel?.();
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
      onScrolled?.();
      return;
    }
    if (waited >= timeoutMs) {
      stop();
      return;
    }
    waited += intervalMs;
    timer = setTimeout(attempt, intervalMs);
  };

  userEvents.forEach((type) => window.addEventListener(type, onUserInput, { passive: true }));
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
