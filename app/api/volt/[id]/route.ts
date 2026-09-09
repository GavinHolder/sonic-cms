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

    const record = await prisma.voltElement.findFirst({
      where: {
        id,
        OR: [{ authorId: user.userId }, { isPublic: true }],
      },
    })

    if (!record) {
      return errorResponse("NOT_FOUND", "Volt element not found", 404)
    }

    // designerData is a legacy full-record snapshot field (see VoltStudio.tsx);
    // a since-fixed save bug could leave it self-nested (designerData.designerData...).
    // The editor (VoltStudio.tsx) already strips this on ingest before it can
    // propagate into a new save, but strip it here too so this read never hands
    // out a self-nested blob to any other/future consumer. Real layers/states
    // etc. always come from their own columns on `record` above, untouched.
    const rawDesignerData = record.designerData
    const volt =
      rawDesignerData && typeof rawDesignerData === "object" && !Array.isArray(rawDesignerData)
        ? (() => {
            const { designerData: _nested, ...cleanDesignerData } = rawDesignerData as Record<string, unknown>
            return { ...record, designerData: cleanDesignerData }
          })()
        : record

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
      voltType,
      isPublic,
      layers,
      slots,
      states,
      flipCard,
      canvasWidth,
      canvasHeight,
      thumbnail,
      designerData,
    } = body

    const volt = await prisma.voltElement.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(mood !== undefined && { mood }),
        ...(elementType !== undefined && { elementType }),
        ...(voltType !== undefined && { voltType }),
        // Default available on save: an absent isPublic resolves to true so a
        // saved volt is usable as a block + live. An explicit isPublic:false
        // is still honoured if a caller deliberately sends it.
        isPublic: isPublic ?? true,
        ...(layers !== undefined && { layers }),
        ...(slots !== undefined && { slots }),
        ...(states !== undefined && { states }),
        ...(flipCard !== undefined && { flipCard }),
        ...(canvasWidth !== undefined && { canvasWidth }),
        ...(canvasHeight !== undefined && { canvasHeight }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(designerData !== undefined && { designerData }),
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
