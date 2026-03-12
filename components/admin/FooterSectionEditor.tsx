"use client";

import { useState, useEffect } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import type { FooterSection, FooterInfoPosition, BackgroundColor } from "@/types/section";
import { SOCIAL_PLATFORMS } from "@/types/section";
import ImageFieldWithUpload from "./ImageFieldWithUpload";
import { getPages } from "@/lib/page-manager";

interface FooterSectionEditorProps {
  section: FooterSection;
  onSave: (updates: Partial<FooterSection>, shouldClose?: boolean) => void;
  onCancel: () => void;
  availableSections?: Array<{ id: string; displayName: string; navLabel?: string }>;
}

const POSITION_OPTIONS: { value: FooterInfoPosition; label: string; icon: string }[] = [
  { value: "top-left", label: "Top Left", icon: "bi-arrow-up-left" },
  { value: "top-center", label: "Top Center", icon: "bi-arrow-up" },
  { value: "top-right", label: "Top Right", icon: "bi-arrow-up-right" },
  { value: "bottom-left", label: "Bottom Left", icon: "bi-arrow-down-left" },
  { value: "bottom-center", label: "Bottom Center", icon: "bi-arrow-down" },
  { value: "bottom-right", label: "Bottom Right", icon: "bi-arrow-down-right" },
];

