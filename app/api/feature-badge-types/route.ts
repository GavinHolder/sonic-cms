import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

// Admin-managed feature badge types (Device, Line Rental, Monthly Minutes…) that a
// Package's features can be labelled with — see FeatureBadgeType model comment in
// prisma/schema.prisma. Mirrors the PackageTerm/ServiceCategory admin CRUD pattern,
// EXCEPT GET is intentionally public (no requireRole): public package cards fetch
// this once per block to resolve a badge's help text for the hover/tap tooltip
// (name + helpText are non-sensitive, admin-authored marketing copy), unlike the
// sibling lookup lists which are only ever consumed by the admin UI.
export async function GET() {
  const types = await prisma.featureBadgeType.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(types);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const type = await prisma.featureBadgeType.create({
    data: {
      name,
      helpText: body.helpText ? String(body.helpText).trim() : null,
      order: body.order ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(type, { status: 201 });
}
