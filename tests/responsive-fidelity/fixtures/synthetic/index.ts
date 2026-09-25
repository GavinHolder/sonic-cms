/**
 * Generic, client-neutral synthetic fixtures for the responsive-fidelity harness.
 *
 * Each fixture is a FLEXIBLE section in the exact shape the Flexible Designer
 * saves (free positionMode, blocks with `pixelPos`, sub-elements with x/y/w relative to the
 * container block's padded content box, `_measuredH`/`_measuredW` written by the Designer).
 * Nothing here references any real site — text is lorem-style, images are the committed
 * SVGs in ../assets served by the runner under /fx-assets/.
 *
 * Fixtures (the name doubles as the page slug suffix: /fx-<name>):
 *   legacy-desktop-only   — flat (pre-per-breakpoint) designerData, section-level bg image.
 *                           Exercises the legacy fallback for tablet/mobile widths.
 *   per-breakpoint        — fully-authored Desktop (1440x900), Tablet (768x900) and Mobile
 *                           (375x800) canvases, each with its own bg bundle + focal point.
 *   tablet-empty-variant  — Desktop authored; Tablet + Mobile saved as EMPTY variants (what
 *                           clicking the Tablet tab in the Designer and saving persists).
 *   font-stale-measure    — a display webfont whose real width exceeds the fallback the
 *                           Designer measured with (stored _measuredH says ONE line).
 *   multi-free            — free + multi content mode, two stacked bands.
 */

export interface FixtureSection {
  type: "FLEXIBLE";
  displayName: string;
  background: string;
  paddingTop?: number;
  paddingBottom?: number;
  bgImageUrl?: string;
  bgImagePosition?: string;
  bgImageSize?: string;
  content: Record<string, unknown>;
}

export interface Fixture {
  name: string;
  description: string;
  section: FixtureSection;
  /** Set when derived from a live fixture: the mobile variant is replaced by a re-laid-out tablet. */
  derived?: boolean;
}

// ── builders ────────────────────────────────────────────────────────────────

const PAD_X = 20; // container block default paddingX
const PAD_T = 16; // container block default paddingTop
const BORDER = 2; // container block border

type Pos = { x: number; y: number; w: number; h: number };

/** Sub-element placed so its wrapper's TOP-LEFT lands at the absolute canvas point (X, Y). */
function sub(
  block: Pos,
  id: string,
  type: "heading" | "eyebrow" | "paragraph" | "button",
  X: number,
  Y: number,
  w: number | null,
  props: Record<string, unknown>,
  measuredH?: number,
) {
  return {
    id,
    type,
    props,
    x: X - block.x - BORDER - PAD_X,
    y: Y - block.y - BORDER - PAD_T,
    w,
    ...(measuredH ? { _measuredH: measuredH, _measuredW: w ?? undefined } : {}),
  };
}

