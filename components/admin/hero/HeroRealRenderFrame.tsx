"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { heroFrameCss, HERO_FRAME_SRC_DOC } from "@/lib/hero/hero-frame";

/**
 * The ONE place the Hero editor hosts the REAL <HeroCarousel> inside an isolated iframe.
 * Both the Live Preview panel (HeroCarouselEditor) and the Tablet / Mobile freeform canvas
 * (HeroRealCanvas) render through this component, so they share the same frame, the same
 * stylesheet mirroring and the same "hero is exactly one viewport tall" rule - they cannot
 * disagree with each other, or with the real page.
 *
 * Why an iframe (not a styled div): it gives the hero its own browsing context, so its
 * `vw`-based clamp() font sizes and `100vh` heights resolve against THIS iframe's size
 * (375 / 768 / the real window) instead of the admin's monitor. The visual fit-to-pane
 * shrink is a CSS `transform: scale()` on the iframe, which does not change the layout size
 * `vw` / `vh` resolve against.
 *
 * ASSUMPTIONS:
 * 1. Rendered inside a `position: relative` box whose size is viewport * scale; the iframe
 *    is absolutely placed at that box's top-left.
 * 2. `scale` > 0 (callers don't mount the frame while the scale is still unmeasured).
 * 3. `children` is the hero; it is portaled into the iframe's own #root.
 *
 * FAILURE MODES:
 * - The iframe ref callback MUST keep a stable identity (useCallback with no deps). A new
 *   function each render makes React detach(null)/re-attach it on EVERY render; the null
 *   call clears the portal target and nothing sets it again (onLoad fires once per real
 *   document load, not per ref attach) - the frame then goes permanently blank.
 * - The portal target is cleared on genuine unmount so we never portal into a detached
 *   document.
 */
interface HeroRealRenderFrameProps {
  /** Accessible title of the iframe. */
  title: string;
  /** The virtual viewport (device size / real window) the hero renders into, in layout px. */
  viewport: { w: number; h: number };
  /** Visual shrink applied to the iframe (outer px per layout px). */
  scale: number;
  /** Real navbar height - pinned as --navbar-height inside the frame. */
  navbarHeight: number;
  /** Extra CSS appended after the frame rules (the canvas's "freeze entrance animations" rules). */
  extraCss?: string;
  /** Receives the iframe's #root once the frame is ready (null on teardown). The canvas
   *  measures the real elements through this. */
  onRoot?: (root: HTMLElement | null) => void;
  /** The hero (portaled into the frame). */
  children: ReactNode;
}

export default function HeroRealRenderFrame({
  title,
  viewport,
  scale,
  navbarHeight,
  extraCss,
  onRoot,
  children,
}: HeroRealRenderFrameProps) {
  // The <iframe> DOM node itself (used only in onLoad, to reach contentDocument) and the
  // #root div INSIDE its own document (set once onLoad fires), which the hero is portaled into.
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  // Fires once, when the iframe's blank document finishes loading. Sets up the #root portal
  // target and a one-time base reset, then hands off to the mirroring effect below.
  const handleLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    let root = doc.getElementById("root");
    if (!root) {
      root = doc.createElement("div");
      root.id = "root";
      doc.body.appendChild(root);
    }
    // Minimal reset so the iframe's own html/body don't add default margin - kept out of the
    // mirrored-stylesheet set (a distinct id) so the sync effect never removes it when it
    // clears/re-clones mirrored nodes.
    if (!doc.getElementById("preview-base-reset")) {
      const base = doc.createElement("style");
      base.id = "preview-base-reset";
      base.textContent = "html,body{margin:0;padding:0;}";
      doc.head.appendChild(base);
    }
    setPortalRoot(root);
  };

  // Stable-identity ref callback - see FAILURE MODES above.
  const setIframeNode = useCallback((node: HTMLIFrameElement | null) => {
    iframeRef.current = node;
    // null = genuine unmount: clear the stale portal target immediately.
    if (!node) setPortalRoot(null);
  }, []);

  // Keeps the iframe's stylesheets in sync with the admin app's real <head> for the lifetime
  // of the frame. Next.js can inject/update <style>/<link> tags after initial mount (CSS
  // modules, CSS-in-JS, font loading), so a one-time copy on load isn't sufficient - this
  // clones the CURRENT set on every head mutation.
  useEffect(() => {
    if (!portalRoot) return;
    const iframeDoc = portalRoot.ownerDocument;
    if (!iframeDoc) return;

    const syncStyles = () => {
      iframeDoc.head.querySelectorAll("[data-mirrored-style]").forEach((n) => n.remove());
      document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute("data-mirrored-style", "true");
        iframeDoc.head.appendChild(clone);
      });
    };

    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [portalRoot]);

  // Hand the ready #root to the owner (the canvas measures through it). Kept in a ref so an
  // unstable callback identity can never re-run the effect below.
  const onRootRef = useRef(onRoot);
  useEffect(() => {
    onRootRef.current = onRoot;
  });
  useEffect(() => {
    onRootRef.current?.(portalRoot);
    return () => onRootRef.current?.(null);
  }, [portalRoot]);

  return (
    <>
      <iframe
        ref={setIframeNode}
        title={title}
        srcDoc={HERO_FRAME_SRC_DOC}
        onLoad={handleLoad}
        width={viewport.w}
        height={viewport.h}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${viewport.w}px`,
          height: `${viewport.h}px`,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
      {portalRoot &&
        createPortal(
          <>
            {/* No scoping class needed: this portals into the iframe's own isolated document,
                which contains nothing else these rules could leak onto. */}
            <style>{heroFrameCss(viewport.h, navbarHeight) + (extraCss ?? "")}</style>
            {children}
          </>,
          portalRoot
        )}
    </>
  );
}
