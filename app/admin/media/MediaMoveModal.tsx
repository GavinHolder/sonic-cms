"use client";

import { useState } from "react";
import type { FolderNode } from "./MediaFolderTree";

interface Props {
  assetName: string;
  folders: FolderNode[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
  onClose: () => void;
}

export default function MediaMoveModal({ assetName, folders, currentFolderId, onMove, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(currentFolderId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title fw-semibold">
              <i className="bi bi-folder-symlink me-2 text-warning" />
              Move to folder
            </h6>
            <button className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body p-0" style={{ maxHeight: 380, overflowY: "auto" }}>
            <div className="px-3 pt-2 pb-1 border-bottom">
              <small className="text-muted">Moving: <strong>{assetName}</strong></small>
            </div>

            <div className="p-2">
              {/* Uncategorised (root) */}
              <PickerNode
                icon="bi-inbox"
                label="Uncategorised"
                isSelected={selected === null}
                depth={0}
                onClick={() => setSelected(null)}
              />

              {folders.map((f) => (
                <FolderPickerNode
                  key={f.id}
                  folder={f}
                  selected={selected}
                  expanded={expanded}
                  depth={0}
                  onSelect={setSelected}
                  onToggle={toggle}
                />
              ))}

              {folders.length === 0 && (
                <div className="text-muted text-center py-3 small">
                  No folders created yet
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onMove(selected)}
              disabled={selected === currentFolderId}
            >
              <i className="bi bi-check2 me-1" />
              Move here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Flat picker row ─────────────────────────────────────────────────────────

function PickerNode({ icon, label, isSelected, depth, onClick }: {
  icon: string; label: string; isSelected: boolean; depth: number; onClick: () => void;
}) {
  return (
    <div
      className={`d-flex align-items-center gap-2 rounded px-2 py-2 mb-px ${isSelected ? "bg-primary text-white" : ""}`}
      style={{ paddingLeft: depth * 16 + 8, cursor: "pointer" }}
      onClick={onClick}
    >
      <i className={`bi ${icon} ${isSelected ? "text-white" : "text-muted"}`} style={{ fontSize: "0.85rem" }} />
      <span className="small">{label}</span>
      {isSelected && <i className="bi bi-check2 ms-auto" />}
    </div>
  );
}

// ── Recursive folder picker ─────────────────────────────────────────────────

interface PickerProps {
  folder: FolderNode;
  selected: string | null;
  expanded: Set<string>;
  depth: number;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

function FolderPickerNode({ folder, selected, expanded, depth, onSelect, onToggle }: PickerProps) {
  const isOpen     = expanded.has(folder.id);
  const isSelected = selected === folder.id;
  const hasChildren = folder.children.length > 0;

  return (
    <div>
      <div
        className={`d-flex align-items-center gap-1 rounded px-2 py-2 mb-px ${isSelected ? "bg-primary text-white" : ""}`}
        style={{ paddingLeft: depth * 16 + 8, cursor: "pointer" }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <button
            className={`btn btn-sm p-0 border-0 ${isSelected ? "text-white" : "text-muted"}`}
            style={{ width: 14, flexShrink: 0 }}
            onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
          >
            <i className={`bi bi-chevron-${isOpen ? "down" : "right"}`} style={{ fontSize: "0.55rem" }} />
          </button>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        <i className={`bi bi-folder me-1 ${isSelected ? "text-white" : "text-warning"}`} style={{ fontSize: "0.8rem" }} />
        <span className="small flex-grow-1 text-truncate">{folder.name}</span>
        {isSelected && <i className="bi bi-check2" />}
      </div>

      {isOpen && hasChildren && folder.children.map((c) => (
        <FolderPickerNode
          key={c.id}
          folder={c}
          selected={selected}
          expanded={expanded}
          depth={depth + 1}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
