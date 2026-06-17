/**
 * GET /api/seo/gsc/sites
 * Lists GSC site properties for the connected account.
 * Requires SUPER_ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { fetchSites, getStoredToken, updateStoredSiteUrl, GscNotConnectedError, GscApiError } from "@/lib/gsc-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError instanceof NextResponse) return authError;

  const token = await getStoredToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "NOT_CONNECTED" },
      { status: 400 },
    );
  }

  try {
    const sites = await fetchSites();
    return NextResponse.json({
      success: true,
      data: {
        sites,
        currentSiteUrl: token.siteUrl || null,
        accountEmail:   token.accountEmail,
      },
    });
  } catch (err) {
    if (err instanceof GscNotConnectedError) {
      return NextResponse.json({ success: false, error: "NOT_CONNECTED" }, { status: 400 });
    }
    if (err instanceof GscApiError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 502 });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch sites." }, { status: 500 });
  }
}

/**
 * PATCH /api/seo/gsc/sites
 * Updates the selected site URL stored in the token row.
 */
export async function PATCH(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError instanceof NextResponse) return authError;

  const body = await req.json() as { siteUrl?: string };
  if (!body.siteUrl) {
    return NextResponse.json({ success: false, error: "siteUrl is required." }, { status: 400 });
  }

  await updateStoredSiteUrl(body.siteUrl);
  return NextResponse.json({ success: true });
}
