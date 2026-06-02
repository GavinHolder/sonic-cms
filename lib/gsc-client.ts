/**
 * Google Search Console API client.
 *
 * ASSUMPTIONS:
 * 1. Single-tenant CMS — SeoGscToken table holds exactly 0 or 1 rows.
 * 2. Self-hosted (not serverless) — module-level state (mutex, cache) persists between requests.
 * 3. GSC_ENCRYPTION_KEY is set when any token operation is attempted.
 * 4. Google refresh tokens are long-lived (revoked only by user or Google policy).
 *
 * FAILURE MODES:
 * - Refresh token revoked → Google returns 400/401 → we delete stored tokens → callers see GscNotConnectedError.
 * - Concurrent refresh → in-memory mutex ensures only one refresh runs at a time.
 * - Corrupted stored token → decrypt throws → we treat as "reconnect required".
 * - Google API rate-limit (429) → surface to caller as GscApiError with quota flag.
 */

import prisma from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { getGoogleCredentials } from "@/lib/google-credentials";

// ── Error types ────────────────────────────────────────────────────────────────

export class GscNotConnectedError extends Error {
  constructor() { super("Google Search Console is not connected."); }
}

export class GscApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly quotaExceeded = false,
  ) { super(message); }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GscSite {
  siteUrl:         string;
  permissionLevel: string;
}

export interface GscAnalyticsRow {
  keys:         string[];
  clicks:       number;
  impressions:  number;
  ctr:          number;
  position:     number;
}

export interface GscInspectionResult {
  inspectionUrl:   string;
  indexStatusVerdict: string; // "PASS" | "FAIL" | "NEUTRAL" | "VERDICT_UNSPECIFIED"
  coverageState:   string;
  robotsTxtState:  string;
  indexingState:   string;
  lastCrawlTime?:  string;
  pageFetchState:  string;
  googleCanonical?: string;
  userCanonical?:  string;
}

export interface GscSitemap {
  path:           string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending:      boolean;
  isSitemapsIndex: boolean;
  contents?: Array<{ type: string; submitted: string; indexed: string }>;
}

// ── In-memory inspection cache (key = `${siteUrl}::${inspectionUrl}`) ─────────

interface CacheEntry {
  result:    GscInspectionResult;
  expiresAt: number; // ms timestamp
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const inspectionCache = new Map<string, CacheEntry>();

function getCached(key: string): GscInspectionResult | null {
  const entry = inspectionCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { inspectionCache.delete(key); return null; }
  return entry.result;
}

function setCache(key: string, result: GscInspectionResult): void {
  inspectionCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearInspectionCache(): void {
  inspectionCache.clear();
}

// ── Token refresh mutex ────────────────────────────────────────────────────────
// Prevents concurrent refresh calls both seeing the token as expired.

let refreshInFlight: Promise<string> | null = null;

// ── Google endpoints ───────────────────────────────────────────────────────────

const GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL  = "https://oauth2.googleapis.com/revoke";
const GSC_API_BASE       = "https://www.googleapis.com/webmasters/v3";
const GSC_INSPECT_BASE   = "https://searchconsole.googleapis.com/v1";

// ── Internal helpers ───────────────────────────────────────────────────────────

async function gscFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 429) {
    throw new GscApiError("Google API quota exceeded. Try again later.", 429, true);
  }
  if (res.status === 401) {
    // Token revoked — delete stored tokens so caller knows to reconnect
    await deleteStoredToken();
    throw new GscNotConnectedError();
  }
  if (!res.ok) {
    throw new GscApiError(`Google API error: ${res.status} ${res.statusText}`, res.status);
  }
  return res;
}

// ── Token storage ──────────────────────────────────────────────────────────────

export async function getStoredToken() {
  return prisma.seoGscToken.findFirst();
}

export async function deleteStoredToken(): Promise<void> {
  await prisma.seoGscToken.deleteMany();
  clearInspectionCache();
}

// ── Token exchange (OAuth callback) ───────────────────────────────────────────

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<{ accountEmail: string }> {
  const { clientId, clientSecret, redirectUri } = await getGoogleCredentials();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const json = await res.json() as {
    access_token:  string;
    refresh_token: string;
    expires_in:    number;
    token_type:    string;
  };

  const expiresAt = new Date(Date.now() + json.expires_in * 1000);

  // Fetch account email from Google userinfo
  let accountEmail = "";
  try {
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${json.access_token}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (infoRes.ok) {
      const info = await infoRes.json() as { email?: string };
      accountEmail = info.email ?? "";
    }
  } catch { /* non-fatal */ }

  // Atomic upsert: delete all existing rows, then create fresh
  await prisma.$transaction([
    prisma.seoGscToken.deleteMany(),
    prisma.seoGscToken.create({
      data: {
        accessToken:  encrypt(json.access_token),
        refreshToken: encrypt(json.refresh_token),
        expiresAt,
        accountEmail,
      },
    }),
  ]);

  return { accountEmail };
}

