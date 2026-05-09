import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const addSchema = z.object({
  assetIds: z.array(z.string()).min(1),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const { id } = await params;
    const images = await prisma.galleryImage.findMany({
      where: { categoryId: id },
      orderBy: { order: "asc" },
      include: {
        asset: { select: { id: true, url: true, thumbnailUrl: true, altText: true, width: true, height: true, filename: true } },
      },
    });

    return successResponse({ images });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const { id } = await params;
    const body = await request.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);

    const category = await prisma.galleryCategory.findUnique({ where: { id } });
    if (!category) return errorResponse("NOT_FOUND", "Category not found", 404);

    const maxOrder = await prisma.galleryImage.aggregate({
      where: { categoryId: id },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const created = await prisma.$transaction(
      parsed.data.assetIds.map((assetId, i) =>
        prisma.galleryImage.create({
          data: {
            id: crypto.randomUUID(),
            categoryId: id,
            assetId,
            order: nextOrder + i,
          },
          include: {
            asset: { select: { id: true, url: true, thumbnailUrl: true, altText: true, width: true, height: true, filename: true } },
          },
        })
      )
    );

    return successResponse({ images: created }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
