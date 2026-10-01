/**
 * reflow-backdrop — pure logic for FreeReflowStack's "backdrop for mobile reflow" feature
 * (components/sections/FlexibleSectionRenderer.tsx).
 *
 * WHY THIS EXISTS:
 * When a FLEXIBLE section's Tablet/Mobile breakpoint is undesigned, the live page falls
 * back to FreeReflowStack: Desktop's absolutely-positioned blocks reflowed into a single
 * readable column. FreeReflowStack only knew two kinds of block: an ordinary sequential
 * leaf (text/card/etc, stacked top to bottom) and a full-SECTION background
 * (`props.fullBleed`, see isFullBleedVolt in FlexibleSectionRenderer.tsx). It had no way
 * to represent a BOUNDED decorative block (e.g. a dark, semi-transparent "glass card" volt,
 * NOT full-bleed) authored to sit behind a specific set of other blocks that visually
 * overlap it in the normal desktop/tablet absolute layout (a "frosted glass panel with
 * text on it" effect) — reflowed sequentially, the card became an isolated, visually-empty
 * leaf with nothing on it, and the overlaid text became its own disconnected leaf elsewhere
 * in the stack. Confirmed live in at least the WIRELESS and FIBRE sections.
 *
 * `props.reflowBackdrop` is a new, EXPLICIT author-set boolean (Designer UI: a checkbox on
 * the volt block's property panel, public/flexible-designer.html, mirroring the existing
 * `props.fullBleed` toggle) — never inferred from geometry. A flagged block is excluded
 * from FreeReflowStack's sequential leaves and instead rendered once, collectively with any
 * other flagged blocks in the same section, as a shared decorative layer positioned behind
 * the FULL reflowed column (v1 scope: whole-stack height, not per-leaf partial-overlap
 * math — there is no single obviously-correct way to map a 2D overlap onto a 1D stack, so
 * this starts with the version that fixes the reported symptom — an isolated empty box —
 * without over-engineering exact positioning).
 *
 * Scoped to FreeReflowStack's reflow fallback ONLY. A block's DESIGNED (non-reflow)
 * breakpoint plate renders every block, including a reflowBackdrop-flagged one, completely
 * normally at its authored position — this module is never consulted there.
 *
 * These functions are pure (no React/DOM) and unit-tested
 * (__tests__/unit/lib/reflow-backdrop.test.ts).
 */

/** Minimal shape this module needs from a designerData block — matches the relevant
 *  subset of FlexibleSectionRenderer's own ReflowBlock/block types. */
export interface ReflowBackdropCandidate {
  type?: string;
  props?: Record<string, unknown> | null;
}

/**
 * True for a volt block explicitly flagged as a reflow backdrop. Requires `voltId` —
 * same rule isFullBleedVolt follows — so a reflowBackdrop-flagged block that hasn't had a
 * Volt design picked yet stays a normal (placeholder-showing) leaf instead of silently
 * vanishing into an empty backdrop layer.
 */
export function isReflowBackdropVolt(block: ReflowBackdropCandidate | null | undefined): boolean {
  return !!block && block.type === "volt" && !!block.props?.reflowBackdrop && !!block.props?.voltId;
}

/**
 * Splits a section's blocks (already filtered to the active breakpoint/zone) into the
 * ordinary sequential leaves FreeReflowStack stacks top-to-bottom and the reflowBackdrop-
 * flagged volts that instead render as one shared backdrop layer behind that stack.
 * Order within each group is preserved (callers that care about z-order for multiple
 * backdrop blocks get DOM/array order, same convention as fullBleedVolts.map).
 */
export function partitionReflowBlocks<T extends ReflowBackdropCandidate>(
  blocks: T[]
): { leafBlocks: T[]; backdropBlocks: T[] } {
  const leafBlocks: T[] = [];
  const backdropBlocks: T[] = [];
  for (const block of blocks) {
    (isReflowBackdropVolt(block) ? backdropBlocks : leafBlocks).push(block);
  }
  return { leafBlocks, backdropBlocks };
}
