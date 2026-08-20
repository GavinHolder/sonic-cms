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

  const term = await prisma.packageTerm.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.kind !== undefined && { kind: body.kind === "VAS" ? "VAS" : "DATA" }),
      ...(body.billsMonthly !== undefined && { billsMonthly: !!body.billsMonthly }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  return NextResponse.json(term);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  // Packages keep their `term` string unchanged (no FK) — they just stop matching any
  // active PackageTerm row, which the admin dropdown treats as "unselected" and
  // termToPeriod() falls back to monthly billing for, same graceful degradation as
  // categoryId/productTypeId elsewhere in this file.
  await prisma.packageTerm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
