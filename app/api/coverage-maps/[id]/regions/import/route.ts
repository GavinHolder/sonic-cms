import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

/**
 * Bulk region import (Admin -> Coverage Maps -> "Import Regions (GeoJSON)").
 *
 * The GeoJSON file itself is parsed client-side (lib/coverage-geojson-import.ts) —
 * this endpoint receives an already-converted `{ name, polygon }[]` array, NOT raw
 * GeoJSON. It still can't trust that array: it's the direct result of parsing an
 * admin-uploaded file, so every entry is re-validated defensively here before
 * touching the database (a request could in principle bypass the client parser
 * entirely and POST here directly).
 *
 * Insert is a single `createMany` call — Prisma emits this as one multi-row INSERT,
 * which Postgres executes atomically, giving the "all-or-nothing" behavior a loop of
 * individual `create()` calls wouldn't: either every region in the batch lands, or
 * (on a validation failure, caught before any DB call) none do. This also avoids an
 * N+1 insert loop for imports that can run to low thousands of rows.
 */

const MAX_REGIONS_PER_IMPORT = 10000;
const MAX_POLYGON_POINTS = 5000;
const MAX_NAME_LENGTH = 200;

interface IncomingRegion {
  name?: unknown;
  polygon?: unknown;
}

interface ValidRegion {
  name: string;
  polygon: { lat: number; lng: number }[];
}

function validateRegion(entry: unknown): ValidRegion | null {
  if (!entry || typeof entry !== "object") return null;
  const { name, polygon } = entry as IncomingRegion;

  if (typeof name !== "string") return null;
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  if (!Array.isArray(polygon) || polygon.length < 3 || polygon.length > MAX_POLYGON_POINTS) return null;

  const pts: { lat: number; lng: number }[] = [];
  for (const p of polygon) {
    if (!p || typeof p !== "object") return null;
    const { lat, lng } = p as { lat?: unknown; lng?: unknown };
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    pts.push({ lat, lng });
  }

  return { name: trimmedName.slice(0, MAX_NAME_LENGTH), polygon: pts };
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

  const rawRegions = (body as { regions?: unknown })?.regions;
  if (!Array.isArray(rawRegions) || rawRegions.length === 0) {
    return NextResponse.json({ error: "regions must be a non-empty array" }, { status: 400 });
  }
  if (rawRegions.length > MAX_REGIONS_PER_IMPORT) {
    return NextResponse.json(
      { error: `Too many regions in one import (max ${MAX_REGIONS_PER_IMPORT})` },
      { status: 400 }
    );
  }

  const map = await prisma.coverageMap.findUnique({ where: { id }, select: { id: true } });
  if (!map) return NextResponse.json({ error: "Coverage map not found" }, { status: 404 });

  // All-or-nothing: if ANY entry fails validation, reject the whole batch rather than
  // silently importing a partial set — the admin would have no way to tell, from the
  // resulting region list alone, that some features were dropped.
  const validated: ValidRegion[] = [];
  for (let i = 0; i < rawRegions.length; i++) {
    const region = validateRegion(rawRegions[i]);
    if (!region) {
      return NextResponse.json(
        { error: `Entry ${i} is not a valid region (needs a non-empty name and a polygon with >= 3 valid {lat,lng} points)` },
        { status: 400 }
      );
    }
    validated.push(region);
  }

  const startOrder = await prisma.coverageRegion.count({ where: { mapId: id } });

  const result = await prisma.coverageRegion.createMany({
    data: validated.map((region, i) => ({
      mapId: id,
      name: region.name,
      polygon: region.polygon,
      // Imported regions take the model's own defaults for styling — an admin can
      // adjust color/opacity/etc. afterward. No attempt to guess styling from
      // GeoJSON `properties`.
      order: startOrder + i,
    })),
  });

  return NextResponse.json({ count: result.count }, { status: 201 });
}
