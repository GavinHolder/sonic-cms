/**
 * GET   /api/admin/plugins/:slug — single plugin detail
 * PATCH /api/admin/plugins/:slug — enable/disable, update config
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-middleware"
import { getPlugin, setPluginEnabled, updatePluginConfig } from "@/lib/plugins/registry"

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { slug } = await params
  const plugin = await getPlugin(slug)
  if (!plugin) return NextResponse.json({ success: false, error: { message: "Plugin not found" } }, { status: 404 })
  return NextResponse.json({ success: true, data: plugin })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { slug } = await params
  try {
    const body = await req.json()
    if (typeof body.enabled === 'boolean') {
      await setPluginEnabled(slug, body.enabled)
    }
    if (body.config && typeof body.config === 'object') {
      await updatePluginConfig(slug, body.config)
    }
    const plugin = await getPlugin(slug)
    return NextResponse.json({ success: true, data: plugin })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update plugin"
    return NextResponse.json({ success: false, error: { message } }, { status: 400 })
  }
}
