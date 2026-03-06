"use client";

import { useEffect, useRef } from "react";
import { getCMSSettings } from "@/lib/cms-settings";

/**
 * useAutoSave
 *
 * Periodically calls `saveFn()` based on the admin's Editor Preferences settings.
 * Does nothing if autoSaveEnabled is false (default) or interval is < 5 seconds.
 *
 * @param saveFn - The function to call on each autosave tick. Should be stable
 *                 (wrap in useCallback or keep it inside useRef to avoid re-registering).
 * @param enabled - Optional override — pass `false` to disable regardless of settings.
 *
 * Usage:
 *   useAutoSave(() => handleSave(false));
 */
export function useAutoSave(saveFn: () => void, enabled = true) {
  const saveFnRef = useRef(saveFn);

  // Keep the ref current without causing re-subscriptions
  useEffect(() => {
    saveFnRef.current = saveFn;
  });

  useEffect(() => {
    if (!enabled) return;

    const settings = getCMSSettings();
    if (!settings.autoSaveEnabled) return;

    // Safety floor: never autosave faster than 5 seconds
    const intervalMs = Math.max(settings.autoSaveIntervalMs, 5000);

    const id = setInterval(() => {
      saveFnRef.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled]);
}
