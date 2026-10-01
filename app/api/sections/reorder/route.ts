/**
 * PUT /api/sections/reorder - Bulk reorder sections
 *
 * Updates the order field for multiple sections in a single transaction
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { updateSectionKeepStamp } from "@/lib/section-write-guard";
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";

const reorderSectionsSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
  sections: z.array(
    z.object({
      id: z.string().uuid("Invalid section ID"),
      order: z.number().int().min(0),
    })
  ).min(1, "At least one section required"),
});

export async function PUT(request: NextRequest) {
  try {
    // Require EDITOR role
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    // Parse and validate request body
    const body = await request.json();
    const validation = reorderSectionsSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400,
        validation.error.issues[0].path[0] as string
      );
    }

    const { pageId, sections } = validation.data;

    // Check if page exists
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return errorResponse("PAGE_NOT_FOUND", "Page not found", 404);
    }

    // Verify all sections belong to this page
    const sectionIds = sections.map((s) => s.id);
    const existingSections = await prisma.section.findMany({
      where: {
        id: { in: sectionIds },
        pageId,
      },
    });

    if (existingSections.length !== sections.length) {
      return errorResponse(
        "INVALID_SECTIONS",
        "One or more sections do not belong to this page",
        400
      );
    }

    // Guard: ensure hero stays first (order=0) and footer stays last.
    // Fetch the types of the sections being reordered so we can pin them.
    const sectionTypes = new Map(
      existingSections.map((s) => [s.id, s.type])
    );
    const totalSections = sections.length;

    const pinnedSections = sections.map((s, idx) => {
      const t = sectionTypes.get(s.id);
      if (t === 'HERO') return { ...s, order: 0 };
      if (t === 'FOOTER') return { ...s, order: totalSections - 1 };
      // Clamp movable sections between 1 and totalSections-2
      return { ...s, order: Math.max(1, Math.min(s.order, totalSections - 2)) };
    });

    // Update all sections in a transaction
    // Order changes keep updatedAt (updateSectionKeepStamp) so a reorder never makes an open
    // editor's expectedUpdatedAt stale (false 409). updatedAt tracks content/visual changes only.
    await prisma.$transaction(async (tx) => {
      for (const section of pinnedSections) {
        await updateSectionKeepStamp(tx, section.id, { order: section.order });
      }
    });

    // Fetch updated sections
    const updatedSections = await prisma.section.findMany({
      where: { pageId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        type: true,
        enabled: true,
        order: true,
        updatedAt: true,
      },
    });

    return successResponse({
      message: "Sections reordered successfully",
      sections: updatedSections,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
