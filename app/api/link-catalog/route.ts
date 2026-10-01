/**
 * GET /api/link-catalog
 *
 * ONE shared, server-backed catalog of every internal link/navigation target
 * an admin picker (Designer "Navigation Target", section editor modals, hero
 * buttons, navbar CTA, etc.) should be able to offer. Exists because those
 * pickers were independently hand-rolled in several places (see
 * components/admin/LinkPicker.tsx, public/flexible-designer.html's
 * loadNavOptions(), app/admin/content/navbar/page.tsx) and kept drifting out
 * of sync — most recently loadNavOptions() silently fell back to almost
 * nothing because it read dead localStorage keys instead of the DB. Any new
 * page/section/document/image/enabled-plugin/policy should appear in every
 * picker automatically by querying this endpoint, with zero picker-side code
 * changes.
 *
 * ASSUMPTIONS:
 * 1. Every current and future consumer is an admin-only surface (Designer,
 *    section/CTA/navbar editors) that already carries the httpOnly
 *    `access_token` session cookie — none of these pickers are rendered on a
 *    public, unauthenticated page.
 * 2. It is therefore safe and consistent to gate this endpoint the same way
 *    as its two strictest constituent sources, /api/pages and /api/media
 *    (both require VIEWER role) — this endpoint would otherwise expose page
 *    titles/slugs and media filenames to anonymous callers, which those two
 *    routes already treat as requiring auth. /api/sections and
 *    /api/policies?enabled=true are public in isolation, but compositing
 *    them behind the same VIEWER gate as the rest is strictly more
 *    conservative than any individual source, never less.
 * 3. The "Features" group only requires the same VIEWER floor as the rest of
 *    this endpoint, NOT the SUPER_ADMIN gate GET /api/features itself uses.
 *    That gate protects /api/features's full row (including `config`, which
 *    can hold sensitive per-plugin settings); this group only ever selects
 *    `slug`/`name`, the exact subset GET /api/features/public already
 *    exposes with ZERO auth (see that route) for the public Navbar's Tools
 *    dropdown. Since an unauthenticated visitor can already see every
 *    enabled feature's slug/name, gating this narrower, admin-only copy of
 *    the same subset any higher than VIEWER added no real protection — it
 *    only hid "Coverage Map"-style link options from EDITOR/PUBLISHER admins
 *    who should be able to link to them.
 * 4. The "Policies" group additionally requires the "policies" Plugin row to
 *    be enabled (matching GET /api/policies?enabled=true's existing gate),
 *    so disabling that plugin removes it from every picker at once.
 *
 * FAILURE MODES:
 * - A source table query throws → caught per-section so one bad group
 *   (e.g. a plugin table issue) degrades to an empty group instead of
 *   failing the whole catalog for every picker on the page.
 *
 * SECTIONS GROUP — cross-page + product deep-links (2026-10):
 * Previously scoped to a single `pageSlug` query param (default "/"), which
 * meant a button on page A could never target a section on page B through
 * this catalog — each picker's OWN page had to separately supply its own
 * section list as the `sectionOptions` prop (see LinkPicker.tsx). Every
 * enabled page's own sections now appear in one flat "Sections" group, each
 * option's value carrying that section's OWNING page path
 * (`{pagePath}#{id}`) so the stored href is portable: a visitor on any page
 * following a `{pagePath}#{id}` link gets a normal cross-page navigation that
 * lands with the anchor already in the URL, and the SAME value still
 * resolves identically when the visitor is already on that page (a native
 * same-page anchor jump — `/#id` and `#id` behave the same once the
 * pathname already matches). `pageSlug` is no longer read; every consumer
 * gets the full cross-page list and merges/dedupes locally (see
 * LinkPicker.tsx).
 *
 * Each section option is additionally annotated with `productScope` when
 * that section's content contains a `type: "template"` block bound to live
 * package data (see lib/product-deep-link.ts's findProductTemplateScope) —
 * detected structurally (block type + bound props), never by a hardcoded
 * template id/section name, per this white-label CMS's "no client-specific
 * references" rule. LinkPicker uses that annotation to offer cascading
 * Category/Sub-type pickers for a deep link into that section.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireRole,
  successResponse,
  handleApiError,
} from "@/lib/api-middleware";
import { getPlugin } from "@/lib/plugins/registry";
import { BUILTIN_MANIFESTS } from "@/lib/plugins/manifests";
import { findProductTemplateScope, type ProductScope } from "@/lib/product-deep-link";

interface LinkOption {
  value: string;
  label: string;
  /** Present only on a "Sections" option whose section contains a live
   * product-bound `type: "template"` block — see findProductTemplateScope.
   * Other groups/options never set this. */
  productScope?: ProductScope;
}

interface LinkGroup {
  key: string;
  label: string;
  icon: string;
  options: LinkOption[];
}

/** Dedupe options by value, first occurrence wins (e.g. a PDF page + a PDF media asset sharing a URL). */
function dedupe(options: LinkOption[]): LinkOption[] {
  const seen = new Set<string>();
  const out: LinkOption[] = [];
  for (const o of options) {
    if (!o.value || seen.has(o.value)) continue;
    seen.add(o.value);
    out.push(o);
  }
  return out;
}

/**
 * Runs one group's data fetch in isolation: a thrown error (DB/table issue,
 * bad query, etc.) degrades that single group to `fallback` instead of
 * rejecting and failing the whole catalog response for every picker on the
 * page (see module FAILURE MODES above). Still logs server-side so a real
 * outage remains visible even though the HTTP response stays 200.
 */
