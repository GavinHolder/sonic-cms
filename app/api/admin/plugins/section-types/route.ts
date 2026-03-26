/**
 * GET /api/admin/plugins/section-types — section types from enabled plugins
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-middleware"
import { getPluginSectionTypes } from "@/lib/plugins/registry"

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const types = await getPluginSectionTypes()
  return NextResponse.json({ success: true, data: types })
}
