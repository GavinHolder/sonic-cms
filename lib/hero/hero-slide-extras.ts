/**
 * Hero slide extras — the pure decisions behind three additive hero features:
 *   1. slide tone      (`slide.tone`): dark controls + navbar over a light slide
 *   2. facts row       (`slide.overlay.facts`): up to 4 "title over text" facts under the buttons
 *   3. slide tabs      (`content.showTabs`, `slide.tabLabel`): a labelled tab bar instead of the dots
 *
 * One system: HeroCarousel (the only renderer — the admin canvas mounts the same component)
 * and the admin editors both call these, so the rules cannot drift between them.
 *
 * INVARIANTS:
 * 1. With none of the new fields stored, every function returns the value that reproduces the
 *    carousel's previous output exactly (tone "dark", no facts, no tabs, dots as before, and
 *    the dark control colours are the literal strings the carousel used before this existed).
 * 2. Nothing here throws on malformed stored data — content is unvalidated JSON from the DB.
 * 3. Nothing here mutates its input.
 */

import type { HeroFact } from "@/types/section";

export type HeroSlideTone = "light" | "dark";

/** Most facts a slide shows. Extra stored rows are ignored, never an error. */
export const HERO_FACTS_MAX = 4;

/** Attribute the hero sets on <html> while its ACTIVE slide is light; the navbar CSS scopes to it. */
export const HERO_TONE_ATTR = "data-hero-tone";

/** Ink ramp for controls on a light slide (never pure black). Contrast on #eef1f6: 16.3 / 8.6 / 5.2. */
export const HERO_LIGHT_INK = {
  strong: "#0e1326",
  mid: "#3b4358",
  soft: "#5c657b",
  line: "rgba(14, 19, 38, 0.14)",
} as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** "light" only for the exact stored value; anything else (absent, wrong type) is "dark". */
export function resolveSlideTone(slide: unknown): HeroSlideTone {
  return isRecord(slide) && slide.tone === "light" ? "light" : "dark";
}

export interface HeroControlColors {
  dotActive: string;
  dotIdle: string;
  /** Pause / play button. */
  control: string;
  counter: string;
  meta: string;
  scrollLabel: string;
  scrollTrack: string;
}

/** Dark = the literal values HeroCarousel hard-coded before tones existed (do not "tidy" them). */
const DARK_CONTROL_COLORS: HeroControlColors = {
  dotActive: "#fff",
  dotIdle: "rgba(255,255,255,0.4)",
  control: "rgba(255,255,255,0.7)",
  counter: "rgba(255,255,255,0.7)",
  meta: "rgba(255,255,255,0.55)",
  scrollLabel: "rgba(255,255,255,0.5)",
  scrollTrack: "rgba(255,255,255,0.15)",
};

const LIGHT_CONTROL_COLORS: HeroControlColors = {
  dotActive: HERO_LIGHT_INK.strong,
  dotIdle: HERO_LIGHT_INK.soft,
  control: HERO_LIGHT_INK.mid,
  counter: HERO_LIGHT_INK.mid,
  meta: HERO_LIGHT_INK.soft,
  scrollLabel: HERO_LIGHT_INK.soft,
  scrollTrack: HERO_LIGHT_INK.line,
};

export function resolveHeroControlColors(tone: HeroSlideTone): HeroControlColors {
  return tone === "light" ? LIGHT_CONTROL_COLORS : DARK_CONTROL_COLORS;
}

/**
 * Clean a stored facts value: non-arrays give [], non-object rows are skipped, non-string
 * fields become "", rows with neither a title nor a text are dropped, and the result is
 * capped at HERO_FACTS_MAX (counting only rows that survive).
 */
export function normalizeHeroFacts(raw: unknown): HeroFact[] {
  if (!Array.isArray(raw)) return [];
  const out: HeroFact[] = [];
  for (const row of raw) {
    if (out.length >= HERO_FACTS_MAX) break;
    if (!isRecord(row)) continue;
    const title = cleanString(row.title);
    const text = cleanString(row.text);
    if (!title && !text) continue;
    out.push({ title, text });
  }
  return out;
}

