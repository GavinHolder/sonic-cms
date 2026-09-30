"use client";

import { useState, useEffect } from "react";
import { fetchWithRefresh } from "@/lib/fetch-with-refresh";

interface LinkOption {
  value: string;
  label: string;
}

interface LinkGroup {
  label: string;
  options: LinkOption[];
}

interface LinkPickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Section anchor options, e.g. [{ value: "#hero-1", label: "Home: Hero" }] */
  sectionOptions?: LinkOption[];
  placeholder?: string;
  className?: string;
}

const CUSTOM_SENTINEL = "__custom__";

/** Dedupe options by value, first occurrence wins. */
function dedupe(options: LinkOption[]): LinkOption[] {
  const seen = new Set<string>();
  const out: LinkOption[] = [];
  for (const o of options) {
    if (!o.value || seen.has(o.value)) continue;
    seen.add(o.value);
    out.push(o);
  }
  return out;
}

/**
 * LinkPicker — shared admin dropdown for selecting internal link targets.
 *
 * Groups every link target an admin might want (pages, section anchors, forms,
 * documents/PDFs, images, enabled features, policies) into a single grouped
 * <select>, plus a free-text "Custom URL" escape hatch. This means admins
 * never hand-type an `#anchor` or `/slug` — but any existing raw value still
 * round-trips: if the current `value` matches a known target it is
 * preselected, otherwise it shows as Custom with the raw text editable.
 *
 * Option data comes from a single server-side call to GET /api/link-catalog
 * (see that route for the full source list and auth posture) rather than this
 * component issuing its own parallel fetches per source. That endpoint is the
 * ONE shared catalog other non-React pickers (public/flexible-designer.html's
 * loadNavOptions()) also read from — keeping them from drifting apart the way
 * this component's pages/sections/forms/documents/features/policies groups
 * previously would have if hand-copied elsewhere.
 *
 * The catalog fetch uses fetchWithRefresh (lib/fetch-with-refresh.ts), so an
 * expired-but-refreshable 8h admin session transparently refreshes and
 * retries once instead of failing the whole picker. Degrades gracefully to
 * an empty option list only when that retry also fails (no session, or the
 * endpoint is genuinely offline) — the picker still renders and stays usable
 * via the Custom URL fallback. The route itself also degrades per-group (see
 * app/api/link-catalog/route.ts), so one bad data source there doesn't blank
 * out every group either.
 *
 * Public props are unchanged and drop-in compatible with prior versions.
 */
export function LinkPicker({
  value,
  onChange,
  sectionOptions = [],
  placeholder = "e.g., /contact or https://example.com",
  className = "",
}: LinkPickerProps) {
  const [catalogGroups, setCatalogGroups] = useState<LinkGroup[]>([]);
  // Tracks an explicit pick of the "Custom URL / anchor…" sentinel so the
  // free-text input stays shown while the user is typing a custom value from
  // scratch (empty or a known option) — see isCustom below for why the
  // value-based check alone isn't enough here.
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    // fetchWithRefresh (not plain fetch): an expired-but-refreshable 8h admin
    // session would otherwise 401 this call and silently collapse the picker
    // to just Home/Custom — see lib/fetch-with-refresh.ts and
    // components/admin/TokenRefresher.tsx for the same underlying issue.
    fetchWithRefresh("/api/link-catalog")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const groups: Array<{ key: string; label: string; options: LinkOption[] }> =
          json?.data?.groups ?? [];
        setCatalogGroups(groups.map((g) => ({ label: g.label, options: g.options })));
      })
      .catch(() => {});
  }, []);

  // Sections: parent-supplied options first, then catalog anchors (merged into the
  // "Sections" group returned by the API, if present).
  const groups: LinkGroup[] = catalogGroups
    .map((g) =>
      g.label === "Sections"
        ? { ...g, options: dedupe([...sectionOptions, ...g.options]) }
        : g
    )
    .filter((g) => g.options.length > 0);

  // If the catalog hasn't loaded a Sections group yet (or none exists) but the
  // parent passed sectionOptions directly, still show them.
  if (!groups.some((g) => g.label === "Sections") && sectionOptions.length > 0) {
    groups.unshift({ label: "Sections", options: dedupe(sectionOptions) });
  }

  // Flat set of every known target value, used to detect custom values.
  const knownValues = new Set<string>([
    "/",
    ...groups.flatMap((g) => g.options.map((o) => o.value)),
  ]);

  // customMode covers the "user just picked the sentinel, value is still
  // empty/known" gap; the value-based check covers round-tripping an
  // already-custom value on mount without requiring a re-pick.
  const isCustom = customMode || (value !== "" && !knownValues.has(value));

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === CUSTOM_SENTINEL) {
      setCustomMode(true);
      // Switch into custom mode without clobbering an existing custom value.
      if (!isCustom) onChange("");
      return;
    }
    setCustomMode(false);
    onChange(selected);
  };

  const selectValue = isCustom ? CUSTOM_SENTINEL : value || "";

  return (
    <div className={className}>
      <select
        className="form-select"
        value={selectValue}
        onChange={handleSelectChange}
      >
        <option value="">Select a link…</option>
        <option value="/">Home</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={`${group.label}:${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_SENTINEL}>Custom URL / anchor…</option>
      </select>
      {isCustom && (
        <input
          type="text"
          className="form-control mt-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </div>
  );
}
