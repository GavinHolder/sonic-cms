import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.EDITOR);
  if (authError instanceof NextResponse) return authError;
  const runs = await prisma.seoEngineRun.findMany({ orderBy: { runAt: "desc" }, take: 7 });
  return NextResponse.json({ success: true, runs });
}
