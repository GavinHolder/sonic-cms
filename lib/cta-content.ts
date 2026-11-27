/**
 * Builds the `content` object the CTA section editor saves.
 *
 * INVARIANT: the editor only decides the keys it OWNS. Every other key already
 * stored on the section (authored by a seed script, an import, or a newer
 * editor version) survives a save or autosave untouched.
 *
 * - `owned[key] === undefined` means "the user cleared this" → the key is removed.
 * - A key absent from `owned` is not the editor's to decide → it is kept as stored.
 */
export function buildCtaContent<T extends Record<string, unknown>>(
  existing: Record<string, unknown> | null | undefined,
  owned: T,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return Object.entries(owned).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (value === undefined) {
        return Object.fromEntries(Object.entries(acc).filter(([k]) => k !== key));
      }
      return { ...acc, [key]: value };
    },
    { ...base },
  );
}

/** Trimmed string, or undefined when blank — so a cleared input removes its key. */
export function blankToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : undefined;
}

/** Drops blank entries; undefined when nothing is left — so an emptied group removes its key. */
export function compactStringRecord(
  record: Record<string, string | null | undefined>,
): Record<string, string> | undefined {
  const kept = Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    const v = blankToUndefined(value);
    return v ? { ...acc, [key]: v } : acc;
  }, {});
  return Object.keys(kept).length > 0 ? kept : undefined;
}
