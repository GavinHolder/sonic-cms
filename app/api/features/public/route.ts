/**
 * GET /api/features/public — public list of enabled feature slugs
 *
 * No authentication required. Returns only slugs that are enabled.
 * Used by the public Navbar to conditionally show the Tools dropdown.
 * Config data is NOT exposed.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const features = await prisma.clientFeature.findMany({
      where: { enabled: true },
      select: { slug: true, name: true },
    });
    return NextResponse.json({ slugs: features.map((f) => f.slug) });
  } catch {
    return NextResponse.json({ slugs: [] });
  }
}
