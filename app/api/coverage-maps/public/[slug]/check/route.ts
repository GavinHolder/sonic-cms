import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPointInPolygon } from "@/lib/coverage-utils";

/**
 * Public coverage check. Returns ALL networks whose (overlapping) polygons contain
 * the point, each with its active packages — so the visitor sees every provider
 * available at their address. Legacy `type/regionName/fnoProvider/services` fields
 * are kept for backward compatibility with older clients.
 */
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
      regions: {
        where: { isActive: true },
        include: {
          network: {
            include: {
              packages: { where: { isActive: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
            },
          },
        },
      },
    },
  });
  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const point = { lat, lng };
  const matched = map.regions.filter((r) =>
    isPointInPolygon(point, r.polygon as Array<{ lat: number; lng: number }>)
  );

  // ── Group matched regions by network (dedupe), each with its packages ────────
  const byNetwork = new Map<string, {
    id: string; name: string; slug: string; category: string; color: string; logoUrl: string | null;
    regionNames: string[];
    packages: Array<{ id: string; name: string; speedDown: string | null; speedUp: string | null; price: string; period: string | null; features: unknown; popular: boolean }>;
  }>();
  const unlinkedRegionNames: string[] = [];

  for (const r of matched) {
    if (r.network) {
      const n = r.network;
      if (!byNetwork.has(n.id)) {
        byNetwork.set(n.id, {
          id: n.id, name: n.name, slug: n.slug, category: n.category, color: n.color, logoUrl: n.logoUrl,
          regionNames: [],
          packages: n.packages.map((p) => ({
            id: p.id, name: p.name, speedDown: p.speedDown, speedUp: p.speedUp,
            price: p.price, period: p.period, features: p.features, popular: p.popular,
          })),
        });
      }
      byNetwork.get(n.id)!.regionNames.push(r.name);
    } else {
      unlinkedRegionNames.push(r.name);
    }
  }
  const networks = [...byNetwork.values()];

  // ── Legacy back-compat fields (older public client) ──────────────────────────
  const fibre = matched.find((r) => r.regionType === "FIBRE");
  const wireless = matched.filter((r) => r.regionType === "WIRELESS");
  const legacy =
    matched.length === 0
      ? { type: "miss" as const }
      : fibre
        ? { type: "fibre" as const, regionName: fibre.name, fnoProvider: fibre.fnoProvider ?? null }
        : wireless.length > 0
          ? {
              type: "wireless" as const,
              services: wireless.map((r) => ({
                name: r.name,
                serviceSlug: r.serviceSlug ?? r.name.toLowerCase().replace(/\s+/g, "-"),
                towerRef: r.towerRef ?? null,
                description: r.description ?? null,
              })),
            }
          : { type: "fibre" as const, regionName: matched[0].name, fnoProvider: matched[0].fnoProvider ?? null };

  return NextResponse.json({
    ...legacy,
    hit: matched.length > 0,
    networks,
    unlinkedRegionNames,
  });
}
