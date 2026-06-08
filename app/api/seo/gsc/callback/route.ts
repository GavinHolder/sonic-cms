/**
 * GET /api/seo/gsc/callback
 * Handles Google OAuth callback. NO role check — identified by cookie only.
 * Validates state, exchanges code for tokens, stores encrypted tokens.
 *
 * SECURITY NOTES:
 * - State is validated against the cookie BEFORE exchanging the code.
 * - Cookie is cleared regardless of outcome (prevents replay).
 * - Redirects only to hardcoded paths — no open redirect.
 * - Tokens are never stored on error paths.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gsc-client";
import { getGoogleCredentials, backendOrigin } from "@/lib/google-credentials";

export const dynamic = "force-dynamic";

const SUCCESS_REDIRECT = "/admin/content/seo?tab=console&gsc=connected";
const ERROR_REDIRECT   = (reason: string) =>
  `/admin/content/seo?tab=console&gsc=error&reason=${encodeURIComponent(reason)}`;

function clearStateCookie(response: NextResponse): void {
  response.cookies.set("gsc_oauth_state", "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/api/seo/gsc/callback",
    maxAge:   0,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code")  ?? "";
  const state = searchParams.get("state") ?? "";

  // Resolve the public backend origin from config — req.nextUrl.origin is the
  // container's internal address (e.g. https://0.0.0.0:3000) behind a proxy.
  const { redirectUri } = await getGoogleCredentials();
  const base = backendOrigin(redirectUri) || req.nextUrl.origin;

  // Check for Google-returned error (e.g. user denied access)
  const googleError = searchParams.get("error");
  if (googleError) {
    const res = NextResponse.redirect(
      new URL(ERROR_REDIRECT("access_denied"), base),
    );
    clearStateCookie(res);
    return res;
  }

  if (!code || !state) {
    const res = NextResponse.redirect(
      new URL(ERROR_REDIRECT("missing_params"), base),
    );
    clearStateCookie(res);
    return res;
  }

  // Read and immediately clear the state cookie
  const cookieValue   = req.cookies.get("gsc_oauth_state")?.value ?? "";
  const [storedState, codeVerifier] = cookieValue.split(":");

  // Always clear the cookie — prevents replay regardless of outcome
  const makeRedirect = (path: string) => {
    const res = NextResponse.redirect(new URL(path, base));
    clearStateCookie(res);
    return res;
  };

  if (!storedState || !codeVerifier || storedState !== state) {
    return makeRedirect(ERROR_REDIRECT("csrf_mismatch"));
  }

  try {
    await exchangeCodeForTokens(code, codeVerifier);
    return makeRedirect(SUCCESS_REDIRECT);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[gsc/callback] Token exchange failed:", message);
    return makeRedirect(ERROR_REDIRECT("exchange_failed"));
  }
}
