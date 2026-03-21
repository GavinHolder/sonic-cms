import type { Metadata } from "next";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import CalculatorClient from "./CalculatorClient";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata(
    {
      title: "Concrete Calculator",
      metaDescription: "Calculate concrete volumes, cement quantities, and project costs for slabs, columns, footings, and staircases.",
      slug: "calculator",
    },
    seoConfig,
  );
}

export default function CalculatorPage() {
  return <CalculatorClient />;
}
