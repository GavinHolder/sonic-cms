'use client'

/**
 * EditorialBlock — magazine-style text layout using @chenglou/pretext.
 *
 * Text flows around obstacle images using alpha hull tracing.
 * All text is rendered as absolutely positioned DOM <span> elements
 * so it remains fully selectable and copyable.
 *
 * Layout pipeline:
 *   1. ResizeObserver tracks container pixel dimensions
 *   2. useObstaclePolygons traces alpha hulls for each obstacle image
 *   3. usePretextLayout prepares text, iterates layoutNextLine() around obstacles
 *   4. PretextDOMRenderer places <span> per line
 *   5. Obstacle images rendered as <img> at their absolute positions
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import type { EditorialBlockProps, EditorialObstacle } from '@/lib/pretext/types'
import { usePretextLayout } from '@/lib/pretext/usePretextLayout'
import { useObstaclePolygons } from '@/lib/pretext/useAlphaHull'
import PretextDOMRenderer from '@/components/pretext/PretextDOMRenderer'

interface EditorialBlockComponentProps {
  props: EditorialBlockProps
}

export default function EditorialBlock({ props: p }: EditorialBlockComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })

  // Track container size via ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setDims({ width: Math.floor(width), height: Math.floor(height) })
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Resolve obstacle polygons (alpha hull or rectangle fallback)
  const polygons = useObstaclePolygons(p.obstacles ?? [], dims.width, dims.height)

  // Run pretext layout
  const { lines, ready, contentHeight } = usePretextLayout({
    text: p.text ?? '',
    fontFamily: p.fontFamily ?? 'Merriweather',
    fontSize: p.fontSize ?? 18,
    lineHeight: p.lineHeight ?? 1.6,
    containerWidth: dims.width,
    containerHeight: dims.height,
    obstacles: polygons,
  })

  const bgColor = p.bgColor && p.bgColor !== 'transparent' ? p.bgColor : undefined

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: contentHeight || 200,
        background: bgColor,
        overflow: 'hidden',
      }}
    >
      {/* Obstacle images — rendered at their absolute fractional positions */}
      {(p.obstacles ?? []).map(obs => (
        <ObstacleImage
          key={obs.id}
          obstacle={obs}
          containerWidth={dims.width}
          containerHeight={dims.height}
        />
      ))}

      {/* Text lines — absolutely positioned DOM spans */}
      {ready && lines.length > 0 && (
        <PretextDOMRenderer
          lines={lines}
          fontFamily={p.fontFamily ?? 'Merriweather'}
          fontSize={p.fontSize ?? 18}
          lineHeight={p.lineHeight ?? 1.6}
          textColor={p.textColor ?? '#212529'}
        />
      )}

      {/* Loading state — show plain text while font/layout resolves */}
      {!ready && p.text && (
        <p style={{
          fontFamily: `"${p.fontFamily ?? 'Merriweather'}", serif`,
          fontSize: p.fontSize ?? 18,
          lineHeight: p.lineHeight ?? 1.6,
          color: p.textColor ?? '#212529',
          margin: 0,
          opacity: 0.4,
        }}>
          {p.text}
        </p>
      )}

      {/* Empty state */}
      {!p.text && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 120,
          color: '#adb5bd',
          fontSize: 14,
          fontStyle: 'italic',
        }}>
          Editorial block — add text content in the Designer
        </div>
      )}
    </div>
  )
}

/** Renders a single obstacle image at its fractional container position. */
function ObstacleImage({
  obstacle: obs,
  containerWidth,
  containerHeight,
}: {
  obstacle: EditorialObstacle
  containerWidth: number
  containerHeight: number
}) {
  if (!obs.src || containerWidth === 0) return null

  const absX = obs.x * containerWidth
  const absY = obs.y * containerHeight
  const absW = obs.width * containerWidth
  const absH = obs.height * containerHeight

  return (
    <div
      style={{
        position: 'absolute',
        left: absX,
        top: absY,
        width: absW,
        height: absH,
        zIndex: 1,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={obs.src}
        alt={obs.alt ?? ''}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        crossOrigin="anonymous"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}
