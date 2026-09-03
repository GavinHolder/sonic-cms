import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";
import { clearOtherPopularInScope } from "@/lib/packages/popular";

// Create a package under a network.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id: networkId } = await params;
  const body = await request.json();
  const { name, price } = body;
  if (!name || !price) {
    return NextResponse.json({ error: "name and price are required" }, { status: 400 });
  }
  const restrictedRegionIds: string[] = Array.isArray(body.restrictedRegionIds)
    ? body.restrictedRegionIds.filter((v: unknown) => typeof v === "string")
    : [];
  // A new package with no explicit order defaulted to 0 — the LOWEST possible value,
  // so it sorted BEFORE every existing package that already had a real (>0) order from
  // being seeded or manually reordered. Every list that reads packages (public pricing
  // cards, this network's own admin package list) orders by [{order:"asc"},
  // {createdAt:"asc"}], so a newly created package landed FIRST/leftmost instead of
  // LAST/rightmost — the reverse of "newest goes next to the last one added". Default
  // to one past this network's current highest order instead, so a package with no
  // explicit order genuinely appends at the end; an admin-supplied body.order (manual
  // reordering) still wins outright.
  const nextOrder = body.order ?? (
    (await prisma.package.aggregate({ where: { networkId }, _max: { order: true } }))._max.order ?? -1
  ) + 1;
  const data = {
    networkId,
    name,
    price: String(price),
    speedDown: body.speedDown || null,
    speedUp: body.speedUp || null,
    period: body.period ?? "/month",
    features: Array.isArray(body.features) ? body.features : [],
    maxDistanceM: typeof body.maxDistanceM === "number" ? body.maxDistanceM : null,
    kind: body.kind === "VAS" ? "VAS" : "DATA",
    term: body.term || null,
    categoryId: body.categoryId || null,
    productTypeId: body.productTypeId || null,
    // Per-package pricing card color override — null/empty = no override, falls
    // back to the network's own color (see Network.color).
    color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : null,
    popular: body.popular ?? false,
    isActive: body.isActive ?? true,
    order: nextOrder,
    restrictedRegions: { connect: restrictedRegionIds.map((id) => ({ id })) },
  };

  // Enforce "at most one Popular per scope" (see lib/packages/popular.ts) inside
  // the same transaction as the create so concurrent saves can't both land
  // popular:true in the same networkId+productTypeId+term scope.
  if (data.popular) {
    const { pkg, clearedPopularNames } = await prisma.$transaction(async (tx) => {
      const clearedPopularNames = await clearOtherPopularInScope(tx, {
        networkId: data.networkId,
        productTypeId: data.productTypeId,
        term: data.term,
      });
      const pkg = await tx.package.create({ data });
      return { pkg, clearedPopularNames };
    });
    return NextResponse.json({ ...pkg, clearedPopularNames }, { status: 201 });
  }

  const pkg = await prisma.package.create({ data });
  return NextResponse.json({ ...pkg, clearedPopularNames: [] }, { status: 201 });
}
