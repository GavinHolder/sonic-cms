import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const map = await prisma.coverageMap.findUnique({
    where: { id },
    include: { regions: { orderBy: { order: "asc" } }, labels: true },
  });
  if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(map);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  const map = await prisma.coverageMap.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.centerLat !== undefined && { centerLat: body.centerLat }),
      ...(body.centerLng !== undefined && { centerLng: body.centerLng }),
      ...(body.defaultZoom !== undefined && { defaultZoom: body.defaultZoom }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  return NextResponse.json(map);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  // Cascade delete regions + labels first
  await prisma.coverageRegion.deleteMany({ where: { mapId: id } });
  await prisma.coverageLabel.deleteMany({ where: { mapId: id } });
  await prisma.coverageMap.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
