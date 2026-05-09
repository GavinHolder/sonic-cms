import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware";
import { z } from "zod";

const registerSchema = z.object({
  url:      z.string().min(1),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
});

/**
 * POST /api/media/register
 *
 * Finds or creates a MediaAsset record for a filesystem-only URL.
 * Used by the media picker to give legacy uploads a DB record so they
 * can be referenced by gallery (and other DB-backed) features.
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.message, 400);

    const { url, filename, mimeType, fileSize } = parsed.data;

    const existing = await prisma.mediaAsset.findFirst({ where: { url } });
    if (existing) {
      return successResponse({ asset: { id: existing.id, url: existing.url } });
    }

    const derivedFilename = filename || url.split("/").pop() || "unknown";

    const asset = await prisma.mediaAsset.create({
      data: {
        filename:     derivedFilename,
        originalName: derivedFilename,
        mimeType:     mimeType || "application/octet-stream",
        fileSize:     fileSize || 0,
        url,
        uploadedBy:   user.userId,
      },
    });

    return successResponse({ asset: { id: asset.id, url: asset.url } });
  } catch (error) {
    return handleApiError(error);
  }
}
