import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public, read-only package fetch for the site + designer preview.
 *   ?ids=a,b,c        → those active packages (for per-card bindings)
 *   ?network=<slug>   → an active network's active packages (for the Packages block)
 * Returns only safe display fields, each with its network name/category/colour.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const idsParam = sp.get("ids");
  const networkSlug = sp.get("network");

  const select = {
    id: true, name: true, speedDown: true, speedUp: true, price: true, period: true,
    features: true, popular: true, order: true,
    network: { select: { name: true, slug: true, category: true, color: true } },
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
  } else {
    return NextResponse.json({ error: "ids or network required" }, { status: 400 });
  }

  const packages = rows.map((p) => {
    const net = (p.network ?? null) as { name?: string; slug?: string; category?: string; color?: string } | null;
    return {
      id: p.id, name: p.name, speedDown: p.speedDown, speedUp: p.speedUp,
      price: p.price, period: p.period, features: p.features, popular: p.popular,
      networkName: net?.name ?? null, networkSlug: net?.slug ?? null,
      networkCategory: net?.category ?? null, networkColor: net?.color ?? null,
    };
  });
  return NextResponse.json({ packages });
}
