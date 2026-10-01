/**
 * PUT /api/sections/[id]/spacing - Update section spacing
 *
 * Dedicated endpoint for visual editor to update spacing values quickly
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { saveSectionGuarded } from "@/lib/section-write-guard";
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware";

const updateSpacingSchema = z.object({
  marginTop: z.number().min(0).optional(),
  marginRight: z.number().min(0).optional(),
  marginBottom: z.number().min(0).optional(),
  marginLeft: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  paddingRight: z.number().min(0).optional(),
  paddingBottom: z.number().min(0).optional(),
  paddingLeft: z.number().min(0).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Require EDITOR role
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    // Check if section exists
    const existingSection = await prisma.section.findUnique({
      where: { id },
    });

    if (!existingSection) {
      return errorResponse("SECTION_NOT_FOUND", "Section not found", 404);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateSpacingSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400,
        validation.error.issues[0].path[0] as string
      );
    }

    const newSpacing = validation.data;

    // Merge with existing spacing
    const updatedSpacing = {
      ...((existingSection as any).spacing ?? {}),
      ...newSpacing,
    };

    // Update section spacing (paddingTop/paddingBottom are the direct fields)
    // Padding is a visual change: bumps updatedAt and snapshots the previous value (saveSectionGuarded).
    const padData: Record<string, unknown> = {};
    if (updatedSpacing.paddingTop !== undefined) padData.paddingTop = updatedSpacing.paddingTop;
    if (updatedSpacing.paddingBottom !== undefined) padData.paddingBottom = updatedSpacing.paddingBottom;
    const saved = await saveSectionGuarded(prisma, { id, data: padData, expectedUpdatedAt: null, userId: user.userId });
    if (saved.status !== 'ok') {
      return errorResponse("SECTION_NOT_FOUND", "Section not found", 404);
    }
    const section = saved.section;

    return successResponse({
      spacing: { paddingTop: section.paddingTop, paddingBottom: section.paddingBottom },
      message: "Spacing updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
