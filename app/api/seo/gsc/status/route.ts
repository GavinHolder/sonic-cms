/**
 * GET /api/seo/gsc/status
 * Returns per-page index status + 28-day impressions/clicks.
 * Capped at 50 pages (URL Inspection API has no batch endpoint).
 * Requires SUPER_ADMIN.
 *
 * Query params:
 *   siteUrl   — GSC property URL (required)
 *   limit     — max pages to inspect (default 50, max 50)
 *   offset    — pagination offset (default 0)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  fetchSearchAnalytics,
  inspectUrl,
  getStoredToken,
  GscNotConnectedError,
  GscApiError,
} from "@/lib/gsc-client";
import { fetchSeoConfig } from "@/lib/metadata-generator";

export const dynamic = "force-dynamic";

const MAX_PAGES   = 50;
const QUOTA_DAILY = 2000;

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError instanceof NextResponse) return authError;

  const token = await getStoredToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "NOT_CONNECTED" }, { status: 400 });
  }

  const { searchParams } = req.nextUrl;
  const siteUrl = searchParams.get("siteUrl") || token.siteUrl;

  if (!siteUrl) {
    return NextResponse.json(
      { success: false, error: "siteUrl is required — select a site property first." },
      { status: 400 },
    );
  }

  const limit  = Math.min(Number(searchParams.get("limit")  ?? MAX_PAGES), MAX_PAGES);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  // Get canonical base for building full URLs
  const seoConfig = await fetchSeoConfig();
  const base      = seoConfig.canonicalBase.replace(/\/+$/, "");

  // Fetch published pages
  const pages = await prisma.page.findMany({
    where:   { status: "PUBLISHED" },
    select:  { slug: true, title: true },
    orderBy: { title: "asc" },
    take:    limit,
    skip:    offset,
  });

  const total = await prisma.page.count({ where: { status: "PUBLISHED" } });

  if (pages.length === 0) {
    return NextResponse.json({
      success: true,
      data: { pages: [], total, limit, offset, quotaWarning: false },
    });
  }

  // Fetch 28-day search analytics (one call for all pages)
  const today     = new Date();
  const endDate   = today.toISOString().split("T")[0];
  const startDate = new Date(today.setDate(today.getDate() - 28)).toISOString().split("T")[0];

  let analyticsMap = new Map<string, { clicks: number; impressions: number }>();
  let quotaWarning = false;

  try {
    const rows = await fetchSearchAnalytics(siteUrl, startDate, endDate, ["page"], limit);
    for (const row of rows) {
      const url = row.keys[0] ?? "";
      analyticsMap.set(url, { clicks: row.clicks, impressions: row.impressions });
    }
  } catch (err) {
    if (err instanceof GscApiError && err.quotaExceeded) {
      quotaWarning = true;
    } else if (!(err instanceof GscNotConnectedError)) {
      // Non-fatal: analytics failure shouldn't block inspection results
      console.warn("[gsc/status] Analytics fetch failed:", err instanceof Error ? err.message : err);
    }
  }

  // Inspect each page URL (results cached 6h in gsc-client)
  let quotaHit = 0;
  const results = await Promise.allSettled(
    pages.map(async (page) => {
      const fullUrl = base ? `${base}/${page.slug}` : `/${page.slug}`;
      try {
        const inspection = await inspectUrl(siteUrl, fullUrl);
        const analytics  = analyticsMap.get(fullUrl) ?? { clicks: 0, impressions: 0 };
        return {
          slug:          page.slug,
          title:         page.title,
          url:           fullUrl,
          indexStatus:   inspection.indexStatusVerdict,
          coverageState: inspection.coverageState,
          lastCrawled:   inspection.lastCrawlTime ?? null,
          clicks28d:     analytics.clicks,
          impressions28d: analytics.impressions,
        };
      } catch (err) {
        if (err instanceof GscApiError && err.quotaExceeded) {
          quotaHit++;
          quotaWarning = true;
        }
        return {
          slug:          page.slug,
          title:         page.title,
          url:           fullUrl,
          indexStatus:   "UNKNOWN",
          coverageState: "",
          lastCrawled:   null,
          clicks28d:     0,
          impressions28d: 0,
          error:         err instanceof GscApiError ? err.message : "Inspection failed",
        };
      }
    }),
  );

  const pageData = results.map((r) => r.status === "fulfilled" ? r.value : null).filter(Boolean);

  return NextResponse.json({
    success: true,
    data: {
      pages:        pageData,
      total,
      limit,
      offset,
      siteUrl,
      quotaWarning,
      quotaHit,
      quotaLimit:   QUOTA_DAILY,
    },
  });
}
