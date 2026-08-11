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
      select: { id: true, name: true, network: { select: { name: true, slug: true } } },
    });
    const packages = rows.map((p) => {
      const net = (p.network ?? null) as { name?: string; slug?: string } | null;
      return { id: p.id, name: p.name, networkName: net?.name ?? null, networkSlug: net?.slug ?? null };
    });
    return NextResponse.json({ packages });
  }

  const select = {
    id: true, name: true, speedDown: true, speedUp: true, price: true, period: true,
    features: true, popular: true, order: true,
    network: { select: { name: true, slug: true, category: true, color: true } },
    category: { select: { id: true, name: true } },
    productType: { select: { slug: true, name: true } },
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
    const net = (p.network ?? null) as { name?: string; slug?: string; category?: string; color?: string } | null;
    const cat = (p.category ?? null) as { id?: string; name?: string } | null;
    const pt = (p.productType ?? null) as { slug?: string; name?: string } | null;
    return {
      id: p.id, name: p.name, speedDown: p.speedDown, speedUp: p.speedUp,
      price: p.price, period: p.period, features: p.features, popular: p.popular,
      networkName: net?.name ?? null, networkSlug: net?.slug ?? null,
      networkCategory: net?.category ?? null, networkColor: net?.color ?? null,
      categoryId: cat?.id ?? null, categoryName: cat?.name ?? null,
      productTypeSlug: pt?.slug ?? null, productTypeName: pt?.name ?? null,
    };
  });
  return NextResponse.json({ packages });
}
