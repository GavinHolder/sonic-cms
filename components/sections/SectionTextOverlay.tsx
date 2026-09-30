"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationType } from "@/types/section";
import { ENTRANCE_VISIBILITY_THRESHOLD } from "@/lib/anime";

interface SectionTextOverlayProps {
  heading?: string;
  subheading?: string;
  animation?: AnimationType;
  position?: string;
  /** Text color - defaults to white for visibility on backgrounds */
  textColor?: string;
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  center: { alignItems: "center", justifyContent: "center", textAlign: "center" },
  left: { alignItems: "center", justifyContent: "flex-start", textAlign: "left", paddingLeft: "5%" },
  right: { alignItems: "center", justifyContent: "flex-end", textAlign: "right", paddingRight: "5%" },
  topLeft: { alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left", paddingTop: "120px", paddingLeft: "5%" },
  topCenter: { alignItems: "flex-start", justifyContent: "center", textAlign: "center", paddingTop: "120px" },
  topRight: { alignItems: "flex-start", justifyContent: "flex-end", textAlign: "right", paddingTop: "120px", paddingRight: "5%" },
  bottomLeft: { alignItems: "flex-end", justifyContent: "flex-start", textAlign: "left", paddingBottom: "80px", paddingLeft: "5%" },
  bottomCenter: { alignItems: "flex-end", justifyContent: "center", textAlign: "center", paddingBottom: "80px" },
  bottomRight: { alignItems: "flex-end", justifyContent: "flex-end", textAlign: "right", paddingBottom: "80px", paddingRight: "5%" },
};

function getAnimationStyles(animation: AnimationType, isVisible: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    transition: "opacity 0.8s ease, transform 0.8s ease",
  };

  if (!isVisible) {
    switch (animation) {
      case "slideUp":
        return { ...base, opacity: 0, transform: "translateY(40px)" };
      case "slideDown":
        return { ...base, opacity: 0, transform: "translateY(-40px)" };
      case "slideLeft":
        return { ...base, opacity: 0, transform: "translateX(40px)" };
      case "slideRight":
        return { ...base, opacity: 0, transform: "translateX(-40px)" };
      case "zoom":
        return { ...base, opacity: 0, transform: "scale(0.85)" };
      case "fade":
        return { ...base, opacity: 0 };
      case "none":
      default:
        return { opacity: 1 };
    }
  }

  return { ...base, opacity: 1, transform: "translateY(0) translateX(0) scale(1)" };
}

/**
 * SectionTextOverlay
 *
 * Renders a text overlay (heading + subheading) positioned absolutely over
 * a section. Animates into view when the section scrolls into the viewport.
 */
export default function SectionTextOverlay({
  heading,
  subheading,
  animation = "fade",
  position = "center",
  textColor = "#ffffff",
}: SectionTextOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (animation === "none") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: ENTRANCE_VISIBILITY_THRESHOLD }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animation]);

  if (!heading && !subheading) return null;

  const posStyle = POSITION_STYLES[position] || POSITION_STYLES.center;

  return (
    <div
      ref={ref}
      className="section-text-overlay"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        zIndex: 5,
        pointerEvents: "none",
        ...posStyle,
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          pointerEvents: "auto",
          ...getAnimationStyles(animation, isVisible),
        }}
      >
        {heading && (
          <h2
            style={{
              fontSize: "clamp(28px, 5vw, 56px)",
              fontWeight: 700,
              color: textColor,
              marginBottom: subheading ? "16px" : 0,
              textShadow: "0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)",
              lineHeight: 1.2,
            }}
          >
            {heading}
          </h2>
        )}
        {subheading && (
          <p
            style={{
              fontSize: "clamp(16px, 3vw, 24px)",
              fontWeight: 400,
              color: textColor,
              margin: 0,
              opacity: 0.9,
              textShadow: "0 1px 3px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)",
              lineHeight: 1.4,
            }}
          >
            {subheading}
          </p>
        )}
      </div>
    </div>
  );
}
