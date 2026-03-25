/**
 * Next.js instrumentation — runs once on server startup (Node.js runtime).
 * Handles two background tasks:
 *
 * 1. Scheduled update trigger: checks every 60s if a midnight update is due.
 * 2. Maintenance mode failsafe: if maintenance has been active for >45 minutes
 *    (e.g. update failed/hung and admin isn't watching), auto-disables it so
 *    the site doesn't stay locked forever.
 */

export async function register() {
  // Only run in the Node.js runtime, not Edge
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Lazy-import to avoid pulling Prisma into Edge bundles
  const { default: prisma } = await import("@/lib/prisma");
  const { dispatchWorkflow } = await import("@/lib/github-actions");

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

  async function tick() {
    try {
      const settings = await getSettings([
        "cms_update_status",
        "cms_update_scheduled",
        "cms_update_run_triggered_at",
        "maintenance_mode",
        "github_pat",
        "github_repo_owner",
        "github_repo_name",
        "github_workflow_id",
      ]);

      const status = settings["cms_update_status"] ?? "idle";
      const maintenanceOn = settings["maintenance_mode"] === "true";

      // ── Task 1: Trigger a scheduled update when its time has come ──────────
      if (status === "scheduled") {
        const scheduledAt = settings["cms_update_scheduled"];
        if (scheduledAt && new Date(scheduledAt) <= new Date()) {
          const pat = settings["github_pat"];
          const owner = settings["github_repo_owner"];
          const repoName = settings["github_repo_name"];
          const workflowId = settings["github_workflow_id"] ?? "deploy.yml";

          if (pat && owner && repoName) {
            const triggeredAt = new Date().toISOString();
            await Promise.all([
              upsert("cms_update_status", "in_progress"),
              upsert("maintenance_mode", "true"),
              upsert("cms_update_run_triggered_at", triggeredAt),
              upsert("cms_update_error", ""),
              upsert("cms_update_scheduled", ""),
            ]);
            try {
              await dispatchWorkflow(owner, repoName, workflowId, "main", pat);
            } catch (err) {
              await Promise.all([
                upsert("cms_update_status", "failed"),
                upsert("maintenance_mode", "false"),
                upsert("cms_update_error", err instanceof Error ? err.message : "Scheduled dispatch failed"),
              ]);
            }
          } else {
            // GitHub not configured — cancel and warn
            await Promise.all([
              upsert("cms_update_status", "failed"),
              upsert("cms_update_scheduled", ""),
              upsert("cms_update_error", "Scheduled update could not run — GitHub settings not configured"),
            ]);
          }
        }
      }

      // ── Task 2: Maintenance mode failsafe ───────────────────────────────────
      // If maintenance has been on for >45 minutes, something went wrong.
      // Auto-disable so the site doesn't stay locked forever.
      if (maintenanceOn && status === "in_progress") {
        const triggeredAt = settings["cms_update_run_triggered_at"];
        if (triggeredAt) {
          const elapsedMs = Date.now() - new Date(triggeredAt).getTime();
          const FAILSAFE_MS = 45 * 60 * 1000; // 45 minutes
          if (elapsedMs > FAILSAFE_MS) {
            await Promise.all([
              upsert("maintenance_mode", "false"),
              upsert("cms_update_status", "failed"),
              upsert("cms_update_error", "Update timed out after 45 minutes — maintenance mode auto-disabled. Check GitHub Actions for details."),
            ]);
          }
        }
      }
    } catch {
      // Silently swallow errors — instrumentation must never crash the server
    }
  }

  // Delay first tick by 5s to let Prisma/DB connections establish
  setTimeout(tick, 5_000);
  setInterval(tick, 60_000);

  // Seed plugin registry (idempotent — safe on every startup)
  try {
    const { seedBuiltinPlugins } = await import("@/lib/plugins/registry");
    await seedBuiltinPlugins();
  } catch (e) {
    console.error("[Plugins] Failed to seed plugin registry:", e);
  }
}
