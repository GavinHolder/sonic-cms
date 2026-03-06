"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CalcType, CalcResult } from "@/lib/concrete-calculator";

interface ConcreteViz3DProps {
  calcType: CalcType;
  dimensions: Record<string, number>;
  result: CalcResult | null;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export default function ConcreteViz3D({ calcType, dimensions, result: _result }: ConcreteViz3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanupRef = useRef<(() => void) | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dimsGroupRef = useRef<any>(null);
  const showDimsRef = useRef(false); // persist dims toggle across scene rebuilds

  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [showDims, setShowDims] = useState(false);

  const toggleAutoRotate = useCallback(() => {
    if (!controlsRef.current) return;
    const next = !controlsRef.current.autoRotate;
    controlsRef.current.autoRotate = next;
    setIsAutoRotating(next);
  }, []);

  const resetCamera = useCallback(() => {
    if (!controlsRef.current) return;
    controlsRef.current.reset();
    controlsRef.current.autoRotate = false;
    setIsAutoRotating(false);
  }, []);

  const toggleDims = useCallback(() => {
    const next = !showDimsRef.current;
    showDimsRef.current = next;
    setShowDims(next);
    if (dimsGroupRef.current) dimsGroupRef.current.visible = next;
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    let destroyed = false;

    async function initScene() {
      const THREE = await import("three");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js" as any);

      if (destroyed || !mountRef.current) return;

      const W = mountRef.current.clientWidth || 400;
      const H = Math.min(W * 0.6, 500);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f9fa);

      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
      camera.position.set(3, 3, 5);
      camera.lookAt(0, 0, 0);

      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
      const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
      sun.position.set(5, 8, 5);
      sun.castShadow = true;
      scene.add(sun);
      scene.add(new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.4));
      scene.add(new THREE.GridHelper(10, 20, 0xcccccc, 0xdddddd));

      const material = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.9, metalness: 0.0 });

      const L = Math.max(0.1, Math.min((dimensions.length ?? 1000) / 1000, 5));
      const W3 = Math.max(0.1, Math.min((dimensions.width ?? 1000) / 1000, 5));
      const D = Math.max(0.05, Math.min((dimensions.depth ?? dimensions.height ?? 200) / 1000, 3));

      // ── Build geometry ──────────────────────────────────────────────────────
      // Track bounding box for dim lines
      let bbox = { minX: -L/2, maxX: L/2, minY: 0, maxY: D, minZ: -W3/2, maxZ: W3/2 };

      if (calcType === "column") {
        const r = Math.max(0.05, Math.min((dimensions.diameter ?? 300) / 2000, 1));
        const h = Math.max(0.1, Math.min((dimensions.height ?? 3000) / 1000, 5));
        const geo = new THREE.CylinderGeometry(r, r, h, 32);
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.position.y = h / 2;
        scene.add(mesh);
        bbox = { minX: -r, maxX: r, minY: 0, maxY: h, minZ: -r, maxZ: r };
      } else if (calcType === "staircase") {
        const numSteps = Math.max(2, Math.min(Math.round(dimensions.steps ?? 12), 20));
        const riseM = Math.max(0.05, Math.min((dimensions.rise ?? 180) / 1000, 0.5));
        const runM  = Math.max(0.05, Math.min((dimensions.run  ?? 250) / 1000, 0.6));
        const widM  = Math.max(0.1,  Math.min((dimensions.width ?? 1200) / 1000, 3));
        const group = new THREE.Group();
        for (let i = 0; i < numSteps; i++) {
          const stepH = riseM * (i + 1);
          const geo = new THREE.BoxGeometry(runM, stepH, widM);
          const sm = new THREE.Mesh(geo, material);
          sm.castShadow = true; sm.receiveShadow = true;
          sm.position.set(runM * i, stepH / 2, 0);
          group.add(sm);
        }
        const totalW = runM * numSteps;
        const totalH = riseM * numSteps;
        group.position.set(-totalW / 2, 0, 0);
        camera.position.set(totalW, totalH * 1.2, totalW * 1.5);
        camera.lookAt(0, totalH / 2, 0);
        scene.add(group);
        bbox = { minX: -totalW/2, maxX: totalW/2, minY: 0, maxY: totalH, minZ: -widM/2, maxZ: widM/2 };
      } else {
        const geo = new THREE.BoxGeometry(L, D, W3);
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.position.y = D / 2;
        scene.add(mesh);
      }

      // ── Dimension annotations ───────────────────────────────────────────────
      const BLUE = 0x2563eb;

