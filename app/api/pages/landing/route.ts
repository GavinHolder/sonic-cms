/**
 * GET /api/pages/landing - Get landing page (slug: "/") with sections
 * Dedicated endpoint to avoid URL encoding issues with "/" slug
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  try {
    // Fetch landing page (slug: "/")
    const page = await prisma.page.findUnique({
      where: { slug: "/" },
      include: {
        createdByUser: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        sections: {
          include: {
            createdByUser: {
              select: {
                username: true,
              },
            },
            elements: {
              orderBy: {
                order: "asc",
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!page) {
      return errorResponse("PAGE_NOT_FOUND", "Landing page not found", 404);
    }

    return successResponse({
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        type: page.type,
        status: page.status,
        metaDescription: page.metaDescription,
        ogImage: page.ogImage,
        publishedAt: page.publishedAt,
        createdBy: page.createdByUser.username,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        sections: page.sections.map((section) => ({
          id: section.id,
          type: section.type,
          enabled: section.enabled,
          order: section.order,
          config: (section as any).config,
          configDraft: (section as any).configDraft,
          isCustom: (section as any).isCustom,
          spacing: (section as any).spacing,
          background: section.background,
          elements: section.elements,
          createdBy: section.createdByUser.username,
          createdAt: section.createdAt,
          updatedAt: section.updatedAt,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
