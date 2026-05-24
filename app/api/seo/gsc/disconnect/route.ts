/**
 * POST /api/seo/gsc/disconnect
 * Revokes Google token and deletes stored credentials.
 * Requires SUPER_ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { revokeToken, deleteStoredToken } from "@/lib/gsc-client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError) return authError;

  // Best-effort revocation at Google (logs warning on failure, does not throw)
  await revokeToken();

  // Delete all local token rows and clear inspection cache
  await deleteStoredToken();

  return NextResponse.json({ success: true });
}
