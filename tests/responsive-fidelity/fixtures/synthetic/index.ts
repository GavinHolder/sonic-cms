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
 *   fallback-none         — legacy Desktop-only section with content.undesignedBreakpoint = "none" (show nothing on Tablet/Mobile).
 *   free-single-header    — free + single with a Section Header (the plate stage is inset by the header height).
 *   free-multi-header     — free + multi (2 bands) with a Section Header.
 *   free-lowerthird-motion— free single with a Lower Third graphic + a Motion Element (painted outside the <section>).
 *   grid-designer         — NON-free designerData (grid positions), section bg image + a Desktop-only per-breakpoint bg bundle.
 *   grid-designer-none    — same, with content.undesignedBreakpoint = "none" (must be ignored: only free sections honour it).
 *   mosaic-designer       — NON-free designerData in mosaic layout mode.
 *   elements-grid         — legacy element-based section (content.elements + layout.type "grid"), no designerData.
 *   scroll-stage-grid     — NON-free multi section with a Scroll Stage (2 zones).
 *   free-lowerthird-none  — free-lowerthird-motion + "show nothing" on Tablet/Mobile: the whole wrapper must disappear.
 *   font-settled-measure  — the Designer's OWN (fonts-settled, stamped `_fontsSettled`) measurement of a heading that wraps.
 *   fit-short-content     — per-breakpoint section whose Tablet (768x1200) / Mobile (375x900) canvases are much TALLER than their content
 *                           (content ends ~y=640 / ~y=600): on short screens the plate must fit the content, not the canvas height.
 *   font-tiny-lineheight  — a heading with line-height 0.5 whose stored height is ambiguous (must not be forced to one line).
 *
 * The non-free / special fixtures exist to prove that nothing outside the free-mode plate is touched by the stage-fit work.
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
  lowerThird?: Record<string, unknown>;
  motionElements?: Record<string, unknown>[];
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

/** Designer-style stored wrapper height for a heading/eyebrow of `lines` lines (see oracle.measuredLines). */
function mh(type: "heading" | "eyebrow", fontSize: number, lines: number): number {
  const lh = type === "heading" ? 1.2 : 1.4;
  return Math.round(lines * fontSize * lh + 14 + (type === "heading" ? 8 : 0));
}

type Kind = "desktop" | "tablet" | "mobile";

/**
 * One "hero + card + image" design, hand-laid-out PER BREAKPOINT (different positions, sizes, font sizes and
 * wrapping) so Tablet/Mobile are genuinely independent designs, not a mechanical shrink of Desktop.
 * Every text box has real breathing room, so a correct render never has text overlapping text.
 */
