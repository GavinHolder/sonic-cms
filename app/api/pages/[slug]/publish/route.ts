/**
 * POST /api/pages/[slug]/publish - Publish a draft page
 *
 * Publishing is a STATUS CHANGE ONLY (DRAFT -> PUBLISHED + publishedAt/publishedBy). It never touches
 * section content: nothing in the app writes Section.contentDraft any more (only legacy values or
 * restored snapshots), so copying it over live content would silently revert live edits.
 * (The old raw SQL targeted nonexistent "Section"."config"/"configDraft" and always failed.)
 *
 * FAILURE MODES: double publish -> atomic updateMany, one winner, loser gets ALREADY_PUBLISHED.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";
import { PageStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params;
    // Require PUBLISHER role to publish pages
    const user = requireRole(request, "PUBLISHER");
    if (user instanceof Response) return user;

    const slug = decodeURIComponent(rawSlug);

    // Validate slug — only alphanumeric, hyphens, underscores, and forward slashes allowed
    if (!/^[a-zA-Z0-9_\-/]+$/.test(slug)) {
      return errorResponse("INVALID_SLUG", "Invalid page slug", 400);
    }

    // Atomic: only flips a page that is not already PUBLISHED, so a double-publish has exactly one winner.
    const flipped = await prisma.page.updateMany({
      where: { slug, status: { not: PageStatus.PUBLISHED } },
      data: {
        status: PageStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedBy: user.userId,
      },
    });

    if (flipped.count === 0) {
      const existing = await prisma.page.findUnique({ where: { slug }, select: { id: true } });
      if (!existing) {
        return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
      }
      return errorResponse("ALREADY_PUBLISHED", "Page is already published", 400);
    }

    const publishedPage = await prisma.page.findUnique({
      where: { slug },
      include: {
        createdByUser: { select: { username: true } },
        sections: { select: { id: true, type: true, enabled: true } },
      },
    });
    if (!publishedPage) {
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
    }

    return successResponse({
      message: "Page published successfully",
      page: {
        id: publishedPage.id,
        slug: publishedPage.slug,
        title: publishedPage.title,
        status: publishedPage.status,
        publishedAt: publishedPage.publishedAt,
        sectionCount: publishedPage.sections.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
