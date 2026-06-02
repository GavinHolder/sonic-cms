import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runSeoEngine } from "@/lib/seo-engine";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!isCron) {
    const authError = await requireRole(req, UserRole.EDITOR);
    if (authError) return authError;
  }

  const startMs = Date.now();
  try {
    const result = await runSeoEngine();
    const durationMs = Date.now() - startMs;
    await prisma.seoEngineRun.create({
      data: { durationMs, status: "success", pagesAudited: result.pagesAudited, pagesAutoFilled: result.pagesAutoFilled, pagesProtected: result.pagesProtected, pagesAlerted: result.pagesAlerted, issues: result.issues as object[] },
    });
    return NextResponse.json({ success: true, ...result, durationMs });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.seoEngineRun.create({
      data: { durationMs, status: "failed", pagesAudited: 0, pagesAutoFilled: 0, pagesProtected: 0, pagesAlerted: 0, issues: [{ type: "engine_error", message }] as object[] },
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
