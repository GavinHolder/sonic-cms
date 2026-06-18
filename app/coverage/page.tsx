import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CoveragePageClient from "./CoveragePageClient";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata({ title: "Coverage Map", metaDescription: "Check service coverage and availability in your area.", slug: "coverage" }, seoConfig);
}

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  // Feature gate — disabled by default. Slug must match the feature system
  // (admin Client Features + sidebar use "coverage-maps", plural).
  const feature = await prisma.clientFeature.findUnique({
    where: { slug: "coverage-maps" },
  });
  if (!feature?.enabled) notFound();

  const maps = await prisma.coverageMap.findMany({
    where: { isActive: true },
    include: {
      regions: { where: { isActive: true }, orderBy: { order: "asc" } },
      labels: true,
      towers: { where: { isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Per-network tower radius rings — distinct package distances, for the map overlay
  const networks = await prisma.network.findMany({
    where: { isActive: true },
    select: { id: true, color: true, packages: { where: { isActive: true, maxDistanceM: { not: null } }, select: { maxDistanceM: true } } },
  });
  const networkRadii: Record<string, { color: string; distances: number[] }> = {};
  for (const n of networks) {
    const distances = [...new Set(n.packages.map((p) => p.maxDistanceM as number))].sort((a, b) => a - b);
    if (distances.length) networkRadii[n.id] = { color: n.color, distances };
  }

  // Cast Prisma JsonValue polygon to typed LatLng[] for the client component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CoveragePageClient initialMaps={maps as any} networkRadii={networkRadii} />;
}
