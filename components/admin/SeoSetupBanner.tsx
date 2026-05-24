"use client";

import { useState, useEffect } from "react";
import SeoSetupWizardModal from "./SeoSetupWizardModal";
import type { SeoConfig } from "@/lib/seo-config";

const DISMISSED_KEY = "seo_setup_banner_dismissed";

interface Props {
  /** Pass canonicalBase from already-loaded config to avoid an extra fetch */
  canonicalBase?: string;
  /** Called after wizard saves so parent can refresh config */
  onApply?: (patch: Partial<SeoConfig>) => void;
}

export default function SeoSetupBanner({ canonicalBase: initialBase, onApply }: Props) {
  const [show, setShow] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if permanently dismissed
    if (typeof window !== "undefined") {
      const val = localStorage.getItem(DISMISSED_KEY);
      if (val === "true") { setDismissed(true); return; }
    }
    // If caller already knows canonicalBase, use it
    if (initialBase !== undefined) {
      setShow(!initialBase);
      return;
    }
    // Otherwise fetch
    fetch("/api/seo")
      .then((r) => r.json())
      .then((j) => {
        const cfg = j.data ?? j;
        setShow(!cfg.canonicalBase);
      })
      .catch(() => { /* don't show on fetch error */ });
  }, [initialBase]);

  function handleWizardApply(patch: Partial<SeoConfig>) {
    onApply?.(patch);
    // Dismiss permanently once wizard completes
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
    setDismissed(true);
    setShow(false);
  }

  function handleDismiss() {
    setShow(false);
    // Soft dismiss — will re-appear next session unless wizard completes
  }

  if (!show || dismissed) return null;

  return (
    <>
      <div className="alert alert-warning d-flex align-items-center gap-3 mb-4 shadow-sm" role="alert">
        <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5" />
        <div className="flex-grow-1">
          <strong>SEO is not fully configured.</strong>{" "}
          Your canonical base URL is missing — sitemap, canonical tags, and social previews won&apos;t work correctly until it&apos;s set.
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          <button
            type="button"
            className="btn btn-warning btn-sm fw-semibold"
            onClick={() => setWizardOpen(true)}
          >
            <i className="bi bi-magic me-1" />Complete SEO Setup
          </button>
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss"
            onClick={handleDismiss}
          />
        </div>
      </div>

      <SeoSetupWizardModal
        show={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onApply={handleWizardApply}
      />
    </>
  );
}
