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

  const type = await prisma.featureBadgeType.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.helpText !== undefined && { helpText: body.helpText ? String(body.helpText).trim() : null }),
      ...(body.category !== undefined && {
        category: body.category && ["FNO", "WISP", "WIRELESS", "VOICE"].includes(body.category) ? body.category : null,
      }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  return NextResponse.json(type);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  // Packages keep their stored badge name unchanged (no FK) — they just stop
  // resolving help text for it, same graceful degradation as PackageTerm/
  // categoryId/productTypeId elsewhere. The badge label itself still renders.
  await prisma.featureBadgeType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
