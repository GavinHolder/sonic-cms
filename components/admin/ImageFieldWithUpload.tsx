"use client";

import { useState } from "react";
import MediaPickerModal from "./MediaPickerModal";
import MediaUploadModal from "./MediaUploadModal";

interface ImageFieldWithUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  acceptedTypes?: string;
  previewMaxHeight?: string;
}

/**
 * Reusable image field with Browse (media library) and Upload buttons.
 * Follows the same pattern as HeroItemEditor media fields.
 */
export default function ImageFieldWithUpload({
  label,
  value,
  onChange,
  placeholder = "/images/example.jpg",
  required = false,
  helpText,
  acceptedTypes = "image/*",
  previewMaxHeight = "150px",
}: ImageFieldWithUploadProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset error state when the value changes
  const handleChange = (url: string) => {
    setImgError(false);
    onChange(url);
  };

  return (
    <>
      <label className="form-label fw-semibold">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setShowMediaPicker(true)}
          title="Browse media library"
        >
          <i className="bi bi-folder2-open me-1"></i>
          Browse
        </button>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => setShowMediaUpload(true)}
          title="Upload from your computer"
        >
          <i className="bi bi-cloud-upload me-1"></i>
          Upload
        </button>
        {value && (
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => handleChange("")}
            title="Clear this image (empties the field only — does not delete the file from the media library)"
          >
            <i className="bi bi-x-lg me-1"></i>
            Clear
          </button>
        )}
      </div>
      {helpText && <div className="form-text">{helpText}</div>}

      {/* Image Preview */}
      {value && (
        <div className="mt-2">
          {imgError ? (
            <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-0">
              <i className="bi bi-image text-warning flex-shrink-0"></i>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong>Image not found</strong>
                <div className="small text-muted" style={{ wordBreak: "break-all" }}>
                  Path: {value}
                </div>
              </div>
            </div>
          ) : (
            <img
              key={value}
              src={value}
              alt="Preview"
              className="img-thumbnail"
              style={{ maxHeight: previewMaxHeight, width: "auto", maxWidth: "100%" }}
              onError={() => setImgError(true)}
            />
          )}
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => { setImgError(false); handleChange(url); }}
        filterType="image"
      />

      {/* Media Upload Modal */}
      <MediaUploadModal
        isOpen={showMediaUpload}
        onClose={() => setShowMediaUpload(false)}
        onUploadComplete={(url) => { setImgError(false); handleChange(url); }}
        acceptedTypes={acceptedTypes}
      />
    </>
  );
}
