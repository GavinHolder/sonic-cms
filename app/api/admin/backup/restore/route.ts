/**
 * POST /api/admin/backup/restore — restore from uploaded ZIP
 * Accepts multipart form data: zipFile (File) + categories (JSON string array)
 * Creates a safety backup before restoring.
 * Requires SUPER_ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireRole, successResponse, errorResponse, handleApiError } from "@/lib/api-middleware"
import { restoreFromZip, type RestoreCategory } from "@/lib/backup"

const VALID_CATEGORIES: RestoreCategory[] = [
  "everything",
  "settings",
  "pages",
  "content",
  "media",
  "volt",
  "users",
  "plugins",
  "forms",
  "features",
]

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "SUPER_ADMIN" as any)
  if (auth instanceof NextResponse) return auth

  try {
    const formData = await req.formData()
    const zipFile = formData.get("zipFile") as File | null
    const categoriesRaw = formData.get("categories") as string | null

    if (!zipFile) {
      return errorResponse("BAD_REQUEST", "Missing zipFile in form data", 400)
    }

    if (!categoriesRaw) {
      return errorResponse("BAD_REQUEST", "Missing categories in form data", 400)
    }

    let categories: RestoreCategory[]
    try {
      categories = JSON.parse(categoriesRaw)
    } catch {
      return errorResponse("BAD_REQUEST", "Invalid categories JSON", 400)
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return errorResponse("BAD_REQUEST", "Categories must be a non-empty array", 400)
    }

    // Validate each category
    for (const cat of categories) {
      if (!VALID_CATEGORIES.includes(cat)) {
        return errorResponse("BAD_REQUEST", `Invalid category: ${cat}`, 400)
      }
    }

    // Read ZIP file into buffer
    const arrayBuffer = await zipFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await restoreFromZip(buffer, categories)

    return successResponse(result)
  } catch (error: any) {
    console.error("Restore error:", error)
    return errorResponse(
      "RESTORE_FAILED",
      error.message || "Failed to restore backup",
      500
    )
  }
}
