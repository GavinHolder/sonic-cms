import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

// List all provider networks (with their packages + region count) for the admin.
export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const networks = await prisma.network.findMany({
    include: {
      packages: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      _count: { select: { regions: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(networks);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { name, slug, category, color, logoUrl, description, isActive, order } = body;
  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }
  const validCat = ["FNO", "WISP", "WIRELESS"];
  const network = await prisma.network.create({
    data: {
      name,
      slug,
      category: validCat.includes(category) ? category : "FNO",
      ...(color ? { color } : {}),
      logoUrl: logoUrl || null,
      description: description || null,
      isActive: isActive ?? true,
      order: order ?? 0,
    },
  });
  return NextResponse.json(network, { status: 201 });
}
