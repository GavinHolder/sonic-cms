"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Editor from "@monaco-editor/react";
import type { StandalonePageConfig } from "@/types/page";
import SaveTemplateModal from "@/components/admin/SaveTemplateModal";
import TemplatePickerModal, { type CmsTemplate } from "@/components/admin/TemplatePickerModal";
import MediaPickerModal from "@/components/admin/MediaPickerModal";

function extractSlotNames(html: string): string[] {
  const seen = new Set<string>();
  for (const m of html.matchAll(/\{\{cms\.media\.([a-z0-9_-]+)\}\}/g)) {
    seen.add(m[1]);
  }
  return [...seen];
}

export interface StandaloneEditorSaveData {
  html: string;
  css: string;
  cssUrls: string[];
  mediaSlots: Record<string, string>;
}

interface Props {
  page: StandalonePageConfig;
  onSave: () => void;
  onCancel: () => void;
  /** When provided, called instead of the default PUT /api/pages/[slug] save. */
  saveOverride?: (data: StandaloneEditorSaveData) => Promise<void>;
}

type Tab = "html" | "css" | "files" | "media" | "vars";

const CMS_VARS = [
  { var: "{{cms.logo}}",      desc: "Logo image URL" },
  { var: "{{cms.company}}",   desc: "Company name" },
  { var: "{{cms.tagline}}",   desc: "Tagline / slogan" },
  { var: "{{cms.phone}}",     desc: "Phone number" },
  { var: "{{cms.email}}",     desc: "Email address" },
  { var: "{{cms.address}}",   desc: "Street address" },
  { var: "{{cms.city}}",      desc: "City" },
  { var: "{{cms.postal}}",    desc: "Postal / zip code" },
  { var: "{{cms.country}}",   desc: "Country" },
  { var: "{{cms.copyright}}", desc: "Copyright text" },
  { var: "{{cms.facebook}}",  desc: "Facebook URL" },
  { var: "{{cms.instagram}}", desc: "Instagram URL" },
  { var: "{{cms.twitter}}",   desc: "Twitter / X URL" },
  { var: "{{cms.linkedin}}",  desc: "LinkedIn URL" },
  { var: "{{cms.youtube}}",   desc: "YouTube URL" },
  { var: "{{cms.tiktok}}",    desc: "TikTok URL" },
];