async function safeFetch<T>(label: string, fn: () => Promise<T>, fallback: NoInfer<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[link-catalog] "${label}" group failed, degrading to empty:`, error);
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const [pageRows, pagesWithSections, documentAssets, imageAssets, policiesPlugin] =
      await Promise.all([
        safeFetch(
          "pages",
          () =>
            prisma.page.findMany({
              select: { slug: true, title: true, type: true, enabled: true, status: true },
            }),
          []
        ),
        safeFetch(
          "sections",
          () =>
            prisma.page.findMany({
              where: { enabled: true },
              select: {
                slug: true,
                title: true,
                sections: {
                  where: { enabled: true },
                  select: { id: true, navLabel: true, displayName: true, type: true, content: true },
                  orderBy: { order: "asc" },
                },
              },
            }),
          []
        ),
        safeFetch(
          "documents",
          () =>
            prisma.mediaAsset.findMany({
              where: { mimeType: "application/pdf" },
              select: { url: true, originalName: true, filename: true },
              orderBy: { createdAt: "desc" },
              take: 50,
            }),
          []
        ),
        safeFetch(
          "images",
          () =>
            prisma.mediaAsset.findMany({
              where: { mimeType: { startsWith: "image/" } },
              select: { url: true, originalName: true, filename: true, altText: true },
              orderBy: { createdAt: "desc" },
              take: 50,
            }),
          []
        ),
        getPlugin("policies").catch(() => null),
      ]);

    // ── Pages / Forms / PDF pages ───────────────────────────────────────────
    const enabledPages = pageRows.filter((p) => p.enabled && p.slug && p.slug !== "/");
    const publishedPages = enabledPages.filter((p) => p.status === "PUBLISHED");

    const pageOptions: LinkOption[] = publishedPages
      .filter((p) => !["FORM", "PDF"].includes(p.type))
      .map((p) => ({ value: `/${p.slug}`, label: p.title || p.slug }));

    // Forms & PDFs don't go through the "publish" flow — linkable as soon as enabled.
    const formOptions: LinkOption[] = enabledPages
      .filter((p) => p.type === "FORM")
      .map((p) => ({ value: `/${p.slug}`, label: p.title || p.slug }));

    const pdfPageOptions: LinkOption[] = enabledPages
      .filter((p) => p.type === "PDF")
      .map((p) => ({ value: `/${p.slug}`, label: p.title || p.slug }));

    // ── Sections (anchors), across ALL enabled pages ────────────────────────
    // See the module doc comment's "SECTIONS GROUP" section for why this
    // spans every page (not just one `pageSlug`) and how productScope is
    // derived.
    const sectionOptions: LinkOption[] = pagesWithSections.flatMap((page) => {
      const pagePath = page.slug === "/" ? "/" : `/${page.slug}`;
      return page.sections.map((s) => {
        const productScope = findProductTemplateScope(s.content);
        return {
          value: `${pagePath}#${s.id}`,
          label: `${page.title || pagePath}: ${s.navLabel || s.displayName || s.type || s.id}`,
          ...(productScope ? { productScope } : {}),
        };
      });
    });

    // ── Documents & PDFs (media library PDFs + PDF-type pages) ─────────────
    const documentOptions = dedupe([
      ...documentAssets
        .filter((m) => m.url)
        .map((m) => ({ value: m.url, label: m.originalName || m.filename || m.url })),
      ...pdfPageOptions,
    ]);

    // ── Images (media library) ──────────────────────────────────────────────
    const imageOptions = dedupe(
      imageAssets
        .filter((m) => m.url)
        .map((m) => ({
          value: m.url,
          label: m.altText || m.originalName || m.filename || m.url,
        }))
    );

    // ── Enabled plugin/feature public pages (Coverage Map, etc.) ────────────
    // Gated to the endpoint's own VIEWER floor, same as every other group —
    // NOT SUPER_ADMIN like GET /api/features itself. This only ever selects
    // slug/name (never `config`, which is what the stricter gate on
    // /api/features protects), and GET /api/features/public already exposes
    // that same subset with zero auth. See the module docstring, point 3.
    const features = await safeFetch(
      "features",
      () =>
        prisma.clientFeature.findMany({
          where: { enabled: true },
          select: { slug: true, name: true },
        }),
      []
    );
    const featureOptions: LinkOption[] = features
      .filter((f) => f.slug)
      .map((f) => {
        const manifest = BUILTIN_MANIFESTS.find((m) => m.id === f.slug);
        const publicRoute = manifest?.routes?.public?.[0];
        return { value: publicRoute || `/${f.slug}`, label: f.name || f.slug };
      });

    // ── Policies (only when the Policies plugin is enabled) ────────────────
    let policyOptions: LinkOption[] = [];
    if (policiesPlugin?.enabled) {
      const policies = await safeFetch(
        "policies",
        () =>
          prisma.policy.findMany({
            where: { enabled: true },
            select: { slug: true, title: true, navLabel: true },
            orderBy: { order: "asc" },
          }),
        []
      );
      policyOptions = policies.map((p) => ({
        value: `/policies/${p.slug}`,
        label: p.navLabel || p.title,
      }));
    }

    const groups: LinkGroup[] = [
      { key: "pages", label: "Pages", icon: "bi-file-earmark-text", options: pageOptions },
      { key: "sections", label: "Sections", icon: "bi-link", options: sectionOptions },
      { key: "forms", label: "Forms", icon: "bi-ui-checks", options: formOptions },
      { key: "documents", label: "Documents & PDFs", icon: "bi-file-earmark-pdf", options: documentOptions },
      { key: "images", label: "Images", icon: "bi-image", options: imageOptions },
      { key: "features", label: "Features", icon: "bi-puzzle", options: featureOptions },
      { key: "policies", label: "Policies", icon: "bi-shield-check", options: policyOptions },
    ].filter((g) => g.options.length > 0);

    return successResponse({
      builtins: [{ value: "/", label: "Home" }],
      groups,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
