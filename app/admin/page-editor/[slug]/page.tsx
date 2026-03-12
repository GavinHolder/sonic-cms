"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import HeroCarouselEditor from "@/components/admin/HeroCarouselEditor";
import FooterSectionEditor from "@/components/admin/FooterSectionEditor";
import CTASectionEditor from "@/components/admin/CTASectionEditor";
import NormalSectionEditor from "@/components/admin/NormalSectionEditor";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { getPage } from "@/lib/page-manager";
import type { SectionConfig, SectionType, HeroSection, FooterSection, CTASection, NormalSection } from "@/types/section";
import {
  getSections,
  createSection,
  deleteSection,
  toggleSectionEnabled,
  moveSectionUp,
  moveSectionDown,
  clearAllSections,
  getSectionTypeLabel,
  isSectionMovable,
  updateSection,
} from "@/lib/section-manager";

type FilterCategory = "all" | "hero" | "content" | "cta" | "footer";

const filterCategories: Array<{
  id: FilterCategory;
  label: string;
  icon: string;
}> = [
  { id: "all", label: "All Sections", icon: "bi-grid" },
  { id: "hero", label: "Hero", icon: "bi-stars" },
  { id: "content", label: "Content", icon: "bi-file-earmark-text" },
  { id: "cta", label: "Call to Action", icon: "bi-megaphone" },
  { id: "footer", label: "Footer", icon: "bi-layout-text-window-reverse" },
];

