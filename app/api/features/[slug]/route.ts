import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import prisma from "@/lib/prisma";

/**
 * GET /api/features/[slug] — get single feature (SUPER_ADMIN)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const { slug } = await params;
    const feature = await prisma.clientFeature.findUnique({ where: { slug } });

    if (!feature) {
      return NextResponse.json(
        { success: false, error: "Feature not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: feature });
  } catch (error) {
    console.error("Failed to fetch feature:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feature" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/features/[slug] — update single feature (SUPER_ADMIN)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = requireRole(request, "SUPER_ADMIN");
  if (auth instanceof NextResponse) return auth;

  try {
    const { slug } = await params;
    const body = await request.json();

    const feature = await prisma.clientFeature.update({
      where: { slug },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.config !== undefined ? { config: body.config } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
      },
    });

    return NextResponse.json({ success: true, data: feature });
  } catch (error) {
    console.error("Failed to update feature:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update feature" },
      { status: 500 }
    );
  }
}
