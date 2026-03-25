/**
 * GET /api/content/:typeSlug — public API for content entries (published only)
 *
 * Query params: page, limit, tag
 */

import { NextRequest, NextResponse } from "next/server"
import { getPublishedEntries } from "@/lib/content-types"

export async function GET(req: NextRequest, { params }: { params: Promise<{ typeSlug: string }> }) {
  const { typeSlug } = await params
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "12"), 100)
  const tag = url.searchParams.get("tag") || undefined

  const result = await getPublishedEntries(typeSlug, { page, limit, tag })
  if (!result) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Content type not found" } },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: result })
}
