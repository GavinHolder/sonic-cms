"use client";

import { useState, useEffect, useLayoutEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HeroSection, AnimationType, HeadingRow, TextShadowConfig, FreeformPos } from "@/types/section";
import { defaultFreeformPos } from "@/types/section";

/**
 * SSR-safe layout effect: runs synchronously before paint on the client (so we
 * can correct the mobile flag before the first frame, avoiding a visible
 * desktop→mobile image swap), and falls back to useEffect on the server where
 * useLayoutEffect would emit a warning and cannot run anyway.
 */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface HeroCarouselProps {
  section: HeroSection;
}

/** Current baked shadows — used as the back-compat fallback when textShadow is undefined. */
const BAKED_HEADING_SHADOW =
  "0 2px 4px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1), 2px 2px 0 rgba(0, 0, 0, 0.4)";
const BAKED_SUBHEADING_SHADOW =
  "0 1px 3px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.1), 1px 1px 0 rgba(0, 0, 0, 0.4)";

/** Convert a hex color + 0-100 opacity into an rgba() string. */
function rgbaFromHex(hex: string, opacity: number): string {
  const a = Math.max(0, Math.min(100, opacity)) / 100;
  let h = (hex || "#000000").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Resolve the CSS `text-shadow` value for a text element.
 * - cfg undefined      → keep current look (fallback baked shadow, or none)
 * - cfg.enabled false  → "none"
 * - cfg.enabled true   → configured shadow (overrides any baked one)
 */
function buildTextShadow(cfg: TextShadowConfig | undefined, fallback?: string): string | undefined {
  if (!cfg) return fallback;
  if (!cfg.enabled) return "none";
  return `${cfg.offsetX}px ${cfg.offsetY}px ${cfg.blur}px ${rgbaFromHex(cfg.color, cfg.opacity)}`;
}

/**
 * Resolve the CSS `filter: drop-shadow(...)` value for hollow SVG-outlined words
 * (text-shadow does not affect SVG strokes). Only active when the shadow is enabled.
 */
function buildDropShadowFilter(cfg: TextShadowConfig | undefined): string | undefined {
  if (!cfg || !cfg.enabled) return undefined;
  return `drop-shadow(${cfg.offsetX}px ${cfg.offsetY}px ${cfg.blur}px ${rgbaFromHex(cfg.color, cfg.opacity)})`;
}

/**
 * Render a heading row's inner content — either the per-word outline/fill spans
 * or the plain `text`. Shared by the preset and freeform layouts so both paths
 * produce identical markup (no drift). `shadow` drives the SVG-outline drop shadow.
 */
function renderRowInner(row: HeadingRow, shadow: TextShadowConfig | undefined) {
  if (!(row.words && row.words.length > 0)) return row.text;
  return row.words.map((w, wi) => {
    const trailing = wi < row.words!.length - 1 ? " " : "";
    if (!w.outlined) {
      // Solid word — plain colored fill on the same line.
      return (
        <span key={wi} style={{ color: w.color || undefined }}>
          {w.text}
          {trailing}
        </span>
      );
    }
    // Outlined word — clean hollow glyphs via SVG stroke. A transparent copy of the
    // same text sizes the inline-block box (shares font-size + baseline on this row);
    // an absolutely-positioned SVG paints the outline on top using paint-order:stroke
    // + round joins, which — unlike a centered -webkit-text-stroke — never blobs at
    // glyph junctions (R/B/W). The SVG <text> inherits the row's font props.
    //
    // Outline style (admin-chosen, backward compatible when undefined → "standard"):
    // - "standard" → stroke width = outlineWidth ?? 2 (current behaviour).
    // - "thin"     → hairline stroke — greatly reduces the R/B/W junction artifact
    //                caused by Archivo Black's overlapping glyph contours.
    // - "clean"    → render the outline in a single-contour font (Inter, already
    //                loaded) so the contours never cross at glyph junctions. The
    //                sizing span is switched to the same font so the box matches the
    //                rendered outline and the word stays aligned on the row.
    const outlineStyle = w.outlineStyle ?? "standard";
    // Outline thickness = feMorphology erode radius (below). Every style is now
    // artifact-free for ANY font, so no font switching (Inter) is needed.
    const radius = outlineStyle === "thin" ? 1.25 : (w.outlineWidth ?? 2);
    const fid = `hero-outline-erode-r${String(radius).replace(".", "p")}`;
    return (
      <Fragment key={wi}>
        <span
          style={{
            position: "relative",
            display: "inline-block",
            whiteSpace: "pre",
            // Hollow SVG strokes ignore text-shadow, so cast the drop shadow here
            // via a CSS filter (only when shadow is enabled).
            filter: buildDropShadowFilter(shadow),
          }}
        >
          {/* Sizing layer: real text, transparent — sets exact box + baseline.
              For "clean" it uses the same clean font so the box matches the outline. */}
          <span
            style={{
              color: "transparent",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
            }}
          >
            {w.text}
          </span>
          {/* Outline layer: filled glyph MINUS an eroded copy (feMorphology erode +
              feComposite out) = a constant-width hollow band that follows the glyph.
              Unlike a centered stroke it can NEVER blob at self-approaching junctions
              (R leg/bowl, W inner Vs, B bowls), and it works for ANY font — the word
              keeps its own font. Outline color = fill; thickness = erode radius. */}
          <svg
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <defs>
              <filter id={fid} x="-25%" y="-25%" width="150%" height="150%">
                <feMorphology in="SourceAlpha" operator="erode" radius={radius} result="eroded" />
                <feComposite in="SourceGraphic" in2="eroded" operator="out" />
              </filter>
            </defs>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              fill={w.outlineColor || row.color}
              filter={`url(#${fid})`}
              style={{
                fontSize: "inherit",
                fontWeight: "inherit",
                fontFamily: "inherit",
                letterSpacing: "inherit",
              }}
            >
              {w.text}
            </text>
          </svg>
        </span>
        {trailing}
      </Fragment>
    );
  });
}

export default function HeroCarousel({ section }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const {
    slides = [], autoPlay, autoPlayInterval, showDots, showArrows, transitionDuration,
    showSlideCounter, showScrollIndicator, metaLine, controlsPosition = "bottom-left",
    statsStrip,
  } = section.content;

  // Detect mobile viewport for mobile-specific images/colors.
  // useLayoutEffect (isomorphic) so the correct src is chosen BEFORE the browser
  // paints the first frame — prevents the mount-time desktop→mobile image flash
  // (e.g. the Sonic mobile logo blinking in) that a post-paint useEffect caused.
  useIsomorphicLayoutEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // If no slides, show placeholder
  if (!slides || slides.length === 0) {
    return (
      <div className="hero-carousel" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa" }}>
        <div className="text-center">
          <i className="bi bi-images" style={{ fontSize: "4rem", color: "#6c757d" }}></i>
          <p className="text-muted mt-3">No slides configured. Add slides in the admin panel.</p>
        </div>
      </div>
    );
  }

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const getAnimationVariants = (animation: AnimationType) => {
    const duration = transitionDuration / 1000; // Convert to seconds

    switch (animation) {
      case "fade":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration },
        };
      case "slideUp":
        return {
          initial: { opacity: 0, y: 50 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -50 },
          transition: { duration },
        };
      case "slideDown":
        return {
          initial: { opacity: 0, y: -50 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 50 },
          transition: { duration },
        };
      case "slideLeft":
        return {
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -50 },
          transition: { duration },
        };
      case "slideRight":
        return {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 50 },
          transition: { duration },
        };
      case "zoom":
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.2 },
          transition: { duration },
        };
      case "none":
      default:
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          exit: { opacity: 1 },
          transition: { duration: 0.01 },
        };
    }
  };

  const getGradientStyle = (slide: typeof slides[0]) => {
    if (!slide.gradient?.enabled) return {};

    if (slide.gradient.type === "preset" && slide.gradient.preset) {
      const { direction, startOpacity, endOpacity, color } = slide.gradient.preset;

      const directionMap: Record<string, string> = {
        top: "to top",
        bottom: "to bottom",
        left: "to left",
        right: "to right",
        topLeft: "to top left",
        topRight: "to top right",
        bottomLeft: "to bottom left",
        bottomRight: "to bottom right",
      };

      const startColor = `${color}${Math.round((startOpacity / 100) * 255).toString(16).padStart(2, '0')}`;
      const endColor = `${color}${Math.round((endOpacity / 100) * 255).toString(16).padStart(2, '0')}`;

      return {
        background: `linear-gradient(${directionMap[direction]}, ${startColor}, ${endColor})`,
      };
    }

    if (slide.gradient.type === "custom" && slide.gradient.custom?.src) {
      return {
        backgroundImage: `url(${slide.gradient.custom.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }

    return {};
  };

  const getPositionClasses = (position: string) => {
    const positionMap: Record<string, string> = {
      topLeft: "align-items-start justify-content-start",
      topCenter: "align-items-start justify-content-center",
      topRight: "align-items-start justify-content-end",
      left: "align-items-center justify-content-start",
      center: "align-items-center justify-content-center",
      right: "align-items-center justify-content-end",
      bottomLeft: "align-items-end justify-content-start",
      bottomCenter: "align-items-end justify-content-center",
      bottomRight: "align-items-end justify-content-end",
    };

    return positionMap[position] || positionMap.center;
  };

  // Outer flex container: only the navbar-clearance fallback for top positions
  // (skipped when the author set a manual top offset).
  const getOverlayOuterStyle = (overlay: typeof slides[0]["overlay"]) => {
    const position = (overlay?.position || "").toLowerCase();
    if (position.includes("top") && !overlay?.overlayOffset?.top) {
      return { paddingTop: "100px" };
    }
    return {};
  };

  // Overlay Offset → a direct, predictable translate on the content itself.
  // Top pushes content down (away from top edge), bottom pushes up, left → right, right → left.
  const getOverlayTransform = (overlay: typeof slides[0]["overlay"]) => {
    const o = overlay?.overlayOffset;
    if (!o) return undefined;
    const tx = (o.left || 0) - (o.right || 0);
    const ty = (o.top || 0) - (o.bottom || 0);
    if (!tx && !ty) return undefined;
    return `translate(${tx}px, ${ty}px)`;
  };

  // Freeform: absolute-position wrapper for a single overlay element.
  // Anchor is the element CENTER (translate -50%,-50%); pos falls back to a
  // staggered default so an un-dragged element still renders somewhere sane.
  const ffStyle = (pos: FreeformPos | undefined, def: FreeformPos): React.CSSProperties => ({
    position: "absolute",
    left: `${pos?.x ?? def.x}%`,
    top: `${pos?.y ?? def.y}%`,
    transform: "translate(-50%, -50%)",
    maxWidth: "92%",
    zIndex: 10,
  });

  // Background media (mobile bg color / image / video-with-mobile-image / video)
  // + gradient overlay for a given slide. Shared by BOTH the persistent
  // under-layer (which always covers the container so nothing behind the hero
  // bleeds through during a transition) and the animated slide layer (which
  // cross-fades). Keeping the gradient here means it is always keyed to its own
  // slide and never leaks past it.
  const renderSlideBackground = (s: typeof slides[0]) => (
    <>
      {/* Background Media - Mobile: solid color or mobile image, Desktop: full media */}
      {isMobile && s.mobileBgColor ? (
        // Mobile solid color background (overrides image entirely)
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{ backgroundColor: s.mobileBgColor }}
        />
      ) : s.type === "image" ? (
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundImage: `url(${isMobile && s.mobileSrc ? s.mobileSrc : s.src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : s.type === "video" ? (
        isMobile && s.mobileSrc ? (
          // Mobile: honor the slide's mobile image instead of the video (perf + art direction)
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{
              backgroundImage: `url(${s.mobileSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <video
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
            autoPlay
            loop
            muted
            playsInline
            poster={s.poster}
          >
            <source src={s.src} type="video/mp4" />
          </video>
        )
      ) : null /* type === "color" — gradient overlay provides background */}

      {/* Gradient Overlay */}
      {s.gradient?.enabled && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={getGradientStyle(s)}
        />
      )}
    </>
  );

  const slide = slides[currentSlide];
  if (!slide) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <p className="text-muted">Invalid slide configuration</p>
      </div>
    );
  }

  return (
    <div
      id={section.id}
      className="hero-carousel position-relative w-100"
      style={{ minHeight: "100dvh", overflow: "hidden" }}
    >
      {/*
        Always-mounted background STACK — one layer per slide, cross-faded by
        opacity. This is the fix for transition glitches (stale-video bleed, flash
        of unrelated media, mount stutter):
          • Every slide's <video>/image stays mounted for the life of the carousel,
            so React never reuses a <video> node across slides (which kept playing
            the previous slide's footage because swapping <source src> doesn't
            reload without .load()), and never mounts a cold <video> mid-swap
            (which flashed black/poster until it buffered).
          • The swap is a pure opacity cross-fade driven by currentSlide, fully
            decoupled from the text AnimatePresence timing — so even if autoplay
            fires mid-animation the background just re-targets, it can't stutter.
          • The current slide's layer is always opacity 1 at rest, so nothing
            behind the hero ever shows through.
        zIndex 0 keeps the stack beneath the animated text/overlay content.
      */}
      {slides.map((s, i) => (
        <div
          key={`bg-${i}`}
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            zIndex: 0,
            opacity: i === currentSlide ? 1 : 0,
            transition: `opacity ${transitionDuration / 1000}s ease-in-out`,
            pointerEvents: "none",
          }}
          aria-hidden={i !== currentSlide}
        >
          {renderSlideBackground(s)}
        </div>
      ))}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: transitionDuration / 1000 }}
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{ zIndex: 1 }}
        >
          {/* Background is handled by the always-mounted stack above; this
              AnimatePresence layer now carries ONLY the text/overlay content so
              the media never mounts/unmounts on a swap. */}

          {/* Text Overlay (PRESET) — hidden when the slide is image/video-only or in freeform mode */}
          {slide.overlay && slide.showTextOverlay !== false && slide.overlay.layoutMode !== "freeform" && (
            <div
              className={`position-absolute top-0 start-0 w-100 h-100 d-flex ${getPositionClasses(slide.overlay.position)}`}
              style={getOverlayOuterStyle(slide.overlay)}
            >
              <div
                className={
                  (slide.overlay.position || "").toLowerCase().includes("left") ? "text-start" :
                  (slide.overlay.position || "").toLowerCase().includes("right") ? "text-end" :
                  "text-center"
                }
                style={{
                  // Mobile-first: full width + tight side padding so content always fits;
                  // desktop keeps the roomy positioned padding.
                  maxWidth: isMobile ? "100%" : "860px",
                  width: isMobile ? "100%" : undefined,
                  zIndex: 10,
                  transform: getOverlayTransform(slide.overlay),
                  padding: isMobile
                    ? "0 20px"
                    : (slide.overlay.position || "").toLowerCase().includes("left") ? "0 0 60px 60px"
                    : (slide.overlay.position || "").toLowerCase().includes("right") ? "0 60px 60px 0"
                    : undefined,
                }}
              >
                <AnimatePresence>
                  {/* Eyebrow — slide-level or overlay-level (hideable, alignable) */}
                  {(slide.eyebrow || slide.overlay.eyebrow) && !slide.overlay.eyebrowHidden && (
                    <motion.p
                      key={`eyebrow-${currentSlide}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: 0.05 }}
                      style={{
                        fontSize: "clamp(11px, 1.4vw, 13px)",
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: slide.overlay.eyebrowColor || "var(--bs-success, #22c55e)",
                        marginBottom: "16px",
                        lineHeight: 1,
                        textAlign: slide.overlay.eyebrowAlign || undefined,
                      }}
                    >
                      {slide.eyebrow || slide.overlay.eyebrow}
                    </motion.p>
                  )}

                  {/* Multi-row heading (OVB-style stacked display type) */}
                  {slide.overlay.headingRows && slide.overlay.headingRows.length > 0 ? (
                    <h1
                      key={`headingrows-${currentSlide}`}
                      className="hero-heading"
                      style={{ margin: 0, padding: 0, marginBottom: `${slide.overlay.spacing.betweenHeadingSubheading}px`, lineHeight: 0.95 }}
                    >
                      {slide.overlay.headingRows.map((row: HeadingRow, i: number) => (
                        <motion.span
                          key={`row-${i}-${currentSlide}`}
                          {...getAnimationVariants(row.animation)}
                          transition={{
                            duration: (row.animationDuration ?? 800) / 1000,
                            delay: (row.animationDelay ?? i * 120) / 1000,
                          }}
                          style={{
                            display: "block",
                            fontSize: `clamp(40px, 9vw, ${row.fontSize}px)`,
                            fontWeight: row.fontWeight,
                            fontFamily: row.fontFamily || "inherit",
                            color: row.color,
                            lineHeight: 0.95,
                            letterSpacing: "-0.02em",
                            // Solid words inherit this text-shadow; outlined words handle it
                            // via a CSS filter on their wrapper (see below). Undefined = current look (none).
                            textShadow: buildTextShadow(slide.overlay?.textShadow),
                          }}
                        >
                          {renderRowInner(row, slide.overlay?.textShadow)}
                        </motion.span>
                      ))}
                    </h1>
                  ) : (
                    /* Legacy single heading */
                    <motion.h1
                      key={`heading-${currentSlide}`}
                      {...getAnimationVariants(slide.overlay.heading.animation)}
                      transition={{
                        duration: (slide.overlay.heading.animationDuration ?? 800) / 1000,
                        delay: (slide.overlay.heading.animationDelay ?? 0) / 1000,
                      }}
                      className="hero-heading"
                      style={{
                        fontSize: `clamp(28px, 7vw, ${slide.overlay.heading.fontSize}px)`,
                        fontWeight: slide.overlay.heading.fontWeight,
                        fontFamily: slide.overlay.heading.fontFamily,
                        color: slide.overlay.heading.color,
                        marginBottom: `${slide.overlay.spacing.betweenHeadingSubheading}px`,
                        textShadow: buildTextShadow(slide.overlay.textShadow, BAKED_HEADING_SHADOW),
                        lineHeight: 1.2,
                      }}
                    >
                      {slide.overlay.heading.text}
                    </motion.h1>
                  )}

                  {/* Subheading */}
                  {slide.overlay.subheading && (
                    <motion.p
                      key={`subheading-${currentSlide}`}
                      {...getAnimationVariants(slide.overlay.subheading.animation)}
                      transition={{
                        duration: (slide.overlay.subheading.animationDuration ?? 800) / 1000,
                        delay: (slide.overlay.subheading.animationDelay ?? 0) / 1000,
                      }}
                      className="hero-subheading"
                      style={{
                        fontSize: `clamp(16px, 4vw, ${slide.overlay.subheading.fontSize}px)`,
                        fontWeight: slide.overlay.subheading.fontWeight,
                        fontFamily: slide.overlay.subheading.fontFamily,
                        color: slide.overlay.subheading.color,
                        marginBottom: `${slide.overlay.spacing.betweenSubheadingButtons}px`,
                        textShadow: buildTextShadow(slide.overlay.textShadow, BAKED_SUBHEADING_SHADOW),
                        lineHeight: 1.4,
                      }}
                    >
                      {slide.overlay.subheading.text}
                    </motion.p>
                  )}

                  {/* Buttons */}
                  {slide.overlay.buttons.length > 0 && (
                    <div className={`d-flex gap-2 gap-md-3 flex-wrap ${
                      (slide.overlay.position || "").toLowerCase().includes("left") ? "justify-content-start" :
                      (slide.overlay.position || "").toLowerCase().includes("right") ? "justify-content-end" :
                      "justify-content-center"
                    }`} style={{ marginTop: `${slide.overlay.spacing.betweenSubheadingButtons}px` }}>
                      {slide.overlay.buttons.map((button, index) => (
                        <motion.a
                          key={index}
                          href={button.href}
                          {...getAnimationVariants(button.animation)}
                          transition={{
                            duration: (button.animationDuration ?? 800) / 1000,
                            delay: (button.animationDelay ?? 0) / 1000,
                          }}
                          className={`btn ${
                            button.variant === "filled"
                              ? ""
                              : button.variant === "outline"
                              ? "btn-outline"
                              : "btn-ghost"
                          }`}
                          style={{
                            backgroundColor: button.variant === "filled" ? button.backgroundColor : "transparent",
                            color: button.textColor,
                            borderColor: button.variant === "outline" ? button.backgroundColor : "transparent",
                            padding: "10px 24px",
                            fontSize: "clamp(14px, 3.5vw, 18px)",
                            fontWeight: 600,
                            textDecoration: "none",
                            borderRadius: "8px",
                            border: button.variant === "outline" ? `2px solid ${button.backgroundColor}` : "none",
                            marginRight: index < (slide.overlay?.buttons?.length ?? 0) - 1 ? `${slide.overlay?.spacing?.betweenButtons ?? 0}px` : "0",
                            boxShadow: `
                              0 2px 8px rgba(0, 0, 0, 0.2),
                              0 4px 16px rgba(0, 0, 0, 0.15),
                              0 1px 0 rgba(255, 255, 255, 0.1) inset
                            `,
                            textShadow: `0 1px 2px rgba(0, 0, 0, 0.3)`,
                          }}
                        >
                          {button.text}
                        </motion.a>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Text Overlay (FREEFORM) — each element absolutely placed via its own pos% */}
          {slide.overlay && slide.showTextOverlay !== false && slide.overlay.layoutMode === "freeform" && (
            <div className="position-absolute top-0 start-0 w-100 h-100" style={{ overflow: "hidden" }}>
              <AnimatePresence>
                {/* Eyebrow */}
                {(slide.eyebrow || slide.overlay.eyebrow) && !slide.overlay.eyebrowHidden && (
                  <div key={`ff-eyebrow-${currentSlide}`} style={ffStyle(slide.overlay.eyebrowPos, defaultFreeformPos("eyebrow"))}>
                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: 0.05 }}
                      style={{
                        fontSize: "clamp(11px, 1.4vw, 13px)",
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: slide.overlay.eyebrowColor || "var(--bs-success, #22c55e)",
                        margin: 0,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      }}
                    >
                      {slide.eyebrow || slide.overlay.eyebrow}
                    </motion.p>
                  </div>
                )}

                {/* Headings — stacked rows (each independently placed) or legacy single heading */}
                {slide.overlay.headingRows && slide.overlay.headingRows.length > 0
                  ? slide.overlay.headingRows.map((row: HeadingRow, i: number) => (
                      <div key={`ff-row-${i}-${currentSlide}`} style={ffStyle(row.pos, defaultFreeformPos("heading", i))}>
                        <motion.h1
                          className="hero-heading"
                          {...getAnimationVariants(row.animation)}
                          transition={{
                            duration: (row.animationDuration ?? 800) / 1000,
                            delay: (row.animationDelay ?? i * 120) / 1000,
                          }}
                          style={{
                            margin: 0,
                            padding: 0,
                            fontSize: `clamp(32px, 8vw, ${row.fontSize}px)`,
                            fontWeight: row.fontWeight,
                            fontFamily: row.fontFamily || "inherit",
                            color: row.color,
                            lineHeight: 0.95,
                            letterSpacing: "-0.02em",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            textShadow: buildTextShadow(slide.overlay?.textShadow),
                          }}
                        >
                          {renderRowInner(row, slide.overlay?.textShadow)}
                        </motion.h1>
                      </div>
                    ))
                  : (
                      <div key={`ff-heading-${currentSlide}`} style={ffStyle(slide.overlay.headingPos, defaultFreeformPos("heading"))}>
                        <motion.h1
                          {...getAnimationVariants(slide.overlay.heading.animation)}
                          transition={{
                            duration: (slide.overlay.heading.animationDuration ?? 800) / 1000,
                            delay: (slide.overlay.heading.animationDelay ?? 0) / 1000,
                          }}
                          className="hero-heading"
                          style={{
                            margin: 0,
                            fontSize: `clamp(28px, 7vw, ${slide.overlay.heading.fontSize}px)`,
                            fontWeight: slide.overlay.heading.fontWeight,
                            fontFamily: slide.overlay.heading.fontFamily,
                            color: slide.overlay.heading.color,
                            textShadow: buildTextShadow(slide.overlay.textShadow, BAKED_HEADING_SHADOW),
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            textAlign: "center",
                          }}
                        >
                          {slide.overlay.heading.text}
                        </motion.h1>
                      </div>
                    )}

                {/* Subheading */}
                {slide.overlay.subheading && (
                  <div key={`ff-sub-${currentSlide}`} style={ffStyle(slide.overlay.subheadingPos, defaultFreeformPos("subheading"))}>
                    <motion.p
                      {...getAnimationVariants(slide.overlay.subheading.animation)}
                      transition={{
                        duration: (slide.overlay.subheading.animationDuration ?? 800) / 1000,
                        delay: (slide.overlay.subheading.animationDelay ?? 0) / 1000,
                      }}
                      className="hero-subheading"
                      style={{
                        margin: 0,
                        fontSize: `clamp(16px, 4vw, ${slide.overlay.subheading.fontSize}px)`,
                        fontWeight: slide.overlay.subheading.fontWeight,
                        fontFamily: slide.overlay.subheading.fontFamily,
                        color: slide.overlay.subheading.color,
                        textShadow: buildTextShadow(slide.overlay.textShadow, BAKED_SUBHEADING_SHADOW),
                        lineHeight: 1.4,
                        textAlign: "center",
                      }}
                    >
                      {slide.overlay.subheading.text}
                    </motion.p>
                  </div>
                )}

                {/* Buttons — each placed independently */}
                {slide.overlay.buttons.map((button, index) => (
                  <div key={`ff-btn-${index}-${currentSlide}`} style={ffStyle(button.pos, defaultFreeformPos("button", index))}>
                    <motion.a
                      href={button.href}
                      {...getAnimationVariants(button.animation)}
                      transition={{
                        duration: (button.animationDuration ?? 800) / 1000,
                        delay: (button.animationDelay ?? 0) / 1000,
                      }}
                      className={`btn ${
                        button.variant === "filled" ? "" : button.variant === "outline" ? "btn-outline" : "btn-ghost"
                      }`}
                      style={{
                        backgroundColor: button.variant === "filled" ? button.backgroundColor : "transparent",
                        color: button.textColor,
                        borderColor: button.variant === "outline" ? button.backgroundColor : "transparent",
                        padding: "10px 24px",
                        fontSize: "clamp(14px, 3.5vw, 18px)",
                        fontWeight: 600,
                        textDecoration: "none",
                        borderRadius: "8px",
                        border: button.variant === "outline" ? `2px solid ${button.backgroundColor}` : "none",
                        whiteSpace: "nowrap",
                        boxShadow: `
                          0 2px 8px rgba(0, 0, 0, 0.2),
                          0 4px 16px rgba(0, 0, 0, 0.15),
                          0 1px 0 rgba(255, 255, 255, 0.1) inset
                        `,
                        textShadow: `0 1px 2px rgba(0, 0, 0, 0.3)`,
                      }}
                    >
                      {button.text}
                    </motion.a>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom controls — dots, slide counter, meta lines */}
      <div
        className="position-absolute bottom-0 w-100 d-flex align-items-end justify-content-between"
        style={{ zIndex: 20, padding: `0 32px ${statsStrip?.enabled && statsStrip.items.length > 0 ? "68px" : "28px"}` }}
      >
        {/* Left side: dots + slide counter */}
        <div className="d-flex flex-column align-items-start gap-2">
          {metaLine && metaLine.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "6px" }}>
              {metaLine.map((line, i) => (
                <span key={i} style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                  {line}
                </span>
              ))}
            </div>
          )}
          <div className="d-flex align-items-center gap-3">
            {showSlideCounter && slides.length > 1 && (
              <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums", minWidth: "40px" }}>
                {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </span>
            )}
            {showDots && slides.length > 1 && (
              <div className="d-flex gap-2 align-items-center">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    className="border-0 p-0"
                    style={{
                      width: index === currentSlide ? "28px" : "6px",
                      height: "2px",
                      borderRadius: "2px",
                      background: index === currentSlide ? "#fff" : "rgba(255,255,255,0.4)",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: scroll indicator */}
        {showScrollIndicator && (
          <div className="d-flex flex-column align-items-end gap-1" style={{ paddingBottom: "2px" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
              Scroll
            </span>
            <div style={{ width: "60px", height: "2px", background: "rgba(255,255,255,0.15)", overflow: "hidden", borderRadius: "2px" }}>
              <div style={{
                width: "40%",
                height: "100%",
                background: "var(--bs-success, #22c55e)",
                animation: "hero-scroll-pulse 2.6s ease-in-out infinite",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator keyframes — injected once */}
      {showScrollIndicator && (
        <style>{`
          @keyframes hero-scroll-pulse {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
        `}</style>
      )}

      {/* Stats strip — frosted bar at bottom of every slide */}
      {statsStrip?.enabled && statsStrip.items.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 25,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            padding: "8px 24px",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          {statsStrip.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <i className={item.icon} style={{ color: "var(--bs-success, #22c55e)", fontSize: "14px" }} />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 500, whiteSpace: "nowrap" }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
