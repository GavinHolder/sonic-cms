/**
 * GET /api/admin/updates/check
 * Compare local cms-version.json against upstream master version URL.
 * Returns update availability, changelog, and current update status.
 * Any authenticated admin user (read-only check — trigger routes remain SUPER_ADMIN only).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";
import localVersion from "@/public/cms-version.json";

export const dynamic = "force-dynamic";

function semverGt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

function semverDistance(from: string, to: string): { major: number; minor: number; patch: number; total: number } {
  const [fMaj, fMin, fPat] = from.split(".").map(Number);
  const [tMaj, tMin, tPat] = to.split(".").map(Number);
  const major = (tMaj ?? 0) - (fMaj ?? 0);
  const minor = (tMin ?? 0) - (fMin ?? 0);
  const patch = (tPat ?? 0) - (fPat ?? 0);
  return { major, minor, patch, total: major * 10000 + minor * 100 + patch };
}

async function getSettings(keys: string[]) {
  const rows = await prisma.systemSettings.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const settings = await getSettings([
    "cms_upstream_version_url",
    "cms_update_status",
    "cms_update_scheduled",
    "cms_update_target_version",
    "cms_update_error",
  ]);

  const upstreamUrl = settings["cms_upstream_version_url"];
  if (!upstreamUrl) {
    return NextResponse.json({
      localVersion: localVersion.version,
      upstreamVersion: null,
      updateAvailable: false,
      changelog: null,
      updateStatus: settings["cms_update_status"] ?? "idle",
      scheduledTime: settings["cms_update_scheduled"] ?? null,
      error: "Update checking not configured — set upstream version URL in CMS Update settings",
    });
  }

  try {
    const res = await fetch(upstreamUrl, {
      next: { revalidate: 300 }, // cache 5 min
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }

    const upstream = await res.json() as {
      version: string;
      date: string;
      changelog: { features: string[]; bugfixes: string[]; breaking: string[] };
    };

    const updateAvailable = semverGt(upstream.version, localVersion.version);
    const gap = semverDistance(localVersion.version, upstream.version);
    const largeJump = gap.major > 0 || gap.minor >= 2;

    // If scheduled time has passed and status is still "scheduled", auto-trigger
    const scheduled = settings["cms_update_scheduled"];
    const updateStatus = settings["cms_update_status"] ?? "idle";
    if (
      updateStatus === "scheduled" &&
      scheduled &&
      new Date(scheduled) <= new Date()
    ) {
      // Fire the internal trigger (non-blocking — respond first)
      void fetch(`${req.nextUrl.origin}/api/admin/updates/trigger`, {
        method: "POST",
        headers: { ...Object.fromEntries(req.headers), "content-type": "application/json" },
        body: JSON.stringify({ mode: "now", _scheduled: true }),
      }).catch(() => {});
    }

    return NextResponse.json({
      localVersion: localVersion.version,
      upstreamVersion: upstream.version,
      upstreamDate: upstream.date,
      updateAvailable,
      changelog: upstream.changelog,
      updateStatus,
      scheduledTime: scheduled ?? null,
      targetVersion: settings["cms_update_target_version"] ?? null,
      lastError: settings["cms_update_error"] ?? null,
      versionGap: gap,
      largeJump,
    });
  } catch (err) {
    return NextResponse.json({
      localVersion: localVersion.version,
      upstreamVersion: null,
      updateAvailable: false,
      changelog: null,
      updateStatus: settings["cms_update_status"] ?? "idle",
      scheduledTime: settings["cms_update_scheduled"] ?? null,
      error: `Could not reach upstream: ${err instanceof Error ? err.message : "unknown error"}`,
    });
  }
}
