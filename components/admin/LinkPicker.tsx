"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  classify,
  fetchCatalog,
  searchMedia,
  detectCurrentPage,
  selectValueFor,
  FALLBACK_CATALOG,
  SENTINELS,
  type MediaSearchData,
} from "../../public/link-destinations.js";
import type { LinkCatalog, LinkGroup, LinkItem } from "@/lib/link-destinations";

interface LinkOption {
  value: string;
  label: string;
}

interface LinkPickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Section anchor options, e.g. [{ value: "#hero-1", label: "Home: Hero" }]. Listed first; they win over a catalog item with the same value. */
  sectionOptions?: LinkOption[];
  placeholder?: string;
  className?: string;
  /** Slug ("/" = home) of the page being edited, so its sections use the bare "#id" form. Detected from the admin URL when omitted. */
  currentPage?: string | null;
}

type ForcedMode = "custom" | "tel" | "mailto" | "doc" | "img";

/**
 * LinkPicker — the shared admin dropdown for choosing where a button/link goes.
 *
 * ONE SYSTEM PER CONCERN: the destinations come from GET /api/link-destinations (lib/link-destinations.ts) and the
 * stored-value -> picker-state mapping is public/link-destinations.js `classify()` — the same module the Flexible
 * Designer's iframe uses. Everything that exists is offered: pages, sections, forms, plugin/feature routes (Coverage
 * Map …), every policy, galleries, content, plus documents/images from the media library through a searchable
 * typeahead (a media library is too big for a <select>), plus Custom URL / Phone / Email.
 *
 * A destination that exists but would not currently open on the live site (disabled page/plugin/policy) is listed
 * greyed-out and labelled, never dropped, so an already-saved link still shows as the selection.
 * Any stored value the catalog does not know is shown as Custom URL with the real text pre-filled — never as "empty".
 * The picker never persists a UI-only choice: picking "Custom URL…" etc. writes nothing until something is typed.
 *
 * Public props are unchanged and drop-in compatible with prior versions (`currentPage` is optional).
 */
export function LinkPicker({
  value,
  onChange,
  sectionOptions = [],
  placeholder = "e.g., /contact or https://example.com",
  className = "",
  currentPage,
}: LinkPickerProps) {
  const [catalog, setCatalog] = useState<LinkCatalog>(FALLBACK_CATALOG as LinkCatalog);
  const [forced, setForced] = useState<ForcedMode | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let alive = true;
    const page = currentPage !== undefined ? currentPage : detectCurrentPage();
    fetchCatalog({ currentPage: page }).then((c: LinkCatalog) => {
      if (alive) setCatalog(c);
    });
    return () => {
      alive = false;
    };
  }, [currentPage]);

  // Parent-supplied section options first; a catalog item with the same value is dropped so it is not listed twice.
  const sectionKey = JSON.stringify(sectionOptions);
  const merged = useMemo<LinkCatalog>(() => {
    if (!sectionOptions.length) return catalog;
    const taken = new Set(sectionOptions.map((o) => o.value));
    const seen = new Set<string>();
    const extra: LinkItem[] = [];
    for (const o of sectionOptions) {
      if (!o.value || seen.has(o.value)) continue;
      seen.add(o.value);
      extra.push({ group: "sections-parent", label: o.label, value: o.value });
    }
    const groups: LinkGroup[] = catalog.groups
      .map((g) => ({ ...g, items: g.items.filter((i) => !taken.has(i.value)) }))
      .filter((g) => g.items.length > 0 || g.id === "builtin");
    return { ...catalog, groups: [{ id: "sections-parent", label: "Sections", items: extra }, ...groups] };
    // sectionOptions is a fresh array every render; sectionKey is its stable content signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, sectionKey]);

  const state = useMemo(() => classify(value, merged), [value, merged]);

  // A UI-only choice (Custom / Phone / Email / library) is honoured only while the stored value is empty;
  // as soon as there is a value, the value decides what is shown.
  const uiMode: ForcedMode | null =
    state.mode === "none"
      ? forced
      : state.mode === "custom"
        ? "custom"
        : state.mode === "tel"
          ? "tel"
          : state.mode === "mailto"
            ? "mailto"
            : state.mode === "media"
              ? state.mediaType === "image"
                ? "img"
                : "doc"
              : null;

  const forcedSelectValue = (m: ForcedMode) =>
    m === "custom" ? SENTINELS.custom : m === "tel" ? SENTINELS.tel : m === "mailto" ? SENTINELS.mailto : m === "doc" ? SENTINELS.doc : SENTINELS.img;
  const selectValue = state.mode === "none" && forced ? forcedSelectValue(forced) : selectValueFor(state);

  const textMode = uiMode === "custom" || uiMode === "tel" || uiMode === "mailto";
  const inputValue = state.mode === "custom" || state.mode === "tel" || state.mode === "mailto" ? (state.text as string) : draft;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === SENTINELS.custom || v === SENTINELS.tel || v === SENTINELS.mailto) {
      const mode: ForcedMode = v === SENTINELS.tel ? "tel" : v === SENTINELS.mailto ? "mailto" : "custom";
      setForced(mode);
      setDraft(mode === "tel" ? "tel:" : mode === "mailto" ? "mailto:" : "");
      // Never persist the choice itself; the stored value stays empty until a destination is typed.
      if (value !== "") onChange("");
      return;
    }
    if (v === SENTINELS.doc || v === SENTINELS.img) {
      setForced(v === SENTINELS.img ? "img" : "doc");
      if (state.mode === "media") return; // keep the current file until another is picked
      if (value !== "") onChange("");
      return;
    }
    setForced(null);
    onChange(v);
  };

  return (
    <div className={className}>
      <select className="form-select" value={selectValue} onChange={handleSelectChange}>
        <option value="">Select a link…</option>
        {merged.groups.map((group) =>
          group.items.length === 0 ? null : (
            <optgroup key={group.id} label={group.label}>
              {group.items.map((it) => {
                const isCurrent = state.mode === "item" && state.item === it;
                return (
                  <option
                    key={`${group.id}:${it.value}`}
                    value={isCurrent ? (state.optionValue as string) : it.value}
                    disabled={!!it.disabled && !isCurrent}
                    title={it.hint}
                  >
                    {it.label}
                  </option>
                );
              })}
            </optgroup>
          ),
        )}
        <optgroup label="Media library">
          <option value={SENTINELS.doc}>Document (PDF) from library…</option>
          <option value={SENTINELS.img}>Image from library…</option>
        </optgroup>
        <optgroup label="Other">
          <option value={SENTINELS.custom}>Custom URL / anchor…</option>
          <option value={SENTINELS.tel}>Phone number…</option>
          <option value={SENTINELS.mailto}>Email address…</option>
        </optgroup>
      </select>

      {textMode && (
        <input
          type="text"
          className="form-control mt-1"
          value={inputValue}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={uiMode === "tel" ? "tel:+27821234567" : uiMode === "mailto" ? "mailto:name@example.com" : placeholder}
          autoFocus={state.mode === "none"}
        />
      )}

      {(uiMode === "doc" || uiMode === "img") && (
        <MediaTypeahead
          type={uiMode === "img" ? "image" : "document"}
          selected={state.mode === "media" ? value : ""}
          onPick={(url) => {
            setForced(null);
            onChange(url);
          }}
        />
      )}

      {state.mode === "item" && state.item?.disabled && (
        <div className="form-text text-warning">
          This destination exists but is currently switched off, so the link will not open on the live site.
        </div>
      )}
      {state.legacy && (
        <div className="form-text text-warning">This link was saved in an old format and does not point anywhere. Pick a destination.</div>
      )}
    </div>
  );
}

