/**
 * GET /api/plugins/enabled — public list of enabled plugin slugs (no auth)
 */
import { NextResponse } from "next/server"
import { getEnabledPlugins } from "@/lib/plugins/registry"

export async function GET() {
  try {
    const plugins = await getEnabledPlugins()
    return NextResponse.json({
      success: true,
      data: plugins.map(p => ({ slug: p.slug, name: p.name, icon: p.manifest.icon })),
    })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}
