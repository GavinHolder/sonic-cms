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
              packages: { where: { isActive: true }, include: { category: { select: { name: true } } }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
            },
          },
        },
      },
      towers: { where: { isActive: true }, select: { lat: true, lng: true, networkId: true } },
    },
  });
  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  // Global toggle: hide value-added (VAS) packages unless enabled in feature config.
  const feature = await prisma.clientFeature.findUnique({ where: { slug: "coverage-maps" } });
  const showVas = !!((feature?.config as { showValueAddedServices?: boolean } | null)?.showValueAddedServices);

  const point = { lat, lng };
  const matched = map.regions.filter((r) =>
    isPointInPolygon(point, r.polygon as Array<{ lat: number; lng: number }>)
  );

  // Nearest tower (of a given network) to the checked point, in metres.
  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversineM = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const R = 6371000;
    const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  const towers = map.towers || [];
  const nearestTowerM = (networkId: string) => {
    const ts = towers.filter((t) => t.networkId === networkId);
    if (ts.length === 0) return Infinity;
    return Math.min(...ts.map((t) => haversineM(point.lat, point.lng, t.lat, t.lng)));
  };

  // ── Group matched regions by network (dedupe), each with its packages ────────
  const byNetwork = new Map<string, {
    id: string; name: string; slug: string; category: string; color: string; logoUrl: string | null;
    regionNames: string[];
    packages: Array<{ id: string; name: string; speedDown: string | null; speedUp: string | null; price: string; period: string | null; features: unknown; popular: boolean; kind: string; term: string | null; category: string | null }>;
  }>();
  const unlinkedRegionNames: string[] = [];

  for (const r of matched) {
    if (r.network) {
      const n = r.network;
      if (!byNetwork.has(n.id)) {
        // Distance gate: a package with maxDistanceM only shows when the point is
        // within that distance of one of this network's towers.
        const distM = nearestTowerM(n.id);
        byNetwork.set(n.id, {
          id: n.id, name: n.name, slug: n.slug, category: n.category, color: n.color, logoUrl: n.logoUrl,
          regionNames: [],
          packages: n.packages
            .filter((p) => p.maxDistanceM == null || distM <= p.maxDistanceM)
            .filter((p) => showVas || p.kind !== "VAS")
            .map((p) => ({
              id: p.id, name: p.name, speedDown: p.speedDown, speedUp: p.speedUp,
              price: p.price, period: p.period, features: p.features, popular: p.popular,
              kind: p.kind, term: p.term, category: p.category?.name ?? null,
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
