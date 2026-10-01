import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '@/lib/auth';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const h = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/prisma', () => ({ default: new Proxy({}, { get: (_t, k) => (h.db as any)[k] }) }));
import { POST } from '@/app/api/pages/[slug]/publish/route';

function makeDb(sections: any[], status = 'DRAFT') {
  const page: any = { id: 'p1', slug: 'home', title: 'Home', status, publishedAt: null, publishedBy: null };
  const rows = sections.map((s) => ({ pageId: 'p1', type: 'FLEXIBLE', enabled: true, contentDraft: null, updatedAt: T0, ...s }));
  const sectionWrites = vi.fn();
  const db = {
    page: {
      findUnique: async ({ where }: any) =>
        where.slug === page.slug ? { ...page, createdByUser: { username: 'u' }, sections: rows.map((r) => ({ id: r.id, type: r.type, enabled: r.enabled })) } : null,
      updateMany: async ({ where, data }: any) => {
        if (where.slug !== page.slug || page.status === where.status.not) return { count: 0 };
        Object.assign(page, data);
        return { count: 1 };
      },
    },
    section: { update: sectionWrites, updateMany: sectionWrites, findMany: sectionWrites },
    sectionVersion: { create: sectionWrites },
    $transaction: sectionWrites,
    $executeRaw: sectionWrites,
  };
  return { db, page, rows, sectionWrites };
}

function req(role?: UserRole) {
  const headers: Record<string, string> = {};
  if (role) headers.cookie = `access_token=${generateAccessToken({ userId: 'u1', email: 'a@b.c', username: 'u', role })}`;
  return new NextRequest('http://localhost/api/pages/home/publish', { method: 'POST', headers });
}
const p = (slug: string) => ({ params: Promise.resolve({ slug }) });
let f: ReturnType<typeof makeDb>;

describe('POST /api/pages/[slug]/publish', () => {
  beforeEach(() => {
    f = makeDb([
      { id: 'a', content: { old: 1 }, contentDraft: { new: 1 } },
      { id: 'b', content: { keep: 1 }, contentDraft: null },
      { id: 'c', content: { same: 1 }, contentDraft: { same: 1 } },
      { id: 'd', content: { live: 1 }, contentDraft: 'garbage' },
    ]);
    h.db = f.db;
  });

  it('401 unauthenticated, 403 EDITOR', async () => {
    expect((await POST(req(), p('home'))).status).toBe(401);
    expect((await POST(req(UserRole.EDITOR), p('home'))).status).toBe(403);
    expect(f.page.status).toBe('DRAFT');
  });
  it('400 invalid slug, 404 not found, 400 already published', async () => {
    expect((await POST(req(UserRole.PUBLISHER), p('bad slug!'))).status).toBe(400);
    expect((await POST(req(UserRole.PUBLISHER), p('nope'))).status).toBe(404);
    f.page.status = 'PUBLISHED';
    const r = await POST(req(UserRole.PUBLISHER), p('home'));
    expect(r.status).toBe(400);
    expect(JSON.stringify(await r.json())).toContain('ALREADY_PUBLISHED');
  });
  it('flips status and never touches sections (content, contentDraft, updatedAt, versions)', async () => {
    const before = JSON.stringify(f.rows);
    const r = await POST(req(UserRole.PUBLISHER), p('home'));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.data.page.status).toBe('PUBLISHED');
    expect(j.data.page.sectionCount).toBe(4);
    expect(f.page.publishedBy).toBe('u1');
    expect(f.page.publishedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(f.rows)).toBe(before);
    expect(f.sectionWrites).not.toHaveBeenCalled();
  });
  it('regression: a stale contentDraft does not overwrite live content', async () => {
    await POST(req(UserRole.PUBLISHER), p('home'));
    expect(f.rows[0].content).toEqual({ old: 1 });
    expect(f.rows[0].contentDraft).toEqual({ new: 1 });
  });
  it('concurrent double-publish: exactly one wins', async () => {
    const rs = await Promise.all([POST(req(UserRole.PUBLISHER), p('home')), POST(req(UserRole.PUBLISHER), p('home'))]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 400]);
  });
});
