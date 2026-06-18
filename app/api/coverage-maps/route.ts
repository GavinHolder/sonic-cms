import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const maps = await prisma.coverageMap.findMany({
    include: { regions: { orderBy: { order: "asc" } }, labels: true, towers: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(maps);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { name, slug, description, centerLat, centerLng, defaultZoom } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  // Slug is automatic: derive from name (or supplied slug), then ensure uniqueness.
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = slugify(slug || name) || "map";
  let uniqueSlug = base;
  for (let i = 2; await prisma.coverageMap.findUnique({ where: { slug: uniqueSlug } }); i++) {
    uniqueSlug = `${base}-${i}`;
  }

  const map = await prisma.coverageMap.create({
    data: { name, slug: uniqueSlug, description, centerLat, centerLng, defaultZoom },
  });
  return NextResponse.json(map, { status: 201 });
}
