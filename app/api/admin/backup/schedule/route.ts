/**
 * GET  /api/admin/backup/schedule — get current schedule
 * POST /api/admin/backup/schedule — set schedule (none/daily/weekly/monthly)
 */

import { NextRequest, NextResponse } from "next/server"
import { requireRole, successResponse, handleApiError } from "@/lib/api-middleware"
import { getBackupSchedule, setBackupSchedule, type BackupSchedule } from "@/lib/backup"

const VALID: BackupSchedule[] = ["none", "daily", "weekly", "monthly"]

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "SUPER_ADMIN" as any)
  if (auth instanceof NextResponse) return auth
  try {
    return successResponse(await getBackupSchedule())
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "SUPER_ADMIN" as any)
  if (auth instanceof NextResponse) return auth
  try {
    const { schedule } = await req.json()
    if (!VALID.includes(schedule)) {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400 })
    }
    await setBackupSchedule(schedule)
    return successResponse({ schedule })
  } catch (error) {
    return handleApiError(error)
  }
}
