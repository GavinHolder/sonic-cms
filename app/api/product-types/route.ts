import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Admin-managed marketing product types (Fibre, Wireless, Voice, Hosting…) — the
// top-level "Layer 1" scope for the Product Card Grid block. Mirrors the
// ServiceCategory admin pattern with a richer field set (slug/icon/color/order).
export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const productTypes = await prisma.productType.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(productTypes);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  // Slug is automatic: derive from name (or supplied slug), then ensure uniqueness.
  const base = slugify(body.slug || name) || "product-type";
  let uniqueSlug = base;
  for (let i = 2; await prisma.productType.findUnique({ where: { slug: uniqueSlug } }); i++) {
    uniqueSlug = `${base}-${i}`;
  }

  const productType = await prisma.productType.create({
    data: {
      name,
      slug: uniqueSlug,
      icon: body.icon || null,
      color: body.color || "#22c55e",
      order: body.order ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(productType, { status: 201 });
}
