import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Public endpoint — no auth required
// Accepts either a slug or an id (cuid)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const map = await prisma.coverageMap.findFirst({
    where: {
      isActive: true,
      OR: [{ slug: id }, { id }],
    },
    include: {
      regions: { where: { isActive: true }, orderBy: { order: "asc" } },
      labels: true,
    },
  });

  if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(map);
}
