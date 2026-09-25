/* eslint-disable @typescript-eslint/no-explicit-any -- test tooling: stored section JSON and in-page measurements are untyped by nature */
/**
 * Independent expectations for the responsive-fidelity harness.
 *
 * Everything here is derived ONLY from the stored section data + the documented contract, never
 * from the renderer's own output. (It deliberately re-implements the geometry formulas instead of
 * importing computeStageFit/computeSubElementPosition: a test that reuses the code under test as
 * its oracle can never fail.) Only pickBreakpointForWidth/resolveVariants — pure data-shape
 * helpers that predate this work — are imported.
 *
 * CONTRACT
 *  - Active breakpoint = pickBreakpointForWidth(viewport width): >=992 desktop, >=768 tablet, else mobile.
 *  - A Tablet/Mobile variant is "authored" iff it has >= 1 block. Un-authored + fallback mode "desktop"
 *    (the default; content.undesignedBreakpoint !== "none") renders the Desktop layout as the single-column
 *    reading-order REFLOW (FreeReflowStack) on phones AND tablets up to 991px (owner decision 2026-09-25: the
 *    shrunk 0.53-0.69x plate was unusable). An AUTHORED Tablet/Mobile variant keeps its own scaled plate; Desktop
 *    always renders the plate. Fallback mode "none" renders nothing.
 *    The fallback (layout, background AND "none") exists for FREE-mode Designer sections only: a grid / mosaic /
 *    element-based section renders exactly as it did before the fallback existed at every breakpoint — an
 *    un-configured Tablet/Mobile background stays neutral and content.undesignedBreakpoint is ignored.
 *  - Content plate: UNIFORM scale, top-anchored, horizontally centred.
 *      single: s = min(stageW/cw, stageH/ch, maxScale)     multi: s = min(stageW/cw, maxScale)
 *    maxScale = 1.15 for the Mobile breakpoint, unbounded otherwise.
 *  - Background, TABLET/MOBILE: never non-uniformly scaled; a uniform cover plate that fills the stage box.
 *  - Background, DESKTOP (>= 992): unchanged since commit c4535fa — a canvas-sized (cw x chTotal) plate scaled
 *      single: scale(round4(stageW/cw), round4(stageH/ch))      multi: scale(round4(stageW/cw)) (height = chTotal*scale)
 *    so the WHOLE image is visible and the box is the design canvas the Designer shows (mild stretch, no crop).
 *  - Sub-element wrapper (inside text/text-block/card containers) sits at
 *      left = block.x + 2 + padX + sub.x,  top = block.y + 2 + padT + sub.y,
 *      width = sub.w ?? max(block.w - 2*padX, 0)   (padX default 20, padT default 16).
 */
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { FixtureSection } from "./fixtures/synthetic";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const BP = require(path.join(here, "..", "..", "public", "flexible-breakpoint-rules.js"));

export type BpKey = "desktop" | "tablet" | "mobile";
export const MOBILE_MAX_SCALE = 1.15;

export interface BgExpectation {
  kind: "own" | "desktop-fallback" | "legacy" | "neutral";
  image: string | null;
  color: string;
}

export interface Expectation {
  /** The section has any authored content at all (a background-only section legitimately renders no text). */
  hasContent: boolean;
  isFree: boolean;
  bp: BpKey;
  authored: boolean;
  fallbackMode: "desktop" | "none";
  reflow: boolean;
  blank: boolean;
  variant: any | null;
  cw: number;
  ch: number;
  multi: boolean;
  multiLimit: number;
  chTotal: number;
  maxScale: number;
  bg: BgExpectation;
}

function parseDD(raw: unknown): any {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw ?? null;
}

const validBundle = (b: any) => !!b && typeof b === "object" && (b.backgroundType === "solid" || b.backgroundType === "gradient");
const hasBlocks = (v: any) => !!v && Array.isArray(v.blocks) && v.blocks.length > 0;
const dim = (raw: unknown, fallback: number) => Math.max(Number(raw) || fallback, 200);

