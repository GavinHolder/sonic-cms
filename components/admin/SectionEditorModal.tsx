"use client";

import { useState, useEffect } from "react";
import type {
  SectionConfig,
  HeroCarouselSection,
  TextImageSection,
  StatsGridSection,
  CardGridSection,
  BannerSection,
  TableSection,
  CTAFooterSection,
  FlexibleSection,
  BackgroundColor,
} from "@/types/section";
import FlexibleSectionEditor from "./FlexibleSectionEditor";
import ImageFieldWithUpload from "./ImageFieldWithUpload";
import { LinkPicker } from "@/components/admin/LinkPicker";

interface SectionEditorModalProps {
  section: SectionConfig | null;
  onSave: (section: SectionConfig) => void;
  onClose: () => void;
  /** Force new section mode even if section is provided (for visual editor returns) */
  forceNewMode?: boolean;
}

// Default section templates for new sections
const defaultSections: Record<string, SectionConfig> = {
  "hero-carousel": {
    id: "",
    type: "hero-carousel",
    enabled: true,
    order: 99,
    background: "white",
    items: [],
    autoPlayInterval: 5000,
    showDots: true,
  } as any,
  "text-image": {
    id: "",
    type: "text-image",
    enabled: true,
    order: 99,
    background: "white",
    heading: "New Section",
    content: "<p>Enter your content here.</p>",
    imageSrc: "/images/placeholder.jpg",
    imageAlt: "Section image",
    layout: "right",
    buttons: [],
  } as any,
  "stats-grid": {
    id: "",
    type: "stats-grid",
    enabled: true,
    order: 99,
    background: "gray",
    heading: "Our Statistics",
    subheading: "See what we've accomplished",
    columns: 4,
    stats: [],
  } as any,
  "card-grid": {
    id: "",
    type: "card-grid",
    enabled: true,
    order: 99,
    background: "white",
    heading: "Our Services",
    subheading: "What we offer",
    columns: 3,
    cards: [],
  } as any,
  banner: {
    id: "",
    type: "banner",
    enabled: true,
    order: 99,
    background: "transparent",
    content: "Your announcement here",
    variant: "info",
    dismissible: true,
  } as any,
  table: {
    id: "",
    type: "table",
    enabled: true,
    order: 99,
    background: "white",
    heading: "Data Table",
    subheading: "",
    headers: ["Column 1", "Column 2", "Column 3"],
    rows: [],
    striped: true,
    bordered: true,
    hover: true,
  } as any,
  "cta-footer": {
    id: "",
    type: "cta-footer",
    enabled: true,
    order: 999,
    background: "blue",
    heading: "Ready to Get Started?",
    subheading: "Join us today",
    buttons: [
      { text: "Get Started", href: "/contact", variant: "primary" },
      { text: "Learn More", href: "/about", variant: "outline" },
    ],
    contactInfo: {
      phone: "",
      email: "",
      address: "",
    },
    socialLinks: [],
  } as any,
  flexible: {
    id: "",
    type: "flexible",
    enabled: true,
    order: 99,
    background: "white",
    displayName: "Flexible Section",
    paddingTop: 100,
    paddingBottom: 80,
    content: {
      contentMode: "single",
      layout: { type: "preset", preset: "2-col-split" },
      elements: [],
    },
  } as unknown as FlexibleSection,
};

