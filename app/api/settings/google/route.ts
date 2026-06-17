import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { encrypt, isEncryptionConfigured } from "@/lib/crypto";

/**
 * Normalise the Google redirect base to a clean backend origin.
 * Strips a trailing slash and any pasted callback path so the stored value is
 * always a bare origin. Pairs with gscRedirectUri(), which re-appends the GSC path.
 */
function normaliseRedirectBase(input: string): string {
  return input
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/seo\/gsc\/callback$/, "")
    .replace(/\/api\/gbp\/callback$/, "")
    .replace(/\/+$/, "");
}

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError) return authError;
  const cfg = await prisma.siteConfig.findUnique({
    where: { id: "singleton" },
    select: { googleClientId: true, googleClientSecret: true, googleRedirectUri: true, googleMapsApiKey: true },
  });
  return NextResponse.json({
    clientId:             cfg?.googleClientId    ?? "",
    clientSecret:         cfg?.googleClientSecret ? "••••••••" : "",
    redirectUri:          cfg?.googleRedirectUri  ?? "",
    mapsApiKey:           cfg?.googleMapsApiKey   ? "••••••••" : "",
    encryptionConfigured: isEncryptionConfigured(),
  });
}

export async function PATCH(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError) return authError;
  const body = await req.json() as { clientId?: string; clientSecret?: string; redirectUri?: string; mapsApiKey?: string };
  const data: Record<string, string | null> = {};
  if (typeof body.clientId === "string")    data.googleClientId    = body.clientId || null;
  if (typeof body.redirectUri === "string") data.googleRedirectUri = normaliseRedirectBase(body.redirectUri) || null;
  if (typeof body.clientSecret === "string" && body.clientSecret !== "••••••••") {
    data.googleClientSecret = body.clientSecret ? encrypt(body.clientSecret) : null;
  }
  if (typeof body.mapsApiKey === "string" && body.mapsApiKey !== "••••••••") {
    const v = body.mapsApiKey.trim();
    data.googleMapsApiKey = v ? (isEncryptionConfigured() ? encrypt(v) : v) : null;
  }
  // upsert (not update): on a deployment whose singleton row was never created,
  // a plain update throws P2025 and the saved value (e.g. the Maps API key) is
  // silently lost. upsert creates the row on first save instead.
  await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  return NextResponse.json({ ok: true });
}
