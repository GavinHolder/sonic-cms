/**
 * POST /api/seo/gsc/inspect
 * Inspects a single URL via the GSC URL Inspection API.
 * NOTE: This returns inspection data only — the GSC API cannot programmatically
 * request indexing. For indexing requests, users must use GSC directly.
 * Requires SUPER_ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { inspectUrl, getStoredToken, GscNotConnectedError, GscApiError } from "@/lib/gsc-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError instanceof NextResponse) return authError;

  const token = await getStoredToken();
  if (!token) {
    return NextResponse.json({ success: false, error: "NOT_CONNECTED" }, { status: 400 });
  }

  const body = await req.json() as { url?: string; siteUrl?: string };
  const url     = body.url?.trim()     ?? "";
  const siteUrl = body.siteUrl?.trim() ?? token.siteUrl;

  if (!url) {
    return NextResponse.json({ success: false, error: "url is required." }, { status: 400 });
  }
  if (!siteUrl) {
    return NextResponse.json(
      { success: false, error: "siteUrl is required — select a site property first." },
      { status: 400 },
    );
  }

  try {
    const result = await inspectUrl(siteUrl, url);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof GscNotConnectedError) {
      return NextResponse.json({ success: false, error: "NOT_CONNECTED" }, { status: 400 });
    }
    if (err instanceof GscApiError) {
      return NextResponse.json(
        { success: false, error: err.message, quotaExceeded: err.quotaExceeded },
        { status: err.quotaExceeded ? 429 : 502 },
      );
    }
    return NextResponse.json({ success: false, error: "Inspection failed." }, { status: 500 });
  }
}
