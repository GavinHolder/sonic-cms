"use client";

import { useEffect } from "react";

export default function ScrollRestoration() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    // Scroll the snap container (or fallback to window)
    const container = document.getElementById("snap-container");
    if (container) {
      container.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
    }
  }, []);

  // Multi-section free-scroll: disable CSS snap while the user is scrolling inside
  // a multi-height section (data-content-mode="multi"), re-enable on exit so
  // adjacent sections still snap normally.
  useEffect(() => {
    const container = document.getElementById("snap-container");
    if (!container) return;

    let snapDisabled = false;

    /** Returns the multi-section boundaries if the viewport is currently within one. */
    const getActiveMultiSection = (scrollTop: number): { top: number; bottom: number } | null => {
      const vph = container.clientHeight;
      const sections = container.querySelectorAll<HTMLElement>('section[data-content-mode="multi"]');
      const containerRect = container.getBoundingClientRect();
      for (const sec of sections) {
        // Use getBoundingClientRect relative to the snap container to handle
        // sections inside positioned wrappers (e.g. ScrollStageWrapper) where
        // offsetTop would be relative to the wrapper, not the scroll container.
        const secRect = sec.getBoundingClientRect();
        const top = secRect.top - containerRect.top + scrollTop;
        const bottom = top + sec.offsetHeight;
        // Viewport fully inside the multi-section: start visible AND end not yet visible
        if (scrollTop >= top && scrollTop + vph <= bottom) {
          return { top, bottom };
        }
      }
      return null;
    };

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const insideMulti = getActiveMultiSection(scrollTop) !== null;

      if (insideMulti && !snapDisabled) {
        // Entered multi-section interior — let the user scroll freely
        container.style.scrollSnapType = "none";
        snapDisabled = true;
      } else if (!insideMulti && snapDisabled) {
        // Left the multi-section — restore snap so adjacent sections engage
        container.style.scrollSnapType = "y mandatory";
        snapDisabled = false;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      // Always restore snap on unmount
      if (snapDisabled) container.style.scrollSnapType = "";
    };
  }, []);

  return null;
}
