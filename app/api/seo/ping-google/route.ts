import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  const user = authenticate(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorised" }, { status: 401 });

  try {
    const { sitemapUrl } = await request.json();
    if (!sitemapUrl) {
      return NextResponse.json({ success: false, message: "No sitemap URL provided" }, { status: 400 });
    }
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const res = await fetch(pingUrl, { method: "GET", signal: AbortSignal.timeout(8000) });
    if (res.ok || res.status === 200) {
      return NextResponse.json({ success: true, message: `Pinged Google (HTTP ${res.status}). Sitemap queued for re-crawl.` });
    }
    return NextResponse.json({ success: false, message: `Google returned HTTP ${res.status}` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
