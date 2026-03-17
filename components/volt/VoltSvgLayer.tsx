'use client'
import type { VoltLayer, VoltLayerInstanceOverride, VoltFill } from '@/types/volt'

interface Props {
  layer: VoltLayer
  canvasWidth: number
  canvasHeight: number
  instanceOverride?: VoltLayerInstanceOverride
}

/**
 * Convert a CSS-convention gradient angle (degrees) to SVG objectBoundingBox x1/y1/x2/y2.
 * CSS angle 0° = bottom→top, 90° = left→right, 180° = top→bottom.
 */
function angleToSvgPoints(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  return {
    x1: (0.5 - 0.5 * sin).toFixed(4),
    y1: (0.5 + 0.5 * cos).toFixed(4),
    x2: (0.5 + 0.5 * sin).toFixed(4),
    y2: (0.5 - 0.5 * cos).toFixed(4),
  }
}

/** Render a <linearGradient> or <radialGradient> defs element and return its id + the fill attr. */
function GradientDef({ fill, layerId }: { fill: VoltFill; layerId: string }) {
  const gradId = `volt-grad-${layerId}`
  const stops = fill.gradient?.stops ?? []

  if (fill.type === 'linear-gradient') {
    const angle = fill.gradient?.angle ?? 180
    const pts = angleToSvgPoints(angle)
    return (
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="objectBoundingBox"
          x1={pts.x1} y1={pts.y1}
          x2={pts.x2} y2={pts.y2}
        >
          {stops.map((s, i) => (
            <stop
              key={i}
              offset={`${s.position}%`}
              stopColor={s.color}
              stopOpacity={s.opacity}
            />
          ))}
        </linearGradient>
      </defs>
    )
  }

  if (fill.type === 'radial-gradient') {
    const ox = fill.gradient?.origin?.x ?? 50
    const oy = fill.gradient?.origin?.y ?? 50
    return (
      <defs>
        <radialGradient
          id={gradId}
          gradientUnits="objectBoundingBox"
          cx={`${ox}%`} cy={`${oy}%`}
          r="50%"
        >
          {stops.map((s, i) => (
            <stop
              key={i}
              offset={`${s.position}%`}
              stopColor={s.color}
              stopOpacity={s.opacity}
            />
          ))}
        </radialGradient>
      </defs>
    )
  }

  return null
}

export default function VoltSvgLayer({ layer, canvasWidth, canvasHeight, instanceOverride }: Props) {
  const isVisible = instanceOverride?.visible !== undefined ? instanceOverride.visible : layer.visible
  if (!isVisible || layer.type !== 'vector' || !layer.vectorData) return null

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
  // Glass fills are rendered as HTML overlays in VoltRenderer — skip in SVG
  const isGlass = primaryFill?.type === 'glass'

  const isLinearGrad = !isGlass && primaryFill?.type === 'linear-gradient'
  const isRadialGrad = !isGlass && primaryFill?.type === 'radial-gradient'
  const hasGradient = isLinearGrad || isRadialGrad
  const gradId = `volt-grad-${layer.id}`

  let fillAttr = 'none'
  if (instanceOverride?.fill) {
    fillAttr = instanceOverride.fill
  } else if (!isGlass && primaryFill?.type === 'solid' && primaryFill.color) {
    fillAttr = primaryFill.color
  } else if (hasGradient) {
    fillAttr = `url(#${gradId})`
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

  // Outer <g> receives the anime.js CSS-transform animations (translateX/Y, scale, rotate).
  // Inner <g> holds the SVG coordinate-mapping transforms (scale to canvas px, base rotation).
  // Separating them prevents anime CSS transforms from clobbering the SVG attribute transforms.
  return (
    <g
      id={`volt-layer-${layer.id}`}
      opacity={opacity}
      style={{ mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'] }}
    >
      {hasGradient && primaryFill && <GradientDef fill={primaryFill} layerId={layer.id} />}
      <g transform={transform || undefined}>
        <path
          d={vectorData.pathData}
          fill={fillAttr}
          fillOpacity={primaryFill?.opacity ?? 1}
          {...strokeAttr}
        />
      </g>
    </g>
  )
}
