/**
 * GET /api/seo/gsc/connect
 * Initiates Google OAuth 2.0 PKCE flow for Search Console.
 * Requires SUPER_ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { randomBytes, createHash } from "crypto";
import { getGoogleCredentials, gscRedirectUri } from "@/lib/google-credentials";

export const dynamic = "force-dynamic";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GSC_SCOPE       = "https://www.googleapis.com/auth/webmasters.readonly";
const USERINFO_SCOPE  = "https://www.googleapis.com/auth/userinfo.email";

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError instanceof NextResponse) return authError;

  const { clientId, redirectUri } = await getGoogleCredentials();

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { success: false, error: "Google Client ID and Redirect URI must be configured in Settings → Google Integration." },
      { status: 500 },
    );
  }

  // PKCE: code_verifier = 32 random bytes as base64url (43 chars)
  const codeVerifier  = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  // CSRF state: 32 random bytes as hex
  const state = randomBytes(32).toString("hex");

  // Store state + verifier in a single httpOnly cookie (colon-separated)
  // Cookie is scoped to the callback path only
  const cookieValue = `${state}:${codeVerifier}`;

  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          gscRedirectUri(redirectUri),
    response_type:         "code",
    scope:                 `${GSC_SCOPE} ${USERINFO_SCOPE}`,
    access_type:           "offline",
    prompt:                "consent",
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);

  response.cookies.set("gsc_oauth_state", cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",          // lax is required — strict strips cookie on cross-site redirect
    path:     "/api/seo/gsc/callback",
    maxAge:   600,            // 10 minutes
  });

  return response;
}
