/**
 * GET    /api/admin/content-types/:id — get single content type with fields
 * PUT    /api/admin/content-types/:id — update content type + fields
 * DELETE /api/admin/content-types/:id — delete content type (cascades entries)
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/api-middleware"

const fieldSchema = z.object({
  id: z.string().optional(),
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

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pluralName: z.string().min(1).max(100).optional(),
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const ct = await prisma.contentType.findUnique({
    where: { id },
    include: { fields: { orderBy: { sortOrder: 'asc' } }, _count: { select: { entries: true } } },
  })
  if (!ct) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Content type not found" } }, { status: 404 })

  return NextResponse.json({ success: true, data: ct })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  try {
    const body = await req.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error.issues[0].message } },
        { status: 400 }
      )
    }

    const { fields, ...typeData } = validation.data

    // Update the type itself
    await prisma.contentType.update({ where: { id }, data: typeData })

    // Sync fields if provided: delete removed, update existing, create new
    if (fields) {
      const existingFields = await prisma.contentField.findMany({ where: { contentTypeId: id } })
      const existingIds = existingFields.map(f => f.id)
      const incomingIds = fields.filter(f => f.id).map(f => f.id!)

      // Delete removed fields
      const toDelete = existingIds.filter(eid => !incomingIds.includes(eid))
      if (toDelete.length) {
        await prisma.contentField.deleteMany({ where: { id: { in: toDelete } } })
      }

      // Upsert each field
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i]
        if (f.id && existingIds.includes(f.id)) {
          await prisma.contentField.update({
            where: { id: f.id },
            data: { name: f.name, slug: f.slug, fieldType: f.fieldType, required: f.required, defaultValue: f.defaultValue, options: f.options, placeholder: f.placeholder, helpText: f.helpText, sortOrder: i, validation: f.validation },
          })
        } else {
          await prisma.contentField.create({
            data: { contentTypeId: id, name: f.name, slug: f.slug, fieldType: f.fieldType, required: f.required, defaultValue: f.defaultValue, options: f.options, placeholder: f.placeholder, helpText: f.helpText, sortOrder: i, validation: f.validation },
          })
        }
      }
    }

    const updated = await prisma.contentType.findUnique({
      where: { id },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update"
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message } }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  try {
    await prisma.contentType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Content type not found" } }, { status: 404 })
  }
}
