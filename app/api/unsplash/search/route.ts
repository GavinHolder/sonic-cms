/**
 * GET /api/unsplash/search?q=mountains&page=1
 *
 * Proxy for Unsplash API — keeps UNSPLASH_ACCESS_KEY server-side.
 * Returns simplified photo objects for the designer image picker.
 */

import { NextRequest, NextResponse } from "next/server"

const UNSPLASH_API = "https://api.unsplash.com"

export async function GET(req: NextRequest) {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    return NextResponse.json(
      { success: false, error: "Unsplash API key not configured. Set UNSPLASH_ACCESS_KEY in environment." },
      { status: 503 }
    )
  }

  const url = new URL(req.url)
  const query = url.searchParams.get("q") || "nature"
  const page = url.searchParams.get("page") || "1"
  const perPage = "20"

  try {
    const res = await fetch(
      `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` }, next: { revalidate: 300 } }
    )

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Unsplash API error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const photos = data.results.map((p: {
      id: string
      urls: { small: string; regular: string; full: string }
      alt_description: string | null
      user: { name: string; links: { html: string } }
      width: number
      height: number
    }) => ({
      id: p.id,
      thumb: p.urls.small,
      regular: p.urls.regular,
      full: p.urls.full,
      alt: p.alt_description || "",
      photographer: p.user.name,
      photographerUrl: p.user.links.html,
      width: p.width,
      height: p.height,
    }))

    return NextResponse.json({ success: true, data: photos, total: data.total, totalPages: data.total_pages })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch from Unsplash" }, { status: 500 })
  }
}