export default function SectionEditorModal({
  section,
  onSave,
  onClose,
  forceNewMode = false,
}: SectionEditorModalProps) {
  // Treat as new section if no section provided, OR if forceNewMode is true
  const isNewSection = section === null || forceNewMode;
  const [selectedType, setSelectedType] = useState<string>(
    section?.type || "text-image"
  );
  const [editedSection, setEditedSection] = useState<SectionConfig>(() => {
    if (section) {
      // Use provided section data (could be from visual editor or editing existing)
      return JSON.parse(JSON.stringify(section));
    }
    // Create a new section from template
    const template = defaultSections["text-image"];
    return {
      ...template,
      id: `section-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = () => {
    onSave(editedSection);
  };

  const renderEditor = () => {
    switch (editedSection.type as string) {
      case "hero-carousel":
        return (
          <HeroCarouselEditor
            section={editedSection as any}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      case "text-image":
        return (
          <TextImageEditor
            section={editedSection as any}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      case "stats-grid":
        return (
          <StatsGridEditor
            section={editedSection as any}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      case "card-grid":
        return (
          <CardGridEditor
            section={editedSection as any}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      case "banner":
        return (
          <BannerEditor
            section={editedSection as any}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      case "table":
        return (
          <TableEditor
            section={editedSection as any}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      case "flexible":
      case "FLEXIBLE":
        return (
          <FlexibleSectionEditor
            section={editedSection as FlexibleSection}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      case "cta-footer":
        return (
          <CTAFooterEditor
            section={editedSection as any}
            onChange={(updated: any) => setEditedSection(updated)}
          />
        );
      default:
        return <p className="text-muted">Unknown section type</p>;
    }
  };

  const getSectionTypeName = () => {
    switch (editedSection.type as string) {
      case "hero-carousel":
        return "Hero Carousel";
      case "text-image":
        return "Text & Image Section";
      case "stats-grid":
        return "Statistics Grid";
      case "card-grid":
        return "Card Grid";
      case "banner":
        return "Banner";
      case "table":
        return "Table";
      case "flexible":
      case "FLEXIBLE":
        return "Flexible Section";
      case "cta-footer":
        return "CTA Footer";
      default:
        return "Section";
    }
  };

  // Handle section type change for new sections
  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    const template = defaultSections[newType];
    setEditedSection({
      ...template,
      id: `section-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    });
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi ${isNewSection ? "bi-plus-circle" : "bi-pencil-square"} me-2`}></i>
              {isNewSection ? "Add New Section" : `Edit ${getSectionTypeName()}`}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {/* Section Type Selector for New Sections */}
            {isNewSection && (
              <div className="card mb-4 border-primary">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-collection me-2"></i>
                    Choose Section Type
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    {Object.entries({
                      flexible: { icon: "bi-grid-1x2", label: "Flexible Section" },
                      "text-image": { icon: "bi-layout-text-window-reverse", label: "Text & Image" },
                      "stats-grid": { icon: "bi-bar-chart-fill", label: "Statistics Grid" },
                      "card-grid": { icon: "bi-grid-3x3-gap-fill", label: "Card Grid" },
                      banner: { icon: "bi-megaphone-fill", label: "Banner" },
                      table: { icon: "bi-table", label: "Table" },
                    }).map(([type, info]) => (
                      <div key={type} className="col-6 col-md-4 col-lg-2">
                        <button
                          type="button"
                          className={`btn w-100 ${
                            selectedType === type ? "btn-primary" : "btn-outline-secondary"
                          }`}
                          onClick={() => handleTypeChange(type)}
                        >
                          <i className={`bi ${info.icon} d-block fs-4 mb-1`}></i>
                          <small>{info.label}</small>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common Section Settings */}
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0">
                  <i className="bi bi-gear me-2"></i>
                  Section Settings
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Section ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editedSection.id}
                      disabled
                    />
                    <div className="form-text">Unique identifier (auto-generated)</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Display Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editedSection.order}
                      onChange={(e) =>
                        setEditedSection({
                          ...editedSection,
                          order: parseInt(e.target.value) || 1,
                        })
                      }
                      min={1}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Background Color</label>
                    <select
                      className="form-select"
                      value={editedSection.background || "white"}
                      onChange={(e) =>
                        setEditedSection({
                          ...editedSection,
                          background: e.target.value as BackgroundColor,
                        })
                      }
                    >
                      <option value="white">White</option>
                      <option value="gray">Gray</option>
                      <option value="blue">Blue (subtle)</option>
                      <option value="lightblue">Light Blue</option>
                      <option value="transparent">Transparent</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Visibility</label>
                    <div className="form-check form-switch mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="enabledSwitch"
                        checked={editedSection.enabled}
                        onChange={(e) =>
                          setEditedSection({
                            ...editedSection,
                            enabled: e.target.checked,
                          })
                        }
                      />
                      <label className="form-check-label" htmlFor="enabledSwitch">
                        {editedSection.enabled ? "Visible on page" : "Hidden from page"}
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Top Spacing (px)
                      <i className="bi bi-info-circle ms-1 text-muted" title="Space above section content"></i>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={editedSection.paddingTop ?? 0}
                      onChange={(e) =>
                        setEditedSection({
                          ...editedSection,
                          paddingTop: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
                      max={200}
                      placeholder="0"
                    />
                    <div className="form-text">0-200px (0 = default spacing)</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Bottom Spacing (px)
                      <i className="bi bi-info-circle ms-1 text-muted" title="Space below section content"></i>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={editedSection.paddingBottom ?? 0}
                      onChange={(e) =>
                        setEditedSection({
                          ...editedSection,
                          paddingBottom: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
                      max={200}
                      placeholder="0"
                    />
                    <div className="form-text">0-200px (0 = default spacing)</div>
                  </div>
                  {/* Snap threshold is controlled globally via Admin > Settings page */}
                </div>
              </div>
            </div>

            {/* Section-specific Editor */}
            {renderEditor()}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <i className={`bi ${isNewSection ? "bi-plus-lg" : "bi-check-lg"} me-1`}></i>
              {isNewSection ? "Add Section" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hero Carousel Editor
function HeroCarouselEditor({
  section,
  onChange,
}: {
  section: any;
  onChange: (section: any) => void;
}) {
  const updateItem = (index: number, updates: Partial<any>) => {
    const newItems = [...section.items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange({ ...section, items: newItems });
  };

  const updateOverlay = (
    index: number,
    updates: Partial<any>
  ) => {
    const newItems = [...section.items];
    newItems[index] = {
      ...newItems[index],
      overlay: { ...newItems[index].overlay, ...updates } as any,
    };
    onChange({ ...section, items: newItems });
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">
          <i className="bi bi-collection-play me-2"></i>
          Carousel Slides ({section.items.length})
        </h6>
      </div>
      <div className="card-body">
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label">Auto-Play Interval (ms)</label>
            <input
              type="number"
              className="form-control"
              value={section.autoPlayInterval || 5000}
              onChange={(e) =>
                onChange({ ...section, autoPlayInterval: parseInt(e.target.value) || 5000 })
              }
              min={1000}
              step={500}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Show Dot Indicators</label>
            <div className="form-check form-switch mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={section.showDots !== false}
                onChange={(e) => onChange({ ...section, showDots: e.target.checked })}
              />
              <label className="form-check-label">
                {section.showDots !== false ? "Visible" : "Hidden"}
              </label>
            </div>
          </div>
        </div>

        {section.items.map((item: any, index: number) => (
          <div key={item.id} className="card mb-3">
            <div className="card-header bg-light">
              <strong>Slide {index + 1}</strong>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <ImageFieldWithUpload
                    label="Image Source"
                    value={item.src}
                    onChange={(url) => updateItem(index, { src: url })}
                    placeholder="/images/example.jpg"
                    acceptedTypes="image/*,video/*"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Alt Text</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.alt || ""}
                    onChange={(e) => updateItem(index, { alt: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <hr />
                  <strong>Overlay Content</strong>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Heading</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.overlay?.heading || ""}
                    onChange={(e) => updateOverlay(index, { heading: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Subheading</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.overlay?.subheading || ""}
                    onChange={(e) => updateOverlay(index, { subheading: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Button Text</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.overlay?.button?.text || ""}
                    onChange={(e) =>
                      updateOverlay(index, {
                        button: { ...item.overlay?.button, text: e.target.value } as any,
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Button Link</label>
                  <LinkPicker
                    value={item.overlay?.button?.href || ""}
                    onChange={(val) =>
                      updateOverlay(index, {
                        button: { ...item.overlay?.button, href: val } as any,
                      })
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Animation</label>
                  <select
                    className="form-select"
                    value={item.overlay?.animation || "fade-in"}
                    onChange={(e) => updateOverlay(index, { animation: e.target.value as any })}
                  >
                    <option value="fade-in">Fade In</option>
                    <option value="slide-up">Slide Up</option>
                    <option value="slide-down">Slide Down</option>
                    <option value="slide-left">Slide Left</option>
                    <option value="slide-right">Slide Right</option>
                    <option value="zoom-in">Zoom In</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Text Image Editor
function TextImageEditor({
  section,
  onChange,
}: {
  section: any;
  onChange: (section: any) => void;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="bi bi-layout-text-window-reverse me-2"></i>
          Text & Image Content
        </h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Heading</label>
            <input
              type="text"
              className="form-control"
              value={section.heading}
              onChange={(e) => onChange({ ...section, heading: e.target.value })}
            />
          </div>
          <div className="col-12">
            <label className="form-label">Content (HTML supported)</label>
            <textarea
              className="form-control font-monospace"
              rows={10}
              value={section.content}
              onChange={(e) => onChange({ ...section, content: e.target.value })}
            />
            <div className="form-text">
              You can use HTML tags for formatting (p, h4, h5, ul, li, strong, etc.)
            </div>
          </div>
          <div className="col-md-6">
            <ImageFieldWithUpload
              label="Image Source"
              value={section.imageSrc}
              onChange={(url) => onChange({ ...section, imageSrc: url })}
              placeholder="/images/example.jpg"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Image Alt Text</label>
            <input
              type="text"
              className="form-control"
              value={section.imageAlt}
              onChange={(e) => onChange({ ...section, imageAlt: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Image Position</label>
            <select
              className="form-select"
              value={section.layout}
              onChange={(e) => onChange({ ...section, layout: e.target.value as "left" | "right" })}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="col-12">
            <hr />
            <strong>Buttons</strong>
          </div>
          {section.buttons?.map((button: any, index: number) => (
            <div key={index} className="col-12">
              <div className="row g-2">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    value={button.text}
                    onChange={(e) => {
                      const newButtons = [...(section.buttons || [])];
                      newButtons[index] = { ...newButtons[index], text: e.target.value };
                      onChange({ ...section, buttons: newButtons });
                    }}
                    placeholder="Button text"
                  />
                </div>
                <div className="col-md-4">
                  <LinkPicker
                    value={button.href}
                    onChange={(val) => {
                      const newButtons = [...(section.buttons || [])];
                      newButtons[index] = { ...newButtons[index], href: val };
                      onChange({ ...section, buttons: newButtons });
                    }}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={button.variant || "primary"}
                    onChange={(e) => {
                      const newButtons = [...(section.buttons || [])];
                      newButtons[index] = {
                        ...newButtons[index],
                        variant: e.target.value as "primary" | "secondary" | "outline",
                      };
                      onChange({ ...section, buttons: newButtons });
                    }}
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>
                <div className="col-md-1">
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100"
                    onClick={() => {
                      const newButtons = section.buttons?.filter((_: any, i: number) => i !== index) || [];
                      onChange({ ...section, buttons: newButtons });
                    }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="col-12">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                const newButtons = [
                  ...(section.buttons || []),
                  { text: "New Button", href: "/", variant: "primary" as const },
                ];
                onChange({ ...section, buttons: newButtons });
              }}
            >
              <i className="bi bi-plus me-1"></i>
              Add Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Grid Editor
function StatsGridEditor({
  section,
  onChange,
}: {
  section: any;
  onChange: (section: any) => void;
}) {
  const updateStat = (index: number, updates: Partial<any>) => {
    const newStats = [...section.stats];
    newStats[index] = { ...newStats[index], ...updates };
    onChange({ ...section, stats: newStats });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="bi bi-bar-chart-fill me-2"></i>
          Statistics Grid Content
        </h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Heading</label>
            <input
              type="text"
              className="form-control"
              value={section.heading || ""}
              onChange={(e) => onChange({ ...section, heading: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Subheading</label>
            <input
              type="text"
              className="form-control"
              value={section.subheading || ""}
              onChange={(e) => onChange({ ...section, subheading: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Columns</label>
            <select
              className="form-select"
              value={section.columns}
              onChange={(e) =>
                onChange({ ...section, columns: parseInt(e.target.value) as 2 | 3 | 4 })
              }
            >
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
            </select>
          </div>
          <div className="col-12">
            <hr />
            <strong>Statistics ({section.stats.length})</strong>
          </div>
          {section.stats.map((stat: any, index: number) => (
            <div key={stat.id} className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-8">
                      <label className="form-label small">Value</label>
                      <input
                        type="text"
                        className="form-control"
                        value={stat.value}
                        onChange={(e) => updateStat(index, { value: e.target.value })}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small">Suffix</label>
                      <input
                        type="text"
                        className="form-control"
                        value={stat.suffix || ""}
                        onChange={(e) => updateStat(index, { suffix: e.target.value })}
                        placeholder="+, %, etc."
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small">Label</label>
                      <input
                        type="text"
                        className="form-control"
                        value={stat.label}
                        onChange={(e) => updateStat(index, { label: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        value={stat.description || ""}
                        onChange={(e) => updateStat(index, { description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Card Grid Editor
function CardGridEditor({
  section,
  onChange,
}: {
  section: any;
  onChange: (section: any) => void;
}) {
  const updateCard = (index: number, updates: Partial<any>) => {
    const newCards = [...section.cards];
    newCards[index] = { ...newCards[index], ...updates };
    onChange({ ...section, cards: newCards });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="bi bi-grid-3x3-gap-fill me-2"></i>
          Card Grid Content
        </h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Heading</label>
            <input
              type="text"
              className="form-control"
              value={section.heading || ""}
              onChange={(e) => onChange({ ...section, heading: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Subheading</label>
            <input
              type="text"
              className="form-control"
              value={section.subheading || ""}
              onChange={(e) => onChange({ ...section, subheading: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Columns</label>
            <select
              className="form-select"
              value={section.columns}
              onChange={(e) =>
                onChange({ ...section, columns: parseInt(e.target.value) as 2 | 3 | 4 })
              }
            >
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
            </select>
          </div>
          <div className="col-12">
            <hr />
            <strong>Cards ({section.cards.length})</strong>
          </div>
          {section.cards.map((card: any, index: number) => (
            <div key={card.id} className="col-12">
              <div className="card">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <strong>Card {index + 1}: {card.title}</strong>
                  {card.badge && (
                    <span className="badge rounded-pill text-primary border border-primary-subtle">{card.badge}</span>
                  )}
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label small">Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={card.title}
                        onChange={(e) => updateCard(index, { title: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Badge</label>
                      <input
                        type="text"
                        className="form-control"
                        value={card.badge || ""}
                        onChange={(e) => updateCard(index, { badge: e.target.value })}
                        placeholder="Popular, New, etc."
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Accent Color</label>
                      <input
                        type="color"
                        className="form-control form-control-color w-100"
                        value={card.color || "#2563eb"}
                        onChange={(e) => updateCard(index, { color: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small">Description</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={card.description}
                        onChange={(e) => updateCard(index, { description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Banner Editor
function BannerEditor({
  section,
  onChange,
}: {
  section: any;
  onChange: (section: any) => void;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="bi bi-megaphone-fill me-2"></i>
          Banner Content
        </h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Content (HTML supported)</label>
            <textarea
              className="form-control"
              rows={3}
              value={section.content}
              onChange={(e) => onChange({ ...section, content: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Variant</label>
            <select
              className="form-select"
              value={section.variant}
              onChange={(e) =>
                onChange({
                  ...section,
                  variant: e.target.value as "info" | "success" | "warning" | "error",
                })
              }
            >
              <option value="info">Info (Blue)</option>
              <option value="success">Success (Green)</option>
              <option value="warning">Warning (Yellow)</option>
              <option value="error">Error (Red)</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Dismissible</label>
            <div className="form-check form-switch mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={section.dismissible || false}
                onChange={(e) => onChange({ ...section, dismissible: e.target.checked })}
              />
              <label className="form-check-label">
                {section.dismissible ? "User can dismiss" : "Always visible"}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Table Editor
function TableEditor({
  section,
  onChange,
}: {
  section: any;
  onChange: (section: any) => void;
}) {
  const updateRow = (rowIndex: number, cellIndex: number, value: string) => {
    const newRows = [...section.rows];
    const newCells = [...newRows[rowIndex].cells];
    newCells[cellIndex] = value;
    newRows[rowIndex] = { ...newRows[rowIndex], cells: newCells };
    onChange({ ...section, rows: newRows });
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...section.headers];
    newHeaders[index] = value;
    onChange({ ...section, headers: newHeaders });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="bi bi-table me-2"></i>
          Table Content
        </h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Heading</label>
            <input
              type="text"
              className="form-control"
              value={section.heading || ""}
              onChange={(e) => onChange({ ...section, heading: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Subheading</label>
            <input
              type="text"
              className="form-control"
              value={section.subheading || ""}
              onChange={(e) => onChange({ ...section, subheading: e.target.value })}
            />
          </div>
          <div className="col-12">
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="checkbox"
                checked={section.striped || false}
                onChange={(e) => onChange({ ...section, striped: e.target.checked })}
                id="stripedCheck"
              />
              <label className="form-check-label" htmlFor="stripedCheck">
                Striped rows
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="checkbox"
                checked={section.bordered || false}
                onChange={(e) => onChange({ ...section, bordered: e.target.checked })}
                id="borderedCheck"
              />
              <label className="form-check-label" htmlFor="borderedCheck">
                Bordered
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="checkbox"
                checked={section.hover || false}
                onChange={(e) => onChange({ ...section, hover: e.target.checked })}
                id="hoverCheck"
              />
              <label className="form-check-label" htmlFor="hoverCheck">
                Hover effect
              </label>
            </div>
          </div>
          <div className="col-12">
            <hr />
            <strong>Table Headers</strong>
            <div className="row g-2 mt-2">
              {section.headers.map((header: any, index: number) => (
                <div key={index} className="col">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={header}
                    onChange={(e) => updateHeader(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="col-12">
            <hr />
            <strong>Table Rows ({section.rows.length})</strong>
            <div className="table-responsive mt-2">
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    {section.headers.map((header: any, index: number) => (
                      <th key={index} className="small">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row: any, rowIndex: number) => (
                    <tr key={row.id}>
                      {row.cells.map((cell: any, cellIndex: number) => (
                        <td key={cellIndex}>
                          <input
                            type="text"
                            className="form-control form-control-sm font-monospace"
                            value={cell}
                            onChange={(e) => updateRow(rowIndex, cellIndex, e.target.value)}
                            style={{ fontSize: "0.75rem" }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-text">
              HTML is supported in cells (e.g., &lt;strong&gt;, &lt;span class=&quot;badge&quot;&gt;)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CTA Footer Editor
function CTAFooterEditor({
  section,
  onChange,
}: {
  section: any;
  onChange: (section: any) => void;
}) {
  const updateContactInfo = (field: string, value: string) => {
    onChange({
      ...section,
      contactInfo: {
        ...section.contactInfo,
        [field]: value,
      },
    });
  };

  const updateSocialLink = (
    index: number,
    updates: Partial<any>
  ) => {
    const newLinks = [...(section.socialLinks || [])];
    newLinks[index] = { ...newLinks[index], ...updates };
    onChange({ ...section, socialLinks: newLinks });
  };

  const addSocialLink = () => {
    const newLinks = [
      ...(section.socialLinks || []),
      { platform: "facebook" as const, url: "" },
    ];
    onChange({ ...section, socialLinks: newLinks });
  };

  const removeSocialLink = (index: number) => {
    const newLinks = section.socialLinks?.filter((_: any, i: number) => i !== index) || [];
    onChange({ ...section, socialLinks: newLinks });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">
          <i className="bi bi-layout-text-window me-2"></i>
          CTA Footer Content
        </h6>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {/* Main Content */}
          <div className="col-12">
            <label className="form-label">Heading</label>
            <input
              type="text"
              className="form-control"
              value={section.heading}
              onChange={(e) => onChange({ ...section, heading: e.target.value })}
              placeholder="Ready to Get Started?"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Subheading</label>
            <input
              type="text"
              className="form-control"
              value={section.subheading || ""}
              onChange={(e) => onChange({ ...section, subheading: e.target.value })}
              placeholder="Join thousands of happy customers"
            />
          </div>

          {/* Buttons */}
          <div className="col-12">
            <hr />
            <strong>CTA Buttons</strong>
          </div>
          {section.buttons?.map((button: any, index: number) => (
            <div key={index} className="col-12">
              <div className="row g-2">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    value={button.text}
                    onChange={(e) => {
                      const newButtons = [...(section.buttons || [])];
                      newButtons[index] = { ...newButtons[index], text: e.target.value };
                      onChange({ ...section, buttons: newButtons });
                    }}
                    placeholder="Button text"
                  />
                </div>
                <div className="col-md-4">
                  <LinkPicker
                    value={button.href}
                    onChange={(val) => {
                      const newButtons = [...(section.buttons || [])];
                      newButtons[index] = { ...newButtons[index], href: val };
                      onChange({ ...section, buttons: newButtons });
                    }}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={button.variant || "primary"}
                    onChange={(e) => {
                      const newButtons = [...(section.buttons || [])];
                      newButtons[index] = {
                        ...newButtons[index],
                        variant: e.target.value as "primary" | "secondary" | "outline",
                      };
                      onChange({ ...section, buttons: newButtons });
                    }}
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>
                <div className="col-md-1">
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100"
                    onClick={() => {
                      const newButtons = section.buttons?.filter((_: any, i: number) => i !== index) || [];
                      onChange({ ...section, buttons: newButtons });
                    }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="col-12">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                const newButtons = [
                  ...(section.buttons || []),
                  { text: "New Button", href: "/", variant: "primary" as const },
                ];
                onChange({ ...section, buttons: newButtons });
              }}
            >
              <i className="bi bi-plus me-1"></i>
              Add Button
            </button>
          </div>

          {/* Contact Information */}
          <div className="col-12">
            <hr />
            <strong>Contact Information</strong>
          </div>
          <div className="col-md-4">
            <label className="form-label small">Phone</label>
            <input
              type="text"
              className="form-control"
              value={section.contactInfo?.phone || ""}
              onChange={(e) => updateContactInfo("phone", e.target.value)}
              placeholder="028 123 4567"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Email</label>
            <input
              type="email"
              className="form-control"
              value={section.contactInfo?.email || ""}
              onChange={(e) => updateContactInfo("email", e.target.value)}
              placeholder="info@example.com"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Address</label>
            <input
              type="text"
              className="form-control"
              value={section.contactInfo?.address || ""}
              onChange={(e) => updateContactInfo("address", e.target.value)}
              placeholder="123 Main St, City"
            />
          </div>

          {/* Social Links */}
          <div className="col-12">
            <hr />
            <strong>Social Links</strong>
          </div>
          {section.socialLinks?.map((social: any, index: number) => (
            <div key={index} className="col-12">
              <div className="row g-2">
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={social.platform}
                    onChange={(e) =>
                      updateSocialLink(index, {
                        platform: e.target.value as string,
                      })
                    }
                  >
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <input
                    type="url"
                    className="form-control"
                    value={social.url}
                    onChange={(e) => updateSocialLink(index, { url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-md-1">
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100"
                    onClick={() => removeSocialLink(index)}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="col-12">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={addSocialLink}
            >
              <i className="bi bi-plus me-1"></i>
              Add Social Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
