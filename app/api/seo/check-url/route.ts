/**
 * GET /api/seo/check-url?url=https://...
 * Server-side proxy to verify a canonical URL resolves.
 * Avoids CORS issues from the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.EDITOR);
  if (authError) return authError;

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ reachable: false, message: "No URL provided." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ reachable: false, message: "Invalid URL format." });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ reachable: false, message: "Only http/https URLs are supported." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(parsed.toString(), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (res.ok || res.status === 405) {
      // 405 = HEAD not allowed but server responded — site is reachable
      return NextResponse.json({ reachable: true, status: res.status });
    }
    return NextResponse.json({
      reachable: false,
      message: `Server responded with ${res.status}. Check the URL is correct.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Request timed out — site may not be live yet."
      : "Could not reach this URL. It may not be live yet.";
    return NextResponse.json({ reachable: false, message: msg });
  }
}
