/**
 * Decide whether a locally stored designer draft may be resumed WITHOUT asking.
 *
 * ASSUMPTIONS: baseUpdatedAt = the section.updatedAt (ISO) the draft was based on when saved.
 * FAILURE MODES: a draft based on an older server version silently overwriting newer data
 * (the incident). Any mismatch or doubt -> 'prompt' (user decides); never 'resume'.
 *
 * Legacy drafts (no baseUpdatedAt) keep the older savedAt >= section.updatedAt rule.
 */
export type DraftResumeDecision = 'resume' | 'prompt';

function ms(v: unknown): number {
  const t = v ? new Date(v as any).getTime() : NaN;
  return Number.isFinite(t) ? t : NaN;
}

export function decideDraftResume(input: {
  draftSavedAt: number;
  draftBaseUpdatedAt?: string | null;
  sectionUpdatedAt?: string | null;
}): DraftResumeDecision {
  const sectionMs = ms(input.sectionUpdatedAt);
  if (input.draftBaseUpdatedAt) {
    const baseMs = ms(input.draftBaseUpdatedAt);
    return Number.isFinite(baseMs) && Number.isFinite(sectionMs) && baseMs === sectionMs ? 'resume' : 'prompt';
  }
  return input.draftSavedAt >= (Number.isFinite(sectionMs) ? sectionMs : 0) ? 'resume' : 'prompt';
}
