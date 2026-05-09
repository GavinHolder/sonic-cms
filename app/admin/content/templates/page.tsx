"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import StandalonePageEditorModal from "@/components/admin/StandalonePageEditorModal";
import type { StandaloneEditorSaveData } from "@/components/admin/StandalonePageEditorModal";

interface CmsTemplate {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  sectionType: string | null;
  thumbnail: string | null;
  data: Record<string, unknown>;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

type FilterType = "all" | "standalone" | "section" | "page";
type SectionFilter = "all" | "HERO" | "NORMAL" | "CTA" | "FOOTER" | "FLEXIBLE";

const TYPE_INFO: Record<string, { label: string; color: string; icon: string }> = {
  standalone: { label: "Standalone", color: "warning",  icon: "bi-code-slash" },
  section:    { label: "Section",    color: "primary",  icon: "bi-layout-split" },
  page:       { label: "Page",       color: "success",  icon: "bi-file-earmark" },
};

const SECTION_ICONS: Record<string, string> = {
  HERO:     "bi-stars",
  NORMAL:   "bi-file-earmark-text",
  CTA:      "bi-megaphone",
  FOOTER:   "bi-layout-text-window-reverse",
  FLEXIBLE: "bi-grid-1x2",
};

function toSlug(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface UseAsPageModalProps {
  template: CmsTemplate;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

function UseAsPageModal({ template, onClose, onCreated }: UseAsPageModalProps) {
  const [title, setTitle]   = useState(template.name);
  const [slug, setSlug]     = useState(toSlug(template.name));
  const [slugEdited, setSlugEdited] = useState(false);
  const [setAsHome, setSetAsHome]   = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugEdited) setSlug(toSlug(v));
  };

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugEdited(true);
  };