function textBlock(id: string, pos: Pos, subElements: unknown[], z?: number) {
  return {
    id,
    type: "text-block",
    position: { row: 1, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
    pixelPos: pos,
    props: { label: "Text", bgColor: "transparent", textColor: "#212529", glassEffect: "none", customCss: "" },
    subElements,
    ...(z ? { zIndex: z } : {}),
  };
}

function imageBlock(id: string, pos: Pos, src: string, z?: number) {
  return {
    id,
    type: "image",
    position: { row: 1, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
    pixelPos: pos,
    props: { src, alt: "fixture image" },
    subElements: [],
    ...(z ? { zIndex: z } : {}),
  };
}

const LOREM = "Body copy for the fixture section. It is long enough to wrap onto a few lines so wrapping differences show up.";

function heroBlocks(cw: number, ch: number, opts: { scale: number; imageSrc: string }) {
  // One reusable "hero + card" layout parameterised by scale so the Tablet/Mobile canvases
  // are genuinely INDEPENDENT hand-laid-out designs (different positions, sizes and wrapping),
  // not a mechanical copy of Desktop.
  const s = opts.scale;
  const r = (n: number) => Math.round(n * s);
  const b1: Pos = { x: r(80), y: r(110), w: r(640), h: r(330) };
  const b2: Pos = { x: cw - r(80) - r(500), y: ch - r(140) - r(260), w: r(500), h: r(260) };
  const b3: Pos = { x: cw - r(80) - r(360), y: r(100), w: r(360), h: r(240) };
  return [
    textBlock("b1", b1, [
      sub(b1, "se-1", "eyebrow", b1.x + r(20), b1.y + r(20), r(300), { text: "Fixture eyebrow label", fontSize: Math.max(11, r(13)), letterSpacing: 3, color: "#ffd479" }, 33),
      sub(b1, "se-2", "heading", b1.x + r(20), b1.y + r(60), r(590), { level: "h1", text: "Generic fixture headline", fontSize: r(56), color: "#ffffff", fontFamily: "'Inter', sans-serif" }, Math.round(r(56) * 1.2 * 2 + 22)),
      sub(b1, "se-3", "paragraph", b1.x + r(20), b1.y + r(230), r(560), { text: LOREM, fontSize: Math.max(13, r(18)), color: "#e8eef5", fontFamily: "'Inter', sans-serif" }),
    ], 2),
    textBlock("b2", b2, [
      sub(b2, "se-4", "heading", b2.x + r(20), b2.y + r(24), r(440), { level: "h2", text: "Second panel", fontSize: Math.max(20, r(34)), color: "#ffffff", fontFamily: "'Inter', sans-serif" }, Math.round(Math.max(20, r(34)) * 1.2 + 22)),
      sub(b2, "se-5", "paragraph", b2.x + r(20), b2.y + r(90), r(440), { text: LOREM, fontSize: Math.max(12, r(16)), color: "#dbe6f3", fontFamily: "'Inter', sans-serif" }),
      sub(b2, "se-6", "button", b2.x + r(20), b2.y + r(190), r(180), { text: "Call to action", bgColor: "#ffd479", textColor: "#0b1f33" }),
    ], 3),
    imageBlock("b3", b3, opts.imageSrc, 1),
  ];
}

function variantBlob(cw: number, ch: number, scale: number, imageSrc: string) {
  return {
    contentMode: "single",
    positionMode: "free",
    layoutType: "free",
    designerCanvasW: cw,
    designerCanvasH: ch,
    nextId: 20,
    blocks: heroBlocks(cw, ch, { scale, imageSrc }),
  };
}

const BG_3X2 = "/fx-assets/photo-3x2.svg";
const BG_2X3 = "/fx-assets/photo-2x3.svg";

function bgBundle(url: string, background = "transparent") {
  return { backgroundType: "solid", background, bgImageUrl: url, bgImageSize: "cover", bgImageRepeat: "no-repeat", bgImageOpacity: 100 };
}

// ── fixtures ────────────────────────────────────────────────────────────────

export function syntheticFixtures(): Fixture[] {
  const legacy: Fixture = {
    name: "legacy-desktop-only",
    description: "Flat pre-per-breakpoint designerData (Desktop only) with a section-level bg image.",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture legacy desktop only",
      background: "#0b1f33",
      bgImageUrl: BG_3X2,
      bgImagePosition: "50% 40%",
      content: {
        contentMode: "single",
        designerData: variantBlob(1440, 900, 1, BG_2X3),
      },
    },
  };

  const perBp: Fixture = {
    name: "per-breakpoint",
    description: "Desktop 1440x900, Tablet 768x900 and Mobile 375x800 all independently authored, each with its own bg bundle.",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture per breakpoint",
      background: "#0b1f33",
      content: {
        contentMode: "single",
        designerData: {
          variant: "per-breakpoint",
          desktop: variantBlob(1440, 900, 1, BG_2X3),
          tablet: variantBlob(768, 900, 0.53, BG_2X3),
          mobile: variantBlob(375, 800, 0.36, BG_2X3),
        },
        backgroundByBreakpoint: {
          desktop: bgBundle(BG_3X2, "#0b1f33"),
          tablet: bgBundle(BG_3X2),
          mobile: bgBundle(BG_2X3),
        },
        backgroundPos: { desktop: { x: 50, y: 40 }, tablet: { x: 30, y: 70 }, mobile: { x: 17, y: 91 } },
      },
    },
  };

  const emptyVariants: Fixture = {
    name: "tablet-empty-variant",
    description: "Desktop authored; Tablet and Mobile persisted as EMPTY variants (Designer tab click + save).",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture empty variants",
      background: "#0b1f33",
      bgImageUrl: BG_3X2,
      bgImagePosition: "50% 40%",
      content: {
        contentMode: "single",
        designerData: {
          variant: "per-breakpoint",
          desktop: variantBlob(1440, 900, 1, BG_2X3),
          tablet: { contentMode: "single", positionMode: "free", layoutType: "free", designerCanvasW: 768, designerCanvasH: 900, nextId: 1, blocks: [] },
          mobile: { contentMode: "single", positionMode: "free", layoutType: "free", designerCanvasW: 375, designerCanvasH: 900, nextId: 1, blocks: [] },
        },
        backgroundByBreakpoint: {
          desktop: bgBundle(BG_3X2, "#0b1f33"),
          tablet: null,
          mobile: null,
        },
      },
    },
  };

  // Stale-measure repro: 'Archivo Black' uppercase at 80px is ~606px wide but the box was sized
  // (564 → 542 content) and _measuredH stored (118 = ONE line incl. the Designer's +8 heading margin)
  // while the Designer was still rendering the narrower system fallback (~529px).
  const bF: Pos = { x: 20, y: 366, w: 637, h: 56 };
  const bG: Pos = { x: 40, y: 386, w: 664, h: 75 };
  const bP: Pos = { x: 47, y: 528, w: 940, h: 174 };
  const fontStale: Fixture = {
    name: "font-stale-measure",
    description: "Display webfont wider than the fallback the Designer measured with: stored _measuredH is a single line.",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture font stale measure",
      background: "#0b1f33",
      bgImageUrl: BG_3X2,
      content: {
        contentMode: "single",
        designerData: {
          contentMode: "single",
          positionMode: "free",
          layoutType: "free",
          designerCanvasW: 1440,
          designerCanvasH: 900,
          nextId: 40,
          blocks: [
            textBlock("f1", bF, [
              sub(bF, "se-10", "heading", 87, 200, 564, { level: "h2", text: "NO EXCUSES.", color: "#ffffff", fontSize: 80, textTransform: "uppercase", fontFamily: "'Archivo Black', display", outlined: true, outlineColor: "#ffffff", outlineWidth: 2 }, 118),
            ]),
            textBlock("f2", bG, [
              sub(bG, "se-11", "heading", 80, 347, 618, { level: "h3", text: "service excellence", color: "#ffffff", fontSize: 50, textTransform: "uppercase", fontFamily: "'Archivo Black', display" }, 82),
            ]),
            textBlock("f3", bP, [
              sub(bP, "se-12", "eyebrow", 100, 470, 260, { text: "Our community programme", color: "#ffd479", fontSize: 13, letterSpacing: 3 }, 32),
              sub(bP, "se-13", "paragraph", 74, 590, 894, { text: LOREM, color: "#ffffff", fontSize: 15, fontFamily: "'Poppins', sans-serif", fontWeight: "300" }),
            ]),
          ],
        },
      },
    },
  };

  const multi: Fixture = {
    name: "multi-free",
    description: "Free positionMode + multi content mode (2 stacked bands sharing one 1440x900x2 plate).",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture multi free",
      background: "#0b1f33",
      bgImageUrl: BG_3X2,
      content: {
        contentMode: "multi",
        designerData: (() => {
          const b1: Pos = { x: 80, y: 110, w: 640, h: 330 };
          const b2: Pos = { x: 700, y: 1010, w: 640, h: 330 };
          return {
            contentMode: "multi",
            multiLimit: 2,
            positionMode: "free",
            layoutType: "free",
            designerCanvasW: 1440,
            designerCanvasH: 900,
            nextId: 20,
            blocks: [
              textBlock("m1", b1, [
                sub(b1, "se-20", "heading", 100, 170, 590, { level: "h1", text: "Band one headline", fontSize: 56, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, 90),
                sub(b1, "se-21", "paragraph", 100, 290, 560, { text: LOREM, fontSize: 18, color: "#e8eef5", fontFamily: "'Inter', sans-serif" }),
              ]),
              textBlock("m2", b2, [
                sub(b2, "se-22", "heading", 720, 1070, 590, { level: "h1", text: "Band two headline", fontSize: 56, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, 90),
                sub(b2, "se-23", "paragraph", 720, 1190, 560, { text: LOREM, fontSize: 18, color: "#e8eef5", fontFamily: "'Inter', sans-serif" }),
              ]),
            ],
          };
        })(),
      },
    },
  };

  return [legacy, perBp, emptyVariants, fontStale, multi];
}
