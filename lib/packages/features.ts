/**
 * Package.features (Json) — shared parsing/formatting for the admin-managed
 * "badge + value" feature list (see FeatureBadgeType in prisma/schema.prisma).
 *
 * Two live shapes coexist by design and MUST both keep rendering correctly:
 *  - legacy plain string, e.g. "Uncapped data" — every package created before this
 *    feature shipped stores its features this way, and stays that way until an
 *    admin re-saves it. No forced data migration.
 *  - { badge: string | null; value: string } — `badge` is a FeatureBadgeType.name
 *    (matched by name only, no FK — a renamed/deleted badge type just stops
 *    resolving help text, the value still renders) or `null` for a row the admin
 *    deliberately left as free text (no badge assigned).
 *
 * Every render/format site reads through `parsePackageFeatures`, so a legacy
 * package's card looks exactly as it did before this feature existed.
 */

export interface FeatureRow {
  badge: string | null;
  value: string;
}

export type PackageFeatureEntry = string | FeatureRow;

export function isBadgeFeature(e: unknown): e is FeatureRow {
  if (!e || typeof e !== "object") return false;
  const r = e as Record<string, unknown>;
  return typeof r.value === "string" && (r.badge === null || typeof r.badge === "string");
}

function safeJsonArray(s: string): unknown[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/**
 * Parse a Package.features JSON value (`unknown` at the Prisma/API boundary) into a
 * typed array, filtering out empty/garbage entries. Non-array or unparseable input
 * collapses to `[]` rather than throwing — a malformed row must never break the
 * whole card.
 */
export function parsePackageFeatures(raw: unknown): PackageFeatureEntry[] {
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? safeJsonArray(raw) : [];
  const out: PackageFeatureEntry[] = [];
  for (const e of arr) {
    if (typeof e === "string") {
      if (e.trim()) out.push(e);
    } else if (isBadgeFeature(e)) {
      if (e.value.trim()) out.push({ badge: e.badge, value: e.value });
    }
    // Anything else (number, null, malformed object) is silently dropped.
  }
  return out;
}

/**
 * Flatten one entry to a plain display string — used by text-only contexts that
 * can't render a distinct badge label (e.g. the {{pkg.features}} token, a Volt
 * text-slot). A legacy string passes through unchanged; a badge entry becomes
 * "Badge: Value", or just "Value" when the row is free text (`badge === null`).
 */
export function featureEntryText(e: PackageFeatureEntry): string {
  if (typeof e === "string") return e;
  return e.badge ? `${e.badge}: ${e.value}` : e.value;
}

/**
 * Normalize a raw Package.features value into editable rows for the admin form —
 * every row becomes `{badge, value}` regardless of source shape, so the edit form
 * only ever deals with one internal representation. A legacy string becomes
 * `{badge: null, value: theString}` (shown as "— Free text (no badge) —" in the
 * badge <select>), editable and re-savable exactly as before, but now also
 * assignable to a real badge type.
 */
export function toEditableFeatureRows(raw: unknown): FeatureRow[] {
  return parsePackageFeatures(raw).map((e) =>
    typeof e === "string" ? { badge: null, value: e } : { badge: e.badge, value: e.value }
  );
}

/**
 * Prepare edited rows for save — trims values, drops empty rows, and normalizes
 * `badge` to `null` for anything blank. Saving always writes the `{badge, value}[]`
 * shape going forward (never plain strings), per the FeatureBadgeType design: a
 * "free text" row saves as `{badge: null, value: "..."}`, not a bare string, so the
 * two live formats don't keep multiplying past the save boundary.
 */
export function sanitizeFeatureRowsForSave(rows: FeatureRow[]): FeatureRow[] {
  return rows
    .map((r) => ({ badge: r.badge && r.badge.trim() ? r.badge.trim() : null, value: r.value.trim() }))
    .filter((r) => r.value !== "");
}
