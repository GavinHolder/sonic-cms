import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/api-middleware";

// Google shut down https://www.google.com/ping?sitemap= in June 2023.
// This endpoint now returns a helpful redirect to Search Console instead of
// silently claiming success against a defunct URL.
export async function POST(request: NextRequest) {
  const user = authenticate(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorised" }, { status: 401 });

  return NextResponse.json({
    success: false,
    deprecated: true,
    message:
      "Google removed the sitemap ping endpoint in June 2023. " +
      "To request indexing, open Google Search Console → URL Inspection → enter your URL → Request Indexing.",
  });
}
