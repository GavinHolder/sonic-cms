import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";
import { clearOtherPopularInScope } from "@/lib/packages/popular";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { packageId } = await params;
  const body = await request.json();

  const current = await prisma.package.findUnique({
    where: { id: packageId },
    select: { networkId: true, productTypeId: true, term: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const data = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.price !== undefined && { price: String(body.price) }),
    ...(body.speedDown !== undefined && { speedDown: body.speedDown || null }),
    ...(body.speedUp !== undefined && { speedUp: body.speedUp || null }),
    ...(body.period !== undefined && { period: body.period }),
    ...(body.features !== undefined && { features: Array.isArray(body.features) ? body.features : [] }),
    ...(body.maxDistanceM !== undefined && { maxDistanceM: typeof body.maxDistanceM === "number" ? body.maxDistanceM : null }),
    ...(body.kind !== undefined && { kind: body.kind === "VAS" ? "VAS" : "DATA" }),
    ...(body.term !== undefined && { term: body.term || null }),
    ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
    ...(body.productTypeId !== undefined && { productTypeId: body.productTypeId || null }),
    // Per-package pricing card color override — empty string clears it back to null
    // (falls back to the network's color), same convention as the other optional fields.
    ...(body.color !== undefined && { color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : null }),
    ...(body.popular !== undefined && { popular: body.popular }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.order !== undefined && { order: body.order }),
    // Moving a package to a different network (e.g. a Voice package created under a
    // WISP network by mistake) — networkId is required on Package, so only apply
    // when a non-empty string is explicitly sent.
    ...(typeof body.networkId === "string" && body.networkId && { networkId: body.networkId }),
    // `set` (not `connect`) — this replaces the full restriction list with exactly
    // what the admin just picked, so unchecking a region actually removes it instead
    // of only ever growing the set.
    ...(Array.isArray(body.restrictedRegionIds) && {
      restrictedRegions: {
        set: body.restrictedRegionIds.filter((v: unknown) => typeof v === "string").map((id: string) => ({ id })),
      },
    }),
  };

  // Enforce "at most one Popular per scope" (see lib/packages/popular.ts) whenever
  // this save results in popular:true — using the scope AFTER this update applies
  // (a save can re-parent network/productType/term in the same request), so a
  // re-parent that walks a popular package into an already-popular scope is caught
  // too, not just the "check the box" case.
  if (data.popular === true) {
    const scope = {
      networkId: data.networkId ?? current.networkId,
      productTypeId: body.productTypeId !== undefined ? (body.productTypeId || null) : current.productTypeId,
      term: body.term !== undefined ? (body.term || null) : current.term,
      excludePackageId: packageId,
    };
    const { pkg, clearedPopularNames } = await prisma.$transaction(async (tx) => {
      const clearedPopularNames = await clearOtherPopularInScope(tx, scope);
      const pkg = await tx.package.update({ where: { id: packageId }, data });
      return { pkg, clearedPopularNames };
    });
    return NextResponse.json({ ...pkg, clearedPopularNames });
  }

  const pkg = await prisma.package.update({ where: { id: packageId }, data });
  return NextResponse.json({ ...pkg, clearedPopularNames: [] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { packageId } = await params;
  await prisma.package.delete({ where: { id: packageId } });
  return NextResponse.json({ ok: true });
}
