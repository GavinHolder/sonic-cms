/**
 * GET  /api/admin/maintenance  — return current maintenance settings
 * PUT  /api/admin/maintenance  — update maintenance settings (SUPER_ADMIN only)
 *
 * Settings stored in SystemSettings key-value table:
 *   maintenance_mode          "true" | "false"
 *   maintenance_template      "plain" | "construction" | "custom"
 *   maintenance_custom_img    URL string
 *   maintenance_primary_color "#rrggbb"
 *   maintenance_dark_color    "#rrggbb"
 *   maintenance_light_color   "#rrggbb"
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";

const KEY_MODE    = "maintenance_mode";
const KEY_TPL     = "maintenance_template";
const KEY_IMG     = "maintenance_custom_img";
const KEY_PRIMARY = "maintenance_primary_color";
const KEY_DARK    = "maintenance_dark_color";
const KEY_LIGHT   = "maintenance_light_color";
const KEY_SCHEME  = "maintenance_color_scheme";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

async function upsert(key: string, value: string) {
  await prisma.systemSettings.upsert({
    where:  { key },
    update: { value },
    create: { key, value },
  });
}

async function fetchAll() {
  const [modeRow, tplRow, imgRow, primRow, darkRow, lightRow, schemeRow] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { key: KEY_MODE } }),
    prisma.systemSettings.findUnique({ where: { key: KEY_TPL } }),
    prisma.systemSettings.findUnique({ where: { key: KEY_IMG } }),
    prisma.systemSettings.findUnique({ where: { key: KEY_PRIMARY } }),
    prisma.systemSettings.findUnique({ where: { key: KEY_DARK } }),
    prisma.systemSettings.findUnique({ where: { key: KEY_LIGHT } }),
    prisma.systemSettings.findUnique({ where: { key: KEY_SCHEME } }),
  ]);
  return {
    enabled:      modeRow?.value  === "true",
    template:     tplRow?.value   ?? "plain",
    customImage:  imgRow?.value   ?? "",
    primaryColor: primRow?.value  ?? "",
    darkColor:    darkRow?.value  ?? "",
    lightColor:   lightRow?.value ?? "",
    colorScheme:  schemeRow?.value ?? "light",
  };
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await fetchAll());
}

export async function PUT(req: NextRequest) {
  const auth = requireRole(req, UserRole.SUPER_ADMIN);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as {
    enabled?: boolean;
    template?: string;
    customImage?: string;
    primaryColor?: string;
    darkColor?: string;
    lightColor?: string;
    colorScheme?: string;
  };

  await Promise.all([
    body.enabled      !== undefined ? upsert(KEY_MODE,    String(Boolean(body.enabled))) : Promise.resolve(),
    body.template     !== undefined ? upsert(KEY_TPL,     body.template)                 : Promise.resolve(),
    body.customImage  !== undefined ? upsert(KEY_IMG,     body.customImage)              : Promise.resolve(),
    body.colorScheme  !== undefined ? upsert(KEY_SCHEME,  body.colorScheme)              : Promise.resolve(),
    body.primaryColor !== undefined && HEX_RE.test(body.primaryColor) ? upsert(KEY_PRIMARY, body.primaryColor) : Promise.resolve(),
    body.darkColor    !== undefined && HEX_RE.test(body.darkColor)    ? upsert(KEY_DARK,    body.darkColor)    : Promise.resolve(),
    body.lightColor   !== undefined && HEX_RE.test(body.lightColor)   ? upsert(KEY_LIGHT,   body.lightColor)   : Promise.resolve(),
  ]);

  return NextResponse.json(await fetchAll());
}
