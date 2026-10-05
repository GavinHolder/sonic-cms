"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FreeformPos, HeroCarouselSlide, HeroSection } from "@/types/section";
import HeroCarousel from "@/components/sections/HeroCarousel";
import HeroRealRenderFrame from "./HeroRealRenderFrame";
import FreeformAlignToolbar from "./FreeformAlignToolbar";
import { useHeroFrameMeasure, type MeasuredItem } from "./useHeroFrameMeasure";
import { deviceViewportFor, fitDevice, MOBILE_VIEWPORT } from "@/lib/hero/hero-device-fit";
import { HERO_CANVAS_FREEZE_CSS } from "@/lib/hero/hero-frame";
import {
  DRAG_THRESHOLD_PX,
  NO_GUIDES,
  alignTargets,
  centrePct,
  clampPct,
  computeDragStep,
  distributeValues,
  effectivePos,
  fitHandleToBox,
  isUsableRect,
  placeholderRect,
  startDragInView,
  translateRect,
  type DragStart,
  type Guides,
  type Pct,
  type Rect,
} from "@/lib/hero/hero-canvas-measure";

/**
 * Freeform position canvas for the Hero editor's TABLET and MOBILE breakpoints.
 *
 * It does NOT draw its own copy of the hero (the old chip surface was a hand-written second
 * implementation with ~7 known divergences from the real renderer). It renders the REAL
 * <HeroCarousel> for the slide being edited inside the shared iframe frame
 * (HeroRealRenderFrame - the same one the Live Preview uses) at the reference device size,
 * then overlays one transparent, pointer-active drag handle per real element. Every handle
 * position and every drag -> % conversion comes from MEASURED rects of the real DOM
 * (useHeroFrameMeasure) - there is no hard-coded navbar / padding / font assumption here, so
 * the canvas cannot drift from the page.
 *
 * Dragging writes the same posTablet / posMobile fields through the same chip.onMove
 * handlers the old surface used, so an un-authored mobile stack element becomes absolute at
 * the dropped place exactly as before. The Desktop breakpoint keeps FreeformDragSurface.
 *
 * ASSUMPTIONS:
 * 1. Only mounted for the tablet / mobile breakpoints, with the freeform layout on.
 * 2. `section` is the editor's live draft; this canvas shows only `slide` from it.
 * 3. chip ids equal the renderer's `data-ff-id`s (eyebrow, row-N, heading, subheading,
 *    btn-N, img-N) - both come from the same naming in SlideEditor / HeroCarousel.
 *
 * FAILURE MODES:
 * - Element not measured yet / zero size -> no handle (and no drag) for it.
 * - Layer not found (text overlay off) -> no handles, explanatory note.
 * - Drag ends before the DOM reflects the last move -> one synchronous re-measure on release,
 *   then the observers settle any remainder.
 */
export interface HeroCanvasChip {
  id: string;
  kind: "eyebrow" | "heading" | "subheading" | "button" | "image";
  pos: FreeformPos;
  onMove: (p: FreeformPos) => void;
  hasOverride?: boolean;
  onClearOverride?: () => void;
}

interface HeroRealCanvasProps {
  chips: HeroCanvasChip[];
  slide: HeroCarouselSlide;
  /** The editor's live draft section (everything except the slides is shown as in the preview). */
  section: HeroSection;
  editBreakpoint: "tablet" | "mobile";
  /** Real navbar height, for the hatched "navbar" band only (never used for positioning). */
  navbarHeight: number;
}

interface ActiveDrag {
  chipId: string;
  start: DragStart;
  startRect: Rect;
  layer: Rect;
  onMove: (p: FreeformPos) => void;
  moved: boolean;
  /** Last position written, so identical consecutive moves don't re-render the whole editor. */
  last: Pct | null;
}

