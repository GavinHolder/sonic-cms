"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/components/admin/ToastProvider";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetSummary {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
}

interface GalleryImage {
  id: string;
  caption: string | null;
  altText: string | null;
  order: number;
  asset: AssetSummary & { width: number | null; height: number | null; filename: string };
}

interface GalleryCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  order: number;
  coverImage: AssetSummary | null;
  _count: { images: number };
}

// ─── Sortable image tile ───────────────────────────────────────────────────

function SortableImageTile({
  image,
  onDelete,
  onEditCaption,
}: {
  image: GalleryImage;
  onDelete: (id: string) => void;
  onEditCaption: (image: GalleryImage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
      }}
    >
      <div className="card border" style={{ overflow: "hidden" }}>
        <div
          style={{ position: "relative", paddingTop: "75%", background: "#f8f9fa", cursor: "grab" }}
          {...attributes}
          {...listeners}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.asset.thumbnailUrl || image.asset.url}
            alt={image.altText || image.asset.altText || ""}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0)",
              transition: "background 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
            className="img-overlay"
          />
        </div>
        <div className="card-body p-2 d-flex align-items-center gap-1">
          <span className="small text-truncate flex-grow-1" style={{ fontSize: "0.75rem" }} title={image.asset.filename}>
            {image.caption || image.asset.filename}
          </span>
          <button
            className="btn btn-sm btn-link p-0 text-muted"
            title="Edit caption"
            onClick={() => onEditCaption(image)}
          >
            <i className="bi bi-pencil" style={{ fontSize: "0.75rem" }} />
          </button>
          <button
            className="btn btn-sm btn-link p-0 text-danger"
            title="Remove from gallery"
            onClick={() => onDelete(image.id)}
          >
            <i className="bi bi-x-lg" style={{ fontSize: "0.75rem" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Outer shell — renders AdminLayout so ToastProvider is available ─────────

export default function GalleryAdminPage() {
  return (
    <AdminLayout
      title="Gallery"
      subtitle="Manage photo categories and images"
      actions={
        <div className="d-flex gap-2">
          <a href="/gallery" target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-eye me-1" />View Gallery
          </a>
        </div>
      }
    >
      <GalleryAdminInner />
    </AdminLayout>
  );
}

// ─── Inner component — has access to ToastProvider context ───────────────────

function GalleryAdminInner() {
  const toast = useToast();

  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GalleryCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", description: "", isActive: true });

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<{ id: string; url: string; altText: string }[]>([]);

  const [editingCaptionImage, setEditingCaptionImage] = useState<GalleryImage | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [altTextDraft, setAltTextDraft] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  // ── Fetch categories ──────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/admin/gallery/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories);
        if (!selectedCategoryId && data.data.categories.length > 0) {
          setSelectedCategoryId(data.data.categories[0].id);
        }
      }
    } finally {
      setLoadingCategories(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => { fetchCategories(); }, []);

  // ── Fetch images for selected category ───────────────────────────────────

  const fetchImages = useCallback(async (categoryId: string) => {
    setLoadingImages(true);
    try {
      const res = await fetch(`/api/admin/gallery/categories/${categoryId}/images`);
      const data = await res.json();
      if (data.success) setImages(data.data.images);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCategoryId) fetchImages(selectedCategoryId);
    else setImages([]);
  }, [selectedCategoryId, fetchImages]);

  // ── Category CRUD ─────────────────────────────────────────────────────────

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", slug: "", description: "", isActive: true });
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: GalleryCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "", isActive: cat.isActive });
    setShowCategoryModal(true);
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const saveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.slug.trim()) {
      toast.warning("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/admin/gallery/categories/${editingCategory.id}`
        : "/api/admin/gallery/categories";
      const method = editingCategory ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to save");
      toast.success(editingCategory ? "Category updated" : "Category created");
      setShowCategoryModal(false);
      await fetchCategories();
      if (!editingCategory) setSelectedCategoryId(data.data.category.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (cat: GalleryCategory) => {
    if (!confirm(`Delete "${cat.name}" and all its images?`)) return;
    try {
      const res = await fetch(`/api/admin/gallery/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to delete");
      toast.success("Category deleted");
      if (selectedCategoryId === cat.id) setSelectedCategoryId(null);
      await fetchCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // ── Image management ──────────────────────────────────────────────────────

  const handleAssetsSelected = async (assets: { id: string; url: string; altText: string }[]) => {
    if (!selectedCategoryId || assets.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/gallery/categories/${selectedCategoryId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: assets.map((a) => a.id) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to add images");
      toast.success(`Added ${assets.length} image${assets.length > 1 ? "s" : ""}`);
      await fetchImages(selectedCategoryId);
      await fetchCategories();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add images");
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!selectedCategoryId) return;
    try {
      const res = await fetch(`/api/admin/gallery/categories/${selectedCategoryId}/images/${imageId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error("Failed to remove image");
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      await fetchCategories();
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const saveCaption = async () => {
    if (!editingCaptionImage || !selectedCategoryId) return;
    try {
      const res = await fetch(
        `/api/admin/gallery/categories/${selectedCategoryId}/images/${editingCaptionImage.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: captionDraft || null, altText: altTextDraft || null }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error("Failed to save");
      setImages((prev) => prev.map((img) => img.id === editingCaptionImage.id ? { ...img, caption: captionDraft || null, altText: altTextDraft || null } : img));
      toast.success("Caption saved");
      setEditingCaptionImage(null);
    } catch {
      toast.error("Failed to save caption");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedCategoryId) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);
    setImages(reordered);

    try {
      await fetch(`/api/admin/gallery/categories/${selectedCategoryId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: reordered.map((img) => img.id) }),
      });
    } catch {
      toast.error("Failed to save order");
      await fetchImages(selectedCategoryId);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="d-flex h-100" style={{ minHeight: "calc(100vh - 120px)" }}>
        {/* ── Left panel: category list ─────────────────────────────────── */}
        <div
          className="border-end bg-body-tertiary"
          style={{ width: "260px", flexShrink: 0, overflowY: "auto" }}
        >
          <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
            <span className="fw-semibold small text-muted text-uppercase" style={{ letterSpacing: "0.07em" }}>
              Categories
            </span>
            <button className="btn btn-sm btn-link p-0" onClick={openNewCategory} title="New category">
              <i className="bi bi-plus-circle" />
            </button>
          </div>

          {loadingCategories ? (
            <div className="p-3 text-center text-muted small">
              <div className="spinner-border spinner-border-sm me-2" role="status" />
              Loading…
            </div>
          ) : categories.length === 0 ? (
            <div className="p-3 text-center text-muted small">
              No categories yet.
              <br />
              <button className="btn btn-link btn-sm p-0 mt-1" onClick={openNewCategory}>
                Create one
              </button>
            </div>
          ) : (
            <ul className="list-unstyled mb-0 p-2">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    className={`w-100 text-start btn btn-sm rounded px-2 py-2 mb-1 d-flex align-items-center gap-2 ${selectedCategoryId === cat.id ? "btn-primary" : "btn-light"}`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <i className="bi bi-folder2" style={{ flexShrink: 0 }} />
                    <span className="flex-grow-1 text-truncate" style={{ fontSize: "0.8125rem" }}>
                      {cat.name}
                    </span>
                    <span className="badge rounded-pill bg-secondary bg-opacity-50" style={{ fontSize: "0.65rem" }}>
                      {cat._count.images}
                    </span>
                    {!cat.isActive && <i className="bi bi-eye-slash text-warning" title="Hidden" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Right panel: images ───────────────────────────────────────── */}
        <div className="flex-grow-1 overflow-auto p-4">
          {!selectedCategory ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-images d-block mb-3" style={{ fontSize: "3rem", opacity: 0.3 }} />
              <p>Select a category to manage its images</p>
            </div>
          ) : (
            <>
              {/* Category header */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h5 className="mb-0 fw-bold">{selectedCategory.name}</h5>
                    {!selectedCategory.isActive && (
                      <span className="badge bg-warning text-dark">Hidden</span>
                    )}
                  </div>
                  {selectedCategory.description && (
                    <p className="small text-muted mb-0 mt-1">{selectedCategory.description}</p>
                  )}
                  <div className="small text-muted mt-1">
                    /gallery/{selectedCategory.slug} • {selectedCategory._count.images} images
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => openEditCategory(selectedCategory)}
                  >
                    <i className="bi bi-pencil me-1" />Edit
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => deleteCategory(selectedCategory)}
                  >
                    <i className="bi bi-trash me-1" />Delete
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowMediaPicker(true)}
                    disabled={saving}
                  >
                    <i className="bi bi-plus-lg me-1" />Add Images
                  </button>
                </div>
              </div>

              {/* Images grid */}
              {loadingImages ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />
                  Loading images…
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-image d-block mb-3" style={{ fontSize: "2.5rem", opacity: 0.3 }} />
                  <p className="mb-2">No images in this category yet.</p>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => setShowMediaPicker(true)}>
                    <i className="bi bi-plus-lg me-1" />Add Images
                  </button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      {images.map((img) => (
                        <SortableImageTile
                          key={img.id}
                          image={img}
                          onDelete={deleteImage}
                          onEditCaption={(image) => {
                            setEditingCaptionImage(image);
                            setCaptionDraft(image.caption ?? "");
                            setAltTextDraft(image.altText ?? "");
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Category modal ────────────────────────────────────────────────── */}
      {showCategoryModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowCategoryModal(false)} />
          <div className="modal fade show d-block" style={{ zIndex: 1055 }} tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingCategory ? "Edit Category" : "New Category"}</h5>
                  <button className="btn-close" onClick={() => setShowCategoryModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={categoryForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setCategoryForm((f) => ({ ...f, name, slug: editingCategory ? f.slug : autoSlug(name) }));
                      }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Slug *</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    />
                    <div className="form-text">/gallery/{categoryForm.slug || "…"}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="catIsActive"
                      checked={categoryForm.isActive}
                      onChange={(e) => setCategoryForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="catIsActive">
                      Visible on public gallery
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveCategory} disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                    {editingCategory ? "Save Changes" : "Create Category"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Caption/alt edit modal ────────────────────────────────────────── */}
      {editingCaptionImage && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setEditingCaptionImage(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1055 }} tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Caption</h5>
                  <button className="btn-close" onClick={() => setEditingCaptionImage(null)} />
                </div>
                <div className="modal-body">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editingCaptionImage.asset.thumbnailUrl || editingCaptionImage.asset.url}
                    alt=""
                    className="w-100 mb-3 rounded"
                    style={{ maxHeight: "200px", objectFit: "cover" }}
                  />
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Caption</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional caption shown below the image"
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Alt text</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Describe the image for accessibility"
                      value={altTextDraft}
                      onChange={(e) => setAltTextDraft(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setEditingCaptionImage(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveCaption}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Media picker (multi-select) ───────────────────────────────────── */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={() => {}}
        onSelectAssets={handleAssetsSelected}
        multi
        filterType="image"
      />
    </>
  );
}
