import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { successResponse, handleApiError } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

    const images = await prisma.galleryImage.findMany({
      where: categorySlug
        ? { category: { slug: categorySlug, isActive: true } }
        : { category: { isActive: true } },
      orderBy: { order: "asc" },
      take: limit,
      include: {
        asset: { select: { url: true, thumbnailUrl: true, altText: true, width: true, height: true } },
      },
    });

    return successResponse({
      images: images.map((img) => ({
        url: img.asset.url,
        thumbnailUrl: img.asset.thumbnailUrl,
        altText: img.altText || img.asset.altText || "",
        width: img.asset.width,
        height: img.asset.height,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
