/**
 * SEO engine run orchestrator — single entry point used by BOTH the cron route
 * and the instrumentation scheduler so persistence + alerting stay DRY.
 *
 * Flow: snapshot previous run → run engine → persist run (with score fields) →
 *       process regression alerts. Never throws — failures are recorded as a
 *       "failed" SeoEngineRun row and returned as { success: false }.
 */

import prisma from "@/lib/prisma";
import { runSeoEngine } from "@/lib/seo-engine";
import { processSeoAlerts, type SeoRunSnapshot } from "@/lib/seo-alerts";

export interface SeoEngineRunOutcome {
  success: boolean;
  durationMs: number;
  runId?: number;
  error?: string;
  result?: Awaited<ReturnType<typeof runSeoEngine>>;
  alert?: { alerted: boolean; reasons: string[] };
}

export async function executeSeoEngineRun(): Promise<SeoEngineRunOutcome> {
  const startMs = Date.now();

  // Snapshot the previous run BEFORE inserting this one (for regression compare).
  const previous = await prisma.seoEngineRun
    .findFirst({
      orderBy: { runAt: "desc" },
      select: { score: true, indexedPages: true, pagesAlerted: true },
    })
    .catch(() => null);

  try {
    const result = await runSeoEngine();
    const durationMs = Date.now() - startMs;

    const created = await prisma.seoEngineRun.create({
      data: {
        durationMs,
        status: "success",
        pagesAudited: result.pagesAudited,
        pagesAutoFilled: result.pagesAutoFilled,
        pagesProtected: result.pagesProtected,
        pagesAlerted: result.pagesAlerted,
        issues: result.issues as object[],
        score: result.score,
        onPageScore: result.onPageScore,
        contentScore: result.contentScore,
        performanceScore: result.performanceScore,
        indexedPages: result.indexedPages,
        avgPosition: result.avgPosition,
        impressions: result.impressions,
        clicks: result.clicks,
        ctr: result.ctr,
        breakdown: result.breakdown as object[],
      },
    });

    const alert = await processSeoAlerts(previous as SeoRunSnapshot | null, {
      score: result.score,
      indexedPages: result.indexedPages,
      pagesAlerted: result.pagesAlerted,
    }).catch(() => ({ alerted: false, reasons: [] as string[] }));

    return { success: true, durationMs, runId: created.id, result, alert };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.seoEngineRun
      .create({
        data: {
          durationMs,
          status: "failed",
          pagesAudited: 0,
          pagesAutoFilled: 0,
          pagesProtected: 0,
          pagesAlerted: 0,
          issues: [{ type: "engine_error", message }] as object[],
        },
      })
      .catch(() => {});
    return { success: false, durationMs, error: message };
  }
}
