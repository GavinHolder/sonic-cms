"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToHashSectionWhenReady, stripSectionHash } from "@/lib/navigation-utils";

export default function ScrollRestoration() {
  const pathname = usePathname();

  // Deep link to a section (/page#<sectionId>): after the scroll-to-top resets on load /
  // route change, bring the section named by the hash into view. Public + /preview only.
  // Deliberately no hashchange listener that SCROLLS: same-page #links already scroll natively.
  // Once the section hash has done its job it is removed from the address bar (replaceState:
  // no navigation, no scroll, no new history entry) so a reload starts at the top. Also when
  // the visitor's own input cancelled the pending scroll, otherwise the next reload jumps again.
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    return scrollToHashSectionWhenReady(window.location.hash, {
      onScrolled: () => stripSectionHash(),
      onUserCancel: () => stripSectionHash(),
    });
  }, [pathname]);

  // Same-page #section link (hero buttons are plain anchors): the browser has already
  // started its own scroll when hashchange fires. This listener only cleans the address
  // bar; it must never scroll (a scrolling hashchange listener was removed in 5b65183).
  useEffect(() => {
    const onHashChange = (): void => {
      stripSectionHash();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);


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
