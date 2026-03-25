/**
 * GET    /api/admin/content-entries/:typeSlug/:entryId — get single entry
 * PUT    /api/admin/content-entries/:typeSlug/:entryId — update entry (creates version)
 * DELETE /api/admin/content-entries/:typeSlug/:entryId — delete entry
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/api-middleware"
import { getEntryById, updateEntry, deleteEntry } from "@/lib/content-types"
import type { JWTPayload } from "@/lib/auth"

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ typeSlug: string; entryId: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { entryId } = await params
  const entry = await getEntryById(entryId)
  if (!entry) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Entry not found" } }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: entry })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ typeSlug: string; entryId: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { entryId } = await params
  try {
    const body = await req.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error.issues[0].message } },
        { status: 400 }
      )
    }

    const data = validation.data
    const updated = await updateEntry(
      entryId,
      {
        ...data,
        data: data.data as Record<string, unknown> | undefined,
        publishedAt: data.publishedAt === null ? null : data.publishedAt ? new Date(data.publishedAt) : undefined,
        scheduledAt: data.scheduledAt === null ? null : data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
      (auth as JWTPayload).userId
    )

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update"
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message } }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ typeSlug: string; entryId: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { entryId } = await params
  try {
    await deleteEntry(entryId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Entry not found" } }, { status: 404 })
  }
}