export default function HeroRealCanvas({ chips, slide, section, editBreakpoint, navbarHeight }: HeroRealCanvasProps) {
  const device = deviceViewportFor(editBreakpoint) ?? MOBILE_VIEWPORT;

  // --- Box sizing: fit the WHOLE device into the column (same shared rule as the Live Preview).
  // The column width is measured on the OUTER wrapper (not the box - its width derives from it).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapWidth, setWrapWidth] = useState(0);
  const [winH, setWinH] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 900));
  useLayoutEffect(() => {
    const readH = () => setWinH(window.innerHeight);
    readH();
    window.addEventListener("resize", readH);
    const el = wrapRef.current;
    const measureWrap = () => {
      if (el) setWrapWidth(el.clientWidth);
    };
    measureWrap();
    const ro = el && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureWrap) : null;
    if (ro && el) ro.observe(el);
    return () => {
      window.removeEventListener("resize", readH);
      ro?.disconnect();
    };
  }, []);
  const fit = fitDevice(device, wrapWidth, winH);
  const scale = fit.scale;

  // --- The real hero, for this one slide, frozen so rects are stable and elements are at rest.
  const heroSection = useMemo<HeroSection>(
    () => ({ ...section, content: { ...section.content, slides: [slide], autoPlay: false } }),
    [section, slide]
  );
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const { measure, remeasure } = useHeroFrameMeasure(root);
  const { layer, items } = measure;

  // --- Selection / drag state (same model as the desktop surface).
  const boxRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  // Optimistic frame-px rect of the dragged element: the handle follows the pointer
  // immediately; the measured rect takes over again on release.
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const dragRef = useRef<ActiveDrag | null>(null);

  const centreOfChip = (id: string): Pct | null => {
    const m = items[id];
    return m ? centrePct(m.rect, layer) : null;
  };
  const posOf = (c: HeroCanvasChip): Pct => effectivePos(c.pos, !!items[c.id]?.stacked, centreOfChip(c.id));

  const endDrag = (pointerId: number) => {
    boxRef.current?.releasePointerCapture?.(pointerId);
    const wasDragging = dragRef.current?.moved;
    dragRef.current = null;
    setDragId(null);
    setDragRect(null);
    setGuides(NO_GUIDES);
    if (wasDragging) remeasure();
  };

  // --- Alignment / distribution (act on every selected chip).
  const selectedChips = chips.filter((c) => selectedIds.has(c.id));
  const targets = alignTargets(layer, device);
  const alignH = (which: "left" | "center" | "right") =>
    selectedChips.forEach((c) => c.onMove({ ...posOf(c), x: clampPct(targets.h[which]) }));
  const alignV = (which: "top" | "middle" | "bottom") =>
    selectedChips.forEach((c) => c.onMove({ ...posOf(c), y: clampPct(targets.v[which]) }));
  const distribute = (axis: "x" | "y") => {
    const out = distributeValues(selectedChips.map((c) => ({ id: c.id, value: posOf(c)[axis] })));
    selectedChips.forEach((c) => {
      const v = out[c.id];
      if (v !== undefined) c.onMove({ ...posOf(c), [axis]: v });
    });
  };

  const guideX = (pct: number) => (isUsableRect(layer) ? (layer.x + (pct / 100) * layer.w) * scale : 0);
  const guideY = (pct: number) => (isUsableRect(layer) ? (layer.y + (pct / 100) * layer.h) * scale : 0);
  const bandPx = Math.max(0, navbarHeight) * scale;

  return (
    <div ref={wrapRef}>
      <FreeformAlignToolbar
        selectedCount={selectedChips.length}
        snapEnabled={snapEnabled}
        onAlignH={alignH}
        onAlignV={alignV}
        onDistributeH={() => distribute("x")}
        onDistributeV={() => distribute("y")}
        onToggleSnap={() => {
          setSnapEnabled((v) => !v);
          setGuides(NO_GUIDES);
        }}
      />
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          // Deselect-on-background-click lives here (not onClick): click targeting is
          // unreliable once setPointerCapture is in play for a handle drag. The iframe and
          // every decoration are pointer-events:none, so a background hit targets the box.
          if (e.target === e.currentTarget) setSelectedIds(new Set());
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d) return;
          if (!d.moved) {
            if (Math.hypot(e.clientX - d.start.pointer.x, e.clientY - d.start.pointer.y) < DRAG_THRESHOLD_PX) return;
            d.moved = true;
          }
          const others: Pct[] = [];
          for (const c of chips) {
            if (c.id === d.chipId) continue;
            const ctr = centreOfChip(c.id);
            if (ctr) others.push(ctr);
          }
          const step = computeDragStep({
            start: d.start,
            pointer: { x: e.clientX, y: e.clientY },
            scale,
            layer: d.layer,
            view: device,
            snapEnabled,
            others,
          });
          setGuides(step.guides);
          if (d.last && d.last.x === step.pos.x && d.last.y === step.pos.y) return;
          d.last = step.pos;
          setDragRect(
            translateRect(
              d.startRect,
              ((step.centre.x - d.start.startCentre.x) / 100) * d.layer.w,
              ((step.centre.y - d.start.startCentre.y) / 100) * d.layer.h
            )
          );
          d.onMove(step.pos);
        }}
        onPointerUp={(e) => endDrag(e.pointerId)}
        onPointerCancel={(e) => endDrag(e.pointerId)}
        style={{
          position: "relative",
          width: `${fit.width}px`,
          height: `${fit.height}px`,
          margin: "0 auto",
          borderRadius: 8,
          overflow: "hidden",
          background: "#0f172a",
          boxShadow: "0 0 0 1px #334155",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <HeroRealRenderFrame
          title={`Hero ${editBreakpoint} freeform canvas`}
          viewport={device}
          scale={scale}
          navbarHeight={navbarHeight}
          extraCss={HERO_CANVAS_FREEZE_CSS}
          onRoot={setRoot}
        >
          <HeroCarousel section={heroSection} forcePaused forceViewport={editBreakpoint} />
        </HeroRealRenderFrame>

        {/* The real navbar overlays the top of the hero - nothing placed there is visible, and
            y = 0% starts below it. Display only: positioning always uses the measured layer. */}
        {bandPx > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: bandPx,
              pointerEvents: "none",
              zIndex: 1,
              background:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0, rgba(255,255,255,0.14) 3px, transparent 3px, transparent 8px)",
              borderBottom: "1px dashed rgba(255,255,255,0.45)",
              color: "rgba(255,255,255,0.8)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            navbar
          </div>
        )}

        {/* Snap guides (shown only while snapped during a drag): cyan = layer centre, pink = sibling. */}
        {guides.vCanvas.map((x) => (
          <div key={`vc-${x}`} style={{ position: "absolute", left: guideX(x), top: 0, bottom: 0, width: 0, borderLeft: "1px dashed #38bdf8", pointerEvents: "none", zIndex: 5 }} />
        ))}
        {guides.hCanvas.map((y) => (
          <div key={`hc-${y}`} style={{ position: "absolute", top: guideY(y), left: 0, right: 0, height: 0, borderTop: "1px dashed #38bdf8", pointerEvents: "none", zIndex: 5 }} />
        ))}
        {guides.vElement.map((x) => (
          <div key={`ve-${x}`} style={{ position: "absolute", left: guideX(x), top: 0, bottom: 0, width: 0, borderLeft: "1px dashed #f472b6", pointerEvents: "none", zIndex: 5 }} />
        ))}
        {guides.hElement.map((y) => (
          <div key={`he-${y}`} style={{ position: "absolute", top: guideY(y), left: 0, right: 0, height: 0, borderTop: "1px dashed #f472b6", pointerEvents: "none", zIndex: 5 }} />
        ))}

        {chips.length === 0 ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16, color: "#e2e8f0", fontSize: 12, textShadow: "0 1px 3px rgba(0,0,0,0.8)", pointerEvents: "none" }}>
            No overlay elements to place yet — add a heading, subheading or button.
          </div>
        ) : measure.ready && !layer ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16, color: "#e2e8f0", fontSize: 12, textShadow: "0 1px 3px rgba(0,0,0,0.8)", pointerEvents: "none" }}>
            Nothing to place — turn the slide&apos;s text overlay on to position its elements.
          </div>
        ) : (
          // Handles. The wrapper ignores pointer events so background clicks reach the box;
          // each handle re-enables them.
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
            {chips.map((chip) => {
              const measured = items[chip.id];
              // An element with no measurable size (image not loaded / broken src) still gets a
              // small stand-in handle where its stored position puts it, so it stays selectable
              // and clearable.
              const standIn = measured ? null : placeholderRect(chip.pos, layer, scale);
              const m: MeasuredItem | null = measured ?? (standIn ? { rect: standIn, stacked: false } : null);
              if (!m) return null;
              const selected = selectedIds.has(chip.id);
              const frameRect = dragId === chip.id && dragRect ? dragRect : m.rect;
              // An element whose real position is outside the visible hero (inherited Desktop
              // "align bottom", a tall mobile stack, ...) would get a handle outside the clipped
              // box: pin it just inside instead, flagged, so it can still be grabbed / cleared.
              const { rect: hr, offscreen } = fitHandleToBox(frameRect, scale, { w: fit.width, h: fit.height });
              // Keep the clear-override x inside the box when the handle sits on an edge.
              const badgeInside = offscreen || hr.y < 8 || hr.x + hr.w > fit.width - 8;
              return (
                <div
                  key={chip.id}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      // Shift/ctrl-click only toggles selection membership - dragging several
                      // elements together isn't supported (yet).
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(chip.id)) next.delete(chip.id);
                        else next.add(chip.id);
                        return next;
                      });
                      return;
                    }
                    const centre = centrePct(m.rect, layer);
                    if (!centre || !isUsableRect(layer)) return; // can't drag what isn't measured
                    boxRef.current?.setPointerCapture?.(e.pointerId);
                    // A stacked element has no meaningful stored pos - it starts from its exact
                    // measured centre, and is rounded once, when written. An element outside
                    // the visible hero (pinned handle) starts from its nearest visible point.
                    const begin = startDragInView({
                      startPos: m.stacked ? centre : chip.pos,
                      centre,
                      rect: m.rect,
                      layer,
                      view: device,
                    });
                    dragRef.current = {
                      chipId: chip.id,
                      start: {
                        pointer: { x: e.clientX, y: e.clientY },
                        startPos: begin.startPos,
                        startCentre: begin.startCentre,
                      },
                      startRect: begin.startRect,
                      layer,
                      onMove: chip.onMove,
                      moved: false,
                      last: null,
                    };
                    setDragId(chip.id);
                    setSelectedIds(new Set([chip.id]));
                  }}
                  title={`${chip.kind} — ${chip.pos.x}%, ${chip.pos.y}%${
                    chip.hasOverride ? " (own position at this breakpoint)" : m.stacked ? " (automatic stack — drag to give it a position)" : ""
                  }${offscreen ? " (off-screen on the real page — drag to bring it back)" : ""}${
                    standIn ? " (no visible size yet — e.g. its image has not loaded)" : ""
                  }`}
                  style={{
                    position: "absolute",
                    left: hr.x,
                    top: hr.y,
                    width: hr.w,
                    height: hr.h,
                    boxSizing: "border-box",
                    pointerEvents: "auto",
                    cursor: dragId === chip.id ? "grabbing" : "grab",
                    // A handle with its own override at this breakpoint gets a solid amber
                    // outline instead of the usual dashed one - at a glance, which elements
                    // have actually been re-authored vs. still inheriting.
                    // An off-screen (pinned) handle gets a red dashed outline so it is obvious the
                    // element is hidden on the real page.
                    outline: offscreen
                      ? "1.5px dashed #ef4444"
                      : selected ? "1.5px solid #38bdf8" : chip.hasOverride ? "1.5px solid #f59e0b" : "1px dashed rgba(255,255,255,0.35)",
                    background: standIn ? "rgba(255,255,255,0.10)" : undefined,
                    outlineOffset: 2,
                    borderRadius: 3,
                    zIndex: selected ? 2 : 1,
                  }}
                >
                  {chip.hasOverride && chip.onClearOverride && (
                    <button
                      type="button"
                      title="Clear this breakpoint's position — inherit from above again"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        chip.onClearOverride?.();
                      }}
                      style={{
                        position: "absolute",
                        top: badgeInside ? 2 : -8,
                        right: badgeInside ? 2 : -8,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "1px solid #fff",
                        background: "#f59e0b",
                        color: "#fff",
                        fontSize: 10,
                        lineHeight: "14px",
                        padding: 0,
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="form-text mt-1">
        This is the real hero rendered live at {device.w}×{device.h}
        {isUsableRect(layer) && layer.y > 0.5
          ? ` — positions are measured from below the navbar (y = 0% is ${Math.round(layer.y)}px from the top)`
          : ""}
        .
      </div>
    </div>
  );
}
