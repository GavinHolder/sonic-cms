import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

// Admin-managed service categories (Data, Voice, IoT, CCTV…).
export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const category = await prisma.serviceCategory.create({
    data: { name, order: body.order ?? 0, isActive: body.isActive ?? true },
  });
  return NextResponse.json(category, { status: 201 });
}
