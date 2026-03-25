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
  const plugins = await getPlugins()
  return NextResponse.json({ success: true, data: plugins })
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  await seedBuiltinPlugins()
  const plugins = await getPlugins()
  return NextResponse.json({ success: true, data: plugins })
}
