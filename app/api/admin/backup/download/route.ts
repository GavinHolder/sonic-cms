/**
 * GET /api/admin/backup/download?file=backup-xxx.zip — stream backup file
 * Requires SUPER_ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireRole, errorResponse } from "@/lib/api-middleware"
import { getBackupPath } from "@/lib/backup"
import fs from "fs"

export async function GET(req: NextRequest) {
  const auth = requireRole(req, "SUPER_ADMIN" as any)
  if (auth instanceof NextResponse) return auth

  const filename = req.nextUrl.searchParams.get("file")
  if (!filename) {
    return errorResponse("BAD_REQUEST", "Missing file parameter", 400)
  }

  try {
    const filePath = getBackupPath(filename)
    const stat = fs.statSync(filePath)
    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": stat.size.toString(),
      },
    })
  } catch (error: any) {
    return errorResponse(
      "NOT_FOUND",
      error.message || "Backup not found",
      404
    )
  }
}
