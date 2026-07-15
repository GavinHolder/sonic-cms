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

// Social platforms shown in the tall navbar (in order), with brand colours
const TALL_SOCIALS: Array<{ key: string; icon: string; color: string }> = [
  { key: "facebook",  icon: "bi-facebook",  color: "#1877f2" },
  { key: "instagram", icon: "bi-instagram",  color: "#e1306c" },
  { key: "tiktok",    icon: "bi-tiktok",     color: "#010101" },
  { key: "twitter",   icon: "bi-twitter-x",  color: "#000000" },
  { key: "youtube",   icon: "bi-youtube",    color: "#ff0000" },
  { key: "linkedin",  icon: "bi-linkedin",   color: "#0a66c2" },
];

// Height constants
const STANDARD_HEIGHT = 100; // px — matches globals.css --navbar-height default
const TALL_HEIGHT     = 140; // px

// ── Color-matched navbar (opt-in feature) ───────────────────────────────────
// v2: DOM-based CONTINUOUS color match. Instead of resolving a single section's
// stored bg fields (v1, which no-op'd because backgrounds are authored many
// different ways), we sample the live rendered pixel-owner directly beneath the
// navbar on every scroll frame and adopt its color if — and only if — it is a
// fully-opaque solid. Fully inert unless the colorMatchTopSection flag is on.

/**
 * If `bg` (a CSS `backgroundColor` computed value) is a FULLY-OPAQUE color,
 * return it; otherwise return null (transparent / semi-transparent).
 * getComputedStyle returns `rgb(...)` when opaque and `rgba(..., a)` otherwise,
 * so a missing 4th component means alpha === 1.
 */
function opaqueColorOrNull(bg: string | null | undefined): string | null {
  if (!bg) return null;
  const m = bg.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => s.trim());
  const alpha = parts.length >= 4 ? parseFloat(parts[3]) : 1;
  if (!(alpha >= 1)) return null; // rgba(...,0) / semi-transparent → not solid
  return bg;
}

/**
 * Given a resolved `.cms-section` element, return the color the navbar should
 * adopt — its EFFECTIVE background — or null if the section is genuinely NON-solid
 * (image / gradient / animated bg / transparent) and the navbar should fall back
 * to its normal treatment.
 *
 * Why section-based (not point-based): sampling a single point under the navbar
 * can land on a transparent child and miss a solid section ("nip one, slip one").
 * Resolving the whole section and reading its effective bg guarantees EVERY solid
 * section matches consistently as it passes under the bar — no gaps.
 *
 * A section's solid color is painted via `background-color: var(--section-bg)` on
 * the `.cms-section` element itself. A NON-solid treatment always manifests as
 * either (a) a `background-image` on the section element (image-on-section), or
 * (b) a full-bleed background LAYER child — every one of those (gradient overlay,
 * masked-image layer, AnimBgRenderer container) is rendered `position:absolute`
 * with `z-index:0`, which content (`.section-content-wrapper`, z20), text overlays
 * (z5) and 3D layers never are. So the presence of any absolute z-0 child ⇒ the
 * section has a covering non-solid background ⇒ fall back.
 */
function sectionEffectiveSolidColor(section: Element, navEl: Element | null): string | null {
  const scs = window.getComputedStyle(section);
  // (a) Image painted directly on the section (unmasked backgroundImage) → non-solid.
  if (scs.backgroundImage && scs.backgroundImage !== "none") return null;
  // (b) Any full-bleed background LAYER (gradient / masked image / animated bg) → non-solid.
  for (const child of Array.from(section.children)) {
    if (navEl && navEl.contains(child)) continue; // never let the nav count as a layer
    const ccs = window.getComputedStyle(child);
    const positioned = ccs.position === "absolute" || ccs.position === "fixed";
    if (positioned && ccs.zIndex === "0") return null;
  }
  // No covering treatment → the section's own solid color is what's visible.
  return opaqueColorOrNull(scs.backgroundColor);
}

