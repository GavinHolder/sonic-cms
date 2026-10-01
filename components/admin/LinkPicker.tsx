"use client";

import { useState, useEffect } from "react";
import { fetchWithRefresh } from "@/lib/fetch-with-refresh";
import ProductDeepLinkFields from "@/components/admin/ProductDeepLinkFields";
import {
  parseProductLinkValue,
  sectionIdFromValue,
  resolveBareSectionIdMatch,
  type ProductScope,
} from "@/lib/product-deep-link";

interface LinkOption {
  value: string;
  label: string;
  /** Present only on a "Sections" option whose section carries a live
   * product-bound template block — see app/api/link-catalog/route.ts and
   * lib/product-deep-link.ts. Drives the cascading Category/Sub-type
   * pickers rendered below the main <select> (ProductDeepLinkFields). */
  productScope?: ProductScope;
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
 *
 * Product deep-links (2026-10): when the selected Sections option carries a
 * `productScope` (the catalog's structural detection of a live product-bound
 * `type: "template"` block — see app/api/link-catalog/route.ts), this
 * component additionally renders cascading Category/Sub-type pickers
 * (ProductDeepLinkFields) and composes the final value as
 * `{pagePath}?product=<slug>#{sectionId}` via lib/product-deep-link.ts's
 * compose/parse helpers — see that module's doc comment for the full format
 * rationale. The native <select>'s own value/options always use the PLAIN
 * `{pagePath}#{sectionId}` base (parsed back out of a composed `value` via
 * parseProductLinkValue), so a composed deep-link still round-trips to the
 * correct Sections selection instead of falling through to Custom URL mode.
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

  // A product deep-link value is `{base}?product=<slug>`, where `base` is the
  // plain Sections value (`{pagePath}#{sectionId}`) every <option> actually
  // carries. Parsing it back out here — rather than matching `value` as-is —
  // is what lets the <select> still show the right Sections option selected
  // (and ProductDeepLinkFields show the right pre-selected category) for an
  // already-composed deep-link value.
  const { base: baseValue, product: initialProduct } = parseProductLinkValue(value);

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

  // Sections: parent-supplied options (this picker's own page, bare `#id`
  // values — see the sectionOptions prop doc comment) take priority over the
  // catalog's cross-page equivalents for the SAME section, so an existing
  // same-page link value keeps resolving to the exact option it always has.
  // A parent-supplied option is enriched with the catalog's `productScope`
  // when the catalog has a matching entry for the same section id — this is
  // what lets a same-page product-bound section (the common case: a CTA
  // button linking to a Products section on its own page) get the cascading
  // Category/Sub-type pickers too, not just a cross-page one. Catalog entries
  // for every OTHER page's sections are added as-is (path-prefixed), giving
  // cross-page reach without duplicating this page's own entries twice under
  // two different value strings (bare `#id` AND `/path#id` for the same
  // section would otherwise both appear — see this feature's handoff notes).
  const parentSectionIds = new Set(
    sectionOptions.map((o) => sectionIdFromValue(o.value)).filter(Boolean)
  );

  const groups: LinkGroup[] = catalogGroups
    .map((g) => {
      if (g.label !== "Sections") return g;
      const catalogById = new Map<string, LinkOption>();
      for (const o of g.options) {
        const id = sectionIdFromValue(o.value);
        if (id) catalogById.set(id, o);
      }
      const enrichedParentOptions = sectionOptions.map((o) => {
        const match = catalogById.get(sectionIdFromValue(o.value));
        return match?.productScope ? { ...o, productScope: match.productScope } : o;
      });
      const otherPageOptions = g.options.filter(
        (o) => !parentSectionIds.has(sectionIdFromValue(o.value))
      );
      return { ...g, options: dedupe([...enrichedParentOptions, ...otherPageOptions]) };
    })
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

  // Fallback recognition for a pre-existing bare `#id` Sections value (the
  // only format that ever existed before cross-page Sections links) against
  // a catalog whose Sections options are now path-prefixed (`{pagePath}#id`
  // — see app/api/link-catalog/route.ts and
  // lib/product-deep-link.ts#resolveBareSectionIdMatch). Only needed here:
  // CTASectionEditor/FooterSectionEditor pass their own `sectionOptions`
  // (still bare `#id`, merged into `groups` above), so their bare values
  // already match `knownValues` directly — this fallback only rescues the
  // other 3 call sites (SlideEditor, SectionEditorModal,
  // FlexibleSectionEditorModal), which have no sectionOptions prop and rely
  // solely on the catalog. Display-only: never calls onChange on its own, so
  // the stored `value` is only ever rewritten by an explicit admin re-pick.
  const sectionsCatalogValues =
    groups.find((g) => g.label === "Sections")?.options.map((o) => o.value) ?? [];
  const fallbackSectionMatch = knownValues.has(baseValue)
    ? null
    : resolveBareSectionIdMatch(baseValue, sectionsCatalogValues);

  // customMode covers the "user just picked the sentinel, value is still
  // empty/known" gap; the value-based check covers round-tripping an
  // already-custom value on mount without requiring a re-pick. Checked
  // against baseValue (not the raw, possibly product-deep-link-composed
  // value) so a `{base}?product=<slug>` value still resolves to its
  // underlying Sections option instead of falling through to Custom mode.
  // fallbackSectionMatch additionally recognizes a bare `#id` value whose
  // catalog counterpart is now path-prefixed (see above).
  const isCustom =
    customMode || (baseValue !== "" && !knownValues.has(baseValue) && !fallbackSectionMatch);

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

  // The value actually used to drive the <select>'s selection and look up
  // selectedOption below: baseValue as-is when directly known, or the
  // matched catalog value when only recognized via the bare-id fallback —
  // never written back via onChange, purely so the <select> shows a real,
  // known option instead of falling back to the unselected placeholder.
  const resolvedValue = knownValues.has(baseValue) ? baseValue : fallbackSectionMatch || undefined;

  const selectValue = isCustom ? CUSTOM_SENTINEL : resolvedValue || "";

  // The currently-selected option's own metadata (if any) — drives whether
  // ProductDeepLinkFields renders below the main <select>.
  const selectedOption = !isCustom
    ? groups.flatMap((g) => g.options).find((o) => o.value === resolvedValue)
    : undefined;

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
      {!isCustom && selectedOption?.productScope && (
        <ProductDeepLinkFields
          scope={selectedOption.productScope}
          baseValue={baseValue}
          initialProduct={initialProduct}
          onChange={onChange}
        />
      )}
    </div>
  );
}
