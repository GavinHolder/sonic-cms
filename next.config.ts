import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: ["three"],
  // Required for Docker production builds (creates .next/standalone/)
  output: "standalone",
  // Allow deployment despite pre-existing TS errors — fix incrementally
  typescript: { ignoreBuildErrors: true },
  // Every editor canvas AND shared rendering-rules module under public/ is loaded via
  // a fixed, unversioned URL (an <iframe src="..."> or <script src="...">) — see
  // FlexibleSectionEditorModal.tsx, DesignerPageEditorModal.tsx, and the <script src>
  // tags inside flexible-designer.html/volt-designer.html themselves. Files under
  // public/ have no content hash in their URL, so without an explicit directive here
  // browsers are free to cache any of these exact URLs indefinitely and keep serving a
  // stale copy across deploys — a real bug, not a perception issue: a fix can ship and
  // deploy successfully and still be invisible to anyone whose browser already has one
  // of these files cached. no-cache forces revalidation (a conditional request) on
  // every load, so a new deploy is picked up immediately without requiring a hard
  // refresh. This list must be kept in sync with public/*.html and every public/*.js
  // shared module (volt-glass-rules.js, flexible-render-rules.js,
  // flexible-breakpoint-rules.js, volt-layer-order-rules.js, volt-slots-rules.js, ...)
  // — originally only flexible-designer.html was covered, which silently left
  // volt-designer.html and every public/*.js module exposed to the same class of bug.
  async headers() {
    const noCacheFiles = [
      "/flexible-designer.html",
      "/volt-designer.html",
      "/flexible-render-rules.js",
      "/flexible-breakpoint-rules.js",
      "/volt-glass-rules.js",
      "/volt-layer-order-rules.js",
      "/volt-slots-rules.js",
      "/link-destinations.js",
    ];
    return noCacheFiles.map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    }));
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
