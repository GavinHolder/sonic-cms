"use client";

import { useState } from "react";

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  assetCount: number;
  children: FolderNode[];
}

export type FolderView = "all" | "uncategorised" | string;

interface TreeProps {
  folders: FolderNode[];
  selected: FolderView;
  totalAssets: number;
  uncategorisedCount: number;
  onSelect: (id: FolderView) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folder: FolderNode) => void;
  onDeleteFolder: (folder: FolderNode) => void;
  onFolderDrop?: (folderId: string | null) => void;
}

export default function MediaFolderTree({
  folders, selected, totalAssets, uncategorisedCount,
  onSelect, onCreateFolder, onRenameFolder, onDeleteFolder, onFolderDrop,
}: TreeProps) {
  const [ctx, setCtx] = useState<{ folder: FolderNode; x: number; y: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragOverId, setDragOverId] = useState<string | "uncategorised" | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const openCtx = (e: React.MouseEvent, folder: FolderNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ folder, x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className="d-flex flex-column bg-white border-end"
      style={{ width: 240, flexShrink: 0, overflowY: "auto" }}
    >
      {/* Context menu backdrop */}
      {ctx && (
        <div
          className="position-fixed"
          style={{ inset: 0, zIndex: 998 }}
          onClick={() => setCtx(null)}
        />
      )}

      {/* Context menu */}
      {ctx && (
        <div
          className="card shadow border py-1"
          style={{ position: "fixed", top: ctx.y, left: ctx.x, zIndex: 999, minWidth: 170 }}
        >
          <button
            className="btn btn-sm text-start px-3 py-2 border-0 rounded-0"
            onClick={() => { onRenameFolder(ctx.folder); setCtx(null); }}
          >
            <i className="bi bi-pencil me-2 text-muted" />Rename
          </button>
          <button
            className="btn btn-sm text-start px-3 py-2 border-0 rounded-0"
            onClick={() => { onCreateFolder(ctx.folder.id); setCtx(null); }}
          >
            <i className="bi bi-folder-plus me-2 text-muted" />New subfolder
          </button>
          <hr className="my-1" />
          <button
            className="btn btn-sm text-start px-3 py-2 border-0 rounded-0 text-danger"
            onClick={() => { onDeleteFolder(ctx.folder); setCtx(null); }}
          >
            <i className="bi bi-trash me-2" />Delete folder
          </button>
        </div>
      )}

      <div className="px-3 pt-3 pb-2 border-bottom">
        <span className="text-uppercase fw-semibold text-muted" style={{ fontSize: "0.68rem", letterSpacing: "0.06em" }}>
          Media Library
        </span>
      </div>

      <div className="flex-grow-1 overflow-auto p-2">
        {/* All Media */}
        <FolderButton
          icon="bi-images"
          label="All Media"
          count={totalAssets}
          active={selected === "all"}
          onClick={() => onSelect("all")}
        />

        {/* Uncategorised — droppable */}
        <FolderButton
          icon="bi-inbox"
          label="Uncategorised"
          count={uncategorisedCount}
          active={selected === "uncategorised"}
          onClick={() => onSelect("uncategorised")}
          className="mb-2"
          isDragOver={dragOverId === "uncategorised"}
          onDragOver={(e) => { e.preventDefault(); setDragOverId("uncategorised"); }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => { e.preventDefault(); setDragOverId(null); onFolderDrop?.(null); }}
        />

        {/* Folder tree */}
        {folders.length > 0 && (
          <div className="border-top pt-2">
            {folders.map((f) => (
              <FolderTreeNode
                key={f.id}
                folder={f}
                selected={selected}
                expanded={expanded}
                depth={0}
                dragOverId={dragOverId}
                onSelect={onSelect}
                onToggle={toggle}
                onCtx={openCtx}
                onSetDragOver={setDragOverId}
                onFolderDrop={onFolderDrop}
              />
            ))}
          </div>
        )}

        {folders.length === 0 && (
          <div className="text-center text-muted py-3" style={{ fontSize: "0.75rem" }}>
            No folders yet
          </div>
        )}
      </div>

      <div className="p-2 border-top">
        <button
          className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => onCreateFolder(null)}
        >
          <i className="bi bi-folder-plus" />
          <span style={{ fontSize: "0.82rem" }}>New Folder</span>
        </button>
      </div>
    </div>
  );
}

