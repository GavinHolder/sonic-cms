"use client";

import { useId, useState } from "react";
import type { HeroEditBreakpoint } from "@/lib/hero/hero-device-fit";
import {
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  fontSizeEditPatch,
  fontSizeResetPatch,
  isUsableFontSize,
  legacyFontSizePx,
  parseFontSizeInput,
  referenceViewportW,
  roundPx,
  type FontSizePatch,
  type FreeformFontKind,
} from "@/lib/hero/hero-font-size";

export type { FontSizePatch };

interface BreakpointFontSizeFieldProps {
  kind: FreeformFontKind;
  /** Breakpoint being edited (the "Position for" toggle). Ignored in `presetMode`. */
  breakpoint: HeroEditBreakpoint;
  /** The legacy base `fontSize` (what the preset layout uses; never written by a freeform edit). */
  size: number | undefined;
  /** The element's OWN per-breakpoint sizes. */
  sizeDesktop?: number;
  sizeTablet?: number;
  sizeMobile?: number;
  /** What the legacy base is when `size` is undefined - buttons default to 18. */
  desktopDefault?: number;
  /** Freeform Layout is OFF: the control edits ONLY the legacy `fontSize`, exactly as before this feature
   *  (no per-breakpoint fields written, no freeform "Legacy" note, no reset). */
  presetMode?: boolean;
  label: string;
  /** Compact variant (form-control-sm), used inside the heading-row and button cards. */
  small?: boolean;
  /** Override the label's class (defaults: "form-label form-label-sm mb-1" when `small`, else "form-label fw-semibold"). */
  labelClassName?: string;
  onPatch: (patch: FontSizePatch) => void;
}

/**
 * One Size (px) / Font Size (px) control that follows the editor's "Position for: Desktop | Tablet | Mobile"
 * toggle while Freeform Layout is on. The render rules live in lib/hero/hero-font-size.ts; the model is
 * per-breakpoint OWN fields over a frozen legacy base:
 *  - Desktop shows `fontSizeDesktop`, Tablet `fontSizeTablet`, Mobile `fontSizeMobile`. A breakpoint with no
 *    own value shows a grey placeholder (Desktop: the legacy `fontSize`; Tablet/Mobile: "Auto (N)" = the legacy
 *    size at that device) and a "Legacy - renders N px" note, and keeps rendering exactly as it always did.
 *  - Typing writes ONLY that breakpoint's own field; `fontSize` and the other two breakpoints are never touched,
 *    so they cannot change at any viewport width. Reset (x) deletes the own field (back to legacy).
 *  - Freeform OFF (`presetMode`): edits only `fontSize`, as before.
 *
 * ASSUMPTIONS: `onPatch` merges (never replaces) the patch into the owning object, immutably.
 * FAILURE MODES / VALIDATION: the typed text is kept as a local draft and committed only when `parseFontSizeInput`
 * (strict) accepts it, so a half-typed or cleared field can never write NaN (a prior bug) nor a stray tiny
 * size. Focus + blur without typing commits nothing. Blur clamps a finite value into [8, 400]; an emptied own
 * field is reset to legacy; an emptied required field (preset mode) reverts. The mouse wheel blurs the field so a
 * scroll over a focused number input can never silently change (and commit) its value.
 */
export default function BreakpointFontSizeField({
  kind,
  breakpoint,
  size,
  sizeDesktop,
  sizeTablet,
  sizeMobile,
  desktopDefault,
  presetMode = false,
  label,
  small = false,
  labelClassName,
  onPatch,
}: BreakpointFontSizeFieldProps) {
  const inputId = useId();
  const bp: HeroEditBreakpoint = presetMode ? "desktop" : breakpoint;
  const isDesktop = bp === "desktop";
  const legacySize = size ?? desktopDefault;
  const own = presetMode ? legacySize : bp === "tablet" ? sizeTablet : bp === "mobile" ? sizeMobile : sizeDesktop;
  // The preset layout's legacy `fontSize` is a required value that is shown as-is (no 1000 cap applies to it).
  const hasOwn = presetMode ? typeof own === "number" && Number.isFinite(own) && own > 0 : isUsableFontSize(own);
  const committedText = hasOwn ? String(own) : "";

  // While the field has focus it shows the local `draft` (what is being typed, possibly not yet valid); otherwise it
  // always shows the committed value, so a breakpoint toggle, reset or undo is reflected with no sync effect, and
  // blur normalises e.g. "056" or an out-of-range draft back to the stored value.
  const [draft, setDraft] = useState<string>(committedText);
  const [focused, setFocused] = useState(false);

  const commit = (value: number) => onPatch(presetMode ? { fontSize: value } : fontSizeEditPatch(bp, value));

  const handleChange = (raw: string) => {
    setDraft(raw);
    const value = parseFontSizeInput(raw, "strict");
    if (value !== undefined) commit(value);
  };

  const handleBlur = () => {
    setFocused(false);
    if (draft === committedText) return; // focus + blur only: nothing was typed, so nothing to commit
    const value = parseFontSizeInput(draft);
    if (value === undefined) {
      // Emptied / not a number: an own value goes back to legacy; the preset's required value just reverts.
      if (!presetMode && hasOwn) onPatch(fontSizeResetPatch(bp));
      return;
    }
    if (value !== own) commit(value);
  };

  const legacyPx = !presetMode && !hasOwn ? legacyFontSizePx(kind, bp, legacySize) : undefined;
  const bpName = bp.charAt(0).toUpperCase() + bp.slice(1);
  const showReset = !presetMode && hasOwn;
  const fmt = (n: number) => String(roundPx(n));
  // Grey placeholder = what the legacy rule actually RENDERS at the device (so a base of 400 shows 153.6 on Desktop).
  const placeholder = presetMode || hasOwn
    ? undefined
    : isDesktop
      ? (legacyPx !== undefined ? fmt(legacyPx) : undefined)
      : `Auto${legacyPx !== undefined ? ` (${fmt(legacyPx)})` : ""}`;

  return (
    <>
      <label htmlFor={inputId} className={labelClassName ?? (small ? "form-label form-label-sm mb-1" : "form-label fw-semibold")}>
        {label}
        {!presetMode && ` — ${bpName}`}
      </label>
      <div className={`input-group${small ? " input-group-sm" : ""}`}>
        <input
          id={inputId}
          type="number"
          step="any"
          className="form-control"
          value={focused ? draft : committedText}
          min={FONT_SIZE_MIN_PX}
          max={FONT_SIZE_MAX_PX}
          placeholder={placeholder}
          onFocus={() => {
            setDraft(committedText);
            setFocused(true);
          }}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onWheel={(e) => e.currentTarget.blur()}
        />
        {showReset && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            title={`Clear the ${bp} size - back to the legacy size`}
            aria-label={`Clear the ${bp} size`}
            // Keep the input from blurring first (its blur would otherwise race the click).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setDraft(""); // the input keeps focus (mousedown is prevented), so it is showing `draft`
              onPatch(fontSizeResetPatch(bp));
            }}
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>
      {!presetMode && !hasOwn && (
        <div className="form-text mt-1" style={{ fontSize: 10, lineHeight: 1.25 }}>
          Legacy{legacyPx !== undefined ? ` — renders ${fmt(legacyPx)}px at ${referenceViewportW(bp)}px` : ""}. Typing sets a {bp}-only size.
        </div>
      )}
    </>
  );
}
