import { describe, it, expect } from 'vitest';
import { droppedBreakpoints, relativeTime } from '@/lib/section-version-diff';

describe('droppedBreakpoints', () => {
  it('flags a breakpoint that went from blocks to zero', () => {
    expect(droppedBreakpoints({ desktop: 3, tablet: 2, mobile: 0 }, { desktop: 3, tablet: 2, mobile: 4 })).toEqual(['mobile']);
  });
  it('ignores already-empty and oldest rows', () => {
    expect(droppedBreakpoints({ desktop: 1, tablet: 0, mobile: 0 }, { desktop: 1, tablet: 0, mobile: 0 })).toEqual([]);
    expect(droppedBreakpoints({ desktop: 0, tablet: 0, mobile: 0 })).toEqual([]);
  });
});
describe('relativeTime', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  it('formats', () => {
    expect(relativeTime('2026-10-01T11:59:50Z', now)).toBe('just now');
    expect(relativeTime('2026-10-01T11:30:00Z', now)).toBe('30 min ago');
    expect(relativeTime('2026-09-29T12:00:00Z', now)).toBe('2 days ago');
    expect(relativeTime('bad', now)).toBe('');
  });
});
