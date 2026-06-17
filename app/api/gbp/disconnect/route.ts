import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { revokeGbpToken, deleteStoredGbpToken } from "@/lib/gbp-client";

export async function POST(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError instanceof NextResponse) return authError;
  await revokeGbpToken();
  await deleteStoredGbpToken();
  return NextResponse.json({ ok: true });
}
