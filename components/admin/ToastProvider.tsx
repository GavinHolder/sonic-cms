"use client";

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, variant: Toast["variant"], duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: Toast["variant"], duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newToast: Toast = { id, message, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      // Each toast owns its own timer, so toasts close independently of one another.
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  // The context value keeps ONE identity for the whole lifetime of the provider. Pages
  // list `toast` in effect/callback dependency arrays (their data-loading effects, for
  // example); a value rebuilt on every toast add/close re-ran those effects, which
  // refetched and visibly "refreshed" the page each time a toast appeared or closed.
  // The toast list itself is deliberately NOT part of this value: only ToastContainer
  // below reads it.
  const value = useMemo<ToastContextType>(
    () => ({
      addToast,
      removeToast,
      success: (message, duration) => addToast(message, "success", duration),
      error: (message, duration) => addToast(message, "error", duration),
      info: (message, duration) => addToast(message, "info", duration),
      warning: (message, duration) => addToast(message, "warning", duration),
    }),
    [addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  const variantStyles = {
    success: { bg: "#d1e7dd", border: "#198754", icon: "✓", color: "#0f5132" },
    error: { bg: "#f8d7da", border: "#dc3545", icon: "✕", color: "#842029" },
    info: { bg: "#cfe2ff", border: "#0d6efd", icon: "ℹ", color: "#084298" },
    warning: { bg: "#fff3cd", border: "#ffc107", icon: "⚠", color: "#664d03" },
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "400px",
      }}
    >
      {toasts.map((toast) => {
        const style = variantStyles[toast.variant];
        return (
          <div
            key={toast.id}
            className="shadow-lg"
            style={{
              backgroundColor: style.bg,
              border: `2px solid ${style.border}`,
              borderRadius: "0.5rem",
              padding: "1rem",
              display: "flex",
              alignItems: "start",
              gap: "0.75rem",
              animation: "slideInRight 0.3s ease-out",
              color: style.color,
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: style.border,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.875rem",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {style.icon}
            </div>
            <div className="flex-grow-1" style={{ fontSize: "0.875rem", lineHeight: "1.5" }}>
              {toast.message}
            </div>
            <button
              type="button"
              aria-label="Close notification"
              onClick={() => onClose(toast.id)}
              style={{
                background: "none",
                border: "none",
                color: style.color,
                fontSize: "1.25rem",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
                opacity: 0.6,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
            >
              ×
            </button>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
