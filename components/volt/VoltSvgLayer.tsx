'use client'
import type { VoltLayer } from '@/types/volt'

interface Props {
  layer: VoltLayer
  canvasWidth: number
  canvasHeight: number
}

export default function VoltSvgLayer({ layer, canvasWidth, canvasHeight }: Props) {
  if (!layer.visible || layer.type !== 'vector' || !layer.vectorData) return null

  const { vectorData, opacity, blendMode, rotation, x, y, width, height } = layer
  const ax = (x / 100) * canvasWidth
  const ay = (y / 100) * canvasHeight
  const aw = (width / 100) * canvasWidth
  const ah = (height / 100) * canvasHeight
  const cx = ax + aw / 2
  const cy = ay + ah / 2

  const fills = vectorData.fills ?? []
  const stroke = vectorData.stroke
  const primaryFill = fills[0]
  let fillAttr = 'none'
  if (primaryFill?.type === 'solid' && primaryFill.color) {
    fillAttr = primaryFill.color
  }

  const strokeAttr = stroke ? {
    stroke: stroke.color,
    strokeOpacity: stroke.opacity,
    strokeWidth: stroke.width,
    strokeLinecap: stroke.cap,
    strokeLinejoin: stroke.join,
    strokeDasharray: stroke.dash?.join(' ') ?? undefined,
  } : {}

  // pathData coords are in % space (0-100); scale to canvas pixel space
  const scaleTransform = `scale(${canvasWidth / 100}, ${canvasHeight / 100})`
  const rotateTransform = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined
  const transform = [rotateTransform, scaleTransform].filter(Boolean).join(' ')

  return (
    <g
      id={`volt-layer-${layer.id}`}
      opacity={opacity}
      style={{ mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'] }}
      transform={transform || undefined}
    >
      <path
        d={vectorData.pathData}
        fill={fillAttr}
        fillOpacity={primaryFill?.opacity ?? 1}
        {...strokeAttr}
      />
    </g>
  )
}
