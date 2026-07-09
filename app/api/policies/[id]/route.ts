import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";
import DOMPurify from "isomorphic-dompurify";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin-only: this returns the full record (incl. disabled policies) for editing.
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(policy);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const data = await request.json();

  // If slug is being changed, keep it unique (excluding this record).
  let slugUpdate: { slug: string } | Record<string, never> = {};
  if (data.slug !== undefined) {
    const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const base = slugify(data.slug) || "policy";
    let uniqueSlug = base;
    for (
      let i = 2;
      await prisma.policy.findFirst({ where: { slug: uniqueSlug, NOT: { id } } });
      i++
    ) {
      uniqueSlug = `${base}-${i}`;
    }
    slugUpdate = { slug: uniqueSlug };
  }

  const policy = await prisma.policy.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...slugUpdate,
      ...(data.body !== undefined && { body: DOMPurify.sanitize(typeof data.body === "string" ? data.body : "") }),
      ...(data.navLabel !== undefined && { navLabel: data.navLabel || null }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.enabled !== undefined && { enabled: !!data.enabled }),
      ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle || null }),
      ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription || null }),
      ...(data.noindex !== undefined && { noindex: !!data.noindex }),
    },
  });
  return NextResponse.json(policy);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await prisma.policy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
