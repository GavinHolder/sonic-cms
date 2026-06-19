"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import ConfirmDialog from "./ConfirmDialog";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  requiresTextInput?: boolean;
  expectedInput?: string;
}
interface AlertOptions {
  title?: string;
  message: string;
  variant?: "danger" | "warning" | "primary";
  confirmText?: string;
}

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
  showAlert: (opts: AlertOptions | string) => Promise<void>;
}

const Ctx = createContext<ConfirmCtx | null>(null);

/** Promise-based confirm modal — replaces native window.confirm. */
export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm must be used within ConfirmProvider");
  return c.confirm;
}
/** Promise-based alert modal — replaces native window.alert. */
export function useAlert() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAlert must be used within ConfirmProvider");
  return c.showAlert;
}

interface DialogState {
  opts: ConfirmOptions;
  isAlert: boolean;
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback((o: ConfirmOptions | string) => {
    const opts = typeof o === "string" ? { message: o } : o;
    return new Promise<boolean>((resolve) => setState({ opts, isAlert: false, resolve }));
  }, []);

  const showAlert = useCallback((o: AlertOptions | string) => {
    const opts = typeof o === "string" ? { message: o } : o;
    return new Promise<void>((resolve) => setState({ opts, isAlert: true, resolve: () => resolve() }));
  }, []);

  return (
    <Ctx.Provider value={{ confirm, showAlert }}>
      {children}
      {state && (
        <ConfirmDialog
          isOpen
          title={state.opts.title ?? (state.isAlert ? "Notice" : "Please confirm")}
          message={state.opts.message}
          variant={state.opts.variant ?? (state.isAlert ? "primary" : "danger")}
          confirmText={state.opts.confirmText ?? (state.isAlert ? "OK" : "Confirm")}
          cancelText={(state.opts as ConfirmOptions).cancelText ?? "Cancel"}
          hideCancel={state.isAlert}
          requiresTextInput={(state.opts as ConfirmOptions).requiresTextInput}
          expectedInput={(state.opts as ConfirmOptions).expectedInput}
          onConfirm={() => { state.resolve(true); setState(null); }}
          onCancel={() => { state.resolve(false); setState(null); }}
        />
      )}
    </Ctx.Provider>
  );
}
