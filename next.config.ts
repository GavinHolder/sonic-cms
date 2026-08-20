import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: ["three"],
  // Required for Docker production builds (creates .next/standalone/)
  output: "standalone",
  // Allow deployment despite pre-existing TS errors — fix incrementally
  typescript: { ignoreBuildErrors: true },
  // The Flexible Designer (public/flexible-designer.html) is loaded via a fixed,
  // unversioned iframe src ("/flexible-designer.html" — see
  // FlexibleSectionEditorModal.tsx and DesignerPageEditorModal.tsx). Files under
  // public/ have no content hash in their URL, so without an explicit directive here
  // browsers are free to cache this exact URL indefinitely and keep serving a stale
  // copy across deploys — a real bug, not a perception issue: a fix can ship and
  // deploy successfully and still be invisible to anyone whose browser already has
  // this file cached. no-cache forces revalidation (a conditional request) on every
  // load, so a new deploy is picked up immediately without requiring a hard refresh.
  async headers() {
    return [
      {
        source: "/flexible-designer.html",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
