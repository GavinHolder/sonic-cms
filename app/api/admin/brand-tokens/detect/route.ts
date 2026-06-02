/**
 * GET /api/admin/brand-tokens/detect
 * Scans all section content JSON for hex color values and returns unique suggestions.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Extract all #rrggbb hex codes from a JSON blob (recursive)
function extractHex(value: unknown, found: Set<string>): void {
  if (typeof value === "string") {
    const matches = value.match(/#[0-9A-Fa-f]{6}\b/g);
    if (matches) matches.forEach(h => found.add(h.toLowerCase()));
  } else if (Array.isArray(value)) {
    value.forEach(v => extractHex(v, found));
  } else if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(v => extractHex(v, found));
  }
}

// Filter out very dark/light colours that are likely defaults (pure black/white)
const NOISE_COLORS = new Set(["#000000", "#ffffff", "#000", "#fff"]);

export async function GET(req: NextRequest) {
  const user = requireRole(req, UserRole.EDITOR);
  if (user instanceof NextResponse) return user;

  const sections = await prisma.section.findMany({
    select: { content: true },
    take: 200,
  });

  const found = new Set<string>();
  for (const s of sections) {
    extractHex(s.content, found);
  }

  const colors = [...found]
    .filter(c => !NOISE_COLORS.has(c))
    .sort();

  return NextResponse.json({ success: true, colors });
}
