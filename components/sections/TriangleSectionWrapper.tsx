"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import TriangleOverlay from "./TriangleOverlay";
import type { SectionConfig } from "@/types/section";

/**
 * TriangleSectionWrapper
 *
 * Client component that renders a triangle overlay INSIDE the section element
 * using React portal. Matches prototype behavior:
 * - No wrapper div (preserves offsetTop for scroll snap)
 * - Triangle rendered inside section with position: absolute
 * - Section gets overflow: visible so triangle extends above
 */
interface TriangleSectionWrapperProps {
  section: SectionConfig;
  children: React.ReactNode;
}

export default function TriangleSectionWrapper({
  section,
  children,
}: TriangleSectionWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [sectionEl, setSectionEl] = useState<HTMLElement | null>(null);

  // Find the actual section element and configure for triangle visibility:
  // - overflow: visible so the triangle isn't clipped by its own section
  // - z-index: 50 so the triangle (extending upward into the previous section)
  //   renders ABOVE the previous section's LowerThirdRenderer (z-index: 10)
  //   and MotionElementRenderer (z-index: 5/15/25). Always on top — no exception.
  useEffect(() => {
    const el = document.getElementById(section.id);
    if (el) {
      el.style.overflow = "visible";
      el.style.zIndex = "50";
      setSectionEl(el);
    }
    return () => {
      if (el) {
        el.style.overflow = "";
        el.style.zIndex = "";
      }
    };
  }, [section.id]);

  return (
    <>
      {children}
      {sectionEl &&
        createPortal(
          <TriangleOverlay
            sectionId={section.id}
            side={(section.triangleSide as "left" | "right") || "right"}
            color={section.triangleColor1 || "#4ecdc4"}
            height={section.triangleHeight || 200}
            targetSectionId={section.triangleTargetId || ""}
            triangleShape={
              (section.triangleShape as import("@/types/triangle").TriangleShape) || "modern"
            }
            clickToSnapEnabled={true}
            gradientType={
              (section.triangleGradientType as "solid" | "linear" | "radial") || "solid"
            }
            gradientColor1={section.triangleColor1 || "#4ecdc4"}
            gradientColor2={section.triangleColor2 || "#6a82fb"}
            gradientAlpha1={section.triangleAlpha1 || 100}
            gradientAlpha2={section.triangleAlpha2 || 100}
            gradientAngle={section.triangleAngle || 45}
            imageUrl={section.triangleImageUrl || ""}
            imageSize={
              (section.triangleImageSize as "cover" | "contain" | "auto") || "cover"
            }
            imagePosition={section.triangleImagePos || "center"}
            imageOpacity={section.triangleImageOpacity || 100}
            imageX={section.triangleImageX ?? 50}
            imageY={section.triangleImageY ?? 50}
            imageScale={section.triangleImageScale ?? 100}
            hoverTextEnabled={section.hoverTextEnabled || false}
            hoverText={section.hoverText || ""}
            textStyle={
              (section.hoverTextStyle as import("@/types/triangle").TextStyle) || 1
            }
            fontSize={section.hoverFontSize || 18}
            fontFamily={section.hoverFontFamily || "Arial"}
            animationType={
              (section.hoverAnimationType as import("@/types/triangle").AnimationType) || "slide"
            }
            textFromBehind={section.hoverAnimateBehind !== false}
            offsetX={section.hoverOffsetX || 0}
            isHovered={isHovered}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            previewMode={false}
            alwaysShowText={section.hoverAlwaysShow || false}
          />,
          sectionEl
        )}
    </>
  );
}
