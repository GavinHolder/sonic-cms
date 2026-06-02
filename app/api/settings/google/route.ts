import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import { encrypt, isEncryptionConfigured } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError) return authError;
  const cfg = await prisma.siteConfig.findUnique({
    where: { id: "singleton" },
    select: { googleClientId: true, googleClientSecret: true, googleRedirectUri: true },
  });
  return NextResponse.json({
    clientId:             cfg?.googleClientId    ?? "",
    clientSecret:         cfg?.googleClientSecret ? "••••••••" : "",
    redirectUri:          cfg?.googleRedirectUri  ?? "",
    encryptionConfigured: isEncryptionConfigured(),
  });
}

export async function PATCH(req: NextRequest) {
  const authError = await requireRole(req, UserRole.SUPER_ADMIN);
  if (authError) return authError;
  const body = await req.json() as { clientId?: string; clientSecret?: string; redirectUri?: string };
  const data: Record<string, string | null> = {};
  if (typeof body.clientId === "string")    data.googleClientId    = body.clientId || null;
  if (typeof body.redirectUri === "string") data.googleRedirectUri = body.redirectUri || null;
  if (typeof body.clientSecret === "string" && body.clientSecret !== "••••••••") {
    data.googleClientSecret = body.clientSecret ? encrypt(body.clientSecret) : null;
  }
  await prisma.siteConfig.update({ where: { id: "singleton" }, data });
  return NextResponse.json({ ok: true });
}
