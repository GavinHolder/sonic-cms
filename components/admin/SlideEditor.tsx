"use client";

import { useState, useRef, useEffect } from "react";
import type { HeroCarouselSlide, AnimationType, HeadingRow, HeadingWord, FreeformPos, OverlayImage } from "@/types/section";
import { defaultFreeformPos, resolveFreeformPos } from "@/types/section";
import MediaUploader from "./MediaUploader";
import MediaPickerModal from "./MediaPickerModal";
import { LinkPicker } from "./LinkPicker";
import GoogleFontPicker from "./GoogleFontPicker";

interface SlideEditorProps {
  slide: HeroCarouselSlide;
  onChange: (updates: Partial<HeroCarouselSlide>) => void;
  onDelete: () => void;
  slideNumber: number;
  showReorderButtons?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Controlled breakpoint for the freeform position editor — lifted up to
   * HeroCarouselEditor so the SAME value also drives the Live Preview thumbnail's
   * forceViewport (see HeroCarousel), keeping "which breakpoint am I editing" and
   * "which breakpoint does the preview show" in sync. Omit for an uncontrolled
   * standalone instance (falls back to internal state, defaulting to desktop). */
  editBreakpoint?: "desktop" | "tablet" | "mobile";
  onEditBreakpointChange?: (bp: "desktop" | "tablet" | "mobile") => void;
}

