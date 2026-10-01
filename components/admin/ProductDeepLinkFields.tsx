"use client";

import { useEffect, useRef, useState } from "react";
import {
  groupProductPackages,
  resolveDeepLinkSelection,
  composeProductLinkValue,
  type ProductScope,
  type DeepLinkLevel1,
  type DeepLinkPackage,
} from "@/lib/product-deep-link";

interface ProductDeepLinkFieldsProps {
  /** The selected Sections option's binding — which live packages to group
   * into Category/Sub-type choices. Exactly one of productTypeSlugs/
   * networkSlug is ever set (see lib/product-deep-link.ts). */
  scope: ProductScope;
  /** The plain `{pagePath}#{sectionId}` value of the currently-selected
   * Sections option — the base onto which a chosen slug is composed. */
  baseValue: string;
  /** The `?product=<slug>` already present in the picker's current value
   * (round-tripping an existing deep link), or null for a fresh pick. */
  initialProduct: string | null;
  onChange: (value: string) => void;
}

/**
 * Cascading Category (Level 1) / Sub-type (Level 2) pickers shown by
 * LinkPicker underneath its Sections dropdown when the selected section
 * contains a live product-bound `type: "template"` block (see
 * app/api/link-catalog/route.ts's productScope annotation). Fetches exactly
 * the package scope the bound template itself would fetch
 * (components/sections/blocks/TemplateBlock.tsx's own productTypeSlugs/
 * networkSlug fetch), so a category/sub-type offered here can never disagree
 * with what the template will actually render.
 *
 * ASSUMPTIONS:
 * 1. `scope` identifies a FIXED binding for as long as this component stays
 *    mounted for the same section — a different section selection remounts
 *    the parent's conditional render (LinkPicker only renders this component
 *    at all when `scope` is non-null), and a same-section re-render with a
 *    stable scope doesn't need to refetch (see the scopeKey effect key).
 * 2. Sub-type (Level 2) is only meaningful, and only shown, when the chosen
 *    category actually has more than one sub-type — a single-option select
 *    would just be a confusing, meaningless extra click.
 *
 * FAILURE MODES:
 * - The scoped /api/packages fetch fails or returns no packages → renders a
 *   "no active packages" notice instead of empty/broken selects, matching
 *   the bound template's own boot() empty-state message.
 * - A slower-than-expected fetch resolving after the admin already switched
 *   to a different section (and therefore a different scope) → ignored via
 *   requestKeyRef, never clobbers a newer selection with a stale one.
 */
export default function ProductDeepLinkFields({
  scope,
  baseValue,
  initialProduct,
  onChange,
}: ProductDeepLinkFieldsProps) {
  const [groups, setGroups] = useState<DeepLinkLevel1[]>([]);
  const [loading, setLoading] = useState(true);
  const [topKey, setTopKey] = useState<string | null>(null);
  const [typeKey, setTypeKey] = useState<string | null>(null);
  const requestKeyRef = useRef(0);

  const scopeKey = scope.productTypeSlugs?.length
    ? `pt:${[...scope.productTypeSlugs].sort().join(",")}`
    : scope.networkSlug
      ? `net:${scope.networkSlug}`
      : "";

  useEffect(() => {
    const myRequest = ++requestKeyRef.current;
    setLoading(true);

    const fetchPackages: Promise<DeepLinkPackage[]> = scope.productTypeSlugs?.length
      ? Promise.all(
          scope.productTypeSlugs.map((slug) =>
            fetch(`/api/packages?productType=${encodeURIComponent(slug)}`)
              .then((r) => (r.ok ? r.json() : { packages: [] }))
              .then((d) => (Array.isArray(d?.packages) ? (d.packages as DeepLinkPackage[]) : []))
              .catch(() => [] as DeepLinkPackage[])
          )
        ).then((results) => results.flat())
      : scope.networkSlug
        ? fetch(`/api/packages?network=${encodeURIComponent(scope.networkSlug)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d && Array.isArray(d.packages) ? (d.packages as DeepLinkPackage[]) : []))
            .catch(() => [] as DeepLinkPackage[])
        : Promise.resolve([]);

    fetchPackages.then((packages) => {
      if (requestKeyRef.current !== myRequest) return; // stale response — a newer scope won the race
      const grouped = groupProductPackages(packages);
      setGroups(grouped);
      // No `grouped[0]` fallback here: pre-selecting a category the admin
      // never actually chose would show a Category value on screen that
      // doesn't match the real stored link (still the bare section anchor,
      // no `?product=`, until a select's onChange actually fires) — leave
      // the placeholder shown until there's a real initialProduct to
      // round-trip or the admin makes an explicit pick.
      const resolved = resolveDeepLinkSelection(grouped, initialProduct);
      setTopKey(resolved.top);
      setTypeKey(resolved.type);
      setLoading(false);
    });
    // initialProduct intentionally excluded: it only seeds the FIRST resolution for this
    // scope (round-tripping an existing value) — re-running on every keystroke elsewhere
    // isn't the goal here, and this effect already re-runs whenever scope itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const activeGroup = groups.find((g) => g.key === topKey) || null;
  const showSubType = !!activeGroup && activeGroup.subTypes.length > 1;

  const handleTopChange = (key: string) => {
    const nextTop = key || null;
    setTopKey(nextTop);
    setTypeKey(null);
    onChange(composeProductLinkValue(baseValue, nextTop));
  };

  const handleTypeChange = (key: string) => {
    const nextType = key || null;
    setTypeKey(nextType);
    onChange(composeProductLinkValue(baseValue, nextType || topKey));
  };

  if (loading) {
    return <div className="form-text mt-1">Loading product categories…</div>;
  }
  if (groups.length === 0) {
    return (
      <div className="form-text mt-1 text-warning">
        No active packages found for this section&apos;s binding.
      </div>
    );
  }

  return (
    <div className="mt-2 ps-2 border-start">
      <label className="form-label small mb-1">Category</label>
      <select
        className="form-select form-select-sm mb-2"
        value={topKey || ""}
        onChange={(e) => handleTopChange(e.target.value)}
      >
        <option value="">Select a category…</option>
        {groups.map((g) => (
          <option key={g.key} value={g.key}>
            {g.name}
          </option>
        ))}
      </select>
      {showSubType && (
        <>
          <label className="form-label small mb-1">Sub-type</label>
          <select
            className="form-select form-select-sm"
            value={typeKey || ""}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="">Whole category (no specific sub-type)</option>
            {activeGroup!.subTypes.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
