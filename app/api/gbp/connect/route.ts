import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { randomBytes, createHash } from "crypto";
import { getGoogleCredentials, gbpRedirectUri } from "@/lib/google-credentials";

export const dynamic = "force-dynamic";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError) return authError;
  const { clientId, redirectUri: configBase } = await getGoogleCredentials();
  if (!clientId) return NextResponse.json({ error: "Google Client ID not configured in Settings → Google Integration." }, { status: 500 });

  // Derive from the configured backend origin, not req.nextUrl.origin (internal proxy address).
  const redirectUri   = gbpRedirectUri(configBase) || `${req.nextUrl.origin}/api/gbp/callback`;
  const codeVerifier  = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const state         = randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    scope: "https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline", prompt: "consent",
    state, code_challenge: codeChallenge, code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  res.cookies.set("gbp_oauth_state", `${state}:${codeVerifier}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/gbp/callback", maxAge: 600 });
  return res;
}
