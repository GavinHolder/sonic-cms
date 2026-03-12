/**
 * GET  /api/admin/api-keys  — list current user's API keys
 * POST /api/admin/api-keys  — create a new API key
 *
 * Minimum role: EDITOR
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware"
import { generateApiKey } from "@/lib/api-keys"

// ============================================
// GET /api/admin/api-keys
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR")
    if (user instanceof Response) return user

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        keyPrefix: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    })

    return successResponse({ keys })
  } catch (error) {
    return handleApiError(error)
  }
}

// ============================================
// POST /api/admin/api-keys
// ============================================

export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR")
    if (user instanceof Response) return user

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse("VALIDATION_ERROR", "Invalid JSON body", 400)
    }

    const { label } = body as Record<string, unknown>

    if (!label || typeof label !== "string" || !label.trim() || label.trim().length > 100) {
      return errorResponse("VALIDATION_ERROR", "Label must be 1-100 characters", 400)
    }

    const count = await prisma.apiKey.count({ where: { userId: user.userId } })
    if (count >= 10) {
      return errorResponse("LIMIT_EXCEEDED", "Maximum 10 API keys per user", 400)
    }

    const { raw, hash, prefix } = await generateApiKey()

    await prisma.apiKey.create({
      data: {
        keyHash: hash,
        keyPrefix: prefix,
        label: label.trim(),
        userId: user.userId,
      },
    })

    // Raw key is returned ONCE and never stored — the caller must save it immediately.
    return successResponse(
      {
        rawKey: raw,
        prefix,
        label: label.trim(),
        note: "Save this key now — it will never be shown again.",
      },
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}