// ── Shared pill button ──────────────────────────────────────────────────────

function FolderButton({ icon, label, count, active, onClick, className = "",
  isDragOver, onDragOver, onDragLeave, onDrop }: {
  icon: string; label: string; count: number; active: boolean;
  onClick: () => void; className?: string;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  return (
    <button
      className={`btn btn-sm w-100 text-start d-flex align-items-center gap-2 rounded ${
        isDragOver ? "btn-outline-primary border-primary" : active ? "btn-primary" : "btn-light"
      } ${className}`}
      style={{ marginBottom: 2 }}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <i className={`bi ${icon}`} style={{ fontSize: "0.85rem" }} />
      <span className="flex-grow-1 text-truncate" style={{ fontSize: "0.82rem" }}>{label}</span>
      <span
        className={`badge rounded-pill ${active || isDragOver ? "bg-white text-primary" : "bg-secondary bg-opacity-25 text-secondary"}`}
        style={{ fontSize: "0.62rem" }}
      >
        {count}
      </span>
    </button>
  );
}

// ── Recursive folder node ────────────────────────────────────────────────────

interface NodeProps {
  folder: FolderNode;
  selected: FolderView;
  expanded: Set<string>;
  depth: number;
  dragOverId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onCtx: (e: React.MouseEvent, folder: FolderNode) => void;
  onSetDragOver: (id: string | null) => void;
  onFolderDrop?: (folderId: string | null) => void;
}

function FolderTreeNode({ folder, selected, expanded, depth, dragOverId,
  onSelect, onToggle, onCtx, onSetDragOver, onFolderDrop }: NodeProps) {
  const isOpen      = expanded.has(folder.id);
  const isActive    = selected === folder.id;
  const isDragOver  = dragOverId === folder.id;
  const hasChildren = folder.children.length > 0;

  return (
    <div>
      <div
        className={`d-flex align-items-center rounded mb-px ${
          isDragOver ? "bg-primary bg-opacity-10 border border-primary" : isActive ? "bg-primary text-white" : ""
        }`}
        style={{ paddingLeft: depth * 14 + 2, paddingRight: 4, paddingTop: 3, paddingBottom: 3, cursor: "pointer" }}
        onClick={() => onSelect(folder.id)}
        onContextMenu={(e) => onCtx(e, folder)}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onSetDragOver(folder.id); }}
        onDragLeave={(e) => { e.stopPropagation(); onSetDragOver(null); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onSetDragOver(null); onFolderDrop?.(folder.id); }}
      >
        {/* Chevron */}
        <button
          className={`btn btn-sm p-0 border-0 me-1 ${isActive ? "text-white" : "text-muted"}`}
          style={{ width: 14, height: 20, flexShrink: 0 }}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(folder.id); }}
        >
          {hasChildren && (
            <i className={`bi bi-chevron-${isOpen ? "down" : "right"}`} style={{ fontSize: "0.55rem" }} />
          )}
        </button>

        <i
          className={`bi bi-folder${isOpen && hasChildren ? "2-open" : ""} me-2 ${isActive ? "text-white" : isDragOver ? "text-primary" : "text-warning"}`}
          style={{ fontSize: "0.8rem", flexShrink: 0 }}
        />

        <span className="flex-grow-1 text-truncate" style={{ fontSize: "0.8rem", maxWidth: 110 }}>
          {folder.name}
        </span>

        <span
          className={`badge ms-1 rounded-pill ${isActive ? "bg-white text-primary" : "bg-secondary bg-opacity-25 text-secondary"}`}
          style={{ fontSize: "0.6rem" }}
        >
          {folder.assetCount}
        </span>
      </div>

      {isOpen && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              selected={selected}
              expanded={expanded}
              depth={depth + 1}
              dragOverId={dragOverId}
              onSelect={onSelect}
              onToggle={onToggle}
              onCtx={onCtx}
              onSetDragOver={onSetDragOver}
              onFolderDrop={onFolderDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
