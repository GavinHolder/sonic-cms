/**
 * POST /api/pages/[slug]/publish - Publish a draft page
 *
 * Real schema: table "sections" (Section @@map), columns content / contentDraft (Json). The previous raw
 * SQL targeted "Section"."config"/"configDraft", which do not exist -> every publish failed.
 *
 * ASSUMPTIONS:
 * 1. Semantics: contentDraft (when a non-null JSON object) is copied to content; contentDraft is left
 *    as is (the editors keep drafts in localStorage; the column is a server-side mirror).
 * 2. Sections with null contentDraft keep their live content untouched.
 *
 * FAILURE MODES:
 * - Any failure (snapshot, section write, page update) rolls back everything: status stays DRAFT.
 * - Non-object draft -> skipped and reported in skippedSectionIds, never written.
 * - Overwrite is recoverable: each changed section gets a section_versions snapshot.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";
import { PageStatus, Prisma } from "@prisma/client";
import { isPlainJsonObject } from "@/lib/section-content-validation";
import { saveSectionGuarded, SECTION_TX_OPTIONS } from "@/lib/section-write-guard";

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

    // Check if page exists
    const page = await prisma.page.findUnique({
      where: { slug },
    });

    if (!page) {
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
    }

    // Check if already published
    if (page.status === PageStatus.PUBLISHED) {
      return errorResponse(
        "ALREADY_PUBLISHED",
        "Page is already published",
        400
      );
    }

    // Publish = copy contentDraft -> content per section, snapshot, and flip status, ALL in one tx.
    const { publishedPage, sectionsPublished, skipped } = await prisma.$transaction(async (tx) => {
      const sections = await tx.section.findMany({
        where: { pageId: page.id },
        select: { id: true, contentDraft: true },
      });
      let published = 0;
      const skippedIds: string[] = [];
      for (const s of sections) {
        if (s.contentDraft === null || s.contentDraft === undefined) continue; // nothing to publish
        if (!isPlainJsonObject(s.contentDraft)) {
          skippedIds.push(s.id); // never write a non-object into content
          continue;
        }
        // Reuse the guarded writer inside THIS transaction: snapshots previous content, bumps updatedAt
        // only if content actually differs (stale open editors then get 409), keeps stamp otherwise.
        const r = await saveSectionGuarded(
          { $transaction: (fn: any) => fn(tx) },
          {
            id: s.id,
            data: { content: s.contentDraft as Prisma.InputJsonValue },
            expectedUpdatedAt: null,
            userId: user.userId,
          }
        );
        if (r.status === "ok") published++;
      }

      const updated = await tx.page.update({
        where: { slug },
        data: {
          status: PageStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedBy: user.userId,
        },
        include: {
          createdByUser: { select: { username: true } },
          sections: { select: { id: true, type: true, enabled: true } },
        },
      });
      return { publishedPage: updated, sectionsPublished: published, skipped: skippedIds };
    }, SECTION_TX_OPTIONS);

    return successResponse({
      message: "Page published successfully",
      page: {
        id: publishedPage.id,
        slug: publishedPage.slug,
        title: publishedPage.title,
        status: publishedPage.status,
        publishedAt: publishedPage.publishedAt,
        sectionCount: publishedPage.sections.length,
        sectionsPublished,
        skippedSectionIds: skipped,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
