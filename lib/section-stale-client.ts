/**
 * Client-side plumbing for section optimistic concurrency.
 *
 * - Remembers the updatedAt returned by this tab's own successful PUTs so chained saves
 *   (save, keep editing, save again) do not false-409 against their own previous write.
 * - Never lets a stale in-memory snapshot win: expected = the OLDER-known-safe value is never used;
 *   we only upgrade the editor's snapshot to a newer value this tab itself produced.
 * - Announces a 409 via a window event so any mounted editor can show a toast and keep its draft.
 */
export const SECTION_STALE_EVENT = 'cms:section-stale';

export interface SectionStaleDetail { sectionId: string; currentUpdatedAt: string | null }

const lastSavedAt = new Map<string, string>();

export function rememberSavedUpdatedAt(sectionId: string, updatedAt: unknown): void {
  if (typeof updatedAt === 'string' && updatedAt) lastSavedAt.set(sectionId, updatedAt);
}

/** Returns the ISO updatedAt to send as expectedUpdatedAt, or undefined when the caller has no base. */
export function resolveExpectedUpdatedAt(sectionId: string, snapshotAt: unknown): string | undefined {
  if (snapshotAt === undefined || snapshotAt === null || snapshotAt === '') return undefined;
  const snap = new Date(snapshotAt as string);
  if (Number.isNaN(snap.getTime())) return undefined;
  const known = lastSavedAt.get(sectionId);
  if (known) {
    const k = new Date(known).getTime();
    if (Number.isFinite(k) && k > snap.getTime()) return known;
  }
  return snap.toISOString();
}

export function announceSectionStale(detail: SectionStaleDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SectionStaleDetail>(SECTION_STALE_EVENT, { detail }));
}

export const SECTION_STALE_MESSAGE =
  'This section was changed elsewhere (another tab or device). Reload to see the latest - your unsaved edits are kept in the draft.';
