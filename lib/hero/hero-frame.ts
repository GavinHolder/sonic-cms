/**
 * The frame rules shared by every surface that hosts the REAL <HeroCarousel> in the Hero
 * editor's isolated iframe (Live Preview + the Tablet / Mobile canvas) - see
 * components/admin/hero/HeroRealRenderFrame.tsx.
 *
 * The real page's hero is exactly ONE VIEWPORT (H) tall: app/globals.css forces
 * `.hero-carousel { height / min-height / max-height: 100vh !important }`, which beats
 * HeroCarousel's own inline `calc(100dvh + var(--navbar-height))` min-height even with
 * "full navbar over hero" on. The freeform content layer then sits at top = --navbar-height
 * with height = H, so its bottom --navbar-height px is clipped by the hero's overflow:hidden.
 * The frame must reproduce exactly that - NOT H + navbar, which is what the Live Preview used
 * to force (it made its hero 100px taller than the real page's, so y% positions and the cover
 * crop differed from the site).
 *
 * ASSUMPTIONS:
 * 1. `viewportH` is the iframe's own viewport height (the device height / real window height),
 *    so it equals the `100vh` the global rule resolves to inside the frame - the explicit px
 *    value is the same number, kept so the hero is correct before the mirrored stylesheets
 *    have been copied in.
 * 2. `navbarHeight` is the real navbar height (admin routes hardcode --navbar-height to 100px).
 *
 * FAILURE MODES:
 * - Non-finite / non-positive `viewportH` -> the height rule is omitted (the mirrored global
 *   100vh rule still applies) rather than emitting `NaNpx`.
 * - Non-finite `navbarHeight` -> falls back to the admin default of 100.
 */

/** Blank document the iframe loads. The hero is portaled into #root once the iframe fires onLoad. */
export const HERO_FRAME_SRC_DOC =
  '<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>';

export const HERO_FRAME_DEFAULT_NAVBAR_PX = 100;

export function heroFrameCss(viewportH: number, navbarHeight: number): string {
  const nav = Number.isFinite(navbarHeight) && navbarHeight >= 0 ? navbarHeight : HERO_FRAME_DEFAULT_NAVBAR_PX;
  const heightRule =
    Number.isFinite(viewportH) && viewportH > 0
      ? `
  .hero-carousel {
    height: ${viewportH}px !important;
    min-height: ${viewportH}px !important;
  }`
      : "";
  return `
  :root {
    --navbar-height: ${nav}px;
  }${heightRule}
`;
}

/**
 * Canvas-only CSS appended after heroFrameCss: a freeform-position canvas should show the
 * element at rest, not mid entrance animation, and with stable rects. The framer-motion
 * entrance animations are inline styles on the motion elements INSIDE each `[data-ff-id]`
 * wrapper (and on the content layer's own fade), so `!important` rules beat them. The
 * wrappers' own transform (the centre anchor) is deliberately untouched.
 */
export const HERO_CANVAS_FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  [data-ff-id] > * {
    opacity: 1 !important;
    transform: none !important;
  }
  *:has(> [data-ff-layer]) {
    opacity: 1 !important;
  }
`;
