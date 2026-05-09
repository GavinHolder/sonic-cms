import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, successResponse, handleApiError } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, parseInt(searchParams.get("page")    || "1"));
    const perPage  = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "20")));
    const mimeType = searchParams.get("mimeType");
    const search   = searchParams.get("search");
    const tag      = searchParams.get("tag");
    const folderId = searchParams.get("folderId"); // "all" | "uncategorised" | uuid

    const where: any = {};

    if (folderId === "uncategorised") {
      where.folderId = null;
    } else if (folderId && folderId !== "all") {
      where.folderId = folderId;
    }

    if (mimeType) {
      if (mimeType === "image")         where.mimeType = { startsWith: "image/" };
      else if (mimeType === "video")    where.mimeType = { startsWith: "video/" };
      else if (mimeType === "document") where.mimeType = "application/pdf";
      else                              where.mimeType = mimeType;
    }

    if (search) {
      where.OR = [
        { filename:     { contains: search, mode: "insensitive" } },
        { originalName: { contains: search, mode: "insensitive" } },
        { altText:      { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) where.tags = { has: tag };

    const [total, media] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        include: { uploadedByUser: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    const formattedMedia = media.map((item) => ({
      id:           item.id,
      filename:     item.filename,
      originalName: item.originalName,
      mimeType:     item.mimeType,
      fileSize:     item.fileSize,
      width:        item.width,
      height:       item.height,
      url:          item.url,
      thumbnailUrl: item.thumbnailUrl,
      altText:      item.altText,
      caption:      item.caption,
      tags:         item.tags,
      folderId:     item.folderId,
      uploadedBy:   item.uploadedByUser.username,
      usageCount:   item.usageCount,
      createdAt:    item.createdAt,
      updatedAt:    item.updatedAt,
    }));

    return successResponse(
      { media: formattedMedia },
      200,
      { total, page, perPage, totalPages: Math.ceil(total / perPage) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
