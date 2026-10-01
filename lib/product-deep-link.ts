/**
 * Product deep-link helpers — shared logic behind LinkPicker's cascading
 * Category/Sub-type pickers (components/admin/ProductDeepLinkFields.tsx) and
 * GET /api/link-catalog's per-section detection of a "Products"-style template
 * binding (app/api/link-catalog/route.ts).
 *
 * Lets an admin pick a link that deep-links into a specific product category
 * (Level 1, e.g. Fibre/Voice/Fixed Wireless) and, where applicable, a more
 * specific sub-type under it (Level 2, e.g. "Kuluntu Connect" under Fixed
 * Wireless) inside a FLEXIBLE section's `type: "template"` block that's bound
 * to live package data — WITHOUT this (white-label, shared) codebase ever
 * hardcoding a specific template id or section name. Detection is purely
 * structural: a block with `type === "template"` and a non-empty
 * `productTypeSlugs` and/or `networkSlug` prop.
 *
 * The stored link value format is intentionally a SINGLE slug identifier
 * appended to the section's own anchor link, not multiple separate params:
 *   `{pagePath}?product=<slug>#{sectionId}`
 * The query string sits BEFORE the hash — required ordering for native
 * anchor-scroll, since a param placed after "#" is part of the fragment, not
 * the query string, and getElementById-based scrolling never sees it.
 * `<slug>` is checked against BOTH levels by the consuming template (Level 2
 * first, since it's more specific; Level 1 otherwise) — see
 * resolveDeepLinkSelection below, which mirrors that same two-level check so
 * this picker's "what will this open" reasoning can never disagree with the
 * template's own runtime resolution.
 *
 * ASSUMPTIONS:
 * 1. Level 1 key = package.serviceCategorySlug, falling back to
 *    package.productTypeSlug when a product type has no linked
 *    ServiceCategory (same fallback the bound template's own topKey() uses —
 *    see app/api/packages/route.ts's serviceCategorySlug doc comment).
 * 2. Level 2 key = package.productTypeSlug directly, always.
 * 3. This module has no React/DOM dependency — safe to import from both a
 *    "use client" component and a server route.
 *
 * FAILURE MODES:
 * - Empty/malformed packages array → groupProductPackages returns [] (no
 *   Level 1 groups); callers render "no categories" rather than throwing.
 * - A value string with no "#" (shouldn't occur for a Sections option, which
 *   always carries one) → parseProductLinkValue treats the whole string as
 *   `base`, product: null; composeProductLinkValue returns `base` unchanged.
 */

export interface ProductScope {
  productTypeSlugs?: string[];
  networkSlug?: string;
}

export interface DeepLinkPackage {
  productTypeSlug: string | null;
  productTypeName: string | null;
  serviceCategorySlug: string | null;
  serviceCategoryName: string | null;
}

export interface DeepLinkLevel2 {
  key: string;
  name: string;
}

export interface DeepLinkLevel1 {
  key: string;
  name: string;
  subTypes: DeepLinkLevel2[];
}

function topKey(p: DeepLinkPackage): string | null {
  return p.serviceCategorySlug || p.productTypeSlug;
}
function topName(p: DeepLinkPackage): string {
  return p.serviceCategoryName || p.productTypeName || p.productTypeSlug || "";
}

/**
 * Groups packages the same way the bound template's own boot()/render()
 * groups them: Level 1 by topKey (serviceCategorySlug||productTypeSlug),
 * Level 2 within each Level 1 by productTypeSlug. First-seen order is
 * preserved, matching the template's own groupBy-driven tab order.
 */
export function groupProductPackages(packages: DeepLinkPackage[]): DeepLinkLevel1[] {
  const level1Order: string[] = [];
  const level1Map = new Map<string, { name: string; packages: DeepLinkPackage[] }>();

  for (const p of packages) {
    const key = topKey(p);
    if (!key) continue;
    if (!level1Map.has(key)) {
      level1Map.set(key, { name: topName(p), packages: [] });
      level1Order.push(key);
    }
    level1Map.get(key)!.packages.push(p);
  }

  return level1Order.map((key) => {
    const entry = level1Map.get(key)!;
    const level2Order: string[] = [];
    const level2Map = new Map<string, string>();
    for (const p of entry.packages) {
      if (!p.productTypeSlug) continue;
      if (!level2Map.has(p.productTypeSlug)) {
        level2Map.set(p.productTypeSlug, p.productTypeName || p.productTypeSlug);
        level2Order.push(p.productTypeSlug);
      }
    }
    return {
      key,
      name: entry.name,
      subTypes: level2Order.map((k) => ({ key: k, name: level2Map.get(k)! })),
    };
  });
}

