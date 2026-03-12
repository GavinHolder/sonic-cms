"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import HeroCarouselEditor from "@/components/admin/HeroCarouselEditor";
import FooterSectionEditor from "@/components/admin/FooterSectionEditor";
import CTASectionEditor from "@/components/admin/CTASectionEditor";
import NormalSectionEditor from "@/components/admin/NormalSectionEditor";
import FlexibleSectionEditorModal from "@/components/admin/FlexibleSectionEditorModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { SectionConfig, SectionType, HeroSection, FooterSection, CTASection, NormalSection, FlexibleSection } from "@/types/section";
import {
  getSections,
  createSection,
  deleteSection,
  toggleSectionEnabled,
  moveSectionUp,
  moveSectionDown,
  getSectionTypeLabel,
  isSectionMovable,
  reorderSections,
} from "@/lib/section-manager";
import { updateSection } from "@/lib/section-manager";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// Sortable item wrapper component
function SortableItem({
  section,
  children,
}: {
  section: SectionConfig;
  children: (dragHandleProps: { listeners: Record<string, any>; attributes: Record<string, any> }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: !isSectionMovable(section.type) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners: listeners || {}, attributes: attributes || {} })}
    </div>
  );
}

export default function LandingPageManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<SectionType>("NORMAL");
  const [editingSection, setEditingSection] = useState<SectionConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must drag 8px before activating - prevents click interception
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Open editor for a section, syncing to URL
  const openEditor = useCallback((section: SectionConfig) => {
    setEditingSection(section);
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", section.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Close editor, removing URL param
  const closeEditor = useCallback(() => {
    setEditingSection(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    reloadSections();
  }, []);

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

  const reloadSections = async () => {
    const loadedSections = await getSections("/");
    setSections(loadedSections);
    // Re-open editor if URL has ?edit=<id> (e.g. after page refresh)
    const editId = searchParams.get("edit");
    if (editId) {
      const target = loadedSections.find((s) => s.id === editId);
      if (target) setEditingSection(target);
    }
  };

  const filteredSections = sections.filter((section) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "content") return section.type === "NORMAL";
    if (activeFilter === "hero") return section.type === "HERO";
    if (activeFilter === "cta") return section.type === "CTA";
    if (activeFilter === "footer") return section.type === "FOOTER";
    return false;
  });

  const movableSectionCount = sections.filter((s) => isSectionMovable(s.type)).length;

  const getSectionCount = (filter: FilterCategory): number => {
    if (filter === "all") return sections.length;
    if (filter === "content") return sections.filter((s) => s.type === "NORMAL").length;
    if (filter === "hero") return sections.filter((s) => s.type === "HERO").length;
    if (filter === "cta") return sections.filter((s) => s.type === "CTA").length;
    if (filter === "footer") return sections.filter((s) => s.type === "FOOTER").length;
    return 0;
  };

  const handleCreateSection = async () => {
    const newSection = await createSection("/", selectedType, {
      displayName: `New ${getSectionTypeLabel(selectedType)}`,
      content: {},
    });
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
    setSuccessMessage(!section.enabled ? "Section enabled" : "Section disabled");
  };

  const handleMoveUp = async (id: string) => {
    await moveSectionUp("/", id);
    await reloadSections();
  };

  const handleMoveDown = async (id: string) => {
    await moveSectionDown("/", id);
    await reloadSections();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find indices in the full sections array
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Prevent moving hero or footer
    const movingSection = sections[oldIndex];
    if (!isSectionMovable(movingSection.type)) return;

    // Clamp drop position to the valid movable range (between hero and footer).
    // When the user drops near the top/bottom, dnd-kit may detect HERO/FOOTER as
    // the closest target — clamping lets the drop succeed instead of aborting.
    const heroIdx   = sections.findIndex(s => s.type === "HERO");
    const footerIdx = sections.findIndex(s => s.type === "FOOTER");
    const minPos = heroIdx   >= 0 ? heroIdx   + 1 : 0;
    const maxPos = footerIdx >= 0 ? footerIdx - 1 : sections.length - 1;
    const clampedNewIndex = Math.max(minPos, Math.min(newIndex, maxPos));

    if (clampedNewIndex === oldIndex) return;

    // Optimistic UI update
    const reordered = arrayMove(sections, oldIndex, clampedNewIndex);
    setSections(reordered);

    // Save to database
    try {
      const ok = await reorderSections("/", reordered.map((s) => s.id));
      if (ok) {
        setSuccessMessage("Section reordered");
      } else {
        // Revert optimistic update on failure
        await reloadSections();
      }
    } catch (error) {
      console.error("Failed to reorder sections:", error);
      // Revert on error
      await reloadSections();
    }
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
          // Delete all sections one by one
          for (const section of sections) {
            await deleteSection(section.id);
          }
          await reloadSections();
          setSuccessMessage("All sections cleared");
        }
      },
    });
  };

  return (
    <AdminLayout
      title="Landing Page"
      subtitle="Manage sections on the homepage"
      actions={
        <div className="d-flex gap-2">
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredSections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="list-group">
                  {filteredSections.map((section, index) => {
                    const globalIndex = sections.findIndex((s) => s.id === section.id);
                    return (
                      <SortableItem key={section.id} section={section}>
                        {({ listeners, attributes }) => (
                        <div
                          className="list-group-item d-flex align-items-center gap-3"
                          style={
                            section.type === "HERO" || section.type === "FOOTER"
                              ? { backgroundColor: "#e8f4fd" }
                              : undefined
                          }
                        >
                    {/* Drag Handle - only this area triggers drag */}
                    {isSectionMovable(section.type) ? (
                      <div
                        className="text-muted d-flex align-items-center"
                        style={{ cursor: "grab", touchAction: "none" }}
                        title="Drag to reorder"
                        {...listeners}
                        {...attributes}
                      >
                        <i className="bi bi-grip-vertical fs-5"></i>
                      </div>
                    ) : (
                      <div style={{ width: "20px" }}></div>
                    )}

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
                        {(section.type === "FLEXIBLE" || (section.type as string) === "flexible") && (
                          <span className="badge rounded-pill text-info border border-info-subtle">
                            {((section as any).contentMode || (section as any).content?.contentMode || "single") === "multi" ? "multi-block" : "single-block"}
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
                        onClick={() => openEditor(section)}
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
                        )}
                </SortableItem>
              );
            })}
            </div>
          </SortableContext>
        </DndContext>
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
          onCancel={closeEditor}
        />
      )}

      {editingSection && editingSection.type === "FOOTER" && (
        <FooterSectionEditor
          section={editingSection as FooterSection}
          onSave={async (updates, shouldClose = true) => {
            const ok = await updateSection(editingSection.id, updates);
            if (!ok) { setErrorMessage("Failed to save section — changes were not stored."); return; }
            await reloadSections();
            if (shouldClose) closeEditor();
            setSuccessMessage("Footer section updated!");
          }}
          onCancel={closeEditor}
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
            if (shouldClose) closeEditor();
            setSuccessMessage("CTA section updated!");
          }}
          onCancel={closeEditor}
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
            if (shouldClose) closeEditor();
            setSuccessMessage("Content section updated!");
          }}
          onCancel={closeEditor}
          allSections={sections.map((s) => ({ id: s.id, type: s.type, title: (s as any).title, displayName: (s as any).displayName, order: s.order }))}
        />
      )}

      {editingSection && (editingSection.type === "FLEXIBLE" || (editingSection.type as string) === "flexible") && (
        <FlexibleSectionEditorModal
          section={editingSection as FlexibleSection}
          onSave={async (updates, shouldClose = true) => {
            const ok = await updateSection(editingSection.id, updates);
            if (!ok) { setErrorMessage("Failed to save section — changes were not stored."); return; }
            await reloadSections();
            if (shouldClose) closeEditor();
            setSuccessMessage("Flexible section updated!");
          }}
          onCancel={closeEditor}
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
                  <option value="FLEXIBLE">Flexible Section (Custom Layout)</option>
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
                  {selectedType === "FLEXIBLE" &&
                    "Flexible sections support custom element layouts with cards, text, images, videos, and more."}
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
