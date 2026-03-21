/**
 * POST /api/admin/updates/trigger
 * Trigger an update now or schedule it for midnight.
 * Body: { mode: "now" | "midnight" }
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { dispatchWorkflow } from "@/lib/github-actions";

export const dynamic = "force-dynamic";

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

function nextMidnight(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as { mode: "now" | "midnight"; _scheduled?: boolean };
  const { mode } = body;

  const settings = await getSettings([
    "cms_update_status",
    "github_pat",
    "github_repo_owner",
    "github_repo_name",
    "github_workflow_id",
    "cms_update_target_version",
  ]);

  const currentStatus = settings["cms_update_status"] ?? "idle";

  // Guard: don't double-trigger
  if (currentStatus === "in_progress") {
    return NextResponse.json({ error: "An update is already in progress" }, { status: 409 });
  }

  if (mode === "midnight") {
    const scheduledFor = nextMidnight();
    await Promise.all([
      upsert("cms_update_status", "scheduled"),
      upsert("cms_update_scheduled", scheduledFor),
    ]);
    return NextResponse.json({ success: true, scheduledFor });
  }

  // mode === "now"
  const pat = settings["github_pat"];
  const owner = settings["github_repo_owner"];
  const repoName = settings["github_repo_name"];
  const workflowId = settings["github_workflow_id"] ?? "deploy.yml";

  if (!pat || !owner || !repoName) {
    return NextResponse.json(
      { error: "GitHub PAT, repo owner, and repo name must be configured in CMS Update settings" },
      { status: 400 },
    );
  }

  // Enable maintenance mode
  await upsert("maintenance_mode", "true");

  // Set status to in_progress
  const triggeredAt = new Date().toISOString();
  await Promise.all([
    upsert("cms_update_status", "in_progress"),
    upsert("cms_update_run_triggered_at", triggeredAt),
    upsert("cms_update_error", ""),
    upsert("cms_update_scheduled", ""),
  ]);

  try {
    await dispatchWorkflow(owner, repoName, workflowId, "main", pat);
  } catch (err) {
    // Dispatch failed — revert maintenance mode and status
    await Promise.all([
      upsert("cms_update_status", "failed"),
      upsert("cms_update_error", err instanceof Error ? err.message : "Dispatch failed"),
    ]);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to trigger update workflow" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, triggeredAt });
}
