"use client";

/**
 * InteractiveProductCard — Volt vision demo block
 *
 * - Custom GLB model (via modelUrl prop) OR procedural fallback geometry
 * - Slow floating idle with shadow
 * - On hover: object rises, accent shape slides in, text reveals, drag-rotate activates
 * - On leave: smooth return to rest
 */

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

interface Props {
  title?: string;
  subtitle?: string;
  description?: string;
  accentColor?: string;
  bg?: string;
  /** Optional GLB model URL — if omitted, uses procedural torusknot */
  modelUrl?: string;
  /** Scale multiplier for custom GLB (default 1) */
  modelScale?: number;
  /** Shape slide-in direction: "right" | "left" | "bottom" | "top" */
  shapeFrom?: "right" | "left" | "bottom" | "top";
}

export default function InteractiveProductCard({
  title = "Signature Collection",
  subtitle = "Hover to explore",
  description = "Crafted with precision. Every curve, every surface — designed to move.",
  accentColor = "#7c3aed",
  bg = "#0d0d1a",
  modelUrl,
  modelScale = 1,
  shapeFrom = "right",
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const clockRef = useRef<number>(0);
  const hoverRef = useRef(false);
  const objectRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderer: any = null;
    let resizeObs: ResizeObserver | null = null;

    async function setup() {
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );

      if (cancelled || !mountRef.current) return;
      const mount = mountRef.current;
      const w = mount.clientWidth || 400;
      const h = mount.clientHeight || 400;

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Scene + camera
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 100);
      camera.position.set(0, 0.4, 4.2);
      camera.lookAt(0, 0, 0);

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
      keyLight.position.set(3, 5, 3);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      scene.add(keyLight);
      const accentHex = parseInt(accentColor.replace("#", ""), 16);
      const accentLight = new THREE.PointLight(accentHex, 10, 7);
      accentLight.position.set(-2.5, 1.5, 2);
      scene.add(accentLight);
      const warmLight = new THREE.PointLight(0xff8040, 5, 7);
      warmLight.position.set(2.5, -1.5, 1.5);
      scene.add(warmLight);

      // Environment map for reflections
      const pmremGen = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x050510);
      const e1 = new THREE.PointLight(accentHex, 60, 20);
      e1.position.set(-5, 3, 5);
      const e2 = new THREE.PointLight(0xff5020, 50, 20);
      e2.position.set(5, -3, 3);
      const e3 = new THREE.PointLight(0x3030ff, 40, 20);
      e3.position.set(0, 5, -5);
      envScene.add(e1, e2, e3);
      const envTex = pmremGen.fromScene(envScene as any).texture;
      scene.environment = envTex;
      pmremGen.dispose();

      // Fake shadow disc
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const sCtx = shadowCanvas.getContext("2d")!;
      const grad = sCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, "rgba(0,0,0,0.6)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const fakeShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.1),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        })
      );
      fakeShadow.rotation.x = -Math.PI / 2;
      fakeShadow.position.y = -1.45;
      scene.add(fakeShadow);

      // Build 3D object — GLB if provided, else procedural torusknot
      if (modelUrl) {
        const { GLTFLoader } = await import(
          "three/examples/jsm/loaders/GLTFLoader.js"
        );
        if (cancelled) return;
        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            if (cancelled) return;
            const model = gltf.scene;
            // Normalize to ~2 unit bounding box
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) model.scale.setScalar((2 / maxDim) * modelScale);
            box.setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            // Apply environment map to all meshes
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = true;
                if (child.material) {
                  child.material.envMap = envTex;
                  child.material.envMapIntensity = 1.5;
                  child.material.needsUpdate = true;
                }
              }
            });
            scene.add(model);
            objectRef.current = model;
          },
          undefined,
          () => {
            // GLB load failed — fallback to procedural
            addProceduralObject(scene, envTex, THREE);
          }
        );
      } else {
        addProceduralObject(scene, envTex, THREE);
      }

      // OrbitControls — only active on hover
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.7;
      controls.enabled = false;
      controlsRef.current = controls;

      // Resize observer
      resizeObs = new ResizeObserver(() => {
        if (!mount) return;
        const nw = mount.clientWidth;
        const nh = mount.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      });
      resizeObs.observe(mount);

      // Animation loop
      const restY = 0;
      const hoverY = 0.6;
      let currentY = restY;

      const tick = () => {
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(tick);
        clockRef.current += 0.016;

        const isHovered = hoverRef.current;
        const floatOffset = Math.sin(clockRef.current * 0.8) * 0.18;
        const targetY = isHovered ? hoverY : restY + floatOffset;
        currentY += (targetY - currentY) * (isHovered ? 0.055 : 0.03);

        if (objectRef.current) {
          objectRef.current.position.y = currentY;
          if (!isHovered) {
            objectRef.current.rotation.y += 0.004;
            objectRef.current.rotation.x += 0.001;
          }
        }

        // Shadow shrinks as object rises
        const shadowScale = Math.max(0.25, 1 - (currentY - restY) * 0.6);
        fakeShadow.scale.set(shadowScale, shadowScale, 1);
        (fakeShadow.material as THREE.MeshBasicMaterial).opacity =
          shadowScale * 0.8;

        if (controlsRef.current) {
          controlsRef.current.enabled = isHovered;
          if (isHovered) controlsRef.current.update();
        }

        renderer.render(scene, camera);
      };

      tick();
      if (!cancelled) setMounted(true);
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      resizeObs?.disconnect();
      if (renderer) {
        renderer.dispose();
        if (
          mountRef.current &&
          renderer.domElement.parentNode === mountRef.current
        ) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accentColor, modelUrl]);

  const handleMouseEnter = () => {
    hoverRef.current = true;
    setHovered(true);
  };
  const handleMouseLeave = () => {
    hoverRef.current = false;
    setHovered(false);
  };

  // Shape slide-in offsets by direction
  const shapePos = getShapePosition(shapeFrom, hovered);
  const ringPos = getShapePosition(shapeFrom, hovered, true);

  const accentRgb = hexToRgb(accentColor);
  const shapeBg = accentRgb
    ? `radial-gradient(ellipse at 55% 45%, rgba(${accentRgb},0.88) 0%, rgba(${accentRgb},0.42) 60%, transparent 100%)`
    : accentColor;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: bg,
        borderRadius: "16px",
        overflow: "hidden",
        cursor: hovered ? "grab" : "default",
        boxShadow: hovered
          ? `0 0 0 1.5px ${accentColor}66, 0 32px 80px rgba(0,0,0,0.75)`
          : "0 8px 40px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.5s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Accent blob shape */}
      <div
        style={{
          position: "absolute",
          ...shapePos,
          width: "72%",
          aspectRatio: "1",
          borderRadius: "50%",
          background: shapeBg,
          filter: "blur(2px)",
          pointerEvents: "none",
          transition: hovered
            ? "all 0.72s cubic-bezier(0.22,1,0.36,1)"
            : "all 0.55s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 1,
        }}
      />

      {/* Ring outline */}
      <div
        style={{
          position: "absolute",
          ...ringPos,
          width: "52%",
          aspectRatio: "1",
          borderRadius: "50%",
          border: `1.5px solid ${accentColor}55`,
          pointerEvents: "none",
          transition: hovered
            ? "all 0.82s cubic-bezier(0.22,1,0.36,1) 0.07s"
            : "all 0.5s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 1,
        }}
      />

      {/* Three.js canvas */}
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.7s ease",
        }}
      />

      {/* Text overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "28px 28px 32px",
          zIndex: 3,
          pointerEvents: "none",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: accentColor,
            marginBottom: "6px",
            opacity: hovered ? 1 : 0.55,
            transition: "opacity 0.4s ease",
          }}
        >
          {subtitle}
        </div>

        <div
          style={{
            fontSize: "clamp(1rem, 2.4vw, 1.5rem)",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: hovered ? "10px" : "0",
            transform: hovered ? "translateY(0)" : "translateY(8px)",
            transition:
              "transform 0.45s cubic-bezier(0.22,1,0.36,1), margin 0.45s ease",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "0.83rem",
            color: "rgba(255,255,255,0.68)",
            lineHeight: 1.6,
            maxWidth: "280px",
            maxHeight: hovered ? "80px" : "0px",
            overflow: "hidden",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateY(0)" : "translateY(10px)",
            transition:
              "max-height 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s, opacity 0.4s ease 0.12s, transform 0.45s cubic-bezier(0.22,1,0.36,1) 0.08s",
          }}
        >
          {description}
        </div>

        <div
          style={{
            marginTop: "12px",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.3)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.4s ease 0.28s",
          }}
        >
          ↻ DRAG TO ROTATE
        </div>
      </div>
    </div>
  );
}

/** Adds procedural torusknot with iridescent/glass material */
function addProceduralObject(scene: any, envTex: any, THREE: any) {
  const geo = new THREE.TorusKnotGeometry(0.62, 0.21, 256, 24, 2, 3);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.04,
    transmission: 0.92,
    thickness: 0.9,
    ior: 2.2,
    iridescence: 1.0,
    iridescenceIOR: 2.6,
    iridescenceThicknessRange: [80, 900],
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMap: envTex,
    envMapIntensity: 2.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

/** Returns CSS position object for the sliding accent shape */
function getShapePosition(
  from: "right" | "left" | "bottom" | "top",
  hovered: boolean,
  ring = false
): React.CSSProperties {
  const offscreen = ring ? "65%" : "80%";
  const rested = ring ? "-15%" : "-8%";
  switch (from) {
    case "right":
      return {
        right: hovered ? rested : `-${offscreen}`,
        top: "50%",
        transform: "translateY(-50%)",
      };
    case "left":
      return {
        left: hovered ? rested : `-${offscreen}`,
        top: "50%",
        transform: "translateY(-50%)",
      };
    case "bottom":
      return {
        bottom: hovered ? rested : `-${offscreen}`,
        left: "50%",
        transform: "translateX(-50%)",
      };
    case "top":
      return {
        top: hovered ? rested : `-${offscreen}`,
        left: "50%",
        transform: "translateX(-50%)",
      };
  }
}

function hexToRgb(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
