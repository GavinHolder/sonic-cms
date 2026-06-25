/**
 * SEO regression alerting — compares a freshly-completed engine run against the
 * previous one and emails the admin when something meaningfully worsened.
 *
 * Triggers (any one fires an alert):
 *  1. Score dropped by >= seo_alert_score_drop points (default 3).
 *  2. Fewer pages indexed than the previous run (GSC-connected runs only).
 *  3. More pages have issues than the previous run.
 *
 * Settings (system_settings):
 *  - seo_alert_enabled       : "false" disables alerting (default enabled)
 *  - seo_alert_score_drop    : integer threshold (default 3)
 *  - seo_last_alert          : ISO timestamp of the last alert sent (written here)
 *
 * FAILURE MODES:
 *  - SMTP unconfigured → sendSeoAlertEmail returns silently; we still stamp nothing.
 *  - Email send throws → caught here so a mail failure never fails the engine run.
 */

import prisma from "@/lib/prisma";
import { sendSeoAlertEmail } from "@/lib/email";

export interface SeoRunSnapshot {
  score: number | null;
  indexedPages: number | null;
  pagesAlerted: number;
}

const DEFAULT_SCORE_DROP = 3;

export async function processSeoAlerts(
  previous: SeoRunSnapshot | null,
  current: SeoRunSnapshot,
): Promise<{ alerted: boolean; reasons: string[] }> {
  // Nothing to compare against on the very first run.
  if (!previous) return { alerted: false, reasons: [] };

  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: ["seo_alert_enabled", "seo_alert_score_drop"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  if (map["seo_alert_enabled"] === "false") return { alerted: false, reasons: [] };

  const scoreDropThreshold = Number.isFinite(parseInt(map["seo_alert_score_drop"], 10))
    ? Math.max(1, parseInt(map["seo_alert_score_drop"], 10))
    : DEFAULT_SCORE_DROP;

  const reasons: string[] = [];

  if (
    previous.score != null &&
    current.score != null &&
    previous.score - current.score >= scoreDropThreshold
  ) {
    reasons.push(
      `SEO score dropped ${previous.score - current.score} points (${previous.score} → ${current.score}).`,
    );
  }

  if (
    previous.indexedPages != null &&
    current.indexedPages != null &&
    current.indexedPages < previous.indexedPages
  ) {
    reasons.push(
      `Fewer pages indexed by Google (${previous.indexedPages} → ${current.indexedPages}).`,
    );
  }

  if (current.pagesAlerted > previous.pagesAlerted) {
    reasons.push(
      `More pages have SEO issues (${previous.pagesAlerted} → ${current.pagesAlerted}).`,
    );
  }

  if (reasons.length === 0) return { alerted: false, reasons: [] };

  try {
    await sendSeoAlertEmail("Regression detected", reasons);
    await prisma.systemSettings.upsert({
      where: { key: "seo_last_alert" },
      update: { value: new Date().toISOString() },
      create: { key: "seo_last_alert", value: new Date().toISOString() },
    });
  } catch {
    // Mail failure must never fail the engine run.
    return { alerted: false, reasons };
  }

  return { alerted: true, reasons };
}
