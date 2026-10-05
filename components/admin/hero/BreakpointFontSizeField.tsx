"use client";

import { useState } from "react";
import type { HeroEditBreakpoint } from "@/lib/hero/hero-device-fit";
import {
  autoFontSizePx,
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  type FreeformFontKind,
} from "@/lib/hero/hero-font-size";

/** The fields this control can write; the parent merges it into the heading row / heading / subheading / button. */
export interface FontSizePatch {
  fontSize?: number;
  fontSizeTablet?: number;
  fontSizeMobile?: number;
}

interface BreakpointFontSizeFieldProps {
  kind: FreeformFontKind;
  /** Breakpoint being edited. SlideEditor passes "desktop" whenever Freeform Layout is off (the preset layout has no per-breakpoint size). */
  breakpoint: HeroEditBreakpoint;
  /** Authored desktop size. */
  size: number | undefined;
  sizeTablet?: number;
  sizeMobile?: number;
  /** What Desktop shows (and the renderer uses) when `size` is undefined — buttons default to 18. */
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
 * toggle. Desktop edits `fontSize`; Tablet/Mobile edit `fontSizeTablet`/`fontSizeMobile` and show an "Auto"
 * placeholder (what that breakpoint renders at its reference device when no override exists) plus a reset (x)
 * that clears the override. The render rules live in lib/hero/hero-font-size.ts.
 *
 * ASSUMPTIONS: `onPatch` merges (never replaces) the patch into the owning object.
 * FAILURE MODES / VALIDATION: the typed text is kept as a local draft and only a finite number inside
 * [FONT_SIZE_MIN_PX, FONT_SIZE_MAX_PX] is committed while typing, so a half-typed or cleared field can never
 * write NaN (a prior bug) nor a stray tiny size. Blur clamps a finite value into range; an empty field on
 * blur clears a Tablet/Mobile override, and on Desktop (a required value) reverts to the committed size.
 */
export default function BreakpointFontSizeField({
  kind,
  breakpoint,
  size,
  sizeTablet,
  sizeMobile,
  desktopDefault,
  label,
  small = false,
  labelClassName,
  onPatch,
}: BreakpointFontSizeFieldProps) {
  const isDesktop = breakpoint === "desktop";
  const own = breakpoint === "tablet" ? sizeTablet : breakpoint === "mobile" ? sizeMobile : size ?? desktopDefault;
  const hasOwn = typeof own === "number" && Number.isFinite(own);

  // While the field has focus it shows the local `draft` (what is being typed, possibly not yet valid); otherwise it
  // always shows the committed value, so a breakpoint toggle, reset or undo is reflected with no sync effect, and
  // blur normalises e.g. "056" or an out-of-range draft back to the stored value.
  const committedText = hasOwn ? String(own) : "";
  const [draft, setDraft] = useState<string>(committedText);
  const [focused, setFocused] = useState(false);

  const commit = (value: number | undefined) => {
    if (breakpoint === "tablet") onPatch({ fontSizeTablet: value });
    else if (breakpoint === "mobile") onPatch({ fontSizeMobile: value });
    else if (value !== undefined) onPatch({ fontSize: value }); // Desktop is required: never cleared
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n) && n >= FONT_SIZE_MIN_PX && n <= FONT_SIZE_MAX_PX) {
      commit(Math.round(n));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) {
      if (!isDesktop && hasOwn) commit(undefined); // emptied an override -> back to Auto
      return;
    }
    const clamped = Math.min(FONT_SIZE_MAX_PX, Math.max(FONT_SIZE_MIN_PX, Math.round(n)));
    if (clamped !== own) commit(clamped);
  };

  const auto = isDesktop ? undefined : autoFontSizePx(kind, breakpoint, size ?? desktopDefault);
  const bpName = breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1);

  return (
    <>
      <label className={labelClassName ?? (small ? "form-label form-label-sm mb-1" : "form-label fw-semibold")}>
        {label}
        {!isDesktop && ` — ${bpName}`}
      </label>
      <div className={`input-group${small ? " input-group-sm" : ""}`}>
        <input
          type="number"
          className="form-control"
          value={focused ? draft : committedText}
          min={FONT_SIZE_MIN_PX}
          max={FONT_SIZE_MAX_PX}
          placeholder={isDesktop ? undefined : `Auto${auto !== undefined ? ` (${Math.round(auto)})` : ""}`}
          onFocus={() => {
            setDraft(committedText);
            setFocused(true);
          }}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
        />
        {!isDesktop && hasOwn && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            title={`Clear the ${breakpoint} size — back to Auto`}
            aria-label={`Clear the ${breakpoint} size`}
            // Keep the input from blurring first (its blur would otherwise race the click).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setDraft(""); // the input keeps focus (mousedown is prevented), so it is showing `draft` — clear that text too
              commit(undefined);
            }}
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>
    </>
  );
}
