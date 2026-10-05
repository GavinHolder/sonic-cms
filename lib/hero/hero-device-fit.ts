/**
 * Shared "fit the whole device on screen" rule for the Hero Carousel editor's MOBILE and
 * TABLET breakpoints, plus the ONE place the reference device sizes live. ONE system per
 * concern: both the freeform drag canvas (SlideEditor's FreeformDragSurface) and the Live
 * Preview panel (HeroCarouselEditor) import the viewport constants and call the fit
 * functions from here, so neither keeps its own copy of "375x812" / "768x1024" or of the
 * fit formula.
 *
 * Desktop never fits: it keeps its own sizing (the admin's real window) and gets `null`
 * from `deviceViewportFor` / `fitForBreakpoint`.
 *
 * Both surfaces apply the same formula to the same device and the same window height, but
 * each to ITS OWN column width. The resulting scale is therefore identical only when the
 * height budget is the limiting dimension; when a column is narrow enough that width is
 * the limit, each surface scales to its own column.
 *
 * ASSUMPTIONS:
 * 1. viewportW/viewportH are the real device reference size being authored
 *    (MOBILE_VIEWPORT or TABLET_VIEWPORT).
 * 2. availableW is the measured width of the column that will host the box (px), or a
 *    non-positive / non-finite value when it hasn't been measured yet.
 * 3. availableH is already net of modal chrome (see DEVICE_FIT_CHROME_PX); it is clamped
 *    up to minH so a very short window still yields a usable (if scrolling) box.
 *
 * FAILURE MODES:
 * - Unmeasured / NaN width  -> treated as "unconstrained" so the height budget decides.
 * - NaN height              -> falls back to minH (conservative, whole device still shown).
 * - Bad viewport dimensions -> falls back to the mobile reference size (scale still <= 1).
 */

/** The three authoring breakpoints of the Hero Carousel editor. */
export type HeroEditBreakpoint = "desktop" | "tablet" | "mobile";

export interface DeviceViewport {
  readonly w: number;
  readonly h: number;
}

/** The reference phone the Mobile breakpoint is authored/previewed against. */
export const MOBILE_VIEWPORT: DeviceViewport = Object.freeze({ w: 375, h: 812 });

/** The reference tablet the Tablet breakpoint is authored/previewed against. Matches
 *  SectionLivePreview's tablet width; the height is a real single-screen device height. */
export const TABLET_VIEWPORT: DeviceViewport = Object.freeze({ w: 768, h: 1024 });

/** Px reserved for modal chrome (header, footer, section headings/notes) when the box's
 *  height budget is derived from window.innerHeight. */
export const DEVICE_FIT_CHROME_PX = 260;

/** Smallest height budget ever used, however short the window is. */
export const DEVICE_FIT_MIN_AVAILABLE_H = 420;

/**
 * The fixed reference device for a breakpoint, or null for Desktop (Desktop is authored
 * against the admin's real window, not a fixed device).
 */
export function deviceViewportFor(breakpoint: HeroEditBreakpoint): DeviceViewport | null {
  if (breakpoint === "mobile") return MOBILE_VIEWPORT;
  if (breakpoint === "tablet") return TABLET_VIEWPORT;
  return null;
}

/** True for the breakpoints that use the fit-the-whole-device behaviour (Mobile, Tablet). */
export function isDeviceFitBreakpoint(breakpoint: HeroEditBreakpoint): boolean {
  return deviceViewportFor(breakpoint) !== null;
}

export interface DeviceFit {
  /** Uniform scale applied to the device, always in (0, 1]. */
  scale: number;
  /** Box width in px = viewportW * scale. */
  width: number;
  /** Box height in px = viewportH * scale. */
  height: number;
}

export interface DeviceFitInput {
  viewportW: number;
  viewportH: number;
  /** Measured host-column width in px; <= 0 or non-finite = unconstrained. */
  availableW: number;
  /** Height budget in px (already net of modal chrome). */
  availableH: number;
  /** Floor for availableH. Defaults to DEVICE_FIT_MIN_AVAILABLE_H. */
  minH?: number;
}

const positiveOr = (n: number, fallback: number): number =>
  Number.isFinite(n) && n > 0 ? n : fallback;

/**
 * scale = min(1, availableW / viewportW, max(minH, availableH) / viewportH)
 * box   = (viewportW * scale) x (viewportH * scale)
 */
export function fitDeviceViewport({
  viewportW,
  viewportH,
  availableW,
  availableH,
  minH = DEVICE_FIT_MIN_AVAILABLE_H,
}: DeviceFitInput): DeviceFit {
  const vw = positiveOr(viewportW, MOBILE_VIEWPORT.w);
  const vh = positiveOr(viewportH, MOBILE_VIEWPORT.h);
  const floorH = positiveOr(minH, DEVICE_FIT_MIN_AVAILABLE_H);
  const budgetH = Number.isFinite(availableH) ? Math.max(floorH, availableH) : floorH;
  const widthScale = Number.isFinite(availableW) && availableW > 0 ? availableW / vw : Infinity;
  const scale = Math.min(1, widthScale, budgetH / vh);
  return { scale, width: vw * scale, height: vh * scale };
}

/**
 * The call both editor surfaces make: fit the given reference device, with the height
 * budget taken from the admin window's inner height minus DEVICE_FIT_CHROME_PX.
 */
export function fitDevice(
  device: DeviceViewport,
  availableW: number,
  windowInnerHeight: number,
): DeviceFit {
  return fitDeviceViewport({
    viewportW: device.w,
    viewportH: device.h,
    availableW,
    availableH: windowInnerHeight - DEVICE_FIT_CHROME_PX,
  });
}

/**
 * Breakpoint-gated entry point used by both surfaces: the fit for Mobile (375x812) or
 * Tablet (768x1024), or null for Desktop so the caller keeps its existing Desktop path.
 */
export function fitForBreakpoint(
  breakpoint: HeroEditBreakpoint,
  availableW: number,
  windowInnerHeight: number,
): DeviceFit | null {
  const device = deviceViewportFor(breakpoint);
  return device ? fitDevice(device, availableW, windowInnerHeight) : null;
}
