'use client'
import { useEffect, useRef } from 'react'
import type { VoltElementData, VoltSlots } from '@/types/volt'
import { sortLayersByZ } from '@/lib/volt/volt-utils'
import { personalityToAnimeConfig } from '@/lib/volt/personality-to-anime'
import VoltSvgLayer from './VoltSvgLayer'
import VoltSlotRenderer from './VoltSlotRenderer'

interface Props {
  voltElement: VoltElementData
  slots?: VoltSlots
  className?: string
  style?: React.CSSProperties
}

export default function VoltRenderer({ voltElement, slots = {}, className, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { layers, states, canvasWidth, canvasHeight } = voltElement
  const sortedLayers = sortLayersByZ(layers)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    async function transitionToState(targetStateName: string) {
      const { animate } = await import('animejs')
      const targetState = states.find(s => s.name === targetStateName)
      if (!targetState) return

      const overrides = targetState.layerOverrides ?? {}
      const ROLE_ORDER = ['accent', 'structure', 'overlay', 'background', 'content']
      const staggeredLayers = [...layers].sort((a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
      )

      let staggerIndex = 0
      for (const layer of staggeredLayers) {
        const override = overrides[layer.id]
        if (!override) continue

        const layerEl = el?.querySelector(`#volt-layer-${layer.id}`)
        if (!layerEl) continue

        const { duration, ease, delay } = personalityToAnimeConfig(layer.animation)
        const targets: Record<string, unknown> = {}

        if (layer.animation.animates.opacity && override.opacity !== undefined) {
          targets.opacity = override.opacity
        }
        if (layer.animation.animates.scale && override.scale !== undefined) {
          targets.scale = override.scale
        }

        if (Object.keys(targets).length === 0) continue

        animate(layerEl, {
          ...targets,
          duration,
          ease,
          delay: (delay ?? 0) + staggerIndex * 40,
        })
        staggerIndex++
      }
    }

    const onEnter = () => transitionToState('hover')
    const onLeave = () => transitionToState('rest')
    const onFocus  = () => transitionToState('focus')
    const onBlur   = () => transitionToState('rest')

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('focusin',    onFocus)
    el.addEventListener('focusout',   onBlur)

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('focusin',    onFocus)
      el.removeEventListener('focusout',   onBlur)
    }
  }, [voltElement, layers, states])

  const aspectRatio = `${canvasWidth} / ${canvasHeight}`

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden', ...style }}
    >
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
    </div>
  )
}
