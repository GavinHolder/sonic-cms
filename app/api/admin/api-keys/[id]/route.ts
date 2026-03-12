/**
 * DELETE /api/admin/api-keys/[id]  — revoke an API key
 *
 * Minimum role: EDITOR
 * Users may only delete their own keys.
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
// DELETE /api/admin/api-keys/[id]
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, "EDITOR")
    if (user instanceof Response) return user

    const { id } = await params

    const apiKey = await prisma.apiKey.findUnique({ where: { id } })

    if (!apiKey) {
      return errorResponse("NOT_FOUND", "API key not found", 404)
    }

    if (apiKey.userId !== user.userId) {
      return errorResponse("FORBIDDEN", "You do not own this API key", 403)
    }

    await prisma.apiKey.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
