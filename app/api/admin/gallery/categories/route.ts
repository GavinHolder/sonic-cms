import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  coverImageId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const categories = await prisma.galleryCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        coverImage: { select: { id: true, url: true, thumbnailUrl: true, altText: true } },
        _count: { select: { images: true } },
      },
    });

    return successResponse({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);

    const existing = await prisma.galleryCategory.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return errorResponse("CONFLICT", "A category with this slug already exists", 409);

    const maxOrder = await prisma.galleryCategory.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const category = await prisma.galleryCategory.create({
      data: {
        id: crypto.randomUUID(),
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        coverImageId: parsed.data.coverImageId ?? null,
        isActive: parsed.data.isActive,
        order: nextOrder,
      },
      include: {
        coverImage: { select: { id: true, url: true, thumbnailUrl: true, altText: true } },
        _count: { select: { images: true } },
      },
    });

    return successResponse({ category }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
