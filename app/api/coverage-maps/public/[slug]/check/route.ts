import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPointInPolygon } from "@/lib/coverage-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { lat, lng } = body as { lat?: unknown; lng?: unknown };

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const map = await prisma.coverageMap.findUnique({
    where: { slug, isActive: true },
    include: {
      regions: { where: { isActive: true } },
    },
  });

  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const point = { lat, lng };
  const matched = map.regions.filter((r) =>
    isPointInPolygon(point, r.polygon as Array<{ lat: number; lng: number }>)
  );

  if (matched.length === 0) {
    return NextResponse.json({ type: "miss" });
  }

  const fibre = matched.find((r) => r.regionType === "FIBRE");
  if (fibre) {
    return NextResponse.json({
      type: "fibre",
      regionName: fibre.name,
      fnoProvider: fibre.fnoProvider ?? null,
    });
  }

  const wireless = matched.filter((r) => r.regionType === "WIRELESS");
  if (wireless.length > 0) {
    return NextResponse.json({
      type: "wireless",
      services: wireless.map((r) => ({
        name: r.name,
        serviceSlug: r.serviceSlug ?? r.name.toLowerCase().replace(/\s+/g, "-"),
        towerRef: r.towerRef ?? null,
        description: r.description ?? null,
      })),
    });
  }

  // Only GENERAL regions matched — treat as fibre (backward compat)
  return NextResponse.json({
    type: "fibre",
    regionName: matched[0].name,
    fnoProvider: matched[0].fnoProvider ?? null,
  });
}
