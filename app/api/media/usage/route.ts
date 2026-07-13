/**
 * GET /api/media/usage
 *
 * Scans all section content JSON for references to uploaded media files.
 * Returns a map of { filename: usageCount } for files in /images/uploads/ and /uploads/.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/api-middleware";

function extractFilenames(text: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const regex = /\/(?:images\/)?uploads\/([^"'\s,)>]+)/g;
  while ((match = regex.exec(text)) !== null) {
    const filename = match[1].split("?")[0].split("#")[0];
    if (filename) matches.push(filename);
  }
  return matches;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireRole(request, "VIEWER");
    if (user instanceof Response) return user;

    const sections = await prisma.section.findMany({
      select: {
        content: true,
        contentDraft: true,
        banner: true,
        lowerThird: true,
        motionElements: true,
      },
    });

    const usages: Record<string, number> = {};

    for (const section of sections) {
      const fields = [
        section.content,
        section.contentDraft,
        section.banner,
        section.lowerThird,
        section.motionElements,
      ];

      for (const field of fields) {
        if (!field) continue;
        const text = JSON.stringify(field);
        const filenames = extractFilenames(text);
        for (const filename of filenames) {
          usages[filename] = (usages[filename] ?? 0) + 1;
        }
      }
    }

    return NextResponse.json({ usages });
  } catch {
    return NextResponse.json({ usages: {} });
  }
}
