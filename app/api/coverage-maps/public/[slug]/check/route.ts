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
              packages: {
                where: { isActive: true },
                include: { category: { select: { name: true } }, restrictedRegions: { select: { id: true } } },
                orderBy: [{ order: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      },
      towers: {
        where: { isActive: true },
        select: { lat: true, lng: true, networkId: true, productTypes: { select: { id: true } } },
      },
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
  // Nearest tower of `networkId` that "qualifies" for a package's product type, in metres.
  //
  // ASSUMPTIONS:
  // 1. A tower with an empty productTypes array means "unrestricted / not yet
  //    configured" by an admin — it must NOT wrongly exclude packages just because
  //    nobody has filled in the new field on an older tower. It qualifies for every
  //    product type until an admin explicitly assigns one.
  // 2. productTypeId === null means the package itself isn't tied to a specific
  //    product type — preserve the pre-existing network-only behavior exactly (any
  //    tower of the network qualifies, product-type-blind).
  // 3. Once a tower has at least one productTypes entry, it becomes restrictive: it
  //    only qualifies for packages whose productTypeId is among that set.
  //
  // FAILURE MODES:
  // - Network with zero towers → ts.length === 0 → Infinity → distance-limited
  //   packages correctly excluded (packages with maxDistanceM: null are unaffected,
  //   they never call this function).
  // - Every tower of the network is tagged with OTHER product types (none match) →
  //   Infinity → package correctly excluded, even though the network itself has towers.
  const nearestQualifyingTowerM = (networkId: string, productTypeId: string | null) => {
    const ts = towers.filter((t) => {
      if (t.networkId !== networkId) return false;
      if (!productTypeId) return true;
      if (t.productTypes.length === 0) return true;
      return t.productTypes.some((pt) => pt.id === productTypeId);
    });
    if (ts.length === 0) return Infinity;
    return Math.min(...ts.map((t) => haversineM(point.lat, point.lng, t.lat, t.lng)));
  };

  // ── Group matched regions by network (dedupe), each with its packages ────────
  // Two passes: a network can match more than one of its own overlapping regions
  // (e.g. a wide "Wireless" polygon and a narrower promo-area polygon both covering
  // this point), and a package restricted to just the narrower one still needs to
  // qualify — so the full set of matched region ids per network has to be known
  // BEFORE package restriction is evaluated, not just the first region encountered.
  const networkById = new Map<string, NonNullable<(typeof matched)[number]["network"]>>();
  const matchedRegionIdsByNetwork = new Map<string, Set<string>>();
  const regionNamesByNetwork = new Map<string, string[]>();
  const unlinkedRegionNames: string[] = [];

  for (const r of matched) {
    if (r.network) {
      const n = r.network;
      if (!networkById.has(n.id)) {
        networkById.set(n.id, n);
        matchedRegionIdsByNetwork.set(n.id, new Set());
        regionNamesByNetwork.set(n.id, []);
      }
      matchedRegionIdsByNetwork.get(n.id)!.add(r.id);
      regionNamesByNetwork.get(n.id)!.push(r.name);
    } else {
      unlinkedRegionNames.push(r.name);
    }
  }

  const networks = [...networkById.entries()].map(([networkId, n]) => {
    const matchedRegionIds = matchedRegionIdsByNetwork.get(networkId)!;
    return {
      id: n.id, name: n.name, slug: n.slug, category: n.category, color: n.color, logoUrl: n.logoUrl,
      regionNames: regionNamesByNetwork.get(networkId) || [],
      // Distance gate: a package with maxDistanceM only shows when the point is
      // within that distance of one of this network's towers that actually
      // qualifies for the package's product type (see nearestQualifyingTowerM).
      // Region gate: a package with restrictedRegions set only shows when at least
      // one of THIS network's matched regions is in that set — empty (the default)
      // means unrestricted, same as before this field existed.
      packages: n.packages
        .filter((p) => p.maxDistanceM == null || nearestQualifyingTowerM(n.id, p.productTypeId ?? null) <= p.maxDistanceM)
        .filter((p) => showVas || p.kind !== "VAS")
        .filter((p) => p.restrictedRegions.length === 0 || p.restrictedRegions.some((rr) => matchedRegionIds.has(rr.id)))
        .map((p) => ({
          id: p.id, name: p.name, speedDown: p.speedDown, speedUp: p.speedUp,
          price: p.price, period: p.period, features: p.features, popular: p.popular,
          kind: p.kind, term: p.term, category: p.category?.name ?? null,
        })),
    };
  });

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