/**
 * The facts a slide actually renders. Flow (non-freeform) layout only: a freeform slide
 * places every element by hand and has no flow position "under the buttons".
 */
export function resolveSlideFacts(slide: unknown): HeroFact[] {
  if (!isRecord(slide) || slide.showTextOverlay === false) return [];
  const overlay = slide.overlay;
  if (!isRecord(overlay) || overlay.layoutMode === "freeform") return [];
  return normalizeHeroFacts(overlay.facts);
}

/** Facts colours follow the slide's own text: title = first heading colour, text = subheading colour. */
export function resolveFactsColors(overlay: unknown): { title: string; text: string } {
  const o = isRecord(overlay) ? overlay : {};
  const rows = Array.isArray(o.headingRows) ? o.headingRows : [];
  const firstRow: unknown = rows[0];
  const rowColor = isRecord(firstRow) ? cleanString(firstRow.color) : "";
  const headingColor = isRecord(o.heading) ? cleanString(o.heading.color) : "";
  const title = rowColor || headingColor || "#ffffff";
  const subColor = isRecord(o.subheading) ? cleanString(o.subheading.color) : "";
  return { title, text: subColor || title };
}

/** Tab text: the slide's tab label, else its admin name, else "Slide N". */
export function resolveTabLabel(slide: unknown, index: number): string {
  const s = isRecord(slide) ? slide : {};
  return cleanString(s.tabLabel) || cleanString(s.name) || `Slide ${index + 1}`;
}

/** Tabs show only for the exact stored `true` and when there is more than one slide. */
export function heroTabsEnabled(showTabs: unknown, slideCount: number): boolean {
  return showTabs === true && slideCount > 1;
}

/** Dots keep their existing rule; the tab bar replaces them when it is on. */
export function heroDotsVisible(showDots: unknown, slideCount: number, tabsOn: boolean): boolean {
  return !!showDots && slideCount > 1 && !tabsOn;
}

export interface HeroTabsPalette {
  background: string;
  line: string;
  text: string;
  textActive: string;
  hover: string;
  focus: string;
}

const LIGHT_TABS: HeroTabsPalette = {
  background: "rgba(238, 241, 246, 0.84)",
  line: HERO_LIGHT_INK.line,
  text: HERO_LIGHT_INK.soft,
  textActive: HERO_LIGHT_INK.strong,
  hover: "rgba(14, 19, 38, 0.1)",
  focus: HERO_LIGHT_INK.strong,
};

const DARK_TABS: HeroTabsPalette = {
  background: "rgba(6, 8, 15, 0.6)",
  line: "rgba(246, 247, 251, 0.16)",
  text: "rgba(246, 247, 251, 0.72)",
  textActive: "#f6f7fb",
  hover: "rgba(246, 247, 251, 0.1)",
  focus: "#f6f7fb",
};

export function resolveHeroTabsPalette(tone: HeroSlideTone): HeroTabsPalette {
  return tone === "light" ? LIGHT_TABS : DARK_TABS;
}

/** The hero's existing accent (eyebrow, scroll indicator) — the default progress-line colour. */
export const HERO_TABS_DEFAULT_ACCENT = "var(--bs-success, #22c55e)";

/** Progress-line colour: the stored value when it is a non-blank string without CSS-breaking characters, else the default. */
export function resolveHeroTabsAccent(raw: unknown): string {
  const value = cleanString(raw);
  return value && !/[;{}<>]/.test(value) ? value : HERO_TABS_DEFAULT_ACCENT;
}

/**
 * Facts rows as the EDITOR shows them: same shape/cap as normalizeHeroFacts but nothing is
 * trimmed or dropped, so a freshly added blank row stays put while the admin types into it.
 * (The renderer always goes through normalizeHeroFacts, which hides blank rows.)
 */
export function editableHeroFacts(raw: unknown): HeroFact[] {
  if (!Array.isArray(raw)) return [];
  const out: HeroFact[] = [];
  for (const row of raw) {
    if (out.length >= HERO_FACTS_MAX) break;
    if (!isRecord(row)) continue;
    out.push({
      title: typeof row.title === "string" ? row.title : "",
      text: typeof row.text === "string" ? row.text : "",
    });
  }
  return out;
}
