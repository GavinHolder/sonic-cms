/**
 * POST /api/volt/[id]/duplicate
 * Clone an existing VoltElement (own or public) into a new, private, editable copy.
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  requireRole,
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-middleware"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = requireRole(request, "EDITOR")
    if (user instanceof Response) return user

    // Same visibility rule as GET /api/volt/[id]: a user may duplicate their
    // own volts, or any public one (ownership transfers to the duplicator).
    const source = await prisma.voltElement.findFirst({
      where: {
        id,
        OR: [{ authorId: user.userId }, { isPublic: true }],
      },
    })

    if (!source) {
      return errorResponse("NOT_FOUND", "Volt element not found", 404)
    }

    const volt = await prisma.voltElement.create({
      data: {
        name: `${source.name} (Copy)`,
        description: source.description,
        mood: source.mood,
        elementType: source.elementType,
        voltType: source.voltType,
        // Copy starts private so subtle edits don't silently affect a shared
        // public listing; the duplicator can re-publish explicitly on save.
        isPublic: false,
        authorId: user.userId,
        layers: source.layers ?? [],
        slots: source.slots ?? [],
        states: source.states ?? [],
        tags: source.tags,
        flipCard: source.flipCard ?? undefined,
        canvasWidth: source.canvasWidth,
        canvasHeight: source.canvasHeight,
        has3D: source.has3D,
        thumbnail: source.thumbnail,
        downloads: 0,
        isPaid: false,
        price: null,
        // designerData is a legacy full-record snapshot (see GET/PUT handlers
        // in app/api/volt/[id]/route.ts). Don't carry the source's raw
        // snapshot into the copy — let it regenerate on next save, same as a
        // brand-new element.
      },
    })

    return successResponse({ volt }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
