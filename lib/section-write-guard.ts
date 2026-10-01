/**
 * Guarded section writes: optimistic concurrency + version snapshot + pruning.
 *
 * INVARIANTS:
 * 1. A write that supplies `expectedUpdatedAt` NEVER lands if the row's updatedAt differs (no lost update).
 * 2. Every successful content/contentDraft write is preceded (same transaction) by a snapshot of the
 *    PREVIOUS content in section_versions, so any overwrite is recoverable.
 * 3. At most SECTION_VERSION_LIMIT snapshots are kept per section.
 */
import { Prisma } from '@prisma/client';
import { summarizeDesignerData } from '@/lib/section-versions';

export const SECTION_VERSION_LIMIT = 30;
export const SECTION_TX_OPTIONS = { maxWait: 5000, timeout: 15000 } as const;

/** Flat visual columns captured in a snapshot and restored with it (identity/nav/order are NOT). */
export const SECTION_FLAT_FIELDS = [
  'paddingTop', 'paddingBottom', 'paddingTopMobile', 'paddingBottomMobile', 'background', 'banner',
  'triangleEnabled', 'triangleSide', 'triangleShape', 'triangleHeight', 'triangleTargetId',
  'triangleGradientType', 'triangleColor1', 'triangleColor2', 'triangleAlpha1', 'triangleAlpha2',
  'triangleAngle', 'triangleImageUrl', 'triangleImageSize', 'triangleImagePos', 'triangleImageOpacity',
  'hoverTextEnabled', 'hoverText', 'hoverTextStyle', 'hoverFontSize', 'hoverFontFamily',
  'hoverAnimationType', 'hoverAnimateBehind', 'hoverAlwaysShow', 'hoverOffsetX',
  'bgImageUrl', 'bgImageSize', 'bgImagePosition', 'bgImageRepeat', 'bgImageOpacity', 'bgParallax',
  'lowerThird', 'motionElements', 'voltElementId', 'voltSlotMap',
] as const;
/** Keys that never affect the stamp on their own (identity/placement), plus content/visual keys (which
 *  keep it only when deep-equal to the stored value). */
const IDENTITY_KEYS = ['order', 'enabled', 'showOnNavbar', 'navOrder', 'navLabel', 'displayName', 'type'];
const KEEP_STAMP_KEYS = new Set<string>([...IDENTITY_KEYS, 'content', 'contentDraft', ...SECTION_FLAT_FIELDS]);
const JSON_FLAT = new Set(['banner', 'lowerThird', 'motionElements', 'voltSlotMap']);

/** Build a prisma `data` fragment from a snapshot's flat map (null Json -> DbNull). */
export function flatToData(flat: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!flat || typeof flat !== 'object') return out;
  for (const k of SECTION_FLAT_FIELDS) {
    if (!(k in (flat as object))) continue;
    const v = (flat as Record<string, unknown>)[k];
    out[k] = v === null && JSON_FLAT.has(k) ? Prisma.DbNull : v;
  }
  return out;
}

/** Key-order-independent serialisation (jsonb does not preserve key order). */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',') + '}';
  }
  return JSON.stringify(v) ?? 'null';
}

/**
 * Update NON-content fields without moving updatedAt, so reorder / nav / spacing / footer-bump writes
 * never invalidate an open editor's expectedUpdatedAt. Atomic: conditional on the stamp we read, so a
 * concurrent content write (which does bump) can never be reverted to an older stamp.
 */
export async function updateSectionKeepStamp(
  db: { section: { findUnique: (a: any) => Promise<any>; updateMany: (a: any) => Promise<{ count: number }> } },
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const row = await db.section.findUnique({ where: { id }, select: { updatedAt: true } });
    if (!row) return false;
    const r = await db.section.updateMany({ where: { id, updatedAt: row.updatedAt }, data: { ...data, updatedAt: row.updatedAt } });
    if (r.count === 1) return true;
  }
  throw new Error('Section is being modified concurrently');
}

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
type Db = { $transaction: (fn: any, opts?: any) => Promise<any> };

export type GuardedSaveResult =
  | { status: 'ok'; section: any }
  | { status: 'not_found' }
  | { status: 'stale'; currentUpdatedAt: string | null };

/** True unless every content/contentDraft/flat field in `data` deep-equals the stored value. */
function contentActuallyChanged(prev: any, data: Record<string, unknown>): boolean {
  const keys = ['content', 'contentDraft', ...SECTION_FLAT_FIELDS].filter((k) => k in data);
  return keys.some((k) => {
    const incoming = (data[k] as unknown) === Prisma.DbNull ? null : data[k];
    return stableStringify(incoming ?? null) !== stableStringify(prev[k] ?? null);
  });
}

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
  const dataKeys = Object.keys(data);

  return db.$transaction(async (tx: Tx) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const prev = await tx.section.findUnique({ where: { id } });
      if (!prev) return { status: 'not_found' } as const;
      const prevAt: Date = prev.updatedAt;
      if (expectedUpdatedAt && prevAt.getTime() !== expectedUpdatedAt.getTime()) {
        return { status: 'stale', currentUpdatedAt: prevAt.toISOString() } as const;
      }

      // Keep the stamp (atomic via the WHERE) ONLY when nothing content/visual actually changes and
      // every key is a known identity/content/visual key: pure order/enabled/nav/name writes, or a
      // save that re-sends identical values. Any real content/visual change (or unknown key) bumps it.
      const changed = contentActuallyChanged(prev, data);
      const keepStamp = !changed && dataKeys.every((k) => KEEP_STAMP_KEYS.has(k));
      const res = await tx.section.updateMany({
        where: { id, updatedAt: prevAt },
        data: keepStamp ? { ...data, updatedAt: prevAt } : data,
      });
      if (res.count !== 1) {
        if (expectedUpdatedAt) {
          const cur = await tx.section.findUnique({ where: { id } });
          if (!cur) return { status: 'not_found' } as const;
          return { status: 'stale', currentUpdatedAt: cur.updatedAt.toISOString() } as const;
        }
        continue; // no client base: someone else won the race; re-read and retry
      }

      if (changed) {
        const agg = await tx.sectionVersion.aggregate({ where: { sectionId: id }, _max: { version: true } });
        const next = (agg?._max?.version ?? 0) + 1;
        const flat: Record<string, unknown> = {};
        for (const k of SECTION_FLAT_FIELDS) flat[k] = prev[k] ?? null;
        await tx.sectionVersion.create({
          data: {
            sectionId: id,
            version: next,
            createdBy: userId,
            config: {
              content: prev.content ?? {},
              contentDraft: prev.contentDraft ?? null,
              flat,
              summary: summarizeDesignerData(prev.content),
            } as unknown as Prisma.InputJsonValue,
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
  }, SECTION_TX_OPTIONS);
}
