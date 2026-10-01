import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireRole } from '@/lib/api-middleware';
import { SECTION_ID_RE } from '@/lib/section-versions';
import { saveSectionGuarded, parseExpectedUpdatedAt } from '@/lib/section-write-guard';

/**
 * POST /api/sections/[id]/versions/[versionId]/restore
 * Restores a snapshot's content. The current content is snapshotted first (inside saveSectionGuarded),
 * so a restore is itself undoable. Optional body.expectedUpdatedAt applies the same stale check as PUT.
 *
 * ASSUMPTIONS: EDITOR+ via requireRole; version.config = { content, contentDraft }.
 * FAILURE MODES: version of another section -> 404 (sectionId is part of the lookup);
 * malformed snapshot -> 422 with no write; stale base -> 409 with no write.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const auth = requireRole(request, 'EDITOR');
    if (auth instanceof NextResponse) return auth;
    const { id, versionId } = await params;
    if (!SECTION_ID_RE.test(id) || !SECTION_ID_RE.test(versionId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* empty body is fine */ }
    const expected = parseExpectedUpdatedAt(body?.expectedUpdatedAt);
    if (expected === 'invalid') {
      return NextResponse.json({ success: false, error: 'Invalid expectedUpdatedAt' }, { status: 400 });
    }

    const version = await prisma.sectionVersion.findFirst({ where: { id: versionId, sectionId: id } });
    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }
    const cfg = version.config as { content?: unknown; contentDraft?: unknown } | null;
    if (!cfg || typeof cfg !== 'object' || cfg.content === undefined || cfg.content === null) {
      return NextResponse.json({ success: false, error: 'Snapshot has no content' }, { status: 422 });
    }

    const result = await saveSectionGuarded(prisma, {
      id,
      data: {
        content: cfg.content as Prisma.InputJsonValue,
        ...(cfg.contentDraft !== undefined && cfg.contentDraft !== null && {
          contentDraft: cfg.contentDraft as Prisma.InputJsonValue,
        }),
      },
      expectedUpdatedAt: expected,
      userId: auth.userId,
    });
    if (result.status === 'not_found') {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }
    if (result.status === 'stale') {
      return NextResponse.json(
        { error: 'SECTION_STALE', success: false, currentUpdatedAt: result.currentUpdatedAt },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, data: result.section, updatedAt: result.section.updatedAt });
  } catch (error) {
    console.error('Failed to restore section version:', error);
    return NextResponse.json({ success: false, error: 'Failed to restore version' }, { status: 500 });
  }
}
