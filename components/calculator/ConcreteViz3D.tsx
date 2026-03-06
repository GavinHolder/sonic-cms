"use client";

import { useEffect, useRef } from "react";
import type { CalcType, CalcResult } from "@/lib/concrete-calculator";

interface ConcreteViz3DProps {
  calcType: CalcType;
  dimensions: Record<string, number>;
  result: CalcResult | null;
}

export default function ConcreteViz3D({ calcType, dimensions, result: _result }: ConcreteViz3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateRef = useRef<any>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let destroyed = false;

    async function initScene() {
      const THREE = await import("three");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js" as any);
      const { animate: animeAnimate } = await import("animejs");

      if (destroyed || !mountRef.current) return;

      const W = mountRef.current.clientWidth || 400;
      const H = Math.min(W * 0.6, 500);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f9fa);

      // Camera
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
      camera.position.set(3, 3, 5);
      camera.lookAt(0, 0, 0);

      // Lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
      const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
      sun.position.set(5, 8, 5);
      sun.castShadow = true;
      scene.add(sun);
      const hemi = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.4);
      scene.add(hemi);

      // Ground grid
      const grid = new THREE.GridHelper(10, 20, 0xcccccc, 0xdddddd);
      scene.add(grid);

      // Concrete material
      const material = new THREE.MeshStandardMaterial({
        color: 0x9e9e9e,
        roughness: 0.9,
        metalness: 0.0,
      });

      // Geometry based on type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let geometry: any;
      const L = Math.max(0.1, Math.min((dimensions.length ?? 1000) / 1000, 5));
      const W3 = Math.max(0.1, Math.min((dimensions.width ?? 1000) / 1000, 5));
      const D = Math.max(0.05, Math.min((dimensions.depth ?? dimensions.height ?? 200) / 1000, 3));

      if (calcType === "column") {
        const r = Math.max(0.05, Math.min((dimensions.diameter ?? 300) / 2000, 1));
        const h = Math.max(0.1, Math.min((dimensions.height ?? 3000) / 1000, 5));
        geometry = new THREE.CylinderGeometry(r, r, h, 32);
      } else {
        geometry = new THREE.BoxGeometry(L, D, W3);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.y = D / 2;
      mesh.scale.set(0.01, 0.01, 0.01);
      scene.add(mesh);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;

      // Animate scale in
      animeAnimate(mesh.scale, {
        x: 1, y: 1, z: 1,
        duration: 1000,
        ease: "outBack",
      });

      // Pour particles
      const particleCount = 300;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * L;
        positions[i * 3 + 1] = D + 2 + Math.random() * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * W3;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({ color: 0x888888, size: 0.04, transparent: true, opacity: 0.8 });
      const particlesMesh = new THREE.Points(particleGeo, particleMat);
      scene.add(particlesMesh);

      animeAnimate(particlesMesh.position, {
        y: 0,
        duration: 2000,
        ease: "inCubic",
        onComplete: () => scene.remove(particlesMesh),
      });

      // Render loop
      let frameId: number;
      function renderLoop() {
        frameId = requestAnimationFrame(renderLoop);
        controls.update();
        renderer.render(scene, camera);
      }
      renderLoop();

      stateRef.current = { renderer, animFrameId: frameId! };
    }

    initScene().catch(console.error);

    return () => {
      destroyed = true;
      if (stateRef.current) {
        cancelAnimationFrame(stateRef.current.animFrameId);
        stateRef.current.renderer.dispose();
        if (stateRef.current.renderer.domElement.parentNode) {
          stateRef.current.renderer.domElement.remove();
        }
        stateRef.current = null;
      }
    };
  }, [calcType, dimensions]);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", minHeight: "280px", borderRadius: "12px", overflow: "hidden", background: "#f8f9fa" }}
    />
  );
}
