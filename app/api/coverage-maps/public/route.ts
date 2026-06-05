import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
export async function GET() {
  const maps = await prisma.coverageMap.findMany({
    where: { isActive: true },
    include: {
      regions: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          polygon: true,
          color: true,
          opacity: true,
          strokeColor: true,
          strokeWidth: true,
          description: true,
          regionType: true,
          fnoProvider: true,
          serviceSlug: true,
          towerRef: true,
        },
      },
      labels: true,
      towers: {
        where: { isActive: true },
        select: { id: true, name: true, lat: true, lng: true, description: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(maps);
}
