/**
 * GET /api/admin/backup/list — list all backup files
 * Requires SUPER_ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireRole, successResponse, handleApiError } from "@/lib/api-middleware"
import { listBackups, getBackupSchedule, maybeAutoBackup } from "@/lib/backup"

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "SUPER_ADMIN" as any)
  if (auth instanceof NextResponse) return auth

  try {
    const auto = await maybeAutoBackup()
    const backups = listBackups()
    const scheduleInfo = await getBackupSchedule()
    return successResponse({ backups, schedule: scheduleInfo, autoTriggered: auto.triggered })
  } catch (error) {
    return handleApiError(error)
  }
}
