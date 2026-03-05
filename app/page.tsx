import type { Metadata } from "next";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import HomepageClient from "./HomepageClient";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata({ title: "Home", slug: "" }, seoConfig);
}

export default function Home() {
  return <HomepageClient />;
}
