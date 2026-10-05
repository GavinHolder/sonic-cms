/**
 * Pure maths for the Hero editor's Tablet / Mobile freeform canvas.
 *
 * That canvas does NOT draw its own copy of the hero. It renders the REAL <HeroCarousel>
 * inside an iframe and overlays transparent drag handles on the real elements. Everything
 * here is the arithmetic between three coordinate spaces, so the canvas can never drift
 * from the renderer:
 *
 *   1. frame px  - layout px INSIDE the iframe (what getBoundingClientRect returns there).
 *                  The iframe is the reference device (375x812 / 768x1024), so these are
 *                  real device px.
 *   2. layer %   - a freeform element's stored `pos`: x% / y% of the freeform LAYER (the
 *                  `[data-ff-layer]` box, which is the containing block of the absolute
 *                  freeform elements). The layer's rect is MEASURED, never assumed - on the
 *                  real page it starts below the navbar (top = --navbar-height) and the
 *                  hero clips its bottom, so y% = 0 is NOT the top edge of the screen.
 *   3. outer px  - px in the admin page: frame px * scale (the iframe is CSS-scaled to fit
 *                  the modal column, see hero-device-fit.ts).
 *
 * ASSUMPTIONS:
 * 1. `layer` is the measured padding box of the freeform layer in frame px, `view` the
 *    iframe viewport (the device size). Both are finite, with positive size.
 * 2. `scale` is outer px per frame px (> 0).
 * 3. Elements are anchored by their CENTRE (translate(-50%,-50%)) except the eyebrow when
 *    its alignment is left/right; drag maths therefore works on a DELTA (new = start +
 *    pointer travel) instead of teleporting the anchor to the pointer.
 *
 * FAILURE MODES:
 * - Unmeasured / zero / NaN layer or scale -> every helper returns null / the unchanged
 *   input instead of NaN (callers then simply draw no handle / ignore the drag).
 * - Dragging past the visible device area (the layer is taller than the visible hero
 *   because of the navbar offset) -> the centre is clamped to the visible rect so an
 *   element can never be dropped somewhere it can't be grabbed again.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A point in px (frame or outer, depending on context). */
export interface Point {
  x: number;
  y: number;
}

/** A position in layer % (the stored FreeformPos shape). */
export interface Pct {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

/** Snap threshold in OUTER (screen) px - same value the desktop surface uses. */
export const SNAP_PX = 8;
/** Pointer travel (outer px) before a pointerdown-on-a-handle becomes a drag instead of a select click. */
export const DRAG_THRESHOLD_PX = 3;
/** Alignment targets as % of the layer. Not 0/100 - elements are centre-anchored, so 0/100 would push half of them off-canvas. */
export const ALIGN_H = { left: 6, center: 50, right: 94 } as const;
export const ALIGN_V = { top: 8, middle: 50, bottom: 92 } as const;
/** Gap (layer %) kept between an alignment target and an edge where the visible hero truncates the layer. */
export const ALIGN_VISIBLE_MARGIN_PCT = 4;
/** Smallest handle (outer px) ever drawn, so a tiny element stays grabbable. */
export const MIN_HANDLE_PX = 16;

const isFiniteNumber = (n: number): boolean => typeof n === "number" && Number.isFinite(n);

/** True for a rect with finite coordinates and strictly positive size. */
export function isUsableRect(r: Rect | null | undefined): r is Rect {
  return (
    !!r && isFiniteNumber(r.x) && isFiniteNumber(r.y) && isFiniteNumber(r.w) && isFiniteNumber(r.h) && r.w > 0 && r.h > 0
  );
}

/** Builds a Rect, or null when any input is non-finite or a size is negative. */
export function makeRect(x: number, y: number, w: number, h: number): Rect | null {
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(w) || !isFiniteNumber(h) || w < 0 || h < 0) return null;
  return { x, y, w, h };
}

