/**
 * GET /api/seo/gsc/sitemaps
 * Returns submitted sitemaps for the connected GSC property.
 * Requires SUPER_ADMIN.
 *
 * Query params:
 *   siteUrl — GSC property URL (optional, falls back to stored siteUrl)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { fetchSitemaps, getStoredToken, GscNotConnectedError, GscApiError } from "@/lib/gsc-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError instanceof NextResponse) return authError;

  const token = await getStoredToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "NOT_CONNECTED" }, { status: 400 });
  }

  const siteUrl = req.nextUrl.searchParams.get("siteUrl") || token.siteUrl;

  if (!siteUrl) {
    return NextResponse.json(
      { success: false, error: "siteUrl is required — select a site property first." },
      { status: 400 },
    );
  }

  try {
    const sitemaps = await fetchSitemaps(siteUrl);
    return NextResponse.json({ success: true, data: { sitemaps, siteUrl } });
  } catch (err) {
    if (err instanceof GscNotConnectedError) {
      return NextResponse.json({ success: false, error: "NOT_CONNECTED" }, { status: 400 });
    }
    if (err instanceof GscApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 502 });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch sitemaps." }, { status: 500 });
  }
}
