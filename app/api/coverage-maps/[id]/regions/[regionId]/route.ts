import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; regionId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { regionId } = await params;
  const body = await request.json();

  // Replace-the-set for the region's towers (CoverageTower.regionId back-relation).
  // A tower can only belong to one region at a time (single FK), so:
  //   1. Clear regionId on any tower currently linked here but no longer selected —
  //      this also covers "0 towers selected" (clears every previously-linked tower).
  //   2. Set regionId on every tower now selected — this also handles "moved from
  //      another region" since setting the FK here implicitly removes it from wherever
  //      it was before (a tower can't have two regionIds).
  // Mirrors the productTypes `set` pattern used for Tower<->ProductType, but done
  // manually since CoverageTower.regionId is a plain one-to-many FK, not an implicit m2m.
  const towerIds = Array.isArray(body.towerIds)
    ? body.towerIds.filter((v: unknown): v is string => typeof v === "string")
    : undefined;

  const region = await prisma.coverageRegion.update({
    where: { id: regionId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.polygon !== undefined && { polygon: body.polygon }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.opacity !== undefined && { opacity: body.opacity }),
      ...(body.strokeColor !== undefined && { strokeColor: body.strokeColor }),
      ...(body.strokeWidth !== undefined && { strokeWidth: body.strokeWidth }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.regionType !== undefined && { regionType: body.regionType }),
      ...(body.fnoProvider !== undefined && { fnoProvider: body.fnoProvider }),
      ...(body.serviceSlug !== undefined && { serviceSlug: body.serviceSlug }),
      ...(body.towerRef !== undefined && { towerRef: body.towerRef }),
      ...(body.networkId !== undefined && { networkId: body.networkId || null }),
    },
  });

  if (towerIds !== undefined) {
    await prisma.$transaction([
      prisma.coverageTower.updateMany({
        where: { regionId, id: { notIn: towerIds } },
        data: { regionId: null },
      }),
      prisma.coverageTower.updateMany({
        where: { id: { in: towerIds } },
        data: { regionId },
      }),
    ]);
  }

  return NextResponse.json(region);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; regionId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { regionId } = await params;
  await prisma.coverageRegion.delete({ where: { id: regionId } });
  return NextResponse.json({ success: true });
}
