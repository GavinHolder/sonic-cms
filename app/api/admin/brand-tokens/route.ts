/**
 * GET  /api/admin/brand-tokens — fetch current brand tokens (or defaults)
 * PUT  /api/admin/brand-tokens — save brand tokens
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/api-middleware"
import { getBrandTokens, saveBrandTokens, DEFAULT_BRAND_TOKENS } from "@/lib/brand-tokens"

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")

const brandTokensSchema = z.object({
  colors: z.object({
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
    neutral: hexColor,
    background: hexColor,
    surface: hexColor,
    text: hexColor,
    textMuted: hexColor,
  }),
  typography: z.object({
    headingFont: z.string().min(1).max(100),
    bodyFont: z.string().min(1).max(100),
    baseSize: z.number().int().min(10).max(32),
    scaleRatio: z.number().min(1).max(2),
  }),
  spacing: z.object({
    sectionPadding: z.number().int().min(0).max(200),
    containerMax: z.number().int().min(800).max(2400),
  }),
  borders: z.object({
    radius: z.number().int().min(0).max(50),
    radiusLarge: z.number().int().min(0).max(100),
  }),
})

export async function GET(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const tokens = await getBrandTokens()
  return NextResponse.json({ success: true, data: tokens })
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const validation = brandTokensSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0].message,
            field: validation.error.issues[0].path.join("."),
          },
        },
        { status: 400 }
      )
    }

    await saveBrandTokens(validation.data)
    return NextResponse.json({ success: true, data: validation.data })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to save brand tokens" } },
      { status: 500 }
    )
  }
}
