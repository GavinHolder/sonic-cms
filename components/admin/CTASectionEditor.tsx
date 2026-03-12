"use client";

import { useState, useEffect } from "react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import type { CTASection, ButtonConfig, GradientOverlay, LowerThirdConfig } from "@/types/section";
import type { FormField } from "@/types/page";
import { DEFAULT_LOWER_THIRD } from "@/lib/lower-third-presets";
import LowerThirdTab from "./LowerThirdTab";
import SpacingControls from "@/components/admin/SpacingControls";
import SectionIntoShapePicker from "@/components/admin/SectionIntoShapePicker";
import ImageFieldWithUpload from "@/components/admin/ImageFieldWithUpload";
import GoogleFontPicker from "@/components/admin/GoogleFontPicker";
import { LinkPicker } from "@/components/admin/LinkPicker";

interface CTASectionEditorProps {
  section: CTASection;
  onSave: (section: CTASection, shouldClose?: boolean) => void;
  onCancel: () => void;
  allSections?: Array<{ id: string; type: string; title?: string; displayName?: string; order: number }>;
}

export default function CTASectionEditor({
  section,
  onSave,
  onCancel,
  allSections = [],
}: CTASectionEditorProps) {
  const [heading, setHeading] = useState(section.content.heading || "");
  const [subheading, setSubheading] = useState(section.content.subheading || "");
  const [buttons, setButtons] = useState<ButtonConfig[]>(
    section.content.buttons || [{ text: "Get Started", href: "#", variant: "primary" }]
  );
  const [style, setStyle] = useState<"banner" | "card" | "fullwidth" | "contact-form">(
    section.content.style || "banner"
  );

  // Background options
  const [backgroundType, setBackgroundType] = useState<"solid" | "gradient" | "image" | "video">(
    section.content.backgroundVideo
      ? "video"
      : section.content.backgroundImage
      ? "image"
      : section.content.gradient?.enabled && !section.content.backgroundImage && !section.content.backgroundVideo
      ? "gradient"
      : "solid"
  );
  const [background, setBackground] = useState(section.background || "blue");
  const [backgroundImage, setBackgroundImage] = useState(section.content.backgroundImage || "");
  const [backgroundVideo, setBackgroundVideo] = useState(section.content.backgroundVideo || "");
  const [videoPoster, setVideoPoster] = useState(section.content.videoPoster || "");

  // Gradient overlay
  const [gradientEnabled, setGradientEnabled] = useState(section.content.gradient?.enabled || false);
  const [gradientType, setGradientType] = useState<"preset" | "custom">(
    section.content.gradient?.type || "preset"
  );
  const [gradientDirection, setGradientDirection] = useState(
    section.content.gradient?.preset?.direction || "bottom"
  );
  const [gradientStartOpacity, setGradientStartOpacity] = useState(
    section.content.gradient?.preset?.startOpacity || 70
  );
  const [gradientEndOpacity, setGradientEndOpacity] = useState(
    section.content.gradient?.preset?.endOpacity || 0
  );
  const [gradientColor, setGradientColor] = useState(
    section.content.gradient?.preset?.color || "#000000"
  );

  const [displayName, setDisplayName] = useState(section.displayName || "Call to Action");
  const [paddingTop, setPaddingTop] = useState(section.paddingTop || 100);
  const [paddingBottom, setPaddingBottom] = useState(section.paddingBottom || 80);

  // Triangle configuration state
  const [triangleEnabled, setTriangleEnabled] = useState(section.triangleEnabled || false);
  const [triangleSide, setTriangleSide] = useState(section.triangleSide === "left" ? "left" : "right");
  const [triangleShape, setTriangleShape] = useState(section.triangleShape || "classic");
  const [triangleHeight, setTriangleHeight] = useState(section.triangleHeight || 200);
  const [triangleTargetId, setTriangleTargetId] = useState(section.triangleTargetId || section.id);
  const [triangleGradientType, setTriangleGradientType] = useState(section.triangleGradientType || "solid");
  const [triangleColor1, setTriangleColor1] = useState(section.triangleColor1 || "#4ecdc4");
  const [triangleColor2, setTriangleColor2] = useState(section.triangleColor2 || "#6a82fb");
  const [triangleAlpha1, setTriangleAlpha1] = useState(section.triangleAlpha1 || 100);
  const [triangleAlpha2, setTriangleAlpha2] = useState(section.triangleAlpha2 || 100);
  const [triangleAngle, setTriangleAngle] = useState(section.triangleAngle || 45);
  const [triangleImageUrl, setTriangleImageUrl] = useState(section.triangleImageUrl || "");
  const [triangleImageSize, setTriangleImageSize] = useState(section.triangleImageSize || "cover");
  const [triangleImagePos, setTriangleImagePos] = useState(section.triangleImagePos || "center");
  const [triangleImageOpacity, setTriangleImageOpacity] = useState(section.triangleImageOpacity || 100);
  const [triangleImageX, setTriangleImageX] = useState(section.triangleImageX ?? 50);
  const [triangleImageY, setTriangleImageY] = useState(section.triangleImageY ?? 50);
  const [triangleImageScale, setTriangleImageScale] = useState(section.triangleImageScale ?? 100);
  const [hoverTextEnabled, setHoverTextEnabled] = useState(section.hoverTextEnabled || false);
  const [hoverText, setHoverText] = useState(section.hoverText || "");
  const [hoverTextStyle, setHoverTextStyle] = useState(section.hoverTextStyle || 1);
  const [hoverFontSize, setHoverFontSize] = useState(section.hoverFontSize || 18);
  const [hoverFontFamily, setHoverFontFamily] = useState(section.hoverFontFamily || "Arial");
  const [hoverAnimationType, setHoverAnimationType] = useState(section.hoverAnimationType || "slide");
  const [hoverAnimateBehind, setHoverAnimateBehind] = useState(section.hoverAnimateBehind !== false);
  const [hoverAlwaysShow, setHoverAlwaysShow] = useState(section.hoverAlwaysShow || false);
  const [hoverOffsetX, setHoverOffsetX] = useState(section.hoverOffsetX || 0);
  const [bgImageUrl, setBgImageUrl] = useState(section.bgImageUrl || "");
  const [bgImageSize, setBgImageSize] = useState(section.bgImageSize || "cover");
  const [bgImagePosition, setBgImagePosition] = useState(section.bgImagePosition || "center");
  const [bgImageRepeat, setBgImageRepeat] = useState(section.bgImageRepeat || "no-repeat");
  const [bgImageOpacity, setBgImageOpacity] = useState(section.bgImageOpacity || 100);
  const [bgParallax, setBgParallax] = useState(section.bgParallax || false);

  const [activeTab, setActiveTab] = useState<"content" | "background" | "spacing" | "triangle" | "lower-third">("content");
  const [lowerThird, setLowerThird] = useState<LowerThirdConfig>(
    (section as any).lowerThird ?? DEFAULT_LOWER_THIRD
  );

  // Contact form mode state
  const [formFields, setFormFields] = useState<FormField[]>(
    (section.content as any).formFields || []
  );
  const [formTitle, setFormTitle] = useState(
    (section.content as any).formTitle || "Get in Touch"
  );
  const [formSuccessMessage, setFormSuccessMessage] = useState(
    (section.content as any).formSuccessMessage ||
      "Thank you! We'll be in touch shortly."
  );
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const handleAddButton = () => {
    setButtons([...buttons, { text: "New Button", href: "#", variant: "primary" }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: keyof ButtonConfig, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  /** Open the field editor to add a new contact form field */
  const handleAddFormField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "New Field",
      name: `field_${Date.now()}`,
      required: false,
    };
    setEditingField(newField);
    setShowFieldEditor(true);
  };

  /** Open the field editor to edit an existing contact form field */
  const handleEditFormField = (field: FormField) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  /** Save a contact form field (add new or update existing) */
  const handleSaveFormField = (field: FormField) => {
    if (formFields.find((f) => f.id === field.id)) {
      setFormFields(formFields.map((f) => (f.id === field.id ? field : f)));
    } else {
      setFormFields([...formFields, field]);
    }
    setShowFieldEditor(false);
    setEditingField(null);
  };

  /** Delete a contact form field by id */
  const handleDeleteFormField = (id: string) => {
    if (confirm("Delete this field?")) {
      setFormFields(formFields.filter((f) => f.id !== id));
    }
  };

  /** Move a contact form field up or down in the list */
  const handleMoveFormField = (index: number, direction: "up" | "down") => {
    const newFields = [...formFields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFormFields(newFields);
  };

  const handleSave = (shouldClose: boolean = true) => {
    // Build gradient object
    // For "gradient" background type, always include gradient
    // For "image"/"video" background type, only include if gradientEnabled is true
    const shouldIncludeGradient =
      backgroundType === "gradient" ||
      (backgroundType === "image" && gradientEnabled) ||
      (backgroundType === "video" && gradientEnabled);

    const gradient: GradientOverlay | undefined = shouldIncludeGradient
      ? {
          enabled: true,
          type: gradientType,
          preset:
            gradientType === "preset"
              ? {
                  direction: gradientDirection as any,
                  startOpacity: gradientStartOpacity,
                  endOpacity: gradientEndOpacity,
                  color: gradientColor,
                }
              : undefined,
        }
      : undefined;

    const updatedSection: CTASection = {
      ...section,
      displayName,
      background: backgroundType === "solid" ? (background as any) : "transparent",
      paddingTop,
      paddingBottom,
      // Triangle overlay fields
      triangleEnabled,
      triangleSide,
      triangleShape,
      triangleHeight,
      triangleTargetId: triangleTargetId || undefined,
      triangleGradientType,
      triangleColor1,
      triangleColor2,
      triangleAlpha1,
      triangleAlpha2,
      triangleAngle,
      triangleImageUrl: triangleImageUrl || undefined,
      triangleImageSize,
      triangleImagePos,
      triangleImageOpacity,
      triangleImageX,
      triangleImageY,
      triangleImageScale,
      hoverTextEnabled,
      hoverText: hoverText || undefined,
      hoverTextStyle,
      hoverFontSize,
      hoverFontFamily,
      hoverAnimationType,
      hoverAnimateBehind,
      hoverAlwaysShow,
      hoverOffsetX,
      bgImageUrl: bgImageUrl || undefined,
      bgImageSize,
      bgImagePosition,
      bgImageRepeat,
      bgImageOpacity,
      bgParallax,
      lowerThird,
      content: {
        heading,
        subheading: subheading || undefined,
        buttons,
        style,
        backgroundImage: backgroundType === "image" ? backgroundImage : undefined,
        backgroundVideo: backgroundType === "video" ? backgroundVideo : undefined,
        videoPoster: backgroundType === "video" ? videoPoster : undefined,
        gradient,
        // Contact form mode — only persisted when style === "contact-form"
        formFields: style === "contact-form" ? formFields : undefined,
        formTitle: style === "contact-form" ? formTitle : undefined,
        formSuccessMessage: style === "contact-form" ? formSuccessMessage : undefined,
      },
    };

    onSave(updatedSection, shouldClose);
  };

  useAutoSave(() => handleSave(false));

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1115 }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-megaphone me-2"></i>
              Edit CTA Section
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            {/* Display Name */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                <i className="bi bi-tag me-2"></i>
                Section Name (Admin Only)
              </label>
              <input
                type="text"
                className="form-control"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Get Started CTA"
              />
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "content" ? "active" : ""}`}
                  onClick={() => setActiveTab("content")}
                >
                  <i className="bi bi-type me-2"></i>
                  Content
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "background" ? "active" : ""}`}
                  onClick={() => setActiveTab("background")}
                >
                  <i className="bi bi-image me-2"></i>
                  Background
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "triangle" ? "active" : ""}`}
                  onClick={() => setActiveTab("triangle")}
                >
                  <i className="bi bi-triangle me-2"></i>
                  Section Into
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "lower-third" ? "active" : ""}`}
                  onClick={() => setActiveTab("lower-third")}
                >
                  <i className="bi bi-layout-bottom me-1" />
                  Lower Third
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "spacing" ? "active" : ""}`}
                  onClick={() => setActiveTab("spacing")}
                >
                  <i className="bi bi-arrows-expand-vertical me-2"></i>
                  Spacing
                </button>
              </li>
            </ul>

            {/* Content Tab */}
            {activeTab === "content" && (
              <>
                {/* Heading */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-type-h1 me-2"></i>
                    Heading *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder="e.g., Ready to Get Started?"
                    required
                  />
                </div>

                {/* Subheading */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-type-h2 me-2"></i>
                    Subheading (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    placeholder="e.g., Join thousands of happy customers with fast, reliable internet"
                  />
                </div>

                {/* Style Selection */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-palette me-2"></i>
                    CTA Style
                  </label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      id="style-banner"
                      checked={style === "banner"}
                      onChange={() => setStyle("banner")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="style-banner">
                      <i className="bi bi-card-heading me-1"></i>
                      Banner
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="style-card"
                      checked={style === "card"}
                      onChange={() => setStyle("card")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="style-card">
                      <i className="bi bi-card-text me-1"></i>
                      Card
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="style-fullwidth"
                      checked={style === "fullwidth"}
                      onChange={() => setStyle("fullwidth")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="style-fullwidth">
                      <i className="bi bi-arrows-fullscreen me-1"></i>
                      Full Width
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="style-contact-form"
                      checked={style === "contact-form"}
                      onChange={() => setStyle("contact-form")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="style-contact-form">
                      <i className="bi bi-ui-checks me-1"></i>
                      Contact Form
                    </label>
                  </div>
                </div>

                {/* Visual CTA Style Guide */}
                <div className="alert alert-light border mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <i className="bi bi-info-circle text-primary me-2"></i>
                    <strong>CTA Style Preview: {style === "banner" ? "Banner" : style === "card" ? "Card" : style === "fullwidth" ? "Full Width" : "Contact Form"}</strong>
                  </div>

                  {/* Banner Style */}
                  {style === "banner" && (
                    <div className="position-relative">
                      <div className="border border-2 border-primary rounded p-4 bg-primary bg-opacity-10">
                        <div className="text-center">
                          <div className="border rounded p-2 bg-primary bg-opacity-25 d-inline-block mb-2">
                            <i className="bi bi-type-h1 text-primary"></i>
                            <span className="small fw-semibold text-primary ms-2">Heading</span>
                          </div>
                          <div className="border rounded p-2 bg-primary bg-opacity-25 d-inline-block mb-3 ms-2">
                            <i className="bi bi-type-h2 text-primary"></i>
                            <span className="small fw-semibold text-primary ms-2">Subheading</span>
                          </div>
                          <div className="d-flex justify-content-center gap-2 mt-3">
                            <div className="border border-success rounded px-3 py-2 bg-success bg-opacity-10">
                              <i className="bi bi-hand-index text-success"></i>
                              <span className="small fw-semibold text-success ms-2">Button 1</span>
                            </div>
                            <div className="border border-success rounded px-3 py-2 bg-success bg-opacity-10">
                              <i className="bi bi-hand-index text-success"></i>
                              <span className="small fw-semibold text-success ms-2">Button 2</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="small text-muted text-center mt-2">
                        <i className="bi bi-check-circle me-1"></i>
                        Content centered in container with padding
                      </div>
                    </div>
                  )}

                  {/* Card Style */}
                  {style === "card" && (
                    <div className="position-relative">
                      <div className="d-flex justify-content-center">
                        <div className="border border-2 border-primary rounded shadow-sm p-4 bg-white" style={{ maxWidth: "600px", width: "100%" }}>
                          <div className="text-center">
                            <div className="border rounded p-2 bg-primary bg-opacity-10 d-inline-block mb-2">
                              <i className="bi bi-type-h1 text-primary"></i>
                              <span className="small fw-semibold text-primary ms-2">Heading</span>
                            </div>
                            <div className="border rounded p-2 bg-primary bg-opacity-10 d-inline-block mb-3 ms-2">
                              <i className="bi bi-type-h2 text-primary"></i>
                              <span className="small fw-semibold text-primary ms-2">Subheading</span>
                            </div>
                            <div className="d-flex justify-content-center gap-2 mt-3">
                              <div className="border border-success rounded px-3 py-2 bg-success bg-opacity-10">
                                <i className="bi bi-hand-index text-success"></i>
                                <span className="small fw-semibold text-success ms-2">Button 1</span>
                              </div>
                              <div className="border border-success rounded px-3 py-2 bg-success bg-opacity-10">
                                <i className="bi bi-hand-index text-success"></i>
                                <span className="small fw-semibold text-success ms-2">Button 2</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="small text-muted text-center mt-2">
                        <i className="bi bi-check-circle me-1"></i>
                        Content in card container with shadow and border
                      </div>
                    </div>
                  )}

                  {/* Full Width Style */}
                  {style === "fullwidth" && (
                    <div className="position-relative">
                      <div className="border border-2 border-primary p-4 bg-primary bg-opacity-10">
                        <div className="text-center">
                          <div className="border rounded p-2 bg-primary bg-opacity-25 d-inline-block mb-2">
                            <i className="bi bi-type-h1 text-primary"></i>
                            <span className="small fw-semibold text-primary ms-2">Heading</span>
                          </div>
                          <div className="border rounded p-2 bg-primary bg-opacity-25 d-inline-block mb-3 ms-2">
                            <i className="bi bi-type-h2 text-primary"></i>
                            <span className="small fw-semibold text-primary ms-2">Subheading</span>
                          </div>
                          <div className="d-flex justify-content-center gap-2 mt-3">
                            <div className="border border-success rounded px-3 py-2 bg-success bg-opacity-10">
                              <i className="bi bi-hand-index text-success"></i>
                              <span className="small fw-semibold text-success ms-2">Button 1</span>
                            </div>
                            <div className="border border-success rounded px-3 py-2 bg-success bg-opacity-10">
                              <i className="bi bi-hand-index text-success"></i>
                              <span className="small fw-semibold text-success ms-2">Button 2</span>
                            </div>
                          </div>
                        </div>
                        <div className="position-absolute top-0 start-0 mt-2 ms-2">
                          <small className="badge bg-primary">Edge to Edge</small>
                        </div>
                        <div className="position-absolute top-0 end-0 mt-2 me-2">
                          <small className="badge bg-primary">Edge to Edge</small>
                        </div>
                      </div>
                      <div className="small text-muted text-center mt-2">
                        <i className="bi bi-check-circle me-1"></i>
                        Content spans full viewport width (edge to edge)
                      </div>
                    </div>
                  )}

                  {/* Contact Form Style Preview */}
                  {style === "contact-form" && (
                    <div className="position-relative">
                      <div className="border border-2 border-primary rounded p-4 bg-primary bg-opacity-10">
                        <div className="text-center mb-3">
                          <div className="border rounded p-2 bg-primary bg-opacity-25 d-inline-block mb-2">
                            <i className="bi bi-ui-checks text-primary"></i>
                            <span className="small fw-semibold text-primary ms-2">Form Title</span>
                          </div>
                        </div>
                        <div className="d-flex flex-column gap-2">
                          <div className="border rounded p-2 bg-white">
                            <span className="small text-muted">Text Field</span>
                          </div>
                          <div className="border rounded p-2 bg-white">
                            <span className="small text-muted">Email Field</span>
                          </div>
                          <div className="border rounded p-2 bg-primary text-white text-center">
                            <span className="small fw-semibold">Submit Button</span>
                          </div>
                        </div>
                      </div>
                      <div className="small text-muted text-center mt-2">
                        <i className="bi bi-check-circle me-1"></i>
                        Embedded contact form with configurable fields
                      </div>
                    </div>
                  )}

                  {/* Additional context */}
                  <div className="alert alert-info mb-0 mt-3 d-flex align-items-start">
                    <i className="bi bi-lightbulb flex-shrink-0 me-2 mt-1"></i>
                    <div className="small">
                      <strong>Style Guide:</strong>
                      {style === "banner" && " Banner style is perfect for prominent calls-to-action with standard container width."}
                      {style === "card" && " Card style adds visual elevation with shadow and border, great for subtle CTAs."}
                      {style === "fullwidth" && " Full width style maximizes impact by spanning the entire viewport - ideal for hero CTAs."}
                      {style === "contact-form" && " Contact Form embeds a configurable multi-field form directly in the CTA section. Add fields below."}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-hand-index me-2"></i>
                    Buttons
                  </label>
                  {buttons.map((button, index) => (
                    <div key={index} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <strong>Button {index + 1}</strong>
                          {buttons.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveButton(index)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Button Text</label>
                          <input
                            type="text"
                            className="form-control"
                            value={button.text}
                            onChange={(e) => handleButtonChange(index, "text", e.target.value)}
                            placeholder="e.g., View Plans"
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Link URL</label>
                          <LinkPicker
                            value={button.href}
                            onChange={(val) => handleButtonChange(index, "href", val)}
                            sectionOptions={allSections.map((s) => ({
                              value: `#${s.id}`,
                              label: `Section: ${s.displayName || s.type}`,
                            }))}
                          />
                        </div>

                        <div className="mb-0">
                          <label className="form-label">Button Variant</label>
                          <select
                            className="form-select"
                            value={button.variant}
                            onChange={(e) => handleButtonChange(index, "variant", e.target.value)}
                          >
                            <option value="primary">Primary (Filled)</option>
                            <option value="secondary">Secondary (Gray)</option>
                            <option value="outline">Outline</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-outline-primary w-100"
                    onClick={handleAddButton}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Button
                  </button>
                </div>

                {/* Contact Form Fields — only shown when style === "contact-form" */}
                {style === "contact-form" && (
                  <div className="mt-4 pt-4 border-top">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Form Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Get in Touch"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Success Message</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formSuccessMessage}
                        onChange={(e) => setFormSuccessMessage(e.target.value)}
                        placeholder="Thank you! We'll be in touch shortly."
                      />
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0 fw-semibold">Form Fields</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleAddFormField}
                      >
                        <i className="bi bi-plus-lg me-1"></i>
                        Add Field
                      </button>
                    </div>

                    {formFields.length === 0 ? (
                      <div className="alert alert-info small">
                        <i className="bi bi-info-circle me-2"></i>
                        No fields yet. Click "Add Field" to build your form.
                        <div className="mt-1 text-muted">
                          <strong>Tip:</strong> Add an Email field — it's required for OTP verification.
                        </div>
                      </div>
                    ) : (
                      <div className="list-group">
                        {formFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="list-group-item d-flex align-items-center gap-3"
                          >
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <strong>{field.label}</strong>
                                <span className="badge bg-secondary">{field.type}</span>
                                {field.required && (
                                  <span className="badge bg-danger">Required</span>
                                )}
                              </div>
                              <small className="text-muted">name: {field.name}</small>
                            </div>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => handleMoveFormField(index, "up")}
                                disabled={index === 0}
                                title="Move up"
                              >
                                <i className="bi bi-arrow-up"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => handleMoveFormField(index, "down")}
                                disabled={index === formFields.length - 1}
                                title="Move down"
                              >
                                <i className="bi bi-arrow-down"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEditFormField(field)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteFormField(field.id)}
                                title="Delete"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Background Tab */}
            {activeTab === "background" && (
              <>
                {/* Background Type */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-palette me-2"></i>
                    Background Type
                  </label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-solid"
                      checked={backgroundType === "solid"}
                      onChange={() => setBackgroundType("solid")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-solid">
                      <i className="bi bi-paint-bucket me-1"></i>
                      Solid
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-gradient"
                      checked={backgroundType === "gradient"}
                      onChange={() => {
                        setBackgroundType("gradient");
                        setGradientEnabled(true);
                      }}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-gradient">
                      <i className="bi bi-palette-fill me-1"></i>
                      Gradient
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-image"
                      checked={backgroundType === "image"}
                      onChange={() => setBackgroundType("image")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-image">
                      <i className="bi bi-image me-1"></i>
                      Image
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="bg-video"
                      checked={backgroundType === "video"}
                      onChange={() => setBackgroundType("video")}
                    />
                    <label className="btn btn-outline-primary" htmlFor="bg-video">
                      <i className="bi bi-camera-video me-1"></i>
                      Video
                    </label>
                  </div>
                </div>

                {/* Solid Color Background */}
                {backgroundType === "solid" && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Background Color</label>
                    <select
                      className="form-select"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                    >
                      <option value="white">White</option>
                      <option value="gray">Gray</option>
                      <option value="blue">Blue</option>
                      <option value="lightblue">Light Blue</option>
                      <option value="transparent">Transparent</option>
                    </select>
                  </div>
                )}

                {/* Image Background */}
                {backgroundType === "image" && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Background Image URL</label>
                    <input
                      type="text"
                      className="form-control"
                      value={backgroundImage}
                      onChange={(e) => setBackgroundImage(e.target.value)}
                      placeholder="/images/hero-bg.jpg"
                    />
                    <small className="form-text text-muted">
                      Path to background image
                    </small>
                  </div>
                )}

                {/* Video Background */}
                {backgroundType === "video" && (
                  <>
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Background Video URL</label>
                      <input
                        type="text"
                        className="form-control"
                        value={backgroundVideo}
                        onChange={(e) => setBackgroundVideo(e.target.value)}
                        placeholder="/videos/hero-video.mp4"
                      />
                      <small className="form-text text-muted">
                        Path to video file (MP4 recommended)
                      </small>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Video Poster Image</label>
                      <input
                        type="text"
                        className="form-control"
                        value={videoPoster}
                        onChange={(e) => setVideoPoster(e.target.value)}
                        placeholder="/images/video-poster.jpg"
                      />
                      <small className="form-text text-muted">
                        Image shown before video loads
                      </small>
                    </div>
                  </>
                )}

                {/* Gradient Controls */}
                {backgroundType === "gradient" && (
                  <>
                    <div className="alert alert-info mb-4">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Gradient Background:</strong> Pure gradient (no image/video). Perfect for colorful CTA backgrounds.
                    </div>

                    <div className="mb-4">
                      <label className="form-label">Gradient Direction</label>
                      <select
                        className="form-select"
                        value={gradientDirection}
                        onChange={(e) => setGradientDirection(e.target.value as any)}
                      >
                        <option value="top">Top to Bottom</option>
                        <option value="bottom">Bottom to Top</option>
                        <option value="left">Left to Right</option>
                        <option value="right">Right to Left</option>
                        <option value="topLeft">Top Left</option>
                        <option value="topRight">Top Right</option>
                        <option value="bottomLeft">Bottom Left</option>
                        <option value="bottomRight">Bottom Right</option>
                      </select>
                    </div>

                    <div className="row mb-4">
                      <div className="col-md-6">
                        <label className="form-label">Start Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          max="100"
                          value={gradientStartOpacity}
                          onChange={(e) => setGradientStartOpacity(Number(e.target.value))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">End Opacity (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          max="100"
                          value={gradientEndOpacity}
                          onChange={(e) => setGradientEndOpacity(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label">Gradient Color</label>
                      <div className="input-group">
                        <input
                          type="color"
                          className="form-control form-control-color"
                          value={gradientColor}
                          onChange={(e) => setGradientColor(e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-control"
                          value={gradientColor}
                          onChange={(e) => setGradientColor(e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Gradient Overlay (for image/video backgrounds) */}
                {(backgroundType === "image" || backgroundType === "video") && (
                  <>
                    <hr className="my-4" />
                    <div className="mb-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="gradientEnabled"
                          checked={gradientEnabled}
                          onChange={(e) => setGradientEnabled(e.target.checked)}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="gradientEnabled">
                          <i className="bi bi-gradient me-2"></i>
                          Gradient Overlay (Optional)
                        </label>
                      </div>
                      <small className="form-text text-muted">
                        Add a gradient overlay on top of the image/video background
                      </small>
                    </div>

                    {gradientEnabled && (
                      <>
                        <div className="mb-4">
                          <label className="form-label">Gradient Direction</label>
                          <select
                            className="form-select"
                            value={gradientDirection}
                            onChange={(e) => setGradientDirection(e.target.value as any)}
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

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Start Opacity (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={gradientStartOpacity}
                              onChange={(e) => setGradientStartOpacity(Number(e.target.value))}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">End Opacity (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              value={gradientEndOpacity}
                              onChange={(e) => setGradientEndOpacity(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label">Gradient Color</label>
                          <div className="input-group">
                            <input
                              type="color"
                              className="form-control form-control-color"
                              value={gradientColor}
                              onChange={(e) => setGradientColor(e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              value={gradientColor}
                              onChange={(e) => setGradientColor(e.target.value)}
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Triangle Overlay Tab */}
            {activeTab === "triangle" && (
              <>
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="triangleEnabled"
                      checked={triangleEnabled}
                      onChange={(e) => setTriangleEnabled(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="triangleEnabled">
                      <i className="bi bi-triangle me-2"></i>
                      Enable Section Into
                    </label>
                  </div>
                  <small className="form-text text-muted">
                    Add decorative triangle shapes to section edges with optional hover text and navigation
                  </small>
                </div>

                {triangleEnabled && (
                  <>
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Triangle Side</label>
                        <select
                          className="form-select"
                          value={triangleSide}
                          onChange={(e) => setTriangleSide(e.target.value)}
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>

                    </div>
                    <SectionIntoShapePicker value={triangleShape} onChange={setTriangleShape} />

                    <div className="mb-4">
                      <label className="form-label fw-semibold">
                        Triangle Height: {triangleHeight}px
                      </label>
                      <input
                        type="range"
                        className="form-range"
                        min="100"
                        max="400"
                        step="10"
                        value={triangleHeight}
                        onChange={(e) => setTriangleHeight(Number(e.target.value))}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Navigate to Section</label>
                      <select
                        className="form-select mb-2"
                        value={triangleTargetId}
                        onChange={(e) => setTriangleTargetId(e.target.value)}
                      >
                        {allSections
                          .filter((s) => s.type !== "HERO" && s.type !== "FOOTER")
                          .sort((a, b) => a.order - b.order)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id === section.id ? `(This Section) ` : ""}
                              {s.displayName || s.title || s.type} (Order {s.order})
                            </option>
                          ))}
                      </select>
                      <input
                        type="text"
                        className="form-control"
                        value={triangleTargetId}
                        onChange={(e) => setTriangleTargetId(e.target.value)}
                        placeholder="Or enter custom section ID"
                      />
                      <small className="form-text text-muted">
                        Defaults to this section. Pick a different section from the dropdown or type a custom ID.
                      </small>
                    </div>

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-palette me-2"></i>
                      Triangle Gradient
                    </h6>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Gradient Type</label>
                      <select
                        className="form-select"
                        value={triangleGradientType}
                        onChange={(e) => setTriangleGradientType(e.target.value)}
                      >
                        <option value="solid">Solid Color</option>
                        <option value="linear">Linear Gradient</option>
                        <option value="radial">Radial Gradient</option>
                      </select>
                      {triangleGradientType !== "solid" && triangleShape === "classic" && (
                        <div className="alert alert-warning py-2 px-3 mt-2 mb-0 small">
                          <i className="bi bi-exclamation-triangle me-1" />
                          Gradients require <strong>Modern (Clip-Path)</strong> shape. Switch the Triangle Shape above to see the gradient.
                        </div>
                      )}
                    </div>

                    <div className="row mb-4">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Color 1</label>
                        <div className="input-group">
                          <input
                            type="color"
                            className="form-control form-control-color"
                            value={triangleColor1}
                            onChange={(e) => setTriangleColor1(e.target.value)}
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={triangleColor1}
                            onChange={(e) => setTriangleColor1(e.target.value)}
                            placeholder="#4ecdc4"
                          />
                        </div>
                      </div>

                      {triangleGradientType !== "solid" && (
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Color 2</label>
                          <div className="input-group">
                            <input
                              type="color"
                              className="form-control form-control-color"
                              value={triangleColor2}
                              onChange={(e) => setTriangleColor2(e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              value={triangleColor2}
                              onChange={(e) => setTriangleColor2(e.target.value)}
                              placeholder="#6a82fb"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {triangleGradientType !== "solid" && (
                      <>
                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Alpha 1: {triangleAlpha1}%</label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              value={triangleAlpha1}
                              onChange={(e) => setTriangleAlpha1(Number(e.target.value))}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Alpha 2: {triangleAlpha2}%</label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              value={triangleAlpha2}
                              onChange={(e) => setTriangleAlpha2(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        {triangleGradientType === "linear" && (
                          <div className="mb-4">
                            <label className="form-label">Gradient Angle: {triangleAngle}°</label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="360"
                              value={triangleAngle}
                              onChange={(e) => setTriangleAngle(Number(e.target.value))}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-image me-2"></i>
                      Image Fill
                    </h6>
                    <div className="mb-3">
                      <ImageFieldWithUpload
                        label="Fill Image (clips to shape)"
                        value={triangleImageUrl}
                        onChange={setTriangleImageUrl}
                      />
                    </div>
                    {triangleImageUrl && (
                      <>
                        <div className="mb-3">
                          <label className="form-label">X Position: {triangleImageX}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="100"
                            value={triangleImageX}
                            onChange={(e) => setTriangleImageX(Number(e.target.value))}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Y Position: {triangleImageY}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="100"
                            value={triangleImageY}
                            onChange={(e) => setTriangleImageY(Number(e.target.value))}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Scale: {triangleImageScale}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="50"
                            max="300"
                            value={triangleImageScale}
                            onChange={(e) => setTriangleImageScale(Number(e.target.value))}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Opacity: {triangleImageOpacity}%</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="100"
                            value={triangleImageOpacity}
                            onChange={(e) => setTriangleImageOpacity(Number(e.target.value))}
                          />
                        </div>
                      </>
                    )}

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-cursor-text me-2"></i>
                      Hover Text (Optional)
                    </h6>

                    <div className="mb-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="hoverTextEnabled"
                          checked={hoverTextEnabled}
                          onChange={(e) => setHoverTextEnabled(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="hoverTextEnabled">
                          Enable Hover Text
                        </label>
                      </div>
                    </div>

                    {hoverTextEnabled && (
                      <>
                        <div className="mb-4">
                          <label className="form-label fw-semibold">Hover Text</label>
                          <input
                            type="text"
                            className="form-control"
                            value={hoverText}
                            onChange={(e) => setHoverText(e.target.value)}
                            placeholder="e.g., NEXT SECTION"
                            maxLength={50}
                          />
                          <small className="form-text text-muted">
                            {hoverText.length}/50 characters
                          </small>
                        </div>

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Text Style</label>
                            <select
                              className="form-select"
                              value={hoverTextStyle}
                              onChange={(e) => setHoverTextStyle(Number(e.target.value))}
                            >
                              <option value={1}>Inside Triangle</option>
                              <option value={2}>Outside Triangle</option>
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Font Size: {hoverFontSize}px</label>
                            <input
                              type="range"
                              className="form-range"
                              min="12"
                              max={hoverTextStyle === 1 ? 32 : 64}
                              value={hoverFontSize}
                              onChange={(e) => setHoverFontSize(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Font Family</label>
                            <GoogleFontPicker
                              value={hoverFontFamily}
                              onChange={setHoverFontFamily}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Animation Type</label>
                            <select
                              className="form-select"
                              value={hoverAnimationType}
                              onChange={(e) => setHoverAnimationType(e.target.value)}
                            >
                              <option value="slide">Slide</option>
                              <option value="fade">Fade</option>
                              <option value="scale">Scale</option>
                              <option value="sweep">Sweep</option>
                            </select>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="hoverAnimateBehind"
                              checked={hoverAnimateBehind}
                              onChange={(e) => setHoverAnimateBehind(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="hoverAnimateBehind">
                              Animate From Behind
                            </label>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="hoverAlwaysShow"
                              checked={hoverAlwaysShow}
                              onChange={(e) => setHoverAlwaysShow(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="hoverAlwaysShow">
                              Always Show Text (No Hover Required)
                            </label>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label">
                            {hoverTextStyle === 1
                              ? `Horizontal Offset: ${hoverOffsetX}px`
                              : `Distance Offset: ${hoverOffsetX}px`}
                          </label>
                          <input
                            type="range"
                            className="form-range"
                            min={hoverTextStyle === 1 ? -50 : 0}
                            max={hoverTextStyle === 1 ? 50 : 200}
                            value={hoverOffsetX}
                            onChange={(e) => setHoverOffsetX(Number(e.target.value))}
                          />
                          <small className="form-text text-muted">
                            {hoverTextStyle === 1
                              ? "Adjust horizontal position within triangle"
                              : "Adjust distance from triangle edge"}
                          </small>
                        </div>
                      </>
                    )}

                    <hr className="my-4" />
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-image me-2"></i>
                      Section Background Image (Optional)
                    </h6>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Background Image URL</label>
                      <input
                        type="text"
                        className="form-control"
                        value={bgImageUrl}
                        onChange={(e) => setBgImageUrl(e.target.value)}
                        placeholder="https://example.com/background.jpg"
                      />
                      <small className="form-text text-muted">
                        Background image for the entire section
                      </small>
                    </div>

                    {bgImageUrl && (
                      <>
                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Background Size</label>
                            <select
                              className="form-select"
                              value={bgImageSize}
                              onChange={(e) => setBgImageSize(e.target.value)}
                            >
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">Background Position</label>
                            <input
                              type="text"
                              className="form-control"
                              value={bgImagePosition}
                              onChange={(e) => setBgImagePosition(e.target.value)}
                              placeholder="center, top left, 50% 50%"
                            />
                          </div>
                        </div>

                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Background Repeat</label>
                            <select
                              className="form-select"
                              value={bgImageRepeat}
                              onChange={(e) => setBgImageRepeat(e.target.value)}
                            >
                              <option value="no-repeat">No Repeat</option>
                              <option value="repeat">Repeat</option>
                              <option value="repeat-x">Repeat Horizontally</option>
                              <option value="repeat-y">Repeat Vertically</option>
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">
                              Image Opacity: {bgImageOpacity}%
                            </label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              value={bgImageOpacity}
                              onChange={(e) => setBgImageOpacity(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="bgParallax"
                              checked={bgParallax}
                              onChange={(e) => setBgParallax(e.target.checked)}
                            />
                            <label className="form-check-label" htmlFor="bgParallax">
                              Enable Parallax Effect
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Spacing Tab */}
            {activeTab === "spacing" && (
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  <i className="bi bi-arrows-expand-vertical me-2"></i>
                  Section Spacing
                </label>
                <SpacingControls
                  paddingTop={paddingTop}
                  paddingBottom={paddingBottom}
                  onPaddingTopChange={setPaddingTop}
                  onPaddingBottomChange={setPaddingBottom}
                />
              </div>
            )}

            {/* Lower Third Tab */}
            {activeTab === "lower-third" && (
              <LowerThirdTab config={lowerThird} onChange={setLowerThird} />
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => handleSave(false)}
              disabled={!heading.trim()}
            >
              <i className="bi bi-floppy me-2"></i>
              Save Only
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSave(true)}
              disabled={!heading.trim()}
            >
              <i className="bi bi-check-circle me-2"></i>
              Save & Close
            </button>
          </div>
        </div>
      </div>

      {/* Field editor modal for contact form mode */}
      {showFieldEditor && editingField && (
        <FieldEditorModal
          field={editingField}
          onSave={handleSaveFormField}
          onCancel={() => {
            setShowFieldEditor(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}

// ── Field types available in the contact form builder ──
const FIELD_TYPES = [
  { value: "text", label: "Text Input", icon: "bi-input-cursor-text" },
  { value: "email", label: "Email Input", icon: "bi-envelope" },
  { value: "phone", label: "Phone Input", icon: "bi-telephone" },
  { value: "textarea", label: "Text Area", icon: "bi-textarea-t" },
  { value: "select", label: "Dropdown", icon: "bi-menu-button-wide" },
  { value: "checkbox", label: "Checkbox", icon: "bi-check-square" },
] as const;

interface FieldEditorModalProps {
  field: FormField;
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

/**
 * Modal for editing a single contact form field.
 * Supports all FormField types: text, email, phone, textarea, select, checkbox.
 * Copied from FormPageEditor.tsx to avoid cross-component imports.
 */
function FieldEditorModal({ field, onSave, onCancel }: FieldEditorModalProps) {
  const [type, setType] = useState(field.type);
  const [label, setLabel] = useState(field.label);
  const [name, setName] = useState(field.name);
  const [required, setRequired] = useState(field.required);
  const [placeholder, setPlaceholder] = useState(field.placeholder || "");
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>(
    field.options || []
  );

  /** Validate and call onSave with the current field state */
  const handleSave = () => {
    if (!label.trim()) {
      alert("Please enter a field label");
      return;
    }

    if (!name.trim()) {
      alert("Please enter a field name");
      return;
    }

    if (type === "select" && options.length === 0) {
      alert("Please add at least one option for dropdown");
      return;
    }

    onSave({
      id: field.id,
      type,
      label: label.trim(),
      name: name.trim(),
      required,
      placeholder: placeholder.trim() || undefined,
      options: type === "select" ? options : undefined,
    });
  };

  /** Add a new blank option to the select dropdown */
  const handleAddOption = () => {
    setOptions([...options, { value: "", label: "" }]);
  };

  /** Update a specific key of a select option at the given index */
  const handleUpdateOption = (index: number, key: "value" | "label", val: string) => {
    const newOptions = [...options];
    newOptions[index][key] = val;
    setOptions(newOptions);
  };

  /** Remove a select option at the given index */
  const handleDeleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1120 }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Field</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>

          <div className="modal-body">
            {/* Field Type */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Field Type</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as FormField["type"])}
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Label <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Full Name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Field Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="full_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="form-text">
                Used as the key in form submission data (lowercase, no spaces)
              </div>
            </div>

            {/* Required */}
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="required-check-cta"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="required-check-cta">
                Required field
              </label>
            </div>

            {/* Placeholder — not applicable for checkbox or select */}
            {type !== "checkbox" && type !== "select" && (
              <div className="mb-3">
                <label className="form-label">Placeholder Text</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your name..."
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                />
              </div>
            )}

            {/* Options for Select dropdown */}
            {type === "select" && (
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <label className="form-label mb-0 fw-semibold">Options</label>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleAddOption}
                  >
                    <i className="bi bi-plus-lg me-1"></i>
                    Add Option
                  </button>
                </div>

                {options.map((opt, index) => (
                  <div key={index} className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Value (e.g., option1)"
                      value={opt.value}
                      onChange={(e) => handleUpdateOption(index, "value", e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Label (e.g., Option 1)"
                      value={opt.label}
                      onChange={(e) => handleUpdateOption(index, "label", e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => handleDeleteOption(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                ))}

                {options.length === 0 && (
                  <div className="alert alert-info small">
                    No options added yet. Click "Add Option" to create dropdown options.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <i className="bi bi-check-lg me-2"></i>
              Save Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
