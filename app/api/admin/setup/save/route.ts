/**
 * POST /api/admin/setup/save — persist all setup wizard fields.
 * Saves to SiteConfig (company name) and SystemSettings (github, portainer, etc.).
 * Marks setup as complete by upserting cms_setup_complete = "true".
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function upsertSetting(key: string, value: string) {
  await prisma.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

interface SetupBody {
  companyName?: string;
  siteDomain?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubPat?: string;
  workflowId?: string;
  upstreamUrl?: string;
  portainerUrl?: string;
  portainerUsername?: string;
  portainerPassword?: string;
  portainerStackId?: string;
  portainerEndpointId?: string;
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as SetupBody;

  // ── SiteConfig (company name) ──
  if (body.companyName) {
    await prisma.siteConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", companyName: body.companyName },
      update: { companyName: body.companyName },
    });
  }

  // ── SystemSettings (all key-value pairs) ──
  const settingsMap: Array<[string, string | undefined]> = [
    ["site_domain", body.siteDomain],
    ["github_repo_owner", body.githubOwner],
    ["github_repo_name", body.githubRepo],
    ["github_pat", body.githubPat],
    ["github_workflow_id", body.workflowId],
    ["cms_upstream_version_url", body.upstreamUrl],
    ["portainer_url", body.portainerUrl],
    ["portainer_username", body.portainerUsername],
    ["portainer_password", body.portainerPassword],
    ["portainer_stack_id", body.portainerStackId],
    ["portainer_endpoint_id", body.portainerEndpointId],
  ];

  const upserts = settingsMap
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([key, value]) => upsertSetting(key, value as string));

  await Promise.all(upserts);

  // ── Mark setup complete ──
  await upsertSetting("cms_setup_complete", "true");

  return NextResponse.json({ success: true });
}
