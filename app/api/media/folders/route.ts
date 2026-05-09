import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  assetCount: number;
  children: FolderNode[];
}

function buildTree(flat: Array<{ id: string; name: string; parentId: string | null; _count: { assets: number } }>, parentId: string | null = null): FolderNode[] {
  return flat
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      assetCount: f._count.assets,
      children: buildTree(flat, f.id),
    }));
}

// GET /api/media/folders — full folder tree + asset counts
export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const [flat, totalAssets, uncategorisedCount] = await Promise.all([
      prisma.mediaFolder.findMany({
        include: { _count: { select: { assets: true } } },
      }),
      prisma.mediaAsset.count(),
      prisma.mediaAsset.count({ where: { folderId: null } }),
    ]);

    return successResponse({
      folders: buildTree(flat),
      totalAssets,
      uncategorisedCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  parentId: z.string().nullable().optional(),
});

// POST /api/media/folders — create folder
export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const body = await request.json();
    const v = createSchema.safeParse(body);
    if (!v.success) return errorResponse("VALIDATION_ERROR", v.error.issues[0].message, 400);

    const { name, parentId } = v.data;

    const duplicate = await prisma.mediaFolder.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, parentId: parentId ?? null },
    });
    if (duplicate) return errorResponse("DUPLICATE_NAME", "A folder with this name already exists here", 409);

    const folder = await prisma.mediaFolder.create({
      data: { name, parentId: parentId ?? null, createdBy: user.userId },
    });

    return successResponse({ folder }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