export function expectationFor(section: FixtureSection, vw: number): Expectation {
  const content = section.content as any;
  const dd = parseDD(content.designerData);
  const variants = BP.resolveVariants(dd) as { desktop: any; tablet: any; mobile: any };
  const desktop = variants.desktop;
  const isFree =
    !!desktop &&
    (desktop.positionMode === "free" || desktop.layoutType === "free") &&
    desktop.layout?.layoutMode !== "mosaic" &&
    hasBlocks(desktop);
  const bp = BP.pickBreakpointForWidth(vw) as BpKey;
  const own = variants[bp];
  const authored = bp === "desktop" ? true : hasBlocks(own);
  const fallbackMode: "desktop" | "none" = content.undesignedBreakpoint === "none" ? "none" : "desktop";

  let variant: any | null;
  if (bp === "desktop") variant = desktop;
  else if (authored) variant = own;
  else variant = fallbackMode === "desktop" ? desktop : null;

  const blank = isFree ? variant === null : false;
  const reflow = isFree && bp !== "desktop" && !authored && fallbackMode === "desktop";

  const contentMode = content.contentMode || "single";
  const multi = contentMode === "multi";
  const multiLimit = multi ? Number(variant?.multiLimit) || 1 : 1;
  const cw = dim(variant?.designerCanvasW, 1440);
  const ch = dim(variant?.designerCanvasH, 900);

  // Background bundle the visitor should see at this breakpoint.
  const bundles = content.backgroundByBreakpoint as Record<string, any> | undefined;
  const legacy = {
    image: section.bgImageUrl || "",
    color: section.background || "white",
  };
  let bg: BgExpectation;
  if (validBundle(bundles?.[bp])) {
    bg = { kind: "own", image: bundles![bp].bgImageUrl || null, color: bundles![bp].background };
  } else if (bp === "desktop") {
    bg = { kind: "legacy", image: legacy.image || null, color: legacy.color };
  } else if (isFree && !authored && fallbackMode === "desktop") {
    bg = validBundle(bundles?.desktop)
      ? { kind: "desktop-fallback", image: bundles!.desktop.bgImageUrl || null, color: bundles!.desktop.background }
      : { kind: "desktop-fallback", image: legacy.image || null, color: legacy.color };
  } else {
    bg = { kind: "neutral", image: null, color: "transparent" };
  }

  const hasContent = hasBlocks(desktop) || (Array.isArray(content.elements) && content.elements.length > 0);

  return {
    hasContent,
    isFree, bp, authored, fallbackMode, reflow, blank, variant,
    cw, ch, multi, multiLimit, chTotal: ch * multiLimit,
    maxScale: bp === "mobile" ? MOBILE_MAX_SCALE : Infinity,
    bg,
  };
}

/** Expected content-plate transform given the measured stage box. */
export function expectedPlate(exp: Expectation, stageW: number, stageH: number) {
  const sx = stageW / exp.cw;
  const s = exp.multi
    ? Math.min(sx, exp.maxScale)
    : Math.min(sx, stageH / exp.ch, exp.maxScale);
  const scale = Math.round(s * 10000) / 10000;
  const offsetX = Math.max(0, (stageW - exp.cw * scale) / 2);
  return { scale, offsetX, offsetY: 0 };
}

/** Expected DESKTOP background plate (see CONTRACT): pre-scale CSS size + the (possibly non-uniform) scale. */
export function expectedDesktopBgPlate(exp: Expectation, stageW: number, stageH: number) {
  const r4 = (n: number) => Math.round(n * 10000) / 10000;
  const sx = r4(stageW / exp.cw);
  const sy = exp.multi ? sx : r4(stageH / exp.ch);
  return { cssW: exp.cw, cssH: exp.chTotal, sx, sy, boxW: exp.cw * sx, boxH: exp.chTotal * sy };
}

