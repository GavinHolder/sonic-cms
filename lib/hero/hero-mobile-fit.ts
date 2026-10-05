/**
 * Shared "fit the whole phone on screen" rule for the Hero Carousel editor's MOBILE
 * breakpoint. ONE system per concern: both the freeform drag canvas (SlideEditor's
 * FreeformDragSurface) and the Live Preview panel (HeroCarouselEditor) call this, so the
 * two surfaces agree on how big the 375x812 phone is drawn.
 *
 * Mobile only. Desktop/Tablet keep their own sizing and never call this.
 *
 * ASSUMPTIONS:
 * 1. viewportW/viewportH are the real device reference size being authored (375x812).
 * 2. availableW is the measured width of the column that will host the box (px), or a
 *    non-positive / non-finite value when it hasn't been measured yet.
 * 3. availableH is already net of modal chrome (see MOBILE_FIT_CHROME_PX); it is clamped
 *    up to minH so a very short window still yields a usable (if scrolling) box.
 *
 * FAILURE MODES:
 * - Unmeasured / NaN width  -> treated as "unconstrained" so the height budget decides.
 * - NaN height              -> falls back to minH (conservative, whole phone still shown).
 * - Bad viewport dimensions -> falls back to scale 1 of the given (sanitised) size.
 */

/** The reference phone the Mobile breakpoint is authored/previewed against. */
export const MOBILE_PHONE_VW = 375;
export const MOBILE_PHONE_VH = 812;

/** Px reserved for modal chrome (header, footer, section headings/notes) when the box's
 *  height budget is derived from window.innerHeight. */
export const MOBILE_FIT_CHROME_PX = 260;

/** Smallest height budget ever used, however short the window is. */
export const MOBILE_FIT_MIN_AVAILABLE_H = 420;

export interface PhoneFit {
  /** Uniform scale applied to the phone, always in (0, 1]. */
  scale: number;
  /** Box width in px = viewportW * scale. */
  width: number;
  /** Box height in px = viewportH * scale. */
  height: number;
}

export interface PhoneFitInput {
  viewportW: number;
  viewportH: number;
  /** Measured host-column width in px; <= 0 or non-finite = unconstrained. */
  availableW: number;
  /** Height budget in px (already net of modal chrome). */
  availableH: number;
  /** Floor for availableH. Defaults to MOBILE_FIT_MIN_AVAILABLE_H. */
  minH?: number;
}

const positiveOr = (n: number, fallback: number): number =>
  Number.isFinite(n) && n > 0 ? n : fallback;

/**
 * scale = min(1, availableW / viewportW, max(minH, availableH) / viewportH)
 * box   = (viewportW * scale) x (viewportH * scale)
 */
export function fitPhoneViewport({
  viewportW,
  viewportH,
  availableW,
  availableH,
  minH = MOBILE_FIT_MIN_AVAILABLE_H,
}: PhoneFitInput): PhoneFit {
  const vw = positiveOr(viewportW, MOBILE_PHONE_VW);
  const vh = positiveOr(viewportH, MOBILE_PHONE_VH);
  const floorH = positiveOr(minH, MOBILE_FIT_MIN_AVAILABLE_H);
  const budgetH = Number.isFinite(availableH) ? Math.max(floorH, availableH) : floorH;
  const widthScale = Number.isFinite(availableW) && availableW > 0 ? availableW / vw : Infinity;
  const scale = Math.min(1, widthScale, budgetH / vh);
  return { scale, width: vw * scale, height: vh * scale };
}

/**
 * The call both editor surfaces make: the standard 375x812 phone, with the height budget
 * taken from the admin window's inner height minus MOBILE_FIT_CHROME_PX.
 */
export function fitMobilePhone(availableW: number, windowInnerHeight: number): PhoneFit {
  return fitPhoneViewport({
    viewportW: MOBILE_PHONE_VW,
    viewportH: MOBILE_PHONE_VH,
    availableW,
    availableH: windowInnerHeight - MOBILE_FIT_CHROME_PX,
  });
}
