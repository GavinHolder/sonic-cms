import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { fetchGbpLocations, GbpNotConnectedError } from "@/lib/gbp-client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const e = await requireRole(req, UserRole.EDITOR); if (e) return e;
  try {
    const [locations, token] = await Promise.all([fetchGbpLocations(), prisma.gbpToken.findFirst({ select: { locationId: true, accountEmail: true } })]);
    return NextResponse.json({ locations, currentLocationId: token?.locationId ?? null, accountEmail: token?.accountEmail ?? "" });
  } catch (err) {
    if (err instanceof GbpNotConnectedError) return NextResponse.json({ connected: false });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const e = await requireRole(req, UserRole.SUPER_ADMIN); if (e) return e;
  const { locationId, locationName } = await req.json() as { locationId: string; locationName: string };
  await prisma.gbpToken.updateMany({ data: { locationId, locationName } });
  return NextResponse.json({ ok: true });
}
