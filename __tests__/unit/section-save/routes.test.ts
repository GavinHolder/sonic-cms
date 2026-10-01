import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '@/lib/auth';
import { makeFakeDb } from './fakeDb';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const h = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/prisma', () => ({
  default: new Proxy({}, { get: (_t, k) => (h.db as any)[k] }),
}));

import { PUT } from '@/app/api/sections/[id]/route';
import { GET as LIST } from '@/app/api/sections/[id]/versions/route';
import { POST as RESTORE } from '@/app/api/sections/[id]/versions/[versionId]/restore/route';

function req(method: string, url: string, role?: UserRole, body?: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (role) {
    const t = generateAccessToken({ userId: 'u1', email: 'a@b.c', username: 'u', role });
    headers.cookie = `access_token=${t}`;
  }
  return new NextRequest(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const p = (o: Record<string, string>) => ({ params: Promise.resolve(o) });
const dd = (n: number) => JSON.stringify({ variant: 'v', desktop: { blocks: [1] }, tablet: new Array(n).fill(1), mobile: null });

let fake: ReturnType<typeof makeFakeDb>;
beforeEach(() => {
  fake = makeFakeDb({ id: 's1', content: { designerData: dd(2) }, updatedAt: T0 });
  h.db = fake.db;
});

describe('PUT /api/sections/[id]', () => {
  const url = 'http://localhost/api/sections/s1';
  it('rejects unauthenticated (401) and VIEWER (403) with no write', async () => {
    expect((await PUT(req('PUT', url, undefined, { content: {} }), p({ id: 's1' }))).status).toBe(401);
    expect((await PUT(req('PUT', url, UserRole.VIEWER, { content: {} }), p({ id: 's1' }))).status).toBe(403);
    expect(fake.versions).toHaveLength(0);
  });
  it('stale -> 409 SECTION_STALE, no write', async () => {
    const r = await PUT(req('PUT', url, UserRole.EDITOR, { content: { z: 1 }, expectedUpdatedAt: '2025-01-01T00:00:00.000Z' }), p({ id: 's1' }));
    expect(r.status).toBe(409);
    const j = await r.json();
    expect(j.error).toBe('SECTION_STALE');
    expect(j.currentUpdatedAt).toBe(T0.toISOString());
    expect(fake.row.content).toEqual({ designerData: dd(2) });
  });
  it('matching -> 200, returns new updatedAt, snapshot written', async () => {
    const r = await PUT(req('PUT', url, UserRole.EDITOR, { content: { z: 1 }, expectedUpdatedAt: T0.toISOString() }), p({ id: 's1' }));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(new Date(j.updatedAt).getTime()).toBeGreaterThan(T0.getTime());
    expect(fake.versions).toHaveLength(1);
  });
  it('missing expectedUpdatedAt accepted; garbage -> 400', async () => {
    expect((await PUT(req('PUT', url, UserRole.EDITOR, { content: { z: 2 } }), p({ id: 's1' }))).status).toBe(200);
    expect((await PUT(req('PUT', url, UserRole.EDITOR, { content: {}, expectedUpdatedAt: 'nope' }), p({ id: 's1' }))).status).toBe(400);
  });
  it('two requests with the same base: one 200, one 409', async () => {
    const mkReq = (w: string) => PUT(req('PUT', url, UserRole.EDITOR, { content: { w }, expectedUpdatedAt: T0.toISOString() }), p({ id: 's1' }));
    const rs = await Promise.all([mkReq('A'), mkReq('B')]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
  });
});

describe('versions list + restore', () => {
  it('list is auth-guarded and returns counts, not blobs', async () => {
    expect((await LIST(req('GET', 'http://x/api/sections/s1/versions'), p({ id: 's1' }))).status).toBe(401);
    expect((await LIST(req('GET', 'http://x/a', UserRole.VIEWER), p({ id: 's1' }))).status).toBe(403);
    await PUT(req('PUT', 'http://x/api/sections/s1', UserRole.EDITOR, { content: { designerData: dd(0) } }), p({ id: 's1' }));
    const r = await LIST(req('GET', 'http://x/a', UserRole.EDITOR), p({ id: 's1' }));
    const j = await r.json();
    expect(j.data).toHaveLength(1);
    expect(j.data[0].counts).toEqual({ desktop: 1, tablet: 2, mobile: 0 });
    expect(JSON.stringify(j)).not.toContain('designerData');
  });
  it('rejects invalid ids with 400', async () => {
    expect((await LIST(req('GET', 'http://x/a', UserRole.EDITOR), p({ id: '../etc' }))).status).toBe(400);
  });
  it('restore snapshots current, restores old content, honors stale check, rejects VIEWER', async () => {
    await PUT(req('PUT', 'http://x/a', UserRole.EDITOR, { content: { designerData: dd(0) } }), p({ id: 's1' }));
    const vid = fake.versions[0].id;
    const rp = (v: string) => p({ id: 's1', versionId: v });
    expect((await RESTORE(req('POST', 'http://x/r', UserRole.VIEWER, {}), rp(vid))).status).toBe(403);
    const stale = await RESTORE(req('POST', 'http://x/r', UserRole.EDITOR, { expectedUpdatedAt: T0.toISOString() }), rp(vid));
    expect(stale.status).toBe(409);
    const ok = await RESTORE(req('POST', 'http://x/r', UserRole.EDITOR, { expectedUpdatedAt: fake.row.updatedAt.toISOString() }), rp(vid));
    expect(ok.status).toBe(200);
    expect(fake.row.content).toEqual({ designerData: dd(2) });
    expect(fake.versions).toHaveLength(2);
    expect((await RESTORE(req('POST', 'http://x/r', UserRole.EDITOR, {}), rp('missing'))).status).toBe(404);
  });
});
