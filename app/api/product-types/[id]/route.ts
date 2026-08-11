import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();

  // Re-derive + re-uniquify the slug only when the caller actually sent one
  // (renaming shouldn't silently change the slug and break existing block bindings).
  let slugUpdate: { slug?: string } = {};
  if (body.slug !== undefined) {
    const base = slugify(body.slug) || "product-type";
    let uniqueSlug = base;
    for (let i = 2; await prisma.productType.findFirst({ where: { slug: uniqueSlug, NOT: { id } } }); i++) {
      uniqueSlug = `${base}-${i}`;
    }
    slugUpdate = { slug: uniqueSlug };
  }

  const productType = await prisma.productType.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...slugUpdate,
      ...(body.icon !== undefined && { icon: body.icon || null }),
      ...(body.color !== undefined && { color: body.color || "#22c55e" }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
  return NextResponse.json(productType);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  // Packages keep their data; productTypeId is set null (FK onDelete: SetNull).
  await prisma.productType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
