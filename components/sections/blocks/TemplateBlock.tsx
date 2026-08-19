"use client";

import { useEffect, useState } from "react";
import { packageSlotValues, type PackageLike } from "@/lib/packages/format";

interface Props {
  /** Already {{cms.*}}/{{cms.media.*}}-substituted by the caller — this component only
   * handles the {{pkg.*}} layer, which needs a live product fetch. */
  html: string;
  css: string;
  productId?: string;
}

function applyPkgTokens(input: string, slots: Record<string, string>): string {
  if (!input) return input;
  return input.replace(/\{\{pkg\.([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => slots[`pkg.${key}`] ?? "");
}

/**
 * TemplateBlock — sandboxed-iframe renderer for the FLEXIBLE section "template" block
 * type, with an optional live Package binding. Split out of FlexibleSectionRenderer's
 * inline switch because the {{pkg.*}} substitution needs a client fetch (useEffect),
 * and that switch's cases can't call hooks conditionally — every other data-bound
 * block type (VoltBlock, CardTabsBlock, ProductGridBlock) follows this same split.
 *
 * Token convention matches VoltBlock/packageSlotValues exactly ({{pkg.name}},
 * {{pkg.price}}, {{pkg.speed}}...) so anyone who has authored a data-bound Volt card
 * already knows the field names for an uploaded HTML template.
 */
export default function TemplateBlock({ html, css, productId }: Props) {
  const [pkgSlots, setPkgSlots] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!productId) { setPkgSlots({}); return; }
    let active = true;
    fetch(`/api/packages?ids=${encodeURIComponent(productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const pkg = data && Array.isArray(data.packages) ? (data.packages[0] as PackageLike | undefined) : undefined;
        setPkgSlots(pkg ? packageSlotValues(pkg) : {});
      })
      .catch(() => { if (active) setPkgSlots({}); });
    return () => { active = false; };
  }, [productId]);

  const finalHtml = applyPkgTokens(html, pkgSlots);
  const finalCss = applyPkgTokens(css, pkgSlots);

  // sandbox="allow-scripts" WITHOUT allow-same-origin is deliberate — see
  // FlexibleSectionRenderer.tsx's "template" case for the full rationale: the frame
  // gets a unique opaque origin, so an uploaded template's script can run its own
  // visuals/interactivity but can never read the CMS admin's cookies/localStorage/DOM.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">${
    finalCss ? `<style>${finalCss}</style>` : ""
  }</head><body style="margin:0">${finalHtml}</body></html>`;

  return (
    <iframe
      title="Section template"
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      style={{ display: "block", width: "100%", height: "100%", border: 0 }}
    />
  );
}
