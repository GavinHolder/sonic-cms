/**
 * Hero font helpers — the ONE place the Hero (and its admin preview) builds a Google Fonts request or a safe font stack.
 *
 * Thin wrappers over the shared rules module public/flexible-render-rules.js (the same css2 URL builder and the same
 * category-word normaliser the Flexible renderer and Designer use), so the Hero can never drift from them.
 *
 * INVARIANTS:
 * 1. Every hero font URL requests weight 400. Google Fonts css2 answers HTTP 400 and loads NOTHING when the weight list
 *    omits 400 for a family (e.g. `Archivo+Black:wght@700;800`), while any list that includes 400 answers 200.
 * 2. A stored stack such as `'Archivo Black', display` is never applied raw: the trailing Google CATEGORY word is not a CSS
 *    generic family, so the browser treats it as a family NAME and falls back to its default serif instead of sans-serif
 *    while the webfont is loading (rows stored with `, sans-serif` and rows stored with `, display` then look like two
 *    different fonts). `heroFontStack` rewrites it to a real generic.
 */
import { buildGoogleFontHref, normalizeFontStack } from "../../public/flexible-render-rules.js";

/** Weights the Hero requests for every family. 400 is mandatory (invariant 1). */
export const HERO_FONT_WEIGHTS: readonly number[] = [400, 700, 800, 900];

/** Origins a hero font needs: the css2 stylesheet, then the woff2 files (a second host — its own DNS + TLS on a cold connection). */
export const HERO_FONT_ORIGINS = {
  css: "https://fonts.googleapis.com",
  files: "https://fonts.gstatic.com",
} as const;

/** Google Fonts css2 URL for one hero family. Always includes weight 400. */
export function heroFontHref(family: string): string {
  return buildGoogleFontHref(family, [...HERO_FONT_WEIGHTS]);
}

/** A stored font-family stack made safe to apply: a trailing `display`/`handwriting` becomes a real generic. */
export function heroFontStack<T extends string | undefined | null>(css: T): T {
  return normalizeFontStack(css);
}
