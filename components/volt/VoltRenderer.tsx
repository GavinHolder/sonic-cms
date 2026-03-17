'use client'
import { useEffect, useRef } from 'react'
import type { VoltElementData, VoltSlots, VoltInstanceOverrides } from '@/types/volt'
import { sortLayersByZ } from '@/lib/volt/volt-utils'
import { personalityToAnimeConfig } from '@/lib/volt/personality-to-anime'
import VoltSvgLayer from './VoltSvgLayer'
import VoltSlotRenderer from './VoltSlotRenderer'

// Anime.js v4 animate() returns an Animation instance with a .cancel() method.
type AnimeAnimation = { cancel: () => void }

interface Props {
  voltElement: VoltElementData
  slots?: VoltSlots
  /** Per-instance layer overrides — applied without modifying the master Volt design */
  instanceOverrides?: VoltInstanceOverrides
  className?: string
  style?: React.CSSProperties
  /** Called whenever hover state changes — lets VoltBlock drive 3D hover animations */
  onHoverChange?: (hovered: boolean) => void
}

export default function VoltRenderer({ voltElement, slots = {}, instanceOverrides, className, style, onHoverChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const flipInnerRef = useRef<HTMLDivElement>(null)
  // Track in-flight animations so cleanup can cancel them (anime v4 pattern).
  const activeAnimationsRef = useRef<AnimeAnimation[]>([])
  const { layers, states, canvasWidth, canvasHeight, flipCard } = voltElement
  const sortedLayers = sortLayersByZ(layers)

  const isFlip = !!(flipCard?.enabled)
  const flipAxis = flipCard?.axis === 'x' ? 'rotateX' : 'rotateY'
  const flipDuration = flipCard?.duration ?? 600
  const flipEase = flipCard?.ease ?? 'easeInOut'

  // Layers split by face for flip card mode.
  const frontLayers = isFlip ? sortedLayers.filter(l => l.face !== 'back') : sortedLayers
  const backLayers  = isFlip ? sortedLayers.filter(l => l.face === 'back')  : []

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    async function transitionToState(targetStateName: string) {
      const { animate } = await import('animejs')
      const targetState = states.find(s => s.name === targetStateName)
      // Allow 'rest' to proceed even without an explicit state entry (resets to defaults)
      if (!targetState && targetStateName !== 'rest') return

      const overrides = targetState?.layerOverrides ?? {}
      const isRest = targetStateName === 'rest'

      const ROLE_ORDER = ['accent', 'structure', 'overlay', 'background', 'content']
      const staggeredLayers = [...layers].sort((a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
      )

      let staggerIndex = 0
      for (const layer of staggeredLayers) {
        const override = overrides[layer.id]
        const { animates } = layer.animation
        const anyAnimates = animates.opacity || animates.scale || animates.position || animates.rotation

        // On rest transition: reset any layer that has animatable properties, even without
        // an explicit rest override — prevents layers sticking in hover state on mouse-leave.
        if (!override && !isRest) continue
        if (!override && isRest && !anyAnimates) continue

        const layerEl = el?.querySelector(`#volt-layer-${layer.id}`)
        if (!layerEl) continue

        const { duration, ease, delay } = personalityToAnimeConfig(layer.animation)
        const targets: Record<string, unknown> = {}

        if (animates.opacity) {
          targets.opacity = isRest
            ? (override?.opacity ?? layer.opacity)
            : (override?.opacity ?? layer.opacity)
        }
        if (animates.scale) {
          targets.scale = isRest ? (override?.scale ?? 1) : (override?.scale ?? 1)
        }
        if (animates.position) {
          targets.translateX = isRest ? (override?.translateX ?? 0) : (override?.translateX ?? 0)
          targets.translateY = isRest ? (override?.translateY ?? 0) : (override?.translateY ?? 0)
        }
        if (animates.rotation) {
          targets.rotate = isRest
            ? `${override?.rotation ?? 0}deg`
            : `${override?.rotation ?? 0}deg`
        }

        if (Object.keys(targets).length === 0) continue

        const anim = animate(layerEl, {
          ...targets,
          duration,
          ease,
          delay: (delay ?? 0) + staggerIndex * 40,
        }) as AnimeAnimation
        activeAnimationsRef.current.push(anim)
        staggerIndex++
      }
    }

    async function animateFlip(toHover: boolean) {
      if (!flipInnerRef.current) return
      const { animate } = await import('animejs')
      const anim = animate(flipInnerRef.current, {
        [flipAxis]: toHover ? '180deg' : '0deg',
        duration: flipDuration,
        ease: flipEase,
      }) as AnimeAnimation
      activeAnimationsRef.current.push(anim)
    }

    const onEnter = () => {
      if (isFlip) animateFlip(true)
      transitionToState('hover')
      onHoverChange?.(true)
    }
    const onLeave = () => {
      if (isFlip) animateFlip(false)
      transitionToState('rest')
      onHoverChange?.(false)
    }
    const onFocus  = () => { transitionToState('focus'); onHoverChange?.(true) }
    const onBlur   = () => { transitionToState('rest');  onHoverChange?.(false) }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('focusin',    onFocus)
    el.addEventListener('focusout',   onBlur)

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('focusin',    onFocus)
      el.removeEventListener('focusout',   onBlur)
      activeAnimationsRef.current.forEach(anim => anim.cancel())
      activeAnimationsRef.current = []
    }
  }, [voltElement, isFlip, flipAxis, flipDuration, flipEase])

  const aspectRatio = `${canvasWidth} / ${canvasHeight}`

  /** Glass overlay divs for vector layers whose primary fill is type 'glass'. */
  function renderGlassOverlays(layerList: typeof sortedLayers) {
    return layerList
      .filter(l => l.type === 'vector' && l.visible !== false && l.vectorData?.fills?.[0]?.type === 'glass')
      .map(layer => {
        const fill = layer.vectorData!.fills[0]
        const blur = fill.blur ?? 12
        const bgOpacity = fill.opacity ?? 0.15
        const borderOpacity = fill.borderOpacity ?? 0.3
        const radius = fill.glassBorderRadius ?? 12
        const bgColor = fill.color ?? '#ffffff'
        // Convert hex to rgba for semi-transparent bg
        const r = parseInt(bgColor.slice(1, 3), 16) || 255
        const g = parseInt(bgColor.slice(3, 5), 16) || 255
        const b = parseInt(bgColor.slice(5, 7), 16) || 255
        return (
          <div
            key={`glass-${layer.id}`}
            style={{
              position: 'absolute',
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              backgroundColor: `rgba(${r},${g},${b},${bgOpacity})`,
              border: `1px solid rgba(255,255,255,${borderOpacity})`,
              borderRadius: `${radius}px`,
              opacity: layer.opacity ?? 1,
              pointerEvents: 'none',
            }}
          />
        )
      })
  }

  // ── Flip card mode ────────────────────────────────────────────────────────────
  if (isFlip) {
    const backTransform = flipCard?.axis === 'x' ? 'rotateX(180deg)' : 'rotateY(180deg)'

    function renderFace(faceLayers: typeof sortedLayers) {
      return (
        <>
          {renderGlassOverlays(faceLayers)}
          <svg
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            {faceLayers
              .filter(l => l.type === 'vector')
              .map(layer => (
                <VoltSvgLayer
                  key={layer.id}
                  layer={layer}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  instanceOverride={instanceOverrides?.[layer.id]}
                />
              ))}
          </svg>

          {faceLayers
            .filter(l => l.type === 'slot')
            .map(layer => (
              <VoltSlotRenderer
                key={layer.id}
                layer={layer}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                slots={slots}
              />
            ))}

          {faceLayers
            .filter(l => l.type === 'image' && l.visible !== false && l.imageData?.url)
            .map(layer => (
              <div
                key={layer.id}
                id={`volt-layer-${layer.id}`}
                style={{
                  position: 'absolute',
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: `${layer.height}%`,
                  opacity: layer.opacity ?? 1,
                  transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                  overflow: 'hidden',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={layer.imageData!.url}
                  alt={layer.imageData!.alt ?? ''}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: layer.imageData!.mode === 'fit' ? 'contain' : 'cover',
                    display: 'block',
                  }}
                />
              </div>
            ))}
        </>
      )
    }

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: 'relative', width: '100%', aspectRatio, perspective: '1200px', ...style }}
      >
        <div
          ref={flipInnerRef}
          style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}
        >
          {/* Front face */}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
            {renderFace(frontLayers)}
          </div>
          {/* Back face — pre-rotated 180deg so it shows when card flips */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', overflow: 'hidden',
            transform: backTransform,
          }}>
            {renderFace(backLayers)}
          </div>
        </div>
      </div>
    )
  }

  // ── Standard (non-flip) mode ──────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden', ...style }}
    >
      {renderGlassOverlays(sortedLayers)}
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        {sortedLayers
          .filter(l => l.type === 'vector')
          .map(layer => (
            <VoltSvgLayer
              key={layer.id}
              layer={layer}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              instanceOverride={instanceOverrides?.[layer.id]}
            />
          ))}
      </svg>

      {sortedLayers
        .filter(l => l.type === 'slot')
        .map(layer => (
          <VoltSlotRenderer
            key={layer.id}
            layer={layer}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            slots={slots}
          />
        ))}

      {sortedLayers
        .filter(l => l.type === 'image' && l.visible !== false && l.imageData?.url)
        .map(layer => (
          <div
            key={layer.id}
            id={`volt-layer-${layer.id}`}
            style={{
              position: 'absolute',
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              opacity: layer.opacity ?? 1,
              transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={layer.imageData!.url}
              alt={layer.imageData!.alt ?? ''}
              style={{
                width: '100%',
                height: '100%',
                objectFit: layer.imageData!.mode === 'fit' ? 'contain' : 'cover',
                display: 'block',
              }}
            />
          </div>
        ))}
    </div>
  )
}
