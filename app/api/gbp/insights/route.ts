import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { fetchGbpInsights, GbpNotConnectedError } from "@/lib/gbp-client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const e = await requireRole(req, UserRole.EDITOR); if (e) return e;
  try {
    const token = await prisma.gbpToken.findFirst({ select: { locationId: true } });
    if (!token?.locationId) return NextResponse.json({ insights: [] });
    return NextResponse.json({ insights: await fetchGbpInsights(token.locationId) });
  } catch (err) {
    if (err instanceof GbpNotConnectedError) return NextResponse.json({ connected: false });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
