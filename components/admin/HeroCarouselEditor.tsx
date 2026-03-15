"use client";

import { useState } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import type { HeroSection, HeroCarouselSlide } from "@/types/section";
import SlideEditor from "./SlideEditor";

interface HeroCarouselEditorProps {
  section: HeroSection;
  onSave: (updates: Partial<HeroSection>) => void;
  onCancel: () => void;
}

export default function HeroCarouselEditor({
  section,
  onSave,
  onCancel,
}: HeroCarouselEditorProps) {
  const [slides, setSlides] = useState<HeroCarouselSlide[]>(
    section.content.slides || []
  );
  const [displayName, setDisplayName] = useState(
    section.displayName || "Hero Section"
  );
  const [autoPlay, setAutoPlay] = useState(section.content.autoPlay ?? true);
  const [autoPlayInterval, setAutoPlayInterval] = useState(
    section.content.autoPlayInterval ?? 5000
  );
  const [showDots, setShowDots] = useState(section.content.showDots ?? true);
  const [showArrows, setShowArrows] = useState(section.content.showArrows ?? true);
  const [transitionDuration, setTransitionDuration] = useState(
    section.content.transitionDuration ?? 800
  );
  const [deleteConfirmSlideIndex, setDeleteConfirmSlideIndex] = useState<number | null>(null);
  const [showLastSlideError, setShowLastSlideError] = useState(false);
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set());

  const toggleSlide = (index: number) => {
    setExpandedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSlides(new Set(slides.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedSlides(new Set());
  };

  const addSlide = () => {
    const newSlide: HeroCarouselSlide = {
      id: `slide-${Date.now()}`,
      type: "image",
      src: "",
      gradient: {
        enabled: false,
        type: "preset",
      },
      overlay: {
        heading: {
          text: "New Slide",
          fontSize: 56,
          fontWeight: 700,
          fontFamily: "inherit",
          color: "#ffffff",
          animation: "slideUp",
          animationDuration: 800,
          animationDelay: 200,
        },
        buttons: [],
        position: "center",
        spacing: {
          betweenHeadingSubheading: 16,
          betweenSubheadingButtons: 32,
          betweenButtons: 16,
        },
      },
    };
    setSlides([...slides, newSlide]);
  };

  const updateSlide = (index: number, updates: Partial<HeroCarouselSlide>) => {
    const updatedSlides = [...slides];
    updatedSlides[index] = { ...updatedSlides[index], ...updates };
    setSlides(updatedSlides);
  };

  const deleteSlide = (index: number) => {
    if (slides.length === 1) {
      setShowLastSlideError(true);
      return;
    }
    setDeleteConfirmSlideIndex(index);
  };

  const confirmDeleteSlide = () => {
    if (deleteConfirmSlideIndex !== null) {
      setSlides(slides.filter((_, i) => i !== deleteConfirmSlideIndex));
      setDeleteConfirmSlideIndex(null);
    }
  };

  const moveSlideUp = (index: number) => {
    if (index === 0) return;
    const updatedSlides = [...slides];
    [updatedSlides[index - 1], updatedSlides[index]] = [
      updatedSlides[index],
      updatedSlides[index - 1],
    ];
    setSlides(updatedSlides);
  };

  const moveSlideDown = (index: number) => {
    if (index === slides.length - 1) return;
    const updatedSlides = [...slides];
    [updatedSlides[index], updatedSlides[index + 1]] = [
      updatedSlides[index + 1],
      updatedSlides[index],
    ];
    setSlides(updatedSlides);
  };

  const handleSave = (closeAfterSave: boolean = false) => {
    const updates: Partial<HeroSection> = {
      displayName,
      content: {
        slides,
        autoPlay,
        autoPlayInterval,
        showDots,
        showArrows,
        transitionDuration,
      },
    };
    onSave(updates);

    // Only close if explicitly requested (via "Save & Close" button)
    if (closeAfterSave) {
      onCancel();
    }
  };

  useAutoSave(() => handleSave(false));

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1115 }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-images me-2"></i>
              Edit Hero Carousel
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>

          <div className="modal-body">
            {/* Section Name */}
            <div className="mb-4">
              <label className="form-label fw-semibold">Section Name</label>
              <input
                type="text"
                className="form-control"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Hero Section"
              />
              <div className="form-text">Internal name for admin panel</div>
            </div>

            <hr />

            {/* Carousel Settings */}
            <h6 className="mb-3">
              <i className="bi bi-gear me-2"></i>
              Carousel Settings
            </h6>

            {/* Switches Row */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="autoPlay"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="autoPlay">
                    Auto Play
                  </label>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="showDots"
                    checked={showDots}
                    onChange={(e) => setShowDots(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="showDots">
                    Show Navigation Dots
                  </label>
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="showArrows"
                    checked={showArrows}
                    onChange={(e) => setShowArrows(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="showArrows">
                    Show Navigation Arrows
                  </label>
                </div>
              </div>
            </div>

            {/* Number Inputs Row */}
            <div className="row g-3 mb-4">
              {autoPlay && (
                <div className="col-md-6">
                  <label htmlFor="autoPlayInterval" className="form-label fw-semibold">
                    Auto Play Interval (ms)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="autoPlayInterval"
                    value={autoPlayInterval}
                    onChange={(e) => setAutoPlayInterval(parseInt(e.target.value))}
                    min="1000"
                    max="30000"
                    step="1000"
                  />
                  <div className="form-text">
                    Time between slide changes (default: 5000ms)
                  </div>
                </div>
              )}

              <div className="col-md-6">
                <label htmlFor="transitionDuration" className="form-label fw-semibold">
                  Transition Duration (ms)
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="transitionDuration"
                  value={transitionDuration}
                  onChange={(e) => setTransitionDuration(parseInt(e.target.value))}
                  min="300"
                  max="3000"
                  step="100"
                />
                <div className="form-text">
                  Animation speed for slide transitions (default: 800ms)
                </div>
              </div>
            </div>

            <hr />

            {/* Slides */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                <i className="bi bi-collection me-2"></i>
                Slides ({slides.length})
              </h6>
              <button
                type="button"
                className="btn btn-primary"
                onClick={addSlide}
              >
                <i className="bi bi-plus-lg me-1"></i>
                Add Slide
              </button>
            </div>

            {slides.length === 0 ? (
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                No slides yet. Click "Add Slide" to create your first carousel slide.
              </div>
            ) : (
              <div>
                {/* Expand/Collapse All controls */}
                {slides.length > 1 && (
                  <div className="d-flex gap-2 mb-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={expandAll}
                    >
                      <i className="bi bi-arrows-expand me-1"></i>
                      Expand All
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={collapseAll}
                    >
                      <i className="bi bi-arrows-collapse me-1"></i>
                      Collapse All
                    </button>
                  </div>
                )}

                {slides.map((slide, index) => {
                  const isExpanded = expandedSlides.has(index);
                  const headingText = slide.overlay?.heading?.text;
                  const hasMedia = !!slide.src;

                  return (
                    <div key={slide.id} className="card mb-2">
                      {/* Accordion Header */}
                      <div
                        className="card-header d-flex align-items-center gap-2 py-2"
                        style={{ cursor: "pointer", userSelect: "none" }}
                        onClick={() => toggleSlide(index)}
                      >
                        <i className={`bi bi-chevron-${isExpanded ? "down" : "right"}`} style={{ fontSize: "12px", width: "16px", transition: "transform 0.15s" }}></i>

                        {/* Slide thumbnail or icon */}
                        {slide.src ? (
                          slide.type === "video" ? (
                            <span className="badge bg-warning text-dark" style={{ fontSize: "10px" }}>
                              <i className="bi bi-play-circle me-1"></i>Video
                            </span>
                          ) : (
                            <div
                              style={{
                                width: "32px",
                                height: "20px",
                                borderRadius: "3px",
                                backgroundImage: `url(${slide.src})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                border: "1px solid #dee2e6",
                                flexShrink: 0,
                              }}
                            />
                          )
                        ) : (
                          <span className="badge bg-secondary" style={{ fontSize: "10px" }}>
                            <i className="bi bi-image me-1"></i>No media
                          </span>
                        )}

                        <strong className="small">Slide {index + 1}</strong>

                        {headingText && (
                          <span className="text-muted small text-truncate" style={{ maxWidth: "200px" }}>
                            &mdash; {headingText}
                          </span>
                        )}

                        {slide.mobileBgColor && (
                          <span className="badge bg-info" style={{ fontSize: "9px" }}>Mobile Color</span>
                        )}

                        {/* Right-side controls (stop click propagation) */}
                        <div className="ms-auto d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {slides.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-0 px-1"
                                onClick={() => moveSlideUp(index)}
                                disabled={index === 0}
                                title="Move Up"
                                style={{ fontSize: "12px" }}
                              >
                                <i className="bi bi-arrow-up"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-0 px-1"
                                onClick={() => moveSlideDown(index)}
                                disabled={index === slides.length - 1}
                                title="Move Down"
                                style={{ fontSize: "12px" }}
                              >
                                <i className="bi bi-arrow-down"></i>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-1"
                            onClick={() => deleteSlide(index)}
                            title="Delete Slide"
                            style={{ fontSize: "12px" }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Body */}
                      {isExpanded && (
                        <div className="card-body p-0">
                          <SlideEditor
                            slide={slide}
                            slideNumber={index + 1}
                            onChange={(updates) => updateSlide(index, updates)}
                            onDelete={() => deleteSlide(index)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              <i className="bi bi-x-lg me-1"></i>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => handleSave(false)}
              disabled={slides.length === 0}
            >
              <i className="bi bi-floppy me-1"></i>
              Save
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSave(true)}
              disabled={slides.length === 0}
            >
              <i className="bi bi-check-lg me-1"></i>
              Save & Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmSlideIndex !== null && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1120 }}
          onClick={() => setDeleteConfirmSlideIndex(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                  Confirm Delete
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteConfirmSlideIndex(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>Slide {deleteConfirmSlideIndex + 1}</strong>?</p>
                <p className="text-muted mb-0">
                  <small>This action cannot be undone.</small>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirmSlideIndex(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDeleteSlide}
                >
                  <i className="bi bi-trash me-1"></i>
                  Delete Slide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal - Cannot Delete Last Slide */}
      {showLastSlideError && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1120 }}
          onClick={() => setShowLastSlideError(false)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-circle text-danger me-2"></i>
                  Cannot Delete Slide
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLastSlideError(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Cannot delete the last slide.</p>
                <p className="text-muted mb-0">
                  <small>Hero section must have at least one slide. Add more slides before deleting this one.</small>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowLastSlideError(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
