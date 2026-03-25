/**
 * GET /api/seo/readiness
 * Returns go-live readiness checks for the SEO system.
 * Requires EDITOR role.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { fetchSeoConfig } from "@/lib/metadata-generator";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ReadinessCheck {
  id: string;
  label: string;
  pass: boolean;
  hint?: string;
  link?: string;
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, UserRole.EDITOR);
  if (auth instanceof NextResponse) return auth;

  const [seoConfig, maintenanceRow, sitemapCount] = await Promise.all([
    fetchSeoConfig(),
    prisma.systemSettings
      .findUnique({ where: { key: "maintenance_mode" } })
      .then((r) => r?.value ?? "false"),
    prisma.page.count({
      where: { status: "PUBLISHED", noindex: false },
    }),
  ]);

  const maintenanceOff = maintenanceRow !== "true";
  const hasCanonical = Boolean(seoConfig.canonicalBase?.trim());
  const hasDescription = Boolean(
    seoConfig.defaultDescription?.trim() &&
      seoConfig.defaultDescription !== "Professional services for your region."
  );
  const hasSitemapUrls = sitemapCount >= 1;
  const hasOgImage = Boolean(
    seoConfig.social?.ogImage?.trim() &&
      seoConfig.social.ogImage !== "/images/logo-placeholder.svg"
  );

  const noindexGlobal = Boolean(
    seoConfig.robots?.disallowPaths?.includes("/")
  );
  const indexingAllowed = !noindexGlobal;

  const checks: ReadinessCheck[] = [
    {
      id: "maintenance_off",
      label: "Maintenance mode OFF",
      pass: maintenanceOff,
      hint: "Turn off in Settings → Site → Maintenance Mode",
      link: "/admin/settings",
    },
    {
      id: "canonical_base",
      label: "Canonical base URL set",
      pass: hasCanonical,
      hint: "Set in SEO → Site Settings → Canonical Base URL",
      link: "/admin/content/seo",
    },
    {
      id: "meta_description",
      label: "Default meta description set",
      pass: hasDescription,
      hint: "Set in SEO → Site Settings → Default Meta Description",
      link: "/admin/content/seo",
    },
    {
      id: "sitemap_has_urls",
      label: "Sitemap has published pages",
      pass: hasSitemapUrls,
      hint: "Publish at least one page in Content → Pages",
      link: "/admin/content/pages",
    },
    {
      id: "og_image",
      label: "OG image set",
      pass: hasOgImage,
      hint: "Set in SEO → Social & OG → Default OG Image URL",
      link: "/admin/content/seo",
    },
    {
      id: "indexing_allowed",
      label: "Indexing allowed",
      pass: indexingAllowed,
      hint: "Remove '/' from disallowed paths in SEO → Robots & Sitemap",
      link: "/admin/content/seo",
    },
  ];

  const passCount = checks.filter((c) => c.pass).length;

  return NextResponse.json({
    checks,
    passCount,
    totalCount: checks.length,
    canonicalBase: seoConfig.canonicalBase || "",
  });
}
