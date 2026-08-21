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
    popular: body.popular ?? false,
    isActive: body.isActive ?? true,
    order: body.order ?? 0,
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