export default function PageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<ReturnType<typeof getPage>>(null);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<SectionType>("NORMAL");
  const [editingSection, setEditingSection] = useState<SectionConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "primary";
    requiresTextInput?: boolean;
    expectedInput?: string;
    onConfirm: (input?: string) => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "primary",
    onConfirm: () => {},
  });

  const reloadSections = async () => {
    const data = await getSections(slug);
    setSections(data);
  };

  useEffect(() => {
    const loadedPage = getPage(slug);
    if (!loadedPage) {
      router.push("/admin/content/pages");
      return;
    }

    if (loadedPage.type !== "full") {
      // Only full pages can use section editor
      router.push("/admin/content/pages");
      return;
    }

    setPage(loadedPage);
    reloadSections();
  }, [slug]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const filteredSections = sections.filter((section) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "content") return section.type === "NORMAL";
    return section.type === (activeFilter.toUpperCase() as SectionType);
  });

  const movableSectionCount = sections.filter((s) => isSectionMovable(s.type)).length;

  const getSectionCount = (filter: FilterCategory): number => {
    if (filter === "all") return sections.length;
    if (filter === "content") return sections.filter((s) => s.type === "NORMAL").length;
    return sections.filter((s) => s.type === (filter.toUpperCase() as SectionType)).length;
  };

  const handleCreateSection = async () => {
    const newSection = await createSection(slug, selectedType, {});
    if (newSection) {
      await reloadSections();
      setShowCreateModal(false);
      setSuccessMessage(`${getSectionTypeLabel(selectedType)} created successfully!`);
    }
  };

  const handleDeleteSection = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete Section",
      message: `Are you sure you want to delete "${section.displayName || section.type}"?\n\nThis action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        await deleteSection(id);
        await reloadSections();
        setSuccessMessage("Section deleted");
      },
    });
  };

  const handleToggleEnabled = async (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    await toggleSectionEnabled(id, section.enabled);
    await reloadSections();
    setSuccessMessage(section.enabled ? "Section disabled" : "Section enabled");
  };

  const handleMoveUp = async (id: string) => {
    await moveSectionUp(slug, id);
    await reloadSections();
  };

  const handleMoveDown = async (id: string) => {
    await moveSectionDown(slug, id);
    await reloadSections();
  };

  const handleClearAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: "⚠️ Clear All Sections",
      message: "WARNING: This will delete ALL sections permanently.\n\nThis action cannot be undone.\n\nType YES to confirm deletion:",
      variant: "danger",
      requiresTextInput: true,
      expectedInput: "YES",
      onConfirm: async (input) => {
        if (input === "YES") {
          await clearAllSections(slug);
          await reloadSections();
          setSuccessMessage("All sections cleared");
        }
      },
    });
  };

  if (!page) {
    return (
      <AdminLayout title="Loading..." subtitle="">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Edit Page: ${page.title}`}
      subtitle={
        <div className="d-flex align-items-center gap-2">
          <code className="text-primary">/{page.slug}</code>
          <a
            href={`/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-link btn-sm p-0"
          >
            <i className="bi bi-box-arrow-up-right"></i>
          </a>
        </div>
      }
      actions={
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => router.push("/admin/content/pages")}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Back to Pages
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={handleClearAll}
          >
            <i className="bi bi-trash me-1"></i>
            Clear All
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-plus-lg me-1"></i>
            Add Section
          </button>
        </div>
      }
    >
      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show mb-4">
          <i className="bi bi-check-circle me-2"></i>
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {errorMessage}
          <button type="button" className="btn-close" onClick={() => setErrorMessage(null)}></button>
        </div>
      )}

      <div className="d-flex gap-4">
        {/* Filter Sidebar */}
        <div className="flex-shrink-0" style={{ width: "200px" }}>
          <nav className="nav nav-pills flex-column gap-1">
            {filterCategories.map((cat) => {
              const count = getSectionCount(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={`nav-link d-flex align-items-center gap-2 text-start ${
                    activeFilter === cat.id ? "active" : "link-body-emphasis"
                  }`}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    background: activeFilter === cat.id ? undefined : "transparent",
                  }}
                >
                  <i className={`bi ${cat.icon}`} style={{ width: "18px" }}></i>
                  <span className="flex-grow-1">{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`badge rounded-pill ${
                        activeFilter === cat.id
                          ? "bg-white text-primary"
                          : "text-secondary border border-secondary-subtle"
                      }`}
                      style={{ fontSize: "0.6875rem" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sections List */}
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <h5 className="fw-semibold mb-3">
            <i className={`bi ${filterCategories.find((c) => c.id === activeFilter)?.icon} me-2 text-primary`}></i>
            {filterCategories.find((c) => c.id === activeFilter)?.label}
            <span className="badge rounded-pill text-secondary border border-secondary-subtle ms-2" style={{ fontSize: "0.75rem" }}>
              {filteredSections.length}
            </span>
          </h5>

          {filteredSections.length === 0 ? (
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-inbox display-4 text-muted" style={{ opacity: 0.3 }}></i>
                <h6 className="mt-3">
                  {sections.length === 0
                    ? "No sections yet"
                    : `No ${activeFilter === "all" ? "" : activeFilter + " "}sections`}
                </h6>
                <p className="text-muted small">
                  {sections.length === 0
                    ? 'Click "Add Section" to create your first section'
                    : "Try selecting a different filter or add a new section"}
                </p>
              </div>
            </div>
          ) : (
            <div className="list-group">
              {filteredSections.map((section) => {
                const globalIndex = sections.findIndex((s) => s.id === section.id);
                return (
                  <div
                    key={section.id}
                    className="list-group-item d-flex align-items-center gap-3"
                    style={
                      section.type === "HERO" || section.type === "FOOTER"
                        ? { backgroundColor: "#e8f4fd" }
                        : undefined
                    }
                  >
                    {/* Section Info */}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2">
                        <strong>{section.displayName || section.type}</strong>
                        <span className="badge rounded-pill text-secondary border border-secondary-subtle">
                          {section.type}
                        </span>
                        {!section.enabled && (
                          <span className="badge rounded-pill text-warning border border-warning-subtle">
                            Hidden
                          </span>
                        )}
                        {(section.type === "HERO" || section.type === "FOOTER") && (
                          <span className="badge rounded-pill text-primary border border-primary-subtle">
                            Fixed
                          </span>
                        )}
                      </div>
                      <small className="text-muted">Order: {section.order}</small>
                    </div>

                    {/* Actions */}
                    <div className="d-flex gap-1">
                      {isSectionMovable(section.type) && movableSectionCount > 1 && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleMoveUp(section.id)}
                            disabled={
                              globalIndex === 0 ||
                              sections[globalIndex - 1]?.type === "HERO"
                            }
                            title="Move Up"
                          >
                            <i className="bi bi-arrow-up"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleMoveDown(section.id)}
                            disabled={
                              globalIndex === sections.length - 1 ||
                              sections[globalIndex + 1]?.type === "FOOTER"
                            }
                            title="Move Down"
                          >
                            <i className="bi bi-arrow-down"></i>
                          </button>
                        </>
                      )}

                      <button
                        className={`btn btn-sm ${
                          section.enabled
                            ? "btn-outline-warning"
                            : "btn-outline-success"
                        }`}
                        onClick={() => handleToggleEnabled(section.id)}
                        title={section.enabled ? "Hide Section" : "Show Section"}
                      >
                        <i
                          className={`bi bi-eye${section.enabled ? "-slash" : ""}`}
                        ></i>
                      </button>

                      <button
                        className="btn btn-sm btn-outline-primary"
                        title="Edit Section"
                        onClick={() => setEditingSection(section)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteSection(section.id)}
                        title="Delete Section"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section Editors */}
      {editingSection && editingSection.type === "HERO" && (
        <HeroCarouselEditor
          section={editingSection as HeroSection}
          onSave={async (updates) => {
            const ok = await updateSection(editingSection.id, updates);
            if (!ok) { setErrorMessage("Failed to save section — changes were not stored."); return; }
            await reloadSections();
            setSuccessMessage("Hero section updated!");
          }}
          onCancel={() => setEditingSection(null)}
        />
      )}

      {editingSection && editingSection.type === "FOOTER" && (
        <FooterSectionEditor
          section={editingSection as FooterSection}
          onSave={async (updates, shouldClose = true) => {
            const ok = await updateSection(editingSection.id, updates);
            if (!ok) { setErrorMessage("Failed to save section — changes were not stored."); return; }
            await reloadSections();
            if (shouldClose) {
              setEditingSection(null);
            }
            setSuccessMessage("Footer section updated!");
          }}
          onCancel={() => setEditingSection(null)}
          availableSections={sections
            .filter((s) => s.type !== "FOOTER" && s.enabled)
            .map((s) => ({
              id: s.id,
              displayName: s.displayName || s.type,
              navLabel: (s as any).navLabel,
            }))}
        />
      )}

      {editingSection && editingSection.type === "CTA" && (
        <CTASectionEditor
          section={editingSection as CTASection}
          onSave={async (updates, shouldClose = true) => {
            const ok = await updateSection(editingSection.id, updates);
            if (!ok) { setErrorMessage("Failed to save section — changes were not stored."); return; }
            await reloadSections();
            if (shouldClose) {
              setEditingSection(null);
            }
            setSuccessMessage("CTA section updated!");
          }}
          onCancel={() => setEditingSection(null)}
          allSections={sections.map((s) => ({ id: s.id, type: s.type, title: (s as any).title, displayName: (s as any).displayName, order: s.order }))}
        />
      )}

      {editingSection && editingSection.type === "NORMAL" && (
        <NormalSectionEditor
          section={editingSection as NormalSection}
          onSave={async (updates, shouldClose = true) => {
            const ok = await updateSection(editingSection.id, updates);
            if (!ok) { setErrorMessage("Failed to save section — changes were not stored."); return; }
            await reloadSections();
            if (shouldClose) {
              setEditingSection(null);
            }
            setSuccessMessage("Content section updated!");
          }}
          onCancel={() => setEditingSection(null)}
          allSections={sections.map((s) => ({ id: s.id, type: s.type, title: (s as any).title, displayName: (s as any).displayName, order: s.order }))}
        />
      )}

      {/* Create Section Modal */}
      {showCreateModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Section</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label fw-semibold">Section Type</label>
                <select
                  className="form-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as SectionType)}
                >
                  <option value="HERO">Hero Section (Always First)</option>
                  <option value="FOOTER">Footer Section (Always Last)</option>
                  <option value="CTA">Call to Action (Movable)</option>
                  <option value="NORMAL">Content Section (Movable)</option>
                </select>
                <div className="form-text mt-2">
                  {selectedType === "HERO" && (
                    <i className="bi bi-info-circle me-1 text-primary"></i>
                  )}
                  {selectedType === "FOOTER" && (
                    <i className="bi bi-info-circle me-1 text-primary"></i>
                  )}
                  {selectedType === "HERO" &&
                    "Hero sections are always displayed first and cannot be moved."}
                  {selectedType === "FOOTER" &&
                    "Footer sections are always displayed last and cannot be moved."}
                  {selectedType === "CTA" &&
                    "CTA sections can be positioned anywhere between hero and footer."}
                  {selectedType === "NORMAL" &&
                    "Normal sections can be positioned anywhere between hero and footer."}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateSection}
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  Create Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        requiresTextInput={confirmDialog.requiresTextInput}
        expectedInput={confirmDialog.expectedInput}
        confirmText={confirmDialog.requiresTextInput ? "Delete All" : "Delete"}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog({ ...confirmDialog, isOpen: false })
        }
      />
    </AdminLayout>
  );
}
