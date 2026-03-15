import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
export async function GET() {
  const maps = await prisma.coverageMap.findMany({
    where: { isActive: true },
    include: {
      regions: { where: { isActive: true }, orderBy: { order: "asc" } },
      labels: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(maps);
}
