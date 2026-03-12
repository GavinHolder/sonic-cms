'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { VoltObject3DData } from '@/types/volt'

interface Props {
  data: VoltObject3DData
  x: number
  y: number
  width: number
  height: number
  sectionRef: React.RefObject<HTMLElement | null>
}

export default function Volt3DRenderer({ data, x, y, width, height, sectionRef }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const isPlayingRef = useRef(false)
  const mixerRef = useRef<any>(null)
  const actionRef = useRef<any>(null)
  const clockRef = useRef<any>(null)
  const rendererRef = useRef<any>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const stopRender = useCallback(() => {
    isPlayingRef.current = false
    cancelAnimationFrame(rafRef.current)
    if (actionRef.current) actionRef.current.paused = true
  }, [])

  const startRender = useCallback(() => {
    if (isPlayingRef.current) return
    isPlayingRef.current = true
    if (actionRef.current) {
      actionRef.current.paused = false
      actionRef.current.play()
    }
    // tick is set up inside setup() with closure-scoped scene/camera
    // startRender here just flips the flag; actual tick loop is started after model load
  }, [])

  useEffect(() => {
    let cancelled = false
    let resizeObs: ResizeObserver | null = null
    let rendererLocal: any = null

    async function setup() {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

      if (cancelled || !mountRef.current) return

      const mount = mountRef.current
      const w = mount.clientWidth
      const h = mount.clientHeight

      // Renderer — low poly preview mode
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
      renderer.setPixelRatio(1)
      renderer.shadowMap.enabled = false
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.setSize(w, h)
      mount.appendChild(renderer.domElement)
      rendererLocal = renderer
      rendererRef.current = renderer

      // Background
      if (!data.transparent && data.backgroundColor) {
        renderer.setClearColor(data.backgroundColor, 1)
      } else {
        renderer.setClearColor(0x000000, 0)
      }

      // Scene
      const scene = new THREE.Scene()

      // Camera — use azimuth + elevation to position
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)
      const dist = data.cameraDistance ?? 4
      const elRad = ((data.cameraElevation ?? 20) * Math.PI) / 180
      const azRad = ((data.cameraAzimuth ?? 0) * Math.PI) / 180
      camera.position.set(
        dist * Math.cos(elRad) * Math.sin(azRad),
        dist * Math.sin(elRad),
        dist * Math.cos(elRad) * Math.cos(azRad)
      )
      camera.lookAt(0, 0, 0)

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, data.ambientIntensity ?? 0.8))
      const keyAngleRad = ((data.keyLightAngle ?? 45) * Math.PI) / 180
      const key = new THREE.DirectionalLight(0xffffff, data.keyLightIntensity ?? 1.5)
      key.position.set(
        3 * Math.cos(keyAngleRad),
        5,
        3 * Math.sin(keyAngleRad)
      )
      scene.add(key)

      // OrbitControls (disabled interaction — preview only)
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableZoom = false
      controls.enablePan = false
      controls.enableRotate = false
      controls.autoRotate = false

      // Clock for animation mixer
      const clock = new THREE.Clock()
      clockRef.current = clock

      // Tick loop (closure-scoped scene/camera)
      const tick = () => {
        if (!isPlayingRef.current) return
        rafRef.current = requestAnimationFrame(tick)
        mixerRef.current?.update(clock.getDelta())
        controls.update()
        renderer.render(scene, camera)
      }

      // Override startRender to use this tick
      const startRenderLocal = () => {
        if (isPlayingRef.current) return
        isPlayingRef.current = true
        if (actionRef.current) {
          actionRef.current.paused = false
          actionRef.current.play()
        }
        tick()
      }

      // IntersectionObserver — play when section >= 30% visible
      if (sectionRef.current) {
        const obs = new IntersectionObserver(
          (entries) => {
            if (entries[0].intersectionRatio >= 0.3) {
              startRenderLocal()
            } else {
              stopRender()
            }
          },
          { threshold: [0, 0.3, 1] }
        )
        obs.observe(sectionRef.current)
        observerRef.current = obs
      }

      // ResizeObserver
      resizeObs = new ResizeObserver(() => {
        if (!mount) return
        const nw = mount.clientWidth
        const nh = mount.clientHeight
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh)
      })
      resizeObs.observe(mount)

      // Load GLB
      const loader = new GLTFLoader()
      loader.load(data.assetUrl, (gltf) => {
        if (cancelled) return

        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) model.scale.setScalar(2 / maxDim)

        box.setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        model.position.sub(center)

        scene.add(model)

        // Animations — use animationMap to find active track
        const clips = gltf.animations ?? []
        if (clips.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(model)

          // Find the first mapped animation that exists in clips, or fall back to clips[0]
          const mappedTracks = Object.values(data.animationMap).filter(Boolean)
          let targetClip = clips[0]
          for (const mapped of mappedTracks) {
            if (!mapped) continue
            const found = clips.find((c) => c.name === mapped.trackName)
            if (found) {
              targetClip = found
              break
            }
          }

          actionRef.current = mixerRef.current.clipAction(targetClip)
          actionRef.current.play()
        }

        startRenderLocal()
      })
    }

    setup()

    return () => {
      cancelled = true
      stopRender()
      observerRef.current?.disconnect()
      observerRef.current = null
      resizeObs?.disconnect()
      if (rendererLocal) {
        rendererLocal.dispose()
        if (mountRef.current && rendererLocal.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererLocal.domElement)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.assetUrl, data.animationMap])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  )
}
