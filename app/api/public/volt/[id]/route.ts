/**
 * GET /api/public/volt/[id]
 * Public endpoint — no auth required.
 * Returns only isPublic volt elements. Used by VoltBlock on the live site.
 *
 * layers/states/flipCard/id/name/canvasWidth/canvasHeight/elementType always
 * come from their real DB columns — never from designerData. designerData (a
 * legacy full-record snapshot column, see VoltStudio.tsx) is used only to
 * contribute fields that have no dedicated column (canvasBackground,
 * carousel, canvasOverflow, tilt*, etc.); a self-nested designerData/layers/
 * states/flipCard key inside it — the shape produced by a since-fixed save
 * bug where a whole record got wrapped as its own designerData snapshot on
 * every save — is stripped so a stale/corrupted blob can never shadow the
 * real columns.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const record = await prisma.voltElement.findFirst({
    where: { id, isPublic: true },
    select: {
      id: true,
      name: true,
      layers: true,
      states: true,
      flipCard: true,
      canvasWidth: true,
      canvasHeight: true,
      elementType: true,
      designerData: true,
    },
  })

  if (!record) {
    // Graceful miss: the block references a volt that is deleted or not public.
    // Return 200 with `volt: null` instead of a 404 so the browser does NOT log
    // repeated "Failed to load resource: 404" console errors for stale/private
    // references (a network 404 is logged by the browser and cannot be silenced
    // by the client's .catch()). Nothing is leaked — private/missing volts still
    // resolve to null. Consumers (VoltBlock, designer layer cache) treat a null
    // volt as "unavailable" and render a clean placeholder.
    return NextResponse.json({ volt: null })
  }

  // Extra Designer-only fields with no dedicated column (canvasBackground,
  // carousel, canvasOverflow, tilt*, etc.) — designerData's own copies of
  // anything that DOES have a real column (layers/states/flipCard/id/name/
  // canvasWidth/canvasHeight/elementType/designerData itself) are discarded,
  // never merged, so they can never shadow or re-nest the real values below.
  const extra =
    record.designerData && typeof record.designerData === "object" && !Array.isArray(record.designerData)
      ? (() => {
          const {
            designerData: _designerData,
            layers: _layers,
            states: _states,
            flipCard: _flipCard,
            id: _id,
            name: _name,
            canvasWidth: _canvasWidth,
            canvasHeight: _canvasHeight,
            elementType: _elementType,
            ...rest
          } = record.designerData as Record<string, unknown>
          return rest
        })()
      : {}

  const volt: Record<string, unknown> = {
    ...extra,
    id: record.id,
    name: record.name,
    layers: record.layers,
    states: record.states,
    flipCard: record.flipCard ?? null,
    canvasWidth: record.canvasWidth,
    canvasHeight: record.canvasHeight,
    elementType: record.elementType,
  }

  return NextResponse.json({ volt })
}
