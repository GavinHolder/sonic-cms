import type { Metadata } from "next";
import Services from "@/components/Services";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata({ title: "Services", metaDescription: "Explore our range of professional services.", slug: "services" }, seoConfig);
}

export default function CoveragePage() {
  return (
    <>
      <Services />
    </>
  );
}
