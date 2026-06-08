import prisma from "@/lib/prisma";
import { decrypt, isEncryptionConfigured } from "@/lib/crypto";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Derive the exact Search Console OAuth callback URI from the stored backend base.
 *
 * The Google setup wizard stores the CMS backend ORIGIN (e.g. https://backend.example.com).
 * Google's OAuth flow requires the full registered callback path. This helper appends
 * `/api/seo/gsc/callback` so the auth request and the token exchange send an IDENTICAL
 * redirect_uri — mismatched values trigger Error 400: redirect_uri_mismatch.
 *
 * Idempotent: if the stored value already ends in the callback path (a user pasted the
 * full URL), it is returned unchanged — no double-append. Trailing slashes are trimmed.
 */
export function gscRedirectUri(base: string): string {
  const path = "/api/seo/gsc/callback";
  if (!base) return base;
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.endsWith(path) ? trimmed : `${trimmed}${path}`;
}

export async function getGoogleCredentials(): Promise<GoogleCredentials> {
  const cfg = await prisma.siteConfig.findUnique({
    where: { id: "singleton" },
    select: { googleClientId: true, googleClientSecret: true, googleRedirectUri: true },
  });

  let clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  if (cfg?.googleClientSecret && isEncryptionConfigured()) {
    try { clientSecret = decrypt(cfg.googleClientSecret); } catch { /* use env fallback */ }
  }

  return {
    clientId:    cfg?.googleClientId    || process.env.GOOGLE_CLIENT_ID    || "",
    clientSecret,
    redirectUri: cfg?.googleRedirectUri || process.env.GOOGLE_REDIRECT_URI || "",
  };
}
