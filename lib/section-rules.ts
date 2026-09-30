/**
 * Section-type / triangle-overlay decision rules.
 *
 * ONE SYSTEM PER CONCERN (see CLAUDE.md): this is the single source of truth for "is this a
 * Hero section" and "should this section show its diagonal triangle overlay", shared by the
 * live renderer (components/sections/DynamicSection.tsx, app/HomepageClient.tsx) and the
 * Designer's "next section" warning-band preview (components/admin/FlexibleSectionEditorModal.tsx
 * — see nextSectionTriangle). Extracted 2026-09-30 (round-2 review of fix/designer-navbar-guide-
 * drift, MEDIUM #3): the modal used to only check triangleEnabled, so it could show a warning
 * band for a case (e.g. a FOOTER section with triangleEnabled true) live would never actually
 * draw a triangle for. Do not hand-copy these conditions a second time — extend this file
 * instead.
 */

/** Section `type` values that render as the page hero (HeroCarousel) — the current uppercase
 *  form plus the legacy lowercase ones still found in some stored data. */
const HERO_TYPES = new Set(["HERO", "hero", "hero-carousel"]);

export function isHeroSectionType(type: string): boolean {
  return HERO_TYPES.has(type);
}

/**
 * Whether a section should render its diagonal "triangle" overlay (TriangleSectionWrapper).
 *
 * Mirrors DynamicSection.tsx's own check exactly: a Hero section's switch case actually returns
 * before ever reaching this function live (case-sensitive "HERO"/"FOOTER" match only, not the
 * legacy lowercase Hero forms) — kept case-sensitive here too so this function's output matches
 * DynamicSection.tsx's for every type value, byte-for-byte, including ones a caller (e.g. the
 * Designer's warning-band preview) might ask about pre-emptively for a section it hasn't
 * rendered.
 *
 * RULES:
 * - HERO and FOOTER sections NEVER get triangles.
 * - The section immediately after the Hero NEVER gets one (it would overlap the hero).
 * - The section's own triangleEnabled flag must be true.
 */
export function shouldShowTriangle(
  section: { type: string; triangleEnabled?: boolean },
  isFirstAfterHero: boolean
): boolean {
  if (!section.triangleEnabled) return false;
  if (section.type === "HERO" || section.type === "FOOTER") return false;
  if (isFirstAfterHero) return false;
  return true;
}