export default function StandalonePageEditorModal({ page, onSave, onCancel, saveOverride }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const [html, setHtml] = useState(page.customHtml ?? "");
  const [css, setCss] = useState(page.customCss ?? "");
  const [cssUrls, setCssUrls] = useState<string[]>(page.customCssUrls ?? []);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showPickTemplate, setShowPickTemplate] = useState(false);
  const [templateSavedMsg, setTemplateSavedMsg] = useState<string | null>(null);
  const [mediaSlots, setMediaSlots] = useState<Record<string, string>>(page.mediaSlots ?? {});
  const [newSlotName, setNewSlotName] = useState("");
  const [mediaPickerFor, setMediaPickerFor] = useState<string | null>(null);
  const [dynPages, setDynPages] = useState<Array<{ slug: string; title: string }>>([]);
  const [dynForms, setDynForms] = useState<Array<{ slug: string; title: string }>>([]);
  const [dynFeatures, setDynFeatures] = useState<Array<{ slug: string; enabled: boolean }>>([]);
  const varsFetched = useRef(false);

  useEffect(() => {
    if (activeTab !== "vars" || varsFetched.current) return;
    varsFetched.current = true;
    Promise.all([
      fetch("/api/pages?limit=200").then(r => r.json()),
      fetch("/api/features").then(r => r.json()),
    ]).then(([pagesJson, featJson]) => {
      const all = (pagesJson?.data?.pages ?? []) as Array<{ slug: string; title: string; type: string; enabled: boolean }>;
      setDynPages(all.filter(p => p.enabled));
      setDynForms(all.filter(p => p.type === "form" && p.enabled));
      setDynFeatures((featJson?.data ?? []) as Array<{ slug: string; enabled: boolean }>);
    }).catch(() => {});
  }, [activeTab]);

  const detectedSlots = useMemo(() => extractSlotNames(html), [html]);

  useEffect(() => {
    if (detectedSlots.length === 0) return;
    setMediaSlots(prev => {
      const next = { ...prev };
      let changed = false;
      for (const name of detectedSlots) {
        if (!(name in next)) { next[name] = ""; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [detectedSlots]);

  const unsetSlots = detectedSlots.filter(name => !mediaSlots[name]);
  const showSlotWarning = page.enabled && unsetSlots.length > 0;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (saveOverride) {
        await saveOverride({ html, css, cssUrls, mediaSlots });
      } else {
        const res = await fetch(`/api/pages/${encodeURIComponent(page.slug)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customHtml: html,
            customCss: css,
            customCssUrls: JSON.stringify(cssUrls),
            mediaSlots: Object.keys(mediaSlots).length > 0 ? mediaSlots : null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? "Failed to save");
      }
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [html, css, cssUrls, mediaSlots, page.slug, onSave, saveOverride]);

  const addUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed || cssUrls.includes(trimmed)) return;
    setCssUrls(prev => [...prev, trimmed]);
    setNewUrl("");
  };

  const removeUrl = (i: number) => setCssUrls(prev => prev.filter((_, idx) => idx !== i));

  const moveUrl = (i: number, dir: -1 | 1) => {
    const next = [...cssUrls];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setCssUrls(next);
  };

  const addMediaSlot = () => {
    const name = newSlotName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!name || name in mediaSlots) return;
    setMediaSlots(prev => ({ ...prev, [name]: "" }));
    setNewSlotName("");
  };

  const removeMediaSlot = (name: string) => {
    setMediaSlots(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const copyVar = (v: string) => navigator.clipboard?.writeText(v).catch(() => {});

  const previewUrl = `/${page.slug}`;

  const handleTemplateSaved = (id: string) => {
    setShowSaveTemplate(false);
    setTemplateSavedMsg(`Template saved! (id: ${id.slice(0, 8)}…)`);
    setTimeout(() => setTemplateSavedMsg(null), 3000);
  };

  const handleTemplateApplied = (t: CmsTemplate) => {
    const data = t.data as { customHtml?: string; customCss?: string; customCssUrls?: string[] };
    if (data.customHtml !== undefined) setHtml(data.customHtml);
    if (data.customCss  !== undefined) setCss(data.customCss);
    if (data.customCssUrls !== undefined) setCssUrls(data.customCssUrls);
    setShowPickTemplate(false);
  };

  return (
    <>
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: "90vw" }}>
        <div className="modal-content" style={{ height: "90vh", display: "flex", flexDirection: "column" }}>

          {/* Header — standard Bootstrap admin style */}
          <div className="modal-header">
            <div>
              <h5 className="modal-title">
                <i className="bi bi-code-slash me-2 text-warning"></i>
                Standalone HTML Editor
                <span className="badge bg-warning text-dark ms-2" style={{ fontSize: "0.65rem" }}>
                  {page.slug}
                </span>
              </h5>
              <div className="text-muted small mt-1">
                {page.title}
                <span className="mx-2">·</span>
                <code className="text-primary">/{page.slug}</code>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="ms-2 text-primary" title="Preview in new tab">
                  <i className="bi bi-box-arrow-up-right" style={{ fontSize: "0.75rem" }}></i>
                </a>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={onCancel} disabled={saving} />
          </div>

          {/* Tab bar */}
          <div className="border-bottom px-3 pt-2" style={{ flexShrink: 0 }}>
            <ul className="nav nav-tabs border-0">
              {([
                { id: "html",  icon: "bi-filetype-html", label: "HTML" },
                { id: "css",   icon: "bi-filetype-css",  label: "CSS" },
                { id: "files", icon: "bi-link-45deg",    label: `CSS Files${cssUrls.length ? ` (${cssUrls.length})` : ""}` },
                { id: "media", icon: "bi-images",        label: `Media${Object.keys(mediaSlots).length ? ` (${Object.keys(mediaSlots).length})` : ""}${showSlotWarning ? " ⚠" : ""}` },
                { id: "vars",  icon: "bi-braces",        label: "Variables" },
              ] as { id: Tab; icon: string; label: string }[]).map(t => (
                <li className="nav-item" key={t.id}>
                  <button
                    className={`nav-link ${activeTab === t.id ? "active" : ""}`}
                    onClick={() => setActiveTab(t.id)}
                    style={{ border: "none", background: "none" }}
                  >
                    <i className={`bi ${t.icon} me-1`}></i>{t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="alert alert-danger mx-3 mt-3 mb-0 py-2">
              <i className="bi bi-exclamation-triangle me-2"></i>{error}
            </div>
          )}

          {/* Content area */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>

            {/* HTML editor */}
            <div style={{ display: activeTab === "html" ? "block" : "none", height: "100%" }}>
              <Editor
                height="100%"
                language="html"
                theme="vs-dark"
                value={html}
                onChange={v => setHtml(v || "")}
                onMount={editor => { setTimeout(() => editor.layout(), 50); setTimeout(() => editor.layout(), 250); }}
                options={{ minimap: { enabled: false }, lineNumbers: "on", fontSize: 13, wordWrap: "on", tabSize: 2, automaticLayout: true, scrollBeyondLastLine: false, formatOnPaste: true, bracketPairColorization: { enabled: true }, autoClosingBrackets: "always", padding: { top: 8 } }}
              />
            </div>

            {/* CSS editor */}
            <div style={{ display: activeTab === "css" ? "flex" : "none", flexDirection: "column", height: "100%" }}>
              <div className="alert alert-info m-3 mb-0 py-2 small">
                <i className="bi bi-info-circle me-1"></i>
                Injected as a <code>&lt;style&gt;</code> block in the page <code>&lt;head&gt;</code>. Use <code>{"{{cms.*}}"}</code> variables here too.
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <Editor
                  height="100%"
                  language="css"
                  theme="vs-dark"
                  value={css}
                  onChange={v => setCss(v || "")}
                  onMount={editor => { setTimeout(() => editor.layout(), 50); setTimeout(() => editor.layout(), 250); }}
                  options={{ minimap: { enabled: false }, lineNumbers: "on", fontSize: 13, wordWrap: "on", tabSize: 2, automaticLayout: true, scrollBeyondLastLine: false, formatOnPaste: true, padding: { top: 8 } }}
                />
              </div>
            </div>

            {/* CSS Files */}
            {activeTab === "files" && (
              <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
                <p className="text-muted small mb-3">
                  External stylesheets loaded before your HTML renders — CDN libraries, Google Fonts, or hosted files.
                  Injected as <code>&lt;link rel="stylesheet"&gt;</code> tags in the page <code>&lt;head&gt;</code>, in listed order.
                </p>

                <div className="d-flex gap-2 mb-4">
                  <input
                    type="url"
                    className="form-control form-control-sm"
                    placeholder="https://fonts.googleapis.com/css2?family=Archivo..."
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addUrl()}
                  />
                  <button className="btn btn-sm btn-warning" onClick={addUrl} disabled={!newUrl.trim()}>
                    <i className="bi bi-plus-lg me-1"></i>Add
                  </button>
                </div>

                {cssUrls.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-link-45deg fs-1 d-block mb-2 opacity-25"></i>
                    No CSS files added yet
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2 mb-4">
                    {cssUrls.map((url, i) => (
                      <div key={i} className="d-flex align-items-center gap-2 border rounded p-2 bg-light">
                        <span className="text-muted small" style={{ minWidth: 20 }}>{i + 1}</span>
                        <i className="bi bi-filetype-css text-primary"></i>
                        <code className="small flex-grow-1 text-truncate">{url}</code>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => moveUrl(i, -1)} disabled={i === 0} title="Move up"><i className="bi bi-chevron-up" style={{ fontSize: 10 }}></i></button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => moveUrl(i, 1)} disabled={i === cssUrls.length - 1} title="Move down"><i className="bi bi-chevron-down" style={{ fontSize: 10 }}></i></button>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info" title="Open URL"><i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }}></i></a>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeUrl(i)} title="Remove"><i className="bi bi-trash" style={{ fontSize: 10 }}></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-top pt-3">
                  <div className="text-muted small mb-2"><i className="bi bi-lightning me-1"></i>Quick-add common libraries:</div>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { label: "Bootstrap 5.3", url: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" },
                      { label: "Bootstrap Icons", url: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.min.css" },
                      { label: "Tailwind CDN", url: "https://cdn.tailwindcss.com" },
                      { label: "Animate.css", url: "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" },
                      { label: "Font Awesome 6", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" },
                    ].map(p => (
                      <button key={p.label} className="btn btn-sm btn-outline-secondary" onClick={() => { if (!cssUrls.includes(p.url)) setCssUrls(prev => [...prev, p.url]); }} disabled={cssUrls.includes(p.url)}>
                        <i className="bi bi-plus me-1"></i>{p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Media slots */}
            {activeTab === "media" && (
              <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
                <div className="alert alert-info py-2 small mb-4">
                  <i className="bi bi-images me-1"></i>
                  Named image slots for this page. Use <code>{"{{cms.media.SLOTNAME}}"}</code> in your HTML/CSS.
                  Upload images via the Media Library, then assign them to a slot name here.
                </div>

                <div className="d-flex gap-2 mb-4">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Slot name (e.g. hero-bg, logo-dark)"
                    value={newSlotName}
                    onChange={e => setNewSlotName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    onKeyDown={e => e.key === "Enter" && addMediaSlot()}
                    style={{ maxWidth: 280 }}
                  />
                  <button className="btn btn-sm btn-warning" onClick={addMediaSlot} disabled={!newSlotName.trim()}>
                    <i className="bi bi-plus-lg me-1"></i>Add Slot
                  </button>
                </div>

                {Object.keys(mediaSlots).length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-images fs-1 d-block mb-2 opacity-25"></i>
                    No media slots yet — add one above
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {Object.entries(mediaSlots).map(([name, url]) => (
                      <div key={name} className="border rounded p-3 bg-light">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div>
                            <code className="text-warning fw-semibold">{`{{cms.media.${name}}}`}</code>
                          </div>
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => copyVar(`{{cms.media.${name}}}`)} title="Copy variable">
                              <i className="bi bi-clipboard" style={{ fontSize: 11 }}></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => removeMediaSlot(name)} title="Remove slot">
                              <i className="bi bi-trash" style={{ fontSize: 11 }}></i>
                            </button>
                          </div>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          {url && (
                            <img src={url} alt={name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid #dee2e6", flexShrink: 0 }} />
                          )}
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Image URL (or pick from library)"
                            value={url}
                            onChange={e => setMediaSlots(prev => ({ ...prev, [name]: e.target.value }))}
                          />
                          <button className="btn btn-sm btn-outline-secondary text-nowrap" onClick={() => setMediaPickerFor(name)}>
                            <i className="bi bi-folder2-open me-1"></i>Pick
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Variables reference */}
            {activeTab === "vars" && (
              <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
                <div className="alert alert-info py-2 small mb-4">
                  <i className="bi bi-info-circle me-1"></i>
                  These variables are replaced with live CMS data at render time — server-side for Standalone pages, client-side for HTML blocks in flexible sections.
                  All values come from <strong>Admin → Settings → Site Config</strong>.
                  Click any variable to copy it.
                </div>

                <div className="row g-2 mb-4">
                  {CMS_VARS.map(v => (
                    <div className="col-12 col-md-6" key={v.var}>
                      <div
                        className="d-flex align-items-center justify-content-between border rounded p-2 bg-light"
                        style={{ cursor: "pointer" }}
                        onClick={() => copyVar(v.var)}
                        title="Click to copy"
                      >
                        <div>
                          <code className="text-warning fw-semibold">{v.var}</code>
                          <div className="text-muted small">{v.desc}</div>
                        </div>
                        <i className="bi bi-clipboard text-muted ms-2" style={{ fontSize: 12 }}></i>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dynamic: Page Links */}
                <div className="border-top pt-3 mb-4">
                  <div className="fw-semibold small mb-2">
                    <i className="bi bi-link-45deg me-1 text-primary"></i>
                    Page Links
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Replaced with the page URL (e.g. <code>/about</code>) or <code>#</code> if the page is not published/enabled.
                  </p>
                  {dynPages.length === 0 ? (
                    <div className="text-muted small fst-italic">No pages found</div>
                  ) : (
                    <div className="row g-2">
                      {dynPages.map(p => (
                        <div className="col-12 col-md-6" key={p.slug}>
                          <div className="d-flex align-items-center justify-content-between border rounded p-2 bg-light" style={{ cursor: "pointer" }} onClick={() => copyVar(`{{cms.pages.${p.slug}}}`)} title="Click to copy">
                            <div>
                              <code className="text-primary fw-semibold">{`{{cms.pages.${p.slug}}}`}</code>
                              <div className="text-muted small">{p.title}</div>
                            </div>
                            <i className="bi bi-clipboard text-muted ms-2" style={{ fontSize: 12 }}></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic: Feature Flags */}
                <div className="border-top pt-3 mb-4">
                  <div className="fw-semibold small mb-2">
                    <i className="bi bi-toggles me-1 text-success"></i>
                    Feature Flags
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Replaced with <code>"true"</code> or <code>"false"</code> based on the feature flag state.
                  </p>
                  {dynFeatures.length === 0 ? (
                    <div className="text-muted small fst-italic">No feature flags found</div>
                  ) : (
                    <div className="row g-2">
                      {dynFeatures.map(f => (
                        <div className="col-12 col-md-6" key={f.slug}>
                          <div className="d-flex align-items-center justify-content-between border rounded p-2 bg-light" style={{ cursor: "pointer" }} onClick={() => copyVar(`{{cms.features.${f.slug}}}`)} title="Click to copy">
                            <div>
                              <code className="text-success fw-semibold">{`{{cms.features.${f.slug}}}`}</code>
                              <div className="text-muted small">Currently: <strong>{f.enabled ? "true" : "false"}</strong></div>
                            </div>
                            <i className="bi bi-clipboard text-muted ms-2" style={{ fontSize: 12 }}></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Media Slots (from current page) */}
                <div className="border-top pt-3 mb-4">
                  <div className="fw-semibold small mb-2">
                    <i className="bi bi-images me-1 text-warning"></i>
                    Media Slots
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Replaced with the image URL assigned in the Media tab. Use the Media tab to manage slots.
                  </p>
                  {Object.keys(mediaSlots).length === 0 ? (
                    <div className="text-muted small fst-italic">No media slots defined — add them in the Media tab</div>
                  ) : (
                    <div className="row g-2">
                      {Object.keys(mediaSlots).map(name => (
                        <div className="col-12 col-md-6" key={name}>
                          <div className="d-flex align-items-center justify-content-between border rounded p-2 bg-light" style={{ cursor: "pointer" }} onClick={() => copyVar(`{{cms.media.${name}}}`)} title="Click to copy">
                            <div>
                              <code className="text-warning fw-semibold">{`{{cms.media.${name}}}`}</code>
                              <div className="text-muted small text-truncate" style={{ maxWidth: 200 }}>{mediaSlots[name] || "— no image set —"}</div>
                            </div>
                            <i className="bi bi-clipboard text-muted ms-2" style={{ fontSize: 12 }}></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Injection */}
                <div className="border-top pt-3 mb-4">
                  <div className="fw-semibold small mb-2">
                    <i className="bi bi-ui-checks me-1 text-info"></i>
                    Form Injection
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Replaced with a complete CMS form (with OTP verification). <code>/cms-forms.js</code> is auto-included when any form is injected.
                  </p>
                  {dynForms.length === 0 ? (
                    <div className="text-muted small fst-italic">No form pages found</div>
                  ) : (
                    <div className="row g-2">
                      {dynForms.map(f => (
                        <div className="col-12 col-md-6" key={f.slug}>
                          <div className="d-flex align-items-center justify-content-between border rounded p-2 bg-light" style={{ cursor: "pointer" }} onClick={() => copyVar(`{{cms.form.${f.slug}}}`)} title="Click to copy">
                            <div>
                              <code className="text-info fw-semibold">{`{{cms.form.${f.slug}}}`}</code>
                              <div className="text-muted small">{f.title}</div>
                            </div>
                            <i className="bi bi-clipboard text-muted ms-2" style={{ fontSize: 12 }}></i>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-top pt-3">
                  <div className="fw-semibold small mb-2">JS access (all page types)</div>
                  <pre className="bg-dark text-light rounded p-3 small" style={{ fontSize: "0.75rem" }}>{`// Available on every public page via window.__CMS_SITE
const site = window.__CMS_SITE;

site.logoUrl        // logo image URL
site.companyName    // company name
site.phone          // phone number
site.email          // email address
site.address        // street address
site.navLinks       // [{ type, label, href, navOrder }]

// Example: build a nav
site.navLinks.forEach(link => {
  if (link.href) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;
    nav.appendChild(a);
  }
});`}</pre>
                </div>

                <div className="border-top pt-3">
                  <div className="fw-semibold small mb-2">
                    <i className="bi bi-envelope-check me-1 text-warning"></i>
                    CMS Forms — leads pipeline
                  </div>
                  <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Add <code>/cms-forms.js</code> to send form submissions to admin email + leads DB.
                    Forms with an <code>email</code> field are OTP-verified before submission.
                  </p>
                  <pre className="bg-dark text-light rounded p-3 small" style={{ fontSize: "0.72rem" }}>{`<script src="/cms-forms.js"></script>

<form data-cms-form
      data-source="Contact Us"
      data-email-to="admin@example.com"
      data-success="Thanks! We'll be in touch.">
  <input type="text"  name="name"    data-label="Full Name"     required>
  <input type="email" name="email"   data-label="Email Address" required>
  <textarea           name="message" data-label="Message"></textarea>
  <button type="submit">Send</button>
</form>`}</pre>
                  <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                    <code>data-source</code> — form name in email subject &nbsp;·&nbsp;
                    <code>data-email-to</code> — override admin email &nbsp;·&nbsp;
                    <code>data-label</code> — field name in email
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {templateSavedMsg && (
            <div className="alert alert-success mx-3 mb-0 mt-2 py-2 small d-flex align-items-center gap-2">
              <i className="bi bi-bookmark-check"></i>{templateSavedMsg}
            </div>
          )}

          <div className="modal-footer">
            <div className="me-auto d-flex align-items-center gap-2 flex-wrap">
              <span className="text-muted small">
                <i className="bi bi-shield-lock me-1"></i>
                <code className="text-primary">/{page.slug}</code>
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowPickTemplate(true)}
                disabled={saving}
                title="Load from Template Library"
              >
                <i className="bi bi-bookmark me-1"></i>Load Template
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowSaveTemplate(true)}
                disabled={saving}
                title="Save current content as a template"
              >
                <i className="bi bi-bookmark-plus me-1"></i>Save as Template
              </button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
              <i className="bi bi-eye me-1"></i>Preview
            </a>
            <button className="btn btn-warning btn-sm" onClick={handleSave} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-1" role="status" />Saving…</>
                : <><i className="bi bi-floppy me-1"></i>Save All</>}
            </button>
          </div>

        </div>
      </div>
    </div>

    {showSaveTemplate && (
      <SaveTemplateModal
        templateType="standalone"
        data={{ customHtml: html, customCss: css, customCssUrls: cssUrls }}
        defaultName={page.title}
        onSaved={handleTemplateSaved}
        onCancel={() => setShowSaveTemplate(false)}
      />
    )}

    {showPickTemplate && (
      <TemplatePickerModal
        templateType="standalone"
        title="Load Standalone Template"
        onSelect={handleTemplateApplied}
        onCancel={() => setShowPickTemplate(false)}
      />
    )}

    {mediaPickerFor && (
      <MediaPickerModal
        isOpen={!!mediaPickerFor}
        onClose={() => setMediaPickerFor(null)}
        onSelect={(url) => {
          setMediaSlots(prev => ({ ...prev, [mediaPickerFor!]: url }));
          setMediaPickerFor(null);
        }}
        filterType="image"
      />
    )}
    </>
  );
}
