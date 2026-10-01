import { describe, it, expect } from 'vitest';
import { decideDraftResume } from '@/lib/section-draft-resume';
import { summarizeDesignerData } from '@/lib/section-versions';

const A = '2026-01-01T00:00:00.000Z';
const B = '2026-01-02T00:00:00.000Z';

describe('decideDraftResume', () => {
  it('base equals current -> resume', () => {
    expect(decideDraftResume({ draftSavedAt: 5, draftBaseUpdatedAt: A, sectionUpdatedAt: A })).toBe('resume');
  });
  it('base differs even if draft is newer in time -> prompt (the incident)', () => {
    expect(decideDraftResume({ draftSavedAt: Date.parse(B) + 999, draftBaseUpdatedAt: A, sectionUpdatedAt: B })).toBe('prompt');
  });
  it('unparseable base or missing section time -> prompt', () => {
    expect(decideDraftResume({ draftSavedAt: 1, draftBaseUpdatedAt: 'x', sectionUpdatedAt: A })).toBe('prompt');
    expect(decideDraftResume({ draftSavedAt: 1, draftBaseUpdatedAt: A, sectionUpdatedAt: null })).toBe('prompt');
  });
  it('legacy draft (no base) keeps savedAt rule', () => {
    expect(decideDraftResume({ draftSavedAt: Date.parse(B), sectionUpdatedAt: A })).toBe('resume');
    expect(decideDraftResume({ draftSavedAt: Date.parse(A), sectionUpdatedAt: B })).toBe('prompt');
    expect(decideDraftResume({ draftSavedAt: 0, sectionUpdatedAt: B })).toBe('prompt');
  });
});

describe('summarizeDesignerData', () => {
  it('counts blocks per breakpoint from a JSON-encoded string', () => {
    const dd = JSON.stringify({ variant: 'x', desktop: { blocks: [1, 2, 3] }, tablet: [1], mobile: null });
    expect(summarizeDesignerData({ designerData: dd })).toEqual({ desktop: 3, tablet: 1, mobile: 0 });
  });
  it('malformed/absent -> zeros', () => {
    const z = { desktop: 0, tablet: 0, mobile: 0 };
    expect(summarizeDesignerData({ designerData: '{bad' })).toEqual(z);
    expect(summarizeDesignerData(null)).toEqual(z);
    expect(summarizeDesignerData({})).toEqual(z);
  });
});