/** Rects equal within `eps` px on every edge (measurement jitter must not cause re-renders). */
export function rectsEqual(a: Rect | null, b: Rect | null, eps = 0.25): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps && Math.abs(a.w - b.w) <= eps && Math.abs(a.h - b.h) <= eps
  );
}

const clampNum = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

/**
 * Rounds to a whole % (the stored precision) and clamps into [min, max]. A non-finite input
 * becomes the middle of the range instead of leaking NaN into saved data.
 */
export function clampPct(n: number, min = 0, max = 100): number {
  if (!isFiniteNumber(n)) return clampNum(Math.round((min + max) / 2), min, max);
  return clampNum(Math.round(n), min, max);
}

export function centreOf(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Frame px -> layer % (NOT clamped). Null when the layer is unusable or the point non-finite. */
export function pxToPct(p: Point, layer: Rect | null | undefined): Pct | null {
  if (!isUsableRect(layer) || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) return null;
  return { x: ((p.x - layer.x) / layer.w) * 100, y: ((p.y - layer.y) / layer.h) * 100 };
}

/** Layer % -> frame px. Null when the layer is unusable. */
export function pctToPx(p: Pct, layer: Rect | null | undefined): Point | null {
  if (!isUsableRect(layer) || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) return null;
  return { x: layer.x + (p.x / 100) * layer.w, y: layer.y + (p.y / 100) * layer.h };
}

/** The centre of a measured element rect expressed in layer % (null if either rect is unusable). */
export function centrePct(rect: Rect | null | undefined, layer: Rect | null | undefined): Pct | null {
  if (!isUsableRect(rect)) return null;
  return pxToPct(centreOf(rect), layer);
}

/** Frame px rect -> outer px rect. */
export function scaleRect(r: Rect, scale: number): Rect {
  return { x: r.x * scale, y: r.y * scale, w: r.w * scale, h: r.h * scale };
}

/** The rect shifted by (dx, dy) in whatever px space it is in. */
export function translateRect(r: Rect, dx: number, dy: number): Rect {
  return { x: r.x + dx, y: r.y + dy, w: r.w, h: r.h };
}

/**
 * The on-screen box for a handle: the measured frame rect scaled to outer px, grown (about
 * its centre) to at least `minPx` on each axis so a tiny element can still be grabbed.
 */
export function handleRect(frameRect: Rect, scale: number, minPx = MIN_HANDLE_PX): Rect {
  const r = scaleRect(frameRect, scale);
  const w = Math.max(r.w, minPx);
  const h = Math.max(r.h, minPx);
  return { x: r.x - (w - r.w) / 2, y: r.y - (h - r.h) / 2, w, h };
}

/** Fixed outer-px size of the stand-in handle for an element with no measurable size. */
export const PLACEHOLDER_HANDLE_PX = 28;

const isFiniteRect = (r: Rect): boolean =>
  isFiniteNumber(r.x) && isFiniteNumber(r.y) && isFiniteNumber(r.w) && isFiniteNumber(r.h);

/**
 * Whether less than `minPx` of an outer-px handle rect is visible inside the (0,0,box.w,box.h)
 * canvas box (which clips its children). Such a handle can't be seen or grabbed. The threshold
 * is capped by the box itself so a tiny box doesn't flag every handle. A non-finite handle
 * counts as off-screen; an unusable box can't clip anything, so it never does.
 */
export function isHandleOffscreen(r: Rect, box: Size, minPx = MIN_HANDLE_PX): boolean {
  if (!(box.w > 0) || !(box.h > 0) || !isFiniteNumber(box.w) || !isFiniteNumber(box.h)) return false;
  if (!isFiniteRect(r)) return true;
  const visW = Math.min(r.x + r.w, box.w) - Math.max(r.x, 0);
  const visH = Math.min(r.y + r.h, box.h) - Math.max(r.y, 0);
  const need = Math.min(minPx, box.w, box.h);
  return visW < need || visH < need;
}

/**
 * Pins a handle rect INSIDE the canvas box (position only - its size is kept), so an element
 * whose real position is outside the visible hero (e.g. an inherited Desktop "align bottom"
 * 92% lands below the clipped bottom edge) stays selectable, draggable and clearable. A
 * handle larger than the box is pinned to its top-left. A non-finite rect becomes a minimum-size
 * handle at the box origin. An unusable box returns the rect unchanged.
 */
export function clampHandleIntoBox(r: Rect, box: Size): Rect {
  if (!(box.w > 0) || !(box.h > 0) || !isFiniteNumber(box.w) || !isFiniteNumber(box.h)) return r;
  const safe: Rect = isFiniteRect(r) ? r : { x: 0, y: 0, w: MIN_HANDLE_PX, h: MIN_HANDLE_PX };
  return {
    x: clampNum(safe.x, 0, Math.max(0, box.w - safe.w)),
    y: clampNum(safe.y, 0, Math.max(0, box.h - safe.h)),
    w: safe.w,
    h: safe.h,
  };
}

/**
 * The handle to draw for a measured element: the scaled rect when it is visible, otherwise
 * the same rect pinned into the box and flagged `offscreen` (drawn differently so the author
 * knows it is hidden on the real page).
 */
export function fitHandleToBox(frameRect: Rect, scale: number, box: Size): { rect: Rect; offscreen: boolean } {
  const raw = handleRect(frameRect, scale);
  const offscreen = isHandleOffscreen(raw, box);
  return { rect: offscreen ? clampHandleIntoBox(raw, box) : raw, offscreen };
}

/**
 * Stand-in frame-px rect for an element with NO measurable size (image not loaded / broken
 * src / display:none): a fixed `sizePx` (outer px) square centred where its stored position
 * puts it, so it can still be selected, dragged and cleared. Null when the layer is unusable.
 */
export function placeholderRect(pos: Pct, layer: Rect | null | undefined, scale: number, sizePx = PLACEHOLDER_HANDLE_PX): Rect | null {
  const c = pctToPx(pos, layer);
  if (!c || !(scale > 0) || !isFiniteNumber(scale)) return null;
  const side = sizePx / scale;
  return { x: c.x - side / 2, y: c.y - side / 2, w: side, h: side };
}

/**
 * The range of layer % whose centre stays inside the visible device viewport. With the
 * navbar offset the layer is taller than what the hero shows (its top starts below the
 * navbar, its bottom is clipped), e.g. a 768x1024 tablet: layer (0,100,768,1024) -> y max
 * (1024-100)/1024 = 90.2%. Falls back to the full 0..100 when the layer is unusable.
 */
export function visibleRangePct(layer: Rect | null | undefined, view: Size): { min: Pct; max: Pct } {
  if (!isUsableRect(layer) || !(view.w > 0) || !(view.h > 0)) {
    return { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
  }
  return {
    min: {
      x: Math.max(0, ((0 - layer.x) / layer.w) * 100),
      y: Math.max(0, ((0 - layer.y) / layer.h) * 100),
    },
    max: {
      x: Math.min(100, ((view.w - layer.x) / layer.w) * 100),
      y: Math.min(100, ((view.h - layer.y) / layer.h) * 100),
    },
  };
}

export interface Guides {
  vCanvas: number[];
  vElement: number[];
  hCanvas: number[];
  hElement: number[];
}

export const NO_GUIDES: Guides = Object.freeze({ vCanvas: [], vElement: [], hCanvas: [], hElement: [] }) as Guides;

interface SnapHit {
  value: number;
  isCanvas: boolean;
}

/** Nearest candidate within `threshold` (ties go to the LATER candidate, like the desktop surface). */
function snapAxis(raw: number, candidates: readonly SnapHit[], threshold: number): SnapHit | null {
  let best: SnapHit | null = null;
  let bestDist = threshold;
  for (const c of candidates) {
    const d = Math.abs(raw - c.value);
    if (d <= bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

/**
 * The whole-% stored position for a centre at `centre` (layer %), shifted from `startPos` by
 * the same delta the centre moved from `startCentre`. Rounding must not push the centre back
 * outside the visible range [min, max], so the bounds round INWARD (ceil the low bound, floor
 * the high bound).
 */
function boundedPos(startPos: number, startCentre: number, centre: number, min: number, max: number): number {
  const lo = Math.max(0, Math.ceil(startPos + (min - startCentre)));
  const hi = Math.min(100, Math.max(lo, Math.floor(startPos + (max - startCentre))));
  return clampPct(startPos + (centre - startCentre), lo, hi);
}

/**
 * Where a drag should START from. An element whose real centre is outside the visible hero
 * (so its handle was pinned into the box) is treated as already sitting at the nearest visible
 * point: the start centre, stored pos and start rect all shift by the same clamped delta, so
 * the pinned handle stays under the pointer and the first move brings the element into view.
 * For an element already inside the visible area this returns the inputs unchanged.
 */
export function startDragInView(args: {
  startPos: Pct;
  centre: Pct;
  rect: Rect;
  layer: Rect;
  view: Size;
}): { startPos: Pct; startCentre: Pct; startRect: Rect } {
  const { startPos, centre, rect, layer, view } = args;
  const range = visibleRangePct(layer, view);
  const cx = clampNum(centre.x, range.min.x, range.max.x);
  const cy = clampNum(centre.y, range.min.y, range.max.y);
  const dx = cx - centre.x;
  const dy = cy - centre.y;
  if (dx === 0 && dy === 0) return { startPos, startCentre: centre, startRect: rect };
  return {
    startPos: { x: startPos.x + dx, y: startPos.y + dy },
    startCentre: { x: cx, y: cy },
    startRect: translateRect(rect, (dx / 100) * layer.w, (dy / 100) * layer.h),
  };
}

export interface DragStart {
  /** Pointer position (outer client px) at pointerdown. */
  pointer: Point;
  /** The stored position this drag shifts: the element's own `pos`, or - for a mobile
   *  element that is still in the auto stack - its measured centre %. */
  startPos: Pct;
  /** The element's measured centre in layer % at pointerdown. */
  startCentre: Pct;
}

export interface DragStepInput {
  start: DragStart;
  /** Current pointer position (outer client px). */
  pointer: Point;
  /** Outer px per frame px. */
  scale: number;
  layer: Rect;
  /** The iframe viewport (device size). */
  view: Size;
  snapEnabled: boolean;
  /** Measured centres (layer %) of every OTHER element - sibling snap candidates. */
  others: readonly Pct[];
}

export interface DragStepResult {
  /** The new stored position (whole %, 0..100) to write. */
  pos: Pct;
  /** Where the element's centre will be once `pos` is applied (layer %). */
  centre: Pct;
  guides: Guides;
}

/**
 * One pointer-move of a handle drag. New centre = start centre + pointer travel (converted
 * outer px -> frame px -> layer %), clamped to the visible device area, then snapped to the
 * layer centre and to sibling centres; the written pos shifts by exactly the same delta, so
 * the real element lands precisely where the handle was dragged to.
 */
export function computeDragStep(input: DragStepInput): DragStepResult {
  const { start, pointer, scale, layer, view, snapEnabled, others } = input;
  const unchanged: DragStepResult = {
    pos: { x: clampPct(start.startPos.x), y: clampPct(start.startPos.y) },
    centre: start.startCentre,
    guides: NO_GUIDES,
  };
  if (!isUsableRect(layer) || !(scale > 0) || !isFiniteNumber(pointer.x) || !isFiniteNumber(pointer.y)) return unchanged;

  const range = visibleRangePct(layer, view);
  const dxPct = ((pointer.x - start.pointer.x) / scale / layer.w) * 100;
  const dyPct = ((pointer.y - start.pointer.y) / scale / layer.h) * 100;
  let cx = clampNum(start.startCentre.x + dxPct, range.min.x, range.max.x);
  let cy = clampNum(start.startCentre.y + dyPct, range.min.y, range.max.y);

  let hitX: SnapHit | null = null;
  let hitY: SnapHit | null = null;
  if (snapEnabled) {
    const thresholdX = (SNAP_PX / scale / layer.w) * 100;
    const thresholdY = (SNAP_PX / scale / layer.h) * 100;
    hitX = snapAxis(cx, [{ value: 50, isCanvas: true }, ...others.map((o) => ({ value: o.x, isCanvas: false }))], thresholdX);
    hitY = snapAxis(cy, [{ value: 50, isCanvas: true }, ...others.map((o) => ({ value: o.y, isCanvas: false }))], thresholdY);
    if (hitX) cx = clampNum(hitX.value, range.min.x, range.max.x);
    if (hitY) cy = clampNum(hitY.value, range.min.y, range.max.y);
  }

  const pos: Pct = {
    x: boundedPos(start.startPos.x, start.startCentre.x, cx, range.min.x, range.max.x),
    y: boundedPos(start.startPos.y, start.startCentre.y, cy, range.min.y, range.max.y),
  };
  return {
    pos,
    centre: { x: start.startCentre.x + (pos.x - start.startPos.x), y: start.startCentre.y + (pos.y - start.startPos.y) },
    guides: {
      vCanvas: hitX?.isCanvas ? [hitX.value] : [],
      vElement: hitX && !hitX.isCanvas ? [hitX.value] : [],
      hCanvas: hitY?.isCanvas ? [hitY.value] : [],
      hElement: hitY && !hitY.isCanvas ? [hitY.value] : [],
    },
  };
}

/**
 * The position alignment/distribution should treat an element as having. A mobile element
 * still in the auto stack has no meaningful stored pos (it renders wherever the stack puts
 * it), so its measured centre is used; every other element uses its stored pos.
 */
export function effectivePos(storedPos: Pct, stacked: boolean, measuredCentre: Pct | null): Pct {
  if (stacked && measuredCentre) return { x: clampPct(measuredCentre.x), y: clampPct(measuredCentre.y) };
  return storedPos;
}

export interface AlignTargets {
  h: { left: number; center: number; right: number };
  v: { top: number; middle: number; bottom: number };
}

/**
 * ALIGN_H / ALIGN_V, pulled inside the visible hero on any side where it truncates the
 * layer (the bottom, with the navbar offset) so "align bottom" can't hide an element behind
 * the clipped edge. Identical to the constants when the layer is fully visible.
 */
export function alignTargets(layer: Rect | null | undefined, view: Size): AlignTargets {
  const range = visibleRangePct(layer, view);
  const lo = (min: number) => (min > 0 ? min + ALIGN_VISIBLE_MARGIN_PCT : 0);
  const hi = (max: number) => (max < 100 ? Math.max(0, max - ALIGN_VISIBLE_MARGIN_PCT) : 100);
  const fit = (target: number, min: number, max: number) => clampNum(target, lo(min), Math.max(lo(min), hi(max)));
  return {
    h: {
      left: fit(ALIGN_H.left, range.min.x, range.max.x),
      center: fit(ALIGN_H.center, range.min.x, range.max.x),
      right: fit(ALIGN_H.right, range.min.x, range.max.x),
    },
    v: {
      top: fit(ALIGN_V.top, range.min.y, range.max.y),
      middle: fit(ALIGN_V.middle, range.min.y, range.max.y),
      bottom: fit(ALIGN_V.bottom, range.min.y, range.max.y),
    },
  };
}

/**
 * Even spacing along one axis: the first and last (by value) stay put, everything between
 * is spread evenly. Needs 3+ items - with fewer, "even spacing" is meaningless - and then
 * returns {} (nothing to move). Result: id -> new whole-% value, interior items only.
 */
export function distributeValues(items: readonly { id: string; value: number }[]): Record<string, number> {
  if (items.length < 3) return {};
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const first = sorted[0].value;
  const step = (sorted[sorted.length - 1].value - first) / (sorted.length - 1);
  const out: Record<string, number> = {};
  sorted.forEach((it, i) => {
    if (i > 0 && i < sorted.length - 1) out[it.id] = clampPct(first + step * i);
  });
  return out;
}
