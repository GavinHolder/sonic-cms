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
  const containerRef  = useRef<HTMLDivElement>(null)
  const flipInnerRef  = useRef<HTMLDivElement>(null)  // flip3d preserve-3d container
  const frontFaceRef  = useRef<HTMLDivElement>(null)  // front face div (all types)
  const backFaceRef   = useRef<HTMLDivElement>(null)  // back face div (all types)
  const activeAnimationsRef = useRef<AnimeAnimation[]>([])
  const isFlippedRef  = useRef(false)
  const autoTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const isTiltingRef  = useRef(false)

  const { layers, states, canvasWidth, canvasHeight, flipCard } = voltElement
  const sortedLayers = sortLayersByZ(layers)

  const isFlip         = !!(flipCard?.enabled)
  const flipAnimType   = flipCard?.animType    ?? 'flip3d'
  const flipTrigger    = flipCard?.trigger     ?? 'hover'
  const flipAxis       = flipCard?.axis === 'x' ? 'rotateX' : 'rotateY'
  const flipDuration   = flipCard?.duration    ?? 600
  const flipDirection  = flipCard?.direction   ?? 'right'
  const flipPerspective = flipCard?.perspective ?? 1200
  const flipAutoInterval = flipCard?.autoInterval ?? 3000

  // ── Spring ease string builder ─────────────────────────────────────────────
  // Anime.js v4 accepts 'spring(mass, stiffness, damping, velocity)' as an ease string
  const rawFlipEase = flipCard?.ease ?? 'easeInOut'
  const flipEase = rawFlipEase === 'spring'
    ? `spring(${flipCard?.springMass ?? 1}, ${flipCard?.springStiffness ?? 180}, ${flipCard?.springDamping ?? 12}, ${flipCard?.springVelocity ?? 0})`
    : rawFlipEase

  // Layers split by face for flip card mode.
  const frontLayers = isFlip ? sortedLayers.filter(l => l.face !== 'back') : sortedLayers
  const backLayers  = isFlip ? sortedLayers.filter(l => l.face === 'back')  : []

  // ── 3D tilt config ────────────────────────────────────────────────────────
  const tiltEnabled    = voltElement.tiltEnabled ?? false
  const tiltMaxDeg     = voltElement.tiltMaxDeg ?? 8
  const tiltPerspective = voltElement.tiltPerspective ?? 800

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // ── Layer state transitions (hover/rest/focus) ─────────────────────────────
    async function transitionToState(targetStateName: string) {
      const { animate } = await import('animejs')
      const targetState = states.find(s => s.name === targetStateName)
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

        if (!override && !isRest) continue
        if (!override && isRest && !anyAnimates) continue

        const layerEl = el?.querySelector(`#volt-layer-${layer.id}`)
        if (!layerEl) continue

        const { duration, ease, delay } = personalityToAnimeConfig(layer.animation)
        const targets: Record<string, unknown> = {}

        if (animates.opacity)  targets.opacity   = isRest ? (override?.opacity   ?? layer.opacity)     : (override?.opacity   ?? layer.opacity)
        if (animates.scale)    targets.scale      = isRest ? (override?.scale     ?? 1)                 : (override?.scale     ?? 1)
        if (animates.position) { targets.translateX = isRest ? (override?.translateX ?? 0) : (override?.translateX ?? 0); targets.translateY = isRest ? (override?.translateY ?? 0) : (override?.translateY ?? 0) }
        if (animates.rotation) targets.rotate     = isRest ? `${override?.rotation ?? 0}deg`            : `${override?.rotation ?? 0}deg`

        // Apply fill override directly on the SVG path (no animation — instant colour swap)
        if (layer.type === 'vector' && layer.vectorData) {
          const pathEl = layerEl.querySelector('path')
          if (pathEl) {
            const overrideFills = isRest ? null : (override?.fills ?? null)
            const activeFill = (overrideFills && overrideFills.length > 0) ? overrideFills[0] : layer.vectorData.fills?.[0]
            if (activeFill?.type === 'solid' && activeFill.color) {
              pathEl.setAttribute('fill', activeFill.color)
              pathEl.setAttribute('fill-opacity', String(activeFill.opacity ?? 1))
            }
          }
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

    // ── Flip animation dispatcher ──────────────────────────────────────────────
    async function animateFlip(toBack: boolean) {
      // Cancel any in-flight flip animations
      activeAnimationsRef.current.forEach(a => a.cancel())
      activeAnimationsRef.current = []

      const { animate } = await import('animejs')

      // ── flip3d ────────────────────────────────────────────────────────────────
      if (flipAnimType === 'flip3d') {
        const inner = flipInnerRef.current
        if (!inner) return
        const anim = animate(inner, {
          [flipAxis]: toBack ? '180deg' : '0deg',
          duration: flipDuration,
          ease: flipEase,
        }) as AnimeAnimation
        activeAnimationsRef.current.push(anim)

      // ── slide ─────────────────────────────────────────────────────────────────
      } else if (flipAnimType === 'slide') {
        const front = frontFaceRef.current
        const back  = backFaceRef.current
        if (!front || !back) return

        const isHoriz  = flipDirection === 'left' || flipDirection === 'right'
        const prop     = isHoriz ? 'translateX' : 'translateY'
        const outVal   = (flipDirection === 'right' || flipDirection === 'down') ? '-100%' : '100%'
        const inStart  = (flipDirection === 'right' || flipDirection === 'down') ? '100%'  : '-100%'

        if (toBack) {
          if (isHoriz) back.style.transform = `translateX(${inStart})`
          else         back.style.transform = `translateY(${inStart})`
          const a1 = animate(front, { [prop]: outVal, duration: flipDuration, ease: flipEase }) as AnimeAnimation
          const a2 = animate(back,  { [prop]: '0%',   duration: flipDuration, ease: flipEase }) as AnimeAnimation
          activeAnimationsRef.current.push(a1, a2)
        } else {
          if (isHoriz) front.style.transform = `translateX(${inStart})`
          else         front.style.transform = `translateY(${inStart})`
          const a1 = animate(back,  { [prop]: outVal, duration: flipDuration, ease: flipEase }) as AnimeAnimation
          const a2 = animate(front, { [prop]: '0%',   duration: flipDuration, ease: flipEase }) as AnimeAnimation
          activeAnimationsRef.current.push(a1, a2)
        }

      // ── scalefade ─────────────────────────────────────────────────────────────
      } else if (flipAnimType === 'scalefade') {
        const front = frontFaceRef.current
        const back  = backFaceRef.current
        if (!front || !back) return

        const half = Math.round(flipDuration * 0.5)

        if (toBack) {
          const a1 = animate(front, { opacity: 0, scale: 0.82, duration: half, ease: 'easeInCubic' }) as AnimeAnimation
          activeAnimationsRef.current.push(a1)
          const a2 = animate(back,  { opacity: 1, scale: 1,    duration: half, ease: flipEase, delay: half }) as AnimeAnimation
          activeAnimationsRef.current.push(a2)
        } else {
          const a1 = animate(back,  { opacity: 0, scale: 0.82, duration: half, ease: 'easeInCubic' }) as AnimeAnimation
          activeAnimationsRef.current.push(a1)
          const a2 = animate(front, { opacity: 1, scale: 1,    duration: half, ease: flipEase, delay: half }) as AnimeAnimation
          activeAnimationsRef.current.push(a2)
        }

      // ── swing (door hinge) ────────────────────────────────────────────────────
      } else if (flipAnimType === 'swing') {
        const front = frontFaceRef.current
        const back  = backFaceRef.current
        if (!front || !back) return

        const half = Math.round(flipDuration * 0.5)
        const rotProp = flipAxis

        const originMap: Record<string, string> = {
          right: '0% 50%',
          left:  '100% 50%',
          down:  '50% 0%',
          up:    '50% 100%',
        }
        const origin   = originMap[flipDirection] ?? '0% 50%'
        const frontOut = (flipDirection === 'right' || flipDirection === 'down') ? '-90deg' : '90deg'
        const backFrom = (flipDirection === 'right' || flipDirection === 'down') ? '90deg'  : '-90deg'

        front.style.transformOrigin = origin
        back.style.transformOrigin  = origin

        if (toBack) {
          back.style.transform = `${rotProp}(${backFrom})`
          const a1 = animate(front, { [rotProp]: frontOut, duration: half, ease: 'easeInCubic' }) as AnimeAnimation
          const a2 = animate(back,  { [rotProp]: '0deg',   duration: half, ease: flipEase, delay: Math.round(flipDuration * 0.45) }) as AnimeAnimation
          activeAnimationsRef.current.push(a1, a2)
        } else {
          front.style.transform = `${rotProp}(${backFrom})`
          const a1 = animate(back,  { [rotProp]: frontOut, duration: half, ease: 'easeInCubic' }) as AnimeAnimation
          const a2 = animate(front, { [rotProp]: '0deg',   duration: half, ease: flipEase, delay: Math.round(flipDuration * 0.45) }) as AnimeAnimation
          activeAnimationsRef.current.push(a1, a2)
        }
      }

      isFlippedRef.current = toBack
    }

    // ── Event wiring ───────────────────────────────────────────────────────────
    const onEnter = () => {
      transitionToState('hover')
      onHoverChange?.(true)
      if (isFlip && flipTrigger === 'hover' && !isFlippedRef.current) animateFlip(true)
    }
    const onLeave = () => {
      transitionToState('rest')
      onHoverChange?.(false)
      if (isFlip && flipTrigger === 'hover' && isFlippedRef.current) animateFlip(false)
    }
    const onClick = () => {
      if (!isFlip || flipTrigger !== 'click') return
      const next = !isFlippedRef.current
      animateFlip(next)
      transitionToState(next ? 'hover' : 'rest')
      onHoverChange?.(next)
    }
    const onFocus = () => { if (flipTrigger !== 'click') { transitionToState('focus'); onHoverChange?.(true) } }
    const onBlur  = () => { if (flipTrigger !== 'click') { transitionToState('rest');  onHoverChange?.(false) } }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('click',      onClick)
    el.addEventListener('focusin',    onFocus)
    el.addEventListener('focusout',   onBlur)

    // Auto-trigger loop
    if (isFlip && flipTrigger === 'auto') {
      autoTimerRef.current = setInterval(() => {
        const next = !isFlippedRef.current
        animateFlip(next)
      }, flipAutoInterval)
    }

    // ── Entrance animations (fire once on first viewport entry) ───────────────
    const layersWithEntrance = layers.filter(l => l.entranceAnim && l.entranceAnim.type !== 'none')
    if (layersWithEntrance.length > 0) {
      // Set initial hidden state immediately (before card is visible)
      for (const layer of layersWithEntrance) {
        const ea = layer.entranceAnim!
        const layerEl = el.querySelector<HTMLElement>(`#volt-layer-${layer.id}`)
        if (!layerEl) continue
        const dist = ea.distance ?? 40
        switch (ea.type) {
          case 'fadeIn':                       layerEl.style.opacity = '0'; break
          case 'slideInLeft':   layerEl.style.transform = `translateX(-${dist}px)`; layerEl.style.opacity = '0'; break
          case 'slideInRight':  layerEl.style.transform = `translateX(${dist}px)`;  layerEl.style.opacity = '0'; break
          case 'slideInUp':     layerEl.style.transform = `translateY(-${dist}px)`; layerEl.style.opacity = '0'; break
          case 'slideInDown':   layerEl.style.transform = `translateY(${dist}px)`;  layerEl.style.opacity = '0'; break
          case 'scaleIn':       layerEl.style.transform = 'scale(0.7)'; layerEl.style.opacity = '0'; break
          case 'rotateIn':      layerEl.style.transform = 'rotate(-15deg) scale(0.8)'; layerEl.style.opacity = '0'; break
          case 'flipInX':       layerEl.style.transform = 'rotateX(90deg)'; layerEl.style.opacity = '0'; break
          case 'flipInY':       layerEl.style.transform = 'rotateY(90deg)'; layerEl.style.opacity = '0'; break
        }
      }

      const entranceObserver = new IntersectionObserver(
        async (entries) => {
          if (!entries[0].isIntersecting) return
          entranceObserver.disconnect()
          const { animate } = await import('animejs')

          // Sort by z-index for stagger (lower z = plays first = background layers first)
          const sorted = [...layersWithEntrance].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
          let autoStagger = 0

          for (const layer of sorted) {
            const ea = layer.entranceAnim!
            const layerEl = el.querySelector<HTMLElement>(`#volt-layer-${layer.id}`)
            if (!layerEl) continue
            const duration = ea.duration ?? 600
            const delay    = (ea.delay ?? 0) + autoStagger
            const ease     = ea.ease ?? 'easeOutCubic'
            const targets: Record<string, unknown> = { opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: '0deg', rotateX: '0deg', rotateY: '0deg' }

            animate(layerEl, { ...targets, duration, delay, ease })
            autoStagger += 60  // 60ms stagger between layers
          }
        },
        { threshold: 0.1 }
      )
      entranceObserver.observe(el)

      // Store cleanup ref so we can disconnect if the component unmounts before firing
      ;(el as HTMLElement & { _voltEntranceObs?: IntersectionObserver })._voltEntranceObs = entranceObserver
    }

    // ── 3D Tilt + parallax depth ─────────────────────────────────────────────
    // Only active on non-flip cards (flip cards already have 3D perspective from the flip itself)
    let tiltRafId = 0
    let targetMX = 0
    let targetMY = 0
    let currentMX = 0
    let currentMY = 0

    const onTiltMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      targetMX = ((e.clientX - rect.left) / rect.width  - 0.5) * 2  // -1 to 1
      targetMY = ((e.clientY - rect.top)  / rect.height - 0.5) * 2  // -1 to 1
    }

    function tiltFrame() {
      if (!isTiltingRef.current || !el) return
      // Smooth lerp toward target
      currentMX += (targetMX - currentMX) * 0.12
      currentMY += (targetMY - currentMY) * 0.12

      const tx = currentMX * tiltMaxDeg
      const ty = currentMY * tiltMaxDeg
      el.style.transform = `perspective(${tiltPerspective}px) rotateX(${-ty}deg) rotateY(${tx}deg) scale(1.02)`

      // Parallax depth layers
      el.querySelectorAll<HTMLElement>('[data-volt-z]').forEach(layerEl => {
        const z = parseFloat(layerEl.dataset.voltZ || '0')
        if (z === 0) return
        const factor = z / 120  // z=120 → ~full parallax range
        const px = currentMX * factor * 14
        const py = currentMY * factor * 14
        const baseRot = layerEl.dataset.voltBaseRot || ''
        layerEl.style.transform = `translate(${px}px, ${py}px)${baseRot ? ` ${baseRot}` : ''}`
      })

      tiltRafId = requestAnimationFrame(tiltFrame)
    }

    const onTiltEnter = () => {
      if (!tiltEnabled || isFlip) return
      isTiltingRef.current = true
      el.style.transition = 'transform 0.1s ease-out'
      tiltRafId = requestAnimationFrame(tiltFrame)
    }

    const onTiltLeave = () => {
      if (!tiltEnabled || isFlip) return
      isTiltingRef.current = false
      cancelAnimationFrame(tiltRafId)
      targetMX = 0; targetMY = 0

      // Animate back to flat
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)'

      el.querySelectorAll<HTMLElement>('[data-volt-z]').forEach(layerEl => {
        const baseRot = layerEl.dataset.voltBaseRot || ''
        layerEl.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        layerEl.style.transform = baseRot || ''
      })
    }

    if (tiltEnabled && !isFlip) {
      el.addEventListener('mouseenter', onTiltEnter)
      el.addEventListener('mousemove',  onTiltMove)
      el.addEventListener('mouseleave', onTiltLeave)
    }

    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('click',      onClick)
      el.removeEventListener('focusin',    onFocus)
      el.removeEventListener('focusout',   onBlur)
      activeAnimationsRef.current.forEach(anim => anim.cancel())
      activeAnimationsRef.current = []
      if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null }
      if (tiltEnabled && !isFlip) {
        el.removeEventListener('mouseenter', onTiltEnter)
        el.removeEventListener('mousemove',  onTiltMove)
        el.removeEventListener('mouseleave', onTiltLeave)
        isTiltingRef.current = false
        cancelAnimationFrame(tiltRafId)
      }
      // Disconnect entrance observer if component unmounts before it fires
      const obs = (el as HTMLElement & { _voltEntranceObs?: IntersectionObserver })._voltEntranceObs
      if (obs) obs.disconnect()
    }
  }, [voltElement, isFlip, flipAnimType, flipTrigger, flipAxis, flipDuration, flipEase, flipDirection, flipPerspective, flipAutoInterval, tiltEnabled, tiltMaxDeg, tiltPerspective, layers, states])

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

  /**
   * Converts a VoltLayerEffects object into CSS box-shadow + filter strings.
   * Returns an object with `boxShadow` and `filter` ready to spread into a style prop.
   */
  function layerEffectStyles(layer: typeof sortedLayers[0]): React.CSSProperties {
    const fx = layer.effects
    if (!fx) return {}

    const shadows: string[] = []
    const filters: string[] = []

    if (fx.dropShadow?.enabled) {
      const s = fx.dropShadow
      const rgba = hexToRgba(s.color, s.opacity)
      const inset = s.inset ? 'inset ' : ''
      shadows.push(`${inset}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${rgba}`)
    }

    if (fx.outerGlow?.enabled) {
      const g = fx.outerGlow
      const rgba = hexToRgba(g.color, g.opacity)
      shadows.push(`0 0 ${g.blur}px ${g.spread}px ${rgba}`)
    }

    if (fx.layerBlur?.enabled) {
      filters.push(`blur(${fx.layerBlur.blur}px)`)
    }

    const result: React.CSSProperties = {}
    if (shadows.length) result.boxShadow = shadows.join(', ')
    if (filters.length) result.filter = filters.join(' ')
    return result
  }

  function hexToRgba(hex: string, opacity: number): string {
    const h = hex.replace('#', '')
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    return `rgba(${r},${g},${b},${opacity})`
  }

  /** Renders text layers as positioned HTML divs with full typography. */
  function renderTextLayers(layerList: typeof sortedLayers) {
    return layerList
      .filter(l => l.type === 'text' && l.visible !== false && l.textLayerData)
      .map(layer => {
        const td = layer.textLayerData!
        // fontSize scaled by cqw: stored as px at canvasWidth → renders proportionally
        const fontSizeCqw = `${(td.fontSize / canvasWidth) * 100}cqw`
        const letterSpacingCqw = td.letterSpacing
          ? `${(td.letterSpacing / canvasWidth) * 100}cqw`
          : undefined
        const alignItems =
          td.verticalAlign === 'center' ? 'center' :
          td.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'

        return (
          <div
            key={layer.id}
            id={`volt-layer-${layer.id}`}
            data-volt-z={layer.translateZ && layer.translateZ !== 0 ? layer.translateZ : undefined}
            data-volt-base-rot={layer.rotation ? `rotate(${layer.rotation}deg)` : undefined}
            style={{
              position: 'absolute',
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              opacity: layer.opacity ?? 1,
              transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
              mixBlendMode: layer.blendMode as React.CSSProperties['mixBlendMode'],
              display: 'flex',
              alignItems,
              overflow: 'hidden',
              pointerEvents: 'none',
              willChange: (layer.translateZ ?? 0) !== 0 ? 'transform' : undefined,
              ...layerEffectStyles(layer),
            }}
          >
            <div
              style={{
                width: '100%',
                fontFamily: td.fontFamily,
                fontSize: fontSizeCqw,
                fontWeight: td.fontWeight,
                fontStyle: td.fontStyle,
                color: td.color,
                textAlign: td.textAlign as React.CSSProperties['textAlign'],
                lineHeight: td.lineHeight,
                letterSpacing: letterSpacingCqw,
                textTransform: td.textTransform as React.CSSProperties['textTransform'],
                whiteSpace: td.wordWrap ? 'pre-wrap' : 'nowrap',
                wordBreak: td.wordWrap ? 'break-word' : undefined,
              }}
            >
              {td.content}
            </div>
          </div>
        )
      })
  }

  /** Renders image layers with optional parallax depth support. */
  function renderImageLayers(layerList: typeof sortedLayers) {
    return layerList
      .filter(l => l.type === 'image' && l.visible !== false && l.imageData?.url)
      .map(layer => {
        const z = layer.translateZ ?? 0
        const baseRot = layer.rotation ? `rotate(${layer.rotation}deg)` : ''
        return (
          <div
            key={layer.id}
            id={`volt-layer-${layer.id}`}
            data-volt-z={z !== 0 ? z : undefined}
            data-volt-base-rot={baseRot || undefined}
            style={{
              position: 'absolute',
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              opacity: layer.opacity ?? 1,
              transform: baseRot || undefined,
              overflow: 'hidden',
              willChange: z !== 0 ? 'transform' : undefined,
              ...layerEffectStyles(layer),
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
        )
      })
  }

  /** Renders a single face's layers (vectors, slots, images). */
  function renderFaceContent(faceLayers: typeof sortedLayers) {
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

        {renderImageLayers(faceLayers)}
        {renderTextLayers(faceLayers)}
      </>
    )
  }

  // ── Flip card mode ────────────────────────────────────────────────────────────
  if (isFlip) {
    const needs3DPerspective = flipAnimType === 'flip3d' || flipAnimType === 'swing'
    const clickable = flipTrigger === 'click'

    let backInitTransform: string | undefined
    let backInitOpacity: number | undefined

    if (flipAnimType === 'flip3d') {
      backInitTransform = flipCard?.axis === 'x' ? 'rotateX(180deg)' : 'rotateY(180deg)'
    } else if (flipAnimType === 'slide') {
      const isHoriz = flipDirection === 'left' || flipDirection === 'right'
      const inStart = (flipDirection === 'right' || flipDirection === 'down') ? '100%' : '-100%'
      backInitTransform = isHoriz ? `translateX(${inStart})` : `translateY(${inStart})`
    } else if (flipAnimType === 'scalefade') {
      backInitTransform = 'scale(0.82)'
      backInitOpacity   = 0
    } else if (flipAnimType === 'swing') {
      const backFrom = (flipDirection === 'right' || flipDirection === 'down') ? '90deg' : '-90deg'
      backInitTransform = `${flipAxis}(${backFrom})`
    }

    if (flipAnimType === 'flip3d') {
      return (
        <div
          ref={containerRef}
          className={className}
          style={{
            position: 'relative', width: '100%', aspectRatio,
            perspective: `${flipPerspective}px`,
            containerType: 'inline-size',
            cursor: clickable ? 'pointer' : undefined,
            ...style,
          }}
        >
          <div
            ref={flipInnerRef}
            style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}
          >
            <div ref={frontFaceRef} style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
              {renderFaceContent(frontLayers)}
            </div>
            <div
              ref={backFaceRef}
              style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden', transform: backInitTransform }}
            >
              {renderFaceContent(backLayers)}
            </div>
          </div>
        </div>
      )
    }

    // slide / scalefade / swing
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: 'relative', width: '100%', aspectRatio,
          overflow: flipAnimType === 'slide' ? 'hidden' : undefined,
          perspective: needs3DPerspective ? `${flipPerspective}px` : undefined,
          containerType: 'inline-size',
          cursor: clickable ? 'pointer' : undefined,
          ...style,
        }}
      >
        <div
          ref={frontFaceRef}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
        >
          {renderFaceContent(frontLayers)}
        </div>
        <div
          ref={backFaceRef}
          style={{
            position: 'absolute', inset: 0, overflow: 'hidden',
            transform: backInitTransform,
            opacity: backInitOpacity,
          }}
        >
          {renderFaceContent(backLayers)}
        </div>
      </div>
    )
  }

  // ── Standard (non-flip) mode ──────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative', width: '100%', aspectRatio,
        overflow: 'hidden',
        containerType: 'inline-size',   // enables cqw units for text layer font scaling
        willChange: tiltEnabled ? 'transform' : undefined,
        ...style,
      }}
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

      {renderImageLayers(sortedLayers)}
      {renderTextLayers(sortedLayers)}
    </div>
  )
}
