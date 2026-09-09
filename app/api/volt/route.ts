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
        // designerData (when present) is the canonical source of truth for
        // layers/states, same precedence GET /api/public/volt/[id] uses.
        layers: true,
        states: true,
        designerData: true,
      },
    })

    const volts = rows.map(({ layers, states, designerData, ...rest }) => {
      const dd =
        designerData && typeof designerData === "object" && !Array.isArray(designerData)
          ? (designerData as Record<string, unknown>)
          : null
      const effectiveLayers = dd && Array.isArray(dd.layers) ? dd.layers : layers
      const effectiveStates = dd && Array.isArray(dd.states) ? dd.states : states
      return { ...rest, hasGlassLayer: voltHasGlassLayer(effectiveLayers, effectiveStates) }
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
