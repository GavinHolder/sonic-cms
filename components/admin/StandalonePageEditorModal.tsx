"use client";

import { useState, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { StandalonePageConfig } from "@/types/page";

interface Props {
  page: StandalonePageConfig;
  onSave: () => void;
  onCancel: () => void;
}

type Tab = "html" | "css" | "files";

export default function StandalonePageEditorModal({ page, onSave, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const [html, setHtml] = useState(page.customHtml ?? "");
  const [css, setCss] = useState(page.customCss ?? "");
  const [cssUrls, setCssUrls] = useState<string[]>(page.customCssUrls ?? []);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const htmlEditorRef = useRef<any>(null);
  const cssEditorRef = useRef<any>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(page.slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customHtml: html,
          customCss: css,
          customCssUrls: JSON.stringify(cssUrls),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to save");
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [html, css, cssUrls, page.slug, onSave]);

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

  const previewUrl = `/standalone/${page.slug}`;

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "8px 18px",
    border: "none",
    borderBottom: activeTab === t ? "2px solid #f59e0b" : "2px solid transparent",
    background: "none",
    color: activeTab === t ? "#f59e0b" : "#9ca3af",
    fontWeight: activeTab === t ? 600 : 400,
    cursor: "pointer",
    fontSize: 13,
    transition: "color 0.15s",
  });

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 1055 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content" style={{ height: "92vh", display: "flex", flexDirection: "column", background: "#111827" }}>

          {/* Header */}
          <div className="modal-header border-0 pb-0" style={{ flexShrink: 0, background: "#111827" }}>
            <div>
              <h5 className="modal-title mb-0" style={{ color: "#f9fafb" }}>
                <i className="bi bi-code-slash me-2 text-warning"></i>
                Standalone Page Editor
              </h5>
              <div className="small mt-1" style={{ color: "#6b7280" }}>
                {page.title}
                <span className="mx-2">·</span>
                <code style={{ color: "#60a5fa" }}>/standalone/{page.slug}</code>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ms-2"
                  title="Open preview"
                  style={{ color: "#60a5fa" }}
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                </a>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onCancel}
              disabled={saving}
            />
          </div>

          {/* Tab bar */}
          <div style={{ borderBottom: "1px solid #1f2937", flexShrink: 0, background: "#111827", display: "flex", alignItems: "center", paddingLeft: 16 }}>
            <button style={tabStyle("html")} onClick={() => setActiveTab("html")}>
              <i className="bi bi-filetype-html me-1"></i>HTML
            </button>
            <button style={tabStyle("css")} onClick={() => setActiveTab("css")}>
              <i className="bi bi-filetype-css me-1"></i>CSS
            </button>
            <button style={tabStyle("files")} onClick={() => setActiveTab("files")}>
              <i className="bi bi-link-45deg me-1"></i>CSS Files
              {cssUrls.length > 0 && (
                <span style={{ marginLeft: 6, background: "#f59e0b", color: "#000", borderRadius: 10, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>
                  {cssUrls.length}
                </span>
              )}
            </button>
          </div>

          {error && (
            <div className="alert alert-danger m-3 mb-0 py-2" style={{ flexShrink: 0 }}>
              <i className="bi bi-exclamation-triangle me-2"></i>{error}
            </div>
          )}

          {/* Editor area */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>

            {/* HTML tab */}
            <div style={{ display: activeTab === "html" ? "flex" : "none", flex: 1, minHeight: 0, flexDirection: "column" }}>
              <Editor
                height="100%"
                language="html"
                theme="vs-dark"
                value={html}
                onChange={(v) => setHtml(v || "")}
                onMount={(editor) => {
                  htmlEditorRef.current = editor;
                  setTimeout(() => editor.layout(), 50);
                  setTimeout(() => editor.layout(), 250);
                }}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  fontSize: 13,
                  wordWrap: "on",
                  tabSize: 2,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  formatOnPaste: true,
                  bracketPairColorization: { enabled: true },
                  autoClosingBrackets: "always",
                  padding: { top: 8 },
                }}
              />
            </div>

            {/* CSS tab */}
            <div style={{ display: activeTab === "css" ? "flex" : "none", flex: 1, minHeight: 0, flexDirection: "column" }}>
              <div style={{ padding: "6px 16px", background: "#0d1117", flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  <i className="bi bi-info-circle me-1"></i>
                  Injected as a <code style={{ color: "#60a5fa" }}>&lt;style&gt;</code> block in the page head — no selector conflicts with CMS styles.
                </span>
              </div>
              <Editor
                height="100%"
                language="css"
                theme="vs-dark"
                value={css}
                onChange={(v) => setCss(v || "")}
                onMount={(editor) => {
                  cssEditorRef.current = editor;
                  setTimeout(() => editor.layout(), 50);
                  setTimeout(() => editor.layout(), 250);
                }}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  fontSize: 13,
                  wordWrap: "on",
                  tabSize: 2,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  formatOnPaste: true,
                  bracketPairColorization: { enabled: true },
                  padding: { top: 8 },
                }}
              />
            </div>

            {/* CSS Files tab */}
            {activeTab === "files" && (
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24, background: "#0d1117" }}>
                <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
                  External CSS files are loaded before your HTML renders — great for CDN libraries, Google Fonts, or hosted stylesheets.
                  They are injected as <code style={{ color: "#60a5fa" }}>&lt;link rel="stylesheet"&gt;</code> tags in the page head, in order.
                </p>

                {/* Add URL input */}
                <div className="d-flex gap-2 mb-4">
                  <input
                    type="url"
                    className="form-control form-control-sm"
                    placeholder="https://fonts.googleapis.com/css2?family=Archivo..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addUrl()}
                    style={{ background: "#1f2937", border: "1px solid #374151", color: "#f9fafb", flexGrow: 1 }}
                  />
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={addUrl}
                    disabled={!newUrl.trim()}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Add
                  </button>
                </div>

                {cssUrls.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#4b5563", padding: "40px 0" }}>
                    <i className="bi bi-link-45deg" style={{ fontSize: 32, display: "block", marginBottom: 8 }}></i>
                    No CSS files added yet
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {cssUrls.map((url, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          background: "#1f2937", border: "1px solid #374151",
                          borderRadius: 6, padding: "8px 12px",
                        }}
                      >
                        <span style={{ color: "#6b7280", fontSize: 12, minWidth: 22, textAlign: "center" }}>
                          {i + 1}
                        </span>
                        <i className="bi bi-filetype-css" style={{ color: "#60a5fa", fontSize: 14 }}></i>
                        <code style={{ color: "#d1d5db", fontSize: 12, flex: 1, wordBreak: "break-all" }}>{url}</code>
                        <div className="d-flex gap-1 ms-2">
                          <button
                            className="btn btn-sm"
                            style={{ background: "#374151", color: "#9ca3af", padding: "2px 6px" }}
                            onClick={() => moveUrl(i, -1)}
                            disabled={i === 0}
                            title="Move up"
                          >
                            <i className="bi bi-chevron-up" style={{ fontSize: 10 }}></i>
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: "#374151", color: "#9ca3af", padding: "2px 6px" }}
                            onClick={() => moveUrl(i, 1)}
                            disabled={i === cssUrls.length - 1}
                            title="Move down"
                          >
                            <i className="bi bi-chevron-down" style={{ fontSize: 10 }}></i>
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm"
                            style={{ background: "#374151", color: "#60a5fa", padding: "2px 6px" }}
                            title="Open URL"
                          >
                            <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }}></i>
                          </a>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            style={{ padding: "2px 6px" }}
                            onClick={() => removeUrl(i)}
                            title="Remove"
                          >
                            <i className="bi bi-trash" style={{ fontSize: 10 }}></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick-add presets */}
                <div className="mt-4">
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Quick-add common libraries:</div>
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { label: "Bootstrap 5.3", url: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" },
                      { label: "Bootstrap Icons", url: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.min.css" },
                      { label: "Tailwind CDN", url: "https://cdn.tailwindcss.com" },
                      { label: "Animate.css", url: "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" },
                      { label: "Font Awesome 6", url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        className="btn btn-sm"
                        style={{ background: "#1f2937", border: "1px solid #374151", color: "#9ca3af", fontSize: 11 }}
                        onClick={() => {
                          if (!cssUrls.includes(preset.url)) setCssUrls(prev => [...prev, preset.url]);
                        }}
                        disabled={cssUrls.includes(preset.url)}
                      >
                        <i className="bi bi-plus me-1"></i>{preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="d-flex align-items-center justify-content-between px-4 py-3"
            style={{ borderTop: "1px solid #1f2937", flexShrink: 0, background: "#111827" }}
          >
            <div style={{ fontSize: 11, color: "#4b5563" }}>
              <i className="bi bi-shield-lock me-1"></i>
              Admin-only content · rendered at
              <code style={{ color: "#60a5fa", marginLeft: 4 }}>/standalone/{page.slug}</code>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-secondary" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-info"
              >
                <i className="bi bi-eye me-1"></i>Preview
              </a>
              <button className="btn btn-sm btn-warning" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm me-1" role="status" />Saving…</>
                ) : (
                  <><i className="bi bi-floppy me-1"></i>Save All</>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
