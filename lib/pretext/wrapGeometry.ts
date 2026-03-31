/**
 * wrapGeometry — polygon math for obstacle-aware text layout.
 *
 * Ported and adapted from @chenglou/pretext's wrap-geometry.ts.
 * All functions are pure — no DOM, no React, safe to call on every frame.
 */

export type Point = [number, number]

export interface Interval {
  left: number
  right: number
}

/**
 * Given a convex or concave polygon and a horizontal band [yTop, yBottom],
 * returns the x-interval [left, right] that the polygon occupies within that band,
 * or null if the polygon does not intersect the band at all.
 *
 * Used to carve out exclusion zones per text line.
 */
export function getPolygonIntervalForBand(
  points: Point[],
  yTop: number,
  yBottom: number,
): Interval | null {
  if (points.length < 3) return null

  let minX = Infinity
  let maxX = -Infinity
  let hit = false

  const n = points.length
  for (let i = 0; i < n; i++) {
    const [ax, ay] = points[i]!
    const [bx, by] = points[(i + 1) % n]!

    // Vertex inside band
    if (ay >= yTop && ay <= yBottom) {
      minX = Math.min(minX, ax)
      maxX = Math.max(maxX, ax)
      hit = true
    }

    // Edge crosses yTop
    if ((ay < yTop && by >= yTop) || (by < yTop && ay >= yTop)) {
      const t = (yTop - ay) / (by - ay)
      const x = ax + t * (bx - ax)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      hit = true
    }

    // Edge crosses yBottom
    if ((ay < yBottom && by >= yBottom) || (by < yBottom && ay >= yBottom)) {
      const t = (yBottom - ay) / (by - ay)
      const x = ax + t * (bx - ax)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      hit = true
    }
  }

  if (!hit || minX === Infinity) return null
  return { left: minX, right: maxX }
}

/**
 * Given a set of points (e.g. from alpha tracing), compute the convex hull
 * using the Graham scan algorithm.
 *
 * Returns the convex hull as an ordered polygon. For text wrapping purposes
 * a convex hull is sufficient and much faster than concave hull computation.
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points.slice()

  // Find the lowest (then leftmost) point
  let pivot = points[0]!
  for (const p of points) {
    if (p[1] < pivot[1] || (p[1] === pivot[1] && p[0] < pivot[0])) {
      pivot = p
    }
  }

  // Sort by polar angle relative to pivot
  const sorted = points
    .filter(p => p !== pivot)
    .sort((a, b) => {
      const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0])
      const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0])
      if (angleA !== angleB) return angleA - angleB
      const distA = (a[0] - pivot[0]) ** 2 + (a[1] - pivot[1]) ** 2
      const distB = (b[0] - pivot[0]) ** 2 + (b[1] - pivot[1]) ** 2
      return distA - distB
    })

  const hull: Point[] = [pivot]

  for (const p of sorted) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2]!
      const b = hull[hull.length - 1]!
      // Cross product — if counter-clockwise or collinear, pop
      const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
      if (cross <= 0) hull.pop()
      else break
    }
    hull.push(p)
  }

  return hull
}

/**
 * Expand a polygon outward by `padding` pixels.
 * Each vertex is moved away from the centroid by `padding`.
 */
export function expandPolygon(points: Point[], padding: number): Point[] {
  if (padding === 0 || points.length === 0) return points

  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length

  return points.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    return [x + (dx / len) * padding, y + (dy / len) * padding] as Point
  })
}

/**
 * Build an axis-aligned bounding rect from a polygon.
 */
export function polygonBounds(points: Point[]) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  for (const [x, y] of points) {
    if (x < left)   left   = x
    if (x > right)  right  = x
    if (y < top)    top    = y
    if (y > bottom) bottom = y
  }
  return { left, top, right, bottom }
}

/**
 * Build a simple axis-aligned rectangular polygon from bounds.
 * Used as fallback when alpha hull tracing fails (e.g. CORS blocked).
 */
export function rectToPolygon(
  x: number,
  y: number,
  w: number,
  h: number,
): Point[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
}
