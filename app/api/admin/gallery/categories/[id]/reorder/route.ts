import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const reorderSchema = z.object({
  imageIds: z.array(z.string()).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    await params; // params not needed but must satisfy TS
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);

    await prisma.$transaction(
      parsed.data.imageIds.map((imageId, index) =>
        prisma.galleryImage.update({
          where: { id: imageId },
          data: { order: index },
        })
      )
    );

    return successResponse({ reordered: true });
  } catch (error) {
    return handleApiError(error);
  }
}
