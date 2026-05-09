"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import MediaFolderTree, { type FolderNode, type FolderView } from "./MediaFolderTree";
import MediaMoveModal from "./MediaMoveModal";

// ── Types ────────────────────────────────────────────────────────────────────

interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  url: string;
  thumbnailUrl: string | null;
  folderId: string | null;
  usageCount: number;
  createdAt: string;
}

type MimeFilter = "" | "image" | "video" | "document";

// ── Utilities ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function mimeCategory(mimeType: string): "image" | "video" | "document" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "document";
  return "other";
}

// ── Page shell ───────────────────────────────────────────────────────────────

export default function MediaLibrary() {
  return (
    <AdminLayout title="Media Library" subtitle="Organise and manage your uploaded files">
      <MediaLibraryContent />
    </AdminLayout>
  );
}

// ── Inner content ────────────────────────────────────────────────────────────

function MediaLibraryContent() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder sidebar
  const [folderView, setFolderView] = useState<FolderView>("all");
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [uncategorisedCount, setUncategorisedCount] = useState(0);

  // Asset grid
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Filters / pagination
  const [search, setSearch] = useState("");
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<10 | 20>(20);

  // Drag-and-drop
  const [draggingAsset, setDraggingAsset] = useState<MediaAsset | null>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveActive, setBulkMoveActive] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Modals
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState<MediaAsset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [moveModal, setMoveModal] = useState<MediaAsset | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<FolderNode | null>(null);
  const [renameName, setRenameName] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [createFolderName, setCreateFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderNode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Data loaders ────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/media/folders");
      if (!res.ok) return;
      const json = await res.json();
      setFolders(json.data.folders);
      setTotalAssets(json.data.totalAssets);
      setUncategorisedCount(json.data.uncategorisedCount);
    } catch { /* silent */ }
  }, []);

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (folderView !== "all") params.set("folderId", folderView);
      if (search) params.set("search", search);
      if (mimeFilter) params.set("mimeType", mimeFilter);
      const res = await fetch(`/api/media?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAssets(json.data.media);
      setTotal(json.meta.total);
      setTotalPages(json.meta.totalPages);
    } catch {
      toast.error("Failed to load media");
    } finally {
      setLoadingAssets(false);
    }
  }, [folderView, search, mimeFilter, page, perPage, toast]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadAssets(); }, [loadAssets]);
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [folderView, search, mimeFilter, perPage]);

  // ── Upload ───────────────────────────────────────────────────

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const targetFolderId =
      typeof folderView === "string" && folderView !== "all" && folderView !== "uncategorised"
        ? folderView : null;
    const baseUrl = targetFolderId
      ? `/api/media/upload-simple?folderId=${targetFolderId}`
      : "/api/media/upload-simple";
    let ok = 0, fail = 0;
    for (let i = 0; i < fileList.length; i++) {
      const fd = new FormData();
      fd.append("file", fileList[i]);
      try {
        const res = await fetch(baseUrl, { method: "POST", body: fd });
        if (res.ok) { ok++; } else {
          fail++;
          const d = await res.json();
          toast.error(`"${fileList[i].name}": ${d.error ?? "Upload failed"}`);
        }
      } catch { fail++; toast.error(`"${fileList[i].name}": Upload failed`); }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (ok > 0) toast.success(ok === 1 ? "File uploaded" : `${ok} files uploaded`);
    await Promise.all([loadFolders(), loadAssets()]);
  };

  // ── Move asset ──────────────────────────────────────────────

  const handleMove = useCallback(async (assetId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/media/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Moved");
      await Promise.all([loadFolders(), loadAssets()]);
    } catch {
      toast.error("Failed to move file");
    }
  }, [toast, loadFolders, loadAssets]);

  // ── Delete asset ────────────────────────────────────────────

  const handleDeleteAsset = async (asset: MediaAsset) => {
    try {
      const res = await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message ?? "Delete failed");
      }
      toast.success(`"${asset.originalName}" deleted`);
      setConfirmDeleteAsset(null);
      if (previewAsset?.id === asset.id) setPreviewAsset(null);
      await Promise.all([loadFolders(), loadAssets()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  // ── Copy URL ────────────────────────────────────────────────

  const handleCopyUrl = async (asset: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + asset.url);
      setCopiedId(asset.id);
      toast.success("URL copied");
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error("Failed to copy"); }
  };

  // ── Bulk operations ─────────────────────────────────────────

  const handleBulkMove = async (folderId: string | null) => {
    setBulkMoveActive(false);
    const ids = Array.from(selectedIds);
    for (const id of ids) await handleMove(id, folderId);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    setConfirmBulkDelete(false);
    const ids = Array.from(selectedIds);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
        if (res.ok) { ok++; } else { fail++; }
      } catch { fail++; }
    }
    setSelectedIds(new Set());
    if (ok > 0) toast.success(ok === 1 ? "File deleted" : `${ok} files deleted`);
    if (fail > 0) toast.error(`${fail} file${fail !== 1 ? "s" : ""} could not be deleted (in use)`);
    await Promise.all([loadFolders(), loadAssets()]);
  };

  // ── Folder CRUD ─────────────────────────────────────────────

  const submitCreateFolder = async () => {
    const name = createFolderName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: createFolderParentId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message ?? "Failed to create folder");
      }
      setShowCreateFolder(false);
      setCreateFolderName("");
      toast.success(`Folder "${name}" created`);
      await loadFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    }
  };

  const submitRenameFolder = async () => {
    if (!renameFolderTarget) return;
    const name = renameName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/media/folders/${renameFolderTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      setRenameFolderTarget(null);
      toast.success(`Renamed to "${name}"`);
      await loadFolders();
    } catch { toast.error("Failed to rename folder"); }
  };

  const submitDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      const res = await fetch(`/api/media/folders/${deleteFolderTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteFolderTarget(null);
      if (folderView === deleteFolderTarget.id) setFolderView("all");
      toast.success("Folder deleted");
      await Promise.all([loadFolders(), loadAssets()]);
    } catch { toast.error("Failed to delete folder"); }
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => handleUpload(e.target.files)}
      />

      <div
        className="d-flex overflow-hidden rounded border bg-white"
        style={{ height: "calc(100vh - 130px)", minHeight: 400 }}
      >
        {/* ── Folder sidebar ── */}
        <MediaFolderTree
          folders={folders}
          selected={folderView}
          totalAssets={totalAssets}
          uncategorisedCount={uncategorisedCount}
          onSelect={setFolderView}
          onCreateFolder={(parentId) => {
            setCreateFolderParentId(parentId);
            setCreateFolderName("");
            setShowCreateFolder(true);
          }}
          onRenameFolder={(f) => { setRenameFolderTarget(f); setRenameName(f.name); }}
          onDeleteFolder={setDeleteFolderTarget}
          onFolderDrop={async (folderId) => {
            if (!draggingAsset || draggingAsset.folderId === folderId) return;
            await handleMove(draggingAsset.id, folderId);
          }}
        />

        {/* ── Main panel ── */}
        <div className="flex-grow-1 d-flex flex-column overflow-hidden">

          {/* Toolbar */}
          <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom flex-shrink-0 flex-wrap">
            <div className="input-group input-group-sm" style={{ maxWidth: 240 }}>
              <span className="input-group-text"><i className="bi bi-search" /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search files…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>
                  <i className="bi bi-x" />
                </button>
              )}
            </div>

            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={mimeFilter}
              onChange={(e) => setMimeFilter(e.target.value as MimeFilter)}
            >
              <option value="">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value) as 10 | 20)}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>

            <div className="ms-auto d-flex align-items-center gap-2">
              {total > 0 && (
                <span className="text-muted small">{total} file{total !== 1 ? "s" : ""}</span>
              )}
              <button
                className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? <><span className="spinner-border spinner-border-sm me-1" />Uploading…</>
                  : <><i className="bi bi-cloud-arrow-up me-1" />Upload</>}
              </button>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-primary bg-opacity-10 flex-shrink-0">
              <i className="bi bi-check2-square text-primary" />
              <span className="small fw-semibold text-primary">{selectedIds.size} selected</span>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setBulkMoveActive(true)}>
                <i className="bi bi-folder-symlink me-1" />Move
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmBulkDelete(true)}>
                <i className="bi bi-trash me-1" />Delete
              </button>
              <button className="btn btn-sm btn-link text-muted ms-auto p-0 text-decoration-none" onClick={() => setSelectedIds(new Set())}>
                <i className="bi bi-x me-1" />Clear
              </button>
            </div>
          )}

          {/* Drag hint bar */}
          {draggingAsset && (
            <div className="bg-primary bg-opacity-10 border-bottom border-primary px-3 py-1 flex-shrink-0 d-flex align-items-center gap-2">
              <i className="bi bi-arrow-left-short text-primary fs-5" />
              <span className="small text-primary">
                Drop <strong>{draggingAsset.originalName}</strong> onto a folder to move it
              </span>
            </div>
          )}

          {/* Asset grid */}
          <div className="flex-grow-1 overflow-auto p-3">
            {loadingAssets ? (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : assets.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                <i className="bi bi-images" style={{ fontSize: "3rem", opacity: 0.25 }} />
                <p className="mt-2 mb-0 small">
                  {search || mimeFilter ? "No files match your filters" : "No files here yet"}
                </p>
              </div>
            ) : (
              <>
                <div className="row g-2">
                  {assets.map((asset) => (
                    <div key={asset.id} className="col-6 col-sm-4 col-md-3 col-xl-2">
                      <AssetCard
                        asset={asset}
                        isCopied={copiedId === asset.id}
                        isSelected={selectedIds.has(asset.id)}
                        hasSelection={selectedIds.size > 0}
                        onSelect={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(asset.id) ? next.delete(asset.id) : next.add(asset.id);
                          return next;
                        })}
                        onCopy={() => handleCopyUrl(asset)}
                        onPreview={() => setPreviewAsset(asset)}
                        onMove={() => setMoveModal(asset)}
                        onDelete={() => setConfirmDeleteAsset(asset)}
                        onDragStart={() => setDraggingAsset(asset)}
                        onDragEnd={() => setDraggingAsset(null)}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                    <span className="text-muted small">
                      {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                    </span>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <i className="bi bi-chevron-left" />
                      </button>
                      <span className="small px-1">Page {page} of {totalPages}</span>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {bulkMoveActive && (
        <MediaMoveModal
          assetName={`${selectedIds.size} file${selectedIds.size !== 1 ? "s" : ""}`}
          folders={folders}
          currentFolderId={null}
          onMove={handleBulkMove}
          onClose={() => setBulkMoveActive(false)}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          isOpen
          title="Delete Selected Files"
          message={`Delete ${selectedIds.size} file${selectedIds.size !== 1 ? "s" : ""}? Files in use will be skipped. This cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      {moveModal && (
        <MediaMoveModal
          assetName={moveModal.originalName}
          folders={folders}
          currentFolderId={moveModal.folderId}
          onMove={async (folderId) => {
            await handleMove(moveModal.id, folderId);
            setMoveModal(null);
          }}
          onClose={() => setMoveModal(null)}
        />
      )}

      {confirmDeleteAsset && (
        <ConfirmDialog
          isOpen
          title="Delete File"
          message={
            confirmDeleteAsset.usageCount > 0
              ? `"${confirmDeleteAsset.originalName}" is referenced ${confirmDeleteAsset.usageCount} time${confirmDeleteAsset.usageCount !== 1 ? "s" : ""} and cannot be deleted.`
              : `Delete "${confirmDeleteAsset.originalName}"? This cannot be undone.`
          }
          confirmText={confirmDeleteAsset.usageCount > 0 ? "Close" : "Delete"}
          variant="danger"
          onConfirm={() =>
            confirmDeleteAsset.usageCount > 0
              ? setConfirmDeleteAsset(null)
              : handleDeleteAsset(confirmDeleteAsset)
          }
          onCancel={() => setConfirmDeleteAsset(null)}
        />
      )}

      {deleteFolderTarget && (
        <ConfirmDialog
          isOpen
          title="Delete Folder"
          message={`Delete "${deleteFolderTarget.name}"? Files inside become uncategorised, subfolders are promoted.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={submitDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}

      {(showCreateFolder || !!renameFolderTarget) && (
        <FolderModal
          title={showCreateFolder ? "New Folder" : "Rename Folder"}
          value={showCreateFolder ? createFolderName : renameName}
          onChange={showCreateFolder ? setCreateFolderName : setRenameName}
          onConfirm={showCreateFolder ? submitCreateFolder : submitRenameFolder}
          onClose={() => { setShowCreateFolder(false); setRenameFolderTarget(null); }}
        />
      )}

      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          isCopied={copiedId === previewAsset.id}
          onCopy={() => handleCopyUrl(previewAsset)}
          onMove={() => { setPreviewAsset(null); setMoveModal(previewAsset); }}
          onDelete={() => { setPreviewAsset(null); setConfirmDeleteAsset(previewAsset); }}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </>
  );
}

// ── Asset Card ────────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset: MediaAsset;
  isCopied: boolean;
  isSelected: boolean;
  hasSelection: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onPreview: () => void;
  onMove: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function AssetCard({ asset, isCopied, isSelected, hasSelection, onSelect, onCopy, onPreview, onMove, onDelete, onDragStart, onDragEnd }: AssetCardProps) {
  const cat = mimeCategory(asset.mimeType);
  const inUse = asset.usageCount > 0;
  const thumb = asset.thumbnailUrl ?? (cat === "image" ? asset.url : null);

  return (
    <div
      className="card shadow-sm h-100"
      style={{
        cursor: "grab", overflow: "hidden", userSelect: "none",
        border: isSelected ? "2px solid #0d6efd" : "1px solid rgba(0,0,0,0.125)",
      }}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnd={onDragEnd}
    >
      {/* Thumbnail */}
      <div
        className="position-relative bg-light d-flex align-items-center justify-content-center"
        style={{ height: 110, cursor: "pointer" }}
        onClick={onPreview}
      >
        {/* Selection checkbox */}
        <div
          className="position-absolute"
          style={{ top: 4, left: 4, zIndex: 2 }}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          <input
            type="checkbox"
            className="form-check-input shadow-sm"
            checked={isSelected}
            readOnly
            style={{
              cursor: "pointer",
              width: 15, height: 15,
              opacity: isSelected || hasSelection ? 1 : 0.35,
            }}
          />
        </div>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={asset.originalName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : cat === "video" ? (
          <i className="bi bi-play-circle-fill text-info" style={{ fontSize: "2.2rem" }} />
        ) : cat === "document" ? (
          <i className="bi bi-file-earmark-pdf text-danger" style={{ fontSize: "2.2rem" }} />
        ) : (
          <i className="bi bi-file-earmark text-muted" style={{ fontSize: "2.2rem" }} />
        )}
        {inUse && (
          <span
            className="position-absolute top-0 start-0 m-1 badge bg-success"
            style={{ fontSize: "0.58rem" }}
            title={`Used ${asset.usageCount}×`}
          >
            <i className="bi bi-link me-1" />{asset.usageCount}
          </span>
        )}
        <span
          className="position-absolute bottom-0 end-0 m-1 badge bg-dark bg-opacity-50"
          style={{ fontSize: "0.55rem" }}
        >
          {formatBytes(asset.fileSize)}
        </span>
      </div>

      {/* Info + actions */}
      <div className="card-body p-2">
        <p
          className="mb-2 text-truncate"
          style={{ fontSize: "0.68rem", fontWeight: 500, lineHeight: 1.3 }}
          title={asset.originalName}
        >
          {asset.originalName}
        </p>
        <div className="d-flex gap-1">
          <button
            className={`btn btn-sm flex-fill ${isCopied ? "btn-success" : "btn-outline-secondary"}`}
            onClick={onCopy}
            title="Copy URL"
            style={{ fontSize: "0.6rem", padding: "2px 4px" }}
          >
            <i className={`bi ${isCopied ? "bi-check-lg" : "bi-link-45deg"}`} />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary flex-fill"
            onClick={onMove}
            title="Move to folder"
            style={{ fontSize: "0.6rem", padding: "2px 4px" }}
          >
            <i className="bi bi-folder-symlink" />
          </button>
          <button
            className={`btn btn-sm ${inUse ? "btn-outline-secondary" : "btn-outline-danger"} flex-fill`}
            onClick={onDelete}
            title={inUse ? "In use — cannot delete" : "Delete"}
            style={{ fontSize: "0.6rem", padding: "2px 4px" }}
          >
            <i className={`bi ${inUse ? "bi-lock" : "bi-trash"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Asset Preview Modal ───────────────────────────────────────────────────────

function AssetPreviewModal({ asset, isCopied, onCopy, onMove, onDelete, onClose }: {
  asset: MediaAsset;
  isCopied: boolean;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const cat = mimeCategory(asset.mimeType);

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title text-truncate fw-semibold" title={asset.originalName}>
              {asset.originalName}
            </h6>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body text-center p-3 bg-light">
            {cat === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.url}
                alt={asset.originalName}
                style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 4 }}
              />
            ) : cat === "video" ? (
              <video src={asset.url} controls style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 4 }} />
            ) : cat === "document" ? (
              <iframe src={asset.url} style={{ width: "100%", height: "60vh", border: "none", borderRadius: 4 }} title={asset.originalName} />
            ) : (
              <div className="py-5"><i className="bi bi-file-earmark text-muted" style={{ fontSize: "5rem" }} /></div>
            )}
          </div>
          <div className="modal-footer flex-wrap gap-2">
            <div className="me-auto text-muted small d-flex gap-3">
              <span><i className="bi bi-hdd me-1" />{formatBytes(asset.fileSize)}</span>
              {asset.width && asset.height && (
                <span><i className="bi bi-aspect-ratio me-1" />{asset.width}×{asset.height}</span>
              )}
              <span><i className="bi bi-calendar me-1" />{new Date(asset.createdAt).toLocaleDateString()}</span>
            </div>
            <button
              className={`btn btn-sm ${isCopied ? "btn-success" : "btn-outline-secondary"}`}
              onClick={onCopy}
            >
              <i className={`bi ${isCopied ? "bi-check-lg" : "bi-link-45deg"} me-1`} />
              {isCopied ? "Copied!" : "Copy URL"}
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={onMove}>
              <i className="bi bi-folder-symlink me-1" />Move
            </button>
            <a href={asset.url} download={asset.originalName} className="btn btn-sm btn-outline-primary">
              <i className="bi bi-download me-1" />Download
            </a>
            <button className="btn btn-sm btn-outline-danger" onClick={onDelete}>
              <i className="bi bi-trash me-1" />Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Folder Name Modal (create / rename) ───────────────────────────────────────

function FolderModal({ title, value, onChange, onConfirm, onClose }: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title fw-semibold">
              <i className="bi bi-folder-plus me-2 text-warning" />{title}
            </h6>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Folder name"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onConfirm()}
              autoFocus
            />
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={!value.trim()}>
              <i className="bi bi-check2 me-1" />Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
