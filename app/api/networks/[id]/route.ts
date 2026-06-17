import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const network = await prisma.network.findUnique({
    where: { id },
    include: { packages: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  });
  if (!network) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(network);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  const validCat = ["FNO", "WISP", "WIRELESS"];
  const network = await prisma.network.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.category !== undefined && validCat.includes(body.category) && { category: body.category }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });
  return NextResponse.json(network);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  // Regions FK is SetNull; packages cascade-delete with the network.
  await prisma.network.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
