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
  const towers = await prisma.coverageTower.findMany({
    where: { mapId: id },
    orderBy: { createdAt: "asc" },
    include: {
      region: { select: { id: true, name: true } },
      productTypes: { select: { id: true, name: true, slug: true, color: true } },
    },
  });
  return NextResponse.json(towers);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { name, lat, lng, description, networkId, regionId, productTypeIds } = body as {
    name?: unknown;
    lat?: unknown;
    lng?: unknown;
    description?: unknown;
    networkId?: unknown;
    regionId?: unknown;
    productTypeIds?: unknown;
  };
  if (!name || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "name, lat, lng required" }, { status: 400 });
  }
  const ptIds = Array.isArray(productTypeIds) ? productTypeIds.filter((v): v is string => typeof v === "string") : [];
  const tower = await prisma.coverageTower.create({
    data: {
      mapId: id,
      name: name as string,
      lat,
      lng,
      description: typeof description === "string" ? description : null,
      networkId: typeof networkId === "string" && networkId ? networkId : null,
      regionId: typeof regionId === "string" && regionId ? regionId : null,
      productTypes: ptIds.length > 0 ? { connect: ptIds.map((id) => ({ id })) } : undefined,
    },
    include: {
      region: { select: { id: true, name: true } },
      productTypes: { select: { id: true, name: true, slug: true, color: true } },
    },
  });
  return NextResponse.json(tower, { status: 201 });
}
