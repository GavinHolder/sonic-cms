/**
 * GET /api/media/[id] - Get media asset by ID
 * PUT /api/media/[id] - Update media metadata
 * DELETE /api/media/[id] - Delete media asset
 */

import { NextRequest } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

// ============================================
// GET /api/media/[id] - Get media asset
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        uploadedByUser: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!media) {
      return errorResponse("MEDIA_NOT_FOUND", "Media asset not found", 404);
    }

    return successResponse({
      media: {
        id: media.id,
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        width: media.width,
        height: media.height,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        altText: media.altText,
        caption: media.caption,
        tags: media.tags,
        uploadedBy: media.uploadedByUser.username,
        usageCount: media.usageCount,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// PUT /api/media/[id] - Update media metadata
// ============================================

const updateMediaSchema = z.object({
  altText:  z.string().optional(),
  caption:  z.string().optional(),
  tags:     z.array(z.string()).optional(),
  folderId: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Require EDITOR role
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    // Check if media exists
    const existingMedia = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!existingMedia) {
      return errorResponse("MEDIA_NOT_FOUND", "Media asset not found", 404);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateMediaSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400,
        validation.error.issues[0].path[0] as string
      );
    }

    const data = validation.data;

    // Update media metadata
    const media = await prisma.mediaAsset.update({
      where: { id },
      data: {
        ...(data.altText  !== undefined && { altText:  data.altText }),
        ...(data.caption  !== undefined && { caption:  data.caption }),
        ...(data.tags     !== undefined && { tags:     data.tags }),
        ...(data.folderId !== undefined && { folderId: data.folderId }),
      },
      include: {
        uploadedByUser: {
          select: {
            username: true,
          },
        },
      },
    });

    return successResponse({
      media: {
        id: media.id,
        filename: media.filename,
        altText: media.altText,
        caption: media.caption,
        tags: media.tags,
        uploadedBy: media.uploadedByUser.username,
        updatedAt: media.updatedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// DELETE /api/media/[id] - Delete media asset
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Require EDITOR role
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    // Check if media exists
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
    });

    if (!media) {
      return errorResponse("MEDIA_NOT_FOUND", "Media asset not found", 404);
    }

    // Check if media is in use
    if (media.usageCount > 0) {
      return errorResponse(
        "MEDIA_IN_USE",
        `Cannot delete media that is in use (${media.usageCount} references)`,
        400
      );
    }

    // Delete files from filesystem
    const filePath = path.join(UPLOAD_DIR, media.filename);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Delete thumbnail if exists
    if (media.thumbnailUrl) {
      const thumbnailFilename = path.basename(media.thumbnailUrl);
      const thumbnailPath = path.join(UPLOAD_DIR, thumbnailFilename);
      if (existsSync(thumbnailPath)) {
        await unlink(thumbnailPath);
      }
    }

    // Delete database record
    await prisma.mediaAsset.delete({
      where: { id },
    });

    return successResponse({
      message: "Media asset deleted successfully",
      deletedMedia: {
        id: media.id,
        filename: media.filename,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
