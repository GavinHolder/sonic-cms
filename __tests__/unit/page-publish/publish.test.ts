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
  const versions: any[] = [];
  let clock = T0.getTime();
  let failVersionCreate = false;
  const tx = {
    page: {
      findUnique: async ({ where }: any) => (where.slug === page.slug ? { ...page } : null),
      update: async ({ data }: any) => {
        Object.assign(page, data);
        return { ...page, createdByUser: { username: 'u' }, sections: rows.map((r) => ({ id: r.id, type: r.type, enabled: r.enabled })) };
      },
    },
    section: {
      findMany: async ({ where }: any) => rows.filter((r) => r.pageId === where.pageId).map((r) => ({ id: r.id, contentDraft: r.contentDraft })),
      findUnique: async ({ where }: any) => { const r = rows.find((x) => x.id === where.id); return r ? { ...r } : null; },
      updateMany: async ({ where, data }: any) => {
        const r = rows.find((x) => x.id === where.id);
        if (!r || r.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
        Object.assign(r, data);
        if (!('updatedAt' in data)) { clock += 1000; r.updatedAt = new Date(clock); }
        return { count: 1 };
      },
    },
    sectionVersion: {
      aggregate: async ({ where }: any) => ({ _max: { version: Math.max(0, ...versions.filter((v) => v.sectionId === where.sectionId).map((v) => v.version)) || null } }),
      create: async ({ data }: any) => { if (failVersionCreate) throw new Error('boom'); versions.push(data); },
      deleteMany: async () => ({}),
    },
  };
  const db = {
    ...tx,
    $transaction: async (fn: any) => {
      const snap = JSON.stringify({ page, rows }); const vlen = versions.length;
      try { return await fn(tx); } catch (e) {
        const s = JSON.parse(snap);
        Object.assign(page, s.page); rows.forEach((r, i) => { Object.assign(r, s.rows[i], { updatedAt: new Date(s.rows[i].updatedAt) }); });
        versions.length = vlen; throw e;
      }
    },
  };
  return { db, page, rows, versions, failNext: () => { failVersionCreate = true; } };
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
  it('copies draft to content with snapshot + bumped updatedAt; leaves others alone', async () => {
    const r = await POST(req(UserRole.PUBLISHER), p('home'));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(JSON.stringify(j)).toContain('"sectionsPublished":2');
    const [a, b, c, d] = f.rows;
    expect(a.content).toEqual({ new: 1 });
    expect(a.contentDraft).toEqual({ new: 1 });
    expect(a.updatedAt.getTime()).toBeGreaterThan(T0.getTime());
    expect(f.versions.filter((v) => v.sectionId === 'a')).toHaveLength(1);
    expect(f.versions[0].config.content).toEqual({ old: 1 });
    expect(b.content).toEqual({ keep: 1 });
    expect(b.updatedAt).toEqual(T0);
    expect(c.updatedAt).toEqual(T0); // unchanged -> stamp kept, no snapshot
    expect(f.versions.filter((v) => v.sectionId === 'c')).toHaveLength(0);
    expect(d.content).toEqual({ live: 1 }); // non-object draft skipped
    expect(JSON.stringify(j)).toContain('"skippedSectionIds":["d"]');
    expect(f.page.status).toBe('PUBLISHED');
  });
  it('rolls back everything (page stays DRAFT) when a snapshot write fails', async () => {
    f.failNext();
    const r = await POST(req(UserRole.PUBLISHER), p('home'));
    expect(r.status).toBeGreaterThanOrEqual(500);
    expect(f.page.status).toBe('DRAFT');
    expect(f.rows[0].content).toEqual({ old: 1 });
  });
  it('is idempotent: re-running after revert to DRAFT creates no extra snapshots', async () => {
    await POST(req(UserRole.PUBLISHER), p('home'));
    const n = f.versions.length;
    f.page.status = 'DRAFT';
    await POST(req(UserRole.PUBLISHER), p('home'));
    expect(f.versions.length).toBe(n);
  });
});
