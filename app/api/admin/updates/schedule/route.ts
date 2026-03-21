/**
 * DELETE /api/admin/updates/schedule
 * Cancel a scheduled midnight update.
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function upsert(key: string, value: string) {
  await prisma.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function DELETE(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  await Promise.all([
    upsert("cms_update_status", "idle"),
    upsert("cms_update_scheduled", ""),
  ]);

  return NextResponse.json({ success: true, message: "Scheduled update cancelled" });
}
