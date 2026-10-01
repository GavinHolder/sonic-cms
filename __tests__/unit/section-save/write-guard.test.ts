import { describe, it, expect } from 'vitest';
import { saveSectionGuarded, SECTION_VERSION_LIMIT, parseExpectedUpdatedAt } from '@/lib/section-write-guard';
import { makeFakeDb } from './fakeDb';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const mk = () => makeFakeDb({ id: 's1', content: { designerData: 'v0' }, updatedAt: T0 });

describe('saveSectionGuarded', () => {
  it('stale expectedUpdatedAt -> stale, no write, no snapshot', async () => {
    const { db, row, versions } = mk();
    const r = await saveSectionGuarded(db, { id: 's1', data: { content: { x: 1 } }, expectedUpdatedAt: new Date('2025-12-31T00:00:00Z'), userId: 'u' });
    expect(r.status).toBe('stale');
    expect((r as any).currentUpdatedAt).toBe(T0.toISOString());
    expect(row.content).toEqual({ designerData: 'v0' });
    expect(versions).toHaveLength(0);
  });

  it('matching expectedUpdatedAt -> ok, new updatedAt, previous content snapshotted', async () => {
    const { db, row, versions } = mk();
    const r = await saveSectionGuarded(db, { id: 's1', data: { content: { x: 1 } }, expectedUpdatedAt: T0, userId: 'u' });
    expect(r.status).toBe('ok');
    expect(row.content).toEqual({ x: 1 });
    expect(row.updatedAt.getTime()).toBeGreaterThan(T0.getTime());
    expect(versions).toHaveLength(1);
    expect(versions[0].config.content).toEqual({ designerData: 'v0' });
    expect(versions[0].createdBy).toBe('u');
  });

  it('missing expectedUpdatedAt is accepted', async () => {
    const { db, row } = mk();
    const r = await saveSectionGuarded(db, { id: 's1', data: { content: { y: 2 } }, expectedUpdatedAt: null, userId: 'u' });
    expect(r.status).toBe('ok');
    expect(row.content).toEqual({ y: 2 });
  });

  it('non-content write (order) does not snapshot', async () => {
    const { db, versions } = mk();
    await saveSectionGuarded(db, { id: 's1', data: { order: 3 }, expectedUpdatedAt: T0, userId: 'u' });
    expect(versions).toHaveLength(0);
  });

  it('prunes to the last 30 versions', async () => {
    const { db, versions } = mk();
    for (let i = 0; i < 35; i++) {
      await saveSectionGuarded(db, { id: 's1', data: { content: { i } }, expectedUpdatedAt: null, userId: 'u' });
    }
    expect(versions).toHaveLength(SECTION_VERSION_LIMIT);
    expect(Math.min(...versions.map((v) => v.version))).toBe(6);
  });

  it('two concurrent writers with the same base: exactly one wins', async () => {
    const { db, row, versions } = mk();
    const [a, b] = await Promise.all([
      saveSectionGuarded(db, { id: 's1', data: { content: { w: 'A' } }, expectedUpdatedAt: T0, userId: 'a' }),
      saveSectionGuarded(db, { id: 's1', data: { content: { w: 'B' } }, expectedUpdatedAt: T0, userId: 'b' }),
    ]);
    expect([a.status, b.status].sort()).toEqual(['ok', 'stale']);
    expect(versions).toHaveLength(1);
    expect(['A', 'B']).toContain(row.content.w);
  });

  it('unknown section -> not_found', async () => {
    const { db } = mk();
    const r = await saveSectionGuarded(db, { id: 'nope', data: { content: {} }, expectedUpdatedAt: null, userId: 'u' });
    expect(r.status).toBe('not_found');
  });

  it('parseExpectedUpdatedAt', () => {
    expect(parseExpectedUpdatedAt(undefined)).toBeNull();
    expect(parseExpectedUpdatedAt('garbage')).toBe('invalid');
    expect(parseExpectedUpdatedAt(5)).toBe('invalid');
    expect((parseExpectedUpdatedAt(T0.toISOString()) as Date).getTime()).toBe(T0.getTime());
  });
});

import { updateSectionKeepStamp, stableStringify, flatToData } from '@/lib/section-write-guard';
import { Prisma } from '@prisma/client';

describe('safeguard review fixes', () => {
  it('non-content PUT-style write keeps updatedAt and takes no snapshot', async () => {
    const { db, row, versions } = mk();
    await saveSectionGuarded(db, { id: 's1', data: { order: 4 }, expectedUpdatedAt: T0, userId: 'u' });
    expect(row.updatedAt.getTime()).toBe(T0.getTime());
    expect(versions).toHaveLength(0);
  });
  it('updateSectionKeepStamp preserves updatedAt', async () => {
    const { db, row } = mk();
    expect(await updateSectionKeepStamp(db as any, 's1', { order: 9 })).toBe(true);
    expect(row.order).toBe(9);
    expect(row.updatedAt.getTime()).toBe(T0.getTime());
  });
  it('unchanged content is not re-snapshotted but still writes', async () => {
    const { db, versions } = mk();
    const r = await saveSectionGuarded(db, { id: 's1', data: { content: { designerData: 'v0' } }, expectedUpdatedAt: null, userId: 'u' });
    expect(r.status).toBe('ok');
    expect(versions).toHaveLength(0);
  });
  it('snapshot stores summary and flat columns', async () => {
    const { db, row, versions } = mk();
    row.paddingTop = 33;
    row.content = { designerData: JSON.stringify({ desktop: [1, 2], tablet: [1], mobile: null }) };
    await saveSectionGuarded(db, { id: 's1', data: { content: { n: 1 } }, expectedUpdatedAt: null, userId: 'u' });
    expect(versions[0].config.summary).toEqual({ desktop: 2, tablet: 1, mobile: 0 });
    expect(versions[0].config.flat.paddingTop).toBe(33);
  });
  it('stableStringify ignores key order; flatToData maps null Json to DbNull', () => {
    expect(stableStringify({ a: 1, b: { c: 2, d: 3 } })).toBe(stableStringify({ b: { d: 3, c: 2 }, a: 1 }));
    expect(flatToData({ lowerThird: null, paddingTop: 5, bogus: 1 })).toEqual({ lowerThird: Prisma.DbNull, paddingTop: 5 });
  });
});
