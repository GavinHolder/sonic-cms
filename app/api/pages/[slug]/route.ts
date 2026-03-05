/**
 * GET /api/pages/[slug] - Get page by slug with sections
 * PUT /api/pages/[slug] - Update page
 * DELETE /api/pages/[slug] - Delete page
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";
import { PageType, PageStatus } from "@prisma/client";

// ============================================
// GET /api/pages/[slug] - Get page with sections
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params;
    // Decode slug (handle URL encoding)
    const slug = decodeURIComponent(rawSlug);

    // Debug logging
    console.log('[API] GET /api/pages/[slug]');
    console.log('[API] rawSlug:', rawSlug);
    console.log('[API] decoded slug:', slug);

    // Fetch page with sections
    const page = await prisma.page.findUnique({
      where: { slug },
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
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
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

// ============================================
// PUT /api/pages/[slug] - Update page
// ============================================

const updatePageSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-\/]+$/, "Slug must contain only lowercase letters, numbers, hyphens, and slashes").optional(),
  type: z.nativeEnum(PageType).optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  status: z.nativeEnum(PageStatus).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params;
    // Require EDITOR role
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const slug = decodeURIComponent(rawSlug);

    // Check if page exists
    const existingPage = await prisma.page.findUnique({
      where: { slug },
    });

    if (!existingPage) {
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updatePageSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400,
        validation.error.issues[0].path[0] as string
      );
    }

    const data = validation.data;

    // If slug is being changed, check for duplicates
    if (data.slug && data.slug !== slug) {
      const duplicatePage = await prisma.page.findUnique({
        where: { slug: data.slug },
      });

      if (duplicatePage) {
        return errorResponse(
          "DUPLICATE_SLUG",
          "A page with this slug already exists",
          409,
          "slug"
        );
      }
    }

    // Update page
    const updatedPage = await prisma.page.update({
      where: { slug },
      data: {
        ...data,
        // If status is being changed to PUBLISHED, set publishedAt
        ...(data.status === PageStatus.PUBLISHED && !existingPage.publishedAt
          ? {
              publishedAt: new Date(),
              publishedBy: user.userId,
            }
          : {}),
      },
      include: {
        createdByUser: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return successResponse({
      page: {
        id: updatedPage.id,
        slug: updatedPage.slug,
        title: updatedPage.title,
        type: updatedPage.type,
        status: updatedPage.status,
        metaDescription: updatedPage.metaDescription,
        ogImage: updatedPage.ogImage,
        publishedAt: updatedPage.publishedAt,
        createdBy: updatedPage.createdByUser.username,
        createdAt: updatedPage.createdAt,
        updatedAt: updatedPage.updatedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// DELETE /api/pages/[slug] - Delete page
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params;
    // Require PUBLISHER role to delete pages
    const user = requireRole(request, "PUBLISHER");
    if (user instanceof Response) return user;

    const slug = decodeURIComponent(rawSlug);

    // Check if page exists
    const page = await prisma.page.findUnique({
      where: { slug },
      include: {
        sections: true,
      },
    });

    if (!page) {
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
    }

    // Delete page (sections will cascade delete)
    await prisma.page.delete({
      where: { slug },
    });

    return successResponse({
      message: "Page deleted successfully",
      deletedPage: {
        id: page.id,
        slug: page.slug,
        title: page.title,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
