"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const VoltBlock = dynamic(() => import("@/components/sections/VoltBlock"), { ssr: false });

interface ProductGridPackage {
  id: string;
  name: string;
  networkSlug?: string | null;
  networkName?: string | null;
  // The package's OWN service category (Data/Voice/IoT/CCTV…) — unrelated to
  // serviceCategorySlug/-Name below, which is inherited from the package's product
  // type instead. Drives Layer 3 (innermost) filtering, unchanged from before.
  categoryId?: string | null;
  categoryName?: string | null;
  productTypeSlug?: string | null;
  productTypeName?: string | null;
  // Derived from the package's product type -> ServiceCategory link (see
  // /api/packages). Null when that product type hasn't been assigned to a category
  // yet — drives the new Layer 1 grouping fallback (see topKey/topName below).
  serviceCategorySlug?: string | null;
  serviceCategoryName?: string | null;
}

// Layer-1 grouping key/label: the ServiceCategory a package's product type has been
// assigned to, falling back to the product type itself when unassigned. Backward
// compatible — every product type is unassigned (null serviceCategorySlug) until an
// admin opts in via the Product Types admin UI, so this resolves to exactly today's
// productTypeSlug/-Name for everyone until then. Only once an admin links >1 product
// type under the same category does a group span multiple product types, which is
// what triggers the extra Product Type tab tier (see `showProductTypeTabs`).
const topKey = (p: ProductGridPackage) => p.serviceCategorySlug ?? p.productTypeSlug ?? null;
const topName = (p: ProductGridPackage) => p.serviceCategoryName ?? p.productTypeName ?? null;

export interface ProductGridContent {
  /** Which Product Types (by slug) this block instance draws from — authored in the Designer. */
  productTypeSlugs?: string[];
  /** Single Volt card design used for every card in the grid (v1 — see spec's "out of scope" for per-category designs). */
  voltId?: string;
  minCardWidth?: number;
  heading?: string;
}

interface Props {
  content?: ProductGridContent;
  darkBg?: boolean;
}

const EMPTY_MSG_STYLE: React.CSSProperties = {
  padding: 24, textAlign: "center", color: "var(--section-muted, rgba(0,0,0,0.4))", fontSize: 13,
};

/**
 * ProductGridBlock — client-side drill-down grid, fetched once from the block's
 * configured productTypeSlugs then filtered entirely client-side:
 *   Layer 1: top-level tabs, keyed by serviceCategorySlug ?? productTypeSlug (see
 *     topKey above) — i.e. the ServiceCategory a package's product type has been
 *     assigned to, falling back to the product type itself when unassigned.
 *   Layer 1b: Product Type chips, scoped to the active Layer-1 group — auto-hidden
 *     unless that group spans >1 distinct product type (only possible once an admin
 *     links multiple product types under the same category).
 *   Layer 2: Network chips, scoped to Layer 1(+1b) (auto-hidden when ≤1 distinct network)
 *   Layer 3: Service Category pills (the package's OWN categoryId — unrelated to the
 *     Layer-1 grouping), scoped to Layer 1+1b+2 (auto-hidden when ≤1 distinct category)
 * Renders the filtered packages via the existing VoltBlock/productId binding pipeline —
 * no new card-rendering logic, one Volt design per block instance (see spec).
 *
 * ASSUMPTIONS:
 * 1. content.productTypeSlugs is authored in the Flexible Designer (admin, SUPER_ADMIN-gated
 *    /api/product-types) — this component itself never calls an admin-gated route, so it
 *    works unauthenticated on the public site.
 * 2. Packages with productTypeId: null never match any ?productType= fetch and therefore
 *    never appear here — no special-casing needed.
 * 3. One Volt card design serves every card in the grid (v1 scope, see spec §Out of scope).
 * 4. Backward compatibility: every product type is unassigned (serviceCategorySlug: null)
 *    until an admin explicitly links it to a ServiceCategory, so Layer 1 resolves to
 *    exactly today's productTypeSlug-keyed tabs, and Layer 1b never renders, for every
 *    site until an admin opts in.
 *
 * FAILURE MODES:
 * - A configured slug fetch fails/network error → that slug contributes 0 packages instead
 *   of crashing the whole block (Promise.all with individual .catch(() => [])).
 * - No product types configured → explicit placeholder, no fetch attempted.
 * - All configured types return 0 packages → explicit "no packages yet" placeholder.
 *
 * Fetches once per configured Product Type on mount (not per drill-down step), then
 * filters entirely client-side, so switching tabs/chips/pills never re-triggers a fetch.
 */
