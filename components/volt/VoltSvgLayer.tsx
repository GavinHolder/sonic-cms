'use client'
import type { VoltLayer, VoltLayerInstanceOverride, VoltFill, VoltLayerEffects } from '@/types/volt'

/** SVG <defs> filter block for layer effects (drop shadow, glow, blur). */
function SvgFilterDef({ layerId, effects }: { layerId: string; effects: VoltLayerEffects }) {
  const filterId = `fx-${layerId}`
  const primitives: React.ReactNode[] = []

  if (effects.layerBlur?.enabled) {
    primitives.push(<feGaussianBlur key="blur" stdDeviation={effects.layerBlur.blur} />)
  }

  if (effects.dropShadow?.enabled) {
    const s = effects.dropShadow
    const { r, g, b } = hexToRgbParts(s.color)
    primitives.push(
      <feDropShadow
        key="shadow"
        dx={s.offsetX}
        dy={s.offsetY}
        stdDeviation={s.blur / 2}
        floodColor={`rgb(${r},${g},${b})`}
        floodOpacity={s.opacity}
      />
    )
  }

  if (effects.outerGlow?.enabled) {
    const g2 = effects.outerGlow
    const { r, g, b } = hexToRgbParts(g2.color)
    primitives.push(
      <feDropShadow
        key="glow"
        dx={0}
        dy={0}
        stdDeviation={g2.blur / 2}
        floodColor={`rgb(${r},${g},${b})`}
        floodOpacity={g2.opacity}
      />
    )
  }

  if (!primitives.length) return null
  return (
    <defs>
      <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
        {primitives}
      </filter>
    </defs>
  )
}

function hexToRgbParts(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

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
  const isAngularGrad = !isGlass && primaryFill?.type === 'angular-gradient'
  const isImageFill = !isGlass && primaryFill?.type === 'image'
  const hasGradient = isLinearGrad || isRadialGrad
  const gradId = `volt-grad-${layer.id}`
  const patternId = `volt-pat-${layer.id}`

  let fillAttr = 'none'
  if (instanceOverride?.fill) {
    fillAttr = instanceOverride.fill
  } else if (!isGlass && primaryFill?.type === 'solid' && primaryFill.color) {
    fillAttr = primaryFill.color
  } else if (hasGradient) {
    fillAttr = `url(#${gradId})`
  } else if (isAngularGrad || isImageFill) {
    fillAttr = `url(#${patternId})`
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
  const hasFx = !!(layer.effects && (
    layer.effects.dropShadow?.enabled ||
    layer.effects.outerGlow?.enabled ||
    layer.effects.layerBlur?.enabled
  ))
  const filterId = hasFx ? `fx-${layer.id}` : undefined

  // Corner radius — clip the layer group to a rounded rect in % space
  const crRaw = vectorData.cornerRadius
  const crVal = Array.isArray(crRaw) ? crRaw[0] : (crRaw ?? 0)
  const hasCornerRadius = crVal > 0
  const crClipId = hasCornerRadius ? `cr-${layer.id}` : undefined
  // rx/ry in % coords (the path data lives in 0-100 space)
  const crRx = crVal / canvasWidth * 100
  const crRy = crVal / canvasHeight * 100

  return (
    <g
      id={`volt-layer-${layer.id}`}
      opacity={opacity}
      style={{ mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'] }}
      filter={filterId ? `url(#${filterId})` : undefined}
      clipPath={crClipId ? `url(#${crClipId})` : undefined}
    >
      {hasFx && layer.effects && <SvgFilterDef layerId={layer.id} effects={layer.effects} />}
      {hasGradient && primaryFill && <GradientDef fill={primaryFill} layerId={layer.id} />}
      {/* Angular gradient: SVG has no conic-gradient, so use foreignObject with CSS */}
      {isAngularGrad && primaryFill?.gradient && (
        <defs>
          <pattern id={patternId} patternUnits="objectBoundingBox" width="1" height="1">
            <foreignObject width={aw} height={ah}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: `conic-gradient(from ${primaryFill.gradient.angle ?? 0}deg, ${
                    (primaryFill.gradient.stops ?? [])
                      .map(s => `${s.color} ${s.position}%`)
                      .join(', ')
                  })`,
                }}
              />
            </foreignObject>
          </pattern>
        </defs>
      )}
      {/* Image fill: SVG pattern with embedded image */}
      {isImageFill && primaryFill?.imageUrl && (
        <defs>
          <pattern
            id={patternId}
            patternUnits="objectBoundingBox"
            width="1"
            height="1"
            preserveAspectRatio={
              primaryFill.imageMode === 'fit' ? 'xMidYMid meet' :
              primaryFill.imageMode === 'tile' ? 'none' : 'xMidYMid slice'
            }
          >
            <image
              href={primaryFill.imageUrl}
              width={aw}
              height={ah}
              preserveAspectRatio={
                primaryFill.imageMode === 'fit' ? 'xMidYMid meet' :
                primaryFill.imageMode === 'tile' ? 'none' : 'xMidYMid slice'
              }
            />
          </pattern>
        </defs>
      )}
      {hasCornerRadius && (
        <defs>
          <clipPath id={crClipId!}>
            <rect x={x} y={y} width={width} height={height} rx={crRx} ry={crRy} />
          </clipPath>
        </defs>
      )}
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
