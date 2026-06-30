import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import CalculatorClient from "./CalculatorClient";

export async function generateMetadata(): Promise<Metadata> {
  const [seoConfig, feature] = await Promise.all([
    fetchSeoConfig(),
    prisma.clientFeature.findUnique({ where: { slug: "concrete-calculator" } }).catch(() => null),
  ]);
  const meta = buildMetadata(
    {
      title: "Concrete Calculator",
      metaDescription: "Calculate concrete volumes, cement quantities, and project costs for slabs, columns, footings, and staircases.",
      slug: "calculator",
    },
    seoConfig,
  );
  // Only index this plugin page when its feature is enabled — never expose an
  // unfinished/disabled plugin tool to search engines.
  if (!feature?.enabled) {
    return { ...meta, robots: { index: false, follow: false } };
  }
  return meta;
}

export default function CalculatorPage() {
  return <CalculatorClient />;
}