export interface ExpectedItem {
  fontsSettled?: boolean; // the Designer stamped the stored measurement as taken with webfonts loaded (_fontsSettled)
  id: string;          // "blockId:subId" or "blockId"
  kind: "sub" | "block";
  type: string;        // sub type (heading|eyebrow|paragraph|button|...) or block type
  x: number; y: number; w: number; h: number | null; // canvas coords; h null = auto
  measuredH?: number;  // Designer-measured wrapper height (subs only)
  fontSize?: number;
  lineHeight?: number;
  fixedH: boolean;
}

const CONTAINER_TYPES = new Set(["text", "text-block", "card"]);
const SELF_SIZING = new Set(["template", "card-tabs", "product-grid"]);

/** Canvas-space geometry of every top-level block / container sub-element in the chosen variant. */
export function expectedItems(variant: any): ExpectedItem[] {
  const items: ExpectedItem[] = [];
  for (const b of (variant?.blocks ?? []) as any[]) {
    if (b?.type === "volt" && b?.props?.fullBleed) continue; // drawn as a section-level layer, not on the plate
    const pos = b.pixelPos || { x: 0, y: 0, w: 300, h: 180 };
    const subs = (b.subElements ?? []) as any[];
    if (CONTAINER_TYPES.has(b.type) && subs.length > 0) {
      const bp = b.props ?? {};
      const padT = Number(bp.paddingTop !== undefined && bp.paddingTop !== null ? bp.paddingTop : 16);
      const padX = Number(bp.paddingX !== undefined && bp.paddingX !== null ? bp.paddingX : 20);
      subs.forEach((se, si) => {
        const p = se.props ?? {};
        const fs = Number(p.fontSize) || (se.type === "heading" ? 22 : se.type === "eyebrow" ? 13 : 14);
        const lhRaw = p.lineHeight !== undefined ? Number(p.lineHeight) : se.type === "heading" ? 1.2 : se.type === "eyebrow" ? 1.4 : 1.6;
        items.push({
          id: `${b.id}:${se.id ?? si}`,
          kind: "sub",
          type: se.type,
          x: (Number(pos.x) || 0) + 2 + padX + (Number(se.x) || 0),
          y: (Number(pos.y) || 0) + 2 + padT + (Number(se.y) || 0),
          // wrapper min-width is 60px (computeSubElementPosition / the Designer's .sub-element)
          w: Math.max(se.w != null ? Number(se.w) : Math.max((Number(pos.w) || 0) - 2 * padX, 0), 60),
          // an explicit height can never be smaller than the wrapper's own border + padding (box-sizing: border-box)
          h: se.h != null ? Math.max(Number(se.h), 14) : null,
          measuredH: typeof se._measuredH === "number" ? se._measuredH : undefined,
          fontsSettled: se._fontsSettled === true,
          fontSize: fs,
          lineHeight: lhRaw,
          fixedH: se.h != null,
        });
      });
    } else {
      items.push({
        id: String(b.id),
        kind: "block",
        type: b.type,
        x: Number(pos.x) || 0,
        y: Number(pos.y) || 0,
        w: Number(pos.w) || 0,
        h: SELF_SIZING.has(b.type) ? null : Number(pos.h) || 0,
        fixedH: !SELF_SIZING.has(b.type),
      });
    }
  }
  return items;
}

/**
 * Number of text lines the Designer saw when it measured this heading/eyebrow, decoded from the
 * stored wrapper height: wrapper = lines*fontSize*lineHeight + 14 (6px padding x2 + 1px border x2)
 * [+ 8 for headings: the Designer canvas gives a heading the Bootstrap .hN margin-bottom (an eyebrow has none)].
 */
export function measuredLines(it: ExpectedItem): number | null {
  if (it.kind !== "sub" || (it.type !== "heading" && it.type !== "eyebrow")) return null;
  if (it.fixedH || it.measuredH === undefined || !it.fontSize || !it.lineHeight) return null;
  // A heading line of <= 16px (twice the Designer's 8px heading margin) makes the decode ambiguous: no answer.
  if (it.type === "heading" && it.fontSize * it.lineHeight <= 16) return null;
  const chrome = 14 + (it.type === "heading" ? 8 : 0);
  return Math.max(1, Math.round((it.measuredH - chrome) / (it.fontSize * it.lineHeight)));
}
