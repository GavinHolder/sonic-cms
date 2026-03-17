/**
 * GET /api/pages - List all pages
 * POST /api/pages - Create new page
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

// Map client type strings to Prisma PageType
const CLIENT_TO_PRISMA: Record<string, PageType> = {
  form: PageType.FORM,
  pdf: PageType.PDF,
  designer: PageType.DESIGNER,
  full: PageType.FULL_PAGE,
  landing: PageType.LANDING,
  tab: PageType.TAB_PAGE,
};

// Map Prisma PageType to client type strings
const PRISMA_TO_CLIENT: Partial<Record<PageType, string>> = {
  [PageType.FORM]: "form",
  [PageType.PDF]: "pdf",
  [PageType.DESIGNER]: "designer",
  [PageType.FULL_PAGE]: "full",
  [PageType.LANDING]: "landing",
  [PageType.TAB_PAGE]: "tab",
};

function formatPage(page: any) {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    type: PRISMA_TO_CLIENT[page.type as PageType] ?? page.type.toLowerCase(),
    enabled: page.enabled,
    status: page.status,
    formConfig: page.formConfig ?? null,
    metaDescription: page.metaDescription,
    ogImage: page.ogImage,
    publishedAt: page.publishedAt,
    createdBy: page.createdByUser?.username ?? null,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    sectionCount: page.sections?.length ?? 0,
    enabledSectionCount: page.sections?.filter((s: any) => s.enabled).length ?? 0,
  };
}

// ============================================
// GET /api/pages - List all pages
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PageStatus | null;
    const clientType = searchParams.get("type");

    const where: any = {};
    if (status) where.status = status;
    if (clientType) {
      const prismaType = CLIENT_TO_PRISMA[clientType];
      if (prismaType) where.type = prismaType;
    }

    const pages = await prisma.page.findMany({
      where,
      include: {
        createdByUser: { select: { username: true } },
        sections: { select: { id: true, type: true, enabled: true, order: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return successResponse(
      { pages: pages.map(formatPage) },
      200,
      { total: pages.length }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// POST /api/pages - Create new page
// ============================================

const createPageSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-\/]+$/),
  title: z.string().min(1),
  type: z.string().optional().default("form"),
  enabled: z.boolean().optional().default(true),
  formConfig: z.any().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  status: z.nativeEnum(PageStatus).optional().default(PageStatus.DRAFT),
});

export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    const body = await request.json();
    const validation = createPageSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("VALIDATION_ERROR", validation.error.issues[0].message, 400);
    }

    const data = validation.data;
    const prismaType = CLIENT_TO_PRISMA[data.type] ?? PageType.FORM;

    const existing = await prisma.page.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return errorResponse("DUPLICATE_SLUG", "A page with this slug already exists", 409, "slug");
    }

    const page = await prisma.page.create({
      data: {
        slug: data.slug,
        title: data.title,
        type: prismaType,
        enabled: data.enabled ?? true,
        formConfig: data.formConfig ?? undefined,
        metaDescription: data.metaDescription,
        ogImage: data.ogImage,
        status: data.status,
        createdBy: user.userId,
        publishedAt: data.status === PageStatus.PUBLISHED ? new Date() : null,
        publishedBy: data.status === PageStatus.PUBLISHED ? user.userId : null,
      },
      include: { createdByUser: { select: { username: true } } },
    });

    return successResponse({ page: formatPage(page) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