function fileLabel(url: string): string {
  try {
    return decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() || url);
  } catch {
    return url;
  }
}

/** Searchable, paginated media-library list (documents or images). Debounced; never loads the whole library. */
function MediaTypeahead({ type, selected, onPick }: { type: "document" | "image"; selected: string; onPick: (url: string) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaSearchData["items"]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    const t = setTimeout(
      () => {
        setLoading(true);
        setError(false);
        searchMedia({ type, q, page, perPage: 20 })
          .then((data: MediaSearchData) => {
            if (id !== reqId.current) return;
            setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
            setTotal(data.total);
            setLoading(false);
          })
          .catch(() => {
            if (id !== reqId.current) return;
            setError(true);
            setLoading(false);
          });
      },
      page === 1 ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [type, q, page]);

  return (
    <div className="mt-1">
      {selected && <div className="form-text mb-1">Selected: {fileLabel(selected)}</div>}
      <input
        type="search"
        className="form-control form-control-sm"
        placeholder={type === "image" ? "Search images…" : "Search documents…"}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      <div className="border rounded mt-1 bg-white" style={{ maxHeight: 200, overflowY: "auto" }}>
        {error && <div className="p-2 small text-danger">Could not load the media library.</div>}
        {!error && !loading && items.length === 0 && <div className="p-2 small text-muted">No matches.</div>}
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            className={`d-block w-100 text-start border-0 border-bottom bg-white px-2 py-1 small ${it.value === selected ? "fw-semibold" : ""}`}
            onClick={() => onPick(it.value)}
          >
            {it.label}
            <span className="d-block text-muted" style={{ fontSize: 10 }}>{it.hint}</span>
          </button>
        ))}
        {loading && <div className="p-2 small text-muted">Loading…</div>}
        {!loading && items.length < total && (
          <button type="button" className="d-block w-100 border-0 bg-light px-2 py-1 small" onClick={() => setPage((p) => p + 1)}>
            Load more ({total - items.length} more)
          </button>
        )}
      </div>
    </div>
  );
}
