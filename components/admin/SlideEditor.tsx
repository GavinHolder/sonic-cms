"use client";

import { useState } from "react";
import type { HeroCarouselSlide, AnimationType } from "@/types/section";
import MediaUploader from "./MediaUploader";

interface SlideEditorProps {
  slide: HeroCarouselSlide;
  onChange: (updates: Partial<HeroCarouselSlide>) => void;
  onDelete: () => void;
  slideNumber: number;
  showReorderButtons?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function SlideEditor({
  slide,
  onChange,
  onDelete,
  slideNumber,
  showReorderButtons = false,
  onMoveUp,
  onMoveDown,
}: SlideEditorProps) {
  const [activeTab, setActiveTab] = useState<"media" | "gradient" | "overlay" | "position">("media");

  const updateGradient = (updates: Partial<NonNullable<HeroCarouselSlide["gradient"]>>) => {
    onChange({
      gradient: {
        ...slide.gradient,
        enabled: slide.gradient?.enabled ?? false,
        type: slide.gradient?.type ?? "preset",
        ...updates,
      } as HeroCarouselSlide["gradient"],
    });
  };

  const updateOverlay = (updates: Partial<NonNullable<HeroCarouselSlide["overlay"]>>) => {
    onChange({
      overlay: {
        ...slide.overlay,
        heading: slide.overlay?.heading ?? {
          text: "",
          fontSize: 56,
          fontWeight: 700,
          fontFamily: "inherit",
          color: "#ffffff",
          animation: "slideUp" as AnimationType,
          animationDuration: 800,
          animationDelay: 200,
        },
        position: slide.overlay?.position ?? "center",
        spacing: slide.overlay?.spacing ?? {
          betweenHeadingSubheading: 16,
          betweenSubheadingButtons: 32,
          betweenButtons: 16,
        },
        buttons: slide.overlay?.buttons ?? [],
        ...updates,
      } as HeroCarouselSlide["overlay"],
    });
  };

  return (
    <div className="p-3">
      <div>
        {/* Tab Navigation */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "media" ? "active" : ""}`}
              onClick={() => setActiveTab("media")}
            >
              <i className="bi bi-image me-1"></i>
              Media
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "gradient" ? "active" : ""}`}
              onClick={() => setActiveTab("gradient")}
            >
              <i className="bi bi-palette me-1"></i>
              Gradient
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "overlay" ? "active" : ""}`}
              onClick={() => setActiveTab("overlay")}
            >
              <i className="bi bi-card-text me-1"></i>
              Text Overlay
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "position" ? "active" : ""}`}
              onClick={() => setActiveTab("position")}
            >
              <i className="bi bi-grid me-1"></i>
              Position
            </button>
          </li>
        </ul>

        {/* Media Tab */}
        {activeTab === "media" && (
          <div>
            <h6 className="mb-3">Media Type</h6>
            <div className="btn-group w-100 mb-3" role="group">
              <input
                type="radio"
                className="btn-check"
                id={`media-image-${slide.id}`}
                checked={slide.type === "image"}
                onChange={() => onChange({ type: "image" })}
              />
              <label className="btn btn-outline-primary" htmlFor={`media-image-${slide.id}`}>
                <i className="bi bi-image me-1"></i>
                Image
              </label>

              <input
                type="radio"
                className="btn-check"
                id={`media-video-${slide.id}`}
                checked={slide.type === "video"}
                onChange={() => onChange({ type: "video" })}
              />
              <label className="btn btn-outline-primary" htmlFor={`media-video-${slide.id}`}>
                <i className="bi bi-play-circle me-1"></i>
                Video
              </label>
            </div>

            {/* Recommendations Alert */}
            <div className={`alert ${slide.type === "image" ? "alert-info" : "alert-warning"} py-2 px-3 mb-3`}>
              <div className="d-flex align-items-start">
                <i className={`bi ${slide.type === "image" ? "bi-info-circle" : "bi-camera-video"} me-2 mt-1`}></i>
                <div>
                  <strong className="d-block mb-1">
                    {slide.type === "image" ? "📸 Image Recommendations" : "🎥 Video Recommendations"}
                  </strong>
                  {slide.type === "image" ? (
                    <small>
                      <strong>Dimensions:</strong> 1920×1080px (Full HD) or 2560×1440px (2K)<br/>
                      <strong>Aspect Ratio:</strong> 16:9 (widescreen)<br/>
                      <strong>Format:</strong> JPEG or WebP (auto-converted)<br/>
                      <strong>Max Size:</strong> 10MB (will be optimized)
                    </small>
                  ) : (
                    <small>
                      <strong>Aspect Ratio:</strong> 16:9 (1920×1080 or 3840×2160)<br/>
                      <strong>Format:</strong> MP4 (H.264 codec recommended)<br/>
                      <strong>Duration:</strong> 10-30 seconds for best performance<br/>
                      <strong>Max Size:</strong> 50MB
                    </small>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                {slide.type === "image" ? "Image" : "Video"} Upload
              </label>
              <MediaUploader
                accept={slide.type === "image" ? "image/*" : "video/*"}
                onUploadComplete={(url, type) => {
                  onChange({ src: url, type });
                }}
                maxSizeMB={slide.type === "image" ? 10 : 50}
                label={`Upload ${slide.type === "image" ? "Image" : "Video"}`}
              />
              {slide.src && (
                <div className="mt-2">
                  <small className="text-muted">
                    <i className="bi bi-check-circle-fill text-success me-1"></i>
                    Current: {slide.src}
                  </small>
                </div>
              )}
            </div>

            {/* Alt Text - Accessibility */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Alt Text</label>
              <input
                type="text"
                className="form-control"
                value={slide.alt ?? ""}
                onChange={(e) => onChange({ alt: e.target.value })}
                placeholder="Describe this slide for accessibility"
              />
              <div className="form-text">
                <i className="bi bi-universal-access me-1"></i>
                Describes the image/video for screen readers and SEO
              </div>
            </div>

            {/* Mobile Settings */}
            <hr className="my-3" />
            <h6 className="mb-2">
              <i className="bi bi-phone me-2"></i>
              Mobile Settings
            </h6>
            <div className="alert alert-info small py-2 px-3 mb-3">
              <i className="bi bi-lightbulb me-1"></i>
              On mobile devices (&lt;768px), these settings override the desktop media. If a <strong>solid color</strong> is set, it takes priority over the mobile image.
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Mobile Background Color</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  className="form-control form-control-color"
                  value={slide.mobileBgColor || "#000000"}
                  onChange={(e) => onChange({ mobileBgColor: e.target.value })}
                  disabled={!slide.mobileBgColor}
                  style={{ width: "50px" }}
                />
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`mobile-bg-enabled-${slide.id}`}
                    checked={!!slide.mobileBgColor}
                    onChange={(e) =>
                      onChange({ mobileBgColor: e.target.checked ? "#1e3a5f" : undefined })
                    }
                  />
                  <label className="form-check-label small" htmlFor={`mobile-bg-enabled-${slide.id}`}>
                    Use solid color on mobile
                  </label>
                </div>
              </div>
              {slide.mobileBgColor && (
                <div className="form-text">
                  <i className="bi bi-paint-bucket me-1"></i>
                  Mobile will show <strong style={{ color: slide.mobileBgColor }}>{slide.mobileBgColor}</strong> instead of any image/video
                </div>
              )}
            </div>

            {!slide.mobileBgColor && slide.type === "image" && (
              <div className="mb-3">
                <label className="form-label fw-semibold">Mobile Image (Optional)</label>
                <div className="form-text mb-2">
                  <i className="bi bi-aspect-ratio me-1"></i>
                  Portrait-oriented image for mobile. <strong>Recommended:</strong> 1080x1920px (9:16). Falls back to desktop image if not set.
                </div>
                <MediaUploader
                  accept="image/*"
                  onUploadComplete={(url) => {
                    onChange({ mobileSrc: url });
                  }}
                  maxSizeMB={10}
                  label="Upload Mobile Image"
                />
                {slide.mobileSrc && (
                  <div className="mt-2 d-flex align-items-center gap-2">
                    <small className="text-muted">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Current: {slide.mobileSrc}
                    </small>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onChange({ mobileSrc: undefined })}
                      title="Remove mobile image"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>
                )}
              </div>
            )}

            {slide.type === "video" && (
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Video Poster Image (Optional)
                </label>
                <div className="form-text mb-2">
                  <i className="bi bi-lightbulb me-1"></i>
                  Thumbnail shown before video loads. Recommended: 1920×1080px, same aspect ratio as video.
                </div>
                <MediaUploader
                  accept="image/*"
                  onUploadComplete={(url) => {
                    onChange({ poster: url });
                  }}
                  maxSizeMB={5}
                  label="Upload Poster Image"
                />
                {slide.poster && (
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-check-circle-fill text-success me-1"></i>
                      Current: {slide.poster}
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gradient Tab */}
        {activeTab === "gradient" && (
          <div>
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id={`gradient-enabled-${slide.id}`}
                checked={slide.gradient?.enabled ?? false}
                onChange={(e) => updateGradient({ enabled: e.target.checked })}
              />
              <label className="form-check-label" htmlFor={`gradient-enabled-${slide.id}`}>
                Enable Gradient Overlay
              </label>
            </div>

            {slide.gradient?.enabled && (
              <>
                <h6 className="mb-3">Gradient Type</h6>
                <div className="btn-group w-100 mb-3" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    id={`gradient-preset-${slide.id}`}
                    checked={slide.gradient.type === "preset"}
                    onChange={() => updateGradient({ type: "preset" })}
                  />
                  <label className="btn btn-outline-primary" htmlFor={`gradient-preset-${slide.id}`}>
                    <i className="bi bi-stars me-1"></i>
                    Preset Gradient
                  </label>

                  <input
                    type="radio"
                    className="btn-check"
                    id={`gradient-custom-${slide.id}`}
                    checked={slide.gradient.type === "custom"}
                    onChange={() => updateGradient({ type: "custom" })}
                  />
                  <label className="btn btn-outline-primary" htmlFor={`gradient-custom-${slide.id}`}>
                    <i className="bi bi-image me-1"></i>
                    Custom Image
                  </label>
                </div>

                {slide.gradient.type === "preset" && (
                  <div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Direction</label>
                      <select
                        className="form-select"
                        value={slide.gradient.preset?.direction ?? "bottom"}
                        onChange={(e) =>
                          updateGradient({
                            preset: {
                              ...slide.gradient?.preset,
                              direction: e.target.value as any,
                              startOpacity: slide.gradient?.preset?.startOpacity ?? 70,
                              endOpacity: slide.gradient?.preset?.endOpacity ?? 0,
                              color: slide.gradient?.preset?.color ?? "#000000",
                            },
                          })
                        }
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="topLeft">Top Left</option>
                        <option value="topRight">Top Right</option>
                        <option value="bottomLeft">Bottom Left</option>
                        <option value="bottomRight">Bottom Right</option>
                      </select>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Start Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={slide.gradient.preset?.startOpacity ?? 70}
                          onChange={(e) =>
                            updateGradient({
                              preset: {
                                ...slide.gradient?.preset,
                                direction: slide.gradient?.preset?.direction ?? "bottom",
                                startOpacity: parseInt(e.target.value),
                                endOpacity: slide.gradient?.preset?.endOpacity ?? 0,
                                color: slide.gradient?.preset?.color ?? "#000000",
                              },
                            })
                          }
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">End Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={slide.gradient.preset?.endOpacity ?? 0}
                          onChange={(e) =>
                            updateGradient({
                              preset: {
                                ...slide.gradient?.preset,
                                direction: slide.gradient?.preset?.direction ?? "bottom",
                                startOpacity: slide.gradient?.preset?.startOpacity ?? 70,
                                endOpacity: parseInt(e.target.value),
                                color: slide.gradient?.preset?.color ?? "#000000",
                              },
                            })
                          }
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Gradient Color</label>
                      <input
                        type="color"
                        className="form-control form-control-color w-100"
                        value={slide.gradient.preset?.color ?? "#000000"}
                        onChange={(e) =>
                          updateGradient({
                            preset: {
                              ...slide.gradient?.preset,
                              direction: slide.gradient?.preset?.direction ?? "bottom",
                              startOpacity: slide.gradient?.preset?.startOpacity ?? 70,
                              endOpacity: slide.gradient?.preset?.endOpacity ?? 0,
                              color: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {slide.gradient.type === "custom" && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Custom Gradient Image</label>
                    <MediaUploader
                      accept="image/*"
                      onUploadComplete={(url) => {
                        updateGradient({
                          custom: { src: url },
                        });
                      }}
                      maxSizeMB={5}
                      label="Upload Gradient Image"
                    />
                    {slide.gradient.custom?.src && (
                      <div className="mt-2">
                        <small className="text-muted">Current: {slide.gradient.custom.src}</small>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Text Overlay Tab */}
        {activeTab === "overlay" && (
          <div>
            <h6 className="mb-3">Heading</h6>
            <div className="mb-3">
              <label className="form-label fw-semibold">Text</label>
              <input
                type="text"
                className="form-control"
                value={slide.overlay?.heading.text ?? ""}
                onChange={(e) =>
                  updateOverlay({
                    heading: {
                      ...slide.overlay?.heading,
                      text: e.target.value,
                      fontSize: slide.overlay?.heading.fontSize ?? 56,
                      fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                      fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                      color: slide.overlay?.heading.color ?? "#ffffff",
                      animation: slide.overlay?.heading.animation ?? "slideUp",
                      animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                      animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                    },
                  })
                }
                placeholder="Welcome to Your Company"
              />
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Font Size (px)</label>
                <input
                  type="number"
                  className="form-control"
                  value={slide.overlay?.heading.fontSize ?? 56}
                  onChange={(e) =>
                    updateOverlay({
                      heading: {
                        ...slide.overlay?.heading,
                        text: slide.overlay?.heading.text ?? "",
                        fontSize: parseInt(e.target.value),
                        fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                        fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                        color: slide.overlay?.heading.color ?? "#ffffff",
                        animation: slide.overlay?.heading.animation ?? "slideUp",
                        animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                        animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                      },
                    })
                  }
                  min="12"
                  max="120"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Font Weight</label>
                <select
                  className="form-select"
                  value={slide.overlay?.heading.fontWeight ?? 700}
                  onChange={(e) =>
                    updateOverlay({
                      heading: {
                        ...slide.overlay?.heading,
                        text: slide.overlay?.heading.text ?? "",
                        fontSize: slide.overlay?.heading.fontSize ?? 56,
                        fontWeight: parseInt(e.target.value),
                        fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                        color: slide.overlay?.heading.color ?? "#ffffff",
                        animation: slide.overlay?.heading.animation ?? "slideUp",
                        animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                        animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                      },
                    })
                  }
                >
                  <option value="100">Thin (100)</option>
                  <option value="200">Extra Light (200)</option>
                  <option value="300">Light (300)</option>
                  <option value="400">Normal (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semi Bold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Extra Bold (800)</option>
                  <option value="900">Black (900)</option>
                </select>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Font Family</label>
                <input
                  type="text"
                  className="form-control"
                  value={slide.overlay?.heading.fontFamily ?? "inherit"}
                  onChange={(e) =>
                    updateOverlay({
                      heading: {
                        ...slide.overlay?.heading,
                        text: slide.overlay?.heading.text ?? "",
                        fontSize: slide.overlay?.heading.fontSize ?? 56,
                        fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                        fontFamily: e.target.value,
                        color: slide.overlay?.heading.color ?? "#ffffff",
                        animation: slide.overlay?.heading.animation ?? "slideUp",
                        animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                        animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                      },
                    })
                  }
                  placeholder="inherit"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Color</label>
                <input
                  type="color"
                  className="form-control form-control-color w-100"
                  value={slide.overlay?.heading.color ?? "#ffffff"}
                  onChange={(e) =>
                    updateOverlay({
                      heading: {
                        ...slide.overlay?.heading,
                        text: slide.overlay?.heading.text ?? "",
                        fontSize: slide.overlay?.heading.fontSize ?? 56,
                        fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                        fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                        color: e.target.value,
                        animation: slide.overlay?.heading.animation ?? "slideUp",
                        animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                        animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-4">
                <label className="form-label fw-semibold">Animation</label>
                <select
                  className="form-select"
                  value={slide.overlay?.heading.animation ?? "slideUp"}
                  onChange={(e) =>
                    updateOverlay({
                      heading: {
                        ...slide.overlay?.heading,
                        text: slide.overlay?.heading.text ?? "",
                        fontSize: slide.overlay?.heading.fontSize ?? 56,
                        fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                        fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                        color: slide.overlay?.heading.color ?? "#ffffff",
                        animation: e.target.value as AnimationType,
                        animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                        animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                      },
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="fade">Fade</option>
                  <option value="slideUp">Slide Up</option>
                  <option value="slideDown">Slide Down</option>
                  <option value="slideLeft">Slide Left</option>
                  <option value="slideRight">Slide Right</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Duration (ms)</label>
                <input
                  type="number"
                  className="form-control"
                  value={slide.overlay?.heading.animationDuration ?? 800}
                  onChange={(e) =>
                    updateOverlay({
                      heading: {
                        ...slide.overlay?.heading,
                        text: slide.overlay?.heading.text ?? "",
                        fontSize: slide.overlay?.heading.fontSize ?? 56,
                        fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                        fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                        color: slide.overlay?.heading.color ?? "#ffffff",
                        animation: slide.overlay?.heading.animation ?? "slideUp",
                        animationDuration: parseInt(e.target.value),
                        animationDelay: slide.overlay?.heading.animationDelay ?? 200,
                      },
                    })
                  }
                  min="100"
                  max="3000"
                  step="100"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Delay (ms)</label>
                <input
                  type="number"
                  className="form-control"
                  value={slide.overlay?.heading.animationDelay ?? 200}
                  onChange={(e) =>
                    updateOverlay({
                      heading: {
                        ...slide.overlay?.heading,
                        text: slide.overlay?.heading.text ?? "",
                        fontSize: slide.overlay?.heading.fontSize ?? 56,
                        fontWeight: slide.overlay?.heading.fontWeight ?? 700,
                        fontFamily: slide.overlay?.heading.fontFamily ?? "inherit",
                        color: slide.overlay?.heading.color ?? "#ffffff",
                        animation: slide.overlay?.heading.animation ?? "slideUp",
                        animationDuration: slide.overlay?.heading.animationDuration ?? 800,
                        animationDelay: parseInt(e.target.value),
                      },
                    })
                  }
                  min="0"
                  max="3000"
                  step="100"
                />
              </div>
            </div>

            <hr />

            <h6 className="mb-3">Subheading (Optional)</h6>
            <div className="mb-3">
              <label className="form-label fw-semibold">Text</label>
              <input
                type="text"
                className="form-control"
                value={slide.overlay?.subheading?.text ?? ""}
                onChange={(e) =>
                  updateOverlay({
                    subheading: e.target.value
                      ? {
                          text: e.target.value,
                          fontSize: slide.overlay?.subheading?.fontSize ?? 24,
                          fontWeight: slide.overlay?.subheading?.fontWeight ?? 400,
                          fontFamily: slide.overlay?.subheading?.fontFamily ?? "inherit",
                          color: slide.overlay?.subheading?.color ?? "#ffffff",
                          animation: slide.overlay?.subheading?.animation ?? "slideUp",
                          animationDuration: slide.overlay?.subheading?.animationDuration ?? 800,
                          animationDelay: slide.overlay?.subheading?.animationDelay ?? 400,
                        }
                      : undefined,
                  })
                }
                placeholder="Fast, Reliable Fiber Internet"
              />
            </div>

            {slide.overlay?.subheading && (
              <>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Size (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay.subheading.fontSize}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            fontSize: parseInt(e.target.value),
                          },
                        })
                      }
                      min="12"
                      max="80"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Weight</label>
                    <select
                      className="form-select"
                      value={slide.overlay.subheading.fontWeight}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            fontWeight: parseInt(e.target.value),
                          },
                        })
                      }
                    >
                      <option value="100">Thin (100)</option>
                      <option value="200">Extra Light (200)</option>
                      <option value="300">Light (300)</option>
                      <option value="400">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra Bold (800)</option>
                      <option value="900">Black (900)</option>
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Font Family</label>
                    <input
                      type="text"
                      className="form-control"
                      value={slide.overlay.subheading.fontFamily}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            fontFamily: e.target.value,
                          },
                        })
                      }
                      placeholder="inherit"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Color</label>
                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      value={slide.overlay.subheading.color}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            color: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Animation</label>
                    <select
                      className="form-select"
                      value={slide.overlay.subheading.animation}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            animation: e.target.value as AnimationType,
                          },
                        })
                      }
                    >
                      <option value="none">None</option>
                      <option value="fade">Fade</option>
                      <option value="slideUp">Slide Up</option>
                      <option value="slideDown">Slide Down</option>
                      <option value="slideLeft">Slide Left</option>
                      <option value="slideRight">Slide Right</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Duration (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay.subheading.animationDuration}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            animationDuration: parseInt(e.target.value),
                          },
                        })
                      }
                      min="100"
                      max="3000"
                      step="100"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Delay (ms)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={slide.overlay.subheading.animationDelay}
                      onChange={(e) =>
                        updateOverlay({
                          subheading: {
                            ...slide.overlay?.subheading!,
                            animationDelay: parseInt(e.target.value),
                          },
                        })
                      }
                      min="0"
                      max="3000"
                      step="100"
                    />
                  </div>
                </div>
              </>
            )}

            <hr />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Buttons</h6>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() =>
                  updateOverlay({
                    buttons: [
                      ...(slide.overlay?.buttons ?? []),
                      {
                        text: "Get Started",
                        href: "#contact",
                        backgroundColor: "#2563eb",
                        textColor: "#ffffff",
                        variant: "filled",
                        animation: "slideUp",
                        animationDuration: 800,
                        animationDelay: 600,
                      },
                    ],
                  })
                }
              >
                <i className="bi bi-plus-lg me-1"></i>
                Add Button
              </button>
            </div>

            {slide.overlay?.buttons.map((button, index) => (
              <div key={index} className="card mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Button {index + 1}</strong>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() =>
                        updateOverlay({
                          buttons: slide.overlay?.buttons.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>

                  <div className="row mb-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Text</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={button.text}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = { ...button, text: e.target.value };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Link</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={button.href}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = { ...button, href: e.target.value };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                  </div>

                  <div className="row mb-2">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Variant</label>
                      <select
                        className="form-select form-select-sm"
                        value={button.variant}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            variant: e.target.value as "filled" | "outline" | "ghost",
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      >
                        <option value="filled">Filled</option>
                        <option value="outline">Outline</option>
                        <option value="ghost">Ghost</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Background</label>
                      <input
                        type="color"
                        className="form-control form-control-color form-control-sm w-100"
                        value={button.backgroundColor}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            backgroundColor: e.target.value,
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Text Color</label>
                      <input
                        type="color"
                        className="form-control form-control-color form-control-sm w-100"
                        value={button.textColor}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = { ...button, textColor: e.target.value };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Animation</label>
                      <select
                        className="form-select form-select-sm"
                        value={button.animation}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            animation: e.target.value as AnimationType,
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                      >
                        <option value="none">None</option>
                        <option value="fade">Fade</option>
                        <option value="slideUp">Slide Up</option>
                        <option value="slideDown">Slide Down</option>
                        <option value="slideLeft">Slide Left</option>
                        <option value="slideRight">Slide Right</option>
                        <option value="zoom">Zoom</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Duration (ms)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={button.animationDuration}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            animationDuration: parseInt(e.target.value),
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                        min="100"
                        max="3000"
                        step="100"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Delay (ms)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={button.animationDelay}
                        onChange={(e) => {
                          const updatedButtons = [...(slide.overlay?.buttons ?? [])];
                          updatedButtons[index] = {
                            ...button,
                            animationDelay: parseInt(e.target.value),
                          };
                          updateOverlay({ buttons: updatedButtons });
                        }}
                        min="0"
                        max="3000"
                        step="100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Position Tab */}
        {activeTab === "position" && (
          <div>
            <h6 className="mb-3">Overlay Position</h6>
            <div className="row mb-4">
              <div className="col-12">
                <div className="d-grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {[
                    "topLeft",
                    "topCenter",
                    "topRight",
                    "left",
                    "center",
                    "right",
                    "bottomLeft",
                    "bottomCenter",
                    "bottomRight",
                  ].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      className={`btn ${
                        slide.overlay?.position === pos
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() =>
                        updateOverlay({
                          position: pos as any,
                        })
                      }
                    >
                      {pos.replace(/([A-Z])/g, " $1").trim()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <hr />

            <h6 className="mb-3">
              <i className="bi bi-arrows-move me-2"></i>
              Overlay Offset
            </h6>
            <div className="alert alert-info small py-2 mb-3">
              <i className="bi bi-lightbulb me-1"></i>
              Push the entire text overlay away from the edges. Use <strong>Top</strong> to clear the navbar when text is positioned at the top.
            </div>

            <div className="row g-3 mb-3">
              {/* Top Offset */}
              <div className="col-12">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>⬆ Top Offset</span>
                  <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.overlayOffset?.top ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.top ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: parseInt(e.target.value),
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="0"
                    max="300"
                    step="5"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.top ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: parseInt(e.target.value) || 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="0"
                    max="300"
                  />
                </div>
              </div>

              {/* Bottom Offset */}
              <div className="col-12">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>⬇ Bottom Offset</span>
                  <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.overlayOffset?.bottom ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.bottom ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: parseInt(e.target.value),
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="0"
                    max="300"
                    step="5"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.bottom ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: parseInt(e.target.value) || 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="0"
                    max="300"
                  />
                </div>
              </div>

              {/* Left Offset */}
              <div className="col-6">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>⬅ Left</span>
                  <span className="badge rounded-pill text-secondary border border-secondary-subtle">{slide.overlay?.overlayOffset?.left ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.left ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: parseInt(e.target.value),
                        },
                      })
                    }
                    min="0"
                    max="300"
                    step="5"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.left ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: slide.overlay?.overlayOffset?.right ?? 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min="0"
                    max="300"
                  />
                </div>
              </div>

              {/* Right Offset */}
              <div className="col-6">
                <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                  <span>➡ Right</span>
                  <span className="badge rounded-pill text-secondary border border-secondary-subtle">{slide.overlay?.overlayOffset?.right ?? 0}px</span>
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    className="form-range flex-grow-1"
                    value={slide.overlay?.overlayOffset?.right ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: parseInt(e.target.value),
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="0"
                    max="300"
                    step="5"
                  />
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: "75px" }}
                    value={slide.overlay?.overlayOffset?.right ?? 0}
                    onChange={(e) =>
                      updateOverlay({
                        overlayOffset: {
                          top: slide.overlay?.overlayOffset?.top ?? 0,
                          right: parseInt(e.target.value) || 0,
                          bottom: slide.overlay?.overlayOffset?.bottom ?? 0,
                          left: slide.overlay?.overlayOffset?.left ?? 0,
                        },
                      })
                    }
                    min="0"
                    max="300"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets for Offset */}
            <div className="mb-3">
              <label className="form-label small"><strong>Quick Presets:</strong></label>
              <div className="btn-group btn-group-sm w-100" role="group">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 0, right: 0, bottom: 0, left: 0 },
                    })
                  }
                >
                  None
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 100, right: 20, bottom: 20, left: 20 },
                    })
                  }
                >
                  Clear Navbar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 40, right: 40, bottom: 40, left: 40 },
                    })
                  }
                >
                  Even Padding
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() =>
                    updateOverlay({
                      overlayOffset: { top: 60, right: 60, bottom: 60, left: 60 },
                    })
                  }
                >
                  Spacious
                </button>
              </div>
            </div>

            <hr />

            <h6 className="mb-3">Element Spacing</h6>
            <div className="mb-3">
              <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                <span>Heading ↔ Subheading</span>
                <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.spacing.betweenHeadingSubheading ?? 16}px</span>
              </label>
              <input
                type="range"
                className="form-range"
                value={slide.overlay?.spacing.betweenHeadingSubheading ?? 16}
                onChange={(e) =>
                  updateOverlay({
                    spacing: {
                      ...slide.overlay?.spacing,
                      betweenHeadingSubheading: parseInt(e.target.value),
                      betweenSubheadingButtons:
                        slide.overlay?.spacing.betweenSubheadingButtons ?? 32,
                      betweenButtons: slide.overlay?.spacing.betweenButtons ?? 16,
                    },
                  })
                }
                min="0"
                max="200"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                <span>Subheading ↔ Buttons</span>
                <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.spacing.betweenSubheadingButtons ?? 32}px</span>
              </label>
              <input
                type="range"
                className="form-range"
                value={slide.overlay?.spacing.betweenSubheadingButtons ?? 32}
                onChange={(e) =>
                  updateOverlay({
                    spacing: {
                      ...slide.overlay?.spacing,
                      betweenHeadingSubheading:
                        slide.overlay?.spacing.betweenHeadingSubheading ?? 16,
                      betweenSubheadingButtons: parseInt(e.target.value),
                      betweenButtons: slide.overlay?.spacing.betweenButtons ?? 16,
                    },
                  })
                }
                min="0"
                max="200"
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold d-flex justify-content-between align-items-center">
                <span>Between Buttons</span>
                <span className="badge rounded-pill text-primary border border-primary-subtle">{slide.overlay?.spacing.betweenButtons ?? 16}px</span>
              </label>
              <input
                type="range"
                className="form-range"
                value={slide.overlay?.spacing.betweenButtons ?? 16}
                onChange={(e) =>
                  updateOverlay({
                    spacing: {
                      ...slide.overlay?.spacing,
                      betweenHeadingSubheading:
                        slide.overlay?.spacing.betweenHeadingSubheading ?? 16,
                      betweenSubheadingButtons:
                        slide.overlay?.spacing.betweenSubheadingButtons ?? 32,
                      betweenButtons: parseInt(e.target.value),
                    },
                  })
                }
                min="0"
                max="200"
              />
            </div>

            <hr />

            <h6 className="mb-3">
              <i className="bi bi-eye me-2"></i>
              Live Preview
            </h6>
            <div className="card bg-light p-4 text-center">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Heading Preview */}
                <div
                  className="badge rounded-pill text-primary border border-primary-subtle"
                  style={{
                    fontSize: "14px",
                    padding: "8px 16px",
                    fontWeight: "600",
                  }}
                >
                  Heading
                </div>

                {/* Heading ↔ Subheading Spacing */}
                {slide.overlay?.subheading && (
                  <>
                    <div
                      style={{
                        height: `${slide.overlay.spacing.betweenHeadingSubheading}px`,
                        width: "2px",
                        backgroundColor: "#0d6efd",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "8px",
                          fontSize: "11px",
                          color: "#6c757d",
                          backgroundColor: "#f8f9fa",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {slide.overlay.spacing.betweenHeadingSubheading}px
                      </span>
                    </div>

                    {/* Subheading Preview */}
                    <div
                      className="badge rounded-pill text-secondary border border-secondary-subtle"
                      style={{
                        fontSize: "12px",
                        padding: "6px 12px",
                        fontWeight: "500",
                      }}
                    >
                      Subheading
                    </div>
                  </>
                )}

                {/* Subheading ↔ Buttons Spacing */}
                {slide.overlay?.buttons && slide.overlay.buttons.length > 0 && (
                  <>
                    <div
                      style={{
                        height: `${slide.overlay.spacing.betweenSubheadingButtons}px`,
                        width: "2px",
                        backgroundColor: "#0d6efd",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "8px",
                          fontSize: "11px",
                          color: "#6c757d",
                          backgroundColor: "#f8f9fa",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {slide.overlay.spacing.betweenSubheadingButtons}px
                      </span>
                    </div>

                    {/* Buttons Preview */}
                    <div style={{ display: "flex", gap: `${slide.overlay.spacing.betweenButtons}px`, alignItems: "center" }}>
                      {slide.overlay.buttons.map((_, index) => (
                        <div
                          key={index}
                          className="badge rounded-pill text-success border border-success-subtle"
                          style={{
                            fontSize: "11px",
                            padding: "6px 12px",
                            fontWeight: "500",
                          }}
                        >
                          Button {index + 1}
                        </div>
                      ))}
                      {slide.overlay.buttons.length > 1 && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#6c757d",
                            backgroundColor: "#f8f9fa",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {slide.overlay.spacing.betweenButtons}px gap
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
