/**
 * POST /api/elements - Create new custom element
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
import { ElementType } from "@prisma/client";

// ============================================
// POST /api/elements - Create new element
// ============================================

const createElementSchema = z.object({
  sectionId: z.string().uuid("Invalid section ID"),
  parentId: z.string().uuid("Invalid parent ID").optional(),
  type: z.nativeEnum(ElementType),
  order: z.number().int().min(0).optional(),
  content: z.any().optional(),
  position: z.any().optional(),
  spacing: z
    .object({
      marginTop: z.number().min(0).optional().default(0),
      marginRight: z.number().min(0).optional().default(0),
      marginBottom: z.number().min(0).optional().default(0),
      marginLeft: z.number().min(0).optional().default(0),
      paddingTop: z.number().min(0).optional().default(0),
      paddingRight: z.number().min(0).optional().default(0),
      paddingBottom: z.number().min(0).optional().default(0),
      paddingLeft: z.number().min(0).optional().default(0),
    })
    .optional(),
  styles: z.any().optional(),
  responsiveStyles: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require EDITOR role
    const user = requireRole(request, "EDITOR");
    if (user instanceof Response) return user;

    // Parse and validate request body
    const body = await request.json();
    const validation = createElementSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        validation.error.issues[0].message,
        400,
        validation.error.issues[0].path[0] as string
      );
    }

    const data = validation.data;

    // Check if section exists and is a custom section
    const section = await prisma.section.findUnique({
      where: { id: data.sectionId },
    });

    if (!section) {
      return errorResponse("SECTION_NOT_FOUND", "Section not found", 404);
    }

    if (!(section as any).isCustom) {
      return errorResponse(
        "INVALID_SECTION_TYPE",
        "Elements can only be added to custom sections",
        400
      );
    }

    // If parentId specified, verify it exists and belongs to same section
    if (data.parentId) {
      const parent = await prisma.customElement.findUnique({
        where: { id: data.parentId },
      });

      if (!parent || parent.sectionId !== data.sectionId) {
        return errorResponse(
          "INVALID_PARENT",
          "Parent element not found or belongs to different section",
          400
        );
      }
    }

    // If order not specified, append to end
    let order = data.order;
    if (order === undefined) {
      const lastElement = await prisma.customElement.findFirst({
        where: {
          sectionId: data.sectionId,
          parentId: data.parentId || null,
        },
        orderBy: { order: "desc" },
      });
      order = lastElement ? lastElement.order + 1 : 0;
    }

    // Create element
    const element = await prisma.customElement.create({
      data: {
        sectionId: data.sectionId,
        parentId: data.parentId,
        type: data.type,
        order,
        content: data.content || null,
        position: data.position || null,
        spacing: data.spacing || {
          marginTop: 0,
          marginRight: 0,
          marginBottom: 0,
          marginLeft: 0,
          paddingTop: 0,
          paddingRight: 0,
          paddingBottom: 0,
          paddingLeft: 0,
        },
        styles: data.styles || null,
        responsiveStyles: data.responsiveStyles || null,
      },
    });

    return successResponse(
      {
        element: {
          id: element.id,
          sectionId: element.sectionId,
          parentId: element.parentId,
          type: element.type,
          order: element.order,
          content: element.content,
          position: element.position,
          spacing: element.spacing,
          styles: element.styles,
          responsiveStyles: element.responsiveStyles,
          createdAt: element.createdAt,
          updatedAt: element.updatedAt,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
