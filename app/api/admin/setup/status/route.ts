/**
 * GET /api/admin/setup/status — check if first-run setup is complete.
 * Returns { setupComplete, missingFields } based on SystemSettings.
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REQUIRED_KEYS = [
  "github_repo_owner",
  "github_repo_name",
  "github_pat",
  "cms_upstream_version_url",
] as const;

export async function GET(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const rows = await prisma.systemSettings.findMany({
    where: { key: { in: [...REQUIRED_KEYS] } },
  });

  const settings = new Map(rows.map((r) => [r.key, r.value]));
  const missingFields: string[] = [];

  for (const key of REQUIRED_KEYS) {
    const val = settings.get(key);
    if (!val || val.trim() === "") {
      missingFields.push(key);
    }
  }

  // Also check the explicit setup-complete flag
  const setupFlag = await prisma.systemSettings.findUnique({
    where: { key: "cms_setup_complete" },
  });

  const setupComplete =
    setupFlag?.value === "true" && missingFields.length === 0;

  return NextResponse.json({ setupComplete, missingFields });
}
