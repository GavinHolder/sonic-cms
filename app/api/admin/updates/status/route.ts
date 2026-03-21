/**
 * GET /api/admin/updates/status
 * Poll the current update status.
 * If in_progress: checks GitHub Actions run status, runs health check on completion.
 * If completed+success: disables maintenance mode, sets status to idle.
 * If completed+failure: leaves maintenance ON, sets status to failed.
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getLatestWorkflowRun } from "@/lib/github-actions";

export const dynamic = "force-dynamic";

const HEALTH_TIMEOUT_MS = 10_000;
const HEALTH_MAX_ATTEMPTS = 3;
const HEALTH_ATTEMPT_DELAY_MS = 3_000;

async function upsert(key: string, value: string) {
  await prisma.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

async function getSettings(keys: string[]) {
  const rows = await prisma.systemSettings.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function healthCheck(siteUrl: string, expectedVersion: string): Promise<{ ok: boolean; error?: string }> {
  for (let attempt = 0; attempt < HEALTH_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, HEALTH_ATTEMPT_DELAY_MS));
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      const res = await fetch(`${siteUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json() as { status: string; version: string };
      if (data.status === "ok" && data.version === expectedVersion) {
        return { ok: true };
      }
      // Version mismatch — new container not up yet
    } catch {
      // timeout or network error — retry
    }
  }
  return { ok: false, error: `Health check did not return version ${expectedVersion} after ${HEALTH_MAX_ATTEMPTS} attempts` };
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const settings = await getSettings([
    "cms_update_status",
    "cms_update_scheduled",
    "cms_update_run_triggered_at",
    "cms_update_target_version",
    "cms_update_error",
    "github_pat",
    "github_repo_owner",
    "github_repo_name",
    "github_workflow_id",
    "cms_upstream_version_url",
  ]);

  const updateStatus = settings["cms_update_status"] ?? "idle";

  // If not in_progress, just return current state
  if (updateStatus !== "in_progress") {
    return NextResponse.json({
      updateStatus,
      scheduledTime: settings["cms_update_scheduled"] ?? null,
      lastError: settings["cms_update_error"] ?? null,
      githubRunStatus: null,
      githubRunUrl: null,
    });
  }

  // In progress — poll GitHub Actions
  const pat = settings["github_pat"];
  const owner = settings["github_repo_owner"];
  const repoName = settings["github_repo_name"];
  const workflowId = settings["github_workflow_id"] ?? "deploy.yml";
  const triggeredAt = settings["cms_update_run_triggered_at"];

  if (!pat || !owner || !repoName) {
    return NextResponse.json({ updateStatus: "in_progress", githubRunStatus: "unknown" });
  }

  try {
    const run = await getLatestWorkflowRun(owner, repoName, workflowId, pat, triggeredAt ?? undefined);

    if (!run) {
      // GitHub eventual consistency — run not visible yet
      return NextResponse.json({
        updateStatus: "in_progress",
        githubRunStatus: "queued",
        githubRunUrl: null,
        message: "Waiting for workflow run to appear...",
      });
    }

    if (run.status !== "completed") {
      return NextResponse.json({
        updateStatus: "in_progress",
        githubRunStatus: run.status,
        githubRunUrl: run.html_url,
      });
    }

    // Run completed — check conclusion
    if (run.conclusion === "success") {
      // Fetch the upstream version to know what we updated to
      const upstreamUrl = settings["cms_upstream_version_url"];
      let targetVersion = settings["cms_update_target_version"] ?? "unknown";
      if (upstreamUrl) {
        try {
          const vRes = await fetch(upstreamUrl);
          if (vRes.ok) {
            const vData = await vRes.json() as { version: string };
            targetVersion = vData.version;
          }
        } catch { /* ignore */ }
      }

      // Health check — allow 30s for new container to start
      await new Promise(r => setTimeout(r, 30_000));
      const siteUrl = process.env.SITE_URL ?? req.nextUrl.origin;
      const health = await healthCheck(siteUrl, targetVersion);

      if (health.ok) {
        await Promise.all([
          upsert("cms_update_status", "idle"),
          upsert("maintenance_mode", "false"),
          upsert("cms_update_error", ""),
        ]);
        return NextResponse.json({
          updateStatus: "completed",
          githubRunStatus: "completed",
          conclusion: "success",
          githubRunUrl: run.html_url,
          newVersion: targetVersion,
        });
      } else {
        await Promise.all([
          upsert("cms_update_status", "failed"),
          upsert("cms_update_error", health.error ?? "Health check failed after successful build"),
        ]);
        return NextResponse.json({
          updateStatus: "failed",
          githubRunStatus: "completed",
          conclusion: "success",
          githubRunUrl: run.html_url,
          error: health.error,
          message: "Build succeeded but health check failed. Maintenance mode is still active.",
        });
      }
    } else {
      // failure / cancelled / timed_out
      const errorMsg = `GitHub Actions run ${run.conclusion ?? "failed"}. See: ${run.html_url}`;
      await Promise.all([
        upsert("cms_update_status", "failed"),
        upsert("cms_update_error", errorMsg),
      ]);
      return NextResponse.json({
        updateStatus: "failed",
        githubRunStatus: "completed",
        conclusion: run.conclusion,
        githubRunUrl: run.html_url,
        error: errorMsg,
        message: "Update failed. Maintenance mode is still active.",
      });
    }
  } catch (err) {
    return NextResponse.json({
      updateStatus: "in_progress",
      githubRunStatus: "unknown",
      error: err instanceof Error ? err.message : "Failed to poll GitHub Actions",
    });
  }
}