export default function FooterSectionEditor({
  section,
  onSave,
  onCancel,
  availableSections = [],
}: FooterSectionEditorProps) {
  const [dynamicPages, setDynamicPages] = useState<Array<{ value: string; label: string }>>([]);
  const [featurePages, setFeaturePages] = useState<Array<{ value: string; label: string }>>([]);

  // Load dynamic pages and enabled feature pages
  useEffect(() => {
    const pages = getPages();
    setDynamicPages(
      pages
        .filter((p) => p.enabled)
        .map((p) => ({ value: `/${p.slug}`, label: `Page: ${p.title}` }))
    );

    fetch("/api/features")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setFeaturePages(
            data.data
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((f: any) => f.enabled && f.slug)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((f: any) => ({ value: `/${f.slug}`, label: `Feature: ${f.name}` }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Build dropdown options dynamically from available sections + dynamic pages + feature pages
  const AVAILABLE_PAGES = [
    { value: "/", label: "Home" },
    ...availableSections.map((sec) => ({
      value: `#${sec.id}`,
      label: `Home: ${sec.navLabel || sec.displayName}`,
    })),
    ...dynamicPages,
    ...featurePages,
    { value: "custom", label: "Custom URL (External)" },
  ];
  const [formData, setFormData] = useState({
    displayName: section.displayName || "Footer Section",
    logo: section.content.logo || "",
    logoPosition: section.content.logoPosition || ("top-left" as FooterInfoPosition),
    tagline: section.content.tagline || "",
    companyInfo: section.content.companyInfo || {
      name: "",
      address: "",
      phone: "",
      email: "",
      position: "top-left" as FooterInfoPosition,
    },
    columns: section.content.columns || [],
    copyright: section.content.copyright || "",
    socialLinks: section.content.socialLinks || [],
    certificationLogos: section.content.certificationLogos || [],
    background: section.background || "gray",
    backgroundImage: section.content.backgroundImage || "",
    gradient: section.content.gradient || {
      enabled: false,
      type: "preset" as "preset" | "custom",
      preset: {
        direction: "bottom" as const,
        startOpacity: 70,
        endOpacity: 0,
        color: "#000000",
      },
    },
    paddingTop: section.paddingTop || 80,
    paddingBottom: section.paddingBottom || 40,
  });

  const buildUpdates = (): Partial<FooterSection> => {
    const hasCompanyInfo =
      formData.companyInfo.name ||
      formData.companyInfo.address ||
      formData.companyInfo.phone ||
      formData.companyInfo.email;

    return {
      displayName: formData.displayName,
      background: formData.background,
      paddingTop: formData.paddingTop,
      paddingBottom: formData.paddingBottom,
      content: {
        logo: formData.logo || undefined,
        logoPosition: formData.logoPosition,
        tagline: formData.tagline || undefined,
        companyInfo: hasCompanyInfo ? formData.companyInfo : undefined,
        columns: formData.columns,
        copyright: formData.copyright || undefined,
        socialLinks: formData.socialLinks,
        certificationLogos: formData.certificationLogos,
        backgroundImage: formData.backgroundImage || undefined,
        gradient: formData.gradient.enabled ? formData.gradient : undefined,
      },
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(buildUpdates(), true); // Pass true to close modal
  };

  const handleSave = () => {
    onSave(buildUpdates(), false); // Pass false to keep modal open
  };

  useAutoSave(handleSave);

  // Company info helpers
  const updateCompanyInfo = (updates: Partial<typeof formData.companyInfo>) => {
    setFormData({
      ...formData,
      companyInfo: { ...formData.companyInfo, ...updates },
    });
  };

  // Column management
  const addColumn = () => {
    setFormData({
      ...formData,
      columns: [
        ...formData.columns,
        {
          id: `col-${Date.now()}`,
          title: "New Column",
          links: [],
        },
      ],
    });
  };

  const removeColumn = (id: string) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((col) => col.id !== id),
    });
  };

  const updateColumn = (id: string, updates: Partial<(typeof formData.columns)[0]>) => {
    setFormData({
      ...formData,
      columns: formData.columns.map((col) =>
        col.id === id ? { ...col, ...updates } : col
      ),
    });
  };

  // Link management
  const addLink = (columnId: string) => {
    setFormData({
      ...formData,
      columns: formData.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              links: [...col.links, { text: "New Link", href: "#" }],
            }
          : col
      ),
    });
  };

  const removeLink = (columnId: string, linkIndex: number) => {
    setFormData({
      ...formData,
      columns: formData.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              links: col.links.filter((_, i) => i !== linkIndex),
            }
          : col
      ),
    });
  };

  const updateLink = (
    columnId: string,
    linkIndex: number,
    updates: Partial<{ text: string; href: string }>
  ) => {
    setFormData({
      ...formData,
      columns: formData.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              links: col.links.map((link, i) =>
                i === linkIndex ? { ...link, ...updates } : link
              ),
            }
          : col
      ),
    });
  };

  // Social links management
  const addSocialLink = () => {
    setFormData({
      ...formData,
      socialLinks: [
        ...formData.socialLinks,
        { platform: "facebook", url: "", icon: "bi-facebook" },
      ],
    });
  };

  const removeSocialLink = (index: number) => {
    setFormData({
      ...formData,
      socialLinks: formData.socialLinks.filter((_, i) => i !== index),
    });
  };

  const updateSocialLink = (
    index: number,
    updates: Partial<(typeof formData.socialLinks)[0]>
  ) => {
    setFormData({
      ...formData,
      socialLinks: formData.socialLinks.map((link, i) =>
        i === index ? { ...link, ...updates } : link
      ),
    });
  };

  const handlePlatformChange = (index: number, platformValue: string) => {
    const found = SOCIAL_PLATFORMS.find((p) => p.value === platformValue);
    if (found) {
      updateSocialLink(index, {
        platform: found.value,
        icon: found.icon,
      });
    }
  };

  // Certification logo management
  const addCertificationLogo = () => {
    setFormData({
      ...formData,
      certificationLogos: [
        ...formData.certificationLogos,
        {
          id: `cert-${Date.now()}`,
          image: "",
          text: "",
          position: "bottom-left" as FooterInfoPosition,
        },
      ],
    });
  };

  const removeCertificationLogo = (id: string) => {
    setFormData({
      ...formData,
      certificationLogos: formData.certificationLogos.filter((cert) => cert.id !== id),
    });
  };

  const updateCertificationLogo = (
    id: string,
    updates: Partial<(typeof formData.certificationLogos)[0]>
  ) => {
    setFormData({
      ...formData,
      certificationLogos: formData.certificationLogos.map((cert) =>
        cert.id === id ? { ...cert, ...updates } : cert
      ),
    });
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1115 }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxHeight: "90vh", margin: "2rem auto" }}>
        <div className="modal-content" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-layout-text-window-reverse me-2"></i>
              Edit Footer Section
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
              {/* Display Name */}
              <div className="mb-4">
                <label className="form-label fw-semibold">Section Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                />
              </div>

              <hr />

              {/* Branding: Logo & Tagline */}
              <h6 className="mb-3">
                <i className="bi bi-badge-tm me-2"></i>
                Branding
              </h6>

              <div className="row mb-3">
                <div className="col-md-6">
                  <ImageFieldWithUpload
                    label="Logo (Optional)"
                    value={formData.logo}
                    onChange={(url) =>
                      setFormData({ ...formData, logo: url })
                    }
                    placeholder="/images/logo.png"
                    helpText="Upload your brand logo for the footer"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.tagline}
                    onChange={(e) =>
                      setFormData({ ...formData, tagline: e.target.value })
                    }
                    placeholder="Fast, reliable internet"
                  />
                </div>
              </div>

              {/* Logo Position */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Logo & Tagline Position
                </label>
                <p className="text-muted small mb-2">
                  Choose where the logo and tagline appear in the footer
                </p>
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  {POSITION_OPTIONS.map((pos) => (
                    <button
                      key={pos.value}
                      type="button"
                      className={`btn btn-sm ${
                        formData.logoPosition === pos.value
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => setFormData({ ...formData, logoPosition: pos.value })}
                    >
                      <i className={`bi ${pos.icon} me-1`}></i>
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr />

              {/* Background Options */}
              <h6 className="mb-3">
                <i className="bi bi-image me-2"></i>
                Background Options
              </h6>

              {/* Custom Background Image */}
              <div className="mb-4">
                <ImageFieldWithUpload
                  label="Background Image (Optional)"
                  value={formData.backgroundImage}
                  onChange={(url) => setFormData({ ...formData, backgroundImage: url })}
                  placeholder="/images/footer-bg.jpg"
                  helpText="Recommended: 1920x400px for full-width footer background"
                  previewMaxHeight="100px"
                />
              </div>

              {/* Gradient Overlay */}
              <div className="mb-4">
                <div className="form-check form-switch mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="gradient-enabled"
                    checked={formData.gradient.enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gradient: { ...formData.gradient, enabled: e.target.checked },
                      })
                    }
                  />
                  <label className="form-check-label fw-semibold" htmlFor="gradient-enabled">
                    Enable Gradient Overlay
                  </label>
                </div>

                {formData.gradient.enabled && (
                  <>
                    {/* Gradient Type */}
                    <div className="btn-group w-100 mb-3" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        id="gradient-preset"
                        checked={formData.gradient.type === "preset"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            gradient: { ...formData.gradient, type: "preset" },
                          })
                        }
                      />
                      <label className="btn btn-outline-primary" htmlFor="gradient-preset">
                        <i className="bi bi-stars me-1"></i>
                        Preset Gradient
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        id="gradient-custom"
                        checked={formData.gradient.type === "custom"}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            gradient: { ...formData.gradient, type: "custom" },
                          })
                        }
                      />
                      <label className="btn btn-outline-primary" htmlFor="gradient-custom">
                        <i className="bi bi-image me-1"></i>
                        Custom Image
                      </label>
                    </div>

                    {/* Preset Gradient Controls */}
                    {formData.gradient.type === "preset" && (
                      <>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Direction</label>
                          <select
                            className="form-select"
                            value={formData.gradient.preset?.direction || "bottom"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gradient: {
                                  ...formData.gradient,
                                  preset: {
                                    ...formData.gradient.preset,
                                    direction: e.target.value as any,
                                    startOpacity: formData.gradient.preset?.startOpacity || 70,
                                    endOpacity: formData.gradient.preset?.endOpacity || 0,
                                    color: formData.gradient.preset?.color || "#000000",
                                  },
                                },
                              })
                            }
                          >
                            <option value="top">From Top</option>
                            <option value="bottom">From Bottom</option>
                            <option value="left">From Left</option>
                            <option value="right">From Right</option>
                          </select>
                        </div>

                        <div className="row mb-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">Start Opacity (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={formData.gradient.preset?.startOpacity || 70}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  gradient: {
                                    ...formData.gradient,
                                    preset: {
                                      ...formData.gradient.preset,
                                      direction: formData.gradient.preset?.direction || "bottom",
                                      startOpacity: parseInt(e.target.value),
                                      endOpacity: formData.gradient.preset?.endOpacity || 0,
                                      color: formData.gradient.preset?.color || "#000000",
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">End Opacity (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={formData.gradient.preset?.endOpacity || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  gradient: {
                                    ...formData.gradient,
                                    preset: {
                                      ...formData.gradient.preset,
                                      direction: formData.gradient.preset?.direction || "bottom",
                                      startOpacity: formData.gradient.preset?.startOpacity || 70,
                                      endOpacity: parseInt(e.target.value),
                                      color: formData.gradient.preset?.color || "#000000",
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold">Gradient Color</label>
                          <input
                            type="color"
                            className="form-control form-control-color w-100"
                            value={formData.gradient.preset?.color || "#000000"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gradient: {
                                  ...formData.gradient,
                                  preset: {
                                    ...formData.gradient.preset,
                                    direction: formData.gradient.preset?.direction || "bottom",
                                    startOpacity: formData.gradient.preset?.startOpacity || 70,
                                    endOpacity: formData.gradient.preset?.endOpacity || 0,
                                    color: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </div>
                      </>
                    )}

                    {/* Custom Gradient Image */}
                    {formData.gradient.type === "custom" && (
                      <div className="mb-3">
                        <ImageFieldWithUpload
                          label="Custom Gradient Image"
                          value={formData.gradient.custom?.src || ""}
                          onChange={(url) =>
                            setFormData({
                              ...formData,
                              gradient: {
                                ...formData.gradient,
                                custom: { src: url },
                              },
                            })
                          }
                          placeholder="/images/gradient-overlay.png"
                          helpText="Upload a transparent PNG gradient for custom overlay effects"
                          previewMaxHeight="80px"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <hr />

              {/* Company Details */}
              <h6 className="mb-3">
                <i className="bi bi-building me-2"></i>
                Company Details (Optional)
              </h6>

              <div className="row mb-3">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.companyInfo.name}
                    onChange={(e) => updateCompanyInfo({ name: e.target.value })}
                    placeholder="Your Company"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-envelope"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.companyInfo.email}
                      onChange={(e) => updateCompanyInfo({ email: e.target.value })}
                      placeholder="info@yourcompany.co.za"
                    />
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Phone</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-telephone"></i>
                    </span>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.companyInfo.phone}
                      onChange={(e) => updateCompanyInfo({ phone: e.target.value })}
                      placeholder="+27 28 123 4567"
                    />
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Address</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-geo-alt"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.companyInfo.address}
                      onChange={(e) => updateCompanyInfo({ address: e.target.value })}
                      placeholder="123 Main Road, Your City"
                    />
                  </div>
                </div>
              </div>

              {/* Layout Position */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Company Info Position
                </label>
                <p className="text-muted small mb-2">
                  Choose where the company details block appears in the footer
                </p>
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  {POSITION_OPTIONS.map((pos) => (
                    <button
                      key={pos.value}
                      type="button"
                      className={`btn btn-sm ${
                        formData.companyInfo.position === pos.value
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() => updateCompanyInfo({ position: pos.value })}
                    >
                      <i className={`bi ${pos.icon} me-1`}></i>
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr />

              {/* Footer Columns */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  <i className="bi bi-grid-3x3 me-2"></i>
                  Footer Columns
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={addColumn}
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  Add Column
                </button>
              </div>

              {formData.columns.length === 0 ? (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  No columns yet. Click &quot;Add Column&quot; to create link groups.
                </div>
              ) : (
                <div className="row g-3 mb-4">
                  {formData.columns.map((column) => (
                    <div key={column.id} className="col-md-4 d-flex">
                      <div className="card flex-fill">
                        <div className="card-body d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <input
                              type="text"
                              className="form-control form-control-sm fw-semibold"
                              value={column.title}
                              onChange={(e) =>
                                updateColumn(column.id, { title: e.target.value })
                              }
                              placeholder="Column Title"
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger ms-2"
                              onClick={() => removeColumn(column.id)}
                              title="Remove Column"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>

                          {/* Links */}
                          <div className="mb-2 flex-grow-1">
                            {column.links.map((link, linkIndex) => {
                              // Check if this link is using a custom URL (not in predefined pages)
                              const isCustomUrl =
                                !AVAILABLE_PAGES.some(p => p.value === link.href && p.value !== "custom");
                              const selectValue = isCustomUrl ? "custom" : link.href;

                              return (
                                <div key={linkIndex} className="mb-3">
                                  <div className="input-group input-group-sm mb-1">
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={link.text}
                                      onChange={(e) =>
                                        updateLink(column.id, linkIndex, {
                                          text: e.target.value,
                                        })
                                      }
                                      placeholder="Link Text"
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() => removeLink(column.id, linkIndex)}
                                      title="Remove Link"
                                    >
                                      <i className="bi bi-x"></i>
                                    </button>
                                  </div>

                                  <div className="mb-1">
                                    <select
                                      className="form-select form-select-sm"
                                      value={selectValue}
                                      onChange={(e) => {
                                        if (e.target.value === "custom") {
                                          // Switch to custom mode, keep current href if it's already custom
                                          if (!isCustomUrl) {
                                            updateLink(column.id, linkIndex, { href: "" });
                                          }
                                        } else {
                                          // Use selected page URL
                                          updateLink(column.id, linkIndex, { href: e.target.value });
                                        }
                                      }}
                                    >
                                      <option value="">Select page...</option>
                                      {AVAILABLE_PAGES.map((page) => (
                                        <option key={page.value} value={page.value}>
                                          {page.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {selectValue === "custom" && (
                                    <div>
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={link.href}
                                        onChange={(e) =>
                                          updateLink(column.id, linkIndex, {
                                            href: e.target.value,
                                          })
                                        }
                                        placeholder="https://example.com or /custom-page"
                                      />
                                      <small className="form-text text-muted">
                                        Enter full URL for external links or page path
                                      </small>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary w-100"
                            onClick={() => addLink(column.id)}
                          >
                            <i className="bi bi-plus me-1"></i>
                            Add Link
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <hr />

              {/* Social Links - Card-based UI */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  <i className="bi bi-share me-2"></i>
                  Social Media Links (Optional)
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={addSocialLink}
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  Add Social Link
                </button>
              </div>

              {formData.socialLinks.length === 0 ? (
                <div className="alert alert-info mb-4">
                  <i className="bi bi-info-circle me-2"></i>
                  No social links yet. Click &quot;Add Social Link&quot; to add your social media profiles.
                </div>
              ) : (
                <div className="row g-3 mb-4">
                  {formData.socialLinks.map((social, index) => (
                    <div key={index} className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="d-flex align-items-center justify-content-center rounded"
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  backgroundColor: "#f0f0f0",
                                  fontSize: "1.25rem",
                                }}
                              >
                                <i className={`bi ${social.icon || "bi-link-45deg"}`}></i>
                              </div>
                              <span className="fw-semibold small">
                                {SOCIAL_PLATFORMS.find((p) => p.value === social.platform)?.label ||
                                  social.platform}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeSocialLink(index)}
                              title="Remove"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>

                          <div className="mb-2">
                            <label className="form-label small text-muted mb-1">Platform</label>
                            <select
                              className="form-select form-select-sm"
                              value={social.platform}
                              onChange={(e) => handlePlatformChange(index, e.target.value)}
                            >
                              {SOCIAL_PLATFORMS.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label small text-muted mb-1">Profile URL (Optional)</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={social.url}
                              onChange={(e) =>
                                updateSocialLink(index, { url: e.target.value })
                              }
                              placeholder="https://facebook.com/yourpage"
                            />
                            <small className="form-text text-muted">
                              Leave empty to hide this social link
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <hr />

              {/* Certification / Partner Logos */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  <i className="bi bi-award me-2"></i>
                  Certification & Partner Logos (Optional)
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={addCertificationLogo}
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  Add Logo
                </button>
              </div>

              {formData.certificationLogos.length === 0 ? (
                <div className="alert alert-info mb-4">
                  <i className="bi bi-info-circle me-2"></i>
                  No certification logos yet. Click &quot;Add Logo&quot; to add logos like Regulatory, partner badges, or certifications.
                </div>
              ) : (
                <div className="row g-3 mb-4">
                  {formData.certificationLogos.map((cert) => (
                    <div key={cert.id} className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fw-semibold small">Certification Logo</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeCertificationLogo(cert.id)}
                              title="Remove"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>

                          <div className="mb-3">
                            <ImageFieldWithUpload
                              label="Logo Image"
                              value={cert.image}
                              onChange={(url) =>
                                updateCertificationLogo(cert.id, { image: url })
                              }
                              placeholder="/images/regulatory-badge.png"
                              helpText="Upload certification or partner logo"
                            />
                          </div>

                          <div className="mb-3">
                            <label className="form-label small text-muted mb-1">
                              Description / License Number
                            </label>
                            <textarea
                              className="form-control form-control-sm"
                              value={cert.text}
                              onChange={(e) =>
                                updateCertificationLogo(cert.id, { text: e.target.value })
                              }
                              placeholder="Regulatory Licensed ISP&#10;License: 123456"
                              rows={2}
                            />
                            <small className="form-text text-muted">
                              Text displayed below the logo (e.g., license number)
                            </small>
                          </div>

                          <div>
                            <label className="form-label small text-muted mb-1">Position</label>
                            <div className="d-flex flex-wrap gap-1">
                              {POSITION_OPTIONS.map((pos) => (
                                <button
                                  key={pos.value}
                                  type="button"
                                  className={`btn btn-sm ${
                                    cert.position === pos.value
                                      ? "btn-primary"
                                      : "btn-outline-secondary"
                                  }`}
                                  onClick={() =>
                                    updateCertificationLogo(cert.id, { position: pos.value })
                                  }
                                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                >
                                  <i className={`bi ${pos.icon}`}></i>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <hr />

              {/* Copyright */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Copyright Text (Optional)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.copyright}
                  onChange={(e) =>
                    setFormData({ ...formData, copyright: e.target.value })
                  }
                  placeholder="&copy; 2026 Your Company. All rights reserved."
                />
              </div>

              <hr />

              {/* Styling & Spacing */}
              <h6 className="mb-3">
                <i className="bi bi-palette me-2"></i>
                Styling & Spacing
              </h6>

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">Background</label>
                  <select
                    className="form-select"
                    value={formData.background}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        background: e.target.value as BackgroundColor,
                      })
                    }
                  >
                    <option value="white">White</option>
                    <option value="gray">Gray (Default)</option>
                    <option value="blue">Dark Blue</option>
                    <option value="lightblue">Light Blue</option>
                    <option value="transparent">Transparent</option>
                  </select>
                  {/* Background preview swatch */}
                  <div
                    className="mt-2 rounded border"
                    style={{
                      height: "24px",
                      backgroundColor:
                        formData.background === "gray"
                          ? "#f8f9fa"
                          : formData.background === "blue"
                          ? "#1e3a5f"
                          : formData.background === "lightblue"
                          ? "#e8f4fd"
                          : formData.background === "transparent"
                          ? "transparent"
                          : "#ffffff",
                    }}
                  ></div>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-arrows-expand me-1"></i>
                    Navbar Clearance (Padding Top)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    value={formData.paddingTop}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paddingTop: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    max="200"
                    placeholder="80"
                  />
                  <small className="form-text text-muted">
                    <strong>Recommended: 80-100px</strong> to prevent content from going behind navbar when scrolling into view
                  </small>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">
                    Padding Bottom (px)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.paddingBottom}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paddingBottom: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    max="200"
                    placeholder="40"
                  />
                  <small className="form-text text-muted">
                    Space at bottom of footer
                  </small>
                </div>
              </div>
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
                className="btn btn-success me-2"
                onClick={handleSave}
              >
                <i className="bi bi-floppy me-1"></i>
                Save
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-floppy-fill me-1"></i>
                Save & Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
