/**
 * POST /api/admin/backup/create — create a full site backup
 * Requires SUPER_ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireRole, successResponse, handleApiError } from "@/lib/api-middleware"
import { createBackup } from "@/lib/backup"

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "SUPER_ADMIN" as any)
  if (auth instanceof NextResponse) return auth

  try {
    const result = await createBackup()
    return successResponse({
      filename: result.filename,
      size: result.size,
      downloadUrl: `/api/admin/backup/download?file=${encodeURIComponent(result.filename)}`,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
