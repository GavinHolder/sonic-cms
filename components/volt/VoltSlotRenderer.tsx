'use client'
import Image from 'next/image'
import type { VoltLayer, VoltSlots } from '@/types/volt'

interface Props {
  layer: VoltLayer
  canvasWidth: number
  canvasHeight: number
  slots: VoltSlots
}

export default function VoltSlotRenderer({ layer, canvasWidth, canvasHeight, slots }: Props) {
  if (!layer.visible || layer.type !== 'slot' || !layer.slotData) return null

  const { slotData, x, y, width, height, opacity } = layer

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    height: `${height}%`,
    opacity,
    fontFamily: slotData.fontFamily ?? 'inherit',
    fontSize: slotData.fontSize ?? 'inherit',
    fontWeight: slotData.fontWeight ?? 'inherit',
    color: slotData.color ?? 'inherit',
    textAlign: slotData.textAlign ?? 'left',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
  }

  // Use explicit undefined checks — empty string "" is valid content (not a fallback trigger)
  const content = slots[layer.id] !== undefined ? slots[layer.id]
    : slots[slotData.slotType] !== undefined ? slots[slotData.slotType]
    : slots[slotData.contentFieldHint]

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

  if (!content) return null
  return <div style={style}>{content}</div>
}
