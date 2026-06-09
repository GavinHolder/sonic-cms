import prisma from "@/lib/prisma";
import { decrypt, isEncryptionConfigured } from "@/lib/crypto";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Reduce a stored redirect value (bare origin or full callback URL) to scheme://host.
 *
 * The configured CMS Backend Domain is the single source of truth for OAuth redirects.
 * Behind a reverse proxy (Traefik + Docker standalone Next.js), `req.nextUrl.origin`
 * resolves to the container's internal bind address (e.g. https://0.0.0.0:3000), which
 * breaks the final browser redirect and the redirect_uri sent to Google. Deriving the
 * origin from config instead avoids that entirely.
 */
export function backendOrigin(base: string): string {
  if (!base) return base;
  try {
    return new URL(base.includes("://") ? base : `https://${base}`).origin;
  } catch {
    return base.replace(/\/+$/, "");
  }
}

/**
 * Exact Search Console OAuth callback URI, derived from the configured backend origin.
 * The auth request and token exchange both call this, so their redirect_uri values
 * always byte-match each other and the URI registered in Google Cloud.
 */
export function gscRedirectUri(base: string): string {
  const origin = backendOrigin(base);
  return origin ? `${origin}/api/seo/gsc/callback` : origin;
}

/**
 * Exact Business Profile OAuth callback URI, derived from the configured backend origin.
 */
export function gbpRedirectUri(base: string): string {
  const origin = backendOrigin(base);
  return origin ? `${origin}/api/gbp/callback` : origin;
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

/**
 * Google Maps Platform API key for geocoding (Places + Geocoding APIs).
 * Stored in SiteConfig so it's editable in the admin — each deployment (e.g. the
 * client's own Google account) sets its own key. Decrypted when encryption is
 * configured; falls back to the GOOGLE_MAPS_API_KEY env var when unset.
 */
export async function getGoogleMapsApiKey(): Promise<string> {
  const cfg = await prisma.siteConfig.findUnique({
    where: { id: "singleton" },
    select: { googleMapsApiKey: true },
  });
  if (cfg?.googleMapsApiKey) {
    if (isEncryptionConfigured()) {
      try { return decrypt(cfg.googleMapsApiKey); } catch { return cfg.googleMapsApiKey; }
    }
    return cfg.googleMapsApiKey;
  }
  return process.env.GOOGLE_MAPS_API_KEY ?? "";
}
