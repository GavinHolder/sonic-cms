/**
 * GET /api/public/volt/[id]
 * Public endpoint — no auth required.
 * Returns only isPublic volt elements. Used by VoltBlock on the live site.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const volt = await prisma.voltElement.findFirst({
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
    },
  })

  if (!volt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ volt })
}
