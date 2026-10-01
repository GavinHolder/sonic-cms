import type { BreakpointCounts } from '@/lib/section-versions';

export type Breakpoint = keyof BreakpointCounts;
export const BREAKPOINTS: readonly Breakpoint[] = ['desktop', 'tablet', 'mobile'];

/**
 * Returns breakpoints that had blocks in the next-older version but have 0 in this one
 * (i.e. a layout vanished at this save). `older` undefined (oldest row) -> none.
 */
export function droppedBreakpoints(current: BreakpointCounts, older?: BreakpointCounts): Breakpoint[] {
  if (!older) return [];
  return BREAKPOINTS.filter((bp) => older[bp] > 0 && current[bp] === 0);
}

/** Human relative time, e.g. "5 min ago". Falls back to '' for invalid input. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}
