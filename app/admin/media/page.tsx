"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";

// ============================================
// Types
// ============================================

interface MediaFile {
  name: string;
  url: string;
  size: number;
  type: string;
  modifiedAt: string;
  usageCount?: number;
}

type FilterType = "all" | "images" | "videos" | "documents";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(name: string): "image" | "video" | "document" | "other" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (ext === "pdf") return "document";
  return "other";
}

// ============================================
// Page shell — wraps in AdminLayout (which provides ToastProvider)
// ============================================

export default function MediaLibrary() {
  return (
    <AdminLayout title="Media Library" subtitle="Upload and manage images, videos, and PDFs">
      <MediaLibraryContent />
    </AdminLayout>
  );
}

// ============================================
// Inner content — renders inside ToastProvider
// ============================================

function MediaLibraryContent() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<MediaFile | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, usageRes] = await Promise.all([
        fetch("/api/media/files"),
        fetch("/api/media/usage"),
      ]);
      if (!filesRes.ok) throw new Error("Failed to load files");
      const filesData = await filesRes.json();
      const usageData = usageRes.ok ? await usageRes.json() : { usages: {} };
      const usages: Record<string, number> = usageData.usages ?? {};
      const filesWithUsage = (filesData.files ?? []).map((f: MediaFile) => ({
        ...f,
        usageCount: usages[f.name] ?? 0,
      }));
      setFiles(filesWithUsage);
    } catch {
      toast.error("Failed to load media files");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // ============================================
  // Upload
  // ============================================

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/media/upload-simple", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json();
          failCount++;
          toast.error(`Failed to upload "${file.name}": ${data.error ?? "Unknown error"}`);
        }
      } catch {
        failCount++;
        toast.error(`Failed to upload "${file.name}"`);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? "File uploaded successfully"
          : `${successCount} files uploaded successfully`
      );
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";

    await loadFiles();
  };

  // ============================================
  // Delete
  // ============================================

  const handleDelete = async (file: MediaFile) => {
    if ((file.usageCount ?? 0) > 0) {
      toast.warning(`"${file.name}" is used in ${file.usageCount} section(s) and cannot be deleted.`);
      setConfirmDelete(null);
      return;
    }
    try {
      const res = await fetch(`/api/media/files?name=${encodeURIComponent(file.name)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }

      toast.success(`"${file.name}" deleted`);
      setConfirmDelete(null);
      if (previewFile?.name === file.name) setPreviewFile(null);
      await loadFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  // ============================================
  // Copy URL
  // ============================================

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  // ============================================
  // Drag & Drop
  // ============================================

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  // ============================================
  // Filtered list
  // ============================================

  const filteredFiles = files.filter((f) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "images" && getFileType(f.name) === "image") ||
      (filter === "videos" && getFileType(f.name) === "video") ||
      (filter === "documents" && getFileType(f.name) === "document");
    const matchesSearch =
      !search || f.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: files.length,
    images: files.filter((f) => getFileType(f.name) === "image").length,
    videos: files.filter((f) => getFileType(f.name) === "video").length,
    documents: files.filter((f) => getFileType(f.name) === "document").length,
  };

  return (
    <>
      {/* Upload button row */}
      <div className="d-flex justify-content-end mb-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          style={{ display: "none" }}
          onChange={(e) => handleUpload(e.target.files)}
        />
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              Uploading...
            </>
          ) : (
            <>
              <i className="bi bi-cloud-arrow-up"></i>
              Upload Media
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Total Files</div>
              <div className="h4 mb-0 fw-semibold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Images</div>
              <div className="h4 mb-0 fw-semibold text-primary">{stats.images}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Videos</div>
              <div className="h4 mb-0 fw-semibold text-info">{stats.videos}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Documents</div>
              <div className="h4 mb-0 fw-semibold text-danger">{stats.documents}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`border rounded-3 mb-4 text-center py-4 ${
          dragOver ? "border-primary bg-primary bg-opacity-10" : "border-dashed"
        }`}
        style={{
          borderStyle: "dashed",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <i
          className={`bi bi-cloud-arrow-up-fill fs-2 ${dragOver ? "text-primary" : "text-muted"}`}
        />
        <p className="mb-0 mt-2 text-muted small">
          {dragOver ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </p>
        <p className="mb-0 text-muted" style={{ fontSize: "0.75rem" }}>
          Images, videos, and PDFs supported
        </p>
      </div>

      {/* Filters + Search */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <ul className="nav nav-pills flex-shrink-0 mb-0">
          {(["all", "images", "videos", "documents"] as FilterType[]).map((f) => (
            <li className="nav-item" key={f}>
              <button
                className={`nav-link ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all"
                  ? `All (${stats.total})`
                  : f === "images"
                  ? `Images (${stats.images})`
                  : f === "videos"
                  ? `Videos (${stats.videos})`
                  : `Documents (${stats.documents})`}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex-grow-1" style={{ minWidth: "200px" }}>
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3 text-muted">Loading media files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-images text-muted" style={{ fontSize: "4rem", opacity: 0.3 }} />
            <h5 className="mt-3 text-body-secondary">
              {search || filter !== "all" ? "No files match your filters" : "No files uploaded yet"}
            </h5>
            {!search && filter === "all" && (
              <p className="text-body-secondary mb-4">
                Upload images and videos using the button above or drag and drop here.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredFiles.map((file) => (
            <div key={file.name} className="col-6 col-sm-4 col-md-3 col-lg-2">
              <MediaCard
                file={file}
                isCopied={copiedUrl === file.url}
                onCopy={() => handleCopyUrl(window.location.origin + file.url)}
                onDelete={() => setConfirmDelete(file)}
                onPreview={() => setPreviewFile(file)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete File"
          message={
            (confirmDelete.usageCount ?? 0) > 0
              ? `"${confirmDelete.name}" is currently used in ${confirmDelete.usageCount} section(s). Remove it from all sections before deleting.`
              : `Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`
          }
          confirmText={(confirmDelete.usageCount ?? 0) > 0 ? "Cannot Delete" : "Delete"}
          variant="danger"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onCopy={() => handleCopyUrl(window.location.origin + previewFile.url)}
          onDelete={() => {
            setPreviewFile(null);
            setConfirmDelete(previewFile);
          }}
          isCopied={copiedUrl === previewFile.url}
        />
      )}
    </>
  );
}

// ============================================
// Media Card
// ============================================

interface MediaCardProps {
  file: MediaFile;
  isCopied: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

function MediaCard({ file, isCopied, onCopy, onDelete, onPreview }: MediaCardProps) {
  const type = getFileType(file.name);
  const inUse = (file.usageCount ?? 0) > 0;

  return (
    <div
      className="card border-0 shadow-sm h-100"
      style={{ cursor: "pointer", overflow: "hidden" }}
    >
      {/* Thumbnail */}
      <div
        className="position-relative bg-light d-flex align-items-center justify-content-center"
        style={{ height: "120px" }}
        onClick={onPreview}
      >
        {type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : type === "video" ? (
          <i className="bi bi-play-circle-fill text-info" style={{ fontSize: "2.5rem" }} />
        ) : type === "document" ? (
          <i className="bi bi-file-earmark-pdf text-danger" style={{ fontSize: "2.5rem" }} />
        ) : (
          <i className="bi bi-file-earmark text-muted" style={{ fontSize: "2.5rem" }} />
        )}

        {/* In-use badge */}
        {inUse && (
          <span
            className="position-absolute top-0 start-0 m-1 badge bg-success"
            style={{ fontSize: "0.6rem" }}
            title={`Used in ${file.usageCount} section(s)`}
          >
            <i className="bi bi-link me-1" />
            In use
          </span>
        )}
      </div>

      {/* Info */}
      <div className="card-body p-2">
        <p
          className="mb-1 small fw-semibold text-truncate"
          style={{ fontSize: "0.7rem" }}
          title={file.name}
        >
          {file.name}
        </p>
        <p className="mb-0 text-muted" style={{ fontSize: "0.65rem" }}>
          {formatFileSize(file.size)}
        </p>
        {inUse && (
          <p className="mb-1 text-success" style={{ fontSize: "0.6rem" }}>
            Used in {file.usageCount} section{file.usageCount !== 1 ? "s" : ""}
          </p>
        )}
        {/* Actions */}
        <div className="d-flex gap-1 mt-1">
          <button
            className={`btn btn-sm flex-fill ${isCopied ? "btn-success" : "btn-outline-secondary"}`}
            onClick={onCopy}
            title="Copy URL"
            style={{ fontSize: "0.65rem", padding: "2px 6px" }}
          >
            <i className={`bi ${isCopied ? "bi-check-lg" : "bi-link-45deg"}`} />
          </button>
          <button
            className={`btn btn-sm ${inUse ? "btn-outline-secondary" : "btn-outline-danger"}`}
            onClick={onDelete}
            title={inUse ? "Cannot delete — file is in use" : "Delete"}
            disabled={inUse}
            style={{ fontSize: "0.65rem", padding: "2px 6px" }}
          >
            <i className={`bi ${inUse ? "bi-lock" : "bi-trash"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// File Preview Modal
// ============================================

interface FilePreviewModalProps {
  file: MediaFile;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isCopied: boolean;
}

function FilePreviewModal({ file, onClose, onCopy, onDelete, isCopied }: FilePreviewModalProps) {
  const type = getFileType(file.name);

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title text-truncate" title={file.name}>
              {file.name}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body text-center p-3">
            {type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.url}
                alt={file.name}
                style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: "4px" }}
              />
            ) : type === "video" ? (
              <video
                src={file.url}
                controls
                style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: "4px" }}
              />
            ) : type === "document" ? (
              <iframe
                src={file.url}
                style={{ width: "100%", height: "60vh", border: "none", borderRadius: "4px" }}
                title={file.name}
              />
            ) : (
              <div className="py-5">
                <i className="bi bi-file-earmark text-muted" style={{ fontSize: "5rem" }} />
              </div>
            )}
          </div>
          <div className="modal-footer flex-wrap gap-2">
            <div className="me-auto text-muted small">
              <span className="me-3">
                <i className="bi bi-hdd me-1" />
                {formatFileSize(file.size)}
              </span>
              <span>
                <i className="bi bi-calendar me-1" />
                {new Date(file.modifiedAt).toLocaleDateString()}
              </span>
            </div>
            <button
              className={`btn btn-sm ${isCopied ? "btn-success" : "btn-outline-secondary"}`}
              onClick={onCopy}
            >
              <i className={`bi ${isCopied ? "bi-check-lg" : "bi-link-45deg"} me-1`} />
              {isCopied ? "Copied!" : "Copy URL"}
            </button>
            <a
              href={file.url}
              download={file.name}
              className="btn btn-sm btn-outline-primary"
            >
              <i className="bi bi-download me-1" />
              Download
            </a>
            <button className="btn btn-sm btn-outline-danger" onClick={onDelete}>
              <i className="bi bi-trash me-1" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
