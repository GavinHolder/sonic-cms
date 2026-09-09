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
import { voltHasGlassLayer } from "@/lib/volt/volt-utils"

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

    const rows = await prisma.voltElement.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        mood: true,
        elementType: true,
        voltType: true,
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
        // Selected only to compute `hasGlassLayer` below — never returned raw.
        layers: true,
        states: true,
      },
    })

    // layers/states always come from their real columns — never from
    // designerData, a legacy full-record snapshot field that a since-fixed
    // save bug could leave stale or self-nested (see VoltStudio.tsx and
    // GET /api/public/volt/[id], which apply the same rule). Preferring
    // designerData here previously meant a corrupted/stale snapshot could
    // silently override the real, current layers/states for this badge.
    const volts = rows.map(({ layers, states, ...rest }) => ({
      ...rest,
      hasGlassLayer: voltHasGlassLayer(layers, states),
    }))

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
      voltType,
      isPublic,
      layers,
      slots,
      states,
      flipCard,
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
        voltType: voltType ?? "standard",
        // Volts are available everywhere (blocks + live site) by default so a
        // freshly-created design renders immediately. Only an explicit
        // isPublic:false from the caller keeps it private.
        isPublic: isPublic ?? true,
        authorId: user.userId,
        layers: layers ?? [],
        slots: slots ?? [],
        states: states ?? [],
        tags: [],
        flipCard: flipCard ?? null,
        canvasWidth: canvasWidth ?? 800,
        canvasHeight: canvasHeight ?? 500,
      },
    })

    return successResponse({ volt }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
