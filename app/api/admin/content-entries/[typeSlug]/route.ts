/**
 * GET  /api/admin/content-entries/:typeSlug — list entries for a content type (paginated, searchable)
 * POST /api/admin/content-entries/:typeSlug — create new entry
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/api-middleware"
import { getContentType, getEntries, createEntry, generateSlug } from "@/lib/content-types"
import type { JWTPayload } from "@/lib/auth"

const createSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).optional(),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(["draft", "published", "archived"]).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ typeSlug: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { typeSlug } = await params
  const contentType = await getContentType(typeSlug)
  if (!contentType) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Content type not found" } },
      { status: 404 }
    )
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "20")
  const status = url.searchParams.get("status") || undefined
  const search = url.searchParams.get("search") || undefined

  const result = await getEntries(contentType.id, { page, limit, status, search, sortField: contentType.sortField, sortDirection: contentType.sortDirection })
  return NextResponse.json({ success: true, data: result, contentType })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ typeSlug: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { typeSlug } = await params
  const contentType = await getContentType(typeSlug)
  if (!contentType) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Content type not found" } },
      { status: 404 }
    )
  }

  try {
    const body = await req.json()
    const validation = createSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error.issues[0].message } },
        { status: 400 }
      )
    }

    const data = validation.data
    const entry = await createEntry({
      contentTypeId: contentType.id,
      title: data.title,
      slug: data.slug || generateSlug(data.title),
      data: data.data,
      status: data.status || "draft",
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : data.status === "published" ? new Date() : undefined,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      authorId: (auth as JWTPayload).userId,
      tags: data.tags,
      excerpt: data.excerpt || undefined,
      coverImage: data.coverImage || undefined,
    })

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create entry"
    const isUnique = message.includes("Unique constraint")
    return NextResponse.json(
      { success: false, error: { code: isUnique ? "DUPLICATE_SLUG" : "SERVER_ERROR", message: isUnique ? "An entry with this slug already exists" : message } },
      { status: isUnique ? 409 : 500 }
    )
  }
}
