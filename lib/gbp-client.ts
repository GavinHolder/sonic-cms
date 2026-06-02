import prisma from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { getGoogleCredentials } from "@/lib/google-credentials";

export class GbpNotConnectedError extends Error { constructor() { super("Google Business Profile is not connected."); } }
export class GbpApiError extends Error { constructor(message: string, public readonly status: number, public readonly quotaExceeded = false) { super(message); } }
export class GbpNoLocationError extends Error { constructor() { super("No GBP location selected."); } }

export interface GbpLocation { name: string; title: string; }
export interface GbpBusinessInfo {
  name: string; title: string;
  phoneNumbers?: { primaryPhone?: string };
  storefrontAddress?: { addressLines?: string[]; locality?: string };
  websiteUri?: string;
  categories?: { primaryCategory?: { displayName?: string } };
}
export interface GbpReview {
  name: string;
  reviewer: { displayName: string };
  starRating: string;
  comment?: string;
  createTime: string;
  reviewReply?: { comment: string };
}
export interface GbpPost { name: string; summary: string; createTime: string; state: string; callToAction?: { actionType: string; url?: string }; }

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const ACCOUNT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO_BASE    = "https://mybusinessbusinessinformation.googleapis.com/v1";
const V4_BASE      = "https://mybusiness.googleapis.com/v4";
const PERF_BASE    = "https://businessprofileperformance.googleapis.com/v1";

export async function getStoredGbpToken() { return prisma.gbpToken.findFirst(); }
export async function deleteStoredGbpToken() { await prisma.gbpToken.deleteMany(); }

async function gbpFetch(url: string, token: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers ?? {}) }, signal: AbortSignal.timeout(10_000) });
  if (res.status === 429) throw new GbpApiError("GBP quota exceeded", 429, true);
  if (res.status === 401) { await deleteStoredGbpToken(); throw new GbpNotConnectedError(); }
  if (!res.ok) throw new GbpApiError(`GBP API error: ${res.status}`, res.status);
  return res;
}

let gbpRefreshInFlight: Promise<string> | null = null;

async function refreshGbpToken(refreshTokenPlain: string): Promise<string> {
  const { clientId, clientSecret } = await getGoogleCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: refreshTokenPlain, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" }), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) { await deleteStoredGbpToken(); throw new GbpNotConnectedError(); }
  const json = await res.json() as { access_token: string; expires_in: number };
  await prisma.gbpToken.updateMany({ data: { accessToken: encrypt(json.access_token), expiresAt: new Date(Date.now() + json.expires_in * 1000) } });
  return json.access_token;
}

export async function getValidGbpAccessToken(): Promise<string> {
  if (gbpRefreshInFlight) return gbpRefreshInFlight;
  const token = await getStoredGbpToken();
  if (!token) throw new GbpNotConnectedError();
  let plain: string;
  try { plain = decrypt(token.accessToken); } catch { await deleteStoredGbpToken(); throw new GbpNotConnectedError(); }
  if (token.expiresAt.getTime() - Date.now() > 5 * 60_000) return plain;
  let refreshPlain: string;
  try { refreshPlain = decrypt(token.refreshToken); } catch { await deleteStoredGbpToken(); throw new GbpNotConnectedError(); }
  gbpRefreshInFlight = refreshGbpToken(refreshPlain).finally(() => { gbpRefreshInFlight = null; });
  return gbpRefreshInFlight;
}

