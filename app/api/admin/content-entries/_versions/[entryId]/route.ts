/**
 * GET /api/admin/content-entries/_versions/:entryId — list versions for an entry
 */

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/api-middleware"

export async function GET(req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { entryId } = await params
  const versions = await prisma.contentEntryVersion.findMany({
    where: { entryId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({ success: true, data: versions })
}
