"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import PDFPageEditor from "@/components/admin/PDFPageEditor";
import FormPageEditor from "@/components/admin/FormPageEditor";
import DesignerPageEditorModal from "@/components/admin/DesignerPageEditorModal";
import SeoPageEditorModal from "@/components/admin/SeoPageEditorModal";
import {
  getPages,
  deletePage,
  togglePageEnabled,
  duplicatePage,
  updatePage,
  getDesignerData,
} from "@/lib/page-manager";
import type { PageConfig, PageType, PDFPageConfig, FormPageConfig, DesignerPageConfig } from "@/types/page";
import Link from "next/link";

type FilterType = "all" | "pdf" | "form" | "designer" | "feature";

interface FeatureRecord {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  createdAt: string;
  updatedAt: string;
}

// Map feature slug → public route + admin settings path
const FEATURE_META: Record<string, { route: string; settingsPath: string }> = {
  "concrete-calculator": {
    route: "/calculator",
    settingsPath: "/admin/features/concrete-settings",
  },
};

const PAGE_TYPE_LABELS: Record<PageType, string> = {
  full: "Full Page",
  pdf: "PDF Document",
  form: "Contact Form",
  designer: "Designer Page",
};

const PAGE_TYPE_ICONS: Record<PageType, string> = {
  full: "bi-file-earmark-text",
  pdf: "bi-file-earmark-pdf",
  form: "bi-ui-checks",
  designer: "bi-grid-1x2",
};

const PAGE_TYPE_COLORS: Record<PageType, string> = {
  full: "primary",
  pdf: "danger",
  form: "success",
  designer: "info",
};

