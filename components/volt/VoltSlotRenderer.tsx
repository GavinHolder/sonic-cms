'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { VoltLayer, VoltSlots } from '@/types/volt'

interface Props {
  layer: VoltLayer
  canvasWidth: number
  canvasHeight: number
  slots: VoltSlots
  canvasOverflow?: 'visible' | 'hidden'
}

/**
 * Overflow-fit strategy for a bound value that may be longer than its fixed box.
 * Read defensively off slotData so it works whether or not the type carries it.
 *   'clip'     → current behaviour (overflow hidden, hard clip). Default.
 *   'ellipsis' → single line, trailing … when it overflows.
 *   'shrink'   → uniformly scale the text down so it fits inside its own box.
 * Because slot layers are absolutely positioned, none of these ever reflow siblings.
 */
type OverflowFit = 'clip' | 'ellipsis' | 'shrink'

function originForAlign(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'center'
  if (align === 'right') return 'right center'
  return 'left center'
}

export default function VoltSlotRenderer({ layer, canvasWidth, canvasHeight, slots, canvasOverflow }: Props) {
  const slotData = layer.slotData
  const overflowFit: OverflowFit =
    (slotData as { overflowFit?: OverflowFit } | undefined)?.overflowFit ?? 'clip'

  const textRef = useRef<HTMLDivElement>(null)
  const [shrinkScale, setShrinkScale] = useState(1)

  // Resolve the slot content (safe when slotData is absent → undefined).
  // Use explicit undefined checks — empty string "" is valid content (not a fallback trigger).
  // contentFieldHint (the product-field binding) takes priority over the generic
  // slotType bucket — they're identical at slot creation, but once a slot is
  // rebound to e.g. pkg.speedDown, the stale slots[slotType] value must not win.
  const content = slotData
    ? (slots[layer.id] !== undefined
        ? slots[layer.id]
        : slots[slotData.contentFieldHint] !== undefined
        ? slots[slotData.contentFieldHint]
        : slots[slotData.slotType])
    : undefined

  // Fallback copy: only kicks in when content is falsy (unbound, explicitly blank, or
  // zero) — same falsy semantics as the render-time `if (!displayContent)` guard below,
  // so a design with no fallbackText configured renders byte-for-byte as before.
  const displayContent = content || slotData?.fallbackText

  // Shrink-to-fit: measure natural text size vs. the fixed box and derive a scale.
  // transform:scale doesn't affect scrollWidth/clientWidth, so measurement is stable
  // (no feedback loop). Runs only for the 'shrink' strategy.
  useEffect(() => {
    if (overflowFit !== 'shrink') { setShrinkScale(1); return }
    const el = textRef.current
    const box = el?.parentElement
    if (!el || !box) return
    const cw = box.clientWidth
    const ch = box.clientHeight
    const sw = el.scrollWidth
    const sh = el.scrollHeight
    if (!cw || !ch || !sw || !sh) return
    const k = Math.min(1, cw / sw, ch / sh)
    setShrinkScale(k > 0 && k < 1 ? k : 1)
  }, [displayContent, overflowFit, layer.width, layer.height, slotData?.fontSize])

  if (!layer.visible || layer.type !== 'slot' || !slotData) return null

  const { x, y, width, height, opacity } = layer

  // fontSize scaled by cqw, mirroring VoltRenderer's text/number layers: stored as px
  // at canvasWidth → renders proportionally with whatever container the card lands in.
  // Historically authored as a bare number; also accept a numeric string defensively.
  const safeCanvasWidth = Math.max(canvasWidth, 1)
  const rawFontSize = slotData.fontSize
  const parsedFontSize = typeof rawFontSize === 'number' ? rawFontSize : parseFloat(String(rawFontSize ?? ''))
  const fontSize = Number.isFinite(parsedFontSize)
    ? `${Math.min((Math.max(parsedFontSize, 6) / safeCanvasWidth) * 100, 50)}cqw`
    : 'inherit'
  const letterSpacing = slotData.letterSpacing
    ? `${(slotData.letterSpacing / safeCanvasWidth) * 100}cqw`
    : undefined

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    height: `${height}%`,
    opacity,
    // Rotation: only emit a transform when non-zero so un-rotated slots render byte-identically.
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    transformOrigin: layer.rotation ? 'center center' : undefined,
    fontFamily: slotData.fontFamily ?? 'inherit',
    fontSize,
    fontWeight: slotData.fontWeight ?? 'inherit',
    color: slotData.color ?? 'inherit',
    textAlign: slotData.textAlign ?? 'left',
    letterSpacing,
    textTransform: slotData.textTransform,
    overflow: (layer.bleed && canvasOverflow === 'visible') ? 'visible' : 'hidden',
    display: 'flex',
    alignItems: 'center',
  }

  // Body/paragraph slots render as multi-line copy: top-aligned, comfortable
  // line-height, natural wrapping. Every other slot type keeps its original
  // vertically-centered render byte-for-byte (backward-compatible).
  if (slotData.slotType === 'body') {
    style.alignItems = 'flex-start'
    style.whiteSpace = 'normal'
    style.lineHeight = (slotData as { lineHeight?: number } | undefined)?.lineHeight ?? 1.5
  }

  // pkg.options/pkg.features bind to a newline-joined list (see formatOptions) —
  // render each item on its own line instead of collapsing to one flowing line.
  const isOptionsBinding = slotData.contentFieldHint === 'pkg.options' || slotData.contentFieldHint === 'pkg.features'
    || slotData.contentFieldHint === 'options' || slotData.contentFieldHint === 'features'
  if (isOptionsBinding) {
    style.alignItems = 'flex-start'
    style.whiteSpace = 'pre-line'
    style.lineHeight = (slotData as { lineHeight?: number } | undefined)?.lineHeight ?? 1.5
  }

  if (slotData.slotType === 'image') {
    const imageUrl = content ?? slots.imageUrl
    if (!imageUrl) return null
    return (
      <div style={{ ...style, position: 'absolute' }}>
        <Image
          src={imageUrl}
          alt={slots.imageAlt ?? ''}
          fill
          style={{ objectFit: slotData.imageMode === 'fit' ? 'contain' : slotData.imageMode === 'crop' ? 'cover' : 'cover' }}
        />
      </div>
    )
  }

  if (slotData.slotType === 'action') {
    const label = content ?? slots.actionLabel
    const href = slots.actionHref ?? '#'
    if (!label) return null
    const variantClass: Record<string, string> = {
      filled: 'btn btn-primary',
      outline: 'btn btn-outline-primary',
      ghost: 'btn btn-link',
      dark: 'btn btn-dark',
    }
    return (
      <div style={style}>
        <a href={href} className={variantClass[slotData.buttonVariant ?? 'filled']}>{label}</a>
      </div>
    )
  }

  if (!displayContent) return null

  // Overflow-fit strategies keep long bound values inside the slot's own box.
  if (overflowFit === 'ellipsis') {
    return (
      <div style={style}>
        <span style={{ display: 'block', width: '100%', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayContent}
        </span>
      </div>
    )
  }
  if (overflowFit === 'shrink') {
    return (
      <div style={style}>
        <div
          ref={textRef}
          style={{ whiteSpace: 'nowrap', transform: `scale(${shrinkScale})`, transformOrigin: originForAlign(slotData.textAlign) }}
        >
          {displayContent}
        </div>
      </div>
    )
  }
  // Default 'clip' — byte-for-byte the original render (when no fallbackText is set).
  return <div style={style}>{displayContent}</div>
}
