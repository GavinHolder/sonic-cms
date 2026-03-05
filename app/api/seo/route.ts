/**
 * GET  /api/seo  — Return site-wide SEO configuration (no auth required)
 * PATCH /api/seo — Save site-wide SEO configuration (requires EDITOR role)
 *
 * Config is persisted to /data/seo-config.json on the server filesystem.
 * Per-page SEO fields are stored in the Page Prisma model.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { requireRole, handleApiError } from "@/lib/api-middleware";
import { defaultSeoConfig, type SeoConfig } from "@/lib/seo-config";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "seo-config.json");

async function readConfig(): Promise<SeoConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) return defaultSeoConfig;
    const raw = await readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultSeoConfig,
      ...parsed,
      social: { ...defaultSeoConfig.social, ...parsed.social },
      robots: { ...defaultSeoConfig.robots, ...parsed.robots },
      structuredData: { ...defaultSeoConfig.structuredData, ...parsed.structuredData },
    };
  } catch (error) {
    console.error("[seo] Failed to read config, using defaults:", error);
    return defaultSeoConfig;
  }
}

async function writeConfig(config: SeoConfig): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = requireRole(request, "EDITOR");
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const current = await readConfig();

    const updated: SeoConfig = {
      ...current,
      ...(body.siteName !== undefined && { siteName: String(body.siteName) }),
      ...(body.titleSeparator !== undefined && { titleSeparator: String(body.titleSeparator).slice(0, 5) }),
      ...(body.defaultDescription !== undefined && { defaultDescription: String(body.defaultDescription) }),
      ...(body.canonicalBase !== undefined && {
        canonicalBase: String(body.canonicalBase).replace(/\/$/, ""),
      }),
      ...(body.social && {
        social: {
          ...current.social,
          ...(body.social.ogImage !== undefined && { ogImage: String(body.social.ogImage) }),
          ...(body.social.twitterCard !== undefined && {
            twitterCard: ["summary", "summary_large_image"].includes(body.social.twitterCard)
              ? body.social.twitterCard
              : current.social.twitterCard,
          }),
          ...(body.social.twitterSite !== undefined && { twitterSite: String(body.social.twitterSite) }),
        },
      }),
      ...(body.robots && {
        robots: {
          ...current.robots,
          ...(Array.isArray(body.robots.disallowPaths) && {
            disallowPaths: body.robots.disallowPaths.map(String),
          }),
          ...(body.robots.includeSitemap !== undefined && {
            includeSitemap: Boolean(body.robots.includeSitemap),
          }),
        },
      }),
      ...(body.structuredData && {
        structuredData: {
          ...current.structuredData,
          ...(body.structuredData.enabled !== undefined && { enabled: Boolean(body.structuredData.enabled) }),
          ...(body.structuredData.type !== undefined && { type: String(body.structuredData.type) }),
          ...(body.structuredData.name !== undefined && { name: String(body.structuredData.name) }),
          ...(body.structuredData.streetAddress !== undefined && { streetAddress: String(body.structuredData.streetAddress) }),
          ...(body.structuredData.addressLocality !== undefined && { addressLocality: String(body.structuredData.addressLocality) }),
          ...(body.structuredData.addressCountry !== undefined && { addressCountry: String(body.structuredData.addressCountry) }),
          ...(body.structuredData.telephone !== undefined && { telephone: String(body.structuredData.telephone) }),
          ...(body.structuredData.url !== undefined && { url: String(body.structuredData.url) }),
        },
      }),
      updatedAt: new Date().toISOString(),
    };

    await writeConfig(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
