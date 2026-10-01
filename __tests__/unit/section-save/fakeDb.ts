// In-memory prisma fake. $transaction calls are serialized to mimic a Postgres row lock.
export function makeFakeDb(initial: { id: string; content: any; updatedAt: Date }) {
  const row: any = { ...initial, contentDraft: null, type: 'FLEXIBLE' };
  const versions: any[] = [];
  let chain: Promise<unknown> = Promise.resolve();
  let clock = initial.updatedAt.getTime();
  const tx = {
    section: {
      findUnique: async ({ where }: any) => (where.id === row.id ? { ...row } : null),
      updateMany: async ({ where, data }: any) => {
        if (where.id !== row.id || where.updatedAt.getTime() !== row.updatedAt.getTime()) return { count: 0 };
        Object.assign(row, data);
        if (!('updatedAt' in data)) {
          clock += 1000;
          row.updatedAt = new Date(clock);
        }
        return { count: 1 };
      },
    },
    sectionVersion: {
      aggregate: async ({ where }: any) => {
        const vs = versions.filter((v) => v.sectionId === where.sectionId).map((v) => v.version);
        return { _max: { version: vs.length ? Math.max(...vs) : null } };
      },
      create: async ({ data }: any) => {
        versions.push({ id: `v${versions.length}`, createdAt: new Date(), ...data });
      },
      deleteMany: async ({ where }: any) => {
        for (let i = versions.length - 1; i >= 0; i--) {
          if (versions[i].sectionId === where.sectionId && versions[i].version <= where.version.lte) versions.splice(i, 1);
        }
      },
    },
  };
  const db = {
    $transaction: (fn: any) => {
      const run = chain.then(() => fn(tx));
      chain = run.catch(() => undefined);
      return run;
    },
    $queryRaw: async () =>
      [...versions].sort((a, b) => b.version - a.version).map((v) => ({
        id: v.id, version: v.version, createdAt: v.createdAt, createdBy: v.createdBy, summary: v.config.summary,
      })),
    section: tx.section,
    sectionVersion: {
      ...tx.sectionVersion,
      findMany: async () => [...versions].sort((a, b) => b.version - a.version),
      findFirst: async ({ where }: any) =>
        versions.find((v) => v.id === where.id && v.sectionId === where.sectionId) ?? null,
    },
  };
  return { db, row, versions };
}
