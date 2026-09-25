/**
 * Synthetic HERO fixture for the hero-mobile regression harness (generic content, no site-specific media).
 *
 * It reproduces the two defect shapes a real freeform hero can have on a phone:
 *  - slide 0: a logo authored at the TOP of the slide (desktop y = 8, tablet y = 10) and four heading rows with NO
 *    `posMobile` anywhere, two of them stored with the Google category word as their fallback (`'Archivo Black', display`).
 *    On a phone every un-`posMobile` element is stacked in one column, so the logo must LEAD the column (design order) and
 *    all four rows must fall back to the same real generic family.
 *  - slide 1: the same content but with `posMobile` on the logo and every row — those elements keep their absolute
 *    positions (the per-element opt-in is unchanged).
 *  - slide 2: NOTHING dragged (no `pos` anywhere: eyebrow, two rows, subheading, button, an undragged image) — the mobile
 *    stack must be exactly the renderer's fixed order, with no `order` style on any element.
 *  - slide 3: mixed — some elements dragged (rows, subheading, logo at the top), eyebrow and button undragged — only the dragged
 *    elements permute among their own slots.
 * Images are inline SVG data URIs so the fixture needs no assets and no network.
 */

const svg = (body: string, w: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

const BG_A = svg(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2a49"/><stop offset="1" stop-color="#0b1020"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>`, 1600, 900);
const BG_B = svg(`<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3a1d49"/><stop offset="1" stop-color="#10091c"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>`, 1600, 900);
export const LOGO = svg(`<rect width="480" height="120" rx="14" fill="#ffffff"/><text x="240" y="78" font-size="52" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#0b1020">LOGO</text>`, 480, 120);

const FONT_OK = "'Archivo Black', sans-serif";
const FONT_BAD = "'Archivo Black', display"; // stored by the font picker before the category word was normalised

type Pos = { x: number; y: number };
const row = (text: string, fontFamily: string, pos: Pos, posTablet: Pos, posMobile?: Pos, extra: Record<string, unknown> = {}) => ({
  text, color: "#ffffff", fontSize: 100, fontWeight: 800, fontFamily, animation: "slideUp", animationDelay: 100, animationDuration: 500,
  pos, posTablet, ...(posMobile ? { posMobile } : {}), ...extra,
});

const overlay = (withPosMobile: boolean) => ({
  layoutMode: "freeform",
  position: "center",
  heading: { text: "", color: "#ffffff", fontSize: 100, fontWeight: 700, fontFamily: "inherit", animation: "slideUp", animationDelay: 100, animationDuration: 500 },
  spacing: { betweenButtons: 16, betweenHeadingSubheading: 16, betweenSubheadingButtons: 32 },
  buttons: [],
  headingRows: [
    row("FIRST", FONT_OK, { x: 32, y: 27 }, { x: 50, y: 23 }, withPosMobile ? { x: 50, y: 34 } : undefined),
    row("SECOND ROW", FONT_OK, { x: 50, y: 37 }, { x: 51, y: 29 }, withPosMobile ? { x: 50, y: 44 } : undefined, { fontSize: 150 }),
    row("THIRD", FONT_BAD, { x: 40, y: 56 }, { x: 51, y: 42 }, withPosMobile ? { x: 50, y: 56 } : undefined),
    row("FOURTH", FONT_BAD, { x: 42, y: 67 }, { x: 50, y: 49 }, withPosMobile ? { x: 50, y: 68 } : undefined, { fontSize: 150 }),
  ],
  images: [
    {
      src: LOGO, alt: "Logo", width: 480, forceWhite: false, animation: "slideDown", animationDelay: 100, animationDuration: 500,
      pos: { x: 50, y: 8 }, posTablet: { x: 50, y: 10 }, ...(withPosMobile ? { posMobile: { x: 50, y: 14 } } : {}),
    },
  ],
});

const anim = { animation: "fadeIn", animationDelay: 100, animationDuration: 400 };
/** eyebrow + two rows + subheading + button + image, positions supplied per slide (undefined = never dragged). */
const fullOverlay = (p: { rows: [Pos | undefined, Pos | undefined]; sub?: Pos; logo?: Pos }) => ({
  layoutMode: "freeform",
  position: "center",
  eyebrow: "EYEBROW",
  eyebrowHidden: false,
  heading: { text: "", color: "#ffffff", fontSize: 100, fontWeight: 700, fontFamily: "inherit", ...anim },
  spacing: { betweenButtons: 16, betweenHeadingSubheading: 16, betweenSubheadingButtons: 32 },
  headingRows: [
    { text: "ALPHA", color: "#ffffff", fontSize: 80, fontWeight: 800, fontFamily: FONT_OK, ...anim, ...(p.rows[0] ? { pos: p.rows[0] } : {}) },
    { text: "BETA", color: "#ffffff", fontSize: 80, fontWeight: 800, fontFamily: FONT_OK, ...anim, ...(p.rows[1] ? { pos: p.rows[1] } : {}) },
  ],
  subheading: { text: "Subheading text", color: "#ffffff", fontSize: 22, fontWeight: 400, fontFamily: "inherit", ...anim, ...(p.sub ? {} : {}) },
  ...(p.sub ? { subheadingPos: p.sub } : {}),
  buttons: [{ text: "Button", href: "#", variant: "filled", backgroundColor: "#0a84ff", textColor: "#ffffff", ...anim }],
  images: [{ src: LOGO, alt: "Logo", width: 160, forceWhite: false, ...anim, ...(p.logo ? { pos: p.logo } : {}) }],
});

export function heroFixtureSection() {
  return {
    type: "HERO",
    enabled: true,
    displayName: "Hero mobile fixture",
    paddingTop: 80,
    paddingBottom: 80,
    background: "white",
    content: {
      autoPlay: false,
      autoPlayInterval: 5000,
      showDots: true,
      showArrows: true,
      transitionDuration: 400,
      statsStrip: { enabled: false, items: [] },
      slides: [
        { id: "hm-slide-0", name: "Stacked on mobile", type: "image", src: BG_A, alt: "", overlay: overlay(false) },
        { id: "hm-slide-1", name: "posMobile authored", type: "image", src: BG_B, alt: "", overlay: overlay(true) },
        { id: "hm-slide-2", name: "nothing dragged", type: "image", src: BG_A, alt: "", overlay: fullOverlay({ rows: [undefined, undefined] }) },
        { id: "hm-slide-3", name: "mixed dragged / undragged", type: "image", src: BG_B, alt: "", overlay: fullOverlay({ rows: [{ x: 50, y: 40 }, { x: 50, y: 30 }], sub: { x: 50, y: 60 }, logo: { x: 50, y: 8 } }) },
      ],
    },
  };
}
