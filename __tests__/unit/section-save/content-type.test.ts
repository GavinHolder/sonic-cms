import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '@/lib/auth';
import { makeFakeDb } from './fakeDb';
import { validateSectionContentFields } from '@/lib/section-content-validation';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const h = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/prisma', () => ({
  default: new Proxy({}, { get: (_t, k) => (h.db as any)[k] }),
}));
import { PUT } from '@/app/api/sections/[id]/route';

function put(body: unknown) {
  const t = generateAccessToken({ userId: 'u1', email: 'a@b.c', username: 'u', role: UserRole.EDITOR });
  return new NextRequest('http://localhost/api/sections/s1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: `access_token=${t}` },
    body: JSON.stringify(body),
  });
}
const p = { params: Promise.resolve({ id: 's1' }) };

let fake: ReturnType<typeof makeFakeDb>;
beforeEach(() => {
  fake = makeFakeDb({ id: 's1', content: { a: 1 }, updatedAt: T0 });
  h.db = fake.db;
});

describe('validateSectionContentFields', () => {
  it('accepts objects, absent, and null draft', () => {
    expect(validateSectionContentFields({})).toBeNull();
    expect(validateSectionContentFields({ content: {}, contentDraft: null })).toBeNull();
    expect(validateSectionContentFields({ content: { designerData: '{"x":1}' } })).toBeNull();
  });
  it('rejects string/array/number/null content and bad drafts', () => {
    for (const c of ['{"a":1}', [], 5, null, true]) expect(validateSectionContentFields({ content: c })).toMatch(/JSON object/);
    expect(validateSectionContentFields({ contentDraft: '{}' })).toMatch(/^contentDraft must/);
    expect(validateSectionContentFields({ contentDraft: [] })).not.toBeNull();
  });
});

describe('PUT /api/sections/[id] content type', () => {
  it.each([['string', '{"a":2}'], ['array', [1]], ['number', 7]])('400 for %s content, no write/snapshot', async (_n, c) => {
    const r = await PUT(put({ content: c, expectedUpdatedAt: T0.toISOString() }), p);
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error).toBe('INVALID_CONTENT_TYPE');
    expect(j.message).toMatch(/JSON object/);
    expect(fake.versions).toHaveLength(0);
    expect(fake.row.content).toEqual({ a: 1 });
    expect(fake.row.updatedAt).toEqual(T0);
  });
  it('400 for string contentDraft', async () => {
    const r = await PUT(put({ contentDraft: '{}' }), p);
    expect(r.status).toBe(400);
    expect(fake.versions).toHaveLength(0);
  });
  it('accepts object content, null draft, and designerData string inside content', async () => {
    const r = await PUT(put({ content: { designerData: '{"v":1}' }, contentDraft: null, expectedUpdatedAt: T0.toISOString() }), p);
    expect(r.status).toBe(200);
    expect(fake.row.content).toEqual({ designerData: '{"v":1}' });
  });
});
