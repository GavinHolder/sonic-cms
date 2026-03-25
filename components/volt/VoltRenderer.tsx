'use client'
import { useEffect, useRef, useState } from 'react'
import type { VoltElementData, VoltSlots, VoltInstanceOverrides, VoltBreakpoint } from '@/types/volt'
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

  const { layers: rawLayers, states, canvasWidth, canvasHeight, flipCard, breakpoints } = voltElement
  const [activeBreakpoint, setActiveBreakpoint] = useState<VoltBreakpoint | null>(null)

  // ResizeObserver to detect active breakpoint based on container width
  useEffect(() => {
    if (!breakpoints || breakpoints.length === 0 || !containerRef.current) return
    const sorted = [...breakpoints].sort((a, b) => a.maxWidth - b.maxWidth)
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      const bp = sorted.find(b => width <= b.maxWidth) ?? null
      setActiveBreakpoint(bp)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [breakpoints])

  // Apply breakpoint overrides to layers
  const layers = rawLayers.map(layer => {
    if (!activeBreakpoint) return layer
    const override = activeBreakpoint.layerOverrides[layer.id]
    if (!override) return layer
    return {
      ...layer,
      ...(override.x !== undefined ? { x: override.x } : {}),
      ...(override.y !== undefined ? { y: override.y } : {}),
      ...(override.width !== undefined ? { width: override.width } : {}),
      ...(override.height !== undefined ? { height: override.height } : {}),
      ...(override.visible !== undefined ? { visible: override.visible } : {}),
      ...(override.fontSize !== undefined && layer.textLayerData ? {
        textLayerData: { ...layer.textLayerData, fontSize: override.fontSize }
      } : {}),
    }
  })

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

  // ── Load Google Fonts used by text layers ──────────────────────────────────
  useEffect(() => {
    const systemFonts = new Set(['Arial', 'Georgia', 'Times New Roman', 'Helvetica', 'Courier New', 'system-ui', 'inherit'])
    const fonts = new Set<string>()
    for (const layer of layers) {
      if (layer.type === 'text' && layer.textLayerData?.fontFamily) {
        const family = layer.textLayerData.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
        if (family && !systemFonts.has(family)) fonts.add(family)
      }
    }
    if (fonts.size === 0) return
    const families = [...fonts].map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`).join('&')
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`
    // Check if link already exists
    const existing = document.querySelector(`link[href="${href}"]`)
    if (existing) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [layers])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // ── Layer state transitions (hover/rest/focus) ─────────────────────────────
    async function transitionToState(targetStateName: string) {
      // Cancel any in-flight animations before starting new transition
      activeAnimationsRef.current.forEach(a => a.cancel())
      activeAnimationsRef.current = []

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

        // REST: animate back to base layer values (ignore overrides)
        // HOVER: animate to override values (the hover state target)
        if (animates.opacity)  targets.opacity   = isRest ? layer.opacity       : (override?.opacity   ?? layer.opacity)
        if (animates.scale)    targets.scale      = isRest ? 1                  : (override?.scale     ?? 1)
        if (animates.position) {
          targets.translateX = isRest ? 0 : (override?.translateX ?? 0)
          targets.translateY = isRest ? 0 : (override?.translateY ?? 0)
        }
        if (animates.rotation) targets.rotate     = isRest ? '0deg'             : `${override?.rotation ?? 0}deg`

        // Apply fill override directly on the SVG path (no animation — instant colour swap)
        if (layer.type === 'vector' && layer.vectorData) {
          const pathEl = layerEl.querySelector('path')
          if (pathEl) {
            if (isRest) {
              // Restore base fill — could be solid, gradient, or glass
              const baseFill = layer.vectorData.fills?.[0]
              if (baseFill) {
                if (baseFill.type === 'solid' && baseFill.color) {
                  pathEl.setAttribute('fill', baseFill.color)
                  pathEl.setAttribute('fill-opacity', String(baseFill.opacity ?? 1))
                } else if (baseFill.type === 'linear-gradient' || baseFill.type === 'radial-gradient' || baseFill.type === 'angular-gradient') {
                  // Restore gradient reference — gradient defs use layer id as part of the id
                  const gradId = `volt-grad-${layer.id}`
                  pathEl.setAttribute('fill', `url(#${gradId})`)
                  pathEl.removeAttribute('fill-opacity')
                }
              }
            } else {
              // Apply hover override fill (if any)
              const overrideFills = override?.fills ?? null
              const activeFill = (overrideFills && overrideFills.length > 0) ? overrideFills[0] : null
              if (activeFill?.type === 'solid' && activeFill.color) {
                pathEl.setAttribute('fill', activeFill.color)
                pathEl.setAttribute('fill-opacity', String(activeFill.opacity ?? 1))
              }
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

    // ── Exit animations (fire when card leaves viewport) ────────────────────
    const layersWithExit = layers.filter(l => l.exitAnim && l.exitAnim.type !== 'none')
    if (layersWithExit.length > 0) {
      const exitObserver = new IntersectionObserver(
        async (entries) => {
          // Fire when element is NO LONGER intersecting (leaving viewport)
          if (entries[0].isIntersecting) return
          const { animate } = await import('animejs')

          for (const layer of layersWithExit) {
            const xa = layer.exitAnim!
            const layerEl = el.querySelector<HTMLElement>(`#volt-layer-${layer.id}`)
            if (!layerEl) continue
            const duration = xa.duration ?? 600
            const delay = xa.delay ?? 0
            const ease = xa.ease ?? 'easeInCubic'
            const dist = xa.distance ?? 40
            const targets: Record<string, unknown> = {}

            switch (xa.type) {
              case 'fadeOut':      targets.opacity = 0; break
              case 'slideOutLeft': targets.translateX = -dist; targets.opacity = 0; break
              case 'slideOutRight': targets.translateX = dist; targets.opacity = 0; break
              case 'slideOutUp':   targets.translateY = -dist; targets.opacity = 0; break
              case 'slideOutDown': targets.translateY = dist; targets.opacity = 0; break
              case 'scaleOut':     targets.scale = 0.7; targets.opacity = 0; break
              case 'rotateOut':    targets.rotate = '15deg'; targets.scale = 0.8; targets.opacity = 0; break
            }
            if (Object.keys(targets).length > 0) {
              animate(layerEl, { ...targets, duration, delay, ease })
            }
          }
        },
        { threshold: 0 }
      )
      // Only start observing after a delay (so entrance plays first)
      setTimeout(() => exitObserver.observe(el), 1000)
      ;(el as HTMLElement & { _voltExitObs?: IntersectionObserver })._voltExitObs = exitObserver
    }

    // ── Scroll-triggered state transitions ──────────────────────────────────
    const scrollStates = states.filter(s =>
      s.trigger === 'scroll-25' || s.trigger === 'scroll-50' || s.trigger === 'scroll-75' || s.trigger === 'scroll-100'
    )
    if (scrollStates.length > 0) {
      // Map trigger names to threshold values
      const triggerThresholds: Record<string, number> = {
        'scroll-25': 0.25, 'scroll-50': 0.5, 'scroll-75': 0.75, 'scroll-100': 1.0,
      }
      const thresholds = scrollStates.map(s => triggerThresholds[s.trigger] ?? 0.5)
      let lastTriggered = ''

      const scrollObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (!entry.isIntersecting) {
            if (lastTriggered) { transitionToState('rest'); lastTriggered = '' }
            return
          }
          // Find the highest threshold that's been crossed
          const ratio = entry.intersectionRatio
          let bestState = ''
          let bestThreshold = 0
          for (const ss of scrollStates) {
            const t = triggerThresholds[ss.trigger] ?? 0.5
            if (ratio >= t && t >= bestThreshold) { bestState = ss.name; bestThreshold = t }
          }
          if (bestState && bestState !== lastTriggered) {
            transitionToState(bestState)
            lastTriggered = bestState
          }
        },
        { threshold: [0, ...thresholds] }
      )
      scrollObserver.observe(el)
      ;(el as HTMLElement & { _voltScrollObs?: IntersectionObserver })._voltScrollObs = scrollObserver
    }

    // ── Timeline keyframe animations ──────────────────────────────────────────
    const layersWithTimeline = layers.filter(l => l.timeline && l.timeline.keyframes.length >= 2)
    if (layersWithTimeline.length > 0) {
      const playTimelines = async () => {
        const { animate } = await import('animejs')
        for (const layer of layersWithTimeline) {
          const tl = layer.timeline!
          const layerEl = el.querySelector<HTMLElement>(`#volt-layer-${layer.id}`)
          if (!layerEl) continue

          const sortedKf = [...tl.keyframes].sort((a, b) => a.time - b.time)

          // Animate through each keyframe segment sequentially
          for (let i = 0; i < sortedKf.length - 1; i++) {
            const from = sortedKf[i]
            const to = sortedKf[i + 1]
            const segDuration = to.time - from.time
            if (segDuration <= 0) continue

            const targets: Record<string, unknown> = {}
            if (to.props.opacity !== undefined) targets.opacity = to.props.opacity
            if (to.props.translateX !== undefined) targets.translateX = to.props.translateX
            if (to.props.translateY !== undefined) targets.translateY = to.props.translateY
            if (to.props.scaleX !== undefined || to.props.scaleY !== undefined) {
              const sx = to.props.scaleX ?? 1
              const sy = to.props.scaleY ?? 1
              targets.scale = sx === sy ? sx : sx // uniform scale for now
            }
            if (to.props.rotate !== undefined) targets.rotate = `${to.props.rotate}deg`

            if (Object.keys(targets).length === 0) continue

            // Set initial state from first keyframe
            if (i === 0) {
              if (from.props.opacity !== undefined) layerEl.style.opacity = String(from.props.opacity)
              if (from.props.translateX !== undefined || from.props.translateY !== undefined) {
                layerEl.style.transform = `translate(${from.props.translateX ?? 0}px, ${from.props.translateY ?? 0}px) scale(${from.props.scaleX ?? 1}) rotate(${from.props.rotate ?? 0}deg)`
              }
            }

            const anim = animate(layerEl, {
              ...targets,
              duration: segDuration,
              ease: to.ease ?? 'easeInOutQuad',
              delay: i === 0 ? from.time : 0,
            }) as AnimeAnimation
            activeAnimationsRef.current.push(anim)
          }

          // Loop: replay from start after last keyframe
          if (tl.loop) {
            const totalDuration = sortedKf[sortedKf.length - 1].time
            const loopTimer = setInterval(() => {
              // Re-run all keyframe animations
              playTimelines()
            }, totalDuration + 100) // small gap between loops
            // Store for cleanup
            const origCleanup = autoTimerRef.current
            autoTimerRef.current = loopTimer
            if (origCleanup) clearInterval(origCleanup)
          }
        }
      }

      if (layersWithTimeline.some(l => l.timeline!.autoplay !== false)) {
        // Use IntersectionObserver to trigger on viewport entry
        const timelineObserver = new IntersectionObserver(
          (entries) => {
            if (!entries[0].isIntersecting) return
            timelineObserver.disconnect()
            playTimelines()
          },
          { threshold: 0.1 }
        )
        timelineObserver.observe(el)
      }
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
      // Disconnect scroll observer
      const sobs = (el as HTMLElement & { _voltScrollObs?: IntersectionObserver })._voltScrollObs
      if (sobs) sobs.disconnect()
      // Disconnect exit observer
      const xobs = (el as HTMLElement & { _voltExitObs?: IntersectionObserver })._voltExitObs
      if (xobs) xobs.disconnect()
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
  /** Build clip-path CSS from a mask layer's SVG path data (percentage coords). */
  function getClipPath(layer: typeof sortedLayers[0]): string | undefined {
    if (!layer.clipMaskLayerId) return undefined
    const maskLayer = layers.find(l => l.id === layer.clipMaskLayerId)
    if (!maskLayer || maskLayer.type !== 'vector' || !maskLayer.vectorData?.pathData) return undefined
    // SVG path data is in 0-100% coordinate space — use it directly as CSS clip-path
    return `path('${maskLayer.vectorData.pathData}')`
  }

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
        const safeCanvasWidth = Math.max(canvasWidth, 1)
        const safeFontSize = Math.max(td.fontSize ?? 16, 6)
        const fontSizeCqw = `${Math.min((safeFontSize / safeCanvasWidth) * 100, 50)}cqw`
        const letterSpacingCqw = td.letterSpacing
          ? `${(td.letterSpacing / safeCanvasWidth) * 100}cqw`
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
              clipPath: getClipPath(layer),
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
        background: voltElement.canvasBackground ?? undefined,
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
