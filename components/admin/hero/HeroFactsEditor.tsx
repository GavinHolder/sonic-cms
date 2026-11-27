"use client";

import type { AnimationType, HeroCarouselSlide, HeroFact } from "@/types/section";
import { HERO_FACTS_MAX, editableHeroFacts } from "@/lib/hero/hero-slide-extras";

type Overlay = NonNullable<HeroCarouselSlide["overlay"]>;

interface HeroFactsEditorProps {
  /** Unique prefix for input ids (the slide id). */
  idPrefix: string;
  overlay: HeroCarouselSlide["overlay"];
  /** SlideEditor's own updateOverlay — merges into the slide's overlay. */
  onChange: (updates: Partial<Overlay>) => void;
}

/**
 * Add / edit / remove the slide's facts row (overlay.facts, max HERO_FACTS_MAX).
 * Removing the last row deletes the key, so a slide with no facts stores nothing.
 */
export default function HeroFactsEditor({ idPrefix, overlay, onChange }: HeroFactsEditorProps) {
  const facts = editableHeroFacts(overlay?.facts);
  const isFreeform = overlay?.layoutMode === "freeform";
  const atMax = facts.length >= HERO_FACTS_MAX;

  const setFacts = (next: HeroFact[]) => onChange({ facts: next.length > 0 ? next : undefined });
  const updateFact = (index: number, updates: Partial<HeroFact>) =>
    setFacts(facts.map((f, i) => (i === index ? { ...f, ...updates } : f)));

  return (
    <div className="mt-4">
      <hr />
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Facts row</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          disabled={atMax}
          onClick={() => setFacts([...facts, { title: "", text: "" }])}
        >
          <i className="bi bi-plus-lg me-1"></i>
          Add fact
        </button>
      </div>
      <small className="text-muted d-block mb-3">
        Up to {HERO_FACTS_MAX} short facts shown under the buttons: a bold title over a line of smaller text.
        Colours follow the heading and subheading. Hidden on phones and small tablets.
        {atMax && <> You have the maximum of {HERO_FACTS_MAX}.</>}
      </small>
      {isFreeform && (
        <div className="alert alert-warning py-2 small" role="status">
          Facts are not shown while <strong>Freeform Layout</strong> is on. Turn it off to show them.
        </div>
      )}

      {facts.map((fact, index) => (
        <div key={index} className="card mb-2">
          <div className="card-body py-2">
            <div className="row g-2 align-items-end">
              <div className="col-md-5">
                <label htmlFor={`${idPrefix}-fact-title-${index}`} className="form-label form-label-sm mb-1">
                  Fact {index + 1} title
                </label>
                <input
                  id={`${idPrefix}-fact-title-${index}`}
                  type="text"
                  className="form-control form-control-sm"
                  maxLength={60}
                  value={fact.title}
                  onChange={(e) => updateFact(index, { title: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor={`${idPrefix}-fact-text-${index}`} className="form-label form-label-sm mb-1">
                  Text
                </label>
                <input
                  id={`${idPrefix}-fact-text-${index}`}
                  type="text"
                  className="form-control form-control-sm"
                  maxLength={80}
                  value={fact.text}
                  onChange={(e) => updateFact(index, { text: e.target.value })}
                />
              </div>
              <div className="col-md-1 text-end">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label={`Remove fact ${index + 1}`}
                  onClick={() => setFacts(facts.filter((_, i) => i !== index))}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {facts.length > 0 && (
        <div className="d-flex align-items-end gap-2 flex-wrap mt-2">
          <div style={{ minWidth: 130 }}>
            <label htmlFor={`${idPrefix}-facts-anim`} className="form-label form-label-sm mb-1">Animation</label>
            <select
              id={`${idPrefix}-facts-anim`}
              className="form-select form-select-sm"
              value={overlay?.factsAnimation ?? "fade"}
              onChange={(e) => onChange({ factsAnimation: e.target.value as AnimationType })}
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slideUp">Slide Up</option>
              <option value="slideDown">Slide Down</option>
              <option value="slideLeft">Slide Left</option>
              <option value="slideRight">Slide Right</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>
          <div style={{ minWidth: 110 }}>
            <label htmlFor={`${idPrefix}-facts-dur`} className="form-label form-label-sm mb-1">Duration (ms)</label>
            <input
              id={`${idPrefix}-facts-dur`}
              type="number"
              min={0}
              max={5000}
              step={50}
              className="form-control form-control-sm"
              value={overlay?.factsAnimationDuration ?? 800}
              onChange={(e) => onChange({ factsAnimationDuration: Math.max(0, Math.min(5000, Number(e.target.value) || 0)) })}
            />
          </div>
          <div style={{ minWidth: 110 }}>
            <label htmlFor={`${idPrefix}-facts-delay`} className="form-label form-label-sm mb-1">Delay (ms)</label>
            <input
              id={`${idPrefix}-facts-delay`}
              type="number"
              min={0}
              max={5000}
              step={50}
              className="form-control form-control-sm"
              value={overlay?.factsAnimationDelay ?? 0}
              onChange={(e) => onChange({ factsAnimationDelay: Math.max(0, Math.min(5000, Number(e.target.value) || 0)) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
