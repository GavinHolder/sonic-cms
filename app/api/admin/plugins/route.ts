/**
 * GET  /api/admin/plugins — list all plugins with state
 * POST /api/admin/plugins — trigger seed (manual re-seed)
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-middleware"
import { getPlugins, seedBuiltinPlugins } from "@/lib/plugins/registry"

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    const plugins = await getPlugins()
    return NextResponse.json({ success: true, data: plugins })
  } catch (error: unknown) {
    console.error("[Plugins GET]", error)
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : "Failed to load plugins" } }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  try {
    await seedBuiltinPlugins()
    const plugins = await getPlugins()
    return NextResponse.json({ success: true, data: plugins })
  } catch (error: unknown) {
    console.error("[Plugins POST]", error)
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : "Failed to seed plugins" } }, { status: 500 })
  }
}
