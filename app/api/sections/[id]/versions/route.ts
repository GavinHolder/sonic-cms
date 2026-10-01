import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/api-middleware';
import { SECTION_ID_RE, summarizeDesignerData } from '@/lib/section-versions';
import { SECTION_VERSION_LIMIT } from '@/lib/section-write-guard';

/**
 * GET /api/sections/[id]/versions
 * Lists saved snapshots (newest first) with per-breakpoint block counts only - never the full blob.
 * EDITOR or above. Guard is the first statement (401/403 have no side effects).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, 'EDITOR');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    if (!SECTION_ID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'Invalid section id' }, { status: 400 });
    }

    const rows = await prisma.sectionVersion.findMany({
      where: { sectionId: id },
      orderBy: { version: 'desc' },
      take: SECTION_VERSION_LIMIT,
    });

    const data = rows.map((v) => ({
      id: v.id,
      version: v.version,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      counts: summarizeDesignerData((v.config as { content?: unknown } | null)?.content),
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to list section versions:', error);
    return NextResponse.json({ success: false, error: 'Failed to list versions' }, { status: 500 });
  }
}
