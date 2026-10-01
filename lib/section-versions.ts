/** Helpers for section version history summaries (never exposes the full blob). */

export interface BreakpointCounts { desktop: number; tablet: number; mobile: number }

function countBlocks(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.blocks)) return o.blocks.length;
    if (Array.isArray(o.elements)) return o.elements.length;
  }
  return 0;
}

/**
 * designerData is stored as a JSON-encoded STRING {variant,desktop,tablet,mobile} (may also be an
 * object, or absent on legacy sections). Malformed input yields zeros, never throws.
 */
export function summarizeDesignerData(content: unknown): BreakpointCounts {
  const zero: BreakpointCounts = { desktop: 0, tablet: 0, mobile: 0 };
  try {
    let dd = content && typeof content === 'object' ? (content as any).designerData : null;
    if (typeof dd === 'string') dd = JSON.parse(dd);
    if (!dd || typeof dd !== 'object') return zero;
    return { desktop: countBlocks(dd.desktop), tablet: countBlocks(dd.tablet), mobile: countBlocks(dd.mobile) };
  } catch {
    return zero;
  }
}

export const SECTION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
