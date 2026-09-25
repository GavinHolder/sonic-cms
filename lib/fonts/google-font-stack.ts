/**
 * googleFontStack — the ONE builder of a stored font-family stack for a picked Google font.
 *
 * The picker's font list carries Google's CATEGORY per family ("display", "handwriting", "sans-serif", "serif", ...). Only
 * some of those are CSS generic families. Storing `'Archivo Black', display` puts a bare unknown word in font-family, which
 * browsers treat as a family NAME — so while the webfont loads the text silently falls back to the default SERIF instead of
 * sans-serif (and differs from a sibling row stored with `, sans-serif`). This maps the category to a real generic via the
 * shared normaliser, so a newly picked font never stores a Google category word.
 */
import { normalizeFontStack } from "../../public/flexible-render-rules.js";

export function googleFontStack(family: string, category: string): string {
  return normalizeFontStack(`'${family}', ${category}`);
}
