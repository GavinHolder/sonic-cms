/**
 * DELETE /api/admin/backup/delete?file=backup-xxx.zip — delete a backup
 * Requires SUPER_ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware"
import { deleteBackup } from "@/lib/backup"

export async function DELETE(req: NextRequest) {
  const auth = requireRole(req, "SUPER_ADMIN" as any)
  if (auth instanceof NextResponse) return auth

  const filename = req.nextUrl.searchParams.get("file")
  if (!filename) {
    return errorResponse("BAD_REQUEST", "Missing file parameter", 400)
  }

  try {
    deleteBackup(filename)
    return successResponse({ deleted: filename })
  } catch (error: any) {
    return errorResponse(
      "NOT_FOUND",
      error.message || "Backup not found",
      404
    )
  }
}
