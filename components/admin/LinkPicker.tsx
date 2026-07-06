"use client";

import { useState, useEffect } from "react";

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
 * documents/PDFs, feature pages, policies) into a single grouped <select>, plus
 * a free-text "Custom URL" escape hatch. This means admins never hand-type an
 * `#anchor` or `/slug` — but any existing raw value still round-trips: if the
 * current `value` matches a known target it is preselected, otherwise it shows
 * as Custom with the raw text editable.
 *
 * Option lists load client-side (useEffect + fetch). Every source degrades
 * gracefully to an empty group when its API is unavailable (non-admin session,
 * offline, or a disabled plugin) — the picker still renders and stays usable.
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
  const [pages, setPages] = useState<LinkOption[]>([]);
  const [sections, setSections] = useState<LinkOption[]>([]);
  const [forms, setForms] = useState<LinkOption[]>([]);
  const [documents, setDocuments] = useState<LinkOption[]>([]);
  const [features, setFeatures] = useState<LinkOption[]>([]);
  const [policies, setPolicies] = useState<LinkOption[]>([]);

  useEffect(() => {
    // ── Pages (+ Forms + PDF pages) ─────────────────────────────────────────
    // /api/pages returns every page; we split by type and only keep published,
    // enabled targets. Requires a VIEWER+ session cookie (admin context).
    fetch("/api/pages")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const list: Array<{
          slug: string;
          title: string;
          type: string;
          enabled: boolean;
          status: string;
        }> = json?.data?.pages ?? [];

        const enabled = list.filter(
          (p) => p.enabled && p.slug && p.slug !== "/"
        );
        // Regular content pages must be PUBLISHED to be linkable.
        const publishedEnabled = enabled.filter((p) => p.status === "PUBLISHED");

        setPages(
          publishedEnabled
            .filter((p) => !["form", "pdf"].includes(p.type))
            .map((p) => ({ value: `/${p.slug}`, label: p.title || p.slug }))
        );

        // Forms & PDFs don't go through the page "publish" flow — they're linkable as
        // soon as they're enabled, so a freshly-created form is selectable immediately
        // (before this the PUBLISHED filter hid EVERY form → empty Forms group). (#71)
        setForms(
          enabled
            .filter((p) => p.type === "form")
            .map((p) => ({ value: `/${p.slug}`, label: p.title || p.slug }))
        );

        // PDF-type pages are documents too — merge them with media documents.
        setDocuments((prev) =>
          dedupe([
            ...prev,
            ...enabled
              .filter((p) => p.type === "pdf")
              .map((p) => ({ value: `/${p.slug}`, label: p.title || p.slug })),
          ])
        );
      })
      .catch(() => {});

    // ── Section anchors on the home page ────────────────────────────────────
    // value = "#<sectionId>". Merged with any sectionOptions passed by parent.
    fetch("/api/sections?pageSlug=/")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.success || !Array.isArray(json.data)) return;
        setSections(
          json.data
            .filter(
              (s: { id?: string; enabled?: boolean }) => s.id && s.enabled !== false
            )
            .map(
              (s: {
                id: string;
                navLabel?: string | null;
                displayName?: string | null;
                type?: string;
              }) => ({
                value: `#${s.id}`,
                label: s.navLabel || s.displayName || s.type || s.id,
              })
            )
        );
      })
      .catch(() => {});

    // ── Documents / PDFs from the media library ─────────────────────────────
    // mimeType=document filters to application/pdf; capped by the API's perPage.
    fetch("/api/media?mimeType=document&perPage=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const media: Array<{ url: string; originalName?: string; filename?: string }> =
          json?.data?.media ?? [];
        if (!media.length) return;
        setDocuments((prev) =>
          dedupe([
            ...prev,
            ...media
              .filter((m) => m.url)
              .map((m) => ({ value: m.url, label: m.originalName || m.filename || m.url })),
          ])
        );
      })
      .catch(() => {});

    // ── Special feature pages ───────────────────────────────────────────────
    fetch("/api/features")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setFeatures(
            data.data
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((f: any) => f.enabled && f.slug)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((f: any) => ({ value: `/${f.slug}`, label: f.name || f.slug }))
          );
        }
      })
      .catch(() => {}); // Non-admin users or offline — silently skip

    // ── Policies (Policies plugin). Returns [] when plugin disabled. ─────────
    fetch("/api/policies?enabled=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setPolicies(
            data.map(
              (p: { slug: string; title: string; navLabel: string | null }) => ({
                value: `/policies/${p.slug}`,
                label: p.navLabel || p.title,
              })
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  // Sections: parent-supplied options first, then fetched anchors.
  const sectionGroup = dedupe([...sectionOptions, ...sections]);

  const groups: LinkGroup[] = [
    { label: "Pages", options: pages },
    { label: "Sections", options: sectionGroup },
    { label: "Forms", options: forms },
    { label: "Documents & PDFs", options: documents },
    { label: "Features", options: features },
    { label: "Policies", options: policies },
  ].filter((g) => g.options.length > 0);

  // Flat set of every known target value, used to detect custom values.
  const knownValues = new Set<string>([
    "/",
    ...groups.flatMap((g) => g.options.map((o) => o.value)),
  ]);

  const isCustom = value !== "" && !knownValues.has(value);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === CUSTOM_SENTINEL) {
      // Switch into custom mode without clobbering an existing custom value.
      if (!isCustom) onChange("");
      return;
    }
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