/** Contrasting text color (dark on light bg, light on dark bg) via relative luminance. */
function contrastTextColor(color: string): string {
  let r = 255, g = 255, b = 255;
  if (color.startsWith("#")) {
    let h = color.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = color.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
  }
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0f111a" : "#ffffff";
}

export default function Navbar() {
  const pathname = usePathname();
  // A hero renders transparently at the top of these routes. Broadened from just "/"
  // so the admin Preview page (which renders the same hero) also gets the
  // transparent-over-hero treatment. Generic hero detection (in the scroll effect
  // below) extends this to any page that actually mounts a ".hero-carousel" element.
  const pathHasHero = pathname === "/" || pathname === "/preview/landing-page";

  // TODO(admin-toggle): expose `hideOverHero` in Settings → Navbar and return it from
  // /api/site-config. Until then it defaults false (current behaviour). Flip this
  // constant to true to preview the "hide over hero, reveal on scroll" mode locally.
  const HIDE_OVER_HERO_DEFAULT = false;
  const REVEAL_DELTA = 40; // px scrolled before the hidden-over-hero navbar reveals

  const [mobileOpen, setMobileOpen]       = useState(false);
  const [scrolled, setScrolled]           = useState(!pathHasHero);
  const [heroPresent, setHeroPresent]     = useState(pathHasHero);
  const [pastRevealDelta, setPastRevealDelta] = useState(!pathHasHero);
  const [hideOverHero, setHideOverHero]   = useState(HIDE_OVER_HERO_DEFAULT);
  const [navLinks, setNavLinks]           = useState<Array<{ id: string; label: string; href?: string }>>([]);
  const [isDarkBackground, setIsDarkBg]   = useState(pathHasHero);
  const [ctaConfig, setCtaConfig]         = useState<NavbarCtaButton>(defaultNavbarConfig.cta);
  const [toolsOpen, setToolsOpen]         = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [companyName, setCompanyName]     = useState("Your Company");
  const [logoUrl, setLogoUrl]             = useState("");
  const [navbarStyle, setNavbarStyle]     = useState<"standard" | "tall">("standard");
  const [navbarStyleLoaded, setNavbarStyleLoaded] = useState(false);
  const [phone, setPhone]                 = useState("");
  const [socials, setSocials]             = useState<Record<string, string>>({});
  // Color-matched navbar (opt-in). All default-off → these stay inert.
  const [colorMatchEnabled, setColorMatchEnabled] = useState(false);
  // v2: the live opaque solid color currently rendered under the navbar (null =
  // transparent / gradient / image / hero → no match, render normally).
  const [matchedColor, setMatchedColor]           = useState<string | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const navRef   = useRef<HTMLElement>(null);

  const isTall = navbarStyle === "tall";
  const navbarHeight = isTall ? TALL_HEIGHT : STANDARD_HEIGHT;

  // Sync --navbar-height CSS variable so sections automatically compensate.
  // Only update AFTER the site config has loaded — preserves the server-side
  // value set on <html> until we know the real style (prevents 140→100→140 flash).
  useEffect(() => {
    if (!navbarStyleLoaded) return;
    document.documentElement.style.setProperty("--navbar-height", `${navbarHeight}px`);
  }, [navbarHeight, navbarStyleLoaded]);

  // Lock body scroll while the mobile drawer is open so the page behind doesn't scroll. (#73)
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Load all dynamic data
  useEffect(() => {
    const loadNavLinks = async () => {
      try {
        // Try managed navbar links first
        const linksRes = await fetch("/api/navbar-links");
        if (linksRes.ok) {
          const { data } = await linksRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setNavLinks(data.slice(0, 5).map((l: any) => ({
              id: l.id, label: l.label, href: l.href,
            })));
            return;
          }
        }
        // Fallback: first 5 landing-page sections by order
        const sections = await getSections("/");
        const firstWord = (str: string) => str.trim().split(/\s+/)[0] || "";
        const filtered = sections
          .filter((s: any) => s.enabled && !["HERO", "FOOTER", "CTA_FOOTER"].includes(s.type))
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .slice(0, 5)
          .map((s: any) => ({ id: s.id, label: firstWord(s.navLabel || s.displayName || "") }))
          .filter((l: any) => l.label && l.label.toLowerCase() !== "client login");
        setNavLinks(filtered);
      } catch {
        setNavLinks([]);
      }
    };

    const loadCtaConfig = async () => {
      try {
        const res = await fetch("/api/navbar");
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.cta) setCtaConfig(json.data.cta);
          // Opt-in color-match flag — absent/false leaves default behaviour untouched.
          if (typeof json?.data?.colorMatchTopSection === "boolean") {
            setColorMatchEnabled(json.data.colorMatchTopSection);
          }
        }
      } catch {}
    };

    const loadSiteConfig = async () => {
      try {
        const res = await fetch("/api/site-config");
        if (!res.ok) return;
        const { data } = await res.json();
        if (data?.companyName) setCompanyName(data.companyName);
        if (data?.logoUrl)     setLogoUrl(data.logoUrl);
        if (data?.navbarStyle) setNavbarStyle(data.navbarStyle as "standard" | "tall");
        // Optional flag — API may not return it yet; stays false (current behaviour) until then.
        if (typeof data?.hideOverHero === "boolean") setHideOverHero(data.hideOverHero);
        if (data?.phone)       setPhone(data.phone);
        // Collect all social URLs
        const s: Record<string, string> = {};
        TALL_SOCIALS.forEach(({ key }) => { if (data?.[key]) s[key] = data[key]; });
        setSocials(s);
        // Mark style as loaded so --navbar-height useEffect can safely update the CSS var
        setNavbarStyleLoaded(true);
      } catch {
        // Even on error, mark loaded so the CSS var reflects the default state
        setNavbarStyleLoaded(true);
      }
    };

    loadNavLinks();
    loadCtaConfig();
    loadSiteConfig();

    fetch("/api/features/public")
      .then((r) => r.json())
      .then((d) => { if (d.slugs) setEnabledFeatures(d.slugs); })
      .catch(() => {});

    const interval = setInterval(() => {
      if (!document.hidden) { loadNavLinks(); loadCtaConfig(); loadSiteConfig(); }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close Tools dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Color-matched navbar (v2): continuous DOM sampling ──────────────────────
  // When the flag is on, on every scroll frame sample the element sitting under
  // the navbar's bottom edge and adopt its color IF it is a fully-opaque solid;
  // otherwise clear the match so the navbar reverts to its normal treatment.
  // Applies at ALL scroll positions (the v1 first-section-only limit is gone).
  // Listeners attach ONLY when the flag is on and are cleaned up on unmount/off.
  useEffect(() => {
    if (!colorMatchEnabled) { setMatchedColor(null); return; }
    const container = document.getElementById("snap-container");
    let rafId = 0;

    const sample = () => {
      rafId = 0;
      const navEl = navRef.current;
      if (!navEl) return;
      const navBottom = navEl.getBoundingClientRect().bottom;
      // Sample just BELOW the navbar's bottom edge, horizontally centered. Disable
      // the nav's pointer-events for the hit-test so the bar can never be returned
      // (which would feed its own matched color back in).
      const prevPE = navEl.style.pointerEvents;
      navEl.style.pointerEvents = "none";
      // elementsFromPoint (plural) returns the full stack top→bottom; walk it to the
      // first element that lives inside a .cms-section. This transparently skips any
      // motion/lower-third overlay layers that sit above the section content, so we
      // always resolve the SECTION under the bar (not a stray transparent child).
      const stack = document.elementsFromPoint(window.innerWidth / 2, navBottom + 2);
      navEl.style.pointerEvents = prevPE;

      let section: Element | null = null;
      for (const e of stack) {
        if (navEl.contains(e)) continue;
        const sec = e.closest(".cms-section");
        if (sec) { section = sec; break; }
      }
      // Could not resolve a section (empty hit / nav-only / non-section area):
      // KEEP the previous decision rather than flicker to unmatched.
      if (!section) return;
      setMatchedColor(sectionEffectiveSolidColor(section, navEl));
    };

    const onScroll = () => {
      if (rafId) return; // rAF-throttle: coalesce bursts into one sample per frame
      rafId = requestAnimationFrame(sample);
    };

    sample(); // initial position
    container?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [colorMatchEnabled, pathname]);

  // Scroll + background detection
  useEffect(() => {
    const detectBg = () => {
      const navbar = document.querySelector("nav");
      if (!navbar) return;
      const rect = navbar.getBoundingClientRect();
      navbar.style.pointerEvents = "none";
      const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      navbar.style.pointerEvents = "";
      if (!el) { setIsDarkBg(true); return; }
      const bg = window.getComputedStyle(el).backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) { setIsDarkBg(true); return; }
      const lum = (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) / 255;
      setIsDarkBg(lum <= 0.5);
    };

    detectBg();
    // Generic hero detection: treat any page that actually mounts a hero like the
    // landing page. Falls back to the pathname check so first paint (before the hero
    // element exists in the DOM) is still correct on the known hero routes.
    const heroExists = !!document.querySelector(".hero-carousel") || pathHasHero;
    setHeroPresent(heroExists);
    const container = document.getElementById("snap-container");
    const onScroll = () => {
      if (!heroExists) return;
      const top = container ? container.scrollTop : window.scrollY;
      // The hero fills ~one viewport (sections are 100vh). Stay transparent while the
      // hero is on screen; go opaque only once it has scrolled up behind the navbar.
      const heroThreshold = window.innerHeight - navbarHeight;
      const isScrolled = top > Math.max(20, heroThreshold);
      setScrolled(isScrolled);
      // "Hide over hero" mode reveals the navbar as soon as the user scrolls a little.
      setPastRevealDelta(top > REVEAL_DELTA);
      if (isScrolled && window.innerWidth >= 768) setMobileOpen(false);
      detectBg();
    };
    container?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      container?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathHasHero]);

  const effectiveScrolled = !heroPresent || scrolled;
  const navTransition = heroPresent ? "600ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";

  // Hide-over-hero mode: while the hero is on screen and the user hasn't scrolled past
  // the small reveal delta, render the whole navbar hidden (slide/fade up), revealing it
  // on scroll. When the flag is off this is always false → default behaviour unchanged.
  const navHiddenOverHero = hideOverHero && heroPresent && !pastRevealDelta;

  // Color-matched navbar (opt-in). v2: active for the standard variant whenever an
  // opaque solid color is currently sampled under the bar — at ANY scroll position.
  // When inactive, every value below is null/false and the navbar renders exactly
  // as before (identical to the flag being off).
  const colorMatchActive =
    colorMatchEnabled && !isTall && !!matchedColor;
  const matchTextColor = colorMatchActive ? contrastTextColor(matchedColor as string) : null;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  // Social icons configured for the tall navbar (only those with a URL)
  const activeSocials = TALL_SOCIALS.filter(({ key }) => socials[key]);

  return (
    <nav
      ref={navRef}
      className={`navbar fixed-top ${effectiveScrolled ? "navbar-scrolled" : "navbar-transparent"}`}
      style={{
        padding: isTall ? "0" : "1rem 0", zIndex: 1050, overflow: "visible", height: `${navbarHeight}px`,
        // Only add the hide/reveal transform + transition when the mode is enabled, so the
        // default navbar's inline style is byte-for-byte unchanged when hideOverHero is off.
        ...(hideOverHero
          ? {
              transform: navHiddenOverHero ? "translateY(-100%)" : "translateY(0)",
              opacity: navHiddenOverHero ? 0 : 1,
              pointerEvents: navHiddenOverHero ? ("none" as const) : ("auto" as const),
              transition: "transform 400ms cubic-bezier(0.4,0,0.2,1), opacity 400ms cubic-bezier(0.4,0,0.2,1)",
            }
          : {}),
        // Color-matched navbar (opt-in). Overrides the bar background to the color
        // currently sampled under the navbar and scopes --theme-text to a contrasting
        // color, which the nav links / tools / mobile hamburger inherit in the opaque
        // state. Empty object when inactive → default inline style is byte-for-byte unchanged.
        ...(colorMatchActive
          ? ({
              backgroundColor: matchedColor as string,
              "--theme-text": matchTextColor as string,
              transition: "background-color 300ms ease, color 300ms ease",
            } as React.CSSProperties)
          : {}),
      }}
    >
      <div
        className="container-fluid px-4 h-100"
        style={{ maxWidth: "1320px", margin: "0 auto", overflow: "visible", position: "relative" }}
      >
        {/* ── STANDARD variant ─────────────────────────────────────────── */}
        {!isTall && (
          <div className="d-flex align-items-center justify-content-between position-relative w-100 h-100">

            {/* Hamburger (desktop, transparent state) */}
            {navLinks.length > 0 && (
              <div className="d-none d-md-block" style={{ position: "relative", width: 28, height: 28, zIndex: 100 }}>
                <button className="p-0 bg-transparent border-0" onClick={() => setMobileOpen(true)}
                  style={{ position: "absolute", top: 0, left: 0, outline: "none", cursor: "pointer",
                    opacity: effectiveScrolled || mobileOpen ? 0 : 1,
                    visibility: effectiveScrolled || mobileOpen ? "hidden" : "visible",
                    transition: `opacity ${navTransition}, visibility ${navTransition}`,
                    pointerEvents: effectiveScrolled || mobileOpen ? "none" : "auto" }}>
                  <svg style={{ width: 28, height: 28, color: "#fff" }}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button className="p-0 bg-transparent border-0" onClick={() => setMobileOpen(false)}
                  style={{ position: "absolute", top: 0, left: 0, outline: "none", cursor: "pointer",
                    opacity: mobileOpen && !effectiveScrolled ? 1 : 0,
                    visibility: mobileOpen && !effectiveScrolled ? "visible" : "hidden",
                    transition: `opacity ${navTransition}, visibility ${navTransition}`,
                    pointerEvents: mobileOpen && !effectiveScrolled ? "auto" : "none" }}>
                  <svg style={{ width: 28, height: 28, color: "#fff" }}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Logo */}
            <LogoBlock logoUrl={logoUrl} companyName={companyName} effectiveScrolled={effectiveScrolled}
              mobileOpen={mobileOpen} isDarkBackground={isDarkBackground} navTransition={navTransition}
              matchTextColor={matchTextColor} />

            {/* Right: links + tools + CTA */}
            <div className="d-flex align-items-center gap-3" style={{ marginLeft: "auto", position: "relative", zIndex: 100 }}>
              <NavLinks navLinks={navLinks} effectiveScrolled={effectiveScrolled} mobileOpen={mobileOpen}
                navTransition={navTransition} scrollToSection={scrollToSection} setMobileOpen={setMobileOpen} />
              <ToolsDropdown enabledFeatures={enabledFeatures} effectiveScrolled={effectiveScrolled}
                mobileOpen={mobileOpen} navTransition={navTransition} toolsOpen={toolsOpen}
                setToolsOpen={setToolsOpen} toolsRef={toolsRef} />
              {navbarStyleLoaded && ctaConfig.show && (
                <div className="d-none d-md-block">
                  <Button href={ctaConfig.href} variant={ctaStyleToVariant(ctaConfig.style)} size="sm">
                    {ctaConfig.text}
                  </Button>
                </div>
              )}
              {/* Mobile hamburger */}
              <div className="d-md-none">
                <button className="p-0 bg-transparent border-0" onClick={() => setMobileOpen(!mobileOpen)}
                  style={{ outline: "none", cursor: "pointer" }} aria-label="Open menu">
                  <svg style={{ width: 28, height: 28, color: effectiveScrolled ? "var(--theme-text)" : "#fff", transition: `color ${navTransition}` }}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TALL variant ──────────────────────────────────────────────── */}
        {isTall && (
          <div className="d-flex align-items-center justify-content-between position-relative w-100 h-100">

            {/* Logo — always left-aligned in tall variant */}
            <div style={{ zIndex: 200 }}>
              <Link href="/" className="d-flex align-items-center gap-2 text-decoration-none">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={companyName}
                    style={{ height: 44, maxWidth: 180, objectFit: "contain" }} />
                ) : (
                  <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#fff" }}>
                    {companyName}
                  </span>
                )}
              </Link>
            </div>

            {/* Center: nav links (always visible in tall variant — it's always "scrolled" behaviour) */}
            <div className="d-none d-md-flex align-items-center gap-4" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              {navLinks.map((link) =>
                link.href ? (
                  <Link key={link.id} href={link.href} className="text-decoration-none fw-medium"
                    style={{ cursor: "pointer", color: "#fff", fontSize: "0.95rem", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                    {link.label}
                  </Link>
                ) : (
                  <button key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="border-0 bg-transparent p-0 fw-medium"
                    style={{ cursor: "pointer", color: "#fff", fontSize: "0.95rem", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                    {link.label}
                  </button>
                )
              )}
            </div>

            {/* Right: phone + socials column */}
            <div className="d-none d-md-flex flex-column align-items-end justify-content-center gap-1" style={{ zIndex: 100 }}>
              {phone && (
                <>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Call Us
                  </span>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}
                    style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", textDecoration: "none", letterSpacing: "-0.01em" }}>
                    {phone}
                  </a>
                </>
              )}
              {activeSocials.length > 0 && (
                <div className="d-flex align-items-center gap-2 mt-1">
                  {activeSocials.map(({ key, icon, color }) => (
                    <a key={key} href={socials[key]} target="_blank" rel="noopener noreferrer"
                      style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.85rem", textDecoration: "none", flexShrink: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      <i className={`bi ${icon}`} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="d-md-none">
              <button className="p-0 bg-transparent border-0" onClick={() => setMobileOpen(!mobileOpen)}
                style={{ outline: "none", cursor: "pointer" }} aria-label="Open menu">
                <svg style={{ width: 28, height: 28, color: effectiveScrolled ? "var(--theme-text)" : "#fff", transition: `color ${navTransition}` }}
                  fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Mobile dropdown (both variants) */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="position-absolute start-0 end-0 d-md-none overflow-hidden"
              style={{ top: "100%", background: "var(--theme-bg)", borderBottom: "1px solid var(--theme-border)", zIndex: 1000 }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="d-flex flex-column py-2">
                {navLinks.map((link, i) =>
                  link.href ? (
                    <motion.div key={link.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}>
                      <Link href={link.href} onClick={() => setMobileOpen(false)}
                        className="text-decoration-none fw-medium px-4 py-2 dropdown-link d-block text-center w-100"
                        style={{ color: "var(--theme-text)", whiteSpace: "nowrap" }}>
                        {link.label}
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.button key={link.id} onClick={() => { scrollToSection(link.id); setMobileOpen(false); }}
                      className="text-decoration-none fw-medium px-4 py-2 dropdown-link d-block border-0 bg-transparent text-center w-100"
                      style={{ color: "var(--theme-text)", whiteSpace: "nowrap", cursor: "pointer" }}
                      whileHover={{ backgroundColor: "rgba(127,127,127,0.15)" }}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}>
                      {link.label}
                    </motion.button>
                  )
                )}

                {/* Tall navbar: show phone + socials in mobile menu */}
                {isTall && (phone || activeSocials.length > 0) && (
                  <div className="px-4 pt-2 pb-2 text-center border-top mt-1">
                    {phone && (
                      <a href={`tel:${phone.replace(/\s/g, "")}`}
                        className="d-block fw-bold text-decoration-none mb-2"
                        style={{ color: "var(--theme-text)", fontSize: "1rem" }}>
                        <i className="bi bi-telephone me-1 text-success" />{phone}
                      </a>
                    )}
                    {activeSocials.length > 0 && (
                      <div className="d-flex justify-content-center gap-2">
                        {activeSocials.map(({ key, icon, color }) => (
                          <a key={key} href={socials[key]} target="_blank" rel="noopener noreferrer"
                            style={{ width: 32, height: 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.9rem", textDecoration: "none" }}>
                            <i className={`bi ${icon}`} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Standard variant: tools + CTA in mobile */}
                {!isTall && (
                  <>
                    {enabledFeatures.filter((s) => FEATURE_ROUTES[s]).length > 0 && (
                      <>
                        <div className="px-4 pt-2 pb-1 text-center" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#9ca3af", textTransform: "uppercase" }}>Tools</div>
                        {enabledFeatures.filter((s) => FEATURE_ROUTES[s]).map((slug, i) => {
                          const ft = FEATURE_ROUTES[slug];
                          return (
                            <motion.div key={slug} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: (navLinks.length + i) * 0.05 }}>
                              <Link href={ft.href}
                                className="d-flex align-items-center justify-content-center gap-2 px-4 py-2 text-decoration-none fw-medium"
                                style={{ color: "var(--theme-text)", fontSize: "0.95rem" }} onClick={() => setMobileOpen(false)}>
                                <i className={ft.icon} style={{ color: "#3b82f6" }} />{ft.label}
                              </Link>
                            </motion.div>
                          );
                        })}
                      </>
                    )}
                    {navbarStyleLoaded && ctaConfig.show && (
                      <motion.div className="px-4 py-2 text-center"
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: navLinks.length * 0.05 }}>
                        <Button href={ctaConfig.href} variant={ctaStyleToVariant(ctaConfig.style)} size="sm" className="w-100">
                          {ctaConfig.text}
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function LogoBlock({ logoUrl, companyName, effectiveScrolled, mobileOpen, isDarkBackground, navTransition, matchTextColor }: {
  logoUrl: string; companyName: string; effectiveScrolled: boolean;
  mobileOpen: boolean; isDarkBackground: boolean; navTransition: string;
  /** Optional contrast color from the color-matched navbar feature (null = default). */
  matchTextColor?: string | null;
}) {
  return (
    <div className="d-flex align-items-center" style={{
      position: effectiveScrolled || mobileOpen ? "relative" : "absolute",
      left: effectiveScrolled || mobileOpen ? "0" : "50%",
      transform: effectiveScrolled || mobileOpen ? "translateX(0)" : "translateX(-50%)",
      transition: `all ${navTransition}`, zIndex: 200,
    }}>
      <Link href="/" className="d-flex align-items-center gap-2 text-decoration-none">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName}
            style={{ height: 36, maxWidth: 160, objectFit: "contain",
              filter: "none",
              transition: "filter 600ms cubic-bezier(0.4,0,0.2,1)" }} />
        ) : (
          <span style={{ height: 44, display: "flex", alignItems: "center", fontWeight: 700, fontSize: "1.2rem",
            color: matchTextColor || "#fff" }}>
            {companyName}
          </span>
        )}
      </Link>
    </div>
  );
}

function NavLinks({ navLinks, effectiveScrolled, mobileOpen, navTransition, scrollToSection, setMobileOpen }: {
  navLinks: Array<{ id: string; label: string; href?: string }>; effectiveScrolled: boolean; mobileOpen: boolean;
  navTransition: string; scrollToSection: (id: string) => void; setMobileOpen: (v: boolean) => void;
}) {
  if (!navLinks.length) return null;
  // Links are only visible in the opaque (scrolled / no-hero) or mobile-open state; at hero-top
  // they're hidden. So text is theme-contrasting (var(--theme-text): near-white on the dark-glass
  // navbar, dark-navy on the light/cream navbar) when opaque, and white over the transparent hero. (#69)
  const linkColor = effectiveScrolled || mobileOpen ? "var(--theme-text)" : "#fff";
  const linkStyle: React.CSSProperties = {
    whiteSpace: "nowrap", cursor: "pointer", color: linkColor,
    fontSize: "0.95rem", letterSpacing: "0.01em", transition: `opacity 200ms ease, color ${navTransition}`,
  };
  return (
    <div className="d-none d-md-flex align-items-center gap-4"
      style={{ opacity: effectiveScrolled || mobileOpen ? 1 : 0,
        visibility: effectiveScrolled || mobileOpen ? "visible" : "hidden",
        transition: `opacity ${navTransition}, visibility ${navTransition}` }}>
      {navLinks.map((link) =>
        link.href ? (
          <Link key={link.id} href={link.href}
            className="text-decoration-none fw-medium position-relative"
            style={linkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            onClick={() => setMobileOpen(false)}>
            {link.label}
          </Link>
        ) : (
          <button key={link.id}
            onClick={() => { scrollToSection(link.id); setMobileOpen(false); }}
            className="text-decoration-none fw-medium border-0 bg-transparent p-0 position-relative"
            style={linkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
            {link.label}
          </button>
        )
      )}
    </div>
  );
}

function ToolsDropdown({ enabledFeatures, effectiveScrolled, mobileOpen, navTransition, toolsOpen, setToolsOpen, toolsRef }: {
  enabledFeatures: string[]; effectiveScrolled: boolean; mobileOpen: boolean; navTransition: string;
  toolsOpen: boolean; setToolsOpen: (v: boolean | ((p: boolean) => boolean)) => void; toolsRef: React.RefObject<HTMLDivElement | null>;
}) {
  const active = enabledFeatures.filter((s) => FEATURE_ROUTES[s]);
  if (!active.length) return null;
  return (
    <div ref={toolsRef} className="d-none d-md-block position-relative"
      style={{ opacity: effectiveScrolled || mobileOpen ? 1 : 0,
        visibility: effectiveScrolled || mobileOpen ? "visible" : "hidden",
        transition: `opacity ${navTransition}, visibility ${navTransition}` }}>
      <button className="text-decoration-none fw-medium border-0 bg-transparent p-0 d-flex align-items-center gap-1"
        style={{ cursor: "pointer", color: effectiveScrolled || mobileOpen ? "var(--theme-text)" : "#fff", fontSize: "0.95rem",
          letterSpacing: "0.01em", transition: `color ${navTransition}`, whiteSpace: "nowrap" }}
        onClick={() => setToolsOpen((o) => !o)}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
        Tools
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ marginLeft: 3, transition: "transform 200ms", transform: toolsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {toolsOpen && (
          <motion.div className="position-absolute bg-white rounded shadow-lg py-1"
            style={{ top: "calc(100% + 10px)", right: 0, minWidth: 200, zIndex: 2000 }}
            initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}>
            {active.map((slug) => {
              const ft = FEATURE_ROUTES[slug];
              return (
                <Link key={slug} href={ft.href}
                  className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none"
                  style={{ color: "#111827", fontSize: "0.9rem", transition: "background 150ms" }}
                  onClick={() => setToolsOpen(false)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                  <i className={ft.icon} style={{ color: "#3b82f6" }} />{ft.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
