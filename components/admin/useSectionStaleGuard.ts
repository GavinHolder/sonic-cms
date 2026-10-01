"use client";

import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/admin/ToastProvider";
import { SECTION_STALE_EVENT, SECTION_STALE_MESSAGE, type SectionStaleDetail } from "@/lib/section-stale-client";

/**
 * Editor-side handling of a 409 SECTION_STALE from PUT /api/sections/[id].
 * The editor calls stashDraft() right before it clears its localStorage draft on Save; if the save
 * is then rejected as stale, the draft is put back, the editor is re-marked dirty and a toast shows.
 * Never blocks or overwrites anything.
 */
export function useSectionStaleGuard(sectionId: string, draftKey: string, onStale: () => void) {
  let toast: ReturnType<typeof useToast> | null = null;
  try { toast = useToast(); } catch { /* rendered outside ToastProvider: skip the toast */ }
  const stash = useRef<string | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const onStaleRef = useRef(onStale);
  onStaleRef.current = onStale;

  const stashDraft = useCallback(() => {
    try { stash.current = localStorage.getItem(draftKey); } catch { stash.current = null; }
  }, [draftKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<SectionStaleDetail>).detail;
      if (!d || d.sectionId !== sectionId) return;
      if (stash.current) {
        try { localStorage.setItem(draftKey, stash.current); } catch {}
      }
      onStaleRef.current();
      toastRef.current?.error(SECTION_STALE_MESSAGE, 12000);
    };
    window.addEventListener(SECTION_STALE_EVENT, handler);
    return () => window.removeEventListener(SECTION_STALE_EVENT, handler);
  }, [sectionId, draftKey]);

  return { stashDraft };
}
