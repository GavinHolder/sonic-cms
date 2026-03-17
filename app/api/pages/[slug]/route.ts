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

const CLIENT_TO_PRISMA: Record<string, PageType> = {
  form: PageType.FORM,
  pdf: PageType.PDF,
  designer: PageType.DESIGNER,
  full: PageType.FULL_PAGE,
  landing: PageType.LANDING,
  tab: PageType.TAB_PAGE,
};

const PRISMA_TO_CLIENT: Partial<Record<PageType, string>> = {
  [PageType.FORM]: "form",
  [PageType.PDF]: "pdf",
  [PageType.DESIGNER]: "designer",
  [PageType.FULL_PAGE]: "full",
  [PageType.LANDING]: "landing",
  [PageType.TAB_PAGE]: "tab",
};

// ============================================
// GET /api/pages/[slug] - Get page with sections
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params;
    const slug = decodeURIComponent(rawSlug);

    const page = await prisma.page.findUnique({
      where: { slug },
      include: {
        createdByUser: { select: { username: true, firstName: true, lastName: true } },
        sections: {
          include: {
            createdByUser: { select: { username: true } },
            elements: { orderBy: { order: "asc" } },
          },
          orderBy: { order: "asc" },
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
        type: PRISMA_TO_CLIENT[page.type as PageType] ?? page.type.toLowerCase(),
        enabled: page.enabled,
        status: page.status,
        formConfig: page.formConfig ?? null,
        metaDescription: page.metaDescription,
        metaTitle: page.metaTitle,
        metaKeywords: page.metaKeywords,
        ogImage: page.ogImage,
        ogTitle: page.ogTitle,
        ogDescription: page.ogDescription,
        canonicalUrl: page.canonicalUrl,
        noindex: page.noindex,
        nofollow: page.nofollow,
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
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-\/]+$/).optional(),
  type: z.string().optional(),
  enabled: z.boolean().optional(),
  formConfig: z.any().optional(),
  metaDescription: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  ogTitle: z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  status: z.nativeEnum(PageStatus).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params;
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const slug = decodeURIComponent(rawSlug);

    const existingPage = await prisma.page.findUnique({ where: { slug } });
    if (!existingPage) {
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
    }

    const body = await request.json();
    const validation = updatePageSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("VALIDATION_ERROR", validation.error.issues[0].message, 400);
    }

    const data = validation.data;

    if (data.slug && data.slug !== slug) {
      const dup = await prisma.page.findUnique({ where: { slug: data.slug } });
      if (dup) {
        return errorResponse("DUPLICATE_SLUG", "A page with this slug already exists", 409, "slug");
      }
    }

    const updatedPage = await prisma.page.update({
      where: { slug },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.type !== undefined && { type: CLIENT_TO_PRISMA[data.type] ?? existingPage.type }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.formConfig !== undefined && { formConfig: data.formConfig }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaKeywords !== undefined && { metaKeywords: data.metaKeywords }),
        ...(data.ogImage !== undefined && { ogImage: data.ogImage }),
        ...(data.ogTitle !== undefined && { ogTitle: data.ogTitle }),
        ...(data.ogDescription !== undefined && { ogDescription: data.ogDescription }),
        ...(data.canonicalUrl !== undefined && { canonicalUrl: data.canonicalUrl }),
        ...(data.noindex !== undefined && { noindex: data.noindex }),
        ...(data.nofollow !== undefined && { nofollow: data.nofollow }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.status === PageStatus.PUBLISHED && !existingPage.publishedAt
          ? { publishedAt: new Date(), publishedBy: user.userId }
          : {}),
      },
      include: { createdByUser: { select: { username: true } } },
    });

    return successResponse({
      page: {
        id: updatedPage.id,
        slug: updatedPage.slug,
        title: updatedPage.title,
        type: PRISMA_TO_CLIENT[updatedPage.type as PageType] ?? updatedPage.type.toLowerCase(),
        enabled: updatedPage.enabled,
        status: updatedPage.status,
        formConfig: updatedPage.formConfig ?? null,
        metaDescription: updatedPage.metaDescription,
        metaTitle: updatedPage.metaTitle,
        metaKeywords: updatedPage.metaKeywords,
        ogImage: updatedPage.ogImage,
        ogTitle: updatedPage.ogTitle,
        ogDescription: updatedPage.ogDescription,
        canonicalUrl: updatedPage.canonicalUrl,
        noindex: updatedPage.noindex,
        nofollow: updatedPage.nofollow,
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
    const user = requireRole(request, "PUBLISHER");
    if (user instanceof Response) return user;

    const slug = decodeURIComponent(rawSlug);

    const page = await prisma.page.findUnique({ where: { slug }, include: { sections: true } });
    if (!page) {
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
    }

    await prisma.page.delete({ where: { slug } });

    return successResponse({
      message: "Page deleted successfully",
      deletedPage: { id: page.id, slug: page.slug, title: page.title },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
