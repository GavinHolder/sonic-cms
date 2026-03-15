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
  const regions = await prisma.coverageRegion.findMany({
    where: { mapId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(regions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, polygon, color, opacity, strokeColor, strokeWidth, description, order } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const region = await prisma.coverageRegion.create({
    data: {
      mapId: id,
      name,
      polygon: polygon ?? [],
      color: color ?? "#22c55e",
      opacity: opacity ?? 0.4,
      strokeColor: strokeColor ?? "#16a34a",
      strokeWidth: strokeWidth ?? 2,
      description,
      order: order ?? 0,
    },
  });
  return NextResponse.json(region, { status: 201 });
}
