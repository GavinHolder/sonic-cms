import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const maps = await prisma.coverageMap.findMany({
    include: { regions: { orderBy: { order: "asc" } }, labels: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(maps);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { name, slug, description, centerLat, centerLng, defaultZoom } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const map = await prisma.coverageMap.create({
    data: { name, slug, description, centerLat, centerLng, defaultZoom },
  });
  return NextResponse.json(map, { status: 201 });
}
