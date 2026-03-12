import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

/**
 * GET /api/features — list all features (SUPER_ADMIN)
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const features = await prisma.clientFeature.findMany({
      orderBy: { slug: "asc" },
    });
    return NextResponse.json({ success: true, data: features });
  } catch (error) {
    console.error("Failed to fetch features:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch features" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/features — upsert a feature by slug (SUPER_ADMIN)
 */
export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { slug, name, enabled, config } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { success: false, error: "slug and name are required" },
        { status: 400 }
      );
    }

    const feature = await prisma.clientFeature.upsert({
      where: { slug },
      update: {
        enabled: enabled ?? false,
        config: config ?? {},
        ...(name ? { name } : {}),
      },
      create: {
        slug,
        name,
        enabled: enabled ?? false,
        config: config ?? {},
      },
    });

    return NextResponse.json({ success: true, data: feature });
  } catch (error) {
    console.error("Failed to upsert feature:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upsert feature" },
      { status: 500 }
    );
  }
}
