"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { getSections } from "@/lib/section-manager";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navLinks, setNavLinks] = useState<Array<{ id: string; label: string }>>([]);
  const [isDarkBackground, setIsDarkBackground] = useState(true); // Default to dark (white text)

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

    loadNavLinks();

    // Reload links periodically to detect admin updates (every 5 seconds)
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadNavLinks();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
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
      className={`navbar fixed-top ${scrolled ? "navbar-scrolled" : "navbar-transparent"}`}
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
                  opacity: scrolled || mobileOpen ? 0 : 1,
                  visibility: scrolled || mobileOpen ? "hidden" : "visible",
                  transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), visibility 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                  pointerEvents: scrolled || mobileOpen ? "none" : "auto",
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
                  opacity: mobileOpen && !scrolled ? 1 : 0,
                  visibility: mobileOpen && !scrolled ? "visible" : "hidden",
                  transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), visibility 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                  pointerEvents: mobileOpen && !scrolled ? "auto" : "none",
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
              position: scrolled || mobileOpen ? "relative" : "absolute",
              left: scrolled || mobileOpen ? "0" : "50%",
              transform: scrolled || mobileOpen ? "translateX(0)" : "translateX(-50%)",
              transition: "all 600ms cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 200,
            }}
          >
            <Link href="/" className="d-flex align-items-center gap-2 text-decoration-none">
              <span style={{ height: "44px", display: "flex", alignItems: "center", fontWeight: 700, fontSize: "1.2rem", color: "#fff" }}>
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
                  opacity: scrolled || mobileOpen ? 1 : 0,
                  visibility: scrolled || mobileOpen ? "visible" : "hidden",
                  transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1), visibility 600ms cubic-bezier(0.4, 0, 0.2, 1)",
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
                      color: scrolled ? "#111827" : "#ffffff",
                      fontSize: "0.95rem",
                      letterSpacing: "0.01em",
                      transition: "opacity 200ms ease, color 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
            {/* Client Login - always visible on desktop, always far right */}
            <div className="d-none d-md-block">
              <Button href="/client-login" variant="primary" size="sm">
                Client Login
              </Button>
            </div>

            {/* Hamburger menu - Mobile (always visible) */}
            <div className="d-md-none">
              <button
                className="p-0 bg-transparent border-0"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{ outline: "none", cursor: "pointer" }}
                aria-label="Open menu"
              >
                <svg
                  style={{ width: "28px", height: "28px", color: isDarkBackground ? "#ffffff" : "#111827" }}
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
                <motion.div
                  className="px-4 py-2 text-center"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: navLinks.length * 0.05 }}
                >
                  <Button href="/client-login" variant="primary" size="sm" className="w-100">
                    Client Login
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
