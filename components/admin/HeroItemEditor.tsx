"use client";

import { useState } from "react";
import type { CarouselItem, CarouselItemType, OverlayAnimation } from "@/types/carousel";
import MediaPickerModal from "./MediaPickerModal";
import MediaUploadModal from "./MediaUploadModal";
import TabPanel, { Tab } from "./TabPanel";
import HelpText from "./HelpText";

interface HeroItemEditorProps {
  item: CarouselItem;
  onSave: (item: CarouselItem) => void;
  onCancel: () => void;
}

export default function HeroItemEditor({ item, onSave, onCancel }: HeroItemEditorProps) {
  const [formData, setFormData] = useState<CarouselItem>(item);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [mediaPickerField, setMediaPickerField] = useState<
    "src" | "mobileSrc" | "poster"
  >("src");

  const handleFieldChange = (field: keyof CarouselItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOverlayChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, [field]: value },
    }));
  };

  const handleButtonChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      overlay: {
        ...prev.overlay,
        button: { ...prev.overlay?.button, [field]: value } as any,
      },
    }));
  };

  const handleBrowseMedia = (field: "src" | "mobileSrc" | "poster") => {
    setMediaPickerField(field);
    setShowMediaPicker(true);
  };

  const handleUploadMedia = (field: "src" | "mobileSrc" | "poster") => {
    setMediaPickerField(field);
    setShowMediaUpload(true);
  };

  const handleMediaSelect = (url: string) => {
    handleFieldChange(mediaPickerField, url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  function renderMediaTab() {
    return (
      <>
        <HelpText variant="info" collapsible defaultExpanded={false}>
          <strong>Recommended Dimensions:</strong>
          <ul className="mb-0 mt-2">
            <li>Desktop: 1920x1080px (16:9 landscape ratio)</li>
            <li>Mobile: 768x1024px (3:4 portrait ratio)</li>
            <li>Video: MP4 or WebM format, max 10MB</li>
          </ul>
        </HelpText>

        {/* Media Type */}
        <div className="mb-3">
          <label className="form-label">
            Media Type <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={formData.type}
            onChange={(e) =>
              handleFieldChange("type", e.target.value as CarouselItemType)
            }
            required
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>

        {/* Desktop Media */}
        <div className="mb-3">
          <label className="form-label">
            Desktop Media <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              value={formData.src}
              onChange={(e) => handleFieldChange("src", e.target.value)}
              placeholder="https://example.com/image.jpg"
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleBrowseMedia("src")}
            >
              Browse
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => handleUploadMedia("src")}
            >
              Upload
            </button>
            {formData.src && (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => handleFieldChange("src", "")}
                title="Clear this image (empties the field only — does not delete the file)"
              >
                Clear
              </button>
            )}
          </div>
          {formData.src && (
            <div className="mt-2">
              <img
                src={formData.src}
                alt="Preview"
                className="img-thumbnail"
                style={{ maxHeight: "150px" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="alert alert-warning d-flex align-items-center gap-2"
                style={{ display: "none" }}
              >
                <span>🖼️</span>
                <div>
                  <strong>Image not found</strong>
                  <div className="small">Path: {formData.src}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Media (Optional) */}
        <div className="mb-3">
          <label className="form-label">Mobile Media (Optional)</label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              value={formData.mobileSrc || ""}
              onChange={(e) => handleFieldChange("mobileSrc", e.target.value)}
              placeholder="https://example.com/mobile-image.jpg (optional)"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => handleBrowseMedia("mobileSrc")}
            >
              Browse
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => handleUploadMedia("mobileSrc")}
            >
              Upload
            </button>
            {formData.mobileSrc && (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => handleFieldChange("mobileSrc", "")}
                title="Clear this image (empties the field only — does not delete the file)"
              >
                Clear
              </button>
            )}
          </div>
          <div className="form-text">
            Optional: Provide a portrait-oriented image for mobile devices (768x1024px recommended)
          </div>
          {formData.mobileSrc && (
            <div className="mt-2">
              <img
                src={formData.mobileSrc}
                alt="Mobile Preview"
                className="img-thumbnail"
                style={{ maxHeight: "150px" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="alert alert-warning d-flex align-items-center gap-2"
                style={{ display: "none" }}
              >
                <span>🖼️</span>
                <div>
                  <strong>Image not found</strong>
                  <div className="small">Path: {formData.mobileSrc}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Poster (Only for videos) */}
        {formData.type === "video" && (
          <div className="mb-3">
            <label className="form-label">Video Poster Image (Optional)</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                value={formData.poster || ""}
                onChange={(e) => handleFieldChange("poster", e.target.value)}
                placeholder="https://example.com/poster.jpg (optional)"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => handleBrowseMedia("poster")}
              >
                Browse
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => handleUploadMedia("poster")}
              >
                Upload
              </button>
              {formData.poster && (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => handleFieldChange("poster", "")}
                  title="Clear this image (empties the field only — does not delete the file)"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="form-text">
              Image shown before video loads or plays
            </div>
            {formData.poster && (
              <div className="mt-2">
                <img
                  src={formData.poster}
                  alt="Poster Preview"
                  className="img-thumbnail"
                  style={{ maxHeight: "150px" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div
                  className="alert alert-warning d-flex align-items-center gap-2"
                  style={{ display: "none" }}
                >
                  <span>🖼️</span>
                  <div>
                    <strong>Image not found</strong>
                    <div className="small">Path: {formData.poster}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alt Text */}
        <div className="mb-3">
          <label className="form-label">Alt Text</label>
          <input
            type="text"
            className="form-control"
            value={formData.alt || ""}
            onChange={(e) => handleFieldChange("alt", e.target.value)}
            placeholder="Describe the image for accessibility"
          />
          <div className="form-text">Required for accessibility - describe the image content</div>
        </div>
      </>
    );
  }

  function renderOverlayTab() {
    return (
      <>
        <HelpText variant="tip" collapsible defaultExpanded={false}>
          <strong>Mobile-First Tips:</strong>
          <ul className="mb-0 mt-2">
            <li>Use optional mobile heading for shorter text on small screens</li>
            <li>If mobile fields are empty, desktop version is used on all devices</li>
          </ul>
        </HelpText>

        {/* Heading (Desktop) */}
        <div className="mb-3">
          <label className="form-label">Heading (Desktop)</label>
          <input
            type="text"
            className="form-control"
            value={formData.overlay?.heading || ""}
            onChange={(e) => handleOverlayChange("heading", e.target.value)}
            placeholder="Main heading text"
          />
        </div>

        {/* Mobile Heading (Optional) */}
        <div className="mb-3">
          <label className="form-label">Heading (Mobile - Optional)</label>
          <input
            type="text"
            className="form-control"
            value={formData.overlay?.mobileHeading || ""}
            onChange={(e) => handleOverlayChange("mobileHeading", e.target.value)}
            placeholder="Shorter heading for mobile (optional)"
          />
          <div className="form-text">
            Optional: Provide a shorter heading for mobile devices. If empty, desktop heading is used.
          </div>
        </div>

        {/* Subheading */}
        <div className="mb-3">
          <label className="form-label">Subheading</label>
          <input
            type="text"
            className="form-control"
            value={formData.overlay?.subheading || ""}
            onChange={(e) => handleOverlayChange("subheading", e.target.value)}
            placeholder="Subtitle or description"
          />
        </div>

        {/* Text Position */}
        <div className="mb-3">
          <label className="form-label">Text Position</label>
          <select
            className="form-select"
            value={formData.overlay?.position || "center"}
            onChange={(e) => handleOverlayChange("position", e.target.value)}
          >
            <option value="center">Center</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
          <div className="form-text">Where the text overlay appears on the image</div>
        </div>
      </>
    );
  }

  function renderAnimationTab() {
    return (
      <>
        <HelpText variant="info" collapsible defaultExpanded={false}>
          <strong>Animation Tips:</strong>
          <ul className="mb-0 mt-2">
            <li>Choose an animation that matches your brand's style</li>
            <li>Subtle animations (fade-in, slide-up) work best for most content</li>
            <li>Test animations on mobile devices for best experience</li>
          </ul>
        </HelpText>

        {/* Animation */}
        <div className="mb-3">
          <label className="form-label">Animation Type</label>
          <select
            className="form-select"
            value={formData.overlay?.animation || "fade-in"}
            onChange={(e) =>
              handleOverlayChange("animation", e.target.value as OverlayAnimation)
            }
          >
            <option value="none">None</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-up">Slide Up</option>
            <option value="slide-down">Slide Down</option>
            <option value="slide-left">Slide Left</option>
            <option value="slide-right">Slide Right</option>
            <option value="zoom-in">Zoom In</option>
          </select>
          <div className="form-text">How the text overlay appears when the slide loads</div>
        </div>
      </>
    );
  }

  function renderButtonTab() {
    return (
      <>
        <HelpText variant="tip" collapsible defaultExpanded={false}>
          <strong>Button Best Practices:</strong>
          <ul className="mb-0 mt-2">
            <li>Use clear, action-oriented text (e.g., "Get Started", "Learn More")</li>
            <li>Keep button text short (2-4 words)</li>
            <li>Primary buttons should be used for main actions</li>
          </ul>
        </HelpText>

        <div className="mb-3">
          <label className="form-label">Button Text</label>
          <input
            type="text"
            className="form-control"
            value={formData.overlay?.button?.text || ""}
            onChange={(e) => handleButtonChange("text", e.target.value)}
            placeholder="Learn More"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Button Link</label>
          <input
            type="text"
            className="form-control"
            value={formData.overlay?.button?.href || ""}
            onChange={(e) => handleButtonChange("href", e.target.value)}
            placeholder="/services"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Button Style</label>
          <select
            className="form-select"
            value={formData.overlay?.button?.variant || "primary"}
            onChange={(e) => handleButtonChange("variant", e.target.value)}
          >
            <option value="primary">Primary (Blue)</option>
            <option value="secondary">Secondary (Gray)</option>
            <option value="outline">Outline</option>
          </select>
          <div className="form-text">Visual style of the button</div>
        </div>
      </>
    );
  }

  const tabs: Tab[] = [
    {
      id: "media",
      label: "Media",
      icon: "🖼️",
      content: renderMediaTab(),
    },
    {
      id: "overlay",
      label: "Text Overlay",
      icon: "📝",
      content: renderOverlayTab(),
    },
    {
      id: "animation",
      label: "Animation",
      icon: "✨",
      content: renderAnimationTab(),
    },
    {
      id: "button",
      label: "Call-to-Action",
      icon: "🔘",
      content: renderButtonTab(),
    },
  ];

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Tabbed Interface */}
        <TabPanel tabs={tabs} defaultTab="media" variant="pills" />

        {/* Form Actions */}
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            💾 Save Item
          </button>
        </div>
      </form>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        filterType={
          mediaPickerField === "poster"
            ? "image"
            : formData.type === "image"
            ? "image"
            : formData.type === "video"
            ? "video"
            : "all"
        }
      />

      {/* Media Upload Modal */}
      <MediaUploadModal
        isOpen={showMediaUpload}
        onClose={() => setShowMediaUpload(false)}
        onUploadComplete={handleMediaSelect}
        acceptedTypes={
          mediaPickerField === "poster"
            ? "image/*"
            : formData.type === "image"
            ? "image/*"
            : formData.type === "video"
            ? "video/*"
            : "image/*,video/*"
        }
      />
    </>
  );
}
