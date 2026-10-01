/**
 * Guarded section writes: optimistic concurrency + version snapshot + pruning.
 *
 * INVARIANTS:
 * 1. A write that supplies `expectedUpdatedAt` NEVER lands if the row's updatedAt differs (no lost update).
 * 2. Every successful content/contentDraft write is preceded (same transaction) by a snapshot of the
 *    PREVIOUS content in section_versions, so any overwrite is recoverable.
 * 3. At most SECTION_VERSION_LIMIT snapshots are kept per section.
 */
import type { Prisma } from '@prisma/client';

export const SECTION_VERSION_LIMIT = 30;

// Minimal structural type so tests can supply an in-memory fake.
type Tx = {
  section: {
    findUnique: (a: any) => Promise<any>;
    updateMany: (a: any) => Promise<{ count: number }>;
  };
  sectionVersion: {
    aggregate: (a: any) => Promise<any>;
    create: (a: any) => Promise<any>;
    deleteMany: (a: any) => Promise<any>;
  };
};
type Db = { $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T> };

export type GuardedSaveResult =
  | { status: 'ok'; section: any }
  | { status: 'not_found' }
  | { status: 'stale'; currentUpdatedAt: string | null };

export function parseExpectedUpdatedAt(v: unknown): Date | null | 'invalid' {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') return 'invalid';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 'invalid' : d;
}

/**
 * ASSUMPTIONS:
 * 1. Section.updatedAt is Prisma @updatedAt (ms precision, changes on every write via updateMany too).
 * 2. Postgres READ COMMITTED: a concurrent conditional UPDATE blocks on the row lock, then re-evaluates
 *    its WHERE against the committed row, so exactly one of two same-base writers matches.
 * 3. `data` is already whitelisted by the caller.
 *
 * FAILURE MODES:
 * - Stale expectedUpdatedAt -> {status:'stale'}, nothing written, nothing snapshotted.
 * - Missing expectedUpdatedAt -> guarded against the row read in this tx and retried (<=3) on a race,
 *   so the snapshot always matches the content actually overwritten.
 * - Snapshot/prune failure -> whole transaction rolls back (write is not applied without its snapshot).
 */
export async function saveSectionGuarded(
  db: Db,
  args: { id: string; data: Record<string, unknown>; expectedUpdatedAt: Date | null; userId: string }
): Promise<GuardedSaveResult> {
  const { id, data, expectedUpdatedAt, userId } = args;
  const isContentWrite = 'content' in data || 'contentDraft' in data;

  return db.$transaction(async (tx: Tx) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const prev = await tx.section.findUnique({ where: { id } });
      if (!prev) return { status: 'not_found' } as const;
      const prevAt: Date = prev.updatedAt;
      if (expectedUpdatedAt && prevAt.getTime() !== expectedUpdatedAt.getTime()) {
        return { status: 'stale', currentUpdatedAt: prevAt.toISOString() } as const;
      }

      const res = await tx.section.updateMany({ where: { id, updatedAt: prevAt }, data });
      if (res.count !== 1) {
        if (expectedUpdatedAt) {
          const cur = await tx.section.findUnique({ where: { id } });
          if (!cur) return { status: 'not_found' } as const;
          return { status: 'stale', currentUpdatedAt: cur.updatedAt.toISOString() } as const;
        }
        continue; // no client base: someone else won the race; re-read and retry
      }

      if (isContentWrite) {
        const agg = await tx.sectionVersion.aggregate({ where: { sectionId: id }, _max: { version: true } });
        const next = (agg?._max?.version ?? 0) + 1;
        await tx.sectionVersion.create({
          data: {
            sectionId: id,
            version: next,
            createdBy: userId,
            config: { content: prev.content ?? {}, contentDraft: prev.contentDraft ?? null } as Prisma.InputJsonValue,
          },
        });
        await tx.sectionVersion.deleteMany({
          where: { sectionId: id, version: { lte: next - SECTION_VERSION_LIMIT } },
        });
      }
      const section = await tx.section.findUnique({ where: { id } });
      return { status: 'ok', section } as const;
    }
    return { status: 'stale', currentUpdatedAt: null } as const;
  });
}
