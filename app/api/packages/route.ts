import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public, read-only package fetch for the site + designer preview.
 *   ?all=1              → all active packages (id, name, network) for the designer product picker
 *   ?ids=a,b,c          → those active packages (for per-card bindings)
 *   ?network=<slug>     → an active network's active packages (for the Packages block)
 *   ?productType=<slug> → an active product type's active packages (for the Product Card Grid block)
 * Returns only safe display fields, each with its network name/category/colour plus its
 * service category and product type (id/slug/name where applicable).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const allParam = sp.get("all");
  const idsParam = sp.get("ids");
  const networkSlug = sp.get("network");
  // Defensive: treat missing/empty/whitespace-only productType as "not provided" rather
  // than querying with an empty string (which would match nothing and confuse the caller).
  const productTypeSlugRaw = sp.get("productType");
  const productTypeSlug = productTypeSlugRaw && productTypeSlugRaw.trim() ? productTypeSlugRaw.trim() : null;

  // List-all mode: minimal fields to enumerate products in the designer picker.
  if (allParam) {
    const rows = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ network: { name: "asc" } }, { order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, term: true, network: { select: { name: true, slug: true } } },
    });
    const packages = rows.map((p) => {
      const net = (p.network ?? null) as { name?: string; slug?: string } | null;
      return { id: p.id, name: p.name, term: p.term, networkName: net?.name ?? null, networkSlug: net?.slug ?? null };
    });
    return NextResponse.json({ packages });
  }

  const select = {
    id: true, name: true, speedDown: true, speedUp: true, price: true, period: true,
    features: true, popular: true, order: true, term: true,
    // Package.color — per-package pricing card color override, distinct from the
    // network's own color below (networkColor). Selected directly (no relation).
    color: true,
    network: { select: { name: true, slug: true, category: true, color: true, logoUrl: true } },
    // The package's OWN service category (Data/Voice/IoT/CCTV…) — unrelated to the
    // productType-derived serviceCategorySlug/-Name below, which is the top-level
    // grouping category the package's product type has been assigned to.
    category: { select: { id: true, name: true } },
    productType: {
      select: {
        slug: true, name: true,
        serviceCategory: { select: { id: true, name: true } },
      },
    },
  } as const;

  let rows: Array<Record<string, unknown>> = [];
  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    if (ids.length === 0) return NextResponse.json({ packages: [] });
    rows = await prisma.package.findMany({ where: { id: { in: ids }, isActive: true }, select });
  } else if (networkSlug) {
    rows = await prisma.package.findMany({
      where: { isActive: true, network: { slug: networkSlug, isActive: true } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select,
    });
  } else if (productTypeSlug) {
    rows = await prisma.package.findMany({
      where: { isActive: true, productType: { slug: productTypeSlug, isActive: true } },
      orderBy: [{ network: { name: "asc" } }, { order: "asc" }, { createdAt: "asc" }],
      select,
    });
  } else {
    return NextResponse.json({ error: "ids, network, or productType required" }, { status: 400 });
  }

  const packages = rows.map((p) => {
    const net = (p.network ?? null) as { name?: string; slug?: string; category?: string; color?: string; logoUrl?: string | null } | null;
    const cat = (p.category ?? null) as { id?: string; name?: string } | null;
    const pt = (p.productType ?? null) as
      | { slug?: string; name?: string; serviceCategory?: { id?: string; name?: string } | null }
      | null;
    return {
      id: p.id, name: p.name, speedDown: p.speedDown, speedUp: p.speedUp,
      price: p.price, period: p.period, features: p.features, popular: p.popular, term: p.term,
      networkName: net?.name ?? null, networkSlug: net?.slug ?? null,
      networkCategory: net?.category ?? null, networkColor: net?.color ?? null,
      networkLogoUrl: net?.logoUrl ?? null,
      // Per-package override — when set, takes priority over networkColor for this
      // package's card. Distinct name so it can never be confused with networkColor.
      packageColor: (p.color as string | null | undefined) ?? null,
      categoryId: cat?.id ?? null, categoryName: cat?.name ?? null,
      productTypeSlug: pt?.slug ?? null, productTypeName: pt?.name ?? null,
      // Derived from productType.serviceCategory — null when the product type hasn't
      // been assigned to a category yet. ServiceCategory has no dedicated `slug`
      // column, so its stable `id` is reused as the "slug" here (still unique/stable,
      // just not a human-readable string) to match the productTypeSlug naming
      // convention. New, strictly additive fields — see CardTabsBlock/ProductGridBlock
      // for the backward-compatible `serviceCategorySlug ?? productTypeSlug` fallback.
      serviceCategorySlug: pt?.serviceCategory?.id ?? null,
      serviceCategoryName: pt?.serviceCategory?.name ?? null,
    };
  });
  return NextResponse.json({ packages });
}
