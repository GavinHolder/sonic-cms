/**
 * POST /api/seo/audit
 *
 * Scans all published pages and generates a SEO health report.
 * Results are persisted to /data/seo-audit.json.
 *
 * Triggered by:
 * - Admin UI: "Run Audit Now" button (requires EDITOR role)
 * - Vercel cron: monthly on the 1st (validates CRON_SECRET header)
 *
 * ASSUMPTIONS:
 * 1. Only PUBLISHED pages are included in the audit
 * 2. Audit results replace the previous run (no history kept)
 * 3. prisma.page.findMany is fast enough (<500ms) for typical site sizes
 *
 * FAILURE MODES:
 * - DB unreachable → 500 with error message
 * - /data not writable → 500 with error (audit runs but can't persist)
 * - Cron called without secret → 401
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-middleware";

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "seo-audit.json");

interface PageIssue {
  severity: "warning" | "error";
  message: string;
}

interface PageAuditResult {
  slug: string;
  title: string;
  status: "pass" | "warn" | "error";
  issues: PageIssue[];
}

interface AuditResult {
  runAt: string;
  totalPages: number;
  passed: number;
  warnings: number;
  errors: number;
  pages: PageAuditResult[];
}

function auditPage(page: {
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  noindex: boolean;
}): PageAuditResult {
  const issues: PageIssue[] = [];
  const effectiveTitle = page.metaTitle || page.title;

  if (!page.metaTitle) {
    issues.push({ severity: "warning", message: "No custom meta title set — page title will be used" });
  }
  if (effectiveTitle.length > 60) {
    issues.push({ severity: "warning", message: `Title too long (${effectiveTitle.length} chars, ideal ≤60)` });
  }
  if (!page.metaDescription) {
    issues.push({ severity: "error", message: "Missing meta description" });
  } else if (page.metaDescription.length < 50) {
    issues.push({ severity: "warning", message: `Description too short (${page.metaDescription.length} chars, ideal 50–160)` });
  } else if (page.metaDescription.length > 160) {
    issues.push({ severity: "warning", message: `Description too long (${page.metaDescription.length} chars, ideal ≤160)` });
  }
  if (!page.ogImage) {
    issues.push({ severity: "warning", message: "No OG image — social shares will use site default" });
  }
  if (page.noindex) {
    issues.push({ severity: "warning", message: "Page is set to noindex — excluded from search engines" });
  }

  const hasError = issues.some((i) => i.severity === "error");
  const hasWarning = issues.some((i) => i.severity === "warning");
  const status = hasError ? "error" : hasWarning ? "warn" : "pass";

  return { slug: page.slug, title: effectiveTitle, status, issues };
}

export async function POST(request: NextRequest) {
  try {
    // Accept either EDITOR role (admin manual trigger) or Vercel cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const user = requireRole(request, "EDITOR");
      if (user instanceof NextResponse) return user;
    }

    // Fetch all published pages
    const pages = await prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        title: true,
        metaTitle: true,
        metaDescription: true,
        ogImage: true,
        noindex: true,
      },
    });

    // Audit each page
    const pageResults = pages.map(auditPage);

    // Check for duplicate titles and descriptions
    const titleCounts = new Map<string, number>();
    const descCounts = new Map<string, number>();
    pages.forEach((p) => {
      const t = (p.metaTitle || p.title).toLowerCase();
      titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
      if (p.metaDescription) {
        const d = p.metaDescription.toLowerCase();
        descCounts.set(d, (descCounts.get(d) ?? 0) + 1);
      }
    });

    pageResults.forEach((result, i) => {
      const t = result.title.toLowerCase();
      if ((titleCounts.get(t) ?? 0) > 1) {
        result.issues.push({ severity: "error", message: "Duplicate title — multiple pages share this title" });
        result.status = "error";
      }
      const p = pages[i];
      if (p.metaDescription) {
        const d = p.metaDescription.toLowerCase();
        if ((descCounts.get(d) ?? 0) > 1) {
          result.issues.push({ severity: "error", message: "Duplicate meta description — multiple pages share this description" });
          result.status = "error";
        }
      }
    });

    const passed = pageResults.filter((r) => r.status === "pass").length;
    const warnings = pageResults.filter((r) => r.status === "warn").length;
    const errors = pageResults.filter((r) => r.status === "error").length;

    const audit: AuditResult = {
      runAt: new Date().toISOString(),
      totalPages: pages.length,
      passed,
      warnings,
      errors,
      pages: pageResults,
    };

    // Persist results
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
    await writeFile(AUDIT_FILE, JSON.stringify(audit, null, 2), "utf-8");

    return NextResponse.json({ success: true, data: audit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { readFile } = await import("fs/promises");
    if (!existsSync(AUDIT_FILE)) {
      return NextResponse.json({ success: true, data: null });
    }
    const raw = await readFile(AUDIT_FILE, "utf-8");
    return NextResponse.json({ success: true, data: JSON.parse(raw) });
  } catch (error) {
    return handleApiError(error);
  }
}
