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
    },
  });
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
