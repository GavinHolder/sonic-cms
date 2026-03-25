/**
 * GET /api/redirects/check?path=/old-page
 * Internal API — called by middleware to check for active redirects.
 */

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const path = new URL(req.url).searchParams.get("path")
  if (!path) return NextResponse.json({ redirect: null })

  const redirect = await prisma.redirect.findUnique({ where: { fromPath: path } })
  if (!redirect || !redirect.isActive) return NextResponse.json({ redirect: null })

  // Increment hit counter (fire-and-forget)
  prisma.redirect.update({ where: { id: redirect.id }, data: { hitCount: { increment: 1 } } }).catch(() => {})

  return NextResponse.json({ redirect: { toPath: redirect.toPath, statusCode: redirect.statusCode } })
}
