"use client";

import { useState, useEffect } from "react";
import {
  getTitleStatus,
  getDescStatus,
  statusClass,
  truncateToWidth,
  TITLE_FONT,
  DESC_FONT,
  TITLE_MAX_PX,
  DESC_MAX_PX,
} from "@/lib/seo-preview";

interface SeoFields {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noindex: boolean;
  nofollow: boolean;
}

interface Props {
  slug: string;
  pageTitle: string;
  onClose: () => void;
}

const empty: SeoFields = {
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  canonicalUrl: "",
  noindex: false,
  nofollow: false,
};

type PreviewTab = "google" | "facebook" | "twitter";

// ── Helpers ────────────────────────────────────────────────────────────────────

function charClass(len: number, warn: number, error: number): string {
  if (len === 0) return "text-muted";
  if (len > error) return "text-danger";
  if (len > warn) return "text-warning";
  return "text-success";
}

function borderClass(len: number, warn: number, error: number): string {
  if (len === 0) return "border-secondary";
  if (len > error) return "border-danger";
  if (len > warn) return "border-warning";
  return "border-success";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function GooglePreview({
  title,
  description,
  domain,
  slug,
}: {
  title: string;
  description: string;
  domain: string;
  slug: string;
}) {
  const titleStatus = getTitleStatus(title);
  const descStatus = getDescStatus(description);
  const bClass = titleStatus === "error" || descStatus === "error"
    ? "border-danger"
    : titleStatus === "warning" || descStatus === "warning"
    ? "border-warning"
    : "border-success";

  const { display: titleDisplay } = truncateToWidth(title || "Page Title", TITLE_MAX_PX, TITLE_FONT);
  const { display: descDisplay } = truncateToWidth(
    description || "Add a meta description to preview it here…",
    DESC_MAX_PX,
    DESC_FONT,
  );

  const breadcrumb = domain
    ? `${domain.replace(/^https?:\/\//, "")} › ${slug}`
    : `yourcompany.co.za › ${slug}`;

  return (
    <div
      className={`border rounded p-3 ${bClass}`}
      style={{ fontFamily: "arial, sans-serif", borderWidth: "2px !important" }}
    >
      {/* Site row */}
      <div className="d-flex align-items-center gap-2 mb-1">
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#e8eaed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: "#5f6368" }}>G</span>
        </div>
        <div>
          <div style={{ fontSize: 14, color: "#202124", lineHeight: 1.2 }}>
            {domain ? domain.replace(/^https?:\/\//, "").replace(/^www\./, "") : "yourcompany.co.za"}
          </div>
          <div style={{ fontSize: 12, color: "#4d5156" }}>{breadcrumb}</div>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 20,
          color: "#1a0dab",
          fontWeight: 400,
          lineHeight: 1.3,
          marginBottom: 4,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {titleDisplay}
      </div>

      {/* Description */}
      <div style={{ fontSize: 14, color: "#4d5156", lineHeight: 1.58 }}>
        {descDisplay}
      </div>

      {/* Status row */}
      <div className="d-flex gap-3 mt-2" style={{ fontSize: 11 }}>
        <span className={statusClass(titleStatus)}>
          Title: {title.length}/60
        </span>
        <span className={statusClass(descStatus)}>
          Desc: {description.length}/160
        </span>
      </div>
    </div>
  );
}

function FacebookPreview({
  title,
  description,
  image,
  domain,
}: {
  title: string;
  description: string;
  image: string;
  domain: string;
}) {
  const displayDomain = domain
    ? domain.replace(/^https?:\/\//, "").replace(/^www\./, "").toUpperCase()
    : "YOURCOMPANY.CO.ZA";
  const hasImage = !!image;

  return (
    <div className="border rounded overflow-hidden" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", maxWidth: 500 }}>
      {/* OG Image */}
      <div
        style={{
          width: "100%",
          paddingTop: "52.5%", // 16:9
          position: "relative",
          background: "#e4e6eb",
          overflow: "hidden",
        }}
      >
        {hasImage ? (
          <img
            src={image}
            alt="OG preview"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#8a8d91",
              gap: 6,
            }}
          >
            <i className="bi bi-image" style={{ fontSize: 32 }} />
            <span style={{ fontSize: 12 }}>No OG image set</span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-2" style={{ background: "#f0f2f5" }}>
        <div style={{ fontSize: 12, color: "#606770", textTransform: "uppercase", marginBottom: 2 }}>
          {displayDomain}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1e21", lineHeight: 1.3, marginBottom: 2 }}>
          {title || "Page title will appear here"}
        </div>
        <div style={{ fontSize: 14, color: "#606770", lineHeight: 1.4 }}>
          {description || "Meta description will appear here…"}
        </div>
      </div>

      {!hasImage && (
        <div className="px-2 pb-2" style={{ background: "#f0f2f5" }}>
          <span className="badge bg-warning text-dark" style={{ fontSize: 11 }}>
            <i className="bi bi-exclamation-triangle me-1" />
            Set an OG image for better engagement
          </span>
        </div>
      )}
    </div>
  );
}

function TwitterPreview({
  title,
  description,
  image,
  domain,
  cardType,
}: {
  title: string;
  description: string;
  image: string;
  domain: string;
  cardType: "summary" | "summary_large_image";
}) {
  const displayDomain = domain
    ? domain.replace(/^https?:\/\//, "").replace(/^www\./, "")
    : "yourcompany.co.za";
  const hasImage = !!image;
  const isLarge = cardType === "summary_large_image";

  return (
    <div
      className="border rounded overflow-hidden"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: 500 }}
    >
      {isLarge ? (
        <>
          {/* Large image top */}
          <div
            style={{
              width: "100%",
              paddingTop: "52.5%",
              position: "relative",
              background: "#eff3f4",
              overflow: "hidden",
            }}
          >
            {hasImage ? (
              <img
                src={image}
                alt="Twitter preview"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8899a6" }}
              >
                <i className="bi bi-image" style={{ fontSize: 32 }} />
              </div>
            )}
          </div>
          <div className="p-3" style={{ background: "#fff" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f1419", marginBottom: 2 }}>
              {title || "Page title will appear here"}
            </div>
            <div style={{ fontSize: 15, color: "#536471", lineHeight: 1.4, marginBottom: 4 }}>
              {description || "Meta description will appear here…"}
            </div>
            <div style={{ fontSize: 15, color: "#536471" }}>
              <i className="bi bi-link-45deg me-1" />
              {displayDomain}
            </div>
          </div>
        </>
      ) : (
        /* Summary card — side by side */
        <div className="d-flex" style={{ background: "#fff" }}>
          <div
            style={{
              width: 120,
              flexShrink: 0,
              background: "#eff3f4",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {hasImage ? (
              <img
                src={image}
                alt="Twitter preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8899a6", minHeight: 100 }}
              >
                <i className="bi bi-image" style={{ fontSize: 24 }} />
              </div>
            )}
          </div>
          <div className="p-3" style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f1419", marginBottom: 2 }}>
              {title || "Page title will appear here"}
            </div>
            <div style={{ fontSize: 15, color: "#536471", lineHeight: 1.4, marginBottom: 4 }}>
              {description || "Meta description will appear here…"}
            </div>
            <div style={{ fontSize: 15, color: "#536471" }}>
              <i className="bi bi-link-45deg me-1" />
              {displayDomain}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SeoPageEditorModal({ slug, pageTitle, onClose }: Props) {
  const [fields, setFields] = useState<SeoFields>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [notInDb, setNotInDb] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("google");
  const [canonicalBase, setCanonicalBase] = useState("");
  const [siteOgImage, setSiteOgImage] = useState("");
  const [twitterCard, setTwitterCard] = useState<"summary" | "summary_large_image">("summary_large_image");
  const [socialOpen, setSocialOpen] = useState(false);

  // ── Load page SEO fields ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [pageRes, seoRes] = await Promise.all([
          fetch(`/api/pages/${encodeURIComponent(slug)}`),
          fetch("/api/seo"),
        ]);

        if (seoRes.ok) {
          const sj = await seoRes.json();
          const cfg = sj.data ?? sj;
          setCanonicalBase(cfg.canonicalBase ?? "");
          setSiteOgImage(cfg.social?.ogImage ?? "");
          setTwitterCard(cfg.social?.twitterCard ?? "summary_large_image");
        }

        if (!pageRes.ok) { setNotInDb(true); return; }
        const j = await pageRes.json();
        if (!j.success) { setNotInDb(true); return; }
        const p = j.data?.page ?? j.data;
        setFields({
          metaTitle: p.metaTitle || "",
          metaDescription: p.metaDescription || "",
          metaKeywords: p.metaKeywords || "",
          ogTitle: p.ogTitle || "",
          ogDescription: p.ogDescription || "",
          ogImage: p.ogImage || "",
          canonicalUrl: p.canonicalUrl || "",
          noindex: !!p.noindex,
          nofollow: !!p.nofollow,
        });
      } catch {
        setNotInDb(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3000);
    return () => clearTimeout(t);
  }, [alert]);

  const set = <K extends keyof SeoFields>(key: K, value: SeoFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaTitle: fields.metaTitle || null,
          metaDescription: fields.metaDescription || null,
          metaKeywords: fields.metaKeywords || null,
          ogTitle: fields.ogTitle || null,
          ogDescription: fields.ogDescription || null,
          ogImage: fields.ogImage || null,
          canonicalUrl: fields.canonicalUrl || null,
          noindex: fields.noindex,
          nofollow: fields.nofollow,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setAlert({ type: "success", message: "SEO settings saved." });
      } else {
        setAlert({ type: "error", message: j.error || "Failed to save." });
      }
    } catch {
      setAlert({ type: "error", message: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  // ── Derived preview values ────────────────────────────────────────────────
  const previewTitle = fields.metaTitle || pageTitle || slug;
  const previewDesc = fields.metaDescription || "";
  const previewOgTitle = fields.ogTitle || previewTitle;
  const previewOgDesc = fields.ogDescription || previewDesc;
  const previewOgImage = fields.ogImage || siteOgImage;
  const autoCanonical = canonicalBase
    ? `${canonicalBase}/${slug}`
    : `https://yourcompany.co.za/${slug}`;

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop fade show" style={{ zIndex: 1054 }} onClick={onClose} />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 1055 }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="modal-dialog modal-dialog-scrollable"
          style={{ maxWidth: 960 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header border-bottom">
              <h5 className="modal-title">
                <i className="bi bi-search me-2 text-primary" />
                SEO Settings —{" "}
                <span className="text-muted fw-normal">{pageTitle || slug}</span>
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            {/* Body */}
            <div className="modal-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading…</span>
                  </div>
                </div>
              ) : notInDb ? (
                <div className="p-4">
                  <div className="alert alert-warning mb-0">
                    <i className="bi bi-exclamation-triangle me-2" />
                    This page is not yet in the database. SEO settings can only be set for pages
                    that have been saved to the database (published or draft pages in the admin).
                  </div>
                </div>
              ) : (
                <div className="row g-0" style={{ minHeight: 500 }}>
                  {/* ── LEFT — inputs (60%) ──────────────────────────── */}
                  <div
                    className="col-12 col-lg-7 p-4 border-end"
                    style={{ overflowY: "auto", maxHeight: "80vh" }}
                  >
                    {alert && (
                      <div
                        className={`alert alert-${alert.type === "success" ? "success" : "danger"} alert-dismissible mb-4`}
                      >
                        {alert.message}
                        <button className="btn-close" onClick={() => setAlert(null)} />
                      </div>
                    )}

                    {/* Meta Title */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold mb-1">Meta Title</label>
                      <input
                        type="text"
                        className={`form-control ${fields.metaTitle.length > 70 ? "is-invalid" : fields.metaTitle.length > 60 ? "border-warning" : ""}`}
                        value={fields.metaTitle}
                        onChange={(e) => set("metaTitle", e.target.value)}
                        placeholder={`Blank → use page title: "${pageTitle}"`}
                        maxLength={80}
                      />
                      <div className={`form-text ${charClass(fields.metaTitle.length, 60, 70)}`}>
                        {fields.metaTitle.length}/60
                        {fields.metaTitle.length === 0 && " — leave blank to use page title"}
                        {fields.metaTitle.length > 70 && " — too long, Google will truncate"}
                        {fields.metaTitle.length > 60 && fields.metaTitle.length <= 70 && " — slightly over ideal"}
                        {fields.metaTitle.length > 0 && fields.metaTitle.length <= 60 && " — good length"}
                      </div>
                    </div>

                    {/* Meta Description */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold mb-1">Meta Description</label>
                      <textarea
                        className={`form-control ${fields.metaDescription.length > 180 ? "is-invalid" : fields.metaDescription.length > 160 ? "border-warning" : ""}`}
                        rows={3}
                        value={fields.metaDescription}
                        onChange={(e) => set("metaDescription", e.target.value)}
                        placeholder="Describe this page in 50–160 characters for search results…"
                        maxLength={300}
                      />
                      <div className={`form-text ${charClass(fields.metaDescription.length, 160, 180)}`}>
                        {fields.metaDescription.length}/160
                        {fields.metaDescription.length === 0 && " — required for good CTR"}
                        {fields.metaDescription.length > 0 && fields.metaDescription.length < 50 && " — too short"}
                        {fields.metaDescription.length >= 50 && fields.metaDescription.length <= 160 && " — good length"}
                        {fields.metaDescription.length > 160 && fields.metaDescription.length <= 180 && " — slightly over, may be cut"}
                        {fields.metaDescription.length > 180 && " — too long, will be truncated"}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold mb-1">Meta Keywords</label>
                      <input
                        type="text"
                        className="form-control"
                        value={fields.metaKeywords}
                        onChange={(e) => set("metaKeywords", e.target.value)}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                      <div className="form-text text-muted">
                        Comma-separated. Low ranking impact but useful for internal search.
                      </div>
                    </div>

                    {/* Social overrides — collapsible accordion */}
                    <div className="mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm w-100 d-flex justify-content-between align-items-center"
                        onClick={() => setSocialOpen((o) => !o)}
                        aria-expanded={socialOpen}
                      >
                        <span>
                          <i className="bi bi-share me-2" />
                          Customise social sharing
                        </span>
                        <i className={`bi bi-chevron-${socialOpen ? "up" : "down"}`} />
                      </button>

                      {socialOpen && (
                        <div className="border rounded p-3 mt-2">
                          <div className="mb-3">
                            <label className="form-label fw-semibold mb-1">OG Title</label>
                            <input
                              type="text"
                              className="form-control"
                              value={fields.ogTitle}
                              onChange={(e) => set("ogTitle", e.target.value)}
                              placeholder={`Default: "${previewTitle}"`}
                            />
                          </div>

                          <div className="mb-3">
                            <label className="form-label fw-semibold mb-1">OG Description</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={fields.ogDescription}
                              onChange={(e) => set("ogDescription", e.target.value)}
                              placeholder="Default: meta description"
                            />
                          </div>

                          <div>
                            <label className="form-label fw-semibold mb-1">OG Image URL</label>
                            <input
                              type="text"
                              className="form-control"
                              value={fields.ogImage}
                              onChange={(e) => set("ogImage", e.target.value)}
                              placeholder={siteOgImage || "https://… or /images/page-og.jpg"}
                            />
                            <div className="form-text text-muted">
                              Leave blank to use the site-wide OG image.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced */}
                    <hr className="my-3" />
                    <div className="small fw-semibold text-muted mb-3">ADVANCED</div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold mb-1">Canonical URL Override</label>
                      <input
                        type="url"
                        className="form-control"
                        value={fields.canonicalUrl}
                        onChange={(e) => set("canonicalUrl", e.target.value)}
                        placeholder={autoCanonical}
                      />
                      <div className="form-text text-muted">
                        Leave blank — auto-generated from Canonical Base + page slug.
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="form-check form-switch">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="noindex"
                            role="switch"
                            checked={fields.noindex}
                            onChange={(e) => set("noindex", e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="noindex">
                            <span className={fields.noindex ? "text-danger fw-semibold" : ""}>
                              noindex
                            </span>
                            <div className="form-text mb-0">Hide this page from Google search results</div>
                          </label>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="form-check form-switch">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="nofollow"
                            role="switch"
                            checked={fields.nofollow}
                            onChange={(e) => set("nofollow", e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="nofollow">
                            nofollow
                            <div className="form-text mb-0">
                              Don&apos;t pass link authority to outbound links
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── RIGHT — live preview (40%) ───────────────────── */}
                  <div
                    className="col-12 col-lg-5 p-4 bg-light"
                    style={{ overflowY: "auto", maxHeight: "80vh" }}
                  >
                    <div className="small fw-semibold text-muted mb-3">LIVE PREVIEW</div>

                    {/* Tab buttons */}
                    <div className="btn-group btn-group-sm mb-3 w-100" role="group">
                      {(["google", "facebook", "twitter"] as PreviewTab[]).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          className={`btn ${previewTab === tab ? "btn-dark" : "btn-outline-secondary"}`}
                          onClick={() => setPreviewTab(tab)}
                        >
                          {tab === "google" && <i className="bi bi-google me-1" />}
                          {tab === "facebook" && <i className="bi bi-facebook me-1" />}
                          {tab === "twitter" && <i className="bi bi-twitter-x me-1" />}
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Previews */}
                    {previewTab === "google" && (
                      <GooglePreview
                        title={previewTitle}
                        description={previewDesc}
                        domain={canonicalBase}
                        slug={slug}
                      />
                    )}

                    {previewTab === "facebook" && (
                      <FacebookPreview
                        title={previewOgTitle}
                        description={previewOgDesc}
                        image={previewOgImage}
                        domain={canonicalBase}
                      />
                    )}

                    {previewTab === "twitter" && (
                      <TwitterPreview
                        title={previewOgTitle}
                        description={previewOgDesc}
                        image={previewOgImage}
                        domain={canonicalBase}
                        cardType={twitterCard}
                      />
                    )}

                    {/* noindex warning */}
                    {fields.noindex && (
                      <div className="alert alert-danger mt-3 mb-0 py-2 small">
                        <i className="bi bi-eye-slash me-2" />
                        <strong>noindex is on</strong> — this page won&apos;t appear in search results.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && !notInDb && (
              <div className="modal-footer border-top">
                <button className="btn btn-outline-secondary" onClick={onClose}>
                  Close
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-floppy me-1" />
                      Save SEO Settings
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