export default function PagesManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [features, setFeatures] = useState<FeatureRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingPDFPage, setEditingPDFPage] = useState<PDFPageConfig | null>(null);
  const [editingFormPage, setEditingFormPage] = useState<FormPageConfig | null>(null);
  const [editingDesignerPage, setEditingDesignerPage] = useState<DesignerPageConfig | null>(null);
  const [designerPageData, setDesignerPageData] = useState<string | null>(null);
  const [seoEditingPage, setSeoEditingPage] = useState<PageConfig | null>(null);

  const setEditParam = useCallback((slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("edit", slug);
    } else {
      params.delete("edit");
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  const reloadPages = useCallback(() => {
    const loaded = getPages();
    setPages(loaded);
    // Re-open editor if URL has ?edit=<slug> (e.g. after page refresh)
    const editSlug = searchParams.get("edit");
    if (editSlug) {
      const target = loaded.find((p) => p.slug === editSlug);
      if (target) {
        if (target.type === "pdf") setEditingPDFPage(target as PDFPageConfig);
        else if (target.type === "form") setEditingFormPage(target as FormPageConfig);
        else if (target.type === "designer") {
          setDesignerPageData(getDesignerData(target.slug));
          setEditingDesignerPage(target as DesignerPageConfig);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    reloadPages();
  }, []);

  // Load feature pages from API
  useEffect(() => {
    fetch("/api/features")
      .then((r) => r.json())
      .then((d) => { if (d.success) setFeatures(d.data); })
      .catch(() => {});
  }, []);

  const handleToggleFeature = async (feature: FeatureRecord) => {
    const res = await fetch("/api/features", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: feature.slug, name: feature.name, enabled: !feature.enabled, config: feature.config }),
    });
    if (res.ok) {
      setFeatures((prev) => prev.map((f) => f.slug === feature.slug ? { ...f, enabled: !f.enabled } : f));
      setSuccessMessage(`${feature.name} ${!feature.enabled ? "enabled" : "disabled"}`);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredPages = pages.filter((page) => {
    if (filter === "all") return true;
    if (filter === "feature") return false;
    return page.type === filter;
  });
  const showFeatures = filter === "all" || filter === "feature";

  const handleToggleEnabled = (slug: string) => {
    try {
      const page = togglePageEnabled(slug);
      reloadPages();
      setSuccessMessage(page.enabled ? "Page enabled" : "Page disabled");
    } catch (error) {
      console.error("Toggle failed:", error);
      setSuccessMessage("Failed to update page status");
    }
  };

  const handleDelete = (slug: string) => {
    try {
      deletePage(slug);
      reloadPages();
      setConfirmDelete(null);
      setSuccessMessage("Page deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      setSuccessMessage("Failed to delete page");
    }
  };

  const handleDuplicate = (slug: string) => {
    try {
      duplicatePage(slug);
      reloadPages();
      setSuccessMessage("Page duplicated successfully");
    } catch (error) {
      console.error("Duplicate failed:", error);
      setSuccessMessage("Failed to duplicate page");
    }
  };

  const handleEditPDF = (page: PageConfig) => {
    if (page.type === "pdf") {
      setEditingPDFPage(page as PDFPageConfig);
      setEditParam(page.slug);
    }
  };

  const handleSavePDF = (updates: Partial<PDFPageConfig>) => {
    if (!editingPDFPage) return;

    try {
      updatePage(editingPDFPage.slug, updates);
      reloadPages();
      setEditingPDFPage(null);
      setEditParam(null);
      setSuccessMessage("PDF page updated successfully");
    } catch (error) {
      console.error("Update failed:", error);
      setSuccessMessage("Failed to update PDF page");
    }
  };

  const handleEditForm = (page: PageConfig) => {
    if (page.type === "form") {
      setEditingFormPage(page as FormPageConfig);
      setEditParam(page.slug);
    }
  };

  const handleSaveForm = (updates: Partial<FormPageConfig>) => {
    if (!editingFormPage) return;

    try {
      updatePage(editingFormPage.slug, updates);
      reloadPages();
      setEditingFormPage(null);
      setEditParam(null);
      setSuccessMessage("Form page updated successfully");
    } catch (error) {
      console.error("Update failed:", error);
      setSuccessMessage("Failed to update form page");
    }
  };

  const handleEditDesigner = (page: PageConfig) => {
    if (page.type === "designer") {
      const data = getDesignerData(page.slug);
      setDesignerPageData(data);
      setEditingDesignerPage(page as DesignerPageConfig);
      setEditParam(page.slug);
    }
  };

  const handleSaveDesigner = (data: string) => {
    setDesignerPageData(data);
    // Update the page's updatedAt timestamp
    if (editingDesignerPage) {
      try {
        updatePage(editingDesignerPage.slug, {});
        reloadPages();
      } catch { /* ignore */ }
    }
  };

  const getEditHref = (page: PageConfig) => {
    if (page.type === "full") {
      return `/admin/page-editor/${page.slug}`;
    }
    // PDF and Form will be handled by modals later
    return "#";
  };

  const getPageStats = () => {
    return {
      total: pages.length + features.length,
      pdf: pages.filter((p) => p.type === "pdf").length,
      form: pages.filter((p) => p.type === "form").length,
      designer: pages.filter((p) => p.type === "designer").length,
      features: features.length,
    };
  };

  const stats = getPageStats();

  return (
    <AdminLayout
      title="Pages"
      subtitle="Manage navigable pages (separate from landing page)"
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary d-flex align-items-center gap-2"
        >
          <i className="bi bi-plus-lg"></i>
          Create Page
        </button>
      }
    >
      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show mb-4">
          <i className="bi bi-check-circle me-2"></i>
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
          ></button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Total Pages</div>
              <div className="h4 mb-0 fw-semibold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">PDF Pages</div>
              <div className="h4 mb-0 fw-semibold text-danger">{stats.pdf}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Form Pages</div>
              <div className="h4 mb-0 fw-semibold text-success">{stats.form}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Designer Pages</div>
              <div className="h4 mb-0 fw-semibold text-info">{stats.designer}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <div className="card border-0 shadow-sm" style={{ borderLeft: "3px solid #7c3aed" }}>
            <div className="card-body p-3">
              <div className="text-body-secondary small mb-1">Feature Pages</div>
              <div className="h4 mb-0 fw-semibold" style={{ color: "#7c3aed" }}>{stats.features}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-pills mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Pages ({stats.total})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === "pdf" ? "active" : ""}`}
            onClick={() => setFilter("pdf")}
          >
            <i className="bi bi-file-earmark-pdf me-1"></i>
            PDFs ({stats.pdf})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === "form" ? "active" : ""}`}
            onClick={() => setFilter("form")}
          >
            <i className="bi bi-ui-checks me-1"></i>
            Forms ({stats.form})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === "designer" ? "active" : ""}`}
            onClick={() => setFilter("designer")}
          >
            <i className="bi bi-grid-1x2 me-1"></i>
            Designer ({stats.designer})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === "feature" ? "active" : ""}`}
            onClick={() => setFilter("feature")}
            style={filter === "feature" ? {} : { color: "#7c3aed" }}
          >
            <i className="bi bi-cpu me-1"></i>
            Features ({stats.features})
          </button>
        </li>
      </ul>

      {/* Pages Table */}
      {filteredPages.length === 0 && !(showFeatures && features.length > 0) ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-files text-body-tertiary" style={{ fontSize: "4rem" }}></i>
            <h5 className="mt-3 text-body-secondary">No pages found</h5>
            <p className="text-body-secondary mb-4">
              {filter === "all"
                ? "Create your first page to get started"
                : `No ${filter} pages created yet`}
            </p>
            {filter === "all" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                <i className="bi bi-plus-lg me-2"></i>
                Create Page
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "35%" }}>Page</th>
                  <th style={{ width: "15%" }}>Type</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "13%" }}>Created</th>
                  <th style={{ width: "13%" }}>Updated</th>
                  <th style={{ width: "12%" }} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Feature pages */}
                {showFeatures && features.map((feature) => {
                  const meta = FEATURE_META[feature.slug];
                  return (
                    <tr key={`feature-${feature.slug}`} className={!feature.enabled ? "opacity-50" : ""}>
                      <td>
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-semibold">{feature.name}</span>
                            <span className="badge" style={{ background: "#7c3aed", fontSize: "0.65rem" }}>
                              <i className="bi bi-cpu me-1" />Feature
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <code className="text-primary small">{meta?.route ?? `/${feature.slug}`}</code>
                            {meta?.route && (
                              <a href={meta.route} target="_blank" rel="noopener noreferrer" className="btn btn-link btn-sm p-0" title="View page">
                                <i className="bi bi-box-arrow-up-right" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: "#7c3aed" }}>
                          <i className="bi bi-cpu me-1" />Feature Page
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${feature.enabled ? "bg-success" : "bg-secondary"}`}>
                          {feature.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        <small className="text-body-secondary">
                          {new Date(feature.createdAt).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <small className="text-body-secondary">
                          {new Date(feature.updatedAt).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1 justify-content-end">
                          {meta?.settingsPath && (
                            <Link
                              href={meta.settingsPath}
                              className="btn btn-sm btn-primary"
                              title="Edit feature settings"
                            >
                              <i className="bi bi-gear" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleToggleFeature(feature)}
                            className={`btn btn-sm ${feature.enabled ? "btn-outline-warning" : "btn-outline-success"}`}
                            title={feature.enabled ? "Disable feature" : "Enable feature"}
                          >
                            <i className={`bi ${feature.enabled ? "bi-eye-slash" : "bi-eye"}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPages.map((page) => (
                  <tr key={page.id} className={!page.enabled ? "opacity-50" : ""}>
                    {/* Page Title & Slug */}
                    <td>
                      <div>
                        <div className="fw-semibold mb-1">{page.title}</div>
                        <div className="d-flex align-items-center gap-2">
                          <code className="text-primary small">/{page.slug}</code>
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-link btn-sm p-0"
                            title="View page"
                          >
                            <i className="bi bi-box-arrow-up-right"></i>
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td>
                      <span className={`badge bg-${PAGE_TYPE_COLORS[page.type]}`}>
                        <i className={`bi ${PAGE_TYPE_ICONS[page.type]} me-1`}></i>
                        {PAGE_TYPE_LABELS[page.type]}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge ${page.enabled ? "bg-success" : "bg-secondary"}`}>
                        {page.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>

                    {/* Created */}
                    <td>
                      <small className="text-body-secondary">
                        {new Date(page.createdAt).toLocaleDateString()}
                      </small>
                    </td>

                    {/* Updated */}
                    <td>
                      <small className="text-body-secondary">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </small>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="d-flex gap-1 justify-content-end">
                        {page.type === "full" ? (
                          <Link
                            href={getEditHref(page)}
                            className="btn btn-sm btn-primary"
                            title="Edit sections"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                        ) : page.type === "pdf" ? (
                          <button
                            onClick={() => handleEditPDF(page)}
                            className="btn btn-sm btn-primary"
                            title="Edit PDF settings"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        ) : page.type === "form" ? (
                          <button
                            onClick={() => handleEditForm(page)}
                            className="btn btn-sm btn-primary"
                            title="Edit form fields"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        ) : page.type === "designer" ? (
                          <button
                            onClick={() => handleEditDesigner(page)}
                            className="btn btn-sm btn-info"
                            title="Open designer editor"
                          >
                            <i className="bi bi-grid-1x2"></i>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuccessMessage("Editor not implemented")}
                            className="btn btn-sm btn-primary"
                            title="Edit page"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}

                        <button
                          onClick={() => setSeoEditingPage(page)}
                          className="btn btn-sm btn-outline-info"
                          title="SEO settings"
                        >
                          <i className="bi bi-search"></i>
                        </button>

                        <button
                          onClick={() => handleToggleEnabled(page.slug)}
                          className={`btn btn-sm ${page.enabled ? "btn-outline-warning" : "btn-outline-success"}`}
                          title={page.enabled ? "Disable page" : "Enable page"}
                        >
                          <i className={`bi ${page.enabled ? "bi-eye-slash" : "bi-eye"}`}></i>
                        </button>

                        <button
                          onClick={() => handleDuplicate(page.slug)}
                          className="btn btn-sm btn-outline-secondary"
                          title="Duplicate page"
                        >
                          <i className="bi bi-files"></i>
                        </button>

                        <button
                          onClick={() => setConfirmDelete(page.slug)}
                          className="btn btn-sm btn-outline-danger"
                          title="Delete page"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePageModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            reloadPages();
            setShowCreateModal(false);
          }}
          onMessage={setSuccessMessage}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Page"
          message={`Are you sure you want to delete "${pages.find((p) => p.slug === confirmDelete)?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* PDF Page Editor */}
      {editingPDFPage && (
        <PDFPageEditor
          page={editingPDFPage}
          onSave={handleSavePDF}
          onCancel={() => { setEditingPDFPage(null); setEditParam(null); }}
        />
      )}

      {/* Form Page Editor */}
      {editingFormPage && (
        <FormPageEditor
          page={editingFormPage}
          onSave={handleSaveForm}
          onCancel={() => { setEditingFormPage(null); setEditParam(null); }}
        />
      )}

      {/* Designer Page Editor */}
      {editingDesignerPage && (
        <DesignerPageEditorModal
          slug={editingDesignerPage.slug}
          title={editingDesignerPage.title}
          designerData={designerPageData}
          onSave={handleSaveDesigner}
          onClose={() => { setEditingDesignerPage(null); setDesignerPageData(null); setEditParam(null); }}
        />
      )}

      {/* SEO Page Editor */}
      {seoEditingPage && (
        <SeoPageEditorModal
          slug={seoEditingPage.slug}
          pageTitle={seoEditingPage.title}
          onClose={() => setSeoEditingPage(null)}
        />
      )}
    </AdminLayout>
  );
}

function CreatePageModal({
  onClose,
  onSuccess,
  onMessage,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onMessage: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PageType>("designer");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter a page title");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const { createPage } = await import("@/lib/page-manager");
      const newPage = createPage(title, type);

      onMessage(`Page "${newPage.title}" created successfully`);
      onSuccess();

      // Designer pages open the editor via modal — no redirect needed
    } catch (error) {
      console.error("Create failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create page"
      );
      setIsCreating(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create New Page</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isCreating}
            ></button>
          </div>
          <div className="modal-body">
            {errorMessage && (
              <div className="alert alert-danger mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {errorMessage}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Page Title</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="About Us"
                autoFocus
              />
              <div className="form-text">
                URL slug will be generated automatically (e.g., "about-us")
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Page Type</label>
              <div className="d-grid gap-2">
                {(["designer", "pdf", "form"] as PageType[]).map((pageType) => (
                  <button
                    key={pageType}
                    onClick={() => setType(pageType)}
                    className={`btn text-start ${type === pageType ? `btn-${PAGE_TYPE_COLORS[pageType]}` : "btn-outline-secondary"}`}
                  >
                    <i className={`bi ${PAGE_TYPE_ICONS[pageType]} me-2`}></i>
                    <strong>{PAGE_TYPE_LABELS[pageType]}</strong>
                    <div className="small mt-1">
                      {pageType === "designer" &&
                        "Visual drag-and-drop page builder — unlimited height, no snap constraints"}
                      {pageType === "pdf" &&
                        "Display a PDF document with embed/download options"}
                      {pageType === "form" &&
                        "Create a contact or inquiry form with custom fields"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={isCreating || !title.trim()}
            >
              {isCreating ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-plus-lg me-2"></i>
                  Create Page
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
