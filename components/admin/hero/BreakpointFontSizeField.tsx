"use client";

import { useState } from "react";
import type { HeroEditBreakpoint } from "@/lib/hero/hero-device-fit";
import {
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  fontSizeEditPatch,
  fontSizeResetPatch,
  isUsableFontSize,
  legacyFontSizePx,
  referenceViewportW,
  roundPx,
  type FontSizePatch,
  type FreeformFontKind,
} from "@/lib/hero/hero-font-size";

export type { FontSizePatch };

interface BreakpointFontSizeFieldProps {
  kind: FreeformFontKind;
  /** Breakpoint being edited. SlideEditor passes "desktop" whenever Freeform Layout is off (the preset layout has no per-breakpoint size). */
  breakpoint: HeroEditBreakpoint;
  /** Authored desktop size. */
  size: number | undefined;
  sizeTablet?: number;
  sizeMobile?: number;
  /** The element's `fontSizeIndependent` flag. Absent/false = LEGACY element (old rendering, shared size). */
  independent?: boolean;
  /** What Desktop shows (and the renderer uses) when `size` is undefined - buttons default to 18. */
  desktopDefault?: number;
  label: string;
  /** Compact variant (form-control-sm), used inside the heading-row and button cards. */
  small?: boolean;
  /** Override the label's class (defaults: "form-label form-label-sm mb-1" when `small`, else "form-label fw-semibold"). */
  labelClassName?: string;
  onPatch: (patch: FontSizePatch) => void;
}

/**
 * One Size (px) / Font Size (px) control that follows the editor's "Position for: Desktop | Tablet | Mobile"
 * toggle. The render rules live in lib/hero/hero-font-size.ts; the model is "legacy until first edit, then
 * materialize and isolate":
 *  - LEGACY element (no `fontSizeIndependent` flag): renders exactly as it always did. Desktop shows its single
 *    size; Tablet/Mobile show a grey "Auto (N)" placeholder (what the legacy rule renders at that device) and
 *    a "legacy" note. The FIRST edit of ANY breakpoint's field calls `materializeFontSizes` (snapshot of what
 *    the element renders at 1920 / 768 / 375 + the flag) in the SAME single patch as the typed value, so
 *    touching one breakpoint never changes how another looks.
 *  - FLAGGED element: Desktop/Tablet/Mobile are three independent numbers; editing one writes ONLY its field.
 *    The reset (x) on Tablet/Mobile re-snapshots the legacy-equivalent px from the CURRENT Desktop number
 *    (a copied value, not a live link).
 *
 * ASSUMPTIONS: `onPatch` merges (never replaces) the patch into the owning object, immutably.
 * FAILURE MODES / VALIDATION: the typed text is kept as a local draft and only a finite number inside
 * [FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX] is committed while typing, so a half-typed or cleared field can never
 * write NaN (a prior bug) nor a stray tiny size. Focus + blur without typing commits nothing (so merely
 * clicking into a legacy field never materializes it). Blur clamps a finite value into range; an emptied
 * flagged Tablet/Mobile field resets to its snapshot; an emptied Desktop (required) field reverts.
 */
export default function BreakpointFontSizeField({
  kind,
  breakpoint,
  size,
  sizeTablet,
  sizeMobile,
  independent,
  desktopDefault,
  label,
  small = false,
  labelClassName,
  onPatch,
}: BreakpointFontSizeFieldProps) {
  const isDesktop = breakpoint === "desktop";
  const flagged = independent === true;
  const desktopSize = size ?? desktopDefault;
  const stored = breakpoint === "tablet" ? sizeTablet : breakpoint === "mobile" ? sizeMobile : desktopSize;
  // Legacy elements ignore stray Tablet/Mobile values (the renderer does), so the field shows them as unset.
  const hasValue = isUsableFontSize(stored) && (isDesktop || flagged);
  const committedText = hasValue ? String(stored) : "";

  // While the field has focus it shows the local `draft` (what is being typed, possibly not yet valid); otherwise it
  // always shows the committed value, so a breakpoint toggle, reset or undo is reflected with no sync effect, and
  // blur normalises e.g. "056" or an out-of-range draft back to the stored value.
  const [draft, setDraft] = useState<string>(committedText);
  const [focused, setFocused] = useState(false);

  const target = { size: desktopSize, independent: flagged };
  // First edit of a legacy element materializes it (snapshot of all three breakpoints + flag) in the SAME patch.
  const patchFor = (value: number): FontSizePatch => fontSizeEditPatch(kind, breakpoint, target, value);
  // Tablet/Mobile reset of a flagged element: the legacy-equivalent of the CURRENT Desktop number (a copy).
  const resetPatch = (): FontSizePatch | undefined => fontSizeResetPatch(kind, breakpoint, target);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n) && n >= FONT_SIZE_MIN_PX && n <= FONT_SIZE_MAX_PX) {
      onPatch(patchFor(roundPx(n)));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (draft === committedText) return; // focus + blur only: nothing was typed, so nothing to commit
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) {
      const reset = hasValue ? resetPatch() : undefined; // emptied a flagged Tablet/Mobile field -> back to its snapshot
      if (reset) onPatch(reset);
      return;
    }
    const clamped = Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, roundPx(n)));
    if (clamped !== stored) onPatch(patchFor(clamped));
  };

  const legacyPx = isDesktop || !flagged || !hasValue ? legacyFontSizePx(kind, breakpoint, desktopSize) : undefined;
  const bpName = breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1);
  const showReset = !isDesktop && flagged && hasValue;
  const showAuto = !isDesktop && !hasValue;
  const fmt = (n: number) => String(roundPx(n));

  return (
    <>
      <label className={labelClassName ?? (small ? "form-label form-label-sm mb-1" : "form-label fw-semibold")}>
        {label}
        {!isDesktop && ` — ${bpName}`}
      </label>
      <div className={`input-group${small ? " input-group-sm" : ""}`}>
        <input
          type="number"
          step="any"
          className="form-control"
          value={focused ? draft : committedText}
          min={FONT_SIZE_MIN_PX}
          max={FONT_SIZE_MAX_PX}
          placeholder={showAuto ? `Auto${legacyPx !== undefined ? ` (${fmt(legacyPx)})` : ""}` : undefined}
          onFocus={() => {
            setDraft(committedText);
            setFocused(true);
          }}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
        />
        {showReset && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            title={`Reset the ${breakpoint} size to match the current Desktop size (a copied value, not a link)`}
            aria-label={`Reset the ${breakpoint} size`}
            // Keep the input from blurring first (its blur would otherwise race the click).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const reset = resetPatch();
              if (!reset) return;
              // the input keeps focus (mousedown is prevented), so it is showing `draft`
              setDraft(String(reset.fontSizeTablet ?? reset.fontSizeMobile ?? ""));
              onPatch(reset);
            }}
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>
      {!flagged && (
        <div className="form-text mt-1" style={{ fontSize: 10, lineHeight: 1.25 }}>
          Legacy{legacyPx !== undefined ? ` — renders ${fmt(legacyPx)}px at ${referenceViewportW(breakpoint)}px` : ""}. Editing switches this element to per-breakpoint sizes.
        </div>
      )}
    </>
  );
}