/**
 * Given a target slug and the live-grouped packages, resolves which Level 1
 * (and, if matched, Level 2) it identifies — Level 2 checked first since it's
 * more specific. Mirrors the required template `boot()` patch's
 * dlByType/dlByTop resolution exactly (see this module's doc comment).
 */
export function resolveDeepLinkSelection(
  groups: DeepLinkLevel1[],
  slug: string | null
): { top: string | null; type: string | null } {
  if (!slug) return { top: null, type: null };
  for (const g of groups) {
    const match = g.subTypes.find((s) => s.key === slug);
    if (match) return { top: g.key, type: match.key };
  }
  const topMatch = groups.find((g) => g.key === slug);
  if (topMatch) return { top: topMatch.key, type: null };
  return { top: null, type: null };
}

/**
 * Splits a composed/plain Sections link value into its page-path+anchor
 * "base" and optional "product" deep-link slug.
 */
export function parseProductLinkValue(value: string): { base: string; product: string | null } {
  const qIndex = value.indexOf("?product=");
  if (qIndex === -1) return { base: value, product: null };
  const hashIndex = value.indexOf("#", qIndex);
  const path = value.slice(0, qIndex);
  const rawProduct =
    hashIndex === -1
      ? value.slice(qIndex + "?product=".length)
      : value.slice(qIndex + "?product=".length, hashIndex);
  const anchor = hashIndex === -1 ? "" : value.slice(hashIndex);
  let product: string | null = null;
  try {
    product = rawProduct ? decodeURIComponent(rawProduct) : null;
  } catch {
    product = rawProduct || null;
  }
  return { base: `${path}${anchor}`, product };
}

/**
 * Composes `{path}?product=<slug>#{id}` from a plain Sections base value
 * (`{path}#{id}`) and a chosen Level1/Level2 slug. Returns `base` unchanged
 * when `slug` is null/empty (nothing selected yet) or `base` doesn't contain
 * a "#" (not a Sections value — defensive, shouldn't occur from this picker).
 */
export function composeProductLinkValue(base: string, slug: string | null): string {
  if (!slug) return base;
  const hashIndex = base.indexOf("#");
  if (hashIndex === -1) return base;
  const path = base.slice(0, hashIndex);
  const anchor = base.slice(hashIndex);
  return `${path}?product=${encodeURIComponent(slug)}${anchor}`;
}

/**
 * Recursively scans a FLEXIBLE section's `content` JSON (which may nest
 * blocks under designerData / per-breakpoint desktop/tablet/mobile variants —
 * see components/sections/FlexibleSectionRenderer.tsx) for a "template" block
 * bound to live package data. Detection is structural (block
 * `type === "template"` plus a non-empty `productTypeSlugs` or `networkSlug`
 * prop) rather than tied to any specific template id/name, per this
 * white-label CMS's "no client-specific references" rule.
 *
 * Deliberately permissive about WHERE in the JSON tree the block sits (does
 * not replicate FlexibleSectionRenderer's breakpoint-resolution logic, which
 * picks the single "effective" block set for a given viewport) — this is a
 * capability check ("can this section deep-link at all"), not a render
 * decision, so finding the binding under ANY breakpoint variant is correct
 * here even though only one variant would actually be live at a time.
 *
 * Returns the FIRST matching binding found; null when none exists.
 */
export function findProductTemplateScope(node: unknown, depth = 0): ProductScope | null {
  if (!node || typeof node !== "object" || depth > 8) return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProductTemplateScope(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;

  if (obj.type === "template" && obj.props && typeof obj.props === "object") {
    const props = obj.props as Record<string, unknown>;
    const productTypeSlugs = Array.isArray(props.productTypeSlugs)
      ? (props.productTypeSlugs as unknown[]).filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0
        )
      : [];
    const networkSlug =
      typeof props.networkSlug === "string" && props.networkSlug.trim()
        ? props.networkSlug.trim()
        : null;
    if (productTypeSlugs.length > 0) return { productTypeSlugs };
    if (networkSlug) return { networkSlug };
  }

  for (const value of Object.values(obj)) {
    const found = findProductTemplateScope(value, depth + 1);
    if (found) return found;
  }
  return null;
}
