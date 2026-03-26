/**
 * GET /api/admin/plugins/page-types — page types from enabled plugins
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-middleware"
import { getPluginPageTypes } from "@/lib/plugins/registry"

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const types = await getPluginPageTypes()
  return NextResponse.json({ success: true, data: types })
}
