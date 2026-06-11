import type { Metadata } from "next";
import { fetchSeoConfig, buildMetadata } from "@/lib/metadata-generator";
import HomepageClient from "@/app/HomepageClient";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await fetchSeoConfig();
  return buildMetadata({ title: "Home", slug: "" }, seoConfig);
}

// The homepage renders the CMS section system (sections authored on slug "/"
// in the admin "Landing Page"). The WISP look is authored as those sections —
// not the old hardcoded components/landing/WispLandingPage.
export default function Home() {
  return <HomepageClient />;
}
