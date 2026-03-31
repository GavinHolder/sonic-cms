'use client'

/**
 * fontLoader — ensures a Google Font is loaded before pretext runs layout.
 *
 * Pretext measures glyphs via canvas measureText. If the font has not loaded yet,
 * canvas falls back to a system font and all measurements are wrong. This module
 * injects a Google Fonts <link> tag when needed and waits on document.fonts.ready.
 */

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2?family='

/** Module-level cache so we never inject the same family twice. */
const injected = new Set<string>()

/**
 * Ensure `fontFamily` is loaded in the browser.
 * - If the font is already available (document.fonts.check), resolves immediately.
 * - Otherwise injects a Google Fonts <link> and waits for document.fonts.ready.
 *
 * Safe to call multiple times with the same family.
 */
export async function ensureFont(fontFamily: string, fontSize = 16): Promise<void> {
  if (typeof document === 'undefined') return

  const testString = `${fontSize}px "${fontFamily}"`

  if (document.fonts.check(testString)) return

  if (!injected.has(fontFamily)) {
    injected.add(fontFamily)
    const encodedFamily = fontFamily.replace(/ /g, '+')
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${GOOGLE_FONTS_BASE}${encodedFamily}:wght@400;700&display=swap`
    document.head.appendChild(link)
  }

  await document.fonts.ready
}

/**
 * Build the CSS font shorthand string pretext expects.
 * e.g. fontString('Merriweather', 18) → '18px "Merriweather"'
 */
export function fontString(fontFamily: string, fontSize: number): string {
  return `${fontSize}px "${fontFamily}"`
}
