/**
 * GET  /api/settings/calculator — fetch calculator settings
 * POST /api/settings/calculator — save calculator settings
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-middleware";

const ALLOWED_KEYS = ["quote_ref_prefix", "quote_ref_counter"];

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const rows = await prisma.systemSettings.findMany({
    where: { key: { in: ALLOWED_KEYS } },
  });
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  for (const key of ALLOWED_KEYS) {
    const value = body[key];
    if (value === undefined) continue;
    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  return NextResponse.json({ ok: true });
}
