import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { labelId } = await params;
  const body = await request.json();

  const label = await prisma.coverageLabel.update({
    where: { id: labelId },
    data: {
      ...(body.text !== undefined && { text: body.text }),
      ...(body.lat !== undefined && { lat: body.lat }),
      ...(body.lng !== undefined && { lng: body.lng }),
      ...(body.fontSize !== undefined && { fontSize: body.fontSize }),
      ...(body.fontFamily !== undefined && { fontFamily: body.fontFamily }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.bgColor !== undefined && { bgColor: body.bgColor }),
      ...(body.bold !== undefined && { bold: body.bold }),
    },
  });
  return NextResponse.json(label);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { labelId } = await params;
  await prisma.coverageLabel.delete({ where: { id: labelId } });
  return NextResponse.json({ success: true });
}
