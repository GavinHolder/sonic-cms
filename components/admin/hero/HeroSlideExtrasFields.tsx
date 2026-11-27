"use client";

import type { HeroCarouselSlide } from "@/types/section";
import { resolveSlideTone, resolveTabLabel } from "@/lib/hero/hero-slide-extras";

interface HeroSlideExtrasFieldsProps {
  slide: HeroCarouselSlide;
  /** 1-based slide number (for the tab label placeholder). */
  slideNumber: number;
  onChange: (updates: Partial<HeroCarouselSlide>) => void;
}

/**
 * Per-slide "light slide" switch and tab label. Both keys are removed (not stored as
 * false / "") when cleared, so an untouched slide keeps exactly the keys it had.
 */
export default function HeroSlideExtrasFields({ slide, slideNumber, onChange }: HeroSlideExtrasFieldsProps) {
  const isLight = resolveSlideTone(slide) === "light";
  const toneId = `${slide.id}-tone-light`;
  const labelId = `${slide.id}-tab-label`;
  const fallbackLabel = resolveTabLabel({ name: slide.name }, slideNumber - 1);

  return (
    <div className="row g-3 mb-4">
      <div className="col-md-7">
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id={toneId}
            checked={isLight}
            onChange={(e) => onChange({ tone: e.target.checked ? "light" : undefined })}
          />
          <label className="form-check-label fw-semibold" htmlFor={toneId}>
            Light slide — use dark navbar and controls
          </label>
        </div>
        <small className="text-muted d-block">
          Turn on when this slide&apos;s background is light. While it shows, the menu over the hero and the
          slide controls switch from white to dark so they stay readable. Text colours are still set per element.
        </small>
      </div>
      <div className="col-md-5">
        <label htmlFor={labelId} className="form-label fw-semibold">Tab label</label>
        <input
          id={labelId}
          type="text"
          className="form-control"
          maxLength={24}
          placeholder={fallbackLabel}
          value={typeof slide.tabLabel === "string" ? slide.tabLabel : ""}
          onChange={(e) => onChange({ tabLabel: e.target.value || undefined })}
        />
        <small className="text-muted d-block">
          Shown on this slide&apos;s tab when <strong>Show slide tabs</strong> is on. Empty uses &ldquo;{fallbackLabel}&rdquo;.
        </small>
      </div>
    </div>
  );
}
