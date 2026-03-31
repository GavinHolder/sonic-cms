'use client'

/**
 * usePretextLayout — React hook wrapping @chenglou/pretext for obstacle-aware layout.
 *
 * Architecture:
 *   1. prepare() is called once when text or font changes (expensive ~19ms, cached)
 *   2. layoutNextLine() iterates lines, carving available width slots around obstacles
 *   3. Returns LayoutLine[] of absolutely positioned lines ready for DOM rendering
 *   4. Re-layouts cheaply on resize (layout() / layoutNextLine() ~0.09ms)
 *
 * Font loading:
 *   - ensureFont() is called before prepare() to guarantee the Google Font is loaded.
 *   - Layout runs only after document.fonts.ready resolves.
 */

import { useState, useEffect, useRef } from 'react'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext'
import type { LayoutLine, ObstaclePolygon } from './types'
import { ensureFont, fontString } from './fontLoader'
import { getPolygonIntervalForBand } from './wrapGeometry'

export interface UsePretextLayoutOptions {
  text: string
  fontFamily: string
  fontSize: number
  /** CSS line-height multiplier, e.g. 1.6 */
  lineHeight: number
  containerWidth: number
  containerHeight: number
  obstacles: ObstaclePolygon[]
}

export interface UsePretextLayoutResult {
  lines: LayoutLine[]
  /** True once the font is loaded and layout has run at least once */
  ready: boolean
  /** Total height of all laid-out lines in pixels */
  contentHeight: number
}

export function usePretextLayout({
  text,
  fontFamily,
  fontSize,
  lineHeight,
  containerWidth,
  containerHeight,
  obstacles,
}: UsePretextLayoutOptions): UsePretextLayoutResult {
  const [result, setResult] = useState<UsePretextLayoutResult>({
    lines: [],
    ready: false,
    contentHeight: 0,
  })

  // Cache the prepared text so we only re-prepare when text or font actually changes
  const preparedRef = useRef<PreparedTextWithSegments | null>(null)
  const prevTextRef = useRef<string>('')
  const prevFontRef = useRef<string>('')

  useEffect(() => {
    if (!text || containerWidth <= 0) {
      setResult({ lines: [], ready: true, contentHeight: 0 })
      return
    }

    let cancelled = false
    const font = fontString(fontFamily, fontSize)
    const lineHeightPx = Math.round(fontSize * lineHeight)

    async function run() {
      // Wait for font to be available in the browser
      await ensureFont(fontFamily, fontSize)
      if (cancelled) return

      // Re-prepare only when text or font changed (expensive step)
      if (text !== prevTextRef.current || font !== prevFontRef.current) {
        preparedRef.current = prepareWithSegments(text, font)
        prevTextRef.current = text
        prevFontRef.current = font
      }

      const prepared = preparedRef.current
      if (!prepared) return

      const lines = computeLines(
        prepared,
        containerWidth,
        lineHeightPx,
        obstacles,
      )

      if (!cancelled) {
        const contentHeight = lines.length > 0
          ? (lines[lines.length - 1]?.y ?? 0) + lineHeightPx
          : 0
        setResult({ lines, ready: true, contentHeight })
      }
    }

    run()
    return () => { cancelled = true }
  }, [text, fontFamily, fontSize, lineHeight, containerWidth, containerHeight, obstacles])

  return result
}

/**
 * Core layout loop — iterates lines using layoutNextLine(), carving each line's
 * available horizontal slot around any obstacles that intersect its y-band.
 */
function computeLines(
  prepared: PreparedTextWithSegments,
  containerWidth: number,
  lineHeightPx: number,
  obstacles: ObstaclePolygon[],
): LayoutLine[] {
  const lines: LayoutLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = 0
  const MAX_LINES = 2000 // safety cap

  while (lines.length < MAX_LINES) {
    // Determine the available x-slot for this line band
    const yTop = y
    const yBottom = y + lineHeightPx

    const slot = getAvailableSlot(obstacles, yTop, yBottom, containerWidth)

    // If the obstacle fills the entire width, skip this line band
    if (slot === null) {
      y += lineHeightPx
      continue
    }

    const { slotX, slotWidth } = slot

    if (slotWidth < 1) {
      y += lineHeightPx
      continue
    }

    const line = layoutNextLine(prepared, cursor, slotWidth)
    if (line === null) break

    lines.push({
      text: line.text,
      x: slotX,
      y,
      width: line.width,
    })

    cursor = line.end
    y += lineHeightPx
  }

  return lines
}

/**
 * Given all obstacle polygons, find the largest contiguous horizontal slot
 * available for a text line at [yTop, yBottom].
 *
 * Strategy: collect all obstacle intervals that intersect this band, then
 * find the widest gap between them (or on either side). Returns the widest
 * available slot as {slotX, slotWidth}.
 *
 * Returns null if no usable slot exists (fully covered).
 */
function getAvailableSlot(
  obstacles: ObstaclePolygon[],
  yTop: number,
  yBottom: number,
  containerWidth: number,
): { slotX: number; slotWidth: number } | null {
  if (obstacles.length === 0) {
    return { slotX: 0, slotWidth: containerWidth }
  }

  // Collect exclusion intervals from all obstacles intersecting this band
  const exclusions: Array<{ left: number; right: number }> = []

  for (const obs of obstacles) {
    // Quick bounds check before full polygon test
    if (obs.bounds.bottom < yTop || obs.bounds.top > yBottom) continue

    const interval = getPolygonIntervalForBand(obs.points, yTop, yBottom)
    if (interval) {
      exclusions.push({
        left: Math.max(0, interval.left),
        right: Math.min(containerWidth, interval.right),
      })
    }
  }

  if (exclusions.length === 0) {
    return { slotX: 0, slotWidth: containerWidth }
  }

  // Merge overlapping exclusion intervals
  exclusions.sort((a, b) => a.left - b.left)
  const merged: Array<{ left: number; right: number }> = []
  for (const ex of exclusions) {
    const last = merged[merged.length - 1]
    if (last && ex.left <= last.right) {
      last.right = Math.max(last.right, ex.right)
    } else {
      merged.push({ ...ex })
    }
  }

  // Find the widest gap: before first exclusion, between exclusions, after last
  const gaps: Array<{ x: number; w: number }> = []

  const firstLeft = merged[0]?.left ?? containerWidth
  if (firstLeft > 0) gaps.push({ x: 0, w: firstLeft })

  for (let i = 0; i < merged.length - 1; i++) {
    const gapLeft = merged[i]!.right
    const gapRight = merged[i + 1]!.left
    if (gapRight > gapLeft) gaps.push({ x: gapLeft, w: gapRight - gapLeft })
  }

  const lastRight = merged[merged.length - 1]?.right ?? 0
  if (lastRight < containerWidth) gaps.push({ x: lastRight, w: containerWidth - lastRight })

  if (gaps.length === 0) return null

  // Pick the widest gap
  let best = gaps[0]!
  for (const g of gaps) {
    if (g.w > best.w) best = g
  }

  if (best.w < 4) return null // too narrow to place any text

  return { slotX: best.x, slotWidth: best.w }
}
