/**
 * GET  /api/admin/content-types — list all content types with field schemas
 * POST /api/admin/content-types — create a new content type with fields
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/api-middleware"
import { getContentTypes, createContentType, generateSlug } from "@/lib/content-types"

const fieldSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  fieldType: z.string().min(1),
  required: z.boolean().optional(),
  defaultValue: z.string().optional().nullable(),
  options: z.any().optional(),
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  validation: z.any().optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  pluralName: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  description: z.string().optional().nullable(),
  hasPublicListing: z.boolean().optional(),
  hasPublicDetail: z.boolean().optional(),
  listingLayout: z.string().optional(),
  detailLayout: z.string().optional(),
  sortField: z.string().optional(),
  sortDirection: z.string().optional(),
  enableTags: z.boolean().optional(),
  fields: z.array(fieldSchema).optional(),
})

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const types = await getContentTypes()
  return NextResponse.json({ success: true, data: types })
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

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
    if (!data.slug) data.slug = generateSlug(data.pluralName)

    const contentType = await createContentType(data as Parameters<typeof createContentType>[0])
    return NextResponse.json({ success: true, data: contentType }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create content type"
    const isUnique = message.includes("Unique constraint")
    return NextResponse.json(
      { success: false, error: { code: isUnique ? "DUPLICATE_SLUG" : "SERVER_ERROR", message: isUnique ? "A content type with this slug already exists" : message } },
      { status: isUnique ? 409 : 500 }
    )
  }
}
