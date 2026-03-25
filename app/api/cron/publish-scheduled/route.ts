/**
 * GET /api/cron/publish-scheduled
 *
 * Publishes content entries where scheduledAt <= now and status = "scheduled".
 * Call this via cron job (every minute) or Vercel Cron.
 *
 * Optional: pass ?key=CRON_SECRET for authentication.
 */

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  // Optional: verify cron secret
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const key = new URL(req.url).searchParams.get("key")
    if (key !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const now = new Date()

  const published = await prisma.contentEntry.updateMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    data: {
      status: "published",
      publishedAt: now,
    },
  })

  return NextResponse.json({
    success: true,
    published: published.count,
    timestamp: now.toISOString(),
  })
}
