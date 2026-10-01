import { describe, it, expect } from 'vitest';
import { resolveExpectedUpdatedAt, rememberSavedUpdatedAt } from '@/lib/section-stale-client';

describe('resolveExpectedUpdatedAt', () => {
  it('no snapshot -> undefined (legacy caller, no check)', () => {
    expect(resolveExpectedUpdatedAt('a', undefined)).toBeUndefined();
    expect(resolveExpectedUpdatedAt('a', 'garbage')).toBeUndefined();
  });
  it('uses the snapshot, normalised to ISO', () => {
    expect(resolveExpectedUpdatedAt('b', '2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');
  });
  it('chains to this tab own newer save, never to something older', () => {
    rememberSavedUpdatedAt('c', '2026-01-02T00:00:00.000Z');
    expect(resolveExpectedUpdatedAt('c', '2026-01-01T00:00:00.000Z')).toBe('2026-01-02T00:00:00.000Z');
    expect(resolveExpectedUpdatedAt('c', '2026-01-03T00:00:00.000Z')).toBe('2026-01-03T00:00:00.000Z');
  });
});
