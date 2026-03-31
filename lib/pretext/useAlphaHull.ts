'use client'

/**
 * useAlphaHull — traces the alpha contour of an image using an offscreen canvas.
 *
 * Process:
 *   1. Load the image with crossOrigin="anonymous"
 *   2. Draw to an offscreen canvas at the obstacle's rendered size
 *   3. Read pixel data with getImageData()
 *   4. Collect all non-transparent border pixels to form a point cloud
 *   5. Compute the convex hull of those points (fast, sufficient for text wrapping)
 *   6. Expand the hull by `padding` pixels
 *   7. Transform to container-absolute coordinates
 *
 * Fallback: if the image fails to load or getImageData() is blocked (CORS),
 * the hook returns a simple rectangular polygon from the obstacle bounds.
 *
 * Results are memoized by `${src}|${w}x${h}` so re-renders are free.
 */

import { useState, useEffect, useRef } from 'react'
import type { ObstaclePolygon, EditorialObstacle } from './types'
import { convexHull, expandPolygon, polygonBounds, rectToPolygon } from './wrapGeometry'
import type { Point } from './wrapGeometry'

/** Alpha threshold: pixels with alpha above this value count as opaque. */
const ALPHA_THRESHOLD = 64

/** Max canvas dimension for hull tracing — keeps getImageData cost bounded. */
const MAX_TRACE_DIM = 256

/** Module-level memoization cache. */
const hullCache = new Map<string, Point[]>()

/**
 * Given a list of obstacles (with fractional x/y/width/height) and the
 * container's pixel dimensions, returns an ObstaclePolygon[] ready for
 * usePretextLayout.
 *
 * Re-runs only when obstacle definitions or container dimensions change.
 */
export function useObstaclePolygons(
  obstacles: EditorialObstacle[],
  containerWidth: number,
  containerHeight: number,
): ObstaclePolygon[] {
  const [polygons, setPolygons] = useState<ObstaclePolygon[]>([])
  const prevKeyRef = useRef('')

  useEffect(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return

    const key = obstacles
      .map(o => `${o.id}|${o.src}|${o.x}|${o.y}|${o.width}|${o.height}|${o.padding}|${o.useAlphaHull}`)
      .join(';') + `|${containerWidth}x${containerHeight}`

    if (key === prevKeyRef.current) return
    prevKeyRef.current = key

    let cancelled = false

    async function resolve() {
      const results = await Promise.all(
        obstacles.map(obs => resolveObstaclePolygon(obs, containerWidth, containerHeight))
      )
      if (!cancelled) setPolygons(results)
    }

    resolve()
    return () => { cancelled = true }
  }, [obstacles, containerWidth, containerHeight])

  return polygons
}

async function resolveObstaclePolygon(
  obs: EditorialObstacle,
  cw: number,
  ch: number,
): Promise<ObstaclePolygon> {
  // Convert fractional coords to absolute pixels
  const absX = obs.x * cw
  const absY = obs.y * ch
  const absW = obs.width * cw
  const absH = obs.height * ch

  let points: Point[]

  if (obs.useAlphaHull && obs.src) {
    points = await traceAlphaHull(obs.src, absX, absY, absW, absH, obs.padding)
  } else {
    // Simple rectangle (no alpha tracing)
    const pad = obs.padding
    points = rectToPolygon(absX - pad, absY - pad, absW + pad * 2, absH + pad * 2)
  }

  return {
    obstacleId: obs.id,
    points,
    bounds: polygonBounds(points),
  }
}

/**
 * Trace the alpha contour of an image and return a convex hull polygon
 * in container-absolute pixel coordinates.
 *
 * Returns a rectangle fallback if image loading or canvas read fails.
 */
async function traceAlphaHull(
  src: string,
  absX: number,
  absY: number,
  absW: number,
  absH: number,
  padding: number,
): Promise<Point[]> {
  const cacheKey = `${src}|${Math.round(absW)}x${Math.round(absH)}`
  const cached = hullCache.get(cacheKey)

  let localHull: Point[]

  if (cached) {
    localHull = cached
  } else {
    try {
      localHull = await computeAlphaHull(src, absW, absH)
      hullCache.set(cacheKey, localHull)
    } catch {
      // CORS blocked or image load failed — fall back to rectangle
      localHull = rectToPolygon(0, 0, absW, absH)
    }
  }

  // Expand by padding, then translate to container-absolute coordinates
  const expanded = expandPolygon(localHull, padding)
  const translated: Point[] = expanded.map(([x, y]) => [x + absX, y + absY])

  return translated
}

/**
 * Load an image, draw it to an offscreen canvas, read pixel data,
 * collect opaque border pixels, and return a convex hull in image-local coords.
 */
async function computeAlphaHull(src: string, targetW: number, targetH: number): Promise<Point[]> {
  // Scale down to MAX_TRACE_DIM for performance
  const scale = Math.min(1, MAX_TRACE_DIM / Math.max(targetW, targetH, 1))
  const traceW = Math.max(1, Math.round(targetW * scale))
  const traceH = Math.max(1, Math.round(targetH * scale))

  const img = await loadImage(src)

  const canvas = document.createElement('canvas')
  canvas.width = traceW
  canvas.height = traceH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(img, 0, 0, traceW, traceH)

  // getImageData will throw if the image is CORS-tainted
  const imageData = ctx.getImageData(0, 0, traceW, traceH)
  const data = imageData.data

  // Collect border pixels of opaque regions (sample every Nth pixel for speed)
  const sampleStep = Math.max(1, Math.floor(Math.min(traceW, traceH) / 64))
  const points: Point[] = []

  for (let y = 0; y < traceH; y += sampleStep) {
    for (let x = 0; x < traceW; x += sampleStep) {
      const alpha = data[(y * traceW + x) * 4 + 3] ?? 0
      if (alpha >= ALPHA_THRESHOLD) {
        // Scale back to target dimensions
        points.push([x / scale, y / scale])
      }
    }
  }

  if (points.length < 3) {
    // Image is fully transparent or too sparse — use rectangle
    return rectToPolygon(0, 0, targetW, targetH)
  }

  return convexHull(points)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
