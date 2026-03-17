"use client";

import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ImageFieldWithUpload from "@/components/admin/ImageFieldWithUpload";
import { getPages } from "@/lib/page-manager";
import type { PageType } from "@/types/page";
import type { NavbarConfig, NavbarCtaButton } from "@/lib/navbar-config";

// ── Types ─────────────────────────────────────────────────────────────────────

type LinkTarget =
  | { mode: "external"; url: string }
  | { mode: "anchor"; sectionId: string }
  | { mode: "page"; slug: string };

interface SectionOption {
  id: string;
  displayName: string;
  navLabel?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Serialize a LinkTarget back to an href string */
function serializeHref(target: LinkTarget): string {
  if (target.mode === "anchor") return `#${target.sectionId}`;
  if (target.mode === "page") return `/${target.slug}`;
  return target.url;
}

/**
 * Convert hex color + opacity% to rgba() string for preview.
 * Opacity 0–100.
 */
function hexToRgba(hex: string, opacityPercent: number): string {
  const sanitized = hex.replace("#", "");
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(255,255,255,${opacityPercent / 100})`;
  return `rgba(${r},${g},${b},${opacityPercent / 100})`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NavbarEditorPage() {
  // ── Alert state (inline feedback — avoids ToastProvider dependency) ───────
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showAlert(type: "success" | "error", message: string) {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  }

  // ── Remote config state ───────────────────────────────────────────────────
  const [config, setConfig] = useState<NavbarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── CTA link mode ─────────────────────────────────────────────────────────
  const [ctaLinkTarget, setCtaLinkTarget] = useState<LinkTarget>({
    mode: "external",
    url: "/client-login",
  });

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [dynamicPages, setDynamicPages] = useState<Array<{ slug: string; title: string; type: PageType }>>([]);
  const sectionsLoadedRef = useRef(false);

  // ── Load config from API ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/navbar");
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to load");
        const c: NavbarConfig = json.data;
        setConfig(c);
        // Use stored linkMode (if present) rather than inferring from href
        const storedMode = c.cta.linkMode || "external";
        if (storedMode === "anchor") {
          const sectionId = c.cta.href.startsWith("#") ? c.cta.href.slice(1) : c.cta.href;
          setCtaLinkTarget({ mode: "anchor", sectionId });
        } else if (storedMode === "page") {
          const slug = c.cta.href.startsWith("/") ? c.cta.href.slice(1) : c.cta.href;
          setCtaLinkTarget({ mode: "page", slug });
        } else {
          setCtaLinkTarget({ mode: "external", url: c.cta.href });
        }
      } catch (err) {
        console.error("Failed to load navbar config:", err);
        showAlert("error", "Failed to load navbar configuration.");
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load sections + pages for link dropdowns ──────────────────────────────
  useEffect(() => {
    if (sectionsLoadedRef.current) return;
    sectionsLoadedRef.current = true;

    // Load landing page sections from DB API
    fetch("/api/sections?pageSlug=/")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const movable = json.data.filter(
            (s: any) => s.type !== "HERO" && s.type !== "FOOTER" && s.enabled
          );
          setSections(
            movable.map((s: any) => ({
              id: s.id,
              displayName: s.displayName || "Section",
              navLabel: s.navLabel,
            }))
          );
        }
      })
      .catch(() => {});

    // Load dynamic pages from DB (all types: full, pdf, form, designer)
    getPages().then((pages) => {
      const enabled = pages.filter((p) => p.enabled);
      setDynamicPages(enabled.map((p) => ({ slug: p.slug, title: p.title, type: p.type })));
    }).catch(() => {});
  }, []);

  // ── Field setters ─────────────────────────────────────────────────────────

  function setField<K extends keyof NavbarConfig>(key: K, value: NavbarConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setCtaField<K extends keyof NavbarCtaButton>(key: K, value: NavbarCtaButton[K]) {
    setConfig((prev) =>
      prev ? { ...prev, cta: { ...prev.cta, [key]: value } } : prev
    );
  }

  function setScrolledBg(field: "color" | "opacity", value: string | number) {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            scrolledBackground: { ...prev.scrolledBackground, [field]: value },
          }
        : prev
    );
  }

  /** Keep ctaLinkTarget in sync and write the serialized href + linkMode into config */
  function updateCtaLinkTarget(next: LinkTarget) {
    setCtaLinkTarget(next);
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            cta: {
              ...prev.cta,
              href: serializeHref(next),
              linkMode: next.mode,
            },
          }
        : prev
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/navbar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Save failed");
      setConfig(json.data);
      showAlert("success", "Navbar settings saved successfully.");
    } catch (err: any) {
      console.error("Failed to save navbar config:", err);
      showAlert("error", err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading || !config) {
    return (
      <AdminLayout title="Navigation" subtitle="Loading...">
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Derived values for preview ────────────────────────────────────────────

  const bgPreviewColor = hexToRgba(
    config.scrolledBackground.color,
    config.scrolledBackground.opacity
  );

  const logoStyle: React.CSSProperties = {
    height: `${config.logoHeight}px`,
    width: config.logoWidth > 0 ? `${config.logoWidth}px` : "auto",
    objectFit: "contain",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="Navigation"
      subtitle="Configure logo, navigation button, and navbar background"
      actions={
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Saving…
            </>
          ) : (
            <>
              <i className="bi bi-floppy me-1" />
              Save Settings
            </>
          )}
        </button>
      }
    >
      {/* ── Alert banner ────────────────────────────────────────────────── */}
      {alert && (
        <div
          className={`alert alert-${alert.type === "success" ? "success" : "danger"} alert-dismissible fade show mb-4`}
          role="alert"
        >
          <i className={`bi bi-${alert.type === "success" ? "check-circle" : "exclamation-circle"} me-2`} />
          {alert.message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setAlert(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* ══ PREVIEW ROW — full width at top ════════════════════════════════ */}
      <div className="row g-3 mb-2">

        {/* Desktop Preview — full-width bar */}
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center gap-2 py-2">
              <i className="bi bi-display text-secondary" />
              <strong className="small">Desktop Preview</strong>
              <span className="ms-auto small text-muted">Live — updates as you change settings</span>
            </div>
            <div className="card-body p-0" style={{ borderRadius: "0 0 0.375rem 0.375rem", overflow: "hidden" }}>

              {/* Label column + bar row — transparent */}
              <div className="d-flex align-items-stretch">
                <div className="d-flex align-items-center px-3 bg-light border-end" style={{ minWidth: 96 }}>
                  <span className="small text-muted fw-semibold" style={{ fontSize: "0.72rem", lineHeight: 1.3 }}>Transparent<br/><span className="fw-normal">over hero</span></span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 60,
                    background: "linear-gradient(90deg, #1a1a2e 0%, #0f3460 100%)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    padding: "0 24px",
                    gap: 16,
                  }}
                >
                  {/* Left: hamburger */}
                  <div className="d-flex flex-column gap-1" style={{ width: 24 }}>
                    {[1,2,3].map(i => <div key={i} style={{ height: 2, background: "rgba(255,255,255,0.7)", borderRadius: 2 }} />)}
                  </div>
                  {/* Center: logo */}
                  <div className="d-flex justify-content-center align-items-center">
                    {config.logoSrc ? (
                      <img src={config.logoSrc} alt={config.logoAlt} style={logoStyle}
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <span className="text-white fw-bold" style={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}>{config.logoAlt}</span>
                    )}
                  </div>
                  {/* Right: nav links + button */}
                  <div className="d-flex justify-content-end align-items-center gap-3">
                    {["Services", "Coverage", "Support"].map(l => (
                      <span key={l} style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{l}</span>
                    ))}
                    {config.cta.show && (
                      <CtaPreviewButton text={config.cta.text} style={config.cta.style} dark />
                    )}
                  </div>
                </div>
              </div>

              {/* Label column + bar row — scrolled */}
              <div className="d-flex align-items-stretch border-top">
                <div className="d-flex align-items-center px-3 bg-light border-end" style={{ minWidth: 96 }}>
                  <span className="small text-muted fw-semibold" style={{ fontSize: "0.72rem", lineHeight: 1.3 }}>Scrolled<br/><span className="fw-normal">after scroll</span></span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 60,
                    backgroundColor: bgPreviewColor,
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    padding: "0 24px",
                    gap: 16,
                  }}
                >
                  <div className="d-flex flex-column gap-1" style={{ width: 24 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ height: 2, background: config.scrolledBackground.opacity < 50 ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)", borderRadius: 2 }} />
                    ))}
                  </div>
                  <div className="d-flex justify-content-center align-items-center">
                    {config.logoSrc ? (
                      <img src={config.logoSrc} alt={config.logoAlt} style={logoStyle}
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <span className="fw-bold" style={{ fontSize: "0.9rem", whiteSpace: "nowrap", color: config.scrolledBackground.opacity < 50 ? "#fff" : "#111" }}>{config.logoAlt}</span>
                    )}
                  </div>
                  <div className="d-flex justify-content-end align-items-center gap-3">
                    {["Services", "Coverage", "Support"].map(l => (
                      <span key={l} style={{ fontSize: "0.78rem", color: config.scrolledBackground.opacity < 50 ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.65)", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{l}</span>
                    ))}
                    {config.cta.show && (
                      <CtaPreviewButton text={config.cta.text} style={config.cta.style}
                        dark={config.scrolledBackground.opacity < 50} />
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Preview — phone-width mockup */}
        <div className="col-md-5 col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header d-flex align-items-center gap-2 py-2">
              <i className="bi bi-phone text-secondary" />
              <strong className="small">Mobile Preview</strong>
            </div>
            <div className="card-body p-0" style={{ borderRadius: "0 0 0.375rem 0.375rem", overflow: "hidden" }}>
              {/* Transparent — mobile */}
              <MobileNavBar
                bg="linear-gradient(90deg, #1a1a2e 0%, #0f3460 100%)"
                logoSrc={config.logoSrc} logoAlt={config.logoAlt} logoStyle={{ ...logoStyle, maxHeight: "30px" }}
                hamColor="rgba(255,255,255,0.85)"
                showButton={config.cta.show} buttonText={config.cta.text}
                buttonStyle={config.cta.style} dark
              />
              {/* Scrolled — mobile */}
              <MobileNavBar
                bg={bgPreviewColor}
                border
                logoSrc={config.logoSrc} logoAlt={config.logoAlt} logoStyle={{ ...logoStyle, maxHeight: "30px" }}
                hamColor={config.scrolledBackground.opacity < 50 ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.45)"}
                textColor={config.scrolledBackground.opacity < 50 ? "#fff" : "#111"}
                showButton={config.cta.show} buttonText={config.cta.text}
                buttonStyle={config.cta.style} dark={config.scrolledBackground.opacity < 50}
              />
              <div className="px-3 py-2 bg-light border-top">
                <p className="mb-0 small text-muted" style={{ fontSize: "0.72rem" }}>
                  <strong>Top:</strong> transparent over hero &nbsp;·&nbsp; <strong>Bottom:</strong> scrolled state
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="col-md-7 col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-lightbulb text-warning" />
                How it works
              </h6>
              <ul className="mb-0 small text-muted ps-3">
                <li className="mb-1">The navbar starts <strong>transparent</strong> over the hero section.</li>
                <li className="mb-1">Once the user scrolls, the <strong>background you set</strong> below fades in.</li>
                <li className="mb-1">Nav links are pulled automatically from section display names.</li>
                <li className="mb-1">The navigation button appears on the <strong>right on desktop</strong>.</li>
                <li>On mobile, the hamburger opens a full dropdown overlay with all nav links.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* ══ SETTINGS ════════════════════════════════════════════════════════════ */}
      <div className="row g-4">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center gap-2 py-2">
              <i className="bi bi-image text-primary" />
              <strong className="small">Logo</strong>
            </div>
            <div className="card-body">

              {/* Image dimensions guide */}
              <div className="alert alert-light border d-flex gap-2 py-2 mb-3">
                <i className="bi bi-rulers text-secondary flex-shrink-0 mt-1" style={{ fontSize: "0.9rem" }} />
                <div className="small text-muted" style={{ lineHeight: 1.5 }}>
                  <strong className="text-body">Recommended dimensions:</strong><br />
                  Height: <strong>80–120 px</strong> source (displays at ~44 px, 2× for retina)<br />
                  Width: proportional — no minimum, no maximum<br />
                  Format: <strong>transparent PNG</strong> or <strong>SVG</strong>
                </div>
              </div>

              <div className="mb-3">
                <ImageFieldWithUpload
                  label="Logo Image"
                  value={config.logoSrc}
                  onChange={(url) => setField("logoSrc", url)}
                  placeholder="/images/logo-placeholder.svg"
                  helpText="Transparent PNG or SVG — see dimensions guide above"
                  previewMaxHeight="80px"
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="logoAlt">
                  Alt Text
                </label>
                <input
                  id="logoAlt"
                  type="text"
                  className="form-control"
                  value={config.logoAlt}
                  onChange={(e) => setField("logoAlt", e.target.value)}
                  placeholder="Company name"
                />
                <div className="form-text">Screen-reader label — usually your company name</div>
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label fw-semibold" htmlFor="logoHeight">
                    Display Height (px)
                  </label>
                  <input
                    id="logoHeight"
                    type="number"
                    className="form-control"
                    value={config.logoHeight}
                    onChange={(e) =>
                      setField("logoHeight", Math.max(16, parseInt(e.target.value) || 44))
                    }
                    min={16}
                    max={200}
                  />
                  <div className="form-text">Default: 44 px · Range: 16–200 px</div>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold" htmlFor="logoWidth">
                    Display Width (px)
                  </label>
                  <input
                    id="logoWidth"
                    type="number"
                    className="form-control"
                    value={config.logoWidth}
                    onChange={(e) =>
                      setField("logoWidth", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    min={0}
                    max={600}
                  />
                  <div className="form-text">Set to <strong>0</strong> for automatic width</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Navigation Button + Scrolled Background (combined full-width card) ── */}
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center gap-2 py-2">
              <i className="bi bi-sliders text-secondary" />
              <strong className="small">Navbar Settings</strong>
            </div>
            <div className="card-body">
              <div className="row g-0">

                {/* Left column — Navigation Button */}
                <div className="col-md-7 pe-md-4" style={{ borderRight: "1px solid var(--bs-border-color)" }}>
                  <h6 className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-cursor text-success" />
                    Navigation Button
                  </h6>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="ctaShow"
                      checked={config.cta.show}
                      onChange={(e) => setCtaField("show", e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="ctaShow">
                      Show navigation button
                    </label>
                  </div>

                  {config.cta.show ? (
                    <>
                      <div className="row g-3 mb-3">
                        <div className="col-sm-6">
                          <label className="form-label fw-semibold" htmlFor="ctaText">Button Text</label>
                          <input
                            id="ctaText"
                            type="text"
                            className="form-control"
                            value={config.cta.text}
                            onChange={(e) => setCtaField("text", e.target.value)}
                            placeholder="Client Login"
                            maxLength={40}
                          />
                        </div>
                        <div className="col-sm-6">
                          <label className="form-label fw-semibold">Button Style</label>
                          <div className="d-flex gap-2">
                            {(["solid", "outlined", "ghost"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                className={`btn btn-sm flex-fill ${config.cta.style === s ? "btn-primary" : "btn-outline-secondary"}`}
                                onClick={() => setCtaField("style", s)}
                                style={{ textTransform: "capitalize" }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                          <div className="form-text">
                            {config.cta.style === "solid" && "Filled — best visibility"}
                            {config.cta.style === "outlined" && "Border only — subtle look"}
                            {config.cta.style === "ghost" && "Text only — minimal"}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">Link Target</label>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {[
                            { mode: "external" as const, label: "External URL",      icon: "bi-link-45deg" },
                            { mode: "anchor"   as const, label: "Page Section",      icon: "bi-hash" },
                            { mode: "page"     as const, label: "Page / PDF / Form", icon: "bi-file-earmark" },
                          ].map(({ mode, label, icon }) => (
                            <button
                              key={mode}
                              type="button"
                              className={`btn btn-sm ${ctaLinkTarget.mode === mode ? "btn-primary" : "btn-outline-secondary"}`}
                              onClick={() => {
                                if (mode === "external")
                                  updateCtaLinkTarget({ mode: "external", url: config.cta.href.startsWith("http") ? config.cta.href : "https://" });
                                else if (mode === "anchor")
                                  updateCtaLinkTarget({ mode: "anchor", sectionId: sections[0]?.id || "" });
                                else
                                  updateCtaLinkTarget({ mode: "page", slug: dynamicPages[0]?.slug || "" });
                              }}
                            >
                              <i className={`bi ${icon} me-1`} />
                              {label}
                            </button>
                          ))}
                        </div>

                        {ctaLinkTarget.mode === "external" && (
                          <div>
                            <input
                              type="url"
                              className="form-control"
                              value={ctaLinkTarget.url}
                              onChange={(e) => updateCtaLinkTarget({ mode: "external", url: e.target.value })}
                              placeholder="https://example.com or /client-login"
                            />
                            <div className="form-text">Full URL or internal path (/page-slug)</div>
                          </div>
                        )}

                        {ctaLinkTarget.mode === "anchor" && (
                          <div>
                            {sections.length === 0 ? (
                              <div className="alert alert-warning py-2 small mb-0">
                                <i className="bi bi-exclamation-triangle me-2" />
                                No landing page sections found.
                              </div>
                            ) : (
                              <select
                                className="form-select"
                                value={ctaLinkTarget.sectionId}
                                onChange={(e) => updateCtaLinkTarget({ mode: "anchor", sectionId: e.target.value })}
                              >
                                {sections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.navLabel || sec.displayName}
                                  </option>
                                ))}
                              </select>
                            )}
                            <div className="form-text">Scrolls to that section on click</div>
                          </div>
                        )}

                        {ctaLinkTarget.mode === "page" && (
                          <div>
                            {dynamicPages.length === 0 ? (
                              <div className="alert alert-warning py-2 small mb-0">
                                <i className="bi bi-exclamation-triangle me-2" />
                                No enabled pages found.{" "}
                                <a href="/admin/content/pages" className="alert-link">Create a page</a> first.
                              </div>
                            ) : (
                              <select
                                className="form-select"
                                value={ctaLinkTarget.slug}
                                onChange={(e) => updateCtaLinkTarget({ mode: "page", slug: e.target.value })}
                              >
                                {["designer", "full", "pdf", "form"].map((t) => {
                                  const group = dynamicPages.filter((p) => p.type === t);
                                  if (group.length === 0) return null;
                                  const groupLabel =
                                    t === "designer" ? "Designer Pages" :
                                    t === "full" ? "Full Pages" :
                                    t === "pdf" ? "PDF Pages" : "Form Pages";
                                  return (
                                    <optgroup key={t} label={groupLabel}>
                                      {group.map((p) => (
                                        <option key={p.slug} value={p.slug}>
                                          {p.title} (/{p.slug})
                                        </option>
                                      ))}
                                    </optgroup>
                                  );
                                })}
                              </select>
                            )}
                            <div className="form-text">Designer pages, PDFs, and forms are all listed</div>
                          </div>
                        )}
                      </div>

                      <div className="alert alert-light border py-2 small mb-0">
                        <i className="bi bi-info-circle me-1 text-primary" />
                        <strong>Resolved href:</strong> <code>{config.cta.href || "(empty)"}</code>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted small mb-0">
                      Enable the toggle to add a button on the right side of the navbar —
                      useful for <em>Client Login</em>, <em>Get Started</em>, or any call-to-action.
                    </p>
                  )}
                </div>

                {/* Right column — Scrolled Background */}
                <div className="col-md-5 ps-md-4 mt-4 mt-md-0">
                  <h6 className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-paint-bucket text-warning" />
                    Scrolled Background
                  </h6>
                  <p className="text-muted small mb-3" style={{ lineHeight: 1.6 }}>
                    The navbar starts <strong>transparent</strong> over the hero. Once the visitor
                    scrolls, this background fades in. Use 100% opacity for a solid bar, or lower
                    it for a frosted-glass effect.
                  </p>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="bgColor">Background Color</label>
                    <div className="input-group">
                      <input
                        id="bgColor"
                        type="color"
                        className="form-control form-control-color"
                        value={config.scrolledBackground.color}
                        onChange={(e) => setScrolledBg("color", e.target.value)}
                        title="Pick navbar background color"
                        style={{ width: "48px", minWidth: "48px" }}
                      />
                      <input
                        type="text"
                        className="form-control font-monospace"
                        value={config.scrolledBackground.color}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setScrolledBg("color", v);
                        }}
                        maxLength={7}
                        placeholder="#ffffff"
                      />
                    </div>
                    <div className="form-text">Hex code or use the colour picker</div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold" htmlFor="bgOpacity">
                      Opacity — <strong>{config.scrolledBackground.opacity}%</strong>
                    </label>
                    <input
                      id="bgOpacity"
                      type="range"
                      className="form-range"
                      min={0}
                      max={100}
                      step={1}
                      value={config.scrolledBackground.opacity}
                      onChange={(e) => setScrolledBg("opacity", parseInt(e.target.value))}
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>0% — transparent</span>
                      <span>100% — solid</span>
                    </div>
                    <div className="form-text mt-1">
                      Renders as <code>{bgPreviewColor}</code>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MobileNavBarProps {
  bg: string;
  border?: boolean;
  logoSrc: string;
  logoAlt: string;
  logoStyle: React.CSSProperties;
  hamColor: string;
  textColor?: string;
  showButton: boolean;
  buttonText: string;
  buttonStyle: "solid" | "outlined" | "ghost";
  dark?: boolean;
}

function MobileNavBar({ bg, border, logoSrc, logoAlt, logoStyle, hamColor, textColor, showButton, buttonText, buttonStyle, dark }: MobileNavBarProps) {
  return (
    <div
      style={{
        height: 52,
        background: bg,
        borderTop: border ? "1px solid rgba(0,0,0,0.08)" : undefined,
        display: "grid",
        gridTemplateColumns: "44px 1fr 44px",
        alignItems: "center",
        padding: "0 10px",
        gap: 4,
      }}
    >
      {/* Left: hamburger */}
      <div className="d-flex flex-column gap-1 align-items-start" style={{ paddingLeft: 4 }}>
        {[1,2,3].map(i => <div key={i} style={{ width: 20, height: 2, background: hamColor, borderRadius: 2 }} />)}
      </div>
      {/* Center: logo — takes remaining space, no overflow */}
      <div className="d-flex justify-content-center align-items-center" style={{ overflow: "hidden" }}>
        {logoSrc ? (
          <img src={logoSrc} alt={logoAlt} style={{ ...logoStyle, maxWidth: "100%", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap", fontWeight: 700, color: textColor || "#fff" }}>{logoAlt}</span>
        )}
      </div>
      {/* Right: nav button */}
      <div className="d-flex justify-content-end align-items-center">
        {showButton && <CtaPreviewButton text={buttonText} style={buttonStyle} dark={dark} />}
      </div>
    </div>
  );
}


interface CtaPreviewButtonProps {
  text: string;
  style: "solid" | "outlined" | "ghost";
  dark?: boolean;
}

function CtaPreviewButton({ text, style, dark }: CtaPreviewButtonProps) {
  const baseStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    padding: "4px 12px",
    borderRadius: "6px",
    cursor: "default",
    whiteSpace: "nowrap",
    fontWeight: 600,
    lineHeight: "1.4",
    border: "2px solid",
  };

  if (style === "solid") {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: "#3b82f6",
          borderColor: "#3b82f6",
          color: "#ffffff",
        }}
      >
        {text || "Button"}
      </span>
    );
  }

  if (style === "outlined") {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundColor: "transparent",
          borderColor: dark ? "#ffffff" : "#3b82f6",
          color: dark ? "#ffffff" : "#3b82f6",
        }}
      >
        {text || "Button"}
      </span>
    );
  }

  // ghost
  return (
    <span
      style={{
        ...baseStyle,
        backgroundColor: "transparent",
        borderColor: "transparent",
        color: dark ? "#ffffff" : "#111827",
      }}
    >
      {text || "Button"}
    </span>
  );
}
