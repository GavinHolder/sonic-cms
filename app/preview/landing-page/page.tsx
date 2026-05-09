import type { Metadata } from "next";
import PreviewLandingPageClient from "./PreviewLandingPageClient";

export const metadata: Metadata = {
  title: "Preview: Landing Page",
  robots: { index: false, follow: false },
};

export default function PreviewLandingPage() {
  return <PreviewLandingPageClient />;
}
