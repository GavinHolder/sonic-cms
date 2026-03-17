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

export default function Navbar() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  const [mobileOpen, setMobileOpen]       = useState(false);
  const [scrolled, setScrolled]           = useState(!isLandingPage);
  const [navLinks, setNavLinks]           = useState<Array<{ id: string; label: string; href?: string }>>([]);
  const [isDarkBackground, setIsDarkBg]   = useState(isLandingPage);
  const [ctaConfig, setCtaConfig]         = useState<NavbarCtaButton>(defaultNavbarConfig.cta);
  const [toolsOpen, setToolsOpen]         = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [companyName, setCompanyName]     = useState("Your Company");
  const [logoUrl, setLogoUrl]             = useState("");
  const [navbarStyle, setNavbarStyle]     = useState<"standard" | "tall">("standard");
  const [phone, setPhone]                 = useState("");
  const [socials, setSocials]             = useState<Record<string, string>>({});
  const toolsRef = useRef<HTMLDivElement>(null);

  const isTall = navbarStyle === "tall";
  const navbarHeight = isTall ? TALL_HEIGHT : STANDARD_HEIGHT;

  // Sync --navbar-height CSS variable so sections automatically compensate
  useEffect(() => {
    document.documentElement.style.setProperty("--navbar-height", `${navbarHeight}px`);
  }, [navbarHeight]);

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
        if (data?.phone)       setPhone(data.phone);
        // Collect all social URLs
        const s: Record<string, string> = {};
        TALL_SOCIALS.forEach(({ key }) => { if (data?.[key]) s[key] = data[key]; });
        setSocials(s);
      } catch {}
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
    const container = document.getElementById("snap-container");
    const onScroll = () => {
      if (!isLandingPage) return;
      const top = container ? container.scrollTop : window.scrollY;
      const isScrolled = top > 20;
      setScrolled(isScrolled);
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
  }, [isLandingPage]);

  const effectiveScrolled = !isLandingPage || scrolled;
  const navTransition = isLandingPage ? "600ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  // Social icons configured for the tall navbar (only those with a URL)
  const activeSocials = TALL_SOCIALS.filter(({ key }) => socials[key]);

  return (
    <nav
      className={`navbar fixed-top ${effectiveScrolled ? "navbar-scrolled" : "navbar-transparent"}`}
      style={{ padding: isTall ? "0" : "1rem 0", zIndex: 1050, overflow: "visible", height: `${navbarHeight}px` }}
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
                  <svg style={{ width: 28, height: 28, color: isDarkBackground ? "#fff" : "#000" }}
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
                  <svg style={{ width: 28, height: 28, color: isDarkBackground ? "#fff" : "#000" }}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Logo */}
            <LogoBlock logoUrl={logoUrl} companyName={companyName} effectiveScrolled={effectiveScrolled}
              mobileOpen={mobileOpen} isDarkBackground={isDarkBackground} navTransition={navTransition} />

            {/* Right: links + tools + CTA */}
            <div className="d-flex align-items-center gap-3" style={{ marginLeft: "auto", position: "relative", zIndex: 100 }}>
              <NavLinks navLinks={navLinks} effectiveScrolled={effectiveScrolled} mobileOpen={mobileOpen}
                navTransition={navTransition} scrollToSection={scrollToSection} setMobileOpen={setMobileOpen} />
              <ToolsDropdown enabledFeatures={enabledFeatures} effectiveScrolled={effectiveScrolled}
                mobileOpen={mobileOpen} navTransition={navTransition} toolsOpen={toolsOpen}
                setToolsOpen={setToolsOpen} toolsRef={toolsRef} />
              {ctaConfig.show && (
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
                  <svg style={{ width: 28, height: 28, color: effectiveScrolled ? "#111827" : "#fff" }}
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
                  <span style={{ fontWeight: 700, fontSize: "1.25rem", color: effectiveScrolled ? "#111827" : "#fff" }}>
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
                    style={{ cursor: "pointer", color: effectiveScrolled ? "#111827" : "#fff", fontSize: "0.95rem", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                    {link.label}
                  </Link>
                ) : (
                  <button key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className="border-0 bg-transparent p-0 fw-medium"
                    style={{ cursor: "pointer", color: effectiveScrolled ? "#111827" : "#fff", fontSize: "0.95rem", whiteSpace: "nowrap" }}
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
                  <span style={{ fontSize: "0.7rem", color: effectiveScrolled ? "#6b7280" : "rgba(255,255,255,0.7)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Call Us
                  </span>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}
                    style={{ fontSize: "1.15rem", fontWeight: 700, color: effectiveScrolled ? "#111827" : "#fff", textDecoration: "none", letterSpacing: "-0.01em" }}>
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
                <svg style={{ width: 28, height: 28, color: effectiveScrolled ? "#111827" : "#fff" }}
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
              className="position-absolute start-0 end-0 bg-white rounded shadow-lg d-md-none"
              style={{ top: "calc(100% + 0.5rem)", marginLeft: "1rem", marginRight: "1rem", zIndex: 1000 }}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="d-flex flex-column py-2">
                {navLinks.map((link, i) =>
                  link.href ? (
                    <motion.div key={link.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}>
                      <Link href={link.href} onClick={() => setMobileOpen(false)}
                        className="text-decoration-none fw-medium px-4 py-2 dropdown-link d-block text-center w-100"
                        style={{ color: "#111827", whiteSpace: "nowrap" }}>
                        {link.label}
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.button key={link.id} onClick={() => { scrollToSection(link.id); setMobileOpen(false); }}
                      className="text-decoration-none fw-medium px-4 py-2 dropdown-link d-block border-0 bg-transparent text-center w-100"
                      style={{ color: "#111827", whiteSpace: "nowrap", cursor: "pointer" }}
                      whileHover={{ backgroundColor: "#f3f4f6" }}
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
                        style={{ color: "#111827", fontSize: "1rem" }}>
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
                                style={{ color: "#111827", fontSize: "0.95rem" }} onClick={() => setMobileOpen(false)}>
                                <i className={ft.icon} style={{ color: "#3b82f6" }} />{ft.label}
                              </Link>
                            </motion.div>
                          );
                        })}
                      </>
                    )}
                    {ctaConfig.show && (
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

function LogoBlock({ logoUrl, companyName, effectiveScrolled, mobileOpen, isDarkBackground, navTransition }: {
  logoUrl: string; companyName: string; effectiveScrolled: boolean;
  mobileOpen: boolean; isDarkBackground: boolean; navTransition: string;
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
              filter: effectiveScrolled ? "none" : "brightness(0) invert(1)",
              transition: "filter 600ms cubic-bezier(0.4,0,0.2,1)" }} />
        ) : (
          <span style={{ height: 44, display: "flex", alignItems: "center", fontWeight: 700, fontSize: "1.2rem",
            color: effectiveScrolled ? "#111827" : "#fff" }}>
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
  const linkStyle: React.CSSProperties = {
    whiteSpace: "nowrap", cursor: "pointer", color: effectiveScrolled ? "#111827" : "#fff",
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
        style={{ cursor: "pointer", color: effectiveScrolled ? "#111827" : "#fff", fontSize: "0.95rem",
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
