"use client";

import { useEffect, useState } from "react";
import { packageSlotValues, type PackageLike } from "@/lib/packages/format";

interface Props {
  /** Already {{cms.*}}/{{cms.media.*}}-substituted by the caller — this component only
   * handles the {{pkg.*}} layer, which needs a live product fetch. */
  html: string;
  css: string;
  /** Single-product binding — fills {{pkg.*}} tokens directly (see applyPkgTokens). */
  productId?: string;
  /** Multi-card binding — the scoped package list is fetched here (parent, same-origin)
   * and handed to the template as window.CMS_TEMPLATE.packages, NOT fetched by the
   * template's own script. sandbox="allow-scripts" without allow-same-origin gives the
   * iframe an opaque origin, so its own fetch() calls carry Origin: null — our API
   * routes send no CORS headers for that, so a same-site fetch from inside the frame
   * is silently blocked. Fetching here and injecting the result sidesteps that entirely
   * without loosening the sandbox.
   *
   * productTypeSlugs supports MULTIPLE types (like CardTabsBlock/ProductGridBlock) so a
   * template can build its own top-level category tabs (Fibre/Wireless/Voice) from one
   * binding — each fetched type's packages keep their own productTypeSlug/Name, network,
   * and term fields, so the template's script can group by any of them itself. networkSlug
   * is a separate, single-network scope for "everything on this one network" instead. */
  networkSlug?: string;
  networkName?: string;
  productTypeSlugs?: string[];
  /** Admin-authored "Template Options" (Designer → block properties → Template Options).
   * Two conventions, both opt-in on the template author's side:
   *  - `{{tpl.<key>}}` / `{{tpl.<key>|Default text}}` tokens anywhere in the template's
   *    HTML or inside JS string literals in its own <script> — textual substitution over
   *    the raw source, same mechanism as {{pkg.*}}, so it also reaches JS that hasn't run
   *    yet (see applyTplTokens).
   *  - `--tpl-<key>` CSS custom properties declared by the template (typically on :root)
   *    — any key present here is emitted as a `:root{--tpl-key:value}` override <style>
   *    block placed AFTER the template's own <style>, so it wins on equal specificity.
   *    Keys are NOT present here unless the admin explicitly set a value; omitted keys
   *    leave the template's own declared default in effect. */
  templateOptions?: Record<string, string>;
}

interface ScopedPackage {
  id: string;
  name: string;
  speedDown: string | null;
  speedUp: string | null;
  price: string;
  period: string | null;
  term: string | null;
  features: unknown;
  popular: boolean;
  networkName: string | null;
  networkSlug: string | null;
  networkCategory: string | null;
  categoryId: string | null;
  categoryName: string | null;
  productTypeSlug: string | null;
  productTypeName: string | null;
  /** The product type's linked ServiceCategory, if any (see #111 in the sync doc) — null
   * for every product type until an admin opts in via the Product Types admin. Already
   * present on the raw /api/packages JSON response regardless of this type annotation;
   * declared here so a template's own script (reading window.CMS_TEMPLATE.packages) has
   * a documented, typed field to group its top-level tabs by. */
  serviceCategorySlug: string | null;
  serviceCategoryName: string | null;
}