      function makeLabel(text: string, pos: import("three").Vector3): import("three").Sprite {
        const canvas = document.createElement("canvas");
        canvas.width = 320; canvas.height = 72;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, 320, 72);
        // Background pill
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.roundRect(4, 4, 312, 64, 10);
        ctx.fill();
        // Text
        ctx.fillStyle = "#1d4ed8";
        ctx.font = "bold 30px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 160, 36);
        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
        sprite.position.copy(pos);
        sprite.scale.set(0.55, 0.14, 1);
        return sprite;
      }

      function makeArrowCone(pos: import("three").Vector3, dir: import("three").Vector3): import("three").Mesh {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.018, 0.07, 8),
          new THREE.MeshBasicMaterial({ color: BLUE, depthTest: false })
        );
        cone.position.copy(pos);
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        cone.setRotationFromQuaternion(q);
        return cone;
      }

      function addDimLine(
        from: import("three").Vector3,
        to: import("three").Vector3,
        label: string,
        labelOffset: import("three").Vector3,
        group: import("three").Group
      ) {
        // Line
        const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
        group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: BLUE, depthTest: false })));
        // Arrow cones
        const dir = new THREE.Vector3().subVectors(to, from).normalize();
        group.add(makeArrowCone(from.clone(), dir.clone().negate()));
        group.add(makeArrowCone(to.clone(), dir.clone()));
        // Label at midpoint + offset
        const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5).add(labelOffset);
        group.add(makeLabel(label, mid));
      }

      const dimsGroup = new THREE.Group();
      dimsGroup.visible = showDimsRef.current;
      dimsGroup.renderOrder = 999;
      dimsGroupRef.current = dimsGroup;

      const pad = 0.12;
      const { minX, maxX, minY, maxY, minZ, maxZ } = bbox;

      if (calcType === "column") {
        const r = Math.max(0.05, Math.min((dimensions.diameter ?? 300) / 2000, 1));
        const h = Math.max(0.1, Math.min((dimensions.height ?? 3000) / 1000, 5));
        const dia = Math.round((dimensions.diameter ?? 300));
        const ht = Math.round((dimensions.height ?? 3000));
        // Diameter line across top face
        addDimLine(
          new THREE.Vector3(-r, h + pad, 0),
          new THREE.Vector3(r, h + pad, 0),
          `⌀${dia}mm`,
          new THREE.Vector3(0, 0.15, 0),
          dimsGroup
        );
        // Height line on side
        addDimLine(
          new THREE.Vector3(r + pad, 0, 0),
          new THREE.Vector3(r + pad, h, 0),
          `${ht}mm`,
          new THREE.Vector3(0.22, 0, 0),
          dimsGroup
        );
      } else if (calcType === "staircase") {
        const numSteps = Math.max(2, Math.min(Math.round(dimensions.steps ?? 12), 20));
        const riseM = Math.max(0.05, Math.min((dimensions.rise ?? 180) / 1000, 0.5));
        const runM  = Math.max(0.05, Math.min((dimensions.run  ?? 250) / 1000, 0.6));
        const widM  = Math.max(0.1,  Math.min((dimensions.width ?? 1200) / 1000, 3));
        const totalW = runM * numSteps;
        const totalH = riseM * numSteps;
        const cx = 0; // group is centered
        // Total width
        addDimLine(
          new THREE.Vector3(cx - totalW/2, totalH + pad, -widM/2 - pad),
          new THREE.Vector3(cx + totalW/2, totalH + pad, -widM/2 - pad),
          `${Math.round(numSteps * (dimensions.run ?? 250))}mm`,
          new THREE.Vector3(0, 0.15, 0),
          dimsGroup
        );
        // Total height
        addDimLine(
          new THREE.Vector3(cx + totalW/2 + pad, 0, 0),
          new THREE.Vector3(cx + totalW/2 + pad, totalH, 0),
          `${Math.round(numSteps * (dimensions.rise ?? 180))}mm`,
          new THREE.Vector3(0.25, 0, 0),
          dimsGroup
        );
        // Width (z-axis)
        addDimLine(
          new THREE.Vector3(cx + totalW/2 + pad, totalH + pad, -widM/2),
          new THREE.Vector3(cx + totalW/2 + pad, totalH + pad, widM/2),
          `${Math.round(dimensions.width ?? 1200)}mm`,
          new THREE.Vector3(0.2, 0.15, 0),
          dimsGroup
        );
      } else {
        // Slab / footing — L × W3 × D
        const lenMm = Math.round(dimensions.length ?? 1000);
        const widMm = Math.round(dimensions.width ?? 1000);
        const depMm = Math.round(dimensions.depth ?? dimensions.height ?? 200);
        // Length (along X, rear top edge)
        addDimLine(
          new THREE.Vector3(minX, maxY + pad, minZ - pad),
          new THREE.Vector3(maxX, maxY + pad, minZ - pad),
          `${lenMm}mm`,
          new THREE.Vector3(0, 0.14, 0),
          dimsGroup
        );
        // Width (along Z, right top edge)
        addDimLine(
          new THREE.Vector3(maxX + pad, maxY + pad, minZ),
          new THREE.Vector3(maxX + pad, maxY + pad, maxZ),
          `${widMm}mm`,
          new THREE.Vector3(0.25, 0.14, 0),
          dimsGroup
        );
        // Depth (along Y, right-rear vertical edge)
        addDimLine(
          new THREE.Vector3(maxX + pad * 2, minY, minZ - pad),
          new THREE.Vector3(maxX + pad * 2, maxY, minZ - pad),
          `${depMm}mm`,
          new THREE.Vector3(0.25, 0, 0),
          dimsGroup
        );
      }

      scene.add(dimsGroup);

      // ── Animate on scene build ──────────────────────────────────────────────
      const animTargets: import("three").Object3D[] = [];
      scene.traverse((obj) => { if ((obj as any).isMesh && !(obj as any).material?.depthTest === false) animTargets.push(obj); });
      // Only animate the concrete mesh (not dim arrow cones)
      const concreteMeshes: import("three").Object3D[] = [];
      scene.traverse((obj) => {
        if ((obj as any).isMesh && (obj as any).material === material) concreteMeshes.push(obj);
      });

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 2.0;
      controls.saveState();
      controlsRef.current = controls;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift" && controlsRef.current) controlsRef.current.mouseButtons.LEFT = 2;
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift" && controlsRef.current) controlsRef.current.mouseButtons.LEFT = 0;
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      let shouldStop = false;
      let isVisible = true;
      let frameId = 0;
      const scaleStart = performance.now();
      const scaleDuration = 900;

      function renderLoop() {
        if (shouldStop) return;
        frameId = requestAnimationFrame(renderLoop);
        if (!isVisible) return;
        const elapsed = performance.now() - scaleStart;
        if (elapsed < scaleDuration) {
          const s = Math.max(0.001, easeOutBack(Math.min(elapsed / scaleDuration, 1)));
          concreteMeshes.forEach((obj) => obj.scale.setScalar(s));
        }
        controls.update();
        renderer.render(scene, camera);
      }
      renderLoop();

      const observer = new IntersectionObserver(
        (entries) => { isVisible = entries[0]?.isIntersecting ?? true; },
        { threshold: 0 }
      );
      if (mountRef.current) observer.observe(mountRef.current);

      cleanupRef.current = () => {
        shouldStop = true;
        cancelAnimationFrame(frameId);
        observer.disconnect();
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        controlsRef.current = null;
        dimsGroupRef.current = null;
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.remove();
      };
    }

    initScene().catch(console.error);

    return () => {
      destroyed = true;
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    };
  }, [calcType, dimensions]);

  return (
    <div>
      <div
        ref={mountRef}
        style={{ width: "100%", minHeight: "280px", borderRadius: "12px", overflow: "hidden", background: "#f8f9fa" }}
      />
      <div className="d-flex align-items-center justify-content-between mt-2 flex-wrap gap-2">
        <div className="text-muted" style={{ fontSize: "0.72rem", letterSpacing: "0.03em" }}>
          <i className="bi bi-arrow-clockwise me-1" />Drag to rotate
          <span className="mx-2">·</span>
          <i className="bi bi-zoom-in me-1" />Scroll to zoom
          <span className="mx-2">·</span>
          <i className="bi bi-arrows-move me-1" />⇧+Drag to pan
        </div>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${showDims ? "btn-primary" : "btn-outline-secondary"}`}
            style={{ fontSize: "0.72rem", padding: "2px 10px", borderRadius: "6px" }}
            onClick={toggleDims}
            title="Toggle dimension lines"
          >
            <i className={`bi bi-rulers me-1`} />
            Dims
          </button>
          <button
            className={`btn btn-sm ${isAutoRotating ? "btn-primary" : "btn-outline-secondary"}`}
            style={{ fontSize: "0.72rem", padding: "2px 10px", borderRadius: "6px" }}
            onClick={toggleAutoRotate}
            title="Toggle auto-rotate"
          >
            <i className={`bi bi-${isAutoRotating ? "pause-fill" : "arrow-repeat"} me-1`} />
            {isAutoRotating ? "Stop" : "Spin"}
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            style={{ fontSize: "0.72rem", padding: "2px 10px", borderRadius: "6px" }}
            onClick={resetCamera}
            title="Reset camera to default position"
          >
            <i className="bi bi-house me-1" />
            Center
          </button>
        </div>
      </div>
    </div>
  );
}
