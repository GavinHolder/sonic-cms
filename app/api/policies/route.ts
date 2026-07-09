import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";
import { getPlugin } from "@/lib/plugins/registry";
import DOMPurify from "isomorphic-dompurify";

/**
 * GET /api/policies
 *
 * Two modes:
 *  - `?enabled=true` (public consumption — footer, LinkPicker, public index):
 *    open (no auth), but gated on the Policies plugin being enabled. Returns
 *    only enabled policies ordered by `order`. Returns [] when the plugin is
 *    disabled so dependent UI (footer Legal column, LinkPicker group) vanishes.
 *  - no filter (admin list): requires SUPER_ADMIN, returns all policies.
 */
export async function GET(request: NextRequest) {
  const enabledOnly = request.nextUrl.searchParams.get("enabled") === "true";

  if (enabledOnly) {
    // Public path — gate on plugin enabled, no auth required.
    const plugin = await getPlugin("policies");
    if (!plugin || !plugin.enabled) return NextResponse.json([]);

    const policies = await prisma.policy.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(policies);
  }

  // Admin path — full list.
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const policies = await prisma.policy.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(policies);
}

/**
 * POST /api/policies — create a policy.
 *
 * ASSUMPTIONS:
 * 1. Caller is SUPER_ADMIN (enforced by requireRole).
 * 2. `title` is required; `slug` derived from title (or supplied slug) and made unique.
 * 3. `body` is untrusted HTML — sanitized with DOMPurify before persisting.
 */
export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const data = await request.json();
  const { title, slug, body, navLabel, order, enabled, metaTitle, metaDescription, noindex } = data;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Slug is automatic: derive from title (or supplied slug), then ensure uniqueness.
  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = slugify(slug || title) || "policy";
  let uniqueSlug = base;
  for (let i = 2; await prisma.policy.findUnique({ where: { slug: uniqueSlug } }); i++) {
    uniqueSlug = `${base}-${i}`;
  }

  const policy = await prisma.policy.create({
    data: {
      title,
      slug: uniqueSlug,
      body: DOMPurify.sanitize(typeof body === "string" ? body : ""),
      navLabel: navLabel || null,
      order: typeof order === "number" ? order : 0,
      enabled: enabled !== undefined ? !!enabled : true,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      noindex: !!noindex,
      createdBy: auth.userId,
    },
  });
  return NextResponse.json(policy, { status: 201 });
}
