"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isUsableRect, makeRect, rectsEqual, type Rect } from "@/lib/hero/hero-canvas-measure";

/**
 * Measures the REAL rendered hero inside the editor's iframe so the freeform canvas can
 * draw its drag handles on the real elements instead of re-deriving their positions.
 *
 * Reads, in the iframe's own layout px:
 *  - the freeform LAYER (`[data-ff-layer]`): the containing block of the absolute freeform
 *    elements. Its rect is what a stored x% / y% is a percentage OF - on the real page it
 *    starts below the navbar and is clipped at the bottom, so this must be measured, never
 *    assumed. The rect is the layer's padding box minus any scrollbar (what abspos %
 *    resolves against).
 *  - every freeform element (`[data-ff-id]`): its visible rect, plus whether it is in the
 *    mobile auto stack (`position: relative`) - a stacked wrapper is a full-width flex row,
 *    so its first child is measured instead (the visible element).
 *
 * Re-measures (rAF-throttled) on: DOM mutation, element resize, iframe <head> changes
 * (mirrored stylesheets landing), image / stylesheet loads, and web-font loads. The owner can also call
 * `remeasure()` for a synchronous read (e.g. right after a drag ends).
 *
 * ASSUMPTIONS:
 * 1. `root` is the iframe's #root (null until the frame is ready).
 * 2. The hero is rendered with markers `data-ff-layer` / `data-ff-id` (HeroCarousel.tsx).
 * 3. The iframe has no transform of its own (the scale is applied OUTSIDE it), so
 *    getBoundingClientRect inside it is in unscaled layout px.
 *
 * FAILURE MODES:
 * - No layer (preset layout / text overlay off / still mounting) -> `layer: null`, no items.
 * - Zero-size element (display:none, not laid out yet) -> omitted, so no handle is drawn.
 * - Measurement jitter -> state only changes when a rect moves > 0.25px (no render loop).
 */
export interface MeasuredItem {
  /** Visible rect of the element in iframe layout px. */
  rect: Rect;
  /** True when the element is in the mobile auto stack rather than absolutely positioned. */
  stacked: boolean;
}

export interface HeroFrameMeasure {
  /** True once at least one measurement pass has run for the current root. */
  ready: boolean;
  layer: Rect | null;
  items: Readonly<Record<string, MeasuredItem>>;
}

const EMPTY: HeroFrameMeasure = Object.freeze({ ready: false, layer: null, items: Object.freeze({}) });

/** One synchronous measurement pass over the hero rendered under `root`. */
export function readHeroFrameMeasure(root: HTMLElement): HeroFrameMeasure {
  const layerEl = root.querySelector<HTMLElement>("[data-ff-layer]");
  if (!layerEl) return { ready: true, layer: null, items: {} };
  const frameWin = root.ownerDocument.defaultView;
  const lr = layerEl.getBoundingClientRect();
  const layer = makeRect(
    lr.left + layerEl.clientLeft,
    lr.top + layerEl.clientTop,
    lr.width - (layerEl.offsetWidth - layerEl.clientWidth),
    lr.height - (layerEl.offsetHeight - layerEl.clientHeight)
  );
  if (!isUsableRect(layer)) return { ready: true, layer: null, items: {} };

  const items: Record<string, MeasuredItem> = {};
  root.querySelectorAll<HTMLElement>("[data-ff-id]").forEach((el) => {
    const id = el.getAttribute("data-ff-id");
    if (!id) return;
    const stacked = frameWin?.getComputedStyle(el).position === "relative";
    const source: Element = stacked ? el.firstElementChild ?? el : el;
    const r = source.getBoundingClientRect();
    const rect = makeRect(r.left, r.top, r.width, r.height);
    if (rect && rect.w > 0 && rect.h > 0) items[id] = { rect, stacked };
  });
  return { ready: true, layer, items };
}

function measuresEqual(a: HeroFrameMeasure, b: HeroFrameMeasure): boolean {
  if (a.ready !== b.ready || !rectsEqual(a.layer, b.layer)) return false;
  const ak = Object.keys(a.items);
  if (ak.length !== Object.keys(b.items).length) return false;
  return ak.every((k) => {
    const x = a.items[k];
    const y = b.items[k];
    return !!y && x.stacked === y.stacked && rectsEqual(x.rect, y.rect);
  });
}

export function useHeroFrameMeasure(root: HTMLElement | null): {
  measure: HeroFrameMeasure;
  remeasure: () => void;
} {
  const [measure, setMeasure] = useState<HeroFrameMeasure>(EMPTY);
  const runRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!root) return;
    const doc = root.ownerDocument;
    const frameWin = doc.defaultView;
    if (!frameWin) return;

    let raf = 0;
    let disposed = false;
    const observed = new Set<Element>();

    const run = () => {
      raf = 0;
      if (disposed) return;
      const next = readHeroFrameMeasure(root);
      // Keep the ResizeObserver pointed at the current layer + element set.
      const wanted = new Set<Element>(root.querySelectorAll("[data-ff-layer], [data-ff-id]"));
      observed.forEach((el) => {
        if (!wanted.has(el)) {
          resizeObserver.unobserve(el);
          observed.delete(el);
        }
      });
      wanted.forEach((el) => {
        if (!observed.has(el)) {
          resizeObserver.observe(el);
          observed.add(el);
        }
      });
      setMeasure((prev) => (measuresEqual(prev, next) ? prev : next));
    };
    const schedule = () => {
      if (raf || disposed) return;
      raf = window.requestAnimationFrame(run);
    };

    // The iframe realm's own observers, so they are processed in the iframe's rendering update.
    const resizeObserver = new frameWin.ResizeObserver(schedule);
    resizeObserver.observe(root);
    const mutationObserver = new frameWin.MutationObserver(schedule);
    mutationObserver.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "src", "data-ff-id"],
    });
    // Stylesheets (mirrored app CSS, Google font <link>s) landing in <head> reflow the hero
    // without mutating anything under #root.
    const headObserver = new frameWin.MutationObserver(schedule);
    headObserver.observe(doc.head, { childList: true, subtree: true, attributes: true });
    // `load` doesn't bubble (<img>, and the mirrored <link rel=stylesheet> clones the frame
    // re-inserts into <head>, which are NOT under #root) - listen on the whole iframe
    // document in the capture phase.
    doc.addEventListener("load", schedule, true);
    const fonts = doc.fonts;
    fonts?.addEventListener?.("loadingdone", schedule);
    void fonts?.ready.then(schedule);

    runRef.current = () => {
      if (raf) window.cancelAnimationFrame(raf);
      run();
    };
    schedule();

    return () => {
      disposed = true;
      runRef.current = null;
      if (raf) window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      headObserver.disconnect();
      doc.removeEventListener("load", schedule, true);
      fonts?.removeEventListener?.("loadingdone", schedule);
    };
  }, [root]);

  const remeasure = useCallback(() => {
    runRef.current?.();
  }, []);

  // No root (frame still loading / torn down) -> nothing measured, whatever was read last.
  return { measure: root ? measure : EMPTY, remeasure };
}
