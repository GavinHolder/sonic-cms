import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const patchSchema = z.object({
  caption: z.string().max(500).optional().nullable(),
  altText: z.string().max(200).optional().nullable(),
  order: z.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const { imageId } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);

    const image = await prisma.galleryImage.update({
      where: { id: imageId },
      data: parsed.data,
      include: {
        asset: { select: { id: true, url: true, thumbnailUrl: true, altText: true, width: true, height: true, filename: true } },
      },
    });

    return successResponse({ image });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const { imageId } = await params;
    await prisma.galleryImage.delete({ where: { id: imageId } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
