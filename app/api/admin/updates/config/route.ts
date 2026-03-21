/**
 * GET  /api/admin/updates/config  — return current update config (PAT masked)
 * PUT  /api/admin/updates/config  — save update config
 * SUPER_ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CONFIG_KEYS = [
  "github_pat",
  "github_repo_owner",
  "github_repo_name",
  "github_workflow_id",
  "cms_upstream_version_url",
];

async function upsert(key: string, value: string) {
  await prisma.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const rows = await prisma.systemSettings.findMany({ where: { key: { in: CONFIG_KEYS } } });
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));

  // Mask the PAT — return whether it's set and last 4 chars only
  const pat = settings["github_pat"] ?? "";
  return NextResponse.json({
    githubPatSet: pat.length > 0,
    githubPatHint: pat.length > 4 ? `...${pat.slice(-4)}` : pat.length > 0 ? "****" : "",
    githubRepoOwner: settings["github_repo_owner"] ?? "",
    githubRepoName: settings["github_repo_name"] ?? "",
    githubWorkflowId: settings["github_workflow_id"] ?? "deploy.yml",
    upstreamVersionUrl: settings["cms_upstream_version_url"] ?? "",
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as {
    githubPat?: string;
    githubRepoOwner?: string;
    githubRepoName?: string;
    githubWorkflowId?: string;
    upstreamVersionUrl?: string;
  };

  await Promise.all([
    body.githubPat                       ? upsert("github_pat",                body.githubPat)               : Promise.resolve(),
    body.githubRepoOwner !== undefined   ? upsert("github_repo_owner",          body.githubRepoOwner)         : Promise.resolve(),
    body.githubRepoName !== undefined    ? upsert("github_repo_name",           body.githubRepoName)          : Promise.resolve(),
    body.githubWorkflowId !== undefined  ? upsert("github_workflow_id",         body.githubWorkflowId)        : Promise.resolve(),
    body.upstreamVersionUrl !== undefined ? upsert("cms_upstream_version_url",  body.upstreamVersionUrl)      : Promise.resolve(),
  ]);

  // Return masked config
  const rows = await prisma.systemSettings.findMany({ where: { key: { in: CONFIG_KEYS } } });
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const pat = settings["github_pat"] ?? "";

  return NextResponse.json({
    success: true,
    githubPatSet: pat.length > 0,
    githubPatHint: pat.length > 4 ? `...${pat.slice(-4)}` : pat.length > 0 ? "****" : "",
    githubRepoOwner: settings["github_repo_owner"] ?? "",
    githubRepoName: settings["github_repo_name"] ?? "",
    githubWorkflowId: settings["github_workflow_id"] ?? "deploy.yml",
    upstreamVersionUrl: settings["cms_upstream_version_url"] ?? "",
  });
}
