"use client"

import { useState, useEffect, useCallback, useRef } from "react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface BackupInfo {
  filename: string
  createdAt: string
  size: string
}

type RestoreCategory =
  | "everything"
  | "settings"
  | "pages"
  | "content"
  | "media"
  | "volt"
  | "users"
  | "plugins"
  | "forms"
  | "features"

const CATEGORY_OPTIONS: { value: RestoreCategory; label: string; icon: string }[] = [
  { value: "settings", label: "Settings & Config", icon: "bi-gear" },
  { value: "pages", label: "Pages & Sections", icon: "bi-file-earmark-text" },
  { value: "content", label: "Content Types & Entries", icon: "bi-collection" },
  { value: "media", label: "Media Assets & Uploads", icon: "bi-image" },
  { value: "volt", label: "Volt Designs & 3D Assets", icon: "bi-lightning" },
  { value: "users", label: "Users & API Keys", icon: "bi-people" },
  { value: "plugins", label: "Plugins & Features", icon: "bi-puzzle" },
  { value: "forms", label: "Form Submissions & Logs", icon: "bi-envelope" },
  { value: "features", label: "Coverage, Projects & Elements", icon: "bi-map" },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function BackupRestore() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "danger" | "warning"; text: string } | null>(null)

  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreSource, setRestoreSource] = useState<"existing" | "upload">("existing")
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<RestoreCategory>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Data Loading ─────────────────────────────────────────────────────────

  const loadBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backup/list")
      const json = await res.json()
      if (json.success) {
        setBackups(json.data)
      }
    } catch {
      setMessage({ type: "danger", text: "Failed to load backup list" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCreateBackup = async () => {
    setCreating(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/backup/create", { method: "POST" })
      const json = await res.json()
      if (json.success) {
        setMessage({
          type: "success",
          text: `Backup created: ${json.data.filename} (${json.data.size})`,
        })
        await loadBackups()
      } else {
        setMessage({ type: "danger", text: json.error?.message || "Backup failed" })
      }
    } catch {
      setMessage({ type: "danger", text: "Failed to create backup" })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete backup "${filename}"? This cannot be undone.`)) return
    setDeleting(filename)
    try {
      const res = await fetch(
        `/api/admin/backup/delete?file=${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      )
      const json = await res.json()
      if (json.success) {
        setMessage({ type: "success", text: `Deleted: ${filename}` })
        await loadBackups()
      } else {
        setMessage({ type: "danger", text: json.error?.message || "Delete failed" })
      }
    } catch {
      setMessage({ type: "danger", text: "Failed to delete backup" })
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = (filename: string) => {
    const url = `/api/admin/backup/download?file=${encodeURIComponent(filename)}`
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  const openRestoreModal = (source: "existing" | "upload", filename?: string) => {
    setRestoreSource(source)
    setSelectedBackup(filename || null)
    setUploadFile(null)
    setSelectedCategories(new Set())
    setSelectAll(false)
    setShowRestoreModal(true)
  }

  const toggleCategory = (cat: RestoreCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
    setSelectAll(false)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCategories(new Set())
      setSelectAll(false)
    } else {
      setSelectedCategories(new Set(CATEGORY_OPTIONS.map((c) => c.value)))
      setSelectAll(true)
    }
  }

  const handleRestore = async () => {
    if (selectedCategories.size === 0) {
      setMessage({ type: "warning", text: "Select at least one category to restore" })
      return
    }

    const categories: RestoreCategory[] = selectAll
      ? ["everything"]
      : Array.from(selectedCategories)

    const confirmed = confirm(
      `WARNING: This will REPLACE all data in the selected categories:\n\n` +
      `${categories.join(", ")}\n\n` +
      `A safety backup will be created first.\n\n` +
      `Are you absolutely sure?`
    )
    if (!confirmed) return

    setRestoring(true)
    setShowRestoreModal(false)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("categories", JSON.stringify(categories))

      if (restoreSource === "upload" && uploadFile) {
        formData.append("zipFile", uploadFile)
      } else if (restoreSource === "existing" && selectedBackup) {
        // Download the backup file first, then send it
        const dlRes = await fetch(
          `/api/admin/backup/download?file=${encodeURIComponent(selectedBackup)}`
        )
        if (!dlRes.ok) throw new Error("Failed to fetch backup file")
        const blob = await dlRes.blob()
        formData.append("zipFile", blob, selectedBackup)
      } else {
        setMessage({ type: "danger", text: "No backup file selected" })
        setRestoring(false)
        return
      }

      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()

      if (json.success) {
        const d = json.data
        setMessage({
          type: "success",
          text: `Restore complete! Restored ${d.tablesRestored} tables (${d.recordsRestored} records). ` +
            `Categories: ${d.restored.join(", ")}. ` +
            `Safety backup: ${d.preRestoreBackup}`,
        })
        await loadBackups()
      } else {
        setMessage({
          type: "danger",
          text: json.error?.message || "Restore failed",
        })
      }
    } catch (err: any) {
      setMessage({ type: "danger", text: `Restore failed: ${err.message}` })
    } finally {
      setRestoring(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <div>
      <h5 className="fw-semibold mb-4">
        <i className="bi bi-database me-2 text-warning"></i>
        Data Management
      </h5>

      {/* Status message */}
      {message && (
        <div className={`alert alert-${message.type} py-2 mb-3`}>
          <i
            className={`bi ${
              message.type === "success"
                ? "bi-check-circle"
                : message.type === "danger"
                  ? "bi-exclamation-triangle"
                  : "bi-info-circle"
            } me-2`}
          ></i>
          {message.text}
        </div>
      )}

      {/* Actions row */}
      <div className="d-flex gap-2 flex-wrap mb-4">
        <button
          className="btn btn-primary"
          onClick={handleCreateBackup}
          disabled={creating || restoring}
        >
          {creating ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Creating Backup...
            </>
          ) : (
            <>
              <i className="bi bi-archive me-2"></i>
              Create Full Backup
            </>
          )}
        </button>

        <button
          className="btn btn-outline-secondary"
          onClick={() => openRestoreModal("upload")}
          disabled={creating || restoring}
        >
          <i className="bi bi-upload me-2"></i>
          Upload & Restore
        </button>
      </div>

      {/* Backup list */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span className="fw-semibold">
            <i className="bi bi-clock-history me-2"></i>
            Backup History
          </span>
          <span className="badge bg-secondary">{backups.length} backups</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm me-2" />
              Loading backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-archive fs-3 d-block mb-2"></i>
              No backups yet. Create your first backup above.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Filename</th>
                    <th>Created</th>
                    <th>Size</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.filename}>
                      <td className="font-monospace small">{b.filename}</td>
                      <td className="small">{formatDate(b.createdAt)}</td>
                      <td className="small">{b.size}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleDownload(b.filename)}
                            title="Download"
                          >
                            <i className="bi bi-download"></i>
                          </button>
                          <button
                            className="btn btn-outline-success"
                            onClick={() => openRestoreModal("existing", b.filename)}
                            disabled={restoring}
                            title="Restore from this backup"
                          >
                            <i className="bi bi-arrow-counterclockwise"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(b.filename)}
                            disabled={deleting === b.filename}
                            title="Delete"
                          >
                            {deleting === b.filename ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Restoring overlay */}
      {restoring && (
        <div className="alert alert-info mt-3 d-flex align-items-center">
          <span className="spinner-border spinner-border-sm me-3" />
          <div>
            <strong>Restoring backup...</strong>
            <br />
            <small className="text-muted">
              A safety backup is being created first. This may take a moment.
            </small>
          </div>
        </div>
      )}

      {/* ── Restore Modal ─────────────────────────────────────────────────── */}
      {showRestoreModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRestoreModal(false)
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-arrow-counterclockwise me-2"></i>
                  Restore Backup
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRestoreModal(false)}
                />
              </div>
              <div className="modal-body">
                {/* Warning */}
                <div className="alert alert-warning py-2 mb-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> Restoring will REPLACE existing data in the selected
                  categories. A safety backup will be created automatically before restoring.
                </div>

                {/* Source info */}
                {restoreSource === "existing" && selectedBackup && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Restoring from:</label>
                    <div className="font-monospace small bg-light rounded p-2">
                      {selectedBackup}
                    </div>
                  </div>
                )}

                {restoreSource === "upload" && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Upload backup ZIP:</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="form-control"
                      accept=".zip"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </div>
                )}

                {/* Category selection */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Select categories to restore:
                  </label>

                  <div className="form-check mb-2 pb-2 border-bottom">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="cat-everything"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="cat-everything">
                      <i className="bi bi-check2-all me-2"></i>
                      Everything
                    </label>
                  </div>

                  <div className="row g-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <div key={cat.value} className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`cat-${cat.value}`}
                            checked={selectAll || selectedCategories.has(cat.value)}
                            disabled={selectAll}
                            onChange={() => toggleCategory(cat.value)}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`cat-${cat.value}`}
                          >
                            <i className={`${cat.icon} me-2`}></i>
                            {cat.label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRestoreModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleRestore}
                  disabled={
                    (restoreSource === "upload" && !uploadFile) ||
                    (selectedCategories.size === 0 && !selectAll)
                  }
                >
                  <i className="bi bi-arrow-counterclockwise me-2"></i>
                  Restore Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