export default function SlideEditor({
  slide,
  onChange,
  onDelete,
  slideNumber,
  showReorderButtons = false,
  onMoveUp,
  onMoveDown,
  editBreakpoint: controlledEditBreakpoint,
  onEditBreakpointChange,
}: SlideEditorProps) {
  const [activeTab, setActiveTab] = useState<"media" | "gradient" | "overlay" | "position">("media");
  const [dragRow, setDragRow] = useState<number | null>(null);
  // Which breakpoint the freeform drag surface is currently authoring positions for.
  // "desktop" is the pre-existing pos/headingPos/etc. fields; tablet/mobile write to
  // the posTablet/posMobile (or headingPosTablet/headingPosMobile, etc.) siblings added
  // alongside them — see buildFreeformChips and FreeformDragSurface's viewport override.
  // Controlled/uncontrolled hybrid (same pattern as SectionLivePreview's viewport prop)
  // so HeroCarouselEditor can share this value with the Live Preview thumbnail's
  // forceViewport, while a standalone SlideEditor with no parent wiring still works.
  const [uncontrolledEditBreakpoint, setUncontrolledEditBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const editBreakpoint = controlledEditBreakpoint ?? uncontrolledEditBreakpoint;
  const setEditBreakpoint = onEditBreakpointChange ?? setUncontrolledEditBreakpoint;
  // Which media field the library picker targets ("src" = main media, "poster" = video poster)
  const [libraryTarget, setLibraryTarget] = useState<null | "src" | "poster">(null);
  // Overlay image picker target: "new" = adding an image, a number = replacing overlay.images[index]
  const [imagePickerTarget, setImagePickerTarget] = useState<null | "new" | number>(null);

  const overlayEnabled = slide.showTextOverlay ?? true;

  const isStackedMode = !!(slide.overlay?.headingRows && slide.overlay.headingRows.length > 0);

  const isFreeform = slide.overlay?.layoutMode === "freeform";

  // Update a single button's freeform pos (buttons live in an array on the overlay).
  // `field` selects which of pos/posTablet/posMobile this write targets — driven by
  // editBreakpoint, same convention as every other setter below.
  const setButtonPos = (index: number, field: "pos" | "posTablet" | "posMobile", pos: FreeformPos | undefined) => {
    const buttons = [...(slide.overlay?.buttons ?? [])];
    if (!buttons[index]) return;
    buttons[index] = { ...buttons[index], [field]: pos };
    updateOverlay({ buttons });
  };

  // Overlay images — freeform-positioned like heading rows / buttons, but rendering
  // an image instead of text (item #68: "text overlay element, but an image").
  const addOverlayImage = (src: string) => {
    const images = slide.overlay?.images ?? [];
    if (images.length >= 5) return;
    updateOverlay({ images: [...images, { src, width: 160 }] });
  };

  const updateOverlayImage = (index: number, updates: Partial<OverlayImage>) => {
    const images = [...(slide.overlay?.images ?? [])];
    if (!images[index]) return;
    images[index] = { ...images[index], ...updates };
    updateOverlay({ images });
  };

  const removeOverlayImage = (index: number) => {
    const images = slide.overlay?.images ?? [];
    updateOverlay({ images: images.filter((_, i) => i !== index) });
  };

  // Which pos/posTablet/posMobile-style field editBreakpoint currently targets.
  const posField: "pos" | "posTablet" | "posMobile" =
    editBreakpoint === "mobile" ? "posMobile" : editBreakpoint === "tablet" ? "posTablet" : "pos";

  // Build the draggable chip list for the freeform surface from live overlay state.
  // Every chip's `pos` is resolved for the CURRENTLY EDITED breakpoint (desktop pos
  // shown as-is; tablet/mobile fall back through resolveFreeformPos so an un-overridden
  // element still appears exactly where it inherits from — the same fallback chain
  // HeroCarousel's ffStyle uses, so what you see here while dragging matches what
  // renders live). `hasOverride` + `onClearOverride` only apply to tablet/mobile — they
  // let an admin drop a breakpoint-specific position back to "inherit from above".
  const buildFreeformChips = (): FreeformChip[] => {
    const ov = slide.overlay;
    if (!ov) return [];
    const chips: FreeformChip[] = [];
    const eyebrowText = slide.eyebrow || ov.eyebrow;
    if (eyebrowText && !ov.eyebrowHidden) {
      const own = editBreakpoint === "mobile" ? ov.eyebrowPosMobile : editBreakpoint === "tablet" ? ov.eyebrowPosTablet : ov.eyebrowPos;
      chips.push({
        // Live eyebrow is fontSize: clamp(11px, 1.4vw, 13px) — at the 1440px reference
        // viewport 1.4vw always exceeds 13px, so the effective size is always 13.
        id: "eyebrow", kind: "eyebrow", text: eyebrowText,
        color: ov.eyebrowColor || "#22c55e", fontSize: 13, fontWeight: 700,
        pos: resolveFreeformPos(editBreakpoint, ov.eyebrowPos, ov.eyebrowPosTablet, ov.eyebrowPosMobile) ?? defaultFreeformPos("eyebrow"),
        onMove: (p) => updateOverlay({ [editBreakpoint === "mobile" ? "eyebrowPosMobile" : editBreakpoint === "tablet" ? "eyebrowPosTablet" : "eyebrowPos"]: p }),
        hasOverride: editBreakpoint !== "desktop" && own != null,
        onClearOverride: editBreakpoint !== "desktop" ? () => updateOverlay({ [editBreakpoint === "mobile" ? "eyebrowPosMobile" : "eyebrowPosTablet"]: undefined }) : undefined,
      });
    }
    if (ov.headingRows && ov.headingRows.length > 0) {
      ov.headingRows.forEach((row, i) => {
        const own = editBreakpoint === "mobile" ? row.posMobile : editBreakpoint === "tablet" ? row.posTablet : row.pos;
        chips.push({
          id: `row-${i}`, kind: "heading", text: row.text, words: row.words, isRow: true,
          fontSize: row.fontSize, fontWeight: row.fontWeight, fontFamily: row.fontFamily, color: row.color,
          pos: resolveFreeformPos(editBreakpoint, row.pos, row.posTablet, row.posMobile) ?? defaultFreeformPos("heading", i),
          onMove: (p) => updateHeadingRow(i, { [posField]: p }),
          hasOverride: editBreakpoint !== "desktop" && own != null,
          onClearOverride: editBreakpoint !== "desktop" ? () => updateHeadingRow(i, { [posField]: undefined }) : undefined,
        });
      });
    } else if (ov.heading?.text) {
      const own = editBreakpoint === "mobile" ? ov.headingPosMobile : editBreakpoint === "tablet" ? ov.headingPosTablet : ov.headingPos;
      chips.push({
        id: "heading", kind: "heading", text: ov.heading.text,
        fontSize: ov.heading.fontSize, fontWeight: ov.heading.fontWeight, fontFamily: ov.heading.fontFamily, color: ov.heading.color,
        pos: resolveFreeformPos(editBreakpoint, ov.headingPos, ov.headingPosTablet, ov.headingPosMobile) ?? defaultFreeformPos("heading"),
        onMove: (p) => updateOverlay({ [editBreakpoint === "mobile" ? "headingPosMobile" : editBreakpoint === "tablet" ? "headingPosTablet" : "headingPos"]: p }),
        hasOverride: editBreakpoint !== "desktop" && own != null,
        onClearOverride: editBreakpoint !== "desktop" ? () => updateOverlay({ [editBreakpoint === "mobile" ? "headingPosMobile" : "headingPosTablet"]: undefined }) : undefined,
      });
    }
    if (ov.subheading?.text) {
      const own = editBreakpoint === "mobile" ? ov.subheadingPosMobile : editBreakpoint === "tablet" ? ov.subheadingPosTablet : ov.subheadingPos;
      chips.push({
        id: "subheading", kind: "subheading", text: ov.subheading.text,
        fontSize: ov.subheading.fontSize, fontWeight: ov.subheading.fontWeight, fontFamily: ov.subheading.fontFamily, color: ov.subheading.color,
        pos: resolveFreeformPos(editBreakpoint, ov.subheadingPos, ov.subheadingPosTablet, ov.subheadingPosMobile) ?? defaultFreeformPos("subheading"),
        onMove: (p) => updateOverlay({ [editBreakpoint === "mobile" ? "subheadingPosMobile" : editBreakpoint === "tablet" ? "subheadingPosTablet" : "subheadingPos"]: p }),
        hasOverride: editBreakpoint !== "desktop" && own != null,
        onClearOverride: editBreakpoint !== "desktop" ? () => updateOverlay({ [editBreakpoint === "mobile" ? "subheadingPosMobile" : "subheadingPosTablet"]: undefined }) : undefined,
      });
    }
    (ov.buttons ?? []).forEach((b, i) => {
      const own = editBreakpoint === "mobile" ? b.posMobile : editBreakpoint === "tablet" ? b.posTablet : b.pos;
      chips.push({
        id: `btn-${i}`, kind: "button", text: b.text || "Button",
        btnBg: b.backgroundColor, btnColor: b.textColor, variant: b.variant,
        pos: resolveFreeformPos(editBreakpoint, b.pos, b.posTablet, b.posMobile) ?? defaultFreeformPos("button", i),
        onMove: (p) => setButtonPos(i, posField, p),
        hasOverride: editBreakpoint !== "desktop" && own != null,
        onClearOverride: editBreakpoint !== "desktop" ? () => setButtonPos(i, posField, undefined) : undefined,
      });
    });
    (ov.images ?? []).forEach((img, i) => {
      const own = editBreakpoint === "mobile" ? img.posMobile : editBreakpoint === "tablet" ? img.posTablet : img.pos;
      chips.push({
        id: `img-${i}`, kind: "image", text: img.alt || "Image",
        imageSrc: img.src, imageWidth: img.width, imageForceWhite: img.forceWhite,
        pos: resolveFreeformPos(editBreakpoint, img.pos, img.posTablet, img.posMobile) ?? defaultFreeformPos("image", i),
        onMove: (p) => updateOverlayImage(i, { [posField]: p }),
        hasOverride: editBreakpoint !== "desktop" && own != null,
        onClearOverride: editBreakpoint !== "desktop" ? () => updateOverlayImage(i, { [posField]: undefined }) : undefined,
      });
    });
    return chips;
  };

  const switchToStacked = () => {
    const existing = slide.overlay?.heading;
    const firstRow: HeadingRow = {
      text: existing?.text ?? "",
      fontSize: existing?.fontSize ?? 56,
      fontWeight: existing?.fontWeight ?? 700,
      fontFamily: existing?.fontFamily ?? "inherit",
      color: existing?.color ?? "#ffffff",
      animation: existing?.animation ?? "slideUp",
      animationDuration: existing?.animationDuration ?? 800,
      animationDelay: existing?.animationDelay ?? 200,
    };
    updateOverlay({ headingRows: [firstRow] });
  };

  const switchToClassic = () => {
    updateOverlay({ headingRows: undefined });
  };

  const updateHeadingRow = (index: number, updates: Partial<HeadingRow>) => {
    const rows = [...(slide.overlay?.headingRows ?? [])];
    rows[index] = { ...rows[index], ...updates };
    updateOverlay({ headingRows: rows });
  };

  const addHeadingRow = () => {
    const rows = slide.overlay?.headingRows ?? [];
    if (rows.length >= 5) return;
    updateOverlay({
      headingRows: [
        ...rows,
        {
          text: "",
          fontSize: 56,
          fontWeight: 700,
          fontFamily: "inherit",
          color: "#ffffff",
          animation: "slideUp" as AnimationType,
          animationDuration: 800,
          animationDelay: 200,
        },
      ],
    });
  };

  const removeHeadingRow = (index: number) => {
    const rows = slide.overlay?.headingRows ?? [];
    if (rows.length <= 1) return;
    updateOverlay({ headingRows: rows.filter((_, i) => i !== index) });
  };

  const reorderHeadingRow = (from: number, to: number) => {
    const rows = [...(slide.overlay?.headingRows ?? [])];
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);
    updateOverlay({ headingRows: rows });
  };

  // ── Per-word outline / fill helpers ────────────────────────────────────────
  const splitRowToWords = (index: number) => {
    const row = (slide.overlay?.headingRows ?? [])[index];
    if (!row) return;
    const words: HeadingWord[] = (row.text || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => ({ text: t }));
    updateHeadingRow(index, { words: words.length ? words : [{ text: "" }] });
  };

  const clearRowWords = (index: number) => {
    const row = (slide.overlay?.headingRows ?? [])[index];
    if (!row) return;
    // Collapse words back into plain text (keep content, drop per-word styling)
    const text = (row.words ?? []).map((w) => w.text).join(" ").trim();
    updateHeadingRow(index, { words: undefined, text: text || row.text });
  };

  const updateWord = (rowIdx: number, wordIdx: number, updates: Partial<HeadingWord>) => {
    const rows = [...(slide.overlay?.headingRows ?? [])];
    const words = [...(rows[rowIdx]?.words ?? [])];
    if (!words[wordIdx]) return;
    words[wordIdx] = { ...words[wordIdx], ...updates };
    rows[rowIdx] = { ...rows[rowIdx], words, text: words.map((w) => w.text).join(" ") };
    updateOverlay({ headingRows: rows });
  };


  const updateGradient = (updates: Partial<NonNullable<HeroCarouselSlide["gradient"]>>) => {
    onChange({
      gradient: {
        ...slide.gradient,
        enabled: slide.gradient?.enabled ?? false,
        type: slide.gradient?.type ?? "preset",
        ...updates,
      } as HeroCarouselSlide["gradient"],
    });
  };

  const updateOverlay = (updates: Partial<NonNullable<HeroCarouselSlide["overlay"]>>) => {
    onChange({
      overlay: {
        ...slide.overlay,
        heading: slide.overlay?.heading ?? {
          text: "",
          fontSize: 56,
          fontWeight: 700,
          fontFamily: "inherit",
          color: "#ffffff",
          animation: "slideUp" as AnimationType,
          animationDuration: 800,
          animationDelay: 200,
        },
        position: slide.overlay?.position ?? "center",
        spacing: slide.overlay?.spacing ?? {
          betweenHeadingSubheading: 16,
          betweenSubheadingButtons: 32,
          betweenButtons: 16,
        },
        buttons: slide.overlay?.buttons ?? [],
        ...updates,
      } as HeroCarouselSlide["overlay"],
    });
  };

  return (
    <div className="p-3">
      <div>
        {/* Tab Navigation */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "media" ? "active" : ""}`}
              onClick={() => setActiveTab("media")}
            >
              <i className="bi bi-image me-1"></i>
              Media
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "gradient" ? "active" : ""}`}
              onClick={() => setActiveTab("gradient")}
            >
              <i className="bi bi-palette me-1"></i>
              Gradient
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "overlay" ? "active" : ""}`}
              onClick={() => setActiveTab("overlay")}
            >
              <i className="bi bi-card-text me-1"></i>
              Text Overlay
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "position" ? "active" : ""}`}
              onClick={() => setActiveTab("position")}
            >
              <i className="bi bi-grid me-1"></i>
              Position
            </button>
          </li>
        </ul>

        {/* Media Tab */}
        {activeTab === "media" && (
          <div>
            <h6 className="mb-3">Media Type</h6>
            <div className="btn-group w-100 mb-3" role="group">
              <input
                type="radio"
                className="btn-check"
                id={`media-image-${slide.id}`}
                checked={slide.type === "image"}
                onChange={() => onChange({ type: "image" })}
              />
              <label className="btn btn-outline-primary" htmlFor={`media-image-${slide.id}`}>
                <i className="bi bi-image me-1"></i>
                Image
              </label>

              <input
                type="radio"
                className="btn-check"
                id={`media-video-${slide.id}`}
                checked={slide.type === "video"}
                onChange={() => onChange({ type: "video" })}
              />
              <label className="btn btn-outline-primary" htmlFor={`media-video-${slide.id}`}>
                <i className="bi bi-play-circle me-1"></i>
                Video
              </label>
            </div>

            {/* Recommendations Alert */}
            <div className={`alert ${slide.type === "image" ? "alert-info" : "alert-warning"} py-2 px-3 mb-3`}>
              <div className="d-flex align-items-start">
                <i className={`bi ${slide.type === "image" ? "bi-info-circle" : "bi-camera-video"} me-2 mt-1`}></i>
                <div>
                  <strong className="d-block mb-1">
                    {slide.type === "image" ? "📸 Image Recommendations" : "🎥 Video Recommendations"}
                  </strong>
                  {slide.type === "image" ? (
                    <small>
                      <strong>Dimensions:</strong> 1920×1080px (Full HD) or 2560×1440px (2K)<br/>
                      <strong>Aspect Ratio:</strong> 16:9 (widescreen)<br/>
                      <strong>Format:</strong> JPEG or WebP (auto-converted)<br/>
                      <strong>Max Size:</strong> 10MB (will be optimized)
                    </small>
                  ) : (
                    <small>
                      <strong>Aspect Ratio:</strong> 16:9 (1920×1080 or 3840×2160)<br/>
                      <strong>Format:</strong> MP4 (H.264 codec recommended)<br/>
                      <strong>Duration:</strong> 10-30 seconds for best performance<br/>
                      <strong>Max Size:</strong> 50MB
                    </small>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                {slide.type === "image" ? "Image" : "Video"} Upload
              </label>
              <MediaUploader
                accept={slide.type === "image" ? "image/*" : "video/*"}
                onUploadComplete={(url, type) => {
                  onChange({ src: url, type });
                }}
                maxSizeMB={slide.type === "image" ? 10 : 50}
                label={`Upload ${slide.type === "image" ? "Image" : "Video"}`}
              />
              <div className="d-flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setLibraryTarget("src")}
                  title="Choose existing media from the library"
                >
                  <i className="bi bi-folder2-open me-1"></i>
                  Choose from Library
                </button>
                {slide.src && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onChange({ src: "" })}
                    title="Remove current media"
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Remove
                  </button>
                )}
              </div>
              {slide.src && (
                <div className="mt-2 d-flex align-items-center gap-2">
                  {slide.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.src}
                      alt="Current media"
                      className="img-thumbnail"
                      style={{ width: 80, height: 50, objectFit: "cover" }}
                    />
                  ) : (
                    <span className="badge bg-warning text-dark">
                      <i className="bi bi-play-circle me-1"></i>Video
                    </span>
                  )}
                  <small className="text-muted text-truncate" style={{ maxWidth: 260 }}>
                    <i className="bi bi-check-circle-fill text-success me-1"></i>
                    Current: {slide.src}
                  </small>
                </div>
              )}
            </div>

            {/* Alt Text - Accessibility */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Alt Text</label>
              <input
                type="text"
                className="form-control"
                value={slide.alt ?? ""}
                onChange={(e) => onChange({ alt: e.target.value })}
                placeholder="Describe this slide for accessibility"
              />
              <div className="form-text">
                <i className="bi bi-universal-access me-1"></i>
                Describes the image/video for screen readers and SEO
              </div>
            </div>

            {/* Mobile Settings */}
            <hr className="my-3" />
            <h6 className="mb-2">
              <i className="bi bi-phone me-2"></i>
              Mobile Settings
            </h6>
            <div className="alert alert-info small py-2 px-3 mb-3">
              <i className="bi bi-lightbulb me-1"></i>
              On mobile devices (&lt;768px), these settings override the desktop media. If a <strong>solid color</strong> is set, it takes priority over the mobile image.
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Mobile Background Color</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  className="form-control form-control-color"
                  value={slide.mobileBgColor || "#000000"}
                  onChange={(e) => onChange({ mobileBgColor: e.target.value })}
                  disabled={!slide.mobileBgColor}
                  style={{ width: "50px" }}
                />
                <div className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }} onClick={() => onChange({ mobileBgColor: !!slide.mobileBgColor ? undefined : "#1e3a5f" })}>
                  <div role="switch" aria-checked={!!slide.mobileBgColor} style={{ width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0, backgroundColor: !!slide.mobileBgColor ? "#0d6efd" : "#adb5bd", transition: "background-color 0.15s", position: "relative" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: "3px", left: !!slide.mobileBgColor ? "19px" : "3px", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </div>
                  <span className="small">Use solid color on mobile</span>
                </div>
              </div>
              {slide.mobileBgColor && (
                <div className="form-text">
                  <i className="bi bi-paint-bucket me-1"></i>
                  Mobile will show <strong style={{ color: slide.mobileBgColor }}>{slide.mobileBgColor}</strong> instead of any image/video
                </div>
              )}
            </div>

            {!slide.mobileBgColor && slide.type === "image" && (
              <div className="mb-3">
                <label className="form-label fw-semibold">Mobile Image (Optional)</label>
                <div className="form-text mb-2">
                  <i className="bi bi-aspect-ratio me-1"></i>
                  Portrait-oriented image for mobile. <strong>Recommended:</strong> 1080x1920px (9:16). Falls back to desktop image if not set.
                </div>
                <MediaUploader
                  accept="image/*"
                  onUploadComplete={(url) => {
                    onChange({ mobileSrc: url });
                  }}
                  maxSizeMB={10}
                  label="Upload Mobile Image"
                />
                {slide.mobileSrc && (
                  <div className="mt-2 d-flex align-items-center gap-2">
                    <small className="text-muted">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Current: {slide.mobileSrc}
                    </small>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onChange({ mobileSrc: undefined })}
                      title="Remove mobile image"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                )}
              </div>
            )}

            {slide.type === "video" && (
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Video Poster Image (Optional)
                </label>
                <div className="form-text mb-2">
                  <i className="bi bi-lightbulb me-1"></i>
                  Thumbnail shown before video loads. Recommended: 1920×1080px, same aspect ratio as video.
                </div>
                <MediaUploader
                  accept="image/*"
                  onUploadComplete={(url) => {
                    onChange({ poster: url });
                  }}
                  maxSizeMB={5}
                  label="Upload Poster Image"
                />
                <div className="d-flex gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setLibraryTarget("poster")}
                    title="Choose existing image from the library"
                  >
                    <i className="bi bi-folder2-open me-1"></i>
                    Choose from Library
                  </button>
                  {slide.poster && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onChange({ poster: undefined })}
                      title="Remove poster image"
                    >
                      <i className="bi bi-x-lg me-1"></i>
                      Remove
                    </button>
                  )}
                </div>
                {slide.poster && (
                  <div className="mt-2 d-flex align-items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.poster}
                      alt="Poster preview"
                      className="img-thumbnail"
                      style={{ width: 80, height: 50, objectFit: "cover" }}
                    />
                    <small className="text-muted text-truncate" style={{ maxWidth: 260 }}>
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Current: {slide.poster}
                    </small>
                  </div>
                )}
              </div>
            )}

            {/* Media Library Picker (shared by main media + poster fields) */}
            <MediaPickerModal
              isOpen={libraryTarget !== null}
              onClose={() => setLibraryTarget(null)}
              filterType={libraryTarget === "poster" ? "image" : slide.type}
              onSelect={(url) => {
                if (libraryTarget === "poster") {
                  onChange({ poster: url });
                } else {
                  onChange({ src: url });
                }
                setLibraryTarget(null);
              }}
            />
          </div>
        )}

        {/* Gradient Tab */}
        {activeTab === "gradient" && (
          <div>
            <div className="d-flex align-items-center gap-2 mb-3" style={{ cursor: "pointer" }} onClick={() => updateGradient({ enabled: !(slide.gradient?.enabled ?? false) })}>
              <div role="switch" aria-checked={slide.gradient?.enabled ?? false} style={{ width: "42px", height: "22px", borderRadius: "11px", flexShrink: 0, backgroundColor: (slide.gradient?.enabled ?? false) ? "#0d6efd" : "#adb5bd", transition: "background-color 0.15s", position: "relative" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: "3px", left: (slide.gradient?.enabled ?? false) ? "23px" : "3px", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
              <span className="fw-semibold small">Enable Gradient Overlay</span>
            </div>

            {slide.gradient?.enabled && (
              <>
                <h6 className="mb-3">Gradient Type</h6>
                <div className="btn-group w-100 mb-3" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    id={`gradient-preset-${slide.id}`}
                    checked={slide.gradient.type === "preset"}
                    onChange={() => updateGradient({ type: "preset" })}
                  />
                  <label className="btn btn-outline-primary" htmlFor={`gradient-preset-${slide.id}`}>
                    <i className="bi bi-stars me-1"></i>
                    Preset Gradient
                  </label>

                  <input
                    type="radio"
                    className="btn-check"
                    id={`gradient-custom-${slide.id}`}
                    checked={slide.gradient.type === "custom"}
                    onChange={() => updateGradient({ type: "custom" })}
                  />
                  <label className="btn btn-outline-primary" htmlFor={`gradient-custom-${slide.id}`}>
                    <i className="bi bi-image me-1"></i>
                    Custom Image
                  </label>
                </div>

                {slide.gradient.type === "preset" && (
                  <div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Direction</label>
                      <select
                        className="form-select"
                        value={slide.gradient.preset?.direction ?? "bottom"}
                        onChange={(e) =>
                          updateGradient({
                            preset: {
                              ...slide.gradient?.preset,
                              direction: e.target.value as any,
                              startOpacity: slide.gradient?.preset?.startOpacity ?? 70,
                              endOpacity: slide.gradient?.preset?.endOpacity ?? 0,
                              color: slide.gradient?.preset?.color ?? "#000000",
                            },
                          })
                        }
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="topLeft">Top Left</option>
                        <option value="topRight">Top Right</option>
                        <option value="bottomLeft">Bottom Left</option>
                        <option value="bottomRight">Bottom Right</option>
                      </select>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Start Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={slide.gradient.preset?.startOpacity ?? 70}
                          onChange={(e) =>
                            updateGradient({
                              preset: {
                                ...slide.gradient?.preset,
                                direction: slide.gradient?.preset?.direction ?? "bottom",
                                startOpacity: parseInt(e.target.value),
                                endOpacity: slide.gradient?.preset?.endOpacity ?? 0,
                                color: slide.gradient?.preset?.color ?? "#000000",
                              },
                            })
                          }
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">End Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={slide.gradient.preset?.endOpacity ?? 0}
                          onChange={(e) =>
                            updateGradient({
                              preset: {
                                ...slide.gradient?.preset,
                                direction: slide.gradient?.preset?.direction ?? "bottom",
                                startOpacity: slide.gradient?.preset?.startOpacity ?? 70,
                                endOpacity: parseInt(e.target.value),
                                color: slide.gradient?.preset?.color ?? "#000000",
                              },
                            })
                          }
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Gradient Color</label>
                      <input
                        type="color"
                        className="form-control form-control-color w-100"
                        value={slide.gradient.preset?.color ?? "#000000"}
                        onChange={(e) =>
                          updateGradient({
                            preset: {
                              ...slide.gradient?.preset,
                              direction: slide.gradient?.preset?.direction ?? "bottom",
                              startOpacity: slide.gradient?.preset?.startOpacity ?? 70,
                              endOpacity: slide.gradient?.preset?.endOpacity ?? 0,
                              color: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {slide.gradient.type === "custom" && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Custom Gradient Image</label>
                    <MediaUploader
                      accept="image/*"
                      onUploadComplete={(url) => {
                        updateGradient({
                          custom: { src: url },
                        });
                      }}
                      maxSizeMB={5}
                      label="Upload Gradient Image"
                    />
                    {slide.gradient.custom?.src && (
                      <div className="mt-2">
                        <small className="text-muted">Current: {slide.gradient.custom.src}</small>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Text Overlay Tab */}
        {activeTab === "overlay" && (
          <div>
            {/* Show / hide text overlay */}
            <div className="d-flex align-items-center gap-2 mb-3" style={{ cursor: "pointer" }} onClick={() => onChange({ showTextOverlay: !overlayEnabled })}>
              <div role="switch" aria-checked={overlayEnabled} style={{ width: "42px", height: "22px", borderRadius: "11px", flexShrink: 0, backgroundColor: overlayEnabled ? "#0d6efd" : "#adb5bd", transition: "background-color 0.15s", position: "relative" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: "3px", left: overlayEnabled ? "23px" : "3px", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
              <span className="fw-semibold small">Show text overlay</span>
            </div>
            {!overlayEnabled && (
              <div className="alert alert-secondary small py-2 px-3 mb-3">
                <i className="bi bi-eye-slash me-1"></i>
                Text overlay is hidden — this slide shows the image/video only.
              </div>
            )}

            <div style={{ opacity: overlayEnabled ? 1 : 0.5, pointerEvents: overlayEnabled ? "auto" : "none" }}>
            {/* Freeform Layout — opt-in drag placement of each overlay element */}
            <div className="mb-3 p-2 border rounded" style={{ background: "#f8f9fa" }}>
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <label className="form-label fw-semibold mb-0">
                    <i className="bi bi-arrows-move me-1"></i>Freeform Layout
                  </label>
                  <div className="form-text mt-0">
                    Drag each element (heading rows, subheading, buttons) anywhere on the slide.
                  </div>
                </div>
                <div
                  role="switch"
                  aria-checked={isFreeform}
                  style={{ width: "42px", height: "22px", borderRadius: "11px", flexShrink: 0, cursor: "pointer", backgroundColor: isFreeform ? "#16a34a" : "#adb5bd", transition: "background-color 0.15s", position: "relative" }}
                  onClick={() => updateOverlay({ layoutMode: isFreeform ? "preset" : "freeform" })}
                >
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: "3px", left: isFreeform ? "23px" : "3px", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </div>

              {isFreeform && (
                <div className="mt-2">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="text-muted small me-1">Position for:</span>
                    {(["desktop", "tablet", "mobile"] as const).map((bp) => (
                      <button
                        key={bp}
                        type="button"
                        className={`btn btn-sm ${editBreakpoint === bp ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => setEditBreakpoint(bp)}
                      >
                        <i className={`bi me-1 ${bp === "desktop" ? "bi-laptop" : bp === "tablet" ? "bi-tablet" : "bi-phone"}`} />
                        {bp.charAt(0).toUpperCase() + bp.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="alert alert-info small py-2 px-2 mb-2">
                    <i className="bi bi-hand-index me-1"></i>
                    {editBreakpoint === "desktop" ? (
                      <>Drag the chips to place each element. Position is shown as <strong>x%, y%</strong> (anchor = element centre). Elements not moved use a sensible default.</>
                    ) : editBreakpoint === "tablet" ? (
                      <>Editing the <strong>tablet</strong> (768-991px) layout. An element you haven&apos;t dragged here still uses its Desktop position — drag it to give this breakpoint its own.</>
                    ) : (
                      <>Editing the <strong>mobile</strong> (&lt;768px) layout. An element you haven&apos;t dragged here still uses the automatic centered stack, exactly as before — drag it to give it a real position on mobile instead.</>
                    )}
                  </div>
                  <FreeformDragSurface chips={buildFreeformChips()} slide={slide} editBreakpoint={editBreakpoint} />
                  <div className="form-text mt-1">
                    Preset position controls in the <strong>Position</strong> tab are ignored while freeform is on.
                  </div>
                </div>
              )}
            </div>

            {/* Overlay Images — secondary images (badges, logos, product shots) placed like text elements */}
            <div className="mb-3 p-2 border rounded" style={{ background: "#f8f9fa" }}>
              <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                <label className="form-label fw-semibold mb-0">
                  <i className="bi bi-image me-1"></i>Overlay Images
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={(slide.overlay?.images?.length ?? 0) >= 5}
                  onClick={() => setImagePickerTarget("new")}
                >
                  <i className="bi bi-plus-lg me-1"></i>Add Image
                </button>
              </div>
              <div className="form-text mt-0 mb-2">
                Small images placed over the slide, positioned the same way as heading rows/buttons. Only positioned while <strong>Freeform Layout</strong> (above) is on.
              </div>
              {(slide.overlay?.images ?? []).length === 0 ? (
                <div className="text-muted small fst-italic">No images added.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {(slide.overlay?.images ?? []).map((img, i) => (
                    <div key={i} className="d-flex flex-column gap-2 p-2 border rounded bg-white">
                      <div className="d-flex align-items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.src}
                          alt=""
                          className="img-thumbnail"
                          style={{ width: 48, height: 48, objectFit: "cover", flexShrink: 0, background: img.forceWhite ? "#333" : undefined, filter: img.forceWhite ? "brightness(0) invert(1)" : undefined }}
                        />
                        <div className="flex-grow-1 d-flex align-items-center gap-2">
                          <label className="form-label small mb-0 text-muted" style={{ minWidth: 40 }}>
                            Width{editBreakpoint !== "desktop" && <span className="text-uppercase" style={{ fontSize: 9, opacity: 0.7 }}> ({editBreakpoint})</span>}
                          </label>
                          {(() => {
                            // Same per-breakpoint field pattern as the freeform position
                            // chips above — an admin editing Tablet/Mobile here adjusts
                            // widthTablet/widthMobile instead of the shared desktop width,
                            // so shrinking this image for mobile can't blow out desktop.
                            const widthField = editBreakpoint === "mobile" ? "widthMobile" : editBreakpoint === "tablet" ? "widthTablet" : "width";
                            const ownOverride = editBreakpoint === "mobile" ? img.widthMobile : editBreakpoint === "tablet" ? img.widthTablet : undefined;
                            const resolvedWidth = editBreakpoint === "mobile" ? (img.widthMobile ?? img.widthTablet ?? img.width)
                              : editBreakpoint === "tablet" ? (img.widthTablet ?? img.width)
                              : img.width;
                            return (
                              <>
                                <input
                                  type="range"
                                  min={40}
                                  max={1200}
                                  step={10}
                                  value={resolvedWidth}
                                  onChange={(e) => updateOverlayImage(i, { [widthField]: Number(e.target.value) })}
                                  className="form-range"
                                />
                                <span className="small text-muted" style={{ minWidth: 44 }}>{resolvedWidth}px</span>
                                {editBreakpoint !== "desktop" && ownOverride != null && (
                                  <button type="button" className="btn btn-sm btn-link p-0" style={{ fontSize: 11 }}
                                    title={`Clear this ${editBreakpoint} width override — inherit from above again`}
                                    onClick={() => updateOverlayImage(i, { [widthField]: undefined })}>
                                    <i className="bi bi-arrow-counterclockwise" />
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <button type="button" className="btn btn-sm btn-outline-secondary" title="Replace image" onClick={() => setImagePickerTarget(i)}>
                          <i className="bi bi-arrow-repeat"></i>
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" title="Remove image" onClick={() => removeOverlayImage(i)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                      <div className="d-flex align-items-end gap-2 flex-wrap">
                        <div style={{ minWidth: 110 }}>
                          <label className="form-label form-label-sm mb-1">Animation</label>
                          <select
                            className="form-select form-select-sm"
                            value={img.animation ?? "fade"}
                            onChange={(e) => updateOverlayImage(i, { animation: e.target.value as AnimationType })}
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
                        <div style={{ minWidth: 90 }}>
                          <label className="form-label form-label-sm mb-1">Duration (ms)</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={img.animationDuration ?? 500}
                            onChange={(e) => updateOverlayImage(i, { animationDuration: parseInt(e.target.value) || 500 })}
                            min="0"
                            max="5000"
                            step="50"
                          />
                        </div>
                        <div style={{ minWidth: 90 }}>
                          <label className="form-label form-label-sm mb-1">Delay (ms)</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={img.animationDelay ?? 50}
                            onChange={(e) => updateOverlayImage(i, { animationDelay: parseInt(e.target.value) || 0 })}
                            min="0"
                            max="5000"
                            step="50"
                          />
                        </div>
                        <label className="d-flex align-items-center gap-1 m-0 small text-muted" title="Recolor to solid white (non-destructive — doesn't touch the uploaded file)">
                          <input
                            type="checkbox"
                            checked={img.forceWhite ?? false}
                            onChange={(e) => updateOverlayImage(i, { forceWhite: e.target.checked })}
                          />
                          <span>Make white</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <MediaPickerModal
                isOpen={imagePickerTarget !== null}
                onClose={() => setImagePickerTarget(null)}
                filterType="image"
                onSelect={(url) => {
                  if (imagePickerTarget === "new") {
                    addOverlayImage(url);
                  } else if (typeof imagePickerTarget === "number") {
                    updateOverlayImage(imagePickerTarget, { src: url });
                  }
                  setImagePickerTarget(null);
                }}
              />
            </div>

            {/* Heading Mode Toggle */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Heading Mode</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${!isStackedMode ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={switchToClassic}
                >
                  Classic
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isStackedMode ? "btn-success" : "btn-outline-secondary"}`}
                  onClick={switchToStacked}
                >
                  Stacked
                </button>
              </div>
            </div>

            {/* Classic mode: single heading */}
            {!isStackedMode && (
              <>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Text</label>
                  <input
                    type="text"
                    className="form-control"
                    value={slide.overlay?.heading.text ?? ""}
                    onChange={(e) =>
                      updateOverlay({
                        heading: {
                          ...slide.overlay?.heading,
                          text: e.target.value,
                          fontSize: slide.overlay?.heading.fontSize ?? 56,
                          fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                          fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                          color: slide.overlay?.heading.color ?? "#ffffff",
                          animation: slide.overlay?.heading.animation ?? "slideUp",
                          animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                          animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                        },
                      })
                    }
                    placeholder="Welcome to Your Company"
                  />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Size (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay?.heading.fontSize ?? 56}
                      onChange={(e) =>
                        updateOverlay({
                          heading: {
                            ...slide.overlay?.heading,
                            text: slide.overlay?.heading.text ?? "",
                            fontSize: parseInt(e.target.value),
                            fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                            fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                            color: slide.overlay?.heading.color ?? "#ffffff",
                            animation: slide.overlay?.heading.animation ?? "slideUp",
                            animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                            animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                          },
                        })
                      }
                      min="12"
                      max="120"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Weight</label>
                    <select
                      className="form-select"
                      value={slide.overlay?.heading.fontWeight ?? 700}
                      onChange={(e) =>
                        updateOverlay({
                          heading: {
                            ...slide.overlay?.heading,
                            text: slide.overlay?.heading.text ?? "",
                            fontSize: slide.overlay?.heading.fontSize ?? 56,
                            fontWeight: parseInt(e.target.value),
                            fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                            color: slide.overlay?.heading.color ?? "#ffffff",
                            animation: slide.overlay?.heading.animation ?? "slideUp",
                            animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                            animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                          },
                        })
                      }
                    >
                      <option value="100">Thin (100)</option>
                      <option value="200">Extra Light (200)</option>
                      <option value="300">Light (300)</option>
                      <option value="400">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra Bold (800)</option>
                      <option value="900">Black (900)</option>
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Family</label>
                    <GoogleFontPicker
                      value={slide.overlay?.heading.fontFamily ?? "inherit"}
                      onChange={(f) =>
                        updateOverlay({
                          heading: {
                            ...slide.overlay?.heading,
                            text: slide.overlay?.heading.text ?? "",
                            fontSize: slide.overlay?.heading.fontSize ?? 56,
                            fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                            fontFamily: f,
                            color: slide.overlay?.heading.color ?? "#ffffff",
                            animation: slide.overlay?.heading.animation ?? "slideUp",
                            animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                            animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Color</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={slide.overlay?.heading.color ?? "#ffffff"}
                      onChange={(e) =>
                        updateOverlay({
                          heading: {
                            ...slide.overlay?.heading,
                            text: slide.overlay?.heading.text ?? "",
                            fontSize: slide.overlay?.heading.fontSize ?? 56,
                            fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                            fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                            color: e.target.value,
                            animation: slide.overlay?.heading.animation ?? "slideUp",
                            animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                            animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Animation</label>
                    <select
                      className="form-select"
                      value={slide.overlay?.heading.animation ?? "slideUp"}
                      onChange={(e) =>
                        updateOverlay({
                          heading: {
                            ...slide.overlay?.heading,
                            text: slide.overlay?.heading.text ?? "",
                            fontSize: slide.overlay?.heading.fontSize ?? 56,
                            fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                            fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                            color: slide.overlay?.heading.color ?? "#ffffff",
                            animation: e.target.value as AnimationType,
                            animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                            animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                          },
                        })
                      }
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
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Duration (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay?.heading.animationDuration ?? 800}
                      onChange={(e) =>
                        updateOverlay({
                          heading: {
                            ...slide.overlay?.heading,
                            text: slide.overlay?.heading.text ?? "",
                            fontSize: slide.overlay?.heading.fontSize ?? 56,
                            fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                            fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                            color: slide.overlay?.heading.color ?? "#ffffff",
                            animation: slide.overlay?.heading.animation ?? "slideUp",
                            animationDuration: parseInt(e.target.value),
                            animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                          },
                        })
                      }
                      min="100"
                      max="3000"
                      step="100"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Delay (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay?.heading.animationDelay ?? 200}
                      onChange={(e) =>
                        updateOverlay({
                          heading: {
                            ...slide.overlay?.heading,
                            text: slide.overlay?.heading.text ?? "",
                            fontSize: slide.overlay?.heading.fontSize ?? 56,
                            fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                            fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                            color: slide.overlay?.heading.color ?? "#ffffff",
                            animation: slide.overlay?.heading.animation ?? "slideUp",
                            animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                            animationDelay: parseInt(e.target.value),
                          },
                        })
                      }
                      min="0"
                      max="3000"
                      step="100"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Stacked mode: eyebrow + heading rows */}
            {isStackedMode && (
              <>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Eyebrow</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={slide.overlay?.eyebrow ?? ""}
                      onChange={(e) => updateOverlay({ eyebrow: e.target.value || undefined })}
                      placeholder="YOUR COMPANY · SINCE 2001"
                    />
                    <input
                      type="color"
                      className="form-control form-control-color"
                      style={{ maxWidth: 48 }}
                      value={slide.overlay?.eyebrowColor ?? "#4caf50"}
                      onChange={(e) => updateOverlay({ eyebrowColor: e.target.value })}
                      title="Eyebrow color"
                    />
                  </div>
                  <div className="d-flex align-items-center gap-3 mt-2">
                    <div className="d-flex align-items-center gap-1">
                      <span className="small text-muted">Align</span>
                      <div className="btn-group btn-group-sm" role="group">
                        {(["left", "center", "right"] as const).map((al) => (
                          <button
                            key={al}
                            type="button"
                            className={`btn btn-sm ${(slide.overlay?.eyebrowAlign ?? "left") === al ? "btn-primary" : "btn-outline-secondary"}`}
                            style={{ fontSize: 11 }}
                            onClick={() => updateOverlay({ eyebrowAlign: al })}
                            title={`Align eyebrow ${al}`}
                          >
                            <i className={`bi bi-text-${al === "center" ? "center" : al}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="d-flex align-items-center gap-1 m-0 small text-muted" title="Show or hide the eyebrow">
                      <input
                        type="checkbox"
                        checked={!slide.overlay?.eyebrowHidden}
                        onChange={(e) => updateOverlay({ eyebrowHidden: !e.target.checked })}
                      />
                      <span>Visible</span>
                    </label>
                  </div>
                  <div className="row g-2 mt-1">
                    <div className="col-4">
                      <label className="form-label form-label-sm mb-1">Animation</label>
                      <select
                        className="form-select form-select-sm"
                        value={slide.overlay?.eyebrowAnimation ?? "fade"}
                        onChange={(e) => updateOverlay({ eyebrowAnimation: e.target.value as AnimationType })}
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
                    <div className="col-4">
                      <label className="form-label form-label-sm mb-1">Duration (ms)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={slide.overlay?.eyebrowAnimationDuration ?? 500}
                        onChange={(e) => updateOverlay({ eyebrowAnimationDuration: parseInt(e.target.value) || 500 })}
                        min="0"
                        max="5000"
                        step="50"
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label form-label-sm mb-1">Delay (ms)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={slide.overlay?.eyebrowAnimationDelay ?? 50}
                        onChange={(e) => updateOverlay({ eyebrowAnimationDelay: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="5000"
                        step="50"
                      />
                    </div>
                  </div>
                  <div className="form-text">Small uppercase label shown above the heading.</div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label fw-semibold mb-0">Heading Rows</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      disabled={(slide.overlay?.headingRows?.length ?? 0) >= 5}
                      onClick={addHeadingRow}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Add Row
                    </button>
                  </div>
                  {(slide.overlay?.headingRows ?? []).map((row, idx) => (
                    <div
                      key={idx}
                      className="card mb-2"
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDragEnter={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragRow !== null && dragRow !== idx) reorderHeadingRow(dragRow, idx);
                        setDragRow(null);
                      }}
                      style={{ opacity: dragRow === idx ? 0.4 : 1 }}
                    >
                      <div className="card-body p-2">
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(idx));
                            setDragRow(idx);
                          }}
                          onDragEnd={() => setDragRow(null)}
                          style={{ cursor: 'grab', paddingRight: 6, color: '#aaa' }}
                        >
                          <i className="bi bi-grip-vertical"></i>
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div
                            style={{ width: 12, height: 12, borderRadius: "50%", background: row.color, border: "1px solid rgba(0,0,0,0.2)", flexShrink: 0 }}
                          />
                          <input
                            type="text"
                            className="form-control form-control-sm flex-grow-1"
                            value={row.text}
                            onChange={(e) => updateHeadingRow(idx, { text: e.target.value })}
                            placeholder={`Row ${idx + 1} text`}
                          />
                          <input
                            type="color"
                            className="form-control form-control-color form-control-sm"
                            style={{ maxWidth: 40 }}
                            value={row.color}
                            onChange={(e) => updateHeadingRow(idx, { color: e.target.value })}
                            title="Row color"
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={(slide.overlay?.headingRows?.length ?? 1) <= 1}
                            onClick={() => removeHeadingRow(idx)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                        <div className="row g-2">
                          <div className="col-4">
                            <label className="form-label form-label-sm mb-1">Size (px)</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={row.fontSize}
                              onChange={(e) => updateHeadingRow(idx, { fontSize: parseInt(e.target.value) || 56 })}
                              min="12"
                              max="200"
                            />
                          </div>
                          <div className="col-4">
                            <label className="form-label form-label-sm mb-1">Weight</label>
                            <select
                              className="form-select form-select-sm"
                              value={row.fontWeight}
                              onChange={(e) => updateHeadingRow(idx, { fontWeight: parseInt(e.target.value) })}
                            >
                              <option value="400">400</option>
                              <option value="600">600</option>
                              <option value="700">700</option>
                              <option value="800">800</option>
                              <option value="900">900</option>
                            </select>
                          </div>
                          <div className="col-4">
                            <label className="form-label form-label-sm mb-1">Animation</label>
                            <select
                              className="form-select form-select-sm"
                              value={row.animation}
                              onChange={(e) => updateHeadingRow(idx, { animation: e.target.value as AnimationType })}
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
                          <div className="col-6">
                            <label className="form-label form-label-sm mb-1">Duration (ms)</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={row.animationDuration}
                              onChange={(e) => updateHeadingRow(idx, { animationDuration: parseInt(e.target.value) || 800 })}
                              min="0"
                              max="5000"
                              step="50"
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label form-label-sm mb-1">Delay (ms)</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={row.animationDelay}
                              onChange={(e) => updateHeadingRow(idx, { animationDelay: parseInt(e.target.value) || 0 })}
                              min="0"
                              max="5000"
                              step="50"
                            />
                          </div>
                        </div>
                        <div className="mt-2">
                          <label className="form-label form-label-sm mb-1">Font Family</label>
                          <GoogleFontPicker
                            value={row.fontFamily ?? "inherit"}
                            onChange={(f) => updateHeadingRow(idx, { fontFamily: f })}
                          />
                        </div>

                        {/* ── Per-word outline / fill ─────────────────────────── */}
                        <div className="mt-2 pt-2 border-top">
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <label className="form-label form-label-sm mb-0 fw-semibold" style={{ fontSize: 11 }}>
                              <i className="bi bi-fonts me-1" />Per-word outline
                            </label>
                            {row.words && row.words.length > 0 ? (
                              <button type="button" className="btn btn-sm btn-outline-secondary py-0" style={{ fontSize: 10 }} onClick={() => clearRowWords(idx)}>
                                Use plain text
                              </button>
                            ) : (
                              <button type="button" className="btn btn-sm btn-outline-primary py-0" style={{ fontSize: 10 }} onClick={() => splitRowToWords(idx)} disabled={!row.text.trim()}>
                                Split into words
                              </button>
                            )}
                          </div>
                          {row.words && row.words.length > 0 && (
                            <div className="d-flex flex-column gap-1">
                              {row.words.map((w, wi) => (
                                <div key={wi} className="d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm flex-grow-1 py-0"
                                    style={{ fontSize: 11 }}
                                    value={w.text}
                                    onChange={(e) => updateWord(idx, wi, { text: e.target.value })}
                                    placeholder="word"
                                  />
                                  <select
                                    className="form-select form-select-sm py-0"
                                    style={{ fontSize: 11, width: 92 }}
                                    title="Outline style — Clean uses a single-contour font (Inter) to avoid R/B/W glyph crossings; Thin uses a hairline stroke"
                                    value={w.outlined ? (w.outlineStyle ?? "standard") : "solid"}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === "solid") updateWord(idx, wi, { outlined: false });
                                      else updateWord(idx, wi, { outlined: true, outlineStyle: v as "thin" | "standard" | "clean" });
                                    }}
                                  >
                                    <option value="solid">Solid</option>
                                    <option value="thin">Thin</option>
                                    <option value="standard">Standard</option>
                                    <option value="clean">Clean</option>
                                  </select>
                                  <input
                                    type="color"
                                    className="form-control form-control-color form-control-sm p-0"
                                    style={{ width: 28, height: 26 }}
                                    value={w.outlined ? (w.outlineColor || row.color) : (w.color || row.color)}
                                    onChange={(e) => updateWord(idx, wi, w.outlined ? { outlineColor: e.target.value } : { color: e.target.value })}
                                    title={w.outlined ? "Outline colour" : "Fill colour"}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <hr />

            <h6 className="mb-3">Subheading (Optional)</h6>
            <div className="mb-3">
              <label className="form-label fw-semibold">Text</label>
              <input
                type="text"
                className="form-control"
                value={slide.overlay?.subheading?.text ?? ""}
                onChange={(e) =>
                  updateOverlay({
                    subheading: e.target.value
                      ? {
                          text: e.target.value,
                          fontSize: slide.overlay?.subheading?.fontSize ?? 24,
                          fontWeight: slide.overlay?.subheading?.fontWeight ?? 400,
                          fontFamily: slide.overlay?.subheading?.fontFamily ?? "inherit",
                          color: slide.overlay?.subheading?.color ?? "#ffffff",
                          animation: slide.overlay?.subheading?.animation ?? "slideUp",
                          animationDuration: slide.overlay?.subheading?.animationDuration ?? 800,
                          animationDelay: slide.overlay?.subheading?.animationDelay ?? 400,
                        }
                      : undefined,
                  })
                }
                placeholder="Fast, Reliable Fiber Internet"
              />
            </div>

            {slide.overlay?.subheading && (
              <>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Size (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay.subheading.fontSize}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            fontSize: parseInt(e.target.value),
                          },
                        })
                      }
                      min="12"
                      max="80"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Weight</label>
                    <select
                      className="form-select"
                      value={slide.overlay.subheading.fontWeight}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            fontWeight: parseInt(e.target.value),
                          },
                        })
                      }
                    >
                      <option value="100">Thin (100)</option>
                      <option value="200">Extra Light (200)</option>
                      <option value="300">Light (300)</option>
                      <option value="400">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra Bold (800)</option>
                      <option value="900">Black (900)</option>
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Family</label>
                    <GoogleFontPicker
                      value={slide.overlay.subheading.fontFamily ?? "inherit"}
                      onChange={(f) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            fontFamily: f,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Color</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={slide.overlay.subheading.color}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            color: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Animation</label>
                    <select
                      className="form-select"
                      value={slide.overlay.subheading.animation}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            animation: e.target.value as AnimationType,
                          },
                        })
                      }
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
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Duration (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay.subheading.animationDuration}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            animationDuration: parseInt(e.target.value),
                          },
                        })
                      }
                      min="100"
                      max="3000"
                      step="100"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Delay (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay.subheading.animationDelay}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            animationDelay: parseInt(e.target.value),
                          },
                        })
                      }
                      min="0"
                      max="3000"
                      step="100"
                    />
                  </div>
                </div>
              </>
            )}

            <hr />

            {/* Drop Shadow — toggleable/adjustable shadow for headings + subheading */}
            <h6 className="mb-3">Drop Shadow</h6>
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="textShadowEnabled"
                checked={slide.overlay?.textShadow?.enabled ?? false}
                onChange={(e) =>
                  updateOverlay({
                    textShadow: {
                      offsetX: slide.overlay?.textShadow?.offsetX ?? 0,
                      offsetY: slide.overlay?.textShadow?.offsetY ?? 2,
                      blur: slide.overlay?.textShadow?.blur ?? 8,
                      color: slide.overlay?.textShadow?.color ?? "#000000",
                      opacity: slide.overlay?.textShadow?.opacity ?? 50,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              <label className="form-check-label fw-semibold" htmlFor="textShadowEnabled">
                Enable drop shadow on headings &amp; subheading
              </label>
            </div>

            {slide.overlay?.textShadow?.enabled && (
              <>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Shadow Direction</label>
                  <ShadowDirectionDial
                    offsetX={slide.overlay.textShadow.offsetX}
                    offsetY={slide.overlay.textShadow.offsetY}
                    onChange={(offsetX, offsetY) =>
                      updateOverlay({
                        textShadow: { ...slide.overlay?.textShadow!, offsetX, offsetY },
                      })
                    }
                  />
                </div>

                <div className="row mb-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Blur (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay.textShadow.blur}
                      onChange={(e) =>
                        updateOverlay({
                          textShadow: { ...slide.overlay?.textShadow!, blur: Math.max(0, parseInt(e.target.value) || 0) },
                        })
                      }
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Color</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={slide.overlay.textShadow.color}
                      onChange={(e) =>
                        updateOverlay({
                          textShadow: { ...slide.overlay?.textShadow!, color: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Opacity ({slide.overlay.textShadow.opacity}%)</label>
                    <input
                      type="range"
                      className="form-range"
                      value={slide.overlay.textShadow.opacity}
                      onChange={(e) =>
                        updateOverlay({
                          textShadow: { ...slide.overlay?.textShadow!, opacity: parseInt(e.target.value) },
                        })
                      }
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>
              </>
            )}

            <hr />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Buttons</h6>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() =>
                  updateOverlay({
                    buttons: [
                      ...(slide.overlay?.buttons ?? []),
                      {
                        text: "Get Started",
                        href: "#contact",
                        backgroundColor: "#2563eb",
                        textColor: "#ffffff",
                        variant: "filled",
                        animation: "slideUp",
                        animationDuration: 800,
                        animationDelay: 600,
                      },
                    ],
                  })
                }
              >
                <i className="bi bi-plus-lg me-1"></i>
                Add Button
              </button>
            </div>

            {slide.overlay?.buttons.map((button, index) => (
              <div key={index} className="card mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Button {index + 1}</strong>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() =>
                        updateOverlay({
                          buttons: slide.overlay?.buttons.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>

                  <div className="row mb-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Text</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={button.text}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = { ...button, text: e.target.value };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Link</label>
                      <LinkPicker
                        value={button.href}
                        onChange={(href) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = { ...button, href };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                  </div>

                  <div className="row mb-2">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Variant</label>
                      <select
                        className="form-select form-select-sm"
                        value={button.variant}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            variant: e.target.value as "filled" | "outline" | "ghost",
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      >
                        <option value="filled">Filled</option>
                        <option value="outline">Outline</option>
                        <option value="ghost">Ghost</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Background</label>
                      <input
                        type="color"
                        className="form-control form-control-color form-control-sm w-100"
                        value={button.backgroundColor}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            backgroundColor: e.target.value,
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Text Color</label>
                      <input
                        type="color"
                        className="form-control form-control-color form-control-sm w-100"
                        value={button.textColor}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = { ...button, textColor: e.target.value };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Animation</label>
                      <select
                        className="form-select form-select-sm"
                        value={button.animation}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            animation: e.target.value as AnimationType,
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
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
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Duration (ms)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={button.animationDuration}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            animationDuration: parseInt(e.target.value),
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                        min="100"
                        max="3000"
                        step="100"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Delay (ms)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={button.animationDelay}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            animationDelay: parseInt(e.target.value),
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                        min="0"
                        max="3000"
                        step="100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Position Tab */}
        {activeTab === "position" && (
          <div>
            <h6 className="mb-3">Overlay Position</h6>
            <div className="row mb-4">
              <div className="col-12">
                <div className="d-grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {[
                    "topLeft",
                    "topCenter",
                    "topRight",
                    "left",
                    "center",
                    "right",
                    "bottomLeft",
                    "bottomCenter",
                    "bottomRight",
                  ].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      className={`btn ${
                        slide.overlay?.position === pos
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() =>
                        updateOverlay({
                          position: pos as any,
                        })
                      }
                    >
                      {pos.replace(/([A-Z])/g, " $1").trim()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <hr />

            <h6 className="mb-3">
              <i className="bi bi-arrows-move me-2"></i>
              Overlay Offset
            </h6>
            <div className="alert alert-info small py-2 mb-3">
              <i className="bi bi-lightbulb me-1"></i>
              Push the entire text overlay away from the edges. Use <strong>Top</strong> to clear the navbar when text is positioned at the top.
            </div>

            <div className="row g-3 mb-3">
              {/* Top Offset */}
              <div className="col-12">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>⬆ Top Offset</span>
                  <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.overlayOffset?.top ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.top ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: parseInt(e.target.value),
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="-500"
                    max="500"
                    step="1"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.top ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: parseInt(e.target.value) || 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="-500"
                    max="500"
                  />
                </div>
              </div>

              {/* Bottom Offset */}
              <div className="col-12">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>⬇ Bottom Offset</span>
                  <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.overlayOffset?.bottom ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.bottom ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: parseInt(e.target.value),
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="-500"
                    max="500"
                    step="1"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.bottom ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: parseInt(e.target.value) || 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="-500"
                    max="500"
                  />
                </div>
              </div>

              {/* Left Offset */}
              <div className="col-6">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>⬅ Left</span>
                  <span className="badge rounded-pill text-secondary border border-secondary-subtle">{slide.overlay?.overlayOffset?.left ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.left ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: parseInt(e.target.value),
                        },
                      })
                    }
                    min="-500"
                    max="500"
                    step="1"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.left ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="-500"
                    max="500"
                  />
                </div>
              </div>

              {/* Right Offset */}
              <div className="col-6">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>➡ Right</span>
                  <span className="badge rounded-pill text-secondary border border-secondary-subtle">{slide.overlay?.overlayOffset?.right ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.right ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: parseInt(e.target.value),
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="-500"
                    max="500"
                    step="1"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.right ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: parseInt(e.target.value) || 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="-500"
                    max="500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets for Offset */}
            <div className="mb-3">
              <label className="form-label small"><strong>Quick Presets:</strong></label>
              <div className="btn-group btn-group-sm w-100" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 0, right: 0, bottom: 0, left: 0 },
                    })
                  }
                >
                  None
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 100, right: 20, bottom: 20, left: 20 },
                    })
                  }
                >
                  Clear Navbar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 40, right: 40, bottom: 40, left: 40 },
                    })
                  }
                >
                  Even Padding
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 60, right: 60, bottom: 60, left: 60 },
                    })
                  }
                >
                  Spacious
                </button>
              </div>
            </div>

            <hr />

            <h6 className="mb-3">Element Spacing</h6>
            <div className="mb-3">
              <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                <span>Heading ↔ Subheading</span>
                <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.spacing.betweenHeadingSubheading ?? 16}px</span>
              </label>
              <input
                type="range"
                className="form-range"
                value={slide.overlay?.spacing.betweenHeadingSubheading ?? 16}
                onChange={(e) =>
                  updateOverlay({
                    spacing: {
                      ...slide.overlay?.spacing,
                      betweenHeadingSubheading: parseInt(e.target.value),
                      betweenSubheadingButtons:
                        slide.overlay?.spacing.betweenSubheadingButtons ?? 32,
                      betweenButtons: slide.overlay?.spacing.betweenButtons ?? 16,
                    },
                  })
                }
                min="0"
                max="200"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                <span>Subheading ↔ Buttons</span>
                <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.spacing.betweenSubheadingButtons ?? 32}px</span>
              </label>
              <input
                type="range"
                className="form-range"
                value={slide.overlay?.spacing.betweenSubheadingButtons ?? 32}
                onChange={(e) =>
                  updateOverlay({
                    spacing: {
                      ...slide.overlay?.spacing,
                      betweenHeadingSubheading:
                        slide.overlay?.spacing.betweenHeadingSubheading ?? 16,
                      betweenSubheadingButtons: parseInt(e.target.value),
                      betweenButtons: slide.overlay?.spacing.betweenButtons ?? 16,
                    },
                  })
                }
                min="0"
                max="200"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                <span>Between Buttons</span>
                <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.spacing.betweenButtons ?? 16}px</span>
              </label>
              <input
                type="range"
                className="form-range"
                value={slide.overlay?.spacing.betweenButtons ?? 16}
                onChange={(e) =>
                  updateOverlay({
                    spacing: {
                      ...slide.overlay?.spacing,
                      betweenHeadingSubheading:
                        slide.overlay?.spacing.betweenHeadingSubheading ?? 16,
                      betweenSubheadingButtons:
                        slide.overlay?.spacing.betweenSubheadingButtons ?? 32,
                      betweenButtons: parseInt(e.target.value),
                    },
                  })
                }
                min="0"
                max="200"
              />
            </div>

            <hr />

            <h6 className="mb-3">
              <i className="bi bi-eye me-2"></i>
              Live Preview
            </h6>
            <div className="card bg-light p-4 text-center">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Heading Preview */}
                <div
                  className="badge rounded-pill text-primary border border-primary-subtle"
                  style={{
                    fontSize: "14px",
                    padding: "8px 16px",
                    fontWeight: "600",
                  }}
                >
                  Heading
                </div>

                {/* Heading ↔ Subheading Spacing */}
                {slide.overlay?.subheading && (
                  <>
                    <div
                      style={{
                        height: `${slide.overlay.spacing.betweenHeadingSubheading}px`,
                        width: "2px",
                        backgroundColor: "#0d6efd",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "8px",
                          fontSize: "11px",
                          color: "#6c757d",
                          backgroundColor: "#f8f9fa",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {slide.overlay.spacing.betweenHeadingSubheading}px
                      </span>
                    </div>

                    {/* Subheading Preview */}
                    <div
                      className="badge rounded-pill text-secondary border border-secondary-subtle"
                      style={{
                        fontSize: "12px",
                        padding: "6px 12px",
                        fontWeight: "500",
                      }}
                    >
                      Subheading
                    </div>
                  </>
                )}

                {/* Subheading ↔ Buttons Spacing */}
                {slide.overlay?.buttons && slide.overlay.buttons.length > 0 && (
                  <>
                    <div
                      style={{
                        height: `${slide.overlay.spacing.betweenSubheadingButtons}px`,
                        width: "2px",
                        backgroundColor: "#0d6efd",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "8px",
                          fontSize: "11px",
                          color: "#6c757d",
                          backgroundColor: "#f8f9fa",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {slide.overlay.spacing.betweenSubheadingButtons}px
                      </span>
                    </div>

                    {/* Buttons Preview */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <div style={{ display: "flex", gap: `${slide.overlay.spacing.betweenButtons}px`, alignItems: "center", justifyContent: "center" }}>
                        {slide.overlay.buttons.map((_, index) => (
                          <div
                            key={index}
                            className="badge rounded-pill text-success border border-success-subtle"
                            style={{
                              fontSize: "11px",
                              padding: "6px 12px",
                              fontWeight: "500",
                            }}
                          >
                            Button {index + 1}
                          </div>
                        ))}
                      </div>
                      {slide.overlay.buttons.length > 1 && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#6c757d",
                            backgroundColor: "#f8f9fa",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {slide.overlay.spacing.betweenButtons}px gap
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Freeform drag surface ──────────────────────────────────────────────────
// A 16:9 proxy of the slide. Each overlay element is a draggable chip; dragging
// updates that element's pos {x,y} as a % of the box (clamped 0–100). Pointer
// events + the box's bounding rect drive the math (no external deps).
interface FreeformChip {
  id: string;
  kind: "eyebrow" | "heading" | "subheading" | "button" | "image";
  text: string;
  /** Heading rows: per-word fill/outline styling (mirrors the live slide). */
  words?: HeadingWord[];
  /** True for stacked headingRows (tighter line-height/letter-spacing than the legacy single heading). */
  isRow?: boolean;
  fontSize?: number;      // px (design canvas)
  fontWeight?: number;
  fontFamily?: string;
  color?: string;         // text / fill colour
  // Button styling
  btnBg?: string;
  btnColor?: string;
  variant?: "filled" | "outline" | "ghost";
  // Image styling
  imageSrc?: string;
  imageWidth?: number;    // px (design canvas, 1440 reference width)
  imageForceWhite?: boolean;
  pos: FreeformPos;
  onMove: (p: FreeformPos) => void;
  /** True when editing tablet/mobile AND this element has its own override at that
   *  breakpoint (vs. currently inheriting from desktop/tablet). Always false while
   *  editing desktop — there's nothing to "clear" there. */
  hasOverride?: boolean;
  /** Clears this element's override at the currently-edited breakpoint, falling back
   *  to inheriting from the breakpoint above. Undefined while editing desktop. */
  onClearOverride?: () => void;
}

/**
 * ShadowDirectionDial — drag the dot to set the drop-shadow's offsetX/offsetY together as a
 * direction + distance (light-direction metaphor: the dot points where the shadow falls,
 * away from the light). Writes the exact same offsetX/offsetY px values a pair of number
 * inputs would — no new data field, this is a UI-only replacement for those two inputs.
 */
function ShadowDirectionDial({
  offsetX,
  offsetY,
  onChange,
}: {
  offsetX: number;
  offsetY: number;
  onChange: (offsetX: number, offsetY: number) => void;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const RADIUS = 40; // visual px radius of the drag area
  const MAX_OFFSET = 50; // matches the prior number inputs' min/max="-50"/"50"
  const scale = RADIUS / MAX_OFFSET;
  const pad = 12;
  const size = RADIUS * 2 + pad * 2;

  const setFromEvent = (clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = (clientX - (r.left + r.width / 2)) / scale;
    let dy = (clientY - (r.top + r.height / 2)) / scale;
    // Clamp to the circle (not per-axis) so the dot never leaves the dial.
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_OFFSET) {
      dx = (dx / dist) * MAX_OFFSET;
      dy = (dy / dist) * MAX_OFFSET;
    }
    onChange(Math.round(dx), Math.round(dy));
  };

  const handleX = offsetX * scale;
  const handleY = offsetY * scale;

  return (
    <div className="d-flex align-items-center gap-3">
      <div
        ref={dialRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromEvent(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          setFromEvent(e.clientX, e.clientY);
        }}
        title="Drag to set shadow direction and distance"
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#f8f9fa",
          border: "1px solid #dee2e6",
          cursor: "crosshair",
          touchAction: "none",
          flexShrink: 0,
        }}
      >
        {/* center dot — the "no shadow" origin */}
        <div style={{ position: "absolute", left: size / 2, top: size / 2, width: 4, height: 4, borderRadius: "50%", background: "#adb5bd", transform: "translate(-50%, -50%)", pointerEvents: "none" }} />
        <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={size} height={size}>
          <line x1={size / 2} y1={size / 2} x2={size / 2 + handleX} y2={size / 2 + handleY} stroke="#6c757d" strokeWidth={2} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: size / 2 + handleX,
            top: size / 2 + handleY,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#0d6efd",
            border: "2px solid #fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "#6c757d" }}>
        <div>X: <strong>{offsetX}px</strong></div>
        <div>Y: <strong>{offsetY}px</strong></div>
        <div className="text-muted mt-1" style={{ fontSize: 10, maxWidth: 110 }}>Drag the dot to set direction &amp; distance</div>
      </div>
    </div>
  );
}

// Snap threshold in px (screen space) — converted to a %-of-box value per axis at drag time,
// since the box's px size changes with the admin's viewport/zoom but the stored pos is a %.
const SNAP_PX = 8;
// Minimum pointer travel (px) before a pointerdown-on-a-chip counts as a drag rather than
// a select click. See dragStartRef comment in FreeformDragSurface.
const DRAG_THRESHOLD_PX = 3;
// Alignment targets as % of the box. Not 0/50/100 — chips are centre-anchored
// (translate(-50%,-50%)), so 0/100 would push half the chip off-canvas. These margins
// mirror the padding used elsewhere in the freeform surface.
const ALIGN_H = { left: 6, center: 50, right: 94 } as const;
const ALIGN_V = { top: 8, middle: 50, bottom: 92 } as const;

function FreeformDragSurface({ chips, slide, editBreakpoint }: { chips: FreeformChip[]; slide: HeroCarouselSlide; editBreakpoint: "desktop" | "tablet" | "mobile" }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Multi-select: shift/ctrl+click toggles membership; plain click replaces the selection
  // with just that chip. Alignment buttons act on every selected chip; distribute needs 3+.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snapEnabled, setSnapEnabled] = useState(true);
  // A plain click has to both select a chip AND be able to start a drag from the same
  // pointerdown — but with zero movement threshold, the tiny sub-pixel jitter inherent in
  // any mouse click was registering as a real drag and nudging the chip a percent or two.
  // Track the pointerdown origin and only start actually moving the chip once the pointer
  // has travelled past DRAG_THRESHOLD_PX.
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  // Canvas-centre guides and sibling-element guides render in different colours (cyan vs
  // pink) — they used to look identical, which was confusing since e.g. the default
  // overlay-image position (x:80%) is nowhere near centre but still drew a same-colour line.
  type Guides = { vCanvas: number[]; vElement: number[]; hCanvas: number[]; hElement: number[] };
  const noGuides: Guides = { vCanvas: [], vElement: [], hCanvas: [], hElement: [] };
  const [guides, setGuides] = useState<Guides>(noGuides);
  const moveRef = useRef<((p: FreeformPos) => void) | null>(null);
  // The live hero is 100vw × 100vh, so its background crop AND its font sizes (vw-based
  // clamp()s) depend on the viewer's window shape, not just its width. This surface used to
  // pin a fixed 1440×810 (16:9) reference box, decoupled from the admin's actual window —
  // that's exactly why a chip placed to "look right" here landed somewhere else in the Live
  // Preview panel and on the live page: both of THOSE already measure the admin's real
  // window (see HeroCarouselEditor's `viewport` state) and size their virtual hero to match
  // it 1:1, so this was the one surface out of three using a different shape. Matching that
  // same real-window measurement here (same DEFAULT_VW/VH fallback too) makes the drag
  // surface, the Live Preview panel, and the live page (as viewed on this same window) agree.
  // ONLY true for desktop, though — tablet/mobile editing needs a FIXED reference box (the
  // actual device width being authored for), not the admin's own window shape, or a chip
  // dragged "centered" on a wide monitor would land off-center on a real 375px phone.
  const DEFAULT_VW = 1440;
  const DEFAULT_VH = 900;
  // Matches SectionLivePreview's PREVIEW_VIEWPORTS (768/375) — same breakpoint widths
  // used everywhere else an admin picks "tablet"/"mobile" in this CMS. Heights are real
  // single-screen device heights (not the 1500px scroll-room SectionLivePreview gives
  // mobile for its stacking preview) since this surface positions elements freely within
  // one screen, it doesn't render a scrollable stack.
  const TABLET_VW = 768, TABLET_VH = 1024;
  const MOBILE_VW = 375, MOBILE_VH = 812;
  const [viewport, setViewport] = useState({ w: DEFAULT_VW, h: DEFAULT_VH });
  const [scale, setScale] = useState(0.35);
  const vpW = viewport.w;
  const aspect = `${viewport.w} / ${viewport.h}`;
  useEffect(() => {
    if (editBreakpoint === "tablet") { setViewport({ w: TABLET_VW, h: TABLET_VH }); return; }
    if (editBreakpoint === "mobile") { setViewport({ w: MOBILE_VW, h: MOBILE_VH }); return; }
    const readViewport = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    readViewport();
    window.addEventListener("resize", readViewport);
    return () => window.removeEventListener("resize", readViewport);
  }, [editBreakpoint]);
  useEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (el) setScale((el.clientWidth || 500) / viewport.w);
    };
    measure();
    const el = boxRef.current;
    const ro = el && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && el) ro.observe(el);
    return () => { ro?.disconnect(); };
  }, [viewport.w]);

  const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const posFromEvent = (clientX: number, clientY: number): FreeformPos => {
    const el = boxRef.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    return {
      x: clampPct(((clientX - r.left) / r.width) * 100),
      y: clampPct(((clientY - r.top) / r.height) * 100),
    };
  };

  // Snaps a raw drag position to the canvas centre and to other chips' x/y, within SNAP_PX
  // (converted to %-of-box per axis, since box px size varies with viewport/zoom). Candidates
  // are tagged canvas (the 50% centre line) vs element (a sibling chip's position) so the
  // caller can render them in different colours.
  const snapPos = (raw: FreeformPos, excludeId: string) => {
    if (!snapEnabled || !boxRef.current) return { pos: raw, ...noGuides };
    const r = boxRef.current.getBoundingClientRect();
    const thresholdX = (SNAP_PX / r.width) * 100;
    const thresholdY = (SNAP_PX / r.height) * 100;
    const others = chips.filter((c) => c.id !== excludeId);
    const xCandidates: { v: number; isCanvas: boolean }[] = [{ v: 50, isCanvas: true }, ...others.map((c) => ({ v: c.pos.x, isCanvas: false }))];
    const yCandidates: { v: number; isCanvas: boolean }[] = [{ v: 50, isCanvas: true }, ...others.map((c) => ({ v: c.pos.y, isCanvas: false }))];

    let x = raw.x;
    let closestX: { v: number; isCanvas: boolean } | null = null;
    let closestXDist = thresholdX;
    for (const cand of xCandidates) {
      const d = Math.abs(raw.x - cand.v);
      if (d <= closestXDist) { closestX = cand; closestXDist = d; }
    }
    if (closestX !== null) x = closestX.v;

    let y = raw.y;
    let closestY: { v: number; isCanvas: boolean } | null = null;
    let closestYDist = thresholdY;
    for (const cand of yCandidates) {
      const d = Math.abs(raw.y - cand.v);
      if (d <= closestYDist) { closestY = cand; closestYDist = d; }
    }
    if (closestY !== null) y = closestY.v;

    return {
      pos: { x: clampPct(x), y: clampPct(y) },
      vCanvas: closestX?.isCanvas ? [closestX.v] : [],
      vElement: closestX && !closestX.isCanvas ? [closestX.v] : [],
      hCanvas: closestY?.isCanvas ? [closestY.v] : [],
      hElement: closestY && !closestY.isCanvas ? [closestY.v] : [],
    };
  };

  const bgImg = slide.type === "image" ? (slide.src || slide.mobileSrc) : (slide.poster || slide.mobileSrc);
  const gridOverlay =
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 25%), repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 25%)";

  const selectedChips = chips.filter((c) => selectedIds.has(c.id));
  const alignH = (target: number) => selectedChips.forEach((c) => c.onMove({ ...c.pos, x: target }));
  const alignV = (target: number) => selectedChips.forEach((c) => c.onMove({ ...c.pos, y: target }));
  // Distribute: keep the first/last chip (by position) fixed, space the rest evenly between
  // them. Needs 3+ selected — with 2, "even spacing" is meaningless (there's nothing between).
  const distributeH = () => {
    const sorted = [...selectedChips].sort((a, b) => a.pos.x - b.pos.x);
    if (sorted.length < 3) return;
    const first = sorted[0].pos.x;
    const step = (sorted[sorted.length - 1].pos.x - first) / (sorted.length - 1);
    sorted.forEach((c, i) => { if (i > 0 && i < sorted.length - 1) c.onMove({ ...c.pos, x: clampPct(first + step * i) }); });
  };
  const distributeV = () => {
    const sorted = [...selectedChips].sort((a, b) => a.pos.y - b.pos.y);
    if (sorted.length < 3) return;
    const first = sorted[0].pos.y;
    const step = (sorted[sorted.length - 1].pos.y - first) / (sorted.length - 1);
    sorted.forEach((c, i) => { if (i > 0 && i < sorted.length - 1) c.onMove({ ...c.pos, y: clampPct(first + step * i) }); });
  };

  return (
    <div>
      {/* Alignment + snap toolbar — acts on every selected chip. Click a chip to select just
          it; shift/ctrl+click to add/remove it from a multi-selection. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <div className="btn-group btn-group-sm" role="group" aria-label="Horizontal alignment">
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length === 0} title="Align left" onClick={() => alignH(ALIGN_H.left)}>
            <i className="bi bi-align-start"></i>
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length === 0} title="Align centre" onClick={() => alignH(ALIGN_H.center)}>
            <i className="bi bi-align-center"></i>
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length === 0} title="Align right" onClick={() => alignH(ALIGN_H.right)}>
            <i className="bi bi-align-end"></i>
          </button>
        </div>
        <div className="btn-group btn-group-sm" role="group" aria-label="Vertical alignment">
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length === 0} title="Align top" onClick={() => alignV(ALIGN_V.top)}>
            <i className="bi bi-align-top"></i>
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length === 0} title="Align middle" onClick={() => alignV(ALIGN_V.middle)}>
            <i className="bi bi-align-middle"></i>
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length === 0} title="Align bottom" onClick={() => alignV(ALIGN_V.bottom)}>
            <i className="bi bi-align-bottom"></i>
          </button>
        </div>
        <div className="btn-group btn-group-sm" role="group" aria-label="Distribute spacing">
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length < 3} title="Distribute horizontally (select 3+)" onClick={distributeH}>
            <i className="bi bi-distribute-horizontal"></i>
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={selectedChips.length < 3} title="Distribute vertically (select 3+)" onClick={distributeV}>
            <i className="bi bi-distribute-vertical"></i>
          </button>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${snapEnabled ? "btn-secondary" : "btn-outline-secondary"}`}
          title={snapEnabled ? "Snapping on — click to disable" : "Snapping off — click to enable"}
          onClick={() => { setSnapEnabled((v) => !v); setGuides(noGuides); }}
        >
          <i className="bi bi-magnet me-1"></i>Snap
        </button>
        {selectedChips.length === 0 && <span style={{ fontSize: 11, color: "#94a3b8" }}>Click an element to align it (shift-click for multiple)</span>}
        {selectedChips.length === 1 && <span style={{ fontSize: 11, color: "#94a3b8" }}>1 selected</span>}
        {selectedChips.length > 1 && <span style={{ fontSize: 11, color: "#94a3b8" }}>{selectedChips.length} selected</span>}
      </div>
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          // Deselect-on-background-click lives here (not onClick) because click-event
          // targeting gets unreliable once setPointerCapture is in play for a chip drag —
          // it was firing right after a chip's own pointerdown and clearing the selection
          // that pointerdown had just set. e.target === e.currentTarget still correctly
          // excludes clicks that originated on a chip (a different DOM node).
          if (e.target === e.currentTarget) setSelectedIds(new Set());
        }}
        onPointerMove={(e) => {
          if (!dragId || !moveRef.current) return;
          if (!movedRef.current) {
            const start = dragStartRef.current;
            const dist = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : Infinity;
            if (dist < DRAG_THRESHOLD_PX) return;
            movedRef.current = true;
          }
          const raw = posFromEvent(e.clientX, e.clientY);
          const snapped = snapPos(raw, dragId);
          setGuides({ vCanvas: snapped.vCanvas, vElement: snapped.vElement, hCanvas: snapped.hCanvas, hElement: snapped.hElement });
          moveRef.current(snapped.pos);
        }}
        onPointerUp={(e) => {
          boxRef.current?.releasePointerCapture?.(e.pointerId);
          setDragId(null);
          moveRef.current = null;
          dragStartRef.current = null;
          movedRef.current = false;
          setGuides(noGuides);
        }}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: aspect,
          borderRadius: 8,
          overflow: "hidden",
          background: "#0f172a",
          border: "1px solid #334155",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Slide media background so text is placed against the real image/video */}
        {slide.type === "video" && slide.src ? (
          <video
            src={slide.src}
            muted
            loop
            autoPlay
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : bgImg ? (
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${bgImg})`, backgroundSize: "cover", backgroundPosition: "center",
            }}
          />
        ) : null}
        {/* Placement grid overlay */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: gridOverlay }} />

        {/* Snap guide lines — shown only while actively snapped during a drag. Cyan = snapped
            to canvas centre; pink = snapped to another element's position (e.g. an unmoved
            default like the overlay image's x:80%) — kept visually distinct so it's clear
            which one you're looking at. */}
        {guides.vCanvas.map((x) => (
          <div key={`vc-${x}`} style={{ position: "absolute", left: `${x}%`, top: 0, bottom: 0, width: 0, borderLeft: "1px dashed #38bdf8", pointerEvents: "none", zIndex: 5 }} />
        ))}
        {guides.hCanvas.map((y) => (
          <div key={`hc-${y}`} style={{ position: "absolute", top: `${y}%`, left: 0, right: 0, height: 0, borderTop: "1px dashed #38bdf8", pointerEvents: "none", zIndex: 5 }} />
        ))}
        {guides.vElement.map((x) => (
          <div key={`ve-${x}`} style={{ position: "absolute", left: `${x}%`, top: 0, bottom: 0, width: 0, borderLeft: "1px dashed #f472b6", pointerEvents: "none", zIndex: 5 }} />
        ))}
        {guides.hElement.map((y) => (
          <div key={`he-${y}`} style={{ position: "absolute", top: `${y}%`, left: 0, right: 0, height: 0, borderTop: "1px dashed #f472b6", pointerEvents: "none", zIndex: 5 }} />
        ))}

        {chips.length === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16, color: "#e2e8f0", fontSize: 12, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
            No overlay elements to place yet — add a heading, subheading or button.
          </div>
        ) : chips.map((chip) => {
          const selected = selectedIds.has(chip.id);
          return (
            <div
              key={chip.id}
              onPointerDown={(e) => {
                e.preventDefault();
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                  // Shift/ctrl-click only toggles selection membership — doesn't start a
                  // drag, since dragging several chips together isn't supported (yet).
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(chip.id)) next.delete(chip.id); else next.add(chip.id);
                    return next;
                  });
                  return;
                }
                boxRef.current?.setPointerCapture?.(e.pointerId);
                setDragId(chip.id);
                setSelectedIds(new Set([chip.id]));
                moveRef.current = chip.onMove;
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                movedRef.current = false;
              }}
              title={`${chip.kind} — ${chip.pos.x}%, ${chip.pos.y}%${chip.hasOverride ? " (own position at this breakpoint)" : ""}`}
              style={{
                position: "absolute",
                left: `${chip.pos.x}%`,
                top: `${chip.pos.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: dragId === chip.id ? "grabbing" : "grab",
                whiteSpace: chip.kind === "subheading" ? "normal" : "nowrap",
                maxWidth: chip.kind === "subheading" ? "45%" : "92%",
                textAlign: "center",
                // A chip with its own override at this breakpoint gets a solid amber outline
                // instead of the usual dashed one — at a glance, which elements have actually
                // been re-authored for tablet/mobile vs. which are still inheriting.
                outline: selected ? "1.5px solid #38bdf8" : chip.hasOverride ? "1.5px solid #f59e0b" : "1px dashed rgba(255,255,255,0.35)",
                outlineOffset: 2,
                borderRadius: 3,
                textShadow: "0 1px 3px rgba(0,0,0,0.55)",
              }}
            >
              {renderFreeformChip(chip, scale, vpW)}
              {chip.hasOverride && chip.onClearOverride && (
                <button
                  type="button"
                  title="Clear this breakpoint's position — inherit from above again"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); chip.onClearOverride?.(); }}
                  style={{
                    position: "absolute", top: -8, right: -8, width: 16, height: 16,
                    borderRadius: "50%", border: "1px solid #fff", background: "#f59e0b",
                    color: "#fff", fontSize: 10, lineHeight: "14px", padding: 0,
                    cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Render a freeform overlay element as the ACTUAL styled text (1:1 with the slide),
 * scaled to the drag surface. `scale` = surface width / 1440 (reference slide width).
 * Headings honor per-word fill/outline; buttons/eyebrow/subheading use their real styles.
 */
function renderFreeformChip(chip: FreeformChip, scale: number, vpW: number) {
  const px = (n: number, cap = Infinity) => `${Math.max(1, Math.min(n, cap) * scale)}px`;
  if (chip.kind === "heading") {
    const words = chip.words;
    // Stacked headingRows honor clamp(40px, 9vw, fontSize) with lineHeight 0.95 and
    // letterSpacing -0.02em; the legacy single heading honors clamp(28px, 7vw, fontSize)
    // with lineHeight 1.2 and no letter-spacing (HeroCarousel.tsx).
    const cap = chip.isRow ? 0.09 * vpW : 0.07 * vpW;
    return (
      <div style={{ fontFamily: chip.fontFamily || "inherit", fontWeight: chip.fontWeight || 800, fontSize: px(chip.fontSize || 60, cap), lineHeight: chip.isRow ? 0.95 : 1.2, letterSpacing: chip.isRow ? "-0.02em" : undefined, color: chip.color || "#fff" }}>
        {words && words.length > 0
          ? words.map((w, wi) => {
              const sp = wi < words.length - 1 ? " " : "";
              if (!w.outlined) {
                return <span key={wi} style={{ color: w.color || chip.color || "#fff" }}>{w.text}{sp}</span>;
              }
              // Outlined word: clean hollow via feMorphology erode (same technique as the
              // live hero — a centered text-stroke would blob at R/W/B junctions).
              const oc = w.outlineColor || chip.color || "#fff";
              const r = Math.max(0.4, (w.outlineWidth ?? 2) * scale);
              const fid = `ff-erode-${chip.id}-${wi}`;
              return (
                <span key={wi} style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
                  <span style={{ color: "transparent" }}>{w.text}{sp}</span>
                  <svg aria-hidden style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
                    <defs>
                      <filter id={fid} x="-25%" y="-25%" width="150%" height="150%">
                        <feMorphology in="SourceAlpha" operator="erode" radius={r} result="er" />
                        <feComposite in="SourceGraphic" in2="er" operator="out" />
                      </filter>
                    </defs>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill={oc} filter={`url(#${fid})`}
                      style={{ fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit" }}>{w.text}</text>
                  </svg>
                </span>
              );
            })
          : chip.text}
      </div>
    );
  }
  if (chip.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={chip.imageSrc}
        alt=""
        draggable={false}
        style={{
          width: px(chip.imageWidth || 160),
          height: "auto",
          display: "block",
          borderRadius: 4 * scale,
          pointerEvents: "none",
          filter: chip.imageForceWhite ? "brightness(0) invert(1)" : undefined,
        }}
      />
    );
  }
  if (chip.kind === "eyebrow") {
    // Live eyebrow is clamp(11px, 1.4vw, 13px) — 1.4vw only drops below the 13px cap
    // on windows narrower than ~930px, which the admin editor realistically never is.
    return <div style={{ fontSize: px(chip.fontSize || 13, 13), fontWeight: chip.fontWeight || 600, letterSpacing: "0.18em", lineHeight: 1, textTransform: "uppercase", color: chip.color || "#22c55e" }}>{chip.text}</div>;
  }
  if (chip.kind === "subheading") {
    // Live subheading is clamp(16px, 4vw, fontSize) with lineHeight 1.4 (HeroCarousel.tsx).
    return <div style={{ fontFamily: chip.fontFamily || "inherit", fontSize: px(chip.fontSize || 22, 0.04 * vpW), fontWeight: chip.fontWeight || 400, lineHeight: 1.4, color: chip.color || "#fff" }}>{chip.text}</div>;
  }
  // button
  const filled = chip.variant !== "ghost" && chip.variant !== "outline";
  return (
    <div style={{
      display: "inline-block",
      fontSize: px(15), fontWeight: 600, padding: `${6 * scale}px ${16 * scale}px`, borderRadius: `${6 * scale}px`,
      background: filled ? (chip.btnBg || "#0d6efd") : "transparent",
      color: filled ? (chip.btnColor || "#fff") : (chip.btnBg || "#fff"),
      border: chip.variant === "outline" ? `${Math.max(1, 2 * scale)}px solid ${chip.btnBg || "#fff"}` : "none",
    }}>{chip.text}</div>
  );
}
