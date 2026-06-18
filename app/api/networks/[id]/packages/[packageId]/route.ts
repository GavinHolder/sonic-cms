import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { packageId } = await params;
  const body = await request.json();
  const pkg = await prisma.package.update({
    where: { id: packageId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.price !== undefined && { price: String(body.price) }),
      ...(body.speedDown !== undefined && { speedDown: body.speedDown || null }),
      ...(body.speedUp !== undefined && { speedUp: body.speedUp || null }),
      ...(body.period !== undefined && { period: body.period }),
      ...(body.features !== undefined && { features: Array.isArray(body.features) ? body.features : [] }),
      ...(body.maxDistanceM !== undefined && { maxDistanceM: typeof body.maxDistanceM === "number" ? body.maxDistanceM : null }),
      ...(body.popular !== undefined && { popular: body.popular }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });
  return NextResponse.json(pkg);
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
