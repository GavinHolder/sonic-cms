"use client";

import { useEffect, useRef, useState } from "react";

interface PolicyEditorProps {
  value: string;
  onChange: (html: string) => void;
}

/**
 * PolicyEditor — lightweight contentEditable rich-text editor for legal prose.
 *
 * Stores innerHTML (sanitized again server-side on save). Toolbar uses
 * document.execCommand for H2/H3, bold, italic, bullet list, and link.
 * No external dependency. Legal docs are prose, so this is sufficient.
 *
 * The editor div is uncontrolled (innerHTML set imperatively) to avoid
 * caret-jump on every keystroke; React only seeds it when the incoming
 * `value` differs from the live DOM and the editor is not focused.
 */
export default function PolicyEditor({ value, onChange }: PolicyEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Link-insert modal (replaces native window.prompt). We must preserve the
  // editor's selection Range across the modal — opening it steals focus and
  // clears the caret, which document.execCommand("createLink") depends on.
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Seed / re-seed the editor when the external value changes and we're not
  // actively typing (prevents caret reset while editing).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const formatBlock = (tag: string) => exec("formatBlock", tag);

  const addLink = () => {
    // Preserve the live selection so we can restore it after the modal closes.
    const sel = window.getSelection();
    savedRange.current =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    setLinkUrl("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    setLinkOpen(false);
    if (!url) return;
    const el = ref.current;
    if (el) {
      el.focus();
      const sel = window.getSelection();
      if (savedRange.current && sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
    }
    document.execCommand("createLink", false, url);
    emit();
  };

  const btn = "btn btn-sm btn-outline-secondary";

  return (
    <div>
      <div className="d-flex flex-wrap gap-1 mb-2">
        <button type="button" className={btn} title="Heading 2" onClick={() => formatBlock("H2")}>
          H2
        </button>
        <button type="button" className={btn} title="Heading 3" onClick={() => formatBlock("H3")}>
          H3
        </button>
        <button type="button" className={btn} title="Paragraph" onClick={() => formatBlock("P")}>
          ¶
        </button>
        <span className="vr mx-1" />
        <button type="button" className={btn} title="Bold" onClick={() => exec("bold")}>
          <i className="bi bi-type-bold" />
        </button>
        <button type="button" className={btn} title="Italic" onClick={() => exec("italic")}>
          <i className="bi bi-type-italic" />
        </button>
        <button type="button" className={btn} title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <i className="bi bi-list-ul" />
        </button>
        <button type="button" className={btn} title="Insert link" onClick={addLink}>
          <i className="bi bi-link-45deg" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="form-control"
        style={{ minHeight: 280, overflowY: "auto", lineHeight: 1.6 }}
      />
      <div className="form-text">
        Basic formatting only — headings, bold/italic, bullet lists and links. Content is sanitized on save.
      </div>

      {/* Link-insert modal — replaces native window.prompt */}
      {linkOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            onClick={() => setLinkOpen(false)}
            style={{ zIndex: 1060 }}
          />
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1065 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title d-flex align-items-center gap-2">
                    <i className="bi bi-link-45deg text-primary" />
                    Insert link
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setLinkOpen(false)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <label className="form-label fw-semibold">Link URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="/policies/privacy-policy or https://…"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyLink();
                      if (e.key === "Escape") setLinkOpen(false);
                    }}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setLinkOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={applyLink} disabled={!linkUrl.trim()}>
                    Add link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
