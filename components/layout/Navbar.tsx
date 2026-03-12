"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { getSections } from "@/lib/section-manager";
import { defaultNavbarConfig, type NavbarCtaButton } from "@/lib/navbar-config";

// Map feature slug → navbar entry
const FEATURE_ROUTES: Record<string, { label: string; href: string; icon: string }> = {
  "concrete-calculator": { label: "Concrete Calculator", href: "/calculator", icon: "bi-calculator" },
};

const ctaStyleToVariant = (style: NavbarCtaButton["style"]): "primary" | "outline" | "ghost" => {
  if (style === "outlined") return "outline";
  if (style === "ghost") return "ghost";
  return "primary";
};

export default function Navbar() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  const [mobileOpen, setMobileOpen] = useState(false);
  // Non-landing pages always appear in scrolled state (solid bg, links visible)
  const [scrolled, setScrolled] = useState(!isLandingPage);
  const [navLinks, setNavLinks] = useState<Array<{ id: string; label: string }>>([]);
  const [isDarkBackground, setIsDarkBackground] = useState(isLandingPage);
  const [ctaConfig, setCtaConfig] = useState<NavbarCtaButton>(defaultNavbarConfig.cta);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Load dynamic nav links from sections
  useEffect(() => {
    const loadNavLinks = async () => {
      try {
        // Load sections from database API
        const sections = await getSections("/");

        // Filter out hero and footer sections, take first 5, only enabled sections
        // Movable sections (cta, normal) become nav links for scroll-to navigation
        // Reverse order so first created section is closest to Client Login button
        // Also filter out sections with names that match buttons (to avoid duplicates)
        // Truncate a label to the first word only (hard mobile limit)
        const firstWord = (str: string) => str.trim().split(/\s+/)[0] || "";

        const filteredSections = sections
          .filter(
            (section: any) =>
              section.enabled &&
              section.type !== "HERO" &&
              section.type !== "FOOTER" &&
              section.type !== "CTA_FOOTER"
          )
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .slice(0, 5) // Hard limit: first 5 sections only
          // lowest order = leftmost navbar item (matches landing page top-to-bottom order)
          .map((section: any) => ({
            id: section.id,
            // navLabel takes priority; fall back to displayName. Truncate to first word.
            label: firstWord(section.navLabel || section.displayName || ""),
          }))
          .filter(
            (link: any) =>
              // Exclude empty labels and Client Login duplicate
              link.label !== "" &&
              link.label.toLowerCase() !== "client login"
          );

        setNavLinks(filteredSections);
      } catch (error) {
        console.error("📍 Navbar: Error loading sections from API", error);
        setNavLinks([]);
      }
    };

    const loadCtaConfig = async () => {
      try {
        const res = await fetch("/api/navbar");
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.cta) setCtaConfig(json.data.cta);
        }
      } catch {
        // Keep default on error
      }
    };

    loadNavLinks();
    loadCtaConfig();

    // Load enabled public features for Tools dropdown
    fetch("/api/features/public")
      .then((r) => r.json())
      .then((d) => { if (d.slugs) setEnabledFeatures(d.slugs); })
      .catch(() => {});

    // Reload links and CTA config periodically to detect admin updates (every 5 seconds)
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadNavLinks();
        loadCtaConfig();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Close Tools dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Detect background color behind navbar
  useEffect(() => {
    const detectBackgroundColor = () => {
      // Get navbar position
      const navbar = document.querySelector("nav");
      if (!navbar) return;

      const navbarRect = navbar.getBoundingClientRect();
      const centerX = navbarRect.left + navbarRect.width / 2;
      const centerY = navbarRect.top + navbarRect.height / 2;

      // Temporarily hide navbar to detect element behind it
      navbar.style.pointerEvents = "none";
      const elementBehind = document.elementFromPoint(centerX, centerY);
      navbar.style.pointerEvents = "";

      if (!elementBehind) {
        setIsDarkBackground(true); // Default to dark
        return;
      }

      // Get computed background color
      const bgColor = window.getComputedStyle(elementBehind).backgroundColor;

      // Parse RGB values
      const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!rgbMatch) {
        setIsDarkBackground(true); // Default to dark
        return;
      }

      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);

      // Calculate luminance (perceived brightness)
      // Formula: (0.299*R + 0.587*G + 0.114*B)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // If luminance > 0.5, it's a light background (use dark text)
      // If luminance <= 0.5, it's a dark background (use white text)
      setIsDarkBackground(luminance <= 0.5);
    };

    detectBackgroundColor();

    // Re-detect on scroll
    // Listen to #snap-container (the actual scroll container) with fallback to window
    const container = document.getElementById("snap-container");
    const handleScroll = () => {
      if (!isLandingPage) return; // Non-landing pages stay scrolled always
      const scrollTop = container ? container.scrollTop : (document.body.scrollTop || window.scrollY);
      const isScrolled = scrollTop > 20;
      setScrolled(isScrolled);
      if (isScrolled && window.innerWidth >= 768) {
        setMobileOpen(false);
      }
      detectBackgroundColor();
    };

    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // On non-landing pages: always solid navbar, no animations
  const effectiveScrolled = !isLandingPage || scrolled;
  const navTransition = isLandingPage ? "600ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setMobileOpen(false); // Close mobile menu after click
    }
  };

  return (
    <nav
      className={`navbar fixed-top ${effectiveScrolled ? "navbar-scrolled" : "navbar-transparent"}`}
      style={{
        padding: "1rem 0",
        zIndex: 1050,
        overflow: "visible",
      }}
    >
      <div
        className="container-fluid px-4"
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          overflow: "visible",
          position: "relative",
        }}
      >
        <div className="d-flex align-items-center justify-content-between position-relative w-100" style={{ minHeight: "44px" }}>
          {/* Hamburger / Close button - Desktop (LEFT side, only show if links exist) */}
          {navLinks.length > 0 && (
            <div className="d-none d-md-block" style={{ position: "relative", width: "28px", height: "28px", zIndex: 100 }}>
              {/* Hamburger icon - shown when navbar is transparent (not scrolled, not open) */}
              <button
                className="p-0 bg-transparent border-0"
                onClick={() => setMobileOpen(true)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  outline: "none",
                  cursor: "pointer",
                  opacity: effectiveScrolled || mobileOpen ? 0 : 1,
                  visibility: effectiveScrolled || mobileOpen ? "hidden" : "visible",
                  transition: `opacity ${navTransition}, visibility ${navTransition}`,
                  pointerEvents: effectiveScrolled || mobileOpen ? "none" : "auto",
                }}
              >
                <svg
                  style={{
                    width: "28px",
                    height: "28px",
                    color: isDarkBackground ? "#ffffff" : "#000000",
                  }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Close (X) icon - shown only when hamburger menu is manually opened */}
              <button
                className="p-0 bg-transparent border-0"
                onClick={() => setMobileOpen(false)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  outline: "none",
                  cursor: "pointer",
                  opacity: mobileOpen && !effectiveScrolled ? 1 : 0,
                  visibility: mobileOpen && !effectiveScrolled ? "visible" : "hidden",
                  transition: `opacity ${navTransition}, visibility ${navTransition}`,
                  pointerEvents: mobileOpen && !effectiveScrolled ? "auto" : "none",
                }}
              >
                <svg
                  style={{
                    width: "28px",
                    height: "28px",
                    color: isDarkBackground ? "#ffffff" : "#000000",
                  }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Logo - CSS transition from center to left on scroll OR hamburger click */}
          <div
            className="d-flex align-items-center"
            style={{
              position: effectiveScrolled || mobileOpen ? "relative" : "absolute",
              left: effectiveScrolled || mobileOpen ? "0" : "50%",
              transform: effectiveScrolled || mobileOpen ? "translateX(0)" : "translateX(-50%)",
              transition: `all ${navTransition}`,
              zIndex: 200,
            }}
          >
            <Link href="/" className="d-flex align-items-center gap-2 text-decoration-none">
              <span style={{ height: "44px", display: "flex", alignItems: "center", fontWeight: 700, fontSize: "1.2rem", color: effectiveScrolled ? "#111827" : "#fff" }}>
                Your Company
              </span>
            </Link>
          </div>

          {/* Right side: Nav links + Client Login */}
          <div className="d-flex align-items-center gap-3" style={{ marginLeft: "auto", position: "relative", zIndex: 100 }}>
            {/* Desktop: Horizontal nav links (inline, to LEFT of Client Login when scrolled or hamburger open) */}
            {navLinks.length > 0 && (
              <div
                className="d-none d-md-flex align-items-center gap-4"
                style={{
                  opacity: effectiveScrolled || mobileOpen ? 1 : 0,
                  visibility: effectiveScrolled || mobileOpen ? "visible" : "hidden",
                  transition: `opacity ${navTransition}, visibility ${navTransition}`,
                }}
              >
                {navLinks.map((link, index) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      scrollToSection(link.id);
                      setMobileOpen(false);
                    }}
                    className="text-decoration-none fw-medium border-0 bg-transparent p-0 position-relative"
                    style={{
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      color: effectiveScrolled ? "#111827" : "#ffffff",
                      fontSize: "0.95rem",
                      letterSpacing: "0.01em",
                      transition: `opacity 200ms ease, color ${navTransition}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
            {/* Tools dropdown — shown when at least one feature is enabled */}
            {enabledFeatures.filter((s) => FEATURE_ROUTES[s]).length > 0 && (
              <div
                ref={toolsRef}
                className="d-none d-md-block position-relative"
                style={{
                  opacity: effectiveScrolled || mobileOpen ? 1 : 0,
                  visibility: effectiveScrolled || mobileOpen ? "visible" : "hidden",
                  transition: `opacity ${navTransition}, visibility ${navTransition}`,
                }}
              >
                <button
                  className="text-decoration-none fw-medium border-0 bg-transparent p-0 d-flex align-items-center gap-1"
                  style={{
                    cursor: "pointer",
                    color: effectiveScrolled ? "#111827" : "#ffffff",
                    fontSize: "0.95rem",
                    letterSpacing: "0.01em",
                    transition: `color ${navTransition}`,
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => setToolsOpen((o) => !o)}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Tools
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ marginLeft: 3, transition: "transform 200ms", transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Tools dropdown panel */}
                <AnimatePresence>
                  {toolsOpen && (
                    <motion.div
                      className="position-absolute bg-white rounded shadow-lg py-1"
                      style={{ top: "calc(100% + 10px)", right: 0, minWidth: 200, zIndex: 2000 }}
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {enabledFeatures
                        .filter((s) => FEATURE_ROUTES[s])
                        .map((slug) => {
                          const ft = FEATURE_ROUTES[slug];
                          return (
                            <Link
                              key={slug}
                              href={ft.href}
                              className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none"
                              style={{ color: "#111827", fontSize: "0.9rem", transition: "background 150ms" }}
                              onClick={() => setToolsOpen(false)}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                            >
                              <i className={ft.icon} style={{ color: "#3b82f6" }} />
                              {ft.label}
                            </Link>
                          );
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* CTA button - always visible on desktop, always far right */}
            {ctaConfig.show && (
              <div className="d-none d-md-block">
                <Button href={ctaConfig.href} variant={ctaStyleToVariant(ctaConfig.style)} size="sm">
                  {ctaConfig.text}
                </Button>
              </div>
            )}

            {/* Hamburger menu - Mobile (always visible) */}
            <div className="d-md-none">
              <button
                className="p-0 bg-transparent border-0"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{ outline: "none", cursor: "pointer" }}
                aria-label="Open menu"
              >
                <svg
                  style={{ width: "28px", height: "28px", color: effectiveScrolled ? "#111827" : "#ffffff" }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="position-absolute start-0 end-0 bg-white rounded shadow-lg d-md-none"
              style={{
                top: "calc(100% + 0.5rem)",
                marginLeft: "1rem",
                marginRight: "1rem",
                zIndex: 1000,
              }}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="d-flex flex-column py-2">
                {navLinks.map((link, index) => (
                  <motion.button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="text-decoration-none fw-medium px-4 py-2 dropdown-link d-block border-0 bg-transparent text-center w-100"
                    style={{ color: "#111827", whiteSpace: "nowrap", cursor: "pointer" }}
                    whileHover={{ backgroundColor: "#f3f4f6" }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    {link.label}
                  </motion.button>
                ))}

                {/* Tools section in mobile menu */}
                {enabledFeatures.filter((s) => FEATURE_ROUTES[s]).length > 0 && (
                  <>
                    <div className="px-4 pt-2 pb-1" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase" }}>
                      Tools
                    </div>
                    {enabledFeatures
                      .filter((s) => FEATURE_ROUTES[s])
                      .map((slug, index) => {
                        const ft = FEATURE_ROUTES[slug];
                        return (
                          <motion.div key={slug}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: (navLinks.length + index) * 0.05 }}
                          >
                            <Link
                              href={ft.href}
                              className="d-flex align-items-center justify-content-center gap-2 px-4 py-2 text-decoration-none fw-medium"
                              style={{ color: "#111827", fontSize: "0.95rem" }}
                              onClick={() => setMobileOpen(false)}
                            >
                              <i className={ft.icon} style={{ color: "#3b82f6" }} />
                              {ft.label}
                            </Link>
                          </motion.div>
                        );
                      })}
                  </>
                )}

                {ctaConfig.show && (
                  <motion.div
                    className="px-4 py-2 text-center"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: navLinks.length * 0.05 }}
                  >
                    <Button href={ctaConfig.href} variant={ctaStyleToVariant(ctaConfig.style)} size="sm" className="w-100">
                      {ctaConfig.text}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