export async function exchangeGbpCodeForTokens(code: string, codeVerifier: string, redirectUri: string): Promise<{ accountEmail: string }> {
  const { clientId, clientSecret } = await getGoogleCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: codeVerifier }), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`GBP token exchange failed: ${res.status}`);
  const json = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  let accountEmail = "";
  try { const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${json.access_token}` }, signal: AbortSignal.timeout(5_000) }); if (r.ok) { const u = await r.json() as { email?: string }; accountEmail = u.email ?? ""; } } catch { /* non-fatal */ }
  await prisma.$transaction([prisma.gbpToken.deleteMany(), prisma.gbpToken.create({ data: { accessToken: encrypt(json.access_token), refreshToken: encrypt(json.refresh_token), expiresAt: new Date(Date.now() + json.expires_in * 1000), accountEmail } })]);
  return { accountEmail };
}

export async function fetchGbpLocations(): Promise<GbpLocation[]> {
  const token = await getValidGbpAccessToken();
  const ar = await gbpFetch(`${ACCOUNT_BASE}/accounts`, token);
  const aj = await ar.json() as { accounts?: Array<{ name: string }> };
  if (!aj.accounts?.length) return [];
  const lr = await gbpFetch(`${INFO_BASE}/${aj.accounts[0].name}/locations?readMask=name,title`, token);
  const lj = await lr.json() as { locations?: GbpLocation[] };
  return lj.locations ?? [];
}

export async function fetchGbpBusinessInfo(locationName: string): Promise<GbpBusinessInfo> {
  const token = await getValidGbpAccessToken();
  const res = await gbpFetch(`${INFO_BASE}/${locationName}?readMask=name,title,phoneNumbers,storefrontAddress,websiteUri,categories`, token);
  return res.json() as Promise<GbpBusinessInfo>;
}

export async function fetchGbpReviews(locationName: string): Promise<GbpReview[]> {
  const token = await getValidGbpAccessToken();
  const res = await gbpFetch(`${V4_BASE}/${locationName}/reviews?pageSize=10`, token);
  const j = await res.json() as { reviews?: GbpReview[] };
  return j.reviews ?? [];
}

export async function fetchGbpPosts(locationName: string): Promise<GbpPost[]> {
  const token = await getValidGbpAccessToken();
  const res = await gbpFetch(`${V4_BASE}/${locationName}/localPosts?pageSize=10`, token);
  const j = await res.json() as { localPosts?: GbpPost[] };
  return j.localPosts ?? [];
}

export async function createGbpPost(locationName: string, post: { summary: string; actionType?: string; actionUrl?: string }): Promise<GbpPost> {
  const token = await getValidGbpAccessToken();
  const body: Record<string, unknown> = { languageCode: "en", summary: post.summary, topicType: "STANDARD" };
  if (post.actionType) body.callToAction = { actionType: post.actionType, url: post.actionUrl };
  const res = await gbpFetch(`${V4_BASE}/${locationName}/localPosts`, token, { method: "POST", body: JSON.stringify(body) });
  return res.json() as Promise<GbpPost>;
}

export async function fetchGbpInsights(locationName: string): Promise<Array<{ metric: string; value: number }>> {
  const token = await getValidGbpAccessToken();
  const end = new Date(), start = new Date(end.getTime() - 30 * 86400_000);
  const fmt = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
  const s = fmt(start), e = fmt(end);
  const params = new URLSearchParams({ dailyMetric: "WEBSITE_CLICKS", "dailyRange.startDate.year": String(s.year), "dailyRange.startDate.month": String(s.month), "dailyRange.startDate.day": String(s.day), "dailyRange.endDate.year": String(e.year), "dailyRange.endDate.month": String(e.month), "dailyRange.endDate.day": String(e.day) });
  try {
    const res = await gbpFetch(`${PERF_BASE}/${locationName}:getDailyMetricsTimeSeries?${params}`, token);
    const j = await res.json() as { timeSeries?: { datedValues?: Array<{ value?: string }> } };
    const total = (j.timeSeries?.datedValues ?? []).reduce((sum, v) => sum + parseInt(v.value ?? "0", 10), 0);
    return [{ metric: "WEBSITE_CLICKS", value: total }];
  } catch { return []; }
}

export async function revokeGbpToken(): Promise<void> {
  const token = await getStoredGbpToken();
  if (!token) return;
  try { const plain = decrypt(token.accessToken); await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(plain)}`, { method: "POST", signal: AbortSignal.timeout(5_000) }); } catch { /* non-fatal */ }
}
