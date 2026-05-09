import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";

const updateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  parentId: z.string().nullable().optional(),
});

// PUT /api/media/folders/[id] — rename or move folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const existing = await prisma.mediaFolder.findUnique({ where: { id } });
    if (!existing) return errorResponse("NOT_FOUND", "Folder not found", 404);

    const body = await request.json();
    const v = updateSchema.safeParse(body);
    if (!v.success) return errorResponse("VALIDATION_ERROR", v.error.issues[0].message, 400);

    const { name, parentId } = v.data;

    // Guard: prevent moving a folder into itself or its own descendants
    if (parentId) {
      let cursor: string | null = parentId;
      while (cursor) {
        if (cursor === id) return errorResponse("INVALID_PARENT", "Cannot move a folder into itself", 400);
        const row: { parentId: string | null } | null = await prisma.mediaFolder.findUnique({ where: { id: cursor }, select: { parentId: true } });
        cursor = row?.parentId ?? null;
      }
    }

    const folder = await prisma.mediaFolder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(parentId !== undefined && { parentId }),
      },
    });

    return successResponse({ folder });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/media/folders/[id] — delete folder; assets become uncategorised, children re-parent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const folder = await prisma.mediaFolder.findUnique({ where: { id } });
    if (!folder) return errorResponse("NOT_FOUND", "Folder not found", 404);

    await prisma.$transaction([
      // Move assets in this folder to uncategorised
      prisma.mediaAsset.updateMany({ where: { folderId: id }, data: { folderId: null } }),
      // Promote child folders to this folder's parent level
      prisma.mediaFolder.updateMany({ where: { parentId: id }, data: { parentId: folder.parentId } }),
      prisma.mediaFolder.delete({ where: { id } }),
    ]);

    return successResponse({ message: "Folder deleted. Assets moved to uncategorised." });
  } catch (error) {
    return handleApiError(error);
  }
}
