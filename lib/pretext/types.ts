/**
 * Pretext Editorial Block — shared TypeScript interfaces.
 *
 * Used by usePretextLayout, useAlphaHull, EditorialBlock, and the Designer.
 */

/** A single obstacle image that text flows around. */
export interface EditorialObstacle {
  id: string
  /** Absolute or relative image URL */
  src: string
  alt?: string
  /** Fractional horizontal position within the text container (0 = left, 1 = right) */
  x: number
  /** Fractional vertical position within the text container (0 = top, 1 = bottom) */
  y: number
  /** Fractional width relative to container width (0-1) */
  width: number
  /** Fractional height relative to container height (0-1) */
  height: number
  /** When true, trace the actual alpha contour of the image rather than using its bounding box */
  useAlphaHull: boolean
  /** Extra padding (px) added around the obstacle shape before text flows */
  padding: number
}

/** Props for the editorial FLEXIBLE block. */
export interface EditorialBlockProps {
  text: string
  fontFamily: string
  fontSize: number
  /** CSS line-height multiplier (e.g. 1.6) */
  lineHeight: number
  textColor: string
  bgColor: string
  obstacles: EditorialObstacle[]
  customCss?: string
}

/** A single laid-out text line produced by usePretextLayout. */
export interface LayoutLine {
  text: string
  /** Absolute x position in pixels within the container */
  x: number
  /** Absolute y position in pixels within the container */
  y: number
  /** Measured line width in pixels */
  width: number
}

/** A traced obstacle polygon in container-absolute pixel coordinates. */
export interface ObstaclePolygon {
  obstacleId: string
  /** Polygon vertices as [x, y] pairs in absolute pixel coordinates */
  points: [number, number][]
  /** Axis-aligned bounding rect of the polygon (for fast band checks) */
  bounds: { left: number; top: number; right: number; bottom: number }
}