export default function ProductGridBlock({ content }: Props) {
  const slugs = useMemo(
    () => (content?.productTypeSlugs || []).map((s) => s.trim()).filter(Boolean),
    [content?.productTypeSlugs]
  );
  const voltId = content?.voltId;
  const minCardWidth = content?.minCardWidth || 260;
  const heading = content?.heading;

  const [packages, setPackages] = useState<ProductGridPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeProductType, setActiveProductType] = useState<string | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (slugs.length === 0) { setPackages([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    Promise.all(
      slugs.map((slug) =>
        fetch(`/api/packages?productType=${encodeURIComponent(slug)}`)
          .then((r) => (r.ok ? r.json() : { packages: [] }))
          .then((d) => (Array.isArray(d?.packages) ? (d.packages as ProductGridPackage[]) : []))
          .catch(() => [] as ProductGridPackage[])
      )
    ).then((results) => {
      if (!active) return;
      setPackages(results.flat());
      setLoading(false);
    });
    return () => { active = false; };
  }, [slugs]);

  // ── Layer 1: top-level groups present among the fetched packages, in fetch
  // (== configured productTypeSlugs) order. Backward-compatible: keyed by
  // serviceCategorySlug ?? productTypeSlug (see topKey above) — with nothing linked
  // yet this produces exactly the old productTypeSlug-keyed tab list. ──
  const groups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const pkg of packages) {
      const key = topKey(pkg);
      if (key && !seen.has(key)) seen.set(key, topName(pkg) || key);
    }
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }));
  }, [packages]);

  const effectiveType = activeType && groups.some((t) => t.slug === activeType)
    ? activeType
    : (groups[0]?.slug ?? null);

  const packagesForType = useMemo(
    () => packages.filter((p) => topKey(p) === effectiveType),
    [packages, effectiveType]
  );

  // ── Layer 1b (new): Product Type tabs, ONLY when the active top-level group
  // actually spans more than one distinct product type (i.e. an admin linked
  // multiple product types under the same ServiceCategory). With nothing linked,
  // every group has exactly one product type (itself), so this tier never renders
  // and Network stays Layer 2 exactly as before. ──
  const productTypesInGroup = useMemo(() => {
    const seen = new Map<string, string>();
    for (const pkg of packagesForType) {
      if (pkg.productTypeSlug && !seen.has(pkg.productTypeSlug)) {
        seen.set(pkg.productTypeSlug, pkg.productTypeName || pkg.productTypeSlug);
      }
    }
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }));
  }, [packagesForType]);

  const showProductTypeRow = productTypesInGroup.length > 1;
  const effectiveProductType = showProductTypeRow && activeProductType && productTypesInGroup.some((t) => t.slug === activeProductType)
    ? activeProductType
    : (showProductTypeRow ? productTypesInGroup[0]?.slug ?? null : null);

  const packagesForProductType = useMemo(
    () => (effectiveProductType ? packagesForType.filter((p) => p.productTypeSlug === effectiveProductType) : packagesForType),
    [packagesForType, effectiveProductType]
  );

  // ── Layer 2: Networks within the active Product Type ──
  const networks = useMemo(() => {
    const seen = new Map<string, string>();
    for (const pkg of packagesForProductType) {
      if (pkg.networkSlug && !seen.has(pkg.networkSlug)) {
        seen.set(pkg.networkSlug, pkg.networkName || pkg.networkSlug);
      }
    }
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }));
  }, [packagesForProductType]);

  const showNetworkRow = networks.length > 1;
  const effectiveNetwork = showNetworkRow && activeNetwork && networks.some((n) => n.slug === activeNetwork)
    ? activeNetwork
    : null;

  const packagesForNetwork = useMemo(
    () => (effectiveNetwork ? packagesForProductType.filter((p) => p.networkSlug === effectiveNetwork) : packagesForProductType),
    [packagesForProductType, effectiveNetwork]
  );

  // ── Layer 3: Service Categories within the active Product Type + Network ──
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const pkg of packagesForNetwork) {
      if (pkg.categoryId && !seen.has(pkg.categoryId)) {
        seen.set(pkg.categoryId, pkg.categoryName || "Uncategorised");
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [packagesForNetwork]);

  const showCategoryRow = categories.length > 1;
  const effectiveCategory = showCategoryRow && activeCategory && categories.some((c) => c.id === activeCategory)
    ? activeCategory
    : null;

  const visiblePackages = effectiveCategory
    ? packagesForNetwork.filter((p) => p.categoryId === effectiveCategory)
    : packagesForNetwork;

  if (slugs.length === 0) {
    return <div style={EMPTY_MSG_STYLE}>No product types configured.</div>;
  }
  if (!voltId) {
    return <div style={EMPTY_MSG_STYLE}>No card design selected.</div>;
  }
  if (loading) {
    return <div style={EMPTY_MSG_STYLE}>Loading…</div>;
  }
  if (groups.length === 0) {
    return <div style={EMPTY_MSG_STYLE}>No packages available yet.</div>;
  }

  return (
    <div className="cms-product-grid">
      {heading && (
        <h3 style={{ fontFamily: "var(--theme-font-display, 'Archivo Black'), sans-serif", textTransform: "uppercase", fontSize: "clamp(20px,2.4vw,30px)", color: "var(--section-text)", margin: "0 0 20px", textAlign: "center" }}>{heading}</h3>
      )}
      <div className="cms-product-grid__bar" role="tablist" aria-label="Product type">
        {groups.map((t) => (
          <button
            key={t.slug}
            type="button"
            role="tab"
            aria-selected={t.slug === effectiveType}
            className={`cms-product-grid__tab${t.slug === effectiveType ? " cms-product-grid__tab--active" : ""}`}
            onClick={() => { setActiveType(t.slug); setActiveProductType(null); setActiveNetwork(null); setActiveCategory(null); }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {showProductTypeRow && (
        <div className="cms-product-grid__chips" role="group" aria-label="Product type detail">
          {productTypesInGroup.map((pt) => (
            <button
              key={pt.slug}
              type="button"
              className={`cms-product-grid__chip${pt.slug === effectiveProductType ? " cms-product-grid__chip--active" : ""}`}
              onClick={() => { setActiveProductType(pt.slug); setActiveNetwork(null); setActiveCategory(null); }}
            >
              {pt.name}
            </button>
          ))}
        </div>
      )}

      {showNetworkRow && (
        <div className="cms-product-grid__chips" role="group" aria-label="Provider">
          <button
            type="button"
            className={`cms-product-grid__chip${!effectiveNetwork ? " cms-product-grid__chip--active" : ""}`}
            onClick={() => { setActiveNetwork(null); setActiveCategory(null); }}
          >
            All
          </button>
          {networks.map((n) => (
            <button
              key={n.slug}
              type="button"
              className={`cms-product-grid__chip${n.slug === effectiveNetwork ? " cms-product-grid__chip--active" : ""}`}
              onClick={() => { setActiveNetwork(n.slug); setActiveCategory(null); }}
            >
              {n.name}
            </button>
          ))}
        </div>
      )}

      {showCategoryRow && (
        <div className="cms-product-grid__pills" role="group" aria-label="Category">
          <button
            type="button"
            className={`cms-product-grid__pill${!effectiveCategory ? " cms-product-grid__pill--active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cms-product-grid__pill${c.id === effectiveCategory ? " cms-product-grid__pill--active" : ""}`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {visiblePackages.length === 0 ? (
        <div style={EMPTY_MSG_STYLE}>No packages match this selection.</div>
      ) : (
        <div className="cms-product-grid__grid">
          {visiblePackages.map((pkg) => (
            <div key={pkg.id} className="cms-product-grid__cell">
              <VoltBlock voltId={voltId} productId={pkg.id} fitMode="contain" />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .cms-product-grid__bar {
          display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-bottom: 20px;
          background: var(--cms-surface, rgba(255,255,255,0.04));
          border: 1px solid var(--cms-border, rgba(255,255,255,0.09));
          border-radius: 999px; padding: 5px; width: fit-content; margin-left: auto; margin-right: auto;
        }
        .cms-product-grid__tab {
          border: 0; background: transparent; color: var(--section-text, rgba(0,0,0,0.85)); opacity: 0.7;
          font-size: 13px; font-weight: 600; letter-spacing: 0.02em;
          border-radius: 999px; padding: 10px 22px; cursor: pointer; transition: opacity .15s, background .15s, color .15s;
        }
        .cms-product-grid__tab:hover { opacity: 1; }
        .cms-product-grid__tab--active { opacity: 1; background: var(--cms-primary, #0d6efd); color: #fff; }

        .cms-product-grid__chips, .cms-product-grid__pills {
          display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px;
        }
        .cms-product-grid__chip, .cms-product-grid__pill {
          border: 1px solid var(--cms-border, rgba(0,0,0,0.15)); background: transparent;
          color: var(--section-text, rgba(0,0,0,0.85)); opacity: 0.75;
          font-size: 12px; font-weight: 500; border-radius: 999px; padding: 6px 14px; cursor: pointer;
          transition: opacity .15s, background .15s, color .15s, border-color .15s;
        }
        .cms-product-grid__chip:hover, .cms-product-grid__pill:hover { opacity: 1; }
        .cms-product-grid__chip--active, .cms-product-grid__pill--active {
          opacity: 1; background: var(--cms-primary, #0d6efd); color: #fff; border-color: var(--cms-primary, #0d6efd);
        }

        .cms-product-grid__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(${minCardWidth}px, 1fr));
          gap: 20px;
        }
        .cms-product-grid__cell { min-height: 160px; }
      `}</style>
    </div>
  );
}
