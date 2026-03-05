"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HeroSection, AnimationType } from "@/types/section";

interface HeroCarouselProps {
  section: HeroSection;
}

export default function HeroCarousel({ section }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const { slides = [], autoPlay, autoPlayInterval, showDots, showArrows, transitionDuration } = section.content;

  // Detect mobile viewport for mobile-specific images/colors
  useEffect(() => {
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
          transition: { duration: 0 },
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

  const getOverlayOffsetStyle = (overlay: typeof slides[0]["overlay"]) => {
    const offset = overlay?.overlayOffset;
    const position = overlay?.position;

    // Use configured offset if available
    if (offset) {
      return {
        paddingTop: `${offset.top}px`,
        paddingRight: `${offset.right}px`,
        paddingBottom: `${offset.bottom}px`,
        paddingLeft: `${offset.left}px`,
      };
    }

    // Fallback: auto-add top padding for top positions to clear navbar
    if (position === "topLeft" || position === "topCenter" || position === "topRight") {
      return { paddingTop: "100px" };
    }
    return {};
  };

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
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: transitionDuration / 1000 }}
          className="position-absolute top-0 start-0 w-100 h-100"
        >
          {/* Background Media - Mobile: solid color or mobile image, Desktop: full media */}
          {isMobile && slide.mobileBgColor ? (
            // Mobile solid color background (overrides image entirely)
            <div
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{ backgroundColor: slide.mobileBgColor }}
            />
          ) : slide.type === "image" ? (
            <div
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{
                backgroundImage: `url(${isMobile && slide.mobileSrc ? slide.mobileSrc : slide.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <video
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{
                objectFit: "cover",
                width: "100%",
                height: "100%"
              }}
              autoPlay
              loop
              muted
              playsInline
              poster={slide.poster}
            >
              <source src={slide.src} type="video/mp4" />
            </video>
          )}

          {/* Gradient Overlay */}
          {slide.gradient?.enabled && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100"
              style={getGradientStyle(slide)}
            />
          )}

          {/* Text Overlay */}
          {slide.overlay && (
            <div
              className={`position-absolute top-0 start-0 w-100 h-100 d-flex ${getPositionClasses(slide.overlay.position)}`}
              style={getOverlayOffsetStyle(slide.overlay)}
            >
              <div className="text-center" style={{ maxWidth: "800px", zIndex: 10 }}>
                <AnimatePresence>
                  {/* Heading */}
                  <motion.h1
                    key={`heading-${currentSlide}`}
                    {...getAnimationVariants(slide.overlay.heading.animation)}
                    transition={{
                      duration: slide.overlay.heading.animationDuration / 1000,
                      delay: slide.overlay.heading.animationDelay / 1000,
                    }}
                    className="hero-heading"
                    style={{
                      fontSize: `clamp(28px, 7vw, ${slide.overlay.heading.fontSize}px)`,
                      fontWeight: slide.overlay.heading.fontWeight,
                      fontFamily: slide.overlay.heading.fontFamily,
                      color: slide.overlay.heading.color,
                      marginBottom: `${slide.overlay.spacing.betweenHeadingSubheading}px`,
                      textShadow: `
                        0 2px 4px rgba(0, 0, 0, 0.3),
                        0 4px 8px rgba(0, 0, 0, 0.2),
                        0 8px 16px rgba(0, 0, 0, 0.1),
                        2px 2px 0 rgba(0, 0, 0, 0.4)
                      `,
                      lineHeight: 1.2,
                    }}
                  >
                    {slide.overlay.heading.text}
                  </motion.h1>

                  {/* Subheading */}
                  {slide.overlay.subheading && (
                    <motion.p
                      key={`subheading-${currentSlide}`}
                      {...getAnimationVariants(slide.overlay.subheading.animation)}
                      transition={{
                        duration: slide.overlay.subheading.animationDuration / 1000,
                        delay: slide.overlay.subheading.animationDelay / 1000,
                      }}
                      className="hero-subheading"
                      style={{
                        fontSize: `clamp(16px, 4vw, ${slide.overlay.subheading.fontSize}px)`,
                        fontWeight: slide.overlay.subheading.fontWeight,
                        fontFamily: slide.overlay.subheading.fontFamily,
                        color: slide.overlay.subheading.color,
                        marginBottom: `${slide.overlay.spacing.betweenSubheadingButtons}px`,
                        textShadow: `
                          0 1px 3px rgba(0, 0, 0, 0.3),
                          0 2px 6px rgba(0, 0, 0, 0.2),
                          0 4px 12px rgba(0, 0, 0, 0.1),
                          1px 1px 0 rgba(0, 0, 0, 0.4)
                        `,
                        lineHeight: 1.4,
                      }}
                    >
                      {slide.overlay.subheading.text}
                    </motion.p>
                  )}

                  {/* Buttons */}
                  {slide.overlay.buttons.length > 0 && (
                    <div className="d-flex gap-2 gap-md-3 justify-content-center flex-wrap" style={{ marginTop: `${slide.overlay.spacing.betweenSubheadingButtons}px` }}>
                      {slide.overlay.buttons.map((button, index) => (
                        <motion.a
                          key={index}
                          href={button.href}
                          {...getAnimationVariants(button.animation)}
                          transition={{
                            duration: button.animationDuration / 1000,
                            delay: button.animationDelay / 1000,
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
        </motion.div>
      </AnimatePresence>

      {/* Navigation Dots */}
      {showDots && slides.length > 1 && (
        <div
          className="position-absolute bottom-0 start-50 translate-middle-x mb-4 d-flex gap-2"
          style={{ zIndex: 20 }}
        >
          {slides.map((_, index) => (
            <button
              key={index}
              className={`rounded-circle border-0 ${index === currentSlide ? "bg-white" : "bg-white bg-opacity-50"}`}
              style={{
                width: index === currentSlide ? "12px" : "8px",
                height: index === currentSlide ? "12px" : "8px",
                transition: "all 0.3s ease",
              }}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
