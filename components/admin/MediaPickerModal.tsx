"use client";

import { useState, useEffect } from "react";

interface MediaFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  modifiedAt: string;
  altText?: string;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the URL of the selected file (single-select mode). */
  onSelect: (url: string) => void;
  /** Called with full asset objects (multi-select mode). Requires multi=true. */
  onSelectAssets?: (assets: { id: string; url: string; altText: string }[]) => void;
  filterType?: "image" | "video" | "all";
  /** Enable multi-select mode. Confirm button appears at bottom. */
  multi?: boolean;
}

const PER_PAGE = 12;

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  onSelectAssets,
  filterType = "all",
  multi = false,
}: MediaPickerModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/media?perPage=200");
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data?.media)) {
          setFiles(
            data.data.media.map((m: {
              id: string; filename: string; originalName?: string;
              mimeType: string; fileSize: number; url: string;
              altText?: string; createdAt?: string;
            }) => ({
              id: m.id,
              name: m.filename || m.originalName || m.url,
              url: m.url,
              size: m.fileSize,
              type: m.mimeType,
              modifiedAt: m.createdAt || "",
              altText: m.altText || "",
            }))
          );
          return;
        }
      }
      // Fallback: /api/media/files (no IDs — single-select only)
      const r2 = await fetch("/api/media/files");
      if (r2.ok) {
        const d2 = await r2.json();
        setFiles(
          (d2.files ?? []).map((f: Omit<MediaFile, "id">) => ({
            id: f.url,
            name: f.name,
            url: f.url,
            size: f.size,
            type: f.type,
            modifiedAt: f.modifiedAt,
            altText: "",
          }))
        );
      }
    } catch {
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setCurrentPage(1);
      setSearchQuery("");
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  // Client-side filter + search
  const filtered = files.filter((f) => {
    const matchesType =
      filterType === "all" ||
      (filterType === "image" && f.type.startsWith("image/")) ||
      (filterType === "video" && f.type.startsWith("video/"));
    const matchesSearch =
      !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginatedFiles = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  const handleSingleSelect = (file: MediaFile) => {
    onSelect(file.url);
    onClose();
  };

  const toggleSelection = (file: MediaFile) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(file.id)) next.delete(file.id);
      else next.add(file.id);
      return next;
    });
  };

  const confirmMultiSelect = () => {
    const selected = files.filter((f) => selectedIds.has(f.id));
    onSelectAssets?.(selected.map((f) => ({ id: f.id, url: f.url, altText: f.altText || "" })));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1110 }}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 1115 }}
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header">
              <h5 className="modal-title">
                {multi ? "Select Images" : "Select Media"}
                {multi && selectedIds.size > 0 && (
                  <span className="badge bg-primary ms-2">{selectedIds.size} selected</span>
                )}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Search */}
              <div className="mb-4">
                <div className="row g-3">
                  <div className="col-12 col-md-8">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by filename..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-4 d-flex align-items-center gap-3">
                    <div className="text-muted small">
                      {filtered.length} file{filtered.length !== 1 ? "s" : ""}
                      {filterType !== "all" ? ` (${filterType}s)` : ""}
                    </div>
                    {multi && selectedIds.size > 0 && (
                      <button
                        className="btn btn-link btn-sm p-0 text-muted"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading media...</p>
                </div>
              ) : paginatedFiles.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-images mb-3 d-block" style={{ fontSize: "3rem", opacity: 0.3 }} />
                  <p>No media files found.</p>
                  {(searchQuery || filterType !== "all") && (
                    <p className="small">Try adjusting your search or upload files via the Media Library.</p>
                  )}
                  {!searchQuery && filterType === "all" && (
                    <p className="small">Upload files in the Media Library to see them here.</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Media Grid */}
                  <div className="row g-3">
                    {paginatedFiles.map((file) => {
                      const isSelected = multi && selectedIds.has(file.id);
                      return (
                        <div key={file.url} className="col-6 col-md-4 col-lg-3">
                          <div
                            className="card h-100"
                            onClick={() => multi ? toggleSelection(file) : handleSingleSelect(file)}
                            style={{
                              cursor: "pointer",
                              outline: isSelected ? "3px solid #0d6efd" : "none",
                              outlineOffset: "2px",
                            }}
                          >
                            {/* Selection indicator */}
                            {multi && (
                              <div
                                style={{
                                  position: "absolute", top: "8px", right: "8px", zIndex: 2,
                                  width: "22px", height: "22px", borderRadius: "50%",
                                  background: isSelected ? "#0d6efd" : "rgba(255,255,255,0.8)",
                                  border: isSelected ? "none" : "2px solid rgba(0,0,0,0.3)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.15s",
                                }}
                              >
                                {isSelected && <i className="bi bi-check text-white" style={{ fontSize: "12px" }} />}
                              </div>
                            )}

                            {/* Thumbnail */}
                            <div
                              className="position-relative bg-light d-flex align-items-center justify-content-center"
                              style={{ paddingTop: "75%", overflow: "hidden" }}
                            >
                              {file.type.startsWith("image/") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="position-absolute top-0 start-0 w-100 h-100"
                                  style={{ objectFit: "cover" }}
                                />
                              ) : file.type === "application/pdf" ? (
                                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                                  <i className="bi bi-file-earmark-pdf text-danger" style={{ fontSize: "3rem" }} />
                                </div>
                              ) : (
                                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                                  <i className="bi bi-play-circle-fill text-info" style={{ fontSize: "3rem" }} />
                                </div>
                              )}
                            </div>

                            {/* Metadata */}
                            <div className="card-body p-2">
                              <div className="small text-truncate" title={file.name}>
                                {file.name}
                              </div>
                              <div className="small text-muted">
                                {(file.size / 1024).toFixed(0)} KB
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav className="mt-4" aria-label="Media pagination">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage((p) => p - 1)}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
                            <button className="page-link" onClick={() => setCurrentPage(page)}>
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage((p) => p + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              {multi && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmMultiSelect}
                  disabled={selectedIds.size === 0}
                >
                  Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}Image{selectedIds.size !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
