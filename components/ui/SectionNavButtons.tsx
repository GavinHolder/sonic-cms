"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SectionNavButtons - Jump to hero (top) and previous section buttons.
 *
 * Both buttons appear only after section 2 (i.e. when the user has scrolled
 * past the hero + first content section). Uses #snap-container as the scroll
 * container to match the snap system.
 */
export default function SectionNavButtons() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalSections, setTotalSections] = useState(0);

  const getContainer = useCallback(() => document.getElementById("snap-container"), []);

  const getSectionElements = useCallback(() => {
    return Array.from(document.querySelectorAll("#snap-container section, #snap-container footer"));
  }, []);

  // Track which section the user is on based on scroll position
  useEffect(() => {
    const container = getContainer();
    if (!container) return;

    const updateCurrentSection = () => {
      const sections = getSectionElements();
      setTotalSections(sections.length);
      // Each section is 100vh in the snap system — floor division is exact
      const index = Math.floor(container.scrollTop / container.clientHeight);
      setCurrentIndex(Math.min(index, sections.length - 1));
    };

    updateCurrentSection();
    container.addEventListener("scroll", updateCurrentSection, { passive: true });
    return () => container.removeEventListener("scroll", updateCurrentSection);
  }, [getContainer, getSectionElements]);

  const scrollToHero = () => {
    const container = getContainer();
    if (!container) return;
    container.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToPreviousSection = () => {
    const container = getContainer();
    if (!container) return;

    const sections = getSectionElements();
    const targetIndex = Math.max(0, currentIndex - 1);
    const target = sections[targetIndex] as HTMLElement | undefined;
    if (target) {
      container.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    }
  };

  // Show buttons only after section index 2 (hero=0, first section=1, second section=2+)
  const showButtons = currentIndex >= 2;

  return (
    <>
      {/* Jump to Hero (top) */}
      <AnimatePresence>
        {showButtons && (
          <motion.button
            onClick={scrollToHero}
            className="btn shadow-lg"
            style={{
              position: "fixed",
              bottom: "1.5rem",
              right: "1.5rem",
              zIndex: 1041,
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              backgroundColor: "#2563eb",
              color: "#ffffff",
            }}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            whileHover={{ scale: 1.1, boxShadow: "0 10px 25px rgba(37, 99, 235, 0.4)" }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            aria-label="Jump to top"
            title="Jump to top"
          >
            {/* Double chevron up icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Jump to Previous Section */}
      <AnimatePresence>
        {showButtons && (
          <motion.button
            onClick={scrollToPreviousSection}
            className="btn shadow-lg"
            style={{
              position: "fixed",
              bottom: "4.75rem",
              right: "1.5rem",
              zIndex: 1041,
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              backgroundColor: "#6c757d",
              color: "#ffffff",
            }}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            whileHover={{ scale: 1.1, boxShadow: "0 10px 25px rgba(108, 117, 125, 0.4)" }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            aria-label="Previous section"
            title="Previous section"
          >
            {/* Single chevron up icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
