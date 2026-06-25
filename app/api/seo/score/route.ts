import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { gatherSeoScore } from "@/lib/seo-score-gather";

export const dynamic = "force-dynamic";

/**
 * GET /api/seo/score
 * Latest persisted score + sub-scores, a live on-page breakdown, GSC metrics,
 * a trend series for the sparkline, and scheduler/alert automation status.
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, UserRole.EDITOR);
  if (auth instanceof NextResponse) return auth;

  const [latest, trendRuns, settingsRows, gathered] = await Promise.all([
    prisma.seoEngineRun
      .findFirst({ where: { status: "success" }, orderBy: { runAt: "desc" } })
      .catch(() => null),
    prisma.seoEngineRun
      .findMany({
        where: { status: "success" },
        orderBy: { runAt: "desc" },
        take: 14,
        select: { runAt: true, score: true, onPageScore: true, contentScore: true, performanceScore: true },
      })
      .catch(() => []),
    prisma.systemSettings
      .findMany({
        where: {
          key: {
            in: ["seo_engine_last_run", "seo_engine_interval_hours", "seo_last_alert", "seo_alert_enabled"],
          },
        },
      })
      .catch(() => []),
    gatherSeoScore().catch(() => null),
  ]);

  const s = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));
  const intervalHours = parseInt(s["seo_engine_interval_hours"] ?? "24", 10) || 24;
  const lastRunIso = s["seo_engine_last_run"] ?? latest?.runAt?.toISOString() ?? null;
  const nextRunIso = lastRunIso
    ? new Date(new Date(lastRunIso).getTime() + intervalHours * 3_600_000).toISOString()
    : null;

  return NextResponse.json({
    score: latest?.score ?? gathered?.result.total ?? null,
    onPageScore: latest?.onPageScore ?? gathered?.result.onPage ?? null,
    contentScore: latest?.contentScore ?? gathered?.result.content ?? null,
    performanceScore: latest?.performanceScore ?? gathered?.result.performance ?? null,
    hasRun: !!latest,
    metrics: {
      indexedPages: latest?.indexedPages ?? null,
      avgPosition: latest?.avgPosition ?? null,
      impressions: latest?.impressions ?? null,
      clicks: latest?.clicks ?? null,
      ctr: latest?.ctr ?? null,
      pagesAudited: latest?.pagesAudited ?? gathered?.metrics.totalPages ?? 0,
      pagesAlerted: latest?.pagesAlerted ?? 0,
      gscConnected: gathered?.metrics.gscConnected ?? false,
    },
    breakdown: latest?.breakdown ?? gathered?.result.breakdown ?? [],
    issues: latest?.issues ?? [],
    trend: trendRuns
      .slice()
      .reverse()
      .map((r) => ({
        runAt: r.runAt,
        score: r.score,
        onPageScore: r.onPageScore,
        performanceScore: r.performanceScore,
      })),
    automation: {
      lastRun: latest?.runAt ?? null,
      lastRunStamp: lastRunIso,
      nextRun: nextRunIso,
      intervalHours,
      lastAlert: s["seo_last_alert"] ?? null,
      alertsEnabled: s["seo_alert_enabled"] !== "false",
    },
  });
}
