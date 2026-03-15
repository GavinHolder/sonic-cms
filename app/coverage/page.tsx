import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CoveragePageClient from "./CoveragePageClient";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  // Feature gate — disabled by default
  const feature = await prisma.clientFeature.findUnique({
    where: { slug: "coverage-map" },
  });
  if (!feature?.enabled) notFound();

  const maps = await prisma.coverageMap.findMany({
    where: { isActive: true },
    include: {
      regions: { where: { isActive: true }, orderBy: { order: "asc" } },
      labels: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Cast Prisma JsonValue polygon to typed LatLng[] for the client component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CoveragePageClient initialMaps={maps as any} />;
}
