"use client";

import { useState } from "react";
import { useAlert } from "@/components/admin/ConfirmProvider";
import type { PDFPageConfig } from "@/types/page";

interface PDFPageEditorProps {
  page: PDFPageConfig;
  onSave: (updates: Partial<PDFPageConfig>) => void;
  onCancel: () => void;
}

export default function PDFPageEditor({ page, onSave, onCancel }: PDFPageEditorProps) {
  const showAlert = useAlert();
  const [pdfUrl, setPdfUrl] = useState(page.pdfUrl || "");
  const [displayMode, setDisplayMode] = useState<"embed" | "download" | "both">(
    page.displayMode || "embed"
  );
  const [description, setDescription] = useState(page.description || "");
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const handleSave = async () => {
    if (!pdfUrl.trim()) {
      await showAlert("Please provide a PDF URL");
      return;
    }

    onSave({
      pdfUrl: pdfUrl.trim(),
      displayMode,
      description: description.trim() || undefined,
    });
  };

  const handleMediaPick = (url: string) => {
    setPdfUrl(url);
    setShowMediaPicker(false);
  };

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1115 }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-file-earmark-pdf me-2"></i>
              Edit PDF Page
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
            ></button>
          </div>

          <div className="modal-body">
            {/* PDF URL */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                PDF Document URL <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://example.com/document.pdf or /uploads/document.pdf"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowMediaPicker(true)}
                  title="Browse media library"
                >
                  <i className="bi bi-folder2-open"></i>
                </button>
              </div>
              <div className="form-text">
                Enter a full URL or relative path to your PDF document
              </div>
            </div>

            {/* Display Mode */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Display Mode</label>
              <div className="d-grid gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayMode("embed")}
                  className={`btn text-start ${
                    displayMode === "embed"
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-text"></i>
                    <div className="flex-grow-1">
                      <strong>Embed in Page</strong>
                      <div className="small mt-1 opacity-75">
                        Display PDF inline using browser viewer
                      </div>
                    </div>
                    {displayMode === "embed" && (
                      <i className="bi bi-check-circle-fill"></i>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDisplayMode("download")}
                  className={`btn text-start ${
                    displayMode === "download"
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-download"></i>
                    <div className="flex-grow-1">
                      <strong>Download Only</strong>
                      <div className="small mt-1 opacity-75">
                        Show download button (no inline viewer)
                      </div>
                    </div>
                    {displayMode === "download" && (
                      <i className="bi bi-check-circle-fill"></i>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDisplayMode("both")}
                  className={`btn text-start ${
                    displayMode === "both"
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-arrow-down"></i>
                    <div className="flex-grow-1">
                      <strong>Both</strong>
                      <div className="small mt-1 opacity-75">
                        Embed viewer + download button below
                      </div>
                    </div>
                    {displayMode === "both" && (
                      <i className="bi bi-check-circle-fill"></i>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Description (Optional)
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Brief description of the document (shown above the PDF)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="form-text">
                Add context or instructions for users viewing this document
              </div>
            </div>

            {/* Preview */}
            {pdfUrl && (
              <div className="alert alert-info">
                <div className="d-flex align-items-start gap-2">
                  <i className="bi bi-info-circle mt-1"></i>
                  <div>
                    <strong>Preview mode:</strong> {displayMode}
                    <div className="small mt-1">
                      {displayMode === "embed" &&
                        "PDF will be displayed inline in browser"}
                      {displayMode === "download" &&
                        "Users will see a download button only"}
                      {displayMode === "both" &&
                        "PDF viewer + download button"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!pdfUrl.trim()}
            >
              <i className="bi bi-check-lg me-2"></i>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Media Picker Modal (Placeholder) */}
      {showMediaPicker && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1120 }}
          onClick={() => setShowMediaPicker(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Media Library</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowMediaPicker(false)}
                ></button>
              </div>
              <div className="modal-body text-center py-5">
                <i className="bi bi-images text-muted" style={{ fontSize: "3rem" }}></i>
                <p className="mt-3 text-muted">
                  Media library integration coming soon
                </p>
                <p className="small text-muted">
                  For now, enter the PDF URL manually
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMediaPicker(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
