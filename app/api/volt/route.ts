/**
 * GET  /api/volt  — list VoltElements (own + optionally public)
 * POST /api/volt  — create a new VoltElement
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
// GET /api/volt
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER")
    if (user instanceof Response) return user

    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get("public") === "true"

    const where = includePublic
      ? { OR: [{ authorId: user.userId }, { isPublic: true }] }
      : { authorId: user.userId }

    const volts = await prisma.voltElement.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        mood: true,
        elementType: true,
        isPublic: true,
        authorId: true,
        thumbnail: true,
        tags: true,
        has3D: true,
        canvasWidth: true,
        canvasHeight: true,
        downloads: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return successResponse({ volts }, 200, { total: volts.length })
  } catch (error) {
    return handleApiError(error)
  }
}

// ============================================
// POST /api/volt
// ============================================

export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR")
    if (user instanceof Response) return user

    const body = await request.json()
    const {
      name,
      description,
      mood,
      elementType,
      layers,
      slots,
      states,
      canvasWidth,
      canvasHeight,
    } = body

    if (!name?.trim()) {
      return errorResponse("VALIDATION_ERROR", "Name is required", 400, "name")
    }

    const volt = await prisma.voltElement.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        mood: mood ?? null,
        elementType: elementType ?? "custom",
        isPublic: false,
        authorId: user.userId,
        layers: layers ?? [],
        slots: slots ?? [],
        states: states ?? [],
        canvasWidth: canvasWidth ?? 800,
        canvasHeight: canvasHeight ?? 500,
      },
    })

    return successResponse({ volt }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
