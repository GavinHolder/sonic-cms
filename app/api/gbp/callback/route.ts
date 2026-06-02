import { NextRequest, NextResponse } from "next/server";
import { exchangeGbpCodeForTokens } from "@/lib/gbp-client";

export const dynamic = "force-dynamic";

function clearCookie(res: NextResponse) {
  res.cookies.set("gbp_oauth_state", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/gbp/callback", maxAge: 0 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code") ?? "", state = searchParams.get("state") ?? "";

  const redirect = (path: string) => { const r = NextResponse.redirect(new URL(path, req.nextUrl.origin)); clearCookie(r); return r; };

  if (searchParams.get("error")) return redirect("/admin/content/seo?tab=business-profile&gbp=error&reason=access_denied");
  if (!code || !state)           return redirect("/admin/content/seo?tab=business-profile&gbp=error&reason=missing_params");

  const cookie = req.cookies.get("gbp_oauth_state")?.value ?? "";
  const [storedState, codeVerifier] = cookie.split(":");
  if (!storedState || !codeVerifier || storedState !== state) return redirect("/admin/content/seo?tab=business-profile&gbp=error&reason=csrf_mismatch");

  try {
    const redirectUri = `${req.nextUrl.origin}/api/gbp/callback`;
    await exchangeGbpCodeForTokens(code, codeVerifier, redirectUri);
    return redirect("/admin/content/seo?tab=business-profile&gbp=connected");
  } catch (err) {
    console.error("[gbp/callback]", err instanceof Error ? err.message : err);
    return redirect("/admin/content/seo?tab=business-profile&gbp=error&reason=exchange_failed");
  }
}
