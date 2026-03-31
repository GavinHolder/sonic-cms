/**
 * GET /api/public/volt/[id]
 * Public endpoint — no auth required.
 * Returns only isPublic volt elements. Used by VoltBlock on the live site.
 *
 * If designerData is present it is the canonical source of truth for all
 * VoltElementData fields (canvasBackground, carousel, tilt, overflow, etc.).
 * Legacy records without designerData fall back to individual columns.
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
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let volt: Record<string, unknown>

  if (record.designerData && typeof record.designerData === "object") {
    // Full VoltElementData saved by handleSave — use it as the primary source,
    // overriding id, name, canvasWidth, canvasHeight, elementType with DB values
    // so they can never be tampered with via the JSON blob.
    volt = {
      ...(record.designerData as Record<string, unknown>),
      id: record.id,
      name: record.name,
      canvasWidth: record.canvasWidth,
      canvasHeight: record.canvasHeight,
      elementType: record.elementType,
    }
  } else {
    // Legacy record — build minimal VoltElementData from individual columns
    volt = {
      id: record.id,
      name: record.name,
      layers: record.layers,
      states: record.states,
      flipCard: record.flipCard ?? null,
      canvasWidth: record.canvasWidth,
      canvasHeight: record.canvasHeight,
      elementType: record.elementType,
    }
  }

  return NextResponse.json({ volt })
}
