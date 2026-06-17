import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

// Create a package under a network.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;
  const { id: networkId } = await params;
  const body = await request.json();
  const { name, price } = body;
  if (!name || !price) {
    return NextResponse.json({ error: "name and price are required" }, { status: 400 });
  }
  const pkg = await prisma.package.create({
    data: {
      networkId,
      name,
      price: String(price),
      speedDown: body.speedDown || null,
      speedUp: body.speedUp || null,
      period: body.period ?? "/month",
      features: Array.isArray(body.features) ? body.features : [],
      popular: body.popular ?? false,
      isActive: body.isActive ?? true,
      order: body.order ?? 0,
    },
  });
  return NextResponse.json(pkg, { status: 201 });
}