  const handleCreate = async () => {
    if (!slug || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let pageRes: Response;

      if (template.templateType === "standalone") {
        const data = template.data as { customHtml?: string; customCss?: string; customCssUrls?: string[]; mediaSlots?: Record<string, string> };
        pageRes = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            title: title.trim(),
            type: "standalone",
            enabled: true,
            status: "PUBLISHED",
            customHtml:    data.customHtml    ?? "",
            customCss:     data.customCss     ?? "",
            customCssUrls: data.customCssUrls ? JSON.stringify(data.customCssUrls) : "[]",
            mediaSlots:    JSON.stringify(data.mediaSlots ?? {}),
          }),
        });
      } else {
        // section / page templates → create a full landing-style page
        pageRes = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            title: title.trim(),
            type: "full",
            enabled: true,
            status: "PUBLISHED",
          }),
        });

        // For section templates: add the template's section to the new page
        if (pageRes.ok && template.templateType === "section") {
          const sectionData = template.data as Record<string, unknown>;
          await fetch("/api/sections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageSlug: slug, ...sectionData }),
          });
        }
      }

      const json = await pageRes.json();
      if (!pageRes.ok) {
        setError(json?.error || "Failed to create page");
        setSaving(false);
        return;
      }

      if (setAsHome) {
        await fetch("/api/site-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homePage: slug }),
        });
      }

      onCreated(slug);
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-rocket-takeoff me-2 text-warning"></i>Use as Page
            </h5>
            <button className="btn-close" onClick={onClose} disabled={saving} />
          </div>
          <div className="modal-body">
            <p className="text-muted small mb-3">
              {template.templateType === "standalone"
                ? <>Creates a new <strong>Standalone page</strong> pre-filled with <em>{template.name}</em>. Live immediately at the URL below.</>
                : <>Creates a new <strong>page</strong> with the <em>{template.name}</em> {template.templateType}. Live immediately at the URL below.</>
              }
            </p>
            <div className="mb-3">
              <label className="form-label fw-semibold">Page Title</label>
              <input
                className="form-control"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Services"
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">URL Slug</label>
              <div className="input-group">
                <span className="input-group-text text-muted">/</span>
                <input
                  className="form-control font-monospace"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="services"
                />
              </div>
              {slug && (
                <div className="mt-1 text-muted small">
                  Live at: <code className="text-warning">/{slug}</code>
                </div>
              )}
            </div>
            <div className="form-check border rounded p-3 mb-2" style={{ background: setAsHome ? "#eff6ff" : "#f8f9fa", borderColor: setAsHome ? "#0d6efd" : "#dee2e6" }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="setAsHome"
                checked={setAsHome}
                onChange={e => setSetAsHome(e.target.checked)}
              />
              <label className="form-check-label fw-semibold small" htmlFor="setAsHome">
                <i className="bi bi-house-door me-1 text-primary" />Set as website homepage
              </label>
              <div className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                Visitors going to <code>/</code> will see this page. The URL stays <code>/</code> — nothing internal is exposed.
              </div>
            </div>
            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="bi bi-exclamation-circle me-1"></i>{error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              className="btn btn-warning"
              onClick={handleCreate}
              disabled={saving || !slug || !title.trim()}
            >
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />Creating…</>
                : <><i className="bi bi-rocket-takeoff me-2"></i>Create Page</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AnalysisItem {
  type: string;
  detail: string;
  suggestion?: string;
  occurrences?: string[];
}

interface ImportAnalysis {
  autoHandled: AnalysisItem[];
  needsAttention: AnalysisItem[];
}

interface MediaFile {
  name: string;
  url: string;
  type: string;
}

interface FormPage {
  slug: string;
  title: string;
}

interface MediaAsset {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  altText: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
}

interface CoverageMap {
  id: string;
  slug: string;
  name: string;
}

// ── Client-safe slot name utilities (mirrors lib/template-import-utils.ts) ──
function localSrcToSlotName(src: string): string {
  const base = (src.split("/").pop() ?? src).split(".").slice(0, -1).join(".") || src;
  return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "media";
}

function labelForPath(src: string): string {
  const filename = src.split("/").pop() ?? src;
  const base = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
  const slideNum = base.match(/slide[-_\s]?(\d+)|(\d+)[-_\s]?slide/i);
  if (slideNum) return `Slide ${slideNum[1] ?? slideNum[2]}`;
  if (/^hero\b/i.test(base)) return "Hero Background";
  if (/banner/i.test(base)) return "Banner";
  if (/about/i.test(base)) return "About Section";
  if (/bg\b|background/i.test(base)) return "Background";
  if (/team/i.test(base)) return "Team Photo";
  if (/logo/i.test(base)) return "Logo";
  if (/thumb/i.test(base)) return "Thumbnail";
  if (/gallery/i.test(base)) return "Gallery Image";
  if (/feature/i.test(base)) return "Feature Image";
  return base.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || src;
}

function InlineMediaPicker({
  files, search, onSearch, onPick, onUploaded, mediaType = "image",
}: {
  files: MediaFile[];
  search: string;
  onSearch: (s: string) => void;
  onPick: (url: string) => void;
  onUploaded?: (url: string, name: string) => void;
  mediaType?: "image" | "video";
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (f: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/media/upload-simple", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload failed");
      if (onUploaded) onUploaded(json.url, f.name);
      onPick(json.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  };

  const filtered = files.filter(
    f => f.type.startsWith(mediaType + "/") &&
         (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="border rounded p-2 mt-2" style={{ background: "#fff", maxHeight: 240, overflowY: "auto" }}>
      <div className="d-flex gap-2 mb-2">
        <input
          className="form-control form-control-sm flex-grow-1"
          placeholder={`Search ${mediaType}s…`}
          value={search}
          onChange={e => onSearch(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="btn btn-sm btn-outline-primary text-nowrap"
          style={{ fontSize: "0.75rem" }}
          onClick={() => uploadRef.current?.click()}
          disabled={uploading}
          title="Upload a new image directly"
        >
          {uploading
            ? <span className="spinner-border spinner-border-sm" />
            : <><i className="bi bi-cloud-upload me-1" />Upload</>}
        </button>
        <input
          ref={uploadRef}
          type="file"
          accept={mediaType === "image" ? "image/*" : "video/*"}
          className="d-none"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
      </div>
      {uploadError && (
        <div className="alert alert-danger py-1 px-2 small mb-2" style={{ fontSize: "0.72rem" }}>
          <i className="bi bi-exclamation-circle me-1" />{uploadError}
        </div>
      )}
      <div className="d-flex flex-wrap gap-1">
        {filtered.length === 0 ? (
          <div className="text-muted small py-1 px-1 w-100 text-center">
            No {mediaType}s in library — upload one above
          </div>
        ) : filtered.slice(0, 60).map(f => (
          <button
            key={f.url}
            type="button"
            className="btn p-0 border rounded"
            style={{ width: 64, height: 64, overflow: "hidden", flexShrink: 0 }}
            onClick={() => onPick(f.url)}
            title={f.name}
          >
            {f.type.startsWith("image") ? (
              <img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 bg-dark text-white">
                <i className="bi bi-camera-video" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

const ANALYSIS_ICONS: Record<string, string> = {
  IMAGES:            "bi-images",
  IMAGE_ERRORS:      "bi-exclamation-triangle",
  JS:                "bi-filetype-js",
  CSS:               "bi-filetype-css",
  FORM:              "bi-ui-checks",
  VIDEO:             "bi-camera-video",
  VIDEO_FILES:       "bi-camera-video",
  PHONE:             "bi-telephone",
  EMAIL:             "bi-envelope",
  BACKGROUND:        "bi-card-image",
  LOCAL_IMG:         "bi-images",
  CDN:               "bi-link-45deg",
  MEDIA_SLOTS:       "bi-check-circle",
  LOGO:              "bi-person-badge",
  LOGO_SLOT:         "bi-person-badge",
  COVERAGE_MAP_SLOT: "bi-map",
  MEDIA_SLOT:        "bi-image",
  ADDRESS:           "bi-geo-alt",
};

interface ImportTemplateModalProps {
  onClose: () => void;
  onImported: (t: CmsTemplate) => void;
}

function ImportTemplateModal({ onClose, onImported }: ImportTemplateModalProps) {
  const [file, setFile]               = useState<File | null>(null);
  const [name, setName]               = useState("");
  const [desc, setDesc]               = useState("");
  const [html, setHtml]               = useState("");
  const [css, setCss]                 = useState("");
  const [mediaSlots, setMediaSlots]   = useState<Record<string, string>>({});
  const [analysis, setAnalysis]       = useState<ImportAnalysis | null>(null);
  const [formPages, setFormPages]     = useState<FormPage[]>([]);
  const [mediaFiles, setMediaFiles]   = useState<MediaFile[]>([]);
  const [coverageMaps, setCoverageMaps] = useState<CoverageMap[]>([]);
  const [mapSelections, setMapSelections] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor]     = useState<{ src: string; mediaType: "image" | "video" } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedFormSlug, setSelectedFormSlug] = useState("");
  const [fixed, setFixed]             = useState<Set<string>>(new Set());
  const [extracting, setExtracting]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seenSlotNamesRef = useRef(new Map<string, number>());
  const srcToSlotRef     = useRef(new Map<string, string>());

  const autoName = (filename: string) =>
    filename
      .replace(/\.(html?|zip)$/i, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());

  const loadSidebar = useCallback(() => {
    Promise.all([
      fetch("/api/media/files").then(r => r.json()),
      fetch("/api/pages?enabled=true").then(r => r.json()),
      fetch("/api/coverage-maps").then(r => r.json()),
    ]).then(([mj, pj, cmj]) => {
      setMediaFiles(mj.files ?? []);
      const pages = pj.pages ?? pj.data ?? [];
      setFormPages(pages.filter((p: { type: string }) => p.type === "form").map((p: { slug: string; title: string }) => ({ slug: p.slug, title: p.title })));
      const maps = Array.isArray(cmj) ? cmj : [];
      setCoverageMaps(maps.filter((m: { isActive?: boolean }) => m.isActive !== false).map((m: { id: string; slug: string; name: string }) => ({ id: m.id, slug: m.slug, name: m.name })));
    }).catch(() => {});
  }, []);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setAnalysis(null);
    setMediaSlots({});
    setFixed(new Set());
    setPickerFor(null);
    seenSlotNamesRef.current = new Map();
    srcToSlotRef.current     = new Map();
    setName(prev => prev || autoName(f.name));

    const fname = f.name.toLowerCase();
    if (!fname.endsWith(".html") && !fname.endsWith(".htm") && !fname.endsWith(".zip")) {
      setError("Only .html and .zip files are supported");
      setFile(null);
      return;
    }

    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/templates/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Extraction failed");
      setHtml(json.data.html);
      setCss(json.data.css ?? "");
      setMediaSlots(json.data.mediaSlots ?? {});
      setAnalysis(json.data.analysis ?? null);
      loadSidebar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
      setFile(null);
      setHtml("");
      setCss("");
    } finally {
      setExtracting(false);
    }
  }, [loadSidebar]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const applyFix = (key: string, newHtml: string) => {
    setHtml(newHtml);
    setFixed(prev => new Set([...prev, key]));
  };

  const fixPhone = () =>
    applyFix("PHONE", html.replace(/href=["']tel:[^"']+["']/gi, 'href="tel:{{cms.phone}}"'));

  const fixEmail = () =>
    applyFix("EMAIL", html.replace(/href=["']mailto:[^"'?]+[^"']*/gi, 'href="mailto:{{cms.email}}"'));

  const fixForm = () => {
    if (!selectedFormSlug) return;
    applyFix("FORM", html.replace(/<form\b[\s\S]*?<\/form>/gi, `{{cms.form.${selectedFormSlug}}}`));
  };

  const fixCoverageMap = (slot: string) => {
    const mapSlug = mapSelections[slot];
    if (!mapSlug) return;
    const esc = `{{cms.media.${slot}}}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    applyFix(`MAP:${slot}`, html.replace(new RegExp(esc, "gi"), `{{cms.coverageMap.${mapSlug}}}`));
  };

  const fixSrc = (localSrc: string, newUrl: string) => {
    let slotName = srcToSlotRef.current.get(localSrc);
    if (!slotName) {
      const base = localSrcToSlotName(localSrc);
      const count = seenSlotNamesRef.current.get(base) ?? 0;
      seenSlotNamesRef.current.set(base, count + 1);
      slotName = count === 0 ? base : `${base}-${count}`;
      srcToSlotRef.current.set(localSrc, slotName);
    }
    const esc = localSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    applyFix(`SRC:${localSrc}`, html.replace(new RegExp(esc, "g"), `{{cms.media.${slotName}}}`));
    setMediaSlots(prev => ({ ...prev, [slotName!]: newUrl }));
    setPickerFor(null);
    setPickerSearch("");
  };

  const addToMediaFiles = (url: string, name: string) =>
    setMediaFiles(prev => [{ name, url, type: "image/webp" }, ...prev]);

  const isSrcFixed = (src: string) => fixed.has(`SRC:${src}`);

  const renderSrcRows = (occurrences: string[], mediaType: "image" | "video") =>
    occurrences.map(src => {
      const thisFixed = isSrcFixed(src);
      const isPicking = pickerFor?.src === src && pickerFor.mediaType === mediaType;
      const assignedSlot = srcToSlotRef.current.get(src);
      const assignedUrl  = assignedSlot ? mediaSlots[assignedSlot] : undefined;
      const label = labelForPath(src);
      return (
        <div key={src}>
          <div className={`border rounded px-2 py-1 mb-1 d-flex align-items-center gap-2 ${thisFixed ? "border-success bg-success bg-opacity-10" : "bg-white"}`}>
            {assignedUrl
              ? <img src={assignedUrl} alt={label} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <i className={`bi ${mediaType === "video" ? "bi-camera-video" : "bi-image"} text-muted`} style={{ fontSize: "0.8rem", flexShrink: 0 }} />}
            <div className="flex-grow-1 overflow-hidden">
              <div className="fw-semibold" style={{ fontSize: "0.78rem" }}>{label}</div>
              <code className="text-muted d-block text-truncate" style={{ fontSize: "0.63rem" }} title={src}>{src}</code>
            </div>
            {thisFixed
              ? <span className="badge bg-success" style={{ fontSize: "0.65rem" }}>✓ Slotted</span>
              : <button
                  type="button"
                  className={`btn btn-sm ${isPicking ? "btn-primary" : "btn-outline-primary"} text-nowrap`}
                  style={{ fontSize: "0.7rem", padding: "2px 10px", flexShrink: 0 }}
                  onClick={() => { setPickerFor(isPicking ? null : { src, mediaType }); setPickerSearch(""); }}
                >
                  <i className={`bi ${isPicking ? "bi-x" : "bi-folder2-open"} me-1`} />
                  {isPicking ? "Close" : "Pick / Upload"}
                </button>
            }
          </div>
          {isPicking && (
            <InlineMediaPicker
              files={mediaFiles}
              search={pickerSearch}
              onSearch={setPickerSearch}
              onPick={url => fixSrc(src, url)}
              onUploaded={addToMediaFiles}
              mediaType={mediaType}
            />
          )}
        </div>
      );
    });

  const renderItem = (item: AnalysisItem, i: number) => {
    if (item.type === "COVERAGE_MAP_SLOT") {
      const slot = item.occurrences?.[0] ?? "";
      const isMapFixed = fixed.has(`MAP:${slot}`);
      return (
        <div key={i} className={`card mb-2 border-${isMapFixed ? "success" : "warning"}`} style={{ background: isMapFixed ? "#f0fdf4" : "#fffbeb" }}>
          <div className="card-body py-2 px-3">
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className={`bi bi-map text-${isMapFixed ? "success" : "warning"} flex-shrink-0`} />
              <span className="fw-semibold small flex-grow-1">{item.detail}</span>
              {isMapFixed && <span className="badge bg-success">✓ Fixed</span>}
            </div>
            {!isMapFixed && (
              <div className="d-flex gap-2 mt-2">
                {coverageMaps.length === 0 ? (
                  <span className="text-muted small">No coverage maps — create one first</span>
                ) : (
                  <>
                    <select
                      className="form-select form-select-sm flex-grow-1"
                      value={mapSelections[slot] ?? ""}
                      onChange={e => setMapSelections(prev => ({ ...prev, [slot]: e.target.value }))}
                    >
                      <option value="">— Select coverage map —</option>
                      {coverageMaps.map(m => <option key={m.id} value={m.slug}>{m.name}</option>)}
                    </select>
                    <button
                      className="btn btn-warning btn-sm px-3"
                      onClick={() => fixCoverageMap(slot)}
                      disabled={!mapSelections[slot]}
                    >
                      <i className="bi bi-link-45deg me-1" />Link
                    </button>
                  </>
                )}
              </div>
            )}
            {isMapFixed && (
              <div className="text-success small mt-1">Replaced with {`{{cms.coverageMap.${mapSelections[slot]}}}`}</div>
            )}
          </div>
        </div>
      );
    }

    const icon = ANALYSIS_ICONS[item.type] ?? "bi-exclamation-circle";
    const isFixed = item.type === "LOCAL_IMG" || item.type === "BACKGROUND" || item.type === "VIDEO"
      ? (item.occurrences ?? []).every(isSrcFixed)
      : fixed.has(item.type);
    const cardBorder = item.type === "CDN" ? "secondary" : isFixed ? "success" : "warning";
    const cardBg = item.type === "CDN" ? "#f8f9fa" : isFixed ? "#f0fdf4" : "#fffbeb";

    return (
      <div key={i} className={`card mb-2 border-${cardBorder}`} style={{ background: cardBg }}>
        <div className="card-body py-2 px-3">
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className={`bi ${icon} text-${item.type === "CDN" ? "muted" : isFixed ? "success" : "warning"} flex-shrink-0`} />
            <span className="fw-semibold small flex-grow-1">{item.detail}</span>
            {isFixed && <span className="badge bg-success">✓ Fixed</span>}
          </div>

          {item.type === "FORM" && !isFixed && (
            <div className="d-flex gap-2 mt-2">
              <select className="form-select form-select-sm flex-grow-1" value={selectedFormSlug} onChange={e => setSelectedFormSlug(e.target.value)}>
                <option value="">— Select a CMS form —</option>
                {formPages.map(f => <option key={f.slug} value={f.slug}>{f.title} ({f.slug})</option>)}
              </select>
              <button className="btn btn-warning btn-sm px-3" onClick={fixForm} disabled={!selectedFormSlug}>
                <i className="bi bi-link-45deg me-1" />Link
              </button>
            </div>
          )}
          {item.type === "FORM" && isFixed && (
            <div className="text-success small mt-1">Replaced with {`{{cms.form.${selectedFormSlug}}}`}</div>
          )}

          {item.type === "PHONE" && !isFixed && (
            <button className="btn btn-warning btn-sm mt-2" onClick={fixPhone}>
              <i className="bi bi-arrow-repeat me-1" />Replace all with {"{{cms.phone}}"}
            </button>
          )}

          {item.type === "EMAIL" && !isFixed && (
            <button className="btn btn-warning btn-sm mt-2" onClick={fixEmail}>
              <i className="bi bi-arrow-repeat me-1" />Replace all with {"{{cms.email}}"}
            </button>
          )}

          {(item.type === "LOCAL_IMG" || item.type === "BACKGROUND") && (item.occurrences ?? []).length > 0 && (
            <div className="mt-2">{renderSrcRows(item.occurrences!, "image")}</div>
          )}
          {item.type === "VIDEO" && (item.occurrences ?? []).length > 0 && (
            <div className="mt-2">{renderSrcRows(item.occurrences!, "video")}</div>
          )}

          {item.type === "CDN" && item.suggestion && (
            <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>{item.suggestion}</div>
          )}
        </div>
      </div>
    );
  };

  const save = async () => {
    if (!html || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || null,
          templateType: "standalone",
          data: {
            customHtml: html,
            customCss: css,
            customCssUrls: [],
            mediaSlots,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onImported({ ...json.data, tags: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const previewText = html.slice(0, 600);
  const hasMore = html.length > 600;
  const slotCount = Object.keys(mediaSlots).length;
  const fixCount = fixed.size;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-0">
                <i className="bi bi-upload me-2 text-primary" />Import Template
              </h5>
              {fixCount > 0 && (
                <div className="text-muted small mt-1">
                  <i className="bi bi-pencil-square me-1 text-warning" />{fixCount} fix{fixCount !== 1 ? "es" : ""} applied — will be saved with template
                </div>
              )}
            </div>
            <button className="btn-close" onClick={onClose} disabled={saving} />
          </div>
          <div className="modal-body">

            {/* Drop zone */}
            <div
              className="border rounded p-4 text-center mb-3"
              style={{
                borderStyle: "dashed",
                borderColor: file && html ? "#198754" : "#dee2e6",
                background: file && html ? "#f0fdf4" : "#f8f9fa",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              {extracting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Analysing template — uploading images…
                </>
              ) : file && html ? (
                <>
                  <i className="bi bi-check-circle-fill text-success me-2" />
                  <strong>{file.name}</strong>
                  <span className="text-muted small ms-2">({(file.size / 1024).toFixed(1)} KB)</span>
                  <div className="text-muted small mt-1">Click to change file</div>
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-upload fs-2 text-muted d-block mb-2" />
                  <div className="fw-semibold">Drop a file here or click to browse</div>
                  <div className="text-muted small mt-1">
                    Accepts <code>.html</code> or <code>.zip</code> (ZIP: images auto-uploaded, CSS/JS bundled)
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,.zip"
              className="d-none"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
            />

            {/* Integration checklist — now interactive */}
            {analysis && (
              <div className="mb-3">
                {analysis.autoHandled.length > 0 && (
                  <div className="card border-success mb-2">
                    <div className="card-header py-2 bg-success bg-opacity-10 border-success">
                      <span className="fw-semibold text-success small">
                        <i className="bi bi-check-circle-fill me-2" />Auto-handled ({analysis.autoHandled.length})
                      </span>
                    </div>
                    <ul className="list-group list-group-flush">
                      {analysis.autoHandled.map((item, i) => (
                        <li key={i} className="list-group-item py-2 px-3 small">
                          <i className={`bi ${ANALYSIS_ICONS[item.type] ?? "bi-check"} text-success me-2`} />
                          {item.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.needsAttention.length > 0 && (
                  <div className="mb-0">
                    <div className="text-muted small fw-semibold mb-2">
                      <i className="bi bi-exclamation-triangle-fill text-warning me-1" />
                      Fix before saving ({analysis.needsAttention.length} item{analysis.needsAttention.length > 1 ? "s" : ""})
                    </div>
                    {analysis.needsAttention.map((item, i) => renderItem(item, i))}
                  </div>
                )}

                {analysis.autoHandled.length === 0 && analysis.needsAttention.length === 0 && (
                  <div className="alert alert-success py-2 small mb-0">
                    <i className="bi bi-check-circle-fill me-2" />Template looks clean — no wiring issues detected.
                  </div>
                )}
              </div>
            )}

            {html && (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-7">
                    <label className="form-label fw-semibold">Template Name <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. OVB Landing Page"
                      autoFocus
                    />
                  </div>
                  <div className="col-12 col-md-5">
                    <label className="form-label fw-semibold">Description <span className="text-muted fw-normal small">(optional)</span></label>
                    <input
                      className="form-control"
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Short description…"
                    />
                  </div>
                </div>

                {slotCount > 0 && (
                  <div className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <label className="form-label small fw-semibold text-muted mb-0">
                        <i className="bi bi-images me-1" />Media Slots ({slotCount})
                      </label>
                      <span className="badge bg-success-subtle text-success border border-success-subtle">auto-wired</span>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {Object.entries(mediaSlots).map(([slot, url]) => (
                        <div key={slot} className="border rounded px-2 py-1 small d-flex align-items-center gap-2" style={{ background: "#f8f9fa" }}>
                          <img src={url} alt={slot} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 3 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <code className="text-success" style={{ fontSize: "0.7rem" }}>{`{{cms.media.${slot}}}`}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-0">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-semibold text-muted mb-0">HTML Preview</label>
                    <div className="d-flex gap-2">
                      {css && <span className="badge bg-info-subtle text-info border border-info-subtle">{css.length.toLocaleString()} CSS chars</span>}
                      <span className="badge bg-secondary">{html.length.toLocaleString()} HTML chars</span>
                    </div>
                  </div>
                  <pre
                    className="bg-dark text-light rounded p-3 mb-0"
                    style={{ maxHeight: 160, overflow: "auto", fontSize: "0.7rem", lineHeight: 1.4 }}
                  >
                    {previewText}{hasMore ? `\n… (+${(html.length - 600).toLocaleString()} more chars)` : ""}
                  </pre>
                </div>
              </>
            )}

            {error && (
              <div className="alert alert-danger py-2 small mt-2 mb-0">
                <i className="bi bi-exclamation-circle me-1" />{error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <div className="me-auto text-muted small">
              <i className="bi bi-info-circle me-1" />
              Saved as a <strong>Standalone</strong> template. Use <em>Use as Page</em> to publish it.
            </div>
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !html || !name.trim()}
            >
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                : <><i className="bi bi-bookmark-plus me-2" />Save to Library</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotUploadButton({ onUploaded }: { onUploaded: (url: string, filename: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (f: File) => {
    setUploading(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch("/api/media/upload-simple", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload failed");
      onUploaded(json.url, f.name);
    } catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    setUploading(false);
  };
  return (
    <>
      <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: "0.7rem" }} onClick={() => ref.current?.click()} disabled={uploading}>
        {uploading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-cloud-upload me-1" />Upload new</>}
      </button>
      <input ref={ref} type="file" accept="image/*" className="d-none" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      {err && <div className="text-danger small ms-2">{err}</div>}
    </>
  );
}

interface AnalyzeModalProps {
  template: CmsTemplate;
  onClose: () => void;
  onUpdated: (id: string, newData: Record<string, unknown>) => void;
}

function AnalyzeModal({ template, onClose, onUpdated }: AnalyzeModalProps) {
  const originalHtml  = ((template.data as Record<string, unknown>).customHtml as string) ?? "";
  const originalSlots = ((template.data as Record<string, unknown>).mediaSlots as Record<string, string>) ?? {};

  const [workingHtml, setWorkingHtml]         = useState(originalHtml);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({ ...originalSlots });
  const [analysis, setAnalysis]               = useState<ImportAnalysis | null>(null);
  const [formPages, setFormPages]             = useState<FormPage[]>([]);
  const [mediaAssets, setMediaAssets]         = useState<MediaAsset[]>([]);
  const [coverageMaps, setCoverageMaps]       = useState<CoverageMap[]>([]);
  const [mediaFiles, setMediaFiles]           = useState<MediaFile[]>([]);
  const [pickerFor, setPickerFor]             = useState<{ src: string; mediaType: "image" | "video" } | null>(null);
  const [pickerSearch, setPickerSearch]       = useState("");
  const [pickerSlot, setPickerSlot]           = useState<string | null>(null);
  const [slotPickerSearch, setSlotPickerSearch] = useState("");
  const [mapSelections, setMapSelections]     = useState<Record<string, string>>({});
  const [selectedFormSlug, setSelectedFormSlug] = useState("");
  const [fixed, setFixed]                     = useState<Set<string>>(new Set());
  const [loading, setLoading]                 = useState(true);
  const [reimporting, setReimporting]         = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const zipRef           = useRef<HTMLInputElement>(null);
  const seenSlotNamesRef = useRef(new Map<string, number>());
  const srcToSlotRef     = useRef(new Map<string, string>());

  const isDirty      = workingHtml !== originalHtml;
  const slotsChanged = JSON.stringify(slotAssignments) !== JSON.stringify(originalSlots);
  const hasChanges   = isDirty || slotsChanged;
  const fixCount     = fixed.size;

  useEffect(() => {
    Promise.all([
      fetch(`/api/templates/${template.id}/analyze`).then(r => r.json()),
      fetch("/api/media/files").then(r => r.json()),
    ]).then(([aj, mj]) => {
      if (aj.success) {
        setAnalysis(aj.data.analysis);
        setFormPages(aj.data.formPages ?? []);
        setMediaAssets(aj.data.mediaAssets ?? []);
        setCoverageMaps(aj.data.coverageMaps ?? []);
      } else {
        setError(aj.error ?? "Failed to analyse");
      }
      setMediaFiles(mj.files ?? []);
    }).catch(() => setError("Network error")).finally(() => setLoading(false));
  }, [template.id]);

  const applyFix = (key: string, newHtml: string) => {
    setWorkingHtml(newHtml);
    setFixed(prev => new Set([...prev, key]));
  };

  const fixPhone = () =>
    applyFix("PHONE", workingHtml.replace(/href=["']tel:[^"']+["']/gi, 'href="tel:{{cms.phone}}"'));

  const fixEmail = () =>
    applyFix("EMAIL", workingHtml.replace(/href=["']mailto:[^"'?]+[^"']*/gi, 'href="mailto:{{cms.email}}"'));

  const fixForm = () => {
    if (!selectedFormSlug) return;
    applyFix("FORM", workingHtml.replace(/<form\b[\s\S]*?<\/form>/gi, `{{cms.form.${selectedFormSlug}}}`));
  };

  const fixLogo = () =>
    applyFix("LOGO", workingHtml.replace(/<img\b([^>]*(?:src=["'][^"']*logo[^"']*["']|alt=["'][^"']*logo[^"']*["']|class=["'][^"']*logo[^"']*["'])[^>]*)>/gi, "{{cms.logo}}"));

  const fixCoverageMap = (slot: string) => {
    const mapSlug = mapSelections[slot];
    if (!mapSlug) return;
    const esc = `{{cms.media.${slot}}}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    applyFix(`MAP:${slot}`, workingHtml.replace(new RegExp(esc, "gi"), `{{cms.coverageMap.${mapSlug}}}`));
  };

  const fixSrc = (localSrc: string, newUrl: string) => {
    let slotName = srcToSlotRef.current.get(localSrc);
    if (!slotName) {
      const base = localSrcToSlotName(localSrc);
      const count = seenSlotNamesRef.current.get(base) ?? 0;
      seenSlotNamesRef.current.set(base, count + 1);
      slotName = count === 0 ? base : `${base}-${count}`;
      srcToSlotRef.current.set(localSrc, slotName);
    }
    const esc = localSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    applyFix(`SRC:${localSrc}`, workingHtml.replace(new RegExp(esc, "g"), `{{cms.media.${slotName}}}`));
    setSlotAssignments(prev => ({ ...prev, [slotName!]: newUrl }));
    setPickerFor(null);
    setPickerSearch("");
  };

  const addToMediaFiles = (url: string, name: string) =>
    setMediaFiles(prev => [{ name, url, type: "image/webp" }, ...prev]);

  const assignSlotImage = (slot: string, url: string) => {
    setSlotAssignments(prev => ({ ...prev, [slot]: url }));
    setPickerSlot(null);
    setSlotPickerSearch("");
  };

  const saveChanges = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (isDirty) body.customHtml = workingHtml;
      if (slotsChanged) body.mediaSlots = slotAssignments;
      const res = await fetch(`/api/templates/${template.id}/analyze`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Save failed");
      onUpdated(template.id, { customHtml: workingHtml, mediaSlots: slotAssignments });
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    setSaving(false);
  };

  const handleZipReimport = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".zip")) { setError("Only .zip files supported"); return; }
    setReimporting(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(`/api/templates/${template.id}/analyze`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Re-import failed");
      setAnalysis(json.data.analysis);
      setWorkingHtml(json.data.html);
      setSlotAssignments(json.data.mediaSlots ?? {});
      setFixed(new Set());
      onUpdated(template.id, json.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Re-import failed"); }
    setReimporting(false);
  };

  const isSrcFixed = (src: string) => fixed.has(`SRC:${src}`);

  const SLOT_TYPES = new Set(["MEDIA_SLOT", "COVERAGE_MAP_SLOT", "LOGO_SLOT", "LOGO"]);

  const slotItems     = analysis?.needsAttention.filter(i => SLOT_TYPES.has(i.type)) ?? [];
  const attentionItems = analysis?.needsAttention.filter(i => !SLOT_TYPES.has(i.type)) ?? [];

  const filteredAssets = (search: string) =>
    mediaAssets.filter(a =>
      a.mimeType.startsWith("image/") &&
      (!search || a.filename.toLowerCase().includes(search.toLowerCase()) ||
                  (a.altText ?? "").toLowerCase().includes(search.toLowerCase()))
    );

  const renderSlotItems = () => {
    if (slotItems.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="fw-semibold small mb-2" style={{ color: "#0d6efd" }}>
          <i className="bi bi-sliders me-2" />Configure Slots ({slotItems.length})
        </div>
        {slotItems.map((item, i) => {
          const slot = item.occurrences?.[0] ?? "";
          const isMapFixed = fixed.has(`MAP:${slot}`);
          const isLogoFixed = fixed.has("LOGO");

          if (item.type === "MEDIA_SLOT") {
            const assignedUrl = slotAssignments[slot];
            const isOpen = pickerSlot === slot;
            const filtered = filteredAssets(isOpen ? slotPickerSearch : "");
            return (
              <div key={i} className="card mb-2 border-primary border-opacity-25" style={{ background: "#f0f6ff" }}>
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-image text-primary flex-shrink-0" />
                    <span className="fw-semibold small flex-grow-1">{item.detail}</span>
                    <code className="text-muted" style={{ fontSize: "0.65rem" }}>{`{{cms.media.${slot}}}`}</code>
                    {assignedUrl && !isOpen && (
                      <img src={assignedUrl} alt={slot} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, border: "1px solid #dee2e6" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <button
                      type="button"
                      className={`btn btn-sm ${isOpen ? "btn-primary" : "btn-outline-primary"} text-nowrap`}
                      style={{ fontSize: "0.7rem" }}
                      onClick={() => { setPickerSlot(isOpen ? null : slot); setSlotPickerSearch(""); setPickerFor(null); }}
                    >
                      <i className={`bi ${isOpen ? "bi-x" : "bi-folder2-open"} me-1`} />
                      {assignedUrl ? "Change" : "Pick Image"}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="mt-2">
                      <input
                        className="form-control form-control-sm mb-2"
                        placeholder="Search images…"
                        value={slotPickerSearch}
                        onChange={e => setSlotPickerSearch(e.target.value)}
                        autoFocus
                      />
                      {filtered.length === 0 ? (
                        <div className="text-muted small text-center py-2">
                          No images — upload one below
                        </div>
                      ) : (
                        <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 200, overflowY: "auto" }}>
                          {filtered.slice(0, 60).map(a => (
                            <button
                              key={a.id}
                              type="button"
                              className="btn p-0 border rounded"
                              style={{ width: 80, height: 80, overflow: "hidden", flexShrink: 0 }}
                              onClick={() => assignSlotImage(slot, a.url)}
                              title={a.filename}
                            >
                              <img
                                src={a.thumbnailUrl ?? a.url}
                                alt={a.altText ?? a.filename}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 d-flex justify-content-between align-items-center">
                        <span className="text-muted" style={{ fontSize: "0.7rem" }}>{filtered.length} image{filtered.length !== 1 ? "s" : ""} in library</span>
                        <SlotUploadButton onUploaded={(url, filename) => {
                          setMediaAssets(prev => [{ id: url, url, thumbnailUrl: url, filename, altText: null, mimeType: "image/webp", width: null, height: null }, ...prev]);
                          assignSlotImage(slot, url);
                        }} />
                      </div>
                    </div>
                  )}
                  {assignedUrl && (
                    <div className="text-success small mt-1" style={{ fontSize: "0.72rem" }}>
                      <i className="bi bi-check-circle-fill me-1" />Assigned — saves with template
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.type === "COVERAGE_MAP_SLOT") {
            return (
              <div key={i} className="card mb-2 border-primary border-opacity-25" style={{ background: "#f0f6ff" }}>
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-map text-primary flex-shrink-0" />
                    <span className="fw-semibold small flex-grow-1">{item.detail}</span>
                    <code className="text-muted" style={{ fontSize: "0.65rem" }}>{`{{cms.media.${slot}}}`}</code>
                    {isMapFixed && <span className="badge bg-success">✓ Linked</span>}
                  </div>
                  {!isMapFixed && (
                    <div className="d-flex gap-2">
                      {coverageMaps.length === 0 ? (
                        <span className="text-muted small">No coverage maps — create one first</span>
                      ) : (
                        <>
                          <select
                            className="form-select form-select-sm flex-grow-1"
                            value={mapSelections[slot] ?? ""}
                            onChange={e => setMapSelections(prev => ({ ...prev, [slot]: e.target.value }))}
                          >
                            <option value="">— Select coverage map —</option>
                            {coverageMaps.map(m => <option key={m.id} value={m.slug}>{m.name}</option>)}
                          </select>
                          <button
                            className="btn btn-primary btn-sm px-3"
                            onClick={() => fixCoverageMap(slot)}
                            disabled={!mapSelections[slot]}
                          >
                            <i className="bi bi-link-45deg me-1" />Apply
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {isMapFixed && (
                    <div className="text-success small" style={{ fontSize: "0.72rem" }}>
                      Replaced with <code>{`{{cms.coverageMap.${mapSelections[slot]}}}`}</code> — save to persist
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (item.type === "LOGO_SLOT") {
            return (
              <div key={i} className="card mb-2 border-primary border-opacity-25" style={{ background: "#f0f6ff" }}>
                <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
                  <i className="bi bi-person-badge text-primary flex-shrink-0" />
                  <span className="small flex-grow-1">{item.detail}</span>
                  <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">Site Config → Branding</span>
                </div>
              </div>
            );
          }

          if (item.type === "LOGO") {
            return (
              <div key={i} className="card mb-2 border-primary border-opacity-25" style={{ background: "#f0f6ff" }}>
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-person-badge text-primary flex-shrink-0" />
                    <span className="fw-semibold small flex-grow-1">{item.detail}</span>
                    {isLogoFixed
                      ? <span className="badge bg-success">✓ Replaced</span>
                      : <button className="btn btn-outline-primary btn-sm" onClick={fixLogo} style={{ fontSize: "0.7rem" }}>
                          <i className="bi bi-arrow-repeat me-1" />Replace with {"{{cms.logo}}"}
                        </button>
                    }
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  const renderSrcRows = (occurrences: string[], mediaType: "image" | "video") =>
    occurrences.map(src => {
      const thisFixed = isSrcFixed(src);
      const isPicking = pickerFor?.src === src && pickerFor.mediaType === mediaType;
      const assignedSlot = srcToSlotRef.current.get(src);
      const assignedUrl  = assignedSlot ? slotAssignments[assignedSlot] : undefined;
      const label = labelForPath(src);
      return (
        <div key={src}>
          <div className={`border rounded px-2 py-1 mb-1 d-flex align-items-center gap-2 ${thisFixed ? "border-success bg-success bg-opacity-10" : "bg-white"}`}>
            {assignedUrl
              ? <img src={assignedUrl} alt={label} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <i className={`bi ${mediaType === "video" ? "bi-camera-video" : "bi-image"} text-muted`} style={{ fontSize: "0.8rem", flexShrink: 0 }} />}
            <div className="flex-grow-1 overflow-hidden">
              <div className="fw-semibold" style={{ fontSize: "0.78rem" }}>{label}</div>
              <code className="text-muted d-block text-truncate" style={{ fontSize: "0.63rem" }} title={src}>{src}</code>
            </div>
            {thisFixed
              ? <span className="badge bg-success" style={{ fontSize: "0.65rem" }}>✓ Slotted</span>
              : <button
                  type="button"
                  className={`btn btn-sm ${isPicking ? "btn-primary" : "btn-outline-primary"} text-nowrap`}
                  style={{ fontSize: "0.7rem", padding: "2px 10px", flexShrink: 0 }}
                  onClick={() => { setPickerFor(isPicking ? null : { src, mediaType }); setPickerSearch(""); setPickerSlot(null); }}
                >
                  <i className={`bi ${isPicking ? "bi-x" : "bi-folder2-open"} me-1`} />
                  {isPicking ? "Close" : "Pick / Upload"}
                </button>
            }
          </div>
          {isPicking && (
            <InlineMediaPicker
              files={mediaFiles}
              search={pickerSearch}
              onSearch={setPickerSearch}
              onPick={url => fixSrc(src, url)}
              onUploaded={addToMediaFiles}
              mediaType={mediaType}
            />
          )}
        </div>
      );
    });

  const renderItem = (item: AnalysisItem, i: number) => {
    const icon = ANALYSIS_ICONS[item.type] ?? "bi-exclamation-circle";
    const isFixed = item.type === "LOCAL_IMG" || item.type === "BACKGROUND" || item.type === "VIDEO"
      ? (item.occurrences ?? []).every(isSrcFixed)
      : fixed.has(item.type);
    const cardBorder = item.type === "CDN" ? "secondary" : isFixed ? "success" : "warning";
    const cardBg = item.type === "CDN" ? "#f8f9fa" : isFixed ? "#f0fdf4" : "#fffbeb";

    return (
      <div key={i} className={`card mb-2 border-${cardBorder}`} style={{ background: cardBg }}>
        <div className="card-body py-2 px-3">
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className={`bi ${icon} text-${item.type === "CDN" ? "muted" : isFixed ? "success" : "warning"} flex-shrink-0`} />
            <span className="fw-semibold small flex-grow-1">{item.detail}</span>
            {isFixed && <span className="badge bg-success">✓ Fixed</span>}
          </div>

          {item.type === "FORM" && !isFixed && (
            <div className="d-flex gap-2 mt-2">
              <select className="form-select form-select-sm flex-grow-1" value={selectedFormSlug} onChange={e => setSelectedFormSlug(e.target.value)}>
                <option value="">— Select a CMS form —</option>
                {formPages.map(f => <option key={f.slug} value={f.slug}>{f.title} ({f.slug})</option>)}
              </select>
              <button className="btn btn-warning btn-sm px-3" onClick={fixForm} disabled={!selectedFormSlug}>
                <i className="bi bi-link-45deg me-1" />Link
              </button>
            </div>
          )}
          {item.type === "FORM" && isFixed && (
            <div className="text-success small mt-1">Replaced with {`{{cms.form.${selectedFormSlug}}}`}</div>
          )}

          {item.type === "PHONE" && !isFixed && (
            <button className="btn btn-warning btn-sm mt-2" onClick={fixPhone}>
              <i className="bi bi-arrow-repeat me-1" />Replace all with {"{{cms.phone}}"}
            </button>
          )}

          {item.type === "EMAIL" && !isFixed && (
            <button className="btn btn-warning btn-sm mt-2" onClick={fixEmail}>
              <i className="bi bi-arrow-repeat me-1" />Replace all with {"{{cms.email}}"}
            </button>
          )}

          {(item.type === "LOCAL_IMG" || item.type === "BACKGROUND") && (item.occurrences ?? []).length > 0 && (
            <div className="mt-2">{renderSrcRows(item.occurrences!, "image")}</div>
          )}
          {item.type === "VIDEO" && (item.occurrences ?? []).length > 0 && (
            <div className="mt-2">{renderSrcRows(item.occurrences!, "video")}</div>
          )}

          {item.type === "CDN" && item.suggestion && (
            <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>{item.suggestion}</div>
          )}

          {item.type === "ADDRESS" && item.suggestion && (
            <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>
              <i className="bi bi-arrow-right me-1" />{item.suggestion}
            </div>
          )}
        </div>
      </div>
    );
  };

  const savedSlots = ((template.data as Record<string, unknown>).mediaSlots as Record<string, string>) ?? {};
  const savedSlotCount = Object.keys(savedSlots).length;

  const saveLabel = () => {
    const parts = [];
    if (isDirty) parts.push(`${fixCount} fix${fixCount !== 1 ? "es" : ""}`);
    if (slotsChanged) parts.push("slot changes");
    return parts.join(" + ") || "changes";
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-0">
                <i className="bi bi-activity me-2 text-info" />Analyse: {template.name}
              </h5>
              {hasChanges && (
                <div className="text-muted small mt-1">
                  <i className="bi bi-pencil-square me-1 text-warning" />{saveLabel()} — save to persist
                </div>
              )}
            </div>
            <div className="d-flex align-items-center gap-2 ms-auto">
              {hasChanges && (
                <button className="btn btn-success btn-sm" onClick={saveChanges} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="bi bi-floppy me-1" />Save</>}
                </button>
              )}
              <button className="btn-close" onClick={onClose} />
            </div>
          </div>

          <div className="modal-body">
            {loading && <div className="text-center py-4 text-muted"><span className="spinner-border spinner-border-sm me-2" />Analysing template…</div>}

            {!loading && analysis && (
              <>
                {/* Already wired */}
                {(analysis.autoHandled.length > 0 || savedSlotCount > 0) && (
                  <div className="mb-3">
                    {analysis.autoHandled.map((item, i) => (
                      <div key={i} className="card mb-1 border-success" style={{ background: "#f0fdf4" }}>
                        <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
                          <i className={`bi ${ANALYSIS_ICONS[item.type] ?? "bi-check"} text-success`} />
                          <span className="small text-success flex-grow-1">{item.detail}</span>
                          <span className="badge bg-success">✓</span>
                        </div>
                      </div>
                    ))}
                    {savedSlotCount > 0 && (
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {Object.entries(savedSlots).map(([slot, url]) => (
                          <div key={slot} className="border border-success rounded px-2 py-1 d-flex align-items-center gap-1" style={{ background: "#f0fdf4" }}>
                            <img src={url} alt={slot} style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <code className="text-success" style={{ fontSize: "0.65rem" }}>{`{{cms.media.${slot}}}`}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Configure Slots */}
                {renderSlotItems()}

                {/* Needs attention */}
                {attentionItems.length > 0 ? (
                  <div className="mb-3">
                    <div className="text-muted small fw-semibold mb-2">
                      <i className="bi bi-exclamation-triangle-fill text-warning me-1" />
                      {attentionItems.length} issue{attentionItems.length > 1 ? "s" : ""} — fix inline below
                    </div>
                    {attentionItems.map((item, i) => renderItem(item, i))}
                  </div>
                ) : slotItems.length === 0 ? (
                  <div className="alert alert-success py-2 small mb-3">
                    <i className="bi bi-check-circle-fill me-2" />Template fully wired — no CMS integration issues.
                  </div>
                ) : null}

                {/* ZIP re-import */}
                <div className="border rounded p-3" style={{ background: "#f8f9fa" }}>
                  <div className="fw-semibold small mb-1"><i className="bi bi-arrow-clockwise me-2 text-primary" />Re-import from ZIP</div>
                  <p className="text-muted small mb-2">Have the original design files? Drop a ZIP to auto-upload images, replace all local paths, and update this template in place.</p>
                  <div
                    className="border rounded p-2 text-center"
                    style={{ borderStyle: "dashed", cursor: reimporting ? "default" : "pointer", background: "#fff" }}
                    onClick={() => !reimporting && zipRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleZipReimport(f); }}
                  >
                    {reimporting
                      ? <><span className="spinner-border spinner-border-sm me-2" />Uploading images…</>
                      : <span className="small text-muted"><i className="bi bi-cloud-upload me-2" />Drop <code>.zip</code> or click to browse</span>}
                  </div>
                  <input ref={zipRef} type="file" accept=".zip" className="d-none" onChange={e => { const f = e.target.files?.[0]; if (f) handleZipReimport(f); e.target.value = ""; }} />
                </div>
              </>
            )}

            {error && <div className="alert alert-danger py-2 small mt-2 mb-0"><i className="bi bi-exclamation-circle me-1" />{error}</div>}
          </div>

          <div className="modal-footer">
            {hasChanges && (
              <button className="btn btn-success me-auto" onClick={saveChanges} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : <><i className="bi bi-floppy me-1" />Save {saveLabel()}</>}
              </button>
            )}
            <button className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesLibraryPage() {
  const [templates, setTemplates]       = useState<CmsTemplate[]>([]);
  const [loading, setLoading]           = useState(true);
  const [typeFilter, setTypeFilter]     = useState<FilterType>("all");
  const [secFilter, setSecFilter]       = useState<SectionFilter>("all");
  const [search, setSearch]             = useState("");
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState("");
  const [editDesc, setEditDesc]         = useState("");
  const [editSaving, setEditSaving]     = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean; slug?: string } | null>(null);
  const [useAsPageFor, setUseAsPageFor] = useState<CmsTemplate | null>(null);
  const [showImport, setShowImport]     = useState(false);
  const [analyzeFor, setAnalyzeFor]     = useState<CmsTemplate | null>(null);
  const [editHtmlFor, setEditHtmlFor]   = useState<CmsTemplate | null>(null);

  const showToast = (msg: string, ok = true, slug?: string) => {
    setToast({ msg, ok, slug });
    setTimeout(() => setToast(null), 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (typeFilter !== "all") p.set("type", typeFilter);
      if (secFilter !== "all" && typeFilter === "section") p.set("sectionType", secFilter);
      if (search) p.set("search", search);
      const res = await fetch(`/api/templates?${p}`);
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [typeFilter, secFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast("Template deleted");
    } else {
      showToast(json?.error || "Delete failed", false);
    }
    setDeleting(null);
  };

  const startEdit = (t: CmsTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDesc(t.description ?? "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditSaving(true);
    const res = await fetch(`/api/templates/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
    });
    const json = await res.json();
    if (res.ok) {
      setTemplates(prev => prev.map(t => t.id === editingId ? { ...t, name: json.data.name, description: json.data.description } : t));
      showToast("Template updated");
      setEditingId(null);
    } else {
      showToast(json?.error || "Update failed", false);
    }
    setEditSaving(false);
  };

  const counts = {
    all:        templates.length,
    standalone: templates.filter(t => t.templateType === "standalone").length,
    section:    templates.filter(t => t.templateType === "section").length,
    page:       templates.filter(t => t.templateType === "page").length,
  };

  return (
    <AdminLayout>
      <div className="container-fluid py-4">
        {/* Toast */}
        {toast && (
          <div
            className={`position-fixed top-0 end-0 m-3 alert ${toast.ok ? "alert-success" : "alert-danger"} py-2 px-3 d-flex align-items-center gap-2`}
            style={{ zIndex: 9999, fontSize: "0.875rem" }}
          >
            <i className={`bi ${toast.ok ? "bi-check-circle" : "bi-exclamation-circle"}`}></i>
            <span>{toast.msg}</span>
            {toast.slug && (
              <a href={`/${toast.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light ms-2">
                <i className="bi bi-box-arrow-up-right me-1"></i>View
              </a>
            )}
          </div>
        )}

        {/* Import Template modal */}
        {showImport && (
          <ImportTemplateModal
            onClose={() => setShowImport(false)}
            onImported={(t) => {
              setTemplates(prev => [t, ...prev]);
              setShowImport(false);
              showToast(`Template "${t.name}" imported`);
            }}
          />
        )}

        {/* Use as Page modal */}
        {useAsPageFor && (
          <UseAsPageModal
            template={useAsPageFor}
            onClose={() => setUseAsPageFor(null)}
            onCreated={(slug) => {
              setUseAsPageFor(null);
              showToast(`Page created at /${slug}`, true, slug);
            }}
          />
        )}

        {/* Standalone HTML editor — edit template directly */}
        {editHtmlFor && (() => {
          const d = editHtmlFor.data as Record<string, unknown>;
          const fakePage = {
            id:            editHtmlFor.id,
            slug:          editHtmlFor.id,
            title:         editHtmlFor.name,
            type:          "standalone" as const,
            enabled:       true,
            status:        "PUBLISHED" as const,
            createdAt:     editHtmlFor.createdAt,
            updatedAt:     editHtmlFor.updatedAt,
            customHtml:    (d.customHtml as string)      ?? "",
            customCss:     (d.customCss  as string)      ?? "",
            customCssUrls: (d.customCssUrls as string[]) ?? [],
            mediaSlots:    (d.mediaSlots as Record<string, string>) ?? {},
          };
          const handleTemplateSave = async (data: StandaloneEditorSaveData) => {
            const res = await fetch(`/api/templates/${editHtmlFor.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: {
                  ...editHtmlFor.data,
                  customHtml:    data.html,
                  customCss:     data.css,
                  customCssUrls: data.cssUrls,
                  mediaSlots:    data.mediaSlots,
                },
              }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json?.error ?? "Save failed");
            setTemplates(prev => prev.map(t =>
              t.id === editHtmlFor.id
                ? { ...t, data: { ...t.data, customHtml: data.html, customCss: data.css, customCssUrls: data.cssUrls, mediaSlots: data.mediaSlots } }
                : t
            ));
          };
          return (
            <StandalonePageEditorModal
              page={fakePage}
              onSave={() => { setEditHtmlFor(null); showToast("Template saved"); }}
              onCancel={() => setEditHtmlFor(null)}
              saveOverride={handleTemplateSave}
            />
          );
        })()}

        {/* Analyze modal */}
        {analyzeFor && (
          <AnalyzeModal
            template={analyzeFor}
            onClose={() => setAnalyzeFor(null)}
            onUpdated={(id, newData) => {
              setTemplates(prev => prev.map(t =>
                t.id === id ? { ...t, data: { ...t.data, ...newData } } : t
              ));
              showToast("Template updated from ZIP");
            }}
          />
        )}

        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 className="mb-0 fw-bold">
              <i className="bi bi-bookmark-star me-2 text-warning"></i>Template Library
            </h4>
            <p className="text-muted small mb-0 mt-1">
              Reusable templates for standalone pages, sections, and page layouts.
              Save any page or section as a template to reuse across your site.
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
            onClick={() => setShowImport(true)}
          >
            <i className="bi bi-upload" />Import Template
          </button>
        </div>

        {/* Stats row */}
        <div className="row g-3 mb-4">
          {(["all", "standalone", "section", "page"] as FilterType[]).map(type => {
            const info = type === "all" ? { label: "All Templates", color: "secondary", icon: "bi-bookmark-star" } : TYPE_INFO[type];
            const count = counts[type];
            return (
              <div className="col-6 col-md-3" key={type}>
                <div
                  className={`card border-0 shadow-sm h-100 ${typeFilter === type ? `border-${info.color} border-2` : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setTypeFilter(type)}
                >
                  <div className="card-body py-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className={`bi ${info.icon} text-${info.color} fs-5`}></i>
                      <div>
                        <div className="fw-semibold" style={{ fontSize: "1.25rem" }}>{count}</div>
                        <div className="text-muted small">{info.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
          <div className="input-group input-group-sm" style={{ maxWidth: 280 }}>
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>

          {/* Type tabs */}
          <div className="btn-group btn-group-sm">
            {(["all", "standalone", "section", "page"] as FilterType[]).map(type => (
              <button
                key={type}
                className={`btn ${typeFilter === type ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => setTypeFilter(type)}
              >
                {type === "all" ? "All" : TYPE_INFO[type].label}
              </button>
            ))}
          </div>

          {/* Section sub-filter */}
          {typeFilter === "section" && (
            <div className="btn-group btn-group-sm">
              {(["all", "HERO", "NORMAL", "CTA", "FOOTER", "FLEXIBLE"] as SectionFilter[]).map(s => (
                <button
                  key={s}
                  className={`btn ${secFilter === s ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setSecFilter(s)}
                >
                  {s === "all" ? "All types" : s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Template grid */}
        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border me-2" role="status" />Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-bookmark-star fs-1 d-block mb-3 text-muted opacity-50"></i>
            <h5 className="text-muted">No templates yet</h5>
            <p className="text-muted small">
              Go to any standalone page editor or section editor and click{" "}
              <strong>"Save as Template"</strong> to build your library.
            </p>
          </div>
        ) : (
          <div className="row g-3">
            {templates.map(t => {
              const info = TYPE_INFO[t.templateType] ?? TYPE_INFO.standalone;
              const sIcon = t.sectionType ? SECTION_ICONS[t.sectionType] ?? "bi-layout-split" : info.icon;
              const isStandalone = t.templateType === "standalone";
              return (
                <div className="col-12 col-md-6 col-lg-4" key={t.id}>
                  <div className="card h-100 shadow-sm border-0">
                    {/* Thumbnail or icon placeholder */}
                    {t.thumbnail ? (
                      <img src={t.thumbnail} alt={t.name} className="card-img-top" style={{ height: 140, objectFit: "cover" }} />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{ height: 90, background: "#f3f4f6", borderRadius: "0.375rem 0.375rem 0 0" }}
                      >
                        <i className={`bi ${sIcon} text-muted`} style={{ fontSize: 36 }}></i>
                      </div>
                    )}

                    <div className="card-body">
                      {editingId === t.id ? (
                        <div>
                          <input
                            className="form-control form-control-sm mb-2"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            autoFocus
                          />
                          <textarea
                            className="form-control form-control-sm mb-2"
                            rows={2}
                            placeholder="Description (optional)"
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                          />
                          <div className="d-flex gap-2">
                            <button className="btn btn-warning btn-sm flex-grow-1" onClick={saveEdit} disabled={editSaving || !editName.trim()}>
                              {editSaving ? <span className="spinner-border spinner-border-sm" /> : "Save"}
                            </button>
                            <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="d-flex align-items-start gap-2 mb-1">
                            <h6 className="card-title mb-0 flex-grow-1" style={{ fontSize: "0.875rem" }}>{t.name}</h6>
                          </div>
                          {t.description && (
                            <p className="card-text text-muted mb-2" style={{ fontSize: "0.75rem", lineHeight: 1.4 }}>
                              {t.description}
                            </p>
                          )}
                          <div className="d-flex flex-wrap gap-1 mb-3">
                            <span className={`badge bg-${info.color} ${info.color === "warning" ? "text-dark" : "text-white"}`} style={{ fontSize: "0.65rem" }}>
                              {info.label}
                            </span>
                            {t.sectionType && (
                              <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: "0.65rem" }}>{t.sectionType}</span>
                            )}
                            {t.isBuiltIn && <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Built-in</span>}
                            {t.usageCount > 0 && (
                              <span className="badge bg-light text-muted border" style={{ fontSize: "0.65rem" }}>
                                {t.usageCount}× used
                              </span>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>

                    {editingId !== t.id && (
                      <div className="card-footer bg-transparent border-0 pt-0 d-flex gap-2 flex-wrap">
                        {(isStandalone || t.templateType === "section" || t.templateType === "page") && (
                          <button
                            className="btn btn-sm btn-warning flex-grow-1"
                            onClick={() => setUseAsPageFor(t)}
                            title={
                              isStandalone
                                ? "Create a standalone page from this template"
                                : "Create a page with this section/layout"
                            }
                          >
                            <i className="bi bi-rocket-takeoff me-1"></i>Use as Page
                          </button>
                        )}
                        {isStandalone && (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setEditHtmlFor(t)}
                            title="Edit HTML, CSS, media slots"
                          >
                            <i className="bi bi-code-slash"></i>
                          </button>
                        )}
                        {isStandalone && (
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => setAnalyzeFor(t)}
                            title="Analyse CMS integration — check forms, images, contact links"
                          >
                            <i className="bi bi-activity"></i>
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(t)} disabled={t.isBuiltIn} title="Rename">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id || t.isBuiltIn}
                          title={t.isBuiltIn ? "Cannot delete built-in template" : "Delete"}
                        >
                          {deleting === t.id
                            ? <span className="spinner-border spinner-border-sm" />
                            : <i className="bi bi-trash"></i>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
