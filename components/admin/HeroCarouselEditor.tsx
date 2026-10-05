"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import type { HeroSection, HeroCarouselSlide, HeroEasing } from "@/types/section";
import SlideEditor, { EASING_OPTIONS } from "./SlideEditor";
import HeroCarousel from "@/components/sections/HeroCarousel";
import HeroRealRenderFrame from "./hero/HeroRealRenderFrame";
import { deviceViewportFor, fitForBreakpoint, isDeviceFitBreakpoint } from "@/lib/hero/hero-device-fit";

// SSR-safe default for the admin's viewport before the client measures it.
// The preview renders the hero into a virtual viewport matching the REAL
// browser window (w×h) so `background-size: cover` crops/centers identically
// to the live page, then transform-scales that down to fit the pane.
const DEFAULT_VW = 1440;
const DEFAULT_VH = 900;

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
  const defaultSlide: HeroCarouselSlide = {
    id: `slide-${Date.now()}`,
    type: "image",
    src: "",
    gradient: { enabled: false, type: "preset" },
    overlay: {
      heading: { text: "Your Headline Here", fontSize: 56, fontWeight: 700, fontFamily: "inherit", color: "#ffffff", animation: "slideUp", animationDuration: 800, animationDelay: 200 },
      buttons: [{ text: "Get Started", href: "#contact", backgroundColor: "#2563eb", textColor: "#ffffff", variant: "filled", animation: "slideUp", animationDuration: 800, animationDelay: 600 }],
      position: "center",
      spacing: { betweenHeadingSubheading: 16, betweenSubheadingButtons: 32, betweenButtons: 16 },
    },
  };

  const initialSlides = section.content.slides?.length
    ? section.content.slides
    : [defaultSlide];

  const [slides, setSlides] = useState<HeroCarouselSlide[]>(initialSlides);
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
  const [transitionEasing, setTransitionEasing] = useState<HeroEasing | undefined>(
    section.content.transitionEasing
  );
  const [statsStrip, setStatsStrip] = useState<NonNullable<HeroSection["content"]["statsStrip"]>>(
    section.content.statsStrip ?? { enabled: false, items: [] }
  );
  const [deleteConfirmSlideIndex, setDeleteConfirmSlideIndex] = useState<number | null>(null);
  const [showLastSlideError, setShowLastSlideError] = useState(false);
  // Tracks whether mousedown started directly on each confirmation modal's backdrop — a
  // click event resolves to the nearest common ancestor of mousedown/mouseup targets, so a
  // text-selection drag that starts inside the dialog and ends on the backdrop would
  // otherwise register as a backdrop click and close the modal mid-selection. Each modal
  // gets its own ref since they're never open simultaneously but shouldn't share state.
  const deleteConfirmBackdropMouseDownOnSelf = useRef(false);
  const lastSlideErrorBackdropMouseDownOnSelf = useRef(false);
  // Auto-expand first slide so controls are visible immediately
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set([0]));
  // Inline slide-name editing (double-click the label to rename)
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  // --- Live preview pane -------------------------------------------------
  const [showPreview, setShowPreview] = useState(true);
  // Pauses ONLY the admin's scaled-down preview thumbnail (via HeroCarousel's forcePaused
  // prop) — never touches the live page.
  const [previewPaused, setPreviewPaused] = useState(false);
  // Shared with each SlideEditor's freeform "Position for: Desktop/Tablet/Mobile" toggle
  // (controlled prop) so switching which breakpoint you're authoring positions for also
  // switches the Live Preview thumbnail to actually show that breakpoint's layout — see
  // HeroCarousel's forceViewport prop. Lives here (not inside SlideEditor) because there's
  // one shared preview pane but one SlideEditor per expanded slide.
  const [editBreakpoint, setEditBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  // The Live Preview iframe (and its portal target / stylesheet mirroring) lives in the shared
  // HeroRealRenderFrame, which the Tablet / Mobile freeform canvas also renders through.
  // Real browser viewport of the admin — the hero fills THIS on the live page,
  // so the preview must render into the same w×h for cover-crop to match 1:1.
  const [viewport, setViewport] = useState({ w: DEFAULT_VW, h: DEFAULT_VH });

  // Track the admin's actual window size (SSR-safe default until mounted).
  useEffect(() => {
    const readViewport = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    readViewport();
    window.addEventListener("resize", readViewport);
    return () => window.removeEventListener("resize", readViewport);
  }, []);

  // Real navbar height, fetched the same way HeroCarousel itself does. Admin routes' root
  // layout hardcodes --navbar-height to 100px (app/layout.tsx skips the DB lookup on
  // /admin), so without this the preview silently uses the wrong navbar height whenever
  // the real site uses the "tall" (140px) navbar style — the preview pins --navbar-height
  // to this value below so the hero's content layer (whose `top` reads that var) lines
  // up with the live page. (heroFullNavbar is NOT needed here: the real page's hero is
  // exactly one viewport tall either way — see the .hero-carousel override below.)
  const [navbarHeight, setNavbarHeight] = useState(100);
  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.navbarStyle === "tall") setNavbarHeight(140);
      })
      .catch(() => {});
  }, []);

  // Effective preview box — real-window size for Desktop (unchanged), or a fixed
  // reference size for Tablet/Mobile so the box shape actually matches that device
  // instead of showing mobile-layout content inside a desktop-shaped box. The reference
  // sizes come from lib/hero/hero-device-fit.ts — the same module SlideEditor's own
  // FreeformDragSurface imports for its drag canvas, so what you positioned things
  // against and what the preview shows agree. Desktop (null) keeps the real window.
  const effectiveViewport = deviceViewportFor(editBreakpoint) ?? viewport;

  // True on the breakpoints that fit the WHOLE device into the preview (Mobile, Tablet).
  const deviceFitMode = isDeviceFitBreakpoint(editBreakpoint);

  // Measure the pane so we can scale the virtual hero down to fit. While a device-fit mode
  // is active the preview box is deliberately NARROWER than the column and the fit path
  // never reads previewWidth, so this stays unsubscribed and keeps the last full-width
  // reading: on returning to Desktop the very first frame then still has a sane width
  // (instead of the narrow fit-box width) until the effect below re-measures the box.
  useEffect(() => {
    if (!showPreview || deviceFitMode) return;
    const el = previewRef.current;
    if (!el) return;
    setPreviewWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setPreviewWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPreview, deviceFitMode]);

  // MOBILE / TABLET: measure the preview column (NOT the preview box — the box is sized from
  // this, so measuring the box would be circular) so the whole device can be fitted inside
  // it via the shared fitForBreakpoint rule (lib/hero/hero-device-fit.ts, also used by
  // SlideEditor's drag canvas). Desktop never observes this. useLayoutEffect so the first
  // painted frame after entering a fit mode already uses the measured width (React 19 does
  // not warn about layout effects during SSR, and effects never run on the server anyway).
  const previewColumnRef = useRef<HTMLDivElement>(null);
  const [previewColumnWidth, setPreviewColumnWidth] = useState(0);
  useLayoutEffect(() => {
    if (!showPreview || !deviceFitMode) return;
    const el = previewColumnRef.current;
    if (!el) return;
    setPreviewColumnWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setPreviewColumnWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [showPreview, deviceFitMode]);

  // Synthesized draft section fed to <HeroCarousel>. Rebuilds on every edit so
  // the preview re-renders live (React state change) — no manual refresh.
  const draftSection = useMemo<HeroSection>(
    () => ({
      ...section,
      displayName,
      content: {
        ...section.content,
        slides,
        autoPlay,
        autoPlayInterval,
        showDots,
        showArrows,
        transitionDuration,
        transitionEasing,
        statsStrip,
      },
    }),
    [
      section,
      displayName,
      slides,
      autoPlay,
      autoPlayInterval,
      showDots,
      showArrows,
      transitionDuration,
      transitionEasing,
      statsStrip,
    ]
  );

  // Scale the effective-viewport-sized hero down to the measured pane width. Box
  // height preserves that viewport's aspect ratio so the crop matches what that
  // breakpoint actually shows (real window for Desktop, fixed device size otherwise).
  // MOBILE and TABLET override all of the below: the whole device is fitted into the column
  // (width AND window height) with one uniform scale <= 1, so there is no zoom-in and no
  // inner scroll. `viewport.h` is the reactive window.innerHeight state above, so this
  // re-fits on resize. Desktop gets null here and keeps the existing path untouched.
  const deviceFit = fitForBreakpoint(editBreakpoint, previewColumnWidth, viewport.h);
  const previewScale = deviceFit
    ? deviceFit.scale
    : previewWidth > 0 ? previewWidth / effectiveViewport.w : 0;
  const naturalPreviewBoxHeight =
    previewWidth > 0 ? previewWidth * (effectiveViewport.h / effectiveViewport.w) : 360;
  // (Mobile and Tablet no longer reach this cap — deviceFit above sizes them to fit.)
  // A tall box scaled up to a typical pane width can be taller than most laptop browser
  // windows (~1080-1130px for Mobile at a ~500-520px pane, which is why the fit exists).
  // The box sits inside a `position: sticky` wrapper, so content below
  // the sticky element's own bottom edge is permanently unreachable by scrolling the page
  // (standard sticky behavior — not a bug). Cap the box at a budget that comfortably fits
  // alongside the rest of the modal's chrome (header, tabs, footer buttons) and let the
  // admin scroll WITHIN the box instead, so the full virtual viewport stays reachable.
  // `window` is guarded for SSR; previewWidth stays 0 until after mount, so the fallback
  // 360 branch above (unaffected by this cap) is what actually renders server-side.
  const maxPreviewBoxHeight = typeof window !== "undefined" ? window.innerHeight * 0.6 : 500;
  const isPreviewBoxCapped = !deviceFit && naturalPreviewBoxHeight > maxPreviewBoxHeight;
  const previewBoxHeight = deviceFit
    ? deviceFit.height
    : isPreviewBoxCapped ? maxPreviewBoxHeight : naturalPreviewBoxHeight;

  const startEditingName = (index: number, current: string) => {
    setNameDraft(current);
    setEditingNameIndex(index);
  };

  const commitName = (index: number) => {
    const trimmed = nameDraft.trim();
    updateSlide(index, { name: trimmed || undefined });
    setEditingNameIndex(null);
  };

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
        transitionEasing,
        statsStrip,
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
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        style={showPreview ? { maxWidth: "1600px", width: "96vw" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-images me-2"></i>
              Edit Hero Carousel
            </h5>
            <div className="d-flex align-items-center gap-2 ms-auto">
              <button
                type="button"
                className={`btn btn-sm ${showPreview ? "btn-outline-primary" : "btn-primary"}`}
                onClick={() => setShowPreview((v) => !v)}
                title={showPreview ? "Hide live preview" : "Show live preview"}
              >
                <i className={`bi ${showPreview ? "bi-eye-slash" : "bi-eye"} me-1`}></i>
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
              <button type="button" className="btn-close" onClick={onCancel}></button>
            </div>
          </div>

          <div className="modal-body">
            <div className="row g-4">
              {/* ===== FORM COLUMN ===== */}
              <div className={showPreview ? "col-12 col-lg-7" : "col-12"}>
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
              {([
                { label: "Auto Play", value: autoPlay, onChange: setAutoPlay, id: "autoPlay" },
                { label: "Show Navigation Dots", value: showDots, onChange: setShowDots, id: "showDots" },
                { label: "Show Navigation Arrows", value: showArrows, onChange: setShowArrows, id: "showArrows" },
              ] as const).map(({ label, value, onChange, id }) => (
                <div key={id} className="col-md-6">
                  <div className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }} onClick={() => onChange(!value)}>
                    <div
                      role="switch"
                      aria-checked={value}
                      style={{
                        width: "42px", height: "22px", borderRadius: "11px", flexShrink: 0,
                        backgroundColor: value ? "#0d6efd" : "#adb5bd",
                        transition: "background-color 0.15s",
                        position: "relative",
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff",
                        position: "absolute", top: "3px",
                        left: value ? "23px" : "3px",
                        transition: "left 0.15s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }} />
                    </div>
                    <span className="fw-semibold small">{label}</span>
                  </div>
                </div>
              ))}
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

              <div className="col-md-6">
                <label htmlFor="transitionEasing" className="form-label fw-semibold">
                  Transition Easing
                </label>
                <select
                  className="form-select"
                  id="transitionEasing"
                  value={transitionEasing ?? ""}
                  onChange={(e) => setTransitionEasing((e.target.value || undefined) as HeroEasing | undefined)}
                >
                  {EASING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="form-text">
                  Curve for the slide background crossfade (default: unset = today&apos;s look)
                </div>
              </div>
            </div>

            <hr />

            {/* Stats Strip */}
            <h6 className="mb-3">
              <i className="bi bi-bar-chart-steps me-2"></i>
              Stats Strip
            </h6>
            <div className="mb-4">
              <div
                className="d-flex justify-content-between align-items-center mb-2"
                style={{ cursor: "pointer" }}
                onClick={() => setStatsStrip({ ...statsStrip, enabled: !statsStrip.enabled })}
              >
                <div>
                  <div className="fw-semibold">Enable Stats Strip</div>
                  <div className="form-text mt-0">Frosted bar at the bottom of the hero. Same on all slides.</div>
                </div>
                <div
                  role="switch"
                  aria-checked={statsStrip.enabled}
                  style={{
                    width: "42px", height: "22px", borderRadius: "11px", flexShrink: 0,
                    backgroundColor: statsStrip.enabled ? "#0d6efd" : "#adb5bd",
                    transition: "background-color 0.15s", position: "relative",
                  }}
                >
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff",
                    position: "absolute", top: "3px",
                    left: statsStrip.enabled ? "23px" : "3px",
                    transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
              </div>

              {statsStrip.enabled && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label fw-semibold mb-0">Items (max 6)</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      disabled={statsStrip.items.length >= 6}
                      onClick={() => setStatsStrip({ ...statsStrip, items: [...statsStrip.items, { icon: "bi-circle-fill", text: "" }] })}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Add item
                    </button>
                  </div>
                  {statsStrip.items.map((item, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-2 mb-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        style={{ maxWidth: 160 }}
                        value={item.icon}
                        placeholder="bi-geo-alt-fill"
                        title="Bootstrap icon class"
                        onChange={(e) => {
                          const items = [...statsStrip.items];
                          items[idx] = { ...items[idx], icon: e.target.value };
                          setStatsStrip({ ...statsStrip, items });
                        }}
                      />
                      <input
                        type="text"
                        className="form-control form-control-sm flex-grow-1"
                        value={item.text}
                        placeholder="Label text"
                        onChange={(e) => {
                          const items = [...statsStrip.items];
                          items[idx] = { ...items[idx], text: e.target.value };
                          setStatsStrip({ ...statsStrip, items });
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setStatsStrip({ ...statsStrip, items: statsStrip.items.filter((_, i) => i !== idx) })}
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  ))}
                  {statsStrip.items.length === 0 && (
                    <div className="text-muted small">No items yet. Click "Add item" to create strip items.</div>
                  )}
                </div>
              )}
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

                        {editingNameIndex === index ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ maxWidth: "200px" }}
                            autoFocus
                            value={nameDraft}
                            placeholder={`Slide ${index + 1}`}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={() => commitName(index)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitName(index);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingNameIndex(null);
                              }
                            }}
                          />
                        ) : (
                          <strong
                            className="small"
                            title="Double-click to rename"
                            style={{ cursor: "text" }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startEditingName(index, slide.name || "");
                            }}
                          >
                            {slide.name || `Slide ${index + 1}`}
                          </strong>
                        )}

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
                            editBreakpoint={editBreakpoint}
                            onEditBreakpointChange={setEditBreakpoint}
                            canvasContext={{ section: draftSection, navbarHeight }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </div>
              {/* ===== END FORM COLUMN ===== */}

              {/* ===== LIVE PREVIEW COLUMN ===== */}
              {showPreview && (
                <div className="col-12 col-lg-5">
                  <div ref={previewColumnRef} style={{ position: "sticky", top: 0 }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span
                        className="badge bg-danger d-inline-flex align-items-center gap-1"
                        style={{ fontSize: "11px" }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            backgroundColor: "#fff",
                            display: "inline-block",
                          }}
                        />
                        LIVE PREVIEW
                      </span>
                      <span className="text-muted small">Updates as you edit</span>
                    </div>

                    {/* Box matches the real window aspect ratio and clips the
                        hero; inner virtual viewport is the actual window w×h,
                        transform-scaled to fit — so cover-crop is identical. */}
                    <div
                      ref={previewRef}
                      className={deviceFit ? undefined : "border rounded"}
                      style={{
                        position: "relative",
                        width: deviceFit ? `${deviceFit.width}px` : "100%",
                        height: `${previewBoxHeight}px`,
                        // Mobile/Tablet only: centered device-style frame. The bezel is a
                        // box-shadow (outside the box) so it doesn't eat into the
                        // viewport.w*scale content area.
                        ...(deviceFit
                          ? {
                              margin: "6px auto",
                              borderRadius: 18,
                              boxShadow: "0 0 0 5px #111827, 0 0 0 6px #475569",
                            }
                          : {}),
                        // When the natural (aspect-ratio-driven) height is capped — only the
                        // non-fit (Desktop) path can be; Mobile/Tablet size via deviceFit and
                        // never cap — switch to a vertical scrollbar so the
                        // rest of the preview is reachable within the box. The iframe below
                        // is `position: absolute` inside this `position: relative` box, so
                        // it contributes to this box's scrollable overflow and the browser's
                        // native wheel/trackpad scroll works on it like any scroll container
                        // (the outer `position: sticky` ancestor doesn't change that — it
                        // only pins this box's own top edge, it doesn't intercept scroll
                        // events bound for a nested overflow:auto descendant). Whenever
                        // isPreviewBoxCapped is false (all Mobile/Tablet fits, and Desktop at
                        // typical window shapes) the existing overflow:hidden behavior is
                        // unchanged.
                        overflowX: "hidden",
                        overflowY: isPreviewBoxCapped ? "auto" : "hidden",
                        backgroundColor: "#000",
                      }}
                    >
                      {/* Preview-only play/pause — controls just this thumbnail's autoplay
                          via forcePaused, sits above the pointerEvents:none iframe below
                          so it stays clickable. Never rendered on the live page. */}
                      <button
                        type="button"
                        onClick={() => setPreviewPaused((p) => !p)}
                        aria-label={previewPaused ? "Play preview" : "Pause preview"}
                        title={previewPaused ? "Play preview" : "Pause preview"}
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 10,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: "none",
                          backgroundColor: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <i className={`bi ${previewPaused ? "bi-play-fill" : "bi-pause-fill"}`}></i>
                      </button>
                      {/* Real iframe, NOT a styled div (see HeroRealRenderFrame) — gives
                          HeroCarousel's `vw`-based clamp() font sizes an independent browsing
                          context/viewport to resolve against. Its width/height are the actual
                          effectiveViewport layout dimensions (375/768/real-window) — the visual
                          fit-to-pane shrink is done purely via `transform: scale()` on the
                          iframe itself, which does NOT affect the layout size `vw` resolves
                          against. */}
                      {previewScale > 0 && (
                        <HeroRealRenderFrame
                          title="Hero carousel live preview"
                          viewport={effectiveViewport}
                          scale={previewScale}
                          navbarHeight={navbarHeight}
                        >
                          <HeroCarousel section={draftSection} forcePaused={previewPaused} forceViewport={editBreakpoint} />
                        </HeroRealRenderFrame>
                      )}
                    </div>
                    <div className="form-text mt-2">
                      Scaled-down thumbnail of the live hero. Autoplay and
                      transitions run here exactly as on the page.
                    </div>
                  </div>
                </div>
              )}
              {/* ===== END LIVE PREVIEW COLUMN ===== */}
            </div>
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
          onMouseDown={(e) => { deleteConfirmBackdropMouseDownOnSelf.current = e.target === e.currentTarget; }}
          onClick={(e) => { if (e.target === e.currentTarget && deleteConfirmBackdropMouseDownOnSelf.current) setDeleteConfirmSlideIndex(null); }}
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
          onMouseDown={(e) => { lastSlideErrorBackdropMouseDownOnSelf.current = e.target === e.currentTarget; }}
          onClick={(e) => { if (e.target === e.currentTarget && lastSlideErrorBackdropMouseDownOnSelf.current) setShowLastSlideError(false); }}
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
