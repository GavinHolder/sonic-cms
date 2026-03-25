/**
 * GET /api/admin/audit-logs — list audit log entries (paginated)
 */

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/api-middleware"

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200)
  const resource = url.searchParams.get("resource") || undefined
  const userId = url.searchParams.get("userId") || undefined

  const where: Record<string, unknown> = {}
  if (resource) where.resource = resource
  if (userId) where.userId = userId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ success: true, data: { logs, total, page, limit } })
}
