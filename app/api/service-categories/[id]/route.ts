import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  const category = await prisma.serviceCategory.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  // Packages keep their data; categoryId is set null (FK onDelete: SetNull).
  await prisma.serviceCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