function heroBlocks(kind: Kind, imageSrc: string) {
  if (kind === "desktop") {
    const b1: Pos = { x: 80, y: 110, w: 640, h: 330 };
    const b2: Pos = { x: 780, y: 500, w: 560, h: 280 };
    const b3: Pos = { x: 1000, y: 100, w: 360, h: 240 };
    return [
      textBlock("b1", b1, [
        sub(b1, "se-1", "eyebrow", 100, 130, 300, { text: "Fixture eyebrow label", fontSize: 13, letterSpacing: 3, color: "#ffd479" }, mh("eyebrow", 13, 1)),
        sub(b1, "se-2", "heading", 100, 170, 590, { level: "h1", text: "Generic fixture headline", fontSize: 56, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, mh("heading", 56, 2)),
        sub(b1, "se-3", "paragraph", 100, 350, 560, { text: LOREM, fontSize: 18, color: "#e8eef5", fontFamily: "'Inter', sans-serif" }),
      ], 2),
      textBlock("b2", b2, [
        sub(b2, "se-4", "heading", 800, 524, 500, { level: "h2", text: "Second panel", fontSize: 34, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, mh("heading", 34, 1)),
        sub(b2, "se-5", "paragraph", 800, 600, 500, { text: LOREM, fontSize: 16, color: "#dbe6f3", fontFamily: "'Inter', sans-serif" }),
        sub(b2, "se-6", "button", 800, 720, 180, { text: "Call to action", bgColor: "#ffd479", textColor: "#0b1f33" }),
      ], 3),
      imageBlock("b3", b3, imageSrc, 1),
    ];
  }
  if (kind === "tablet") {
    const b1: Pos = { x: 40, y: 110, w: 420, h: 380 };
    const b2: Pos = { x: 380, y: 560, w: 350, h: 300 };
    const b3: Pos = { x: 500, y: 110, w: 220, h: 150 };
    return [
      textBlock("b1", b1, [
        sub(b1, "se-1", "eyebrow", 60, 130, 250, { text: "Fixture eyebrow label", fontSize: 12, letterSpacing: 3, color: "#ffd479" }, mh("eyebrow", 12, 1)),
        sub(b1, "se-2", "heading", 60, 168, 390, { level: "h1", text: "Generic fixture headline", fontSize: 32, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, mh("heading", 32, 2)),
        sub(b1, "se-3", "paragraph", 60, 320, 380, { text: LOREM, fontSize: 15, color: "#e8eef5", fontFamily: "'Inter', sans-serif" }),
      ], 2),
      textBlock("b2", b2, [
        sub(b2, "se-4", "heading", 400, 584, 310, { level: "h2", text: "Second panel", fontSize: 24, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, mh("heading", 24, 1)),
        sub(b2, "se-5", "paragraph", 400, 660, 310, { text: LOREM, fontSize: 14, color: "#dbe6f3", fontFamily: "'Inter', sans-serif" }),
        sub(b2, "se-6", "button", 400, 800, 150, { text: "Call to action", bgColor: "#ffd479", textColor: "#0b1f33" }),
      ], 3),
      imageBlock("b3", b3, imageSrc, 1),
    ];
  }
  const b1: Pos = { x: 16, y: 110, w: 343, h: 360 };
  const b2: Pos = { x: 16, y: 520, w: 343, h: 250 };
  const b3: Pos = { x: 216, y: 90, w: 130, h: 96 };
  return [
    textBlock("b1", b1, [
      sub(b1, "se-1", "eyebrow", 36, 200, 220, { text: "Fixture eyebrow label", fontSize: 11, letterSpacing: 3, color: "#ffd479" }, mh("eyebrow", 11, 1)),
      sub(b1, "se-2", "heading", 36, 236, 300, { level: "h1", text: "Generic fixture headline", fontSize: 26, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, mh("heading", 26, 2)),
      sub(b1, "se-3", "paragraph", 36, 330, 300, { text: LOREM, fontSize: 14, color: "#e8eef5", fontFamily: "'Inter', sans-serif" }),
    ], 2),
    textBlock("b2", b2, [
      sub(b2, "se-4", "heading", 36, 540, 300, { level: "h2", text: "Second panel", fontSize: 22, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, mh("heading", 22, 1)),
      sub(b2, "se-5", "paragraph", 36, 600, 300, { text: LOREM, fontSize: 13, color: "#dbe6f3", fontFamily: "'Inter', sans-serif" }),
      sub(b2, "se-6", "button", 36, 700, 150, { text: "Call to action", bgColor: "#ffd479", textColor: "#0b1f33" }),
    ], 3),
    imageBlock("b3", b3, imageSrc, 1),
  ];
}

function variantBlob(kind: Kind, imageSrc: string) {
  const dims = { desktop: [1440, 900], tablet: [768, 900], mobile: [375, 800] }[kind];
  return {
    contentMode: "single",
    positionMode: "free",
    layoutType: "free",
    designerCanvasW: dims[0],
    designerCanvasH: dims[1],
    nextId: 20,
    blocks: heroBlocks(kind, imageSrc),
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
        designerData: variantBlob("desktop", BG_2X3),
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
          desktop: variantBlob("desktop", BG_2X3),
          tablet: variantBlob("tablet", BG_2X3),
          mobile: variantBlob("mobile", BG_2X3),
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
          desktop: variantBlob("desktop", BG_2X3),
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

  const fallbackNone: Fixture = {
    name: "fallback-none",
    description: "Desktop-only section that opted into \"show nothing where Tablet/Mobile isn't designed\" (content.undesignedBreakpoint = none).",
    section: {
      ...legacy.section,
      displayName: "Fixture fallback none",
      content: { ...legacy.section.content, undesignedBreakpoint: "none" },
    },
  };

  const header = { sectionEyebrow: "Fixture eyebrow", sectionHeading: "Fixture section header", sectionSubheading: "A short sub heading that sits under the header." };
  const freeSingleHeader: Fixture = {
    name: "free-single-header",
    description: "Free single section with a Section Header: the plate's stage starts below the header.",
    section: {
      ...legacy.section,
      displayName: "Fixture free single header",
      content: { ...legacy.section.content, ...header },
    },
  };
  const freeMultiHeader: Fixture = {
    name: "free-multi-header",
    description: "Free multi (2 bands) section with a Section Header.",
    section: {
      ...multi.section,
      displayName: "Fixture free multi header",
      content: { ...multi.section.content, ...header },
    },
  };

  const lowerThirdMotion: Fixture = {
    name: "free-lowerthird-motion",
    description: "Free single section with a Lower Third graphic and a Motion Element (rendered outside the <section>).",
    section: {
      ...legacy.section,
      displayName: "Fixture free lower third motion",
      lowerThird: { enabled: true, mode: "preset", preset: "wave", presetColor: "#ffffff", presetOpacity: 0.9, imageSrc: "", height: 120, flipHorizontal: false, flipVertical: false },
      motionElements: [{
        id: "mo-1", type: "image", src: BG_2X3, alt: "", top: "10%", right: "6%", width: "160px", opacity: 100, zIndex: 5, layer: "above-content",
        parallax: { enabled: false, speed: 0 },
        entrance: { enabled: false, direction: "bottom", distance: 0, duration: 0, delay: 0, easing: "linear" },
        exit: { enabled: false, direction: "bottom", distance: 0, duration: 0 },
        idle: { enabled: false, type: "float", speed: 1, amplitude: 0 },
      }],
    },
  };

  // NON-free (grid) designerData: blocks placed on a CSS grid via block.position, not pixelPos.
  const gridBlocks = () => [
    {
      id: 1, type: "text", position: { row: 1, col: 1, colSpan: 1, rowSpan: 1, section: 0 },
      props: { label: "Text", bgColor: "transparent", textColor: "#ffffff", glassEffect: "none", customCss: "" },
      subElements: [
        { id: "g-1", type: "heading", props: { level: "h2", text: "Grid designer heading", color: "#ffffff", fontSize: 34 }, x: 0, y: 0, w: null },
        { id: "g-2", type: "paragraph", props: { text: LOREM, color: "#e8eef5", fontSize: 16 }, x: 0, y: 70, w: null },
      ],
    },
    {
      id: 2, type: "text", position: { row: 1, col: 2, colSpan: 1, rowSpan: 1, section: 1 },
      props: { label: "Text", bgColor: "rgba(255,255,255,0.12)", textColor: "#ffffff", glassEffect: "none", customCss: "" },
      subElements: [
        { id: "g-3", type: "heading", props: { level: "h3", text: "Second grid cell", color: "#ffffff", fontSize: 26 }, x: 0, y: 0, w: null },
        { id: "g-4", type: "paragraph", props: { text: LOREM, color: "#dbe6f3", fontSize: 15 }, x: 0, y: 60, w: null },
      ],
    },
  ];
  const gridData = (over: Record<string, unknown> = {}) => ({
    contentMode: "single", positionMode: "grid", layoutType: "grid", nextId: 10,
    layout: { type: "grid", gridRows: 1, gridCols: 2, gridGap: 24 },
    blocks: gridBlocks(),
    ...over,
  });
  const gridSection: FixtureSection = {
    type: "FLEXIBLE",
    displayName: "Fixture grid designer",
    background: "#0b1f33",
    bgImageUrl: BG_3X2,
    bgImagePosition: "50% 40%",
    content: {
      contentMode: "single",
      layout: { type: "grid", gridRows: 1, gridCols: 2, gridGap: 24 },
      elements: [],
      designerData: gridData(),
      // Desktop-only bundle: an unset Tablet/Mobile bundle must stay NEUTRAL (strict isolation) for a non-free section.
      backgroundByBreakpoint: { desktop: bgBundle(BG_3X2, "#0b1f33"), tablet: null, mobile: null },
    },
  };
  const gridDesigner: Fixture = {
    name: "grid-designer",
    description: "NON-free designerData (grid positions) with a section bg image and a Desktop-only per-breakpoint bg bundle.",
    section: gridSection,
  };
  const gridDesignerNone: Fixture = {
    name: "grid-designer-none",
    description: "Same non-free section but content.undesignedBreakpoint = none — only free sections may honour it.",
    section: { ...gridSection, displayName: "Fixture grid designer none", content: { ...gridSection.content, undesignedBreakpoint: "none" } },
  };
  const mosaicDesigner: Fixture = {
    name: "mosaic-designer",
    description: "NON-free designerData in mosaic layout mode.",
    section: {
      ...gridSection,
      displayName: "Fixture mosaic designer",
      content: {
        ...gridSection.content,
        layout: { type: "grid", layoutMode: "mosaic", gridAutoRows: 160, gridGap: 16 },
        // Mosaic blocks carry their copy in block.props (heading/text/eyebrow) — designerBlockToElement maps them to cards.
        designerData: gridData({
          layoutType: "mosaic",
          layout: { type: "grid", layoutMode: "mosaic", gridAutoRows: 160, gridGap: 16 },
          blocks: [1, 2, 3].map((n) => ({
            id: n, type: "info", position: { row: 1, col: n, colSpan: 1, rowSpan: 1, section: 0 },
            props: { eyebrow: `Cell ${n}`, heading: `Mosaic cell ${n}`, text: LOREM, bgColor: "rgba(255,255,255,0.12)" },
            subElements: [],
          })),
        }),
      },
    },
  };
  const elementsGrid: Fixture = {
    name: "elements-grid",
    description: "Legacy element-based section: content.elements on a CSS grid, no designerData.",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture elements grid",
      background: "#0b1f33",
      bgImageUrl: BG_3X2,
      bgImagePosition: "50% 40%",
      content: {
        contentMode: "single",
        layout: { type: "grid", gridRows: 3, gridCols: 1, gridGap: 20 },
        elements: [1, 2, 3].map((n) => ({
          id: `el-${n}`, type: "text",
          position: { mode: "grid", gridRow: n, gridCol: 1, gridColSpan: 1, gridRowSpan: 1 },
          styling: { textColor: "#ffffff" },
          content: { heading: `Element text ${n}`, text: LOREM },
        })),
        backgroundByBreakpoint: { desktop: bgBundle(BG_3X2, "#0b1f33"), tablet: null, mobile: null },
      },
    },
  };
  const scrollStage: Fixture = {
    name: "scroll-stage-grid",
    description: "NON-free multi section (2 zones) with a Scroll Stage image track.",
    section: {
      ...gridSection,
      displayName: "Fixture scroll stage",
      content: {
        ...gridSection.content,
        contentMode: "multi",
        designerData: gridData({ contentMode: "multi", multiLimit: 2 }),
        scrollStage: { enabled: true, side: "right", scrollMode: "snap", zones: [
          { visualType: "image", src: BG_2X3, alt: "zone one", objectFit: "cover" },
          { visualType: "image", src: BG_3X2, alt: "zone two", objectFit: "cover" },
        ] },
      },
    },
  };

  const lowerThirdNone: Fixture = {
    name: "free-lowerthird-none",
    description: "Free section with a Lower Third + Motion Element that opted into \"show nothing\" on Tablet/Mobile.",
    section: { ...lowerThirdMotion.section, displayName: "Fixture free lower third none", content: { ...lowerThirdMotion.section.content, undesignedBreakpoint: "none" } },
  };

  // What the FIXED Designer saves for the stale-measure case: the real font is in, the heading really wraps to 2 lines,
  // and the measurement is stamped (_fontsSettled) — the live page must trust it, not force it onto one line.
  const settledFont: Fixture = {
    name: "font-settled-measure",
    description: "Fonts-settled Designer measurement (2 lines, stamped _fontsSettled): the one-line guard must stay off.",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture font settled measure",
      background: "#0b1f33",
      bgImageUrl: BG_3X2,
      content: {
        contentMode: "single",
        designerData: {
          contentMode: "single", positionMode: "free", layoutType: "free", designerCanvasW: 1440, designerCanvasH: 900, nextId: 40,
          blocks: [
            textBlock("s1", bF, [
              { ...sub(bF, "se-30", "heading", 87, 200, 564, { level: "h2", text: "NO EXCUSES.", color: "#ffffff", fontSize: 80, textTransform: "uppercase", fontFamily: "'Archivo Black', display" }, mh("heading", 80, 2)), _fontsSettled: true },
            ]),
          ],
        },
      },
    },
  };

  // line-height 0.5 at 22px = an 11px line: the stored height (36 = 2 lines with NO heading margin) would decode to
  // "1 line" under the +8px-margin assumption. The decode is ambiguous there, so the live page must not force nowrap.
  const bT: Pos = { x: 60, y: 200, w: 340, h: 120 };
  const tinyLine: Fixture = {
    name: "font-tiny-lineheight",
    description: "Heading with line-height 0.5 whose stored height is ambiguous: must wrap normally, not be forced to one line.",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture tiny line height",
      background: "#0b1f33",
      bgImageUrl: BG_3X2,
      content: {
        contentMode: "single",
        designerData: {
          contentMode: "single", positionMode: "free", layoutType: "free", designerCanvasW: 1440, designerCanvasH: 900, nextId: 40,
          blocks: [
            textBlock("t1", bT, [
              sub(bT, "se-40", "heading", 80, 220, 300, { level: "h3", text: "A tight heading that needs two lines", color: "#ffffff", fontSize: 22, lineHeight: 0.5, fontFamily: "'Inter', sans-serif" }, 36),
            ]),
          ],
        },
      },
    },
  };

  // Tall canvases, short content (the KULUNTU Mobile case): every block ends well above the canvas bottom.
  const shortBlocks = (kind: "tablet" | "mobile") => {
    const t = kind === "tablet";
    const b1: Pos = t ? { x: 40, y: 110, w: 690, h: 300 } : { x: 16, y: 100, w: 343, h: 250 };
    const b2: Pos = t ? { x: 40, y: 440, w: 690, h: 200 } : { x: 16, y: 380, w: 343, h: 200 };
    return [
      textBlock("q1", b1, [
        sub(b1, "q-1", "heading", b1.x + 22, b1.y + 24, b1.w - 44, { level: "h2", text: "Short content headline", fontSize: t ? 40 : 28, color: "#ffffff", fontFamily: "'Inter', sans-serif" }, mh("heading", t ? 40 : 28, 1)),
        sub(b1, "q-2", "paragraph", b1.x + 22, b1.y + (t ? 110 : 90), b1.w - 44, { text: LOREM, fontSize: t ? 18 : 15, color: "#e8eef5", fontFamily: "'Inter', sans-serif" }),
      ], 2),
      textBlock("q2", b2, [
        sub(b2, "q-3", "paragraph", b2.x + 22, b2.y + 24, b2.w - 44, { text: LOREM, fontSize: t ? 16 : 14, color: "#dbe6f3", fontFamily: "'Inter', sans-serif" }),
        sub(b2, "q-4", "button", b2.x + 22, b2.y + (t ? 120 : 110), 160, { text: "Call to action", bgColor: "#ffd479", textColor: "#0b1f33" }),
      ], 3),
    ];
  };
  const shortVariant = (kind: "tablet" | "mobile") => ({
    contentMode: "single", positionMode: "free", layoutType: "free",
    designerCanvasW: kind === "tablet" ? 768 : 375, designerCanvasH: kind === "tablet" ? 1200 : 900, nextId: 20, blocks: shortBlocks(kind),
  });
  const fitShort: Fixture = {
    name: "fit-short-content",
    description: "Tablet 768x1200 / Mobile 375x900 canvases whose content ends at ~y=650 / ~y=600: fit-to-content territory on short screens.",
    section: {
      type: "FLEXIBLE",
      displayName: "Fixture fit short content",
      background: "#0b1f33",
      content: {
        contentMode: "single",
        designerData: { variant: "per-breakpoint", desktop: variantBlob("desktop", BG_2X3), tablet: shortVariant("tablet"), mobile: shortVariant("mobile") },
        backgroundByBreakpoint: { desktop: bgBundle(BG_3X2, "#0b1f33"), tablet: bgBundle(BG_3X2), mobile: bgBundle(BG_2X3) },
      },
    },
  };

  return [legacy, perBp, emptyVariants, fontStale, multi, fallbackNone, freeSingleHeader, freeMultiHeader, lowerThirdMotion, lowerThirdNone, gridDesigner, gridDesignerNone, mosaicDesigner, elementsGrid, scrollStage, settledFont, tinyLine, fitShort];
}
