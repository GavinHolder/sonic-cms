/**
 * Real-DB proof that Prisma updateMany bumps @updatedAt (so the guarded write really invalidates a
 * stale base) and that updateSectionKeepStamp really preserves it.
 * Runs ONLY against a localhost DATABASE_URL and creates + deletes its own rows. Skips (with a clear
 * message) when no local DB is reachable. Never targets a non-localhost database.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { saveSectionGuarded, updateSectionKeepStamp } from '@/lib/section-write-guard';

function localUrl(): string | null {
  let url = process.env.DATABASE_URL ?? '';
  if (!url && existsSync('.env')) {
    const m = readFileSync('.env', 'utf8').match(/^DATABASE_URL="?([^"\r\n]+)"?/m);
    url = m?.[1] ?? '';
  }
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' ? url : null;
  } catch { return null; }
}

const url = localUrl();
let prisma: PrismaClient | null = null;
let ready = false;
const tag = `sg-test-${Date.now()}`;

beforeAll(async () => {
  if (!url) { console.warn('[section-guard-realdb] SKIPPED: no localhost DATABASE_URL'); return; }
  try {
    prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.$queryRaw`SELECT 1`;
    await prisma.user.create({ data: { id: tag, email: `${tag}@t.test`, username: tag, passwordHash: 'x', role: 'EDITOR' } as any });
    await prisma.page.create({ data: { id: tag, slug: `/${tag}`, title: tag, createdBy: tag } as any });
    await prisma.section.create({ data: { id: tag, pageId: tag, type: 'FLEXIBLE', createdBy: tag, content: { a: 1 } } as any });
    ready = true;
  } catch (e) {
    console.warn('[section-guard-realdb] SKIPPED: local DB unavailable or schema mismatch:', (e as Error).message.split('\n').pop());
  }
});
afterAll(async () => {
  if (!prisma) return;
  try {
    await prisma.page.deleteMany({ where: { id: tag } });
    await prisma.user.deleteMany({ where: { id: tag } });
  } catch {}
  await prisma.$disconnect();
});

describe('guarded write against a real database', () => {
  it('second write with the same base is stale; keep-stamp does not bump', async (ctx) => {
    if (!ready || !prisma) return ctx.skip();
    const t0 = (await prisma.section.findUniqueOrThrow({ where: { id: tag } })).updatedAt;
    const r1 = await saveSectionGuarded(prisma as any, { id: tag, data: { content: { a: 2 } }, expectedUpdatedAt: t0, userId: tag });
    expect(r1.status).toBe('ok');
    const r2 = await saveSectionGuarded(prisma as any, { id: tag, data: { content: { a: 3 } }, expectedUpdatedAt: t0, userId: tag });
    expect(r2.status).toBe('stale');
    const t1 = (await prisma.section.findUniqueOrThrow({ where: { id: tag } })).updatedAt;
    expect(t1.getTime()).toBeGreaterThan(t0.getTime());
    await updateSectionKeepStamp(prisma as any, tag, { order: 7 });
    const after = await prisma.section.findUniqueOrThrow({ where: { id: tag } });
    expect(after.order).toBe(7);
    expect(after.updatedAt.getTime()).toBe(t1.getTime());
    expect(await prisma.sectionVersion.count({ where: { sectionId: tag } })).toBe(1);
  });
  it('schema declares @updatedAt on Section.updatedAt', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const block = schema.slice(schema.indexOf('model Section {'));
    expect(block.slice(0, block.indexOf('\n}'))).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
  });
});
