/**
 * GET    /api/admin/redirects — list all redirects
 * POST   /api/admin/redirects — create redirect
 * PUT    /api/admin/redirects — update redirect (pass id in body)
 * DELETE /api/admin/redirects?id=xxx — delete redirect
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/api-middleware"

const createSchema = z.object({
  fromPath: z.string().min(1).startsWith("/"),
  toPath: z.string().min(1),
  statusCode: z.number().int().min(301).max(308).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const redirects = await prisma.redirect.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json({ success: true, data: redirects })
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const v = createSchema.safeParse(body)
  if (!v.success) return NextResponse.json({ success: false, error: { message: v.error.issues[0].message } }, { status: 400 })

  try {
    const redirect = await prisma.redirect.create({ data: v.data })
    return NextResponse.json({ success: true, data: redirect }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed"
    return NextResponse.json({ success: false, error: { message: msg.includes("Unique") ? "A redirect for this path already exists" : msg } }, { status: msg.includes("Unique") ? 409 : 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ success: false, error: { message: "id required" } }, { status: 400 })

  const updated = await prisma.redirect.update({ where: { id }, data })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ success: false, error: { message: "id required" } }, { status: 400 })

  await prisma.redirect.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