function applyPkgTokens(input: string, slots: Record<string, string>): string {
  if (!input) return input;
  return input.replace(/\{\{pkg\.([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => slots[`pkg.${key}`] ?? "");
}

/**
 * Substitutes `{{tpl.<key>}}` / `{{tpl.<key>|Default text}}` tokens with the matching
 * entry from the admin-authored `templateOptions` map (Designer "Template Options"
 * panel), falling back to the token's own inline default, then to an empty string.
 * Runs on the raw HTML/CSS *source* text — same as applyPkgTokens — so a token sitting
 * inside a <script> tag's JS string literal is substituted before that script ever
 * executes in the sandboxed iframe, not after.
 *
 * ASSUMPTIONS:
 * 1. Keys are template-author-chosen identifiers matching [a-zA-Z0-9_]+ (no dots/braces).
 * 2. An inline default (after `|`) may not itself contain `}}`.
 * 3. options[key] === "" (admin cleared the field) is treated as "unset" so the
 *    template's own inline default (or "") applies — mirrors the CSS-var override
 *    behavior below, where an absent/empty key means "use the template's own default".
 */
function applyTplTokens(input: string, options: Record<string, string>): string {
  if (!input) return input;
  return input.replace(/\{\{tpl\.([a-zA-Z0-9_]+)(?:\|([^}]*))?\}\}/g, (_, key: string, fallback?: string) => {
    const val = options[key];
    if (val !== undefined && val !== "") return val;
    return fallback ?? "";
  });
}

/**
 * Builds a `:root{--tpl-key:value;...}` override <style> block from any `--tpl-*` keys
 * present in `templateOptions`. Only explicitly-set keys are emitted — a key the admin
 * never touched (or cleared) is simply omitted, leaving the template's own `--tpl-key:
 * default` declaration (in its own <style>) in effect. This override block must be
 * placed AFTER the template's own <style> in the srcDoc so it wins on equal :root
 * specificity (last-declared rule wins for identical selectors/specificity).
 */
function buildTplVarsStyle(options: Record<string, string>): string {
  const entries = Object.entries(options).filter(([k, v]) => k.startsWith("--tpl-") && v !== undefined && v !== "");
  if (entries.length === 0) return "";
  const decls = entries
    // Strip any accidental "</style" breakout attempt; admin-only content, but cheap to guard.
    .map(([k, v]) => `${k}:${String(v).replace(/<\/style/gi, "")}`)
    .join(";");
  return `<style>:root{${decls}}</style>`;
}

/**
 * TemplateBlock — sandboxed-iframe renderer for the FLEXIBLE section "template" block
 * type, with two optional live-data bindings. Split out of FlexibleSectionRenderer's
 * inline switch because both bindings need a client fetch (useEffect), and that
 * switch's cases can't call hooks conditionally — every other data-bound block type
 * (VoltBlock, CardTabsBlock, ProductGridBlock) follows this same split.
 *
 * - productId: single-product binding, fills {{pkg.*}} tokens directly into the
 *   template's HTML/CSS before it ever loads. Token names match packageSlotValues
 *   exactly, same convention as a data-bound Volt card slot.
 * - networkSlug / productTypeSlugs: multi-card binding. The scoped package list is
 *   fetched here and handed to the template as window.CMS_TEMPLATE.packages — for a
 *   template with its own multi-card grid + tab UI, self-contained but linked to the
 *   product subsystem (see components/sections/blocks/CardTabsBlock.tsx for the
 *   Designer-native equivalent of this same idea).
 */
export default function TemplateBlock({ html, css, productId, networkSlug, networkName, productTypeSlugs, templateOptions }: Props) {
  const [pkgSlots, setPkgSlots] = useState<Record<string, string>>({});
  const [scopedPackages, setScopedPackages] = useState<ScopedPackage[]>([]);
  const slugsKey = (productTypeSlugs || []).join(",");

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

  useEffect(() => {
    const slugs = slugsKey ? slugsKey.split(",") : [];
    let active = true;
    if (slugs.length > 0) {
      Promise.all(
        slugs.map((slug) =>
          fetch(`/api/packages?productType=${encodeURIComponent(slug)}`)
            .then((r) => (r.ok ? r.json() : { packages: [] }))
            .then((d) => (Array.isArray(d?.packages) ? (d.packages as ScopedPackage[]) : []))
            .catch(() => [] as ScopedPackage[])
        )
      ).then((results) => { if (active) setScopedPackages(results.flat()); });
    } else if (networkSlug) {
      fetch(`/api/packages?network=${encodeURIComponent(networkSlug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (active) setScopedPackages(data && Array.isArray(data.packages) ? (data.packages as ScopedPackage[]) : []); })
        .catch(() => { if (active) setScopedPackages([]); });
    } else {
      setScopedPackages([]);
    }
    return () => { active = false; };
  }, [slugsKey, networkSlug]);

  const tplOptions = templateOptions || {};
  const finalHtml = applyTplTokens(applyPkgTokens(html, pkgSlots), tplOptions);
  const finalCss = applyTplTokens(applyPkgTokens(css, pkgSlots), tplOptions);
  const tplVarsStyle = buildTplVarsStyle(tplOptions);

  // Read by the template's own script, not substituted into the markup. \u003c escaping
  // prevents a network/type name or package field containing "</script>" from breaking
  // out of this inline script (admin-authored data, but cheap to guard anyway).
  const templateContext = {
    productId: productId || null,
    networkSlug: networkSlug || null,
    networkName: networkName || null,
    productTypeSlugs: productTypeSlugs && productTypeSlugs.length ? productTypeSlugs : null,
    packages: scopedPackages,
  };
  const contextScript = `<script>window.CMS_TEMPLATE=${JSON.stringify(templateContext).replace(/</g, "\\u003c")};</script>`;

  // sandbox="allow-scripts" WITHOUT allow-same-origin is deliberate — see
  // FlexibleSectionRenderer.tsx's "template" case for the full rationale: the frame
  // gets a unique opaque origin, so an uploaded template's script can run its own
  // visuals/interactivity but can never read the CMS admin's cookies/localStorage/DOM.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">${
    finalCss ? `<style>${finalCss}</style>` : ""
  }${tplVarsStyle}${contextScript}</head><body style="margin:0">${finalHtml}</body></html>`;

  // Keyed on the live-data readiness, not just a static block id: mutating an
  // already-loaded iframe's srcdoc attribute in place does not reliably re-navigate
  // it in every browser (observed empirically — the attribute updates, the visible
  // document doesn't). Changing `key` forces React to mount a fresh iframe once the
  // product/network fetch resolves, guaranteeing a clean load of the final content
  // instead of racing an in-place update against an already-parsed document.
  const iframeKey = `${productId ?? ""}:${Object.keys(pkgSlots).length}:${scopedPackages.length}:${JSON.stringify(tplOptions)}`;

  return (
    <iframe
      key={iframeKey}
      title="Section template"
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      style={{ display: "block", width: "100%", height: "100%", border: 0 }}
    />
  );
}
