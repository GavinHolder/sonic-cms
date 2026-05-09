import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  coverImageId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const { id } = await params;
    const category = await prisma.galleryCategory.findUnique({
      where: { id },
      include: {
        coverImage: { select: { id: true, url: true, thumbnailUrl: true, altText: true } },
        images: {
          orderBy: { order: "asc" },
          include: { asset: { select: { id: true, url: true, thumbnailUrl: true, altText: true, width: true, height: true, filename: true } } },
        },
      },
    });

    if (!category) return errorResponse("NOT_FOUND", "Category not found", 404);
    return successResponse({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);

    if (parsed.data.slug) {
      const existing = await prisma.galleryCategory.findFirst({
        where: { slug: parsed.data.slug, NOT: { id } },
      });
      if (existing) return errorResponse("CONFLICT", "A category with this slug already exists", 409);
    }

    const category = await prisma.galleryCategory.update({
      where: { id },
      data: parsed.data,
      include: {
        coverImage: { select: { id: true, url: true, thumbnailUrl: true, altText: true } },
        _count: { select: { images: true } },
      },
    });

    return successResponse({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(request, "PUBLISHER");
    if (user instanceof Response) return user;

    const { id } = await params;
    await prisma.galleryCategory.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
