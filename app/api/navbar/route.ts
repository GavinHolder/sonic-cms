/**
 * GET  /api/navbar  — Return current navbar configuration
 * PATCH /api/navbar  — Save navbar configuration
 *
 * Config is persisted to /data/navbar-config.json on the server filesystem.
 * No authentication required for GET (Navbar reads on every page load).
 * PATCH requires EDITOR role.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { requireRole, handleApiError } from "@/lib/api-middleware";
import { defaultNavbarConfig, type NavbarConfig } from "@/lib/navbar-config";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "navbar-config.json");

async function readConfig(): Promise<NavbarConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return defaultNavbarConfig;
    }
    const raw = await readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields added later are always present
    return {
      ...defaultNavbarConfig,
      ...parsed,
      cta: { ...defaultNavbarConfig.cta, ...parsed.cta },
      scrolledBackground: {
        ...defaultNavbarConfig.scrolledBackground,
        ...parsed.scrolledBackground,
      },
    };
  } catch (error) {
    console.error("[navbar] Failed to read config, using defaults:", error);
    return defaultNavbarConfig;
  }
}

async function writeConfig(config: NavbarConfig): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * GET /api/navbar
 * Returns the current navbar configuration. No auth required.
 */
export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/navbar
 * Saves navbar configuration. Requires EDITOR role.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const current = await readConfig();

    const updated: NavbarConfig = {
      ...current,
      ...(body.logoSrc !== undefined && { logoSrc: String(body.logoSrc) }),
      ...(body.logoAlt !== undefined && { logoAlt: String(body.logoAlt) }),
      ...(body.logoHeight !== undefined && { logoHeight: Number(body.logoHeight) }),
      ...(body.logoWidth !== undefined && { logoWidth: Number(body.logoWidth) }),
      ...(body.cta !== undefined && {
        cta: {
          ...current.cta,
          ...(body.cta.show !== undefined && { show: Boolean(body.cta.show) }),
          ...(body.cta.text !== undefined && { text: String(body.cta.text) }),
          ...(body.cta.style !== undefined && { style: body.cta.style }),
          ...(body.cta.href !== undefined && { href: String(body.cta.href) }),
          ...(body.cta.linkMode !== undefined && { linkMode: body.cta.linkMode }),
        },
      }),
      ...(body.scrolledBackground !== undefined && {
        scrolledBackground: {
          ...current.scrolledBackground,
          ...(body.scrolledBackground.color !== undefined && {
            color: String(body.scrolledBackground.color),
          }),
          ...(body.scrolledBackground.opacity !== undefined && {
            opacity: Math.min(100, Math.max(0, Number(body.scrolledBackground.opacity))),
          }),
        },
      }),
      ...(body.colorMatchTopSection !== undefined && {
        colorMatchTopSection: Boolean(body.colorMatchTopSection),
      }),
      updatedAt: new Date().toISOString(),
    };

    await writeConfig(updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
