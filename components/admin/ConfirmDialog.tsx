"use client";

import { useState } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "primary";
  requiresTextInput?: boolean;
  expectedInput?: string;
  inputPlaceholder?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger",
  requiresTextInput = false,
  expectedInput,
  inputPlaceholder = "Type to confirm",
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresTextInput && expectedInput && inputValue !== expectedInput) {
      return; // Don't confirm if input doesn't match
    }
    onConfirm(inputValue);
    setInputValue("");
    onCancel();
  };

  const handleCancel = () => {
    setInputValue("");
    onCancel();
  };

  const buttonClass =
    variant === "danger"
      ? "btn-danger"
      : variant === "warning"
      ? "btn-warning"
      : "btn-primary";

  const iconClass =
    variant === "danger"
      ? "bi-exclamation-triangle-fill text-danger"
      : variant === "warning"
      ? "bi-exclamation-circle-fill text-warning"
      : "bi-info-circle-fill text-primary";

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="modal-backdrop fade show"
        onClick={handleCancel}
        style={{ zIndex: 1060 }}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 1065 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            {/* Header */}
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <i className={`bi ${iconClass}`}></i>
                {title}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCancel}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <div className="modal-body">
              <p className="mb-0" style={{ whiteSpace: "pre-line" }}>
                {message}
              </p>

              {requiresTextInput && (
                <div className="mt-3">
                  <label className="form-label fw-semibold">
                    {inputPlaceholder}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={expectedInput}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (!expectedInput || inputValue === expectedInput)) {
                        handleConfirm();
                      }
                    }}
                  />
                  {expectedInput && (
                    <div className="form-text">
                      Type <code>{expectedInput}</code> to confirm
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className={`btn ${buttonClass}`}
                onClick={handleConfirm}
                disabled={
                  !!(requiresTextInput &&
                  expectedInput &&
                  inputValue !== expectedInput)
                }
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
