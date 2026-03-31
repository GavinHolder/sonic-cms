'use client'

/**
 * PretextDOMRenderer — renders absolutely positioned <span> elements per text line.
 *
 * Text is real DOM content: fully selectable, copyable, and accessible.
 * Container must be position: relative with a known height.
 */

import type { LayoutLine } from '@/lib/pretext/types'

interface PretextDOMRendererProps {
  lines: LayoutLine[]
  fontFamily: string
  fontSize: number
  /** CSS line-height multiplier */
  lineHeight: number
  textColor: string
}

export default function PretextDOMRenderer({
  lines,
  fontFamily,
  fontSize,
  lineHeight,
  textColor,
}: PretextDOMRendererProps) {
  if (lines.length === 0) return null

  const lineHeightPx = Math.round(fontSize * lineHeight)

  return (
    <>
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y,
            width: line.width + 1, // +1 to prevent subpixel clipping
            height: lineHeightPx,
            fontFamily: `"${fontFamily}", serif`,
            fontSize,
            lineHeight: `${lineHeightPx}px`,
            color: textColor,
            whiteSpace: 'pre',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            pointerEvents: 'auto',
          }}
        >
          {line.text}
        </span>
      ))}
    </>
  )
}
