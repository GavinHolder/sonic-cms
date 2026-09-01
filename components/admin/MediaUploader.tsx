"use client";

import { useState, useRef } from "react";

interface MediaUploaderProps {
  accept?: string; // "image/*" | "video/*" | "image/*,video/*" | "application/pdf"
  onUploadComplete: (url: string, type: "image" | "video" | "pdf") => void;
  maxSizeMB?: number;
  label?: string;
}

export default function MediaUploader({
  accept = "image/*,video/*",
  onUploadComplete,
  maxSizeMB,
  label = "Upload Media",
}: MediaUploaderProps) {
  // Default limits: 200MB for video-only, 10MB for images/mixed
  const effectiveMaxMB = maxSizeMB ?? (accept === "video/*" ? 200 : 10);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > effectiveMaxMB) {
      setError(`File too large: ${fileSizeMB.toFixed(1)} MB. Maximum is ${effectiveMaxMB} MB.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Client-side image optimization
      let fileToUpload = file;

      if (file.type.startsWith("image/")) {
        setProgress(20);
        fileToUpload = await optimizeImage(file);
        setProgress(40);
      }

      // Upload to server
      const formData = new FormData();
      formData.append("file", fileToUpload);

      setProgress(60);

      const response = await fetch("/api/media/upload-simple", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
        let serverMsg = "Upload failed";
        try {
          const errData = await response.json();
          serverMsg = errData.error || errData.message || serverMsg;
        } catch {
          // Body was empty or not JSON — give status-specific hints
          if (response.status === 413) {
            serverMsg = `File too large for server (${(file.size / 1024 / 1024).toFixed(1)} MB). Restart the dev server after config changes.`;
          } else {
            serverMsg = `Upload failed (${response.status} ${response.statusText})`;
          }
        }
        throw new Error(serverMsg);
      }

      const data = await response.json();
      setProgress(100);

      onUploadComplete(data.url, data.type);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Client-side image optimization
  const optimizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resize
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Canvas not supported"));
            return;
          }

          // Calculate new dimensions (max 1920x1080)
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          const maxHeight = 1080;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob (JPEG with 85% quality for optimization)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to optimize image"));
                return;
              }

              // Create new file from blob
              const optimizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              resolve(optimizedFile);
            },
            "image/jpeg",
            0.85
          );
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="media-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <button
        type="button"
        className="btn btn-outline-primary w-100"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2"></span>
            Uploading... {progress}%
          </>
        ) : (
          <>
            <i className="bi bi-upload me-2"></i>
            {label}
          </>
        )}
      </button>

      {error && (
        <div className="alert alert-danger mt-2 mb-0 py-2 small">
          <i className="bi bi-exclamation-triangle me-1"></i>
          {error}
        </div>
      )}

      {uploading && (
        <div className="progress mt-2" style={{ height: "4px" }}>
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}