// ── Token refresh ──────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshTokenPlain: string): Promise<string> {
  const { clientId, clientSecret } = await getGoogleCredentials();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshTokenPlain,
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    // Refresh token revoked — delete stored tokens
    await deleteStoredToken();
    throw new GscNotConnectedError();
  }

  const json = await res.json() as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + json.expires_in * 1000);

  await prisma.seoGscToken.updateMany({
    data: {
      accessToken: encrypt(json.access_token),
      expiresAt,
    },
  });

  return json.access_token;
}

// ── Get valid access token (with mutex) ───────────────────────────────────────

export async function getValidAccessToken(): Promise<string> {
  // If a refresh is already in flight, await it
  if (refreshInFlight) return refreshInFlight;

  const token = await getStoredToken();
  if (!token) throw new GscNotConnectedError();

  let accessTokenPlain: string;
  try {
    accessTokenPlain = decrypt(token.accessToken);
  } catch {
    await deleteStoredToken();
    throw new GscNotConnectedError();
  }

  // Return current token if not near expiry (>5 min remaining)
  const fiveMinutes = 5 * 60 * 1000;
  if (token.expiresAt.getTime() - Date.now() > fiveMinutes) {
    return accessTokenPlain;
  }

  // Refresh with mutex
  let refreshTokenPlain: string;
  try {
    refreshTokenPlain = decrypt(token.refreshToken);
  } catch {
    await deleteStoredToken();
    throw new GscNotConnectedError();
  }

  refreshInFlight = refreshAccessToken(refreshTokenPlain).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

// ── GSC API calls ──────────────────────────────────────────────────────────────

export async function fetchSites(): Promise<GscSite[]> {
  const token = await getValidAccessToken();
  const res   = await gscFetch(`${GSC_API_BASE}/sites`, token);
  const json  = await res.json() as { siteEntry?: GscSite[] };
  return json.siteEntry ?? [];
}

export async function updateStoredSiteUrl(siteUrl: string): Promise<void> {
  await prisma.seoGscToken.updateMany({ data: { siteUrl } });
}

export async function fetchSearchAnalytics(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ["page"],
  rowLimit = 50,
): Promise<GscAnalyticsRow[]> {
  const token = await getValidAccessToken();
  const res   = await gscFetch(
    `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
    },
  );
  const json = await res.json() as { rows?: GscAnalyticsRow[] };
  return json.rows ?? [];
}

export async function inspectUrl(
  siteUrl: string,
  inspectionUrl: string,
): Promise<GscInspectionResult> {
  const cacheKey = `${siteUrl}::${inspectionUrl}`;
  const cached   = getCached(cacheKey);
  if (cached) return cached;

  const token = await getValidAccessToken();
  const res   = await gscFetch(
    `${GSC_INSPECT_BASE}/urlInspection/index:inspect`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ inspectionUrl, siteUrl }),
    },
  );

  const json = await res.json() as {
    inspectionResult?: {
      inspectionUrl: string;
      indexStatusResult?: {
        verdict:         string;
        coverageState:   string;
        robotsTxtState:  string;
        indexingState:   string;
        lastCrawlTime?:  string;
        pageFetchState:  string;
        googleCanonical?: string;
        userCanonical?:  string;
      };
    };
  };

  const r = json.inspectionResult;
  const s = r?.indexStatusResult;

  const result: GscInspectionResult = {
    inspectionUrl:      r?.inspectionUrl ?? inspectionUrl,
    indexStatusVerdict: s?.verdict       ?? "VERDICT_UNSPECIFIED",
    coverageState:      s?.coverageState ?? "",
    robotsTxtState:     s?.robotsTxtState ?? "",
    indexingState:      s?.indexingState  ?? "",
    lastCrawlTime:      s?.lastCrawlTime,
    pageFetchState:     s?.pageFetchState ?? "",
    googleCanonical:    s?.googleCanonical,
    userCanonical:      s?.userCanonical,
  };

  setCache(cacheKey, result);
  return result;
}

export async function fetchSitemaps(siteUrl: string): Promise<GscSitemap[]> {
  const token = await getValidAccessToken();
  const res   = await gscFetch(
    `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
    token,
  );
  const json = await res.json() as { sitemap?: GscSitemap[] };
  return json.sitemap ?? [];
}

export async function revokeToken(): Promise<void> {
  const token = await getStoredToken();
  if (!token) return;

  try {
    let plain: string;
    try {
      plain = decrypt(token.accessToken);
    } catch {
      return; // Can't revoke corrupted token — just delete locally
    }

    await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(plain)}`, {
      method: "POST",
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    // Non-fatal: log but proceed with local deletion
    console.warn("[gsc-client] Token revocation failed:", err instanceof Error ? err.message : err);
  }
}
