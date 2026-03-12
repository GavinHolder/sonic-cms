/**
 * GET    /api/volt/[id]  — fetch a single VoltElement (own or public)
 * PUT    /api/volt/[id]  — update a VoltElement (owner only)
 * DELETE /api/volt/[id]  — delete a VoltElement (owner only)
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware"

// ============================================
// GET /api/volt/[id]
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = requireRole(request, "VIEWER")
    if (user instanceof Response) return user

    const volt = await prisma.voltElement.findFirst({
      where: {
        id,
        OR: [{ authorId: user.userId }, { isPublic: true }],
      },
    })

    if (!volt) {
      return errorResponse("NOT_FOUND", "Volt element not found", 404)
    }

    return successResponse({ volt })
  } catch (error) {
    return handleApiError(error)
  }
}

// ============================================
// PUT /api/volt/[id]
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = requireRole(request, "EDITOR")
    if (user instanceof Response) return user

    const existing = await prisma.voltElement.findUnique({ where: { id } })

    if (!existing || existing.authorId !== user.userId) {
      return errorResponse(
        "NOT_FOUND",
        "Volt element not found or you do not have permission to edit it",
        404
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      mood,
      elementType,
      isPublic,
      layers,
      slots,
      states,
      canvasWidth,
      canvasHeight,
      thumbnail,
    } = body

    const volt = await prisma.voltElement.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(mood !== undefined && { mood }),
        ...(elementType !== undefined && { elementType }),
        ...(isPublic !== undefined && { isPublic }),
        ...(layers !== undefined && { layers }),
        ...(slots !== undefined && { slots }),
        ...(states !== undefined && { states }),
        ...(canvasWidth !== undefined && { canvasWidth }),
        ...(canvasHeight !== undefined && { canvasHeight }),
        ...(thumbnail !== undefined && { thumbnail }),
      },
    })

    return successResponse({ volt })
  } catch (error) {
    return handleApiError(error)
  }
}

// ============================================
// DELETE /api/volt/[id]
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = requireRole(request, "EDITOR")
    if (user instanceof Response) return user

    const existing = await prisma.voltElement.findUnique({ where: { id } })

    if (!existing || existing.authorId !== user.userId) {
      return errorResponse(
        "NOT_FOUND",
        "Volt element not found or you do not have permission to delete it",
        404
      )
    }

    await prisma.voltElement.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
