import prisma from "@/lib/prisma";
import type { Prisma, ScheduledPackageChange } from "@prisma/client";
import { clearOtherPopularInScope } from "./popular";

/**
 * Shape of ScheduledPackageChange.createData for CREATE/REPLACE — the same fields
 * POST /api/networks/[id]/packages accepts, since applying a scheduled create should
 * behave identically to an admin filling in the Add Package form on the day.
 */
export interface ScheduledPackageCreateData {
  networkId: string;
  name: string;
  price: string | number;
  speedDown?: string | null;
  speedUp?: string | null;
  period?: string | null;
  features?: unknown[];
  maxDistanceM?: number | null;
  kind?: "DATA" | "VAS";
  term?: string | null;
  categoryId?: string | null;
  productTypeId?: string | null;
  popular?: boolean;
  isActive?: boolean;
  order?: number;
}

async function createPackageFromData(tx: Prisma.TransactionClient, data: ScheduledPackageCreateData) {
  if (!data.networkId || !data.name || data.price == null) {
    throw new Error("createData is missing networkId, name, or price");
  }
  const pkgData = {
    networkId: data.networkId,
    name: data.name,
    price: String(data.price),
    speedDown: data.speedDown || null,
    speedUp: data.speedUp || null,
    period: data.period ?? "/month",
    features: (Array.isArray(data.features) ? data.features : []) as Prisma.InputJsonValue,
    maxDistanceM: typeof data.maxDistanceM === "number" ? data.maxDistanceM : null,
    kind: data.kind === "VAS" ? "VAS" : "DATA",
    term: data.term || null,
    categoryId: data.categoryId || null,
    productTypeId: data.productTypeId || null,
    popular: data.popular ?? false,
    isActive: data.isActive ?? true,
    order: data.order ?? 0,
  };
  // Same invariant every other package-creation path enforces (see popular.ts's own
  // doc comment) — a scheduled create landing popular:true in an already-popular
  // scope would otherwise silently produce two "Popular" cards in one grid.
  if (pkgData.popular) {
    await clearOtherPopularInScope(tx, {
      networkId: pkgData.networkId,
      productTypeId: pkgData.productTypeId,
      term: pkgData.term,
    });
  }
  await tx.package.create({ data: pkgData });
}

/**
 * Applies one due ScheduledPackageChange. Runs inside its own transaction so a
 * REPLACE's delete+create is atomic (never leaves the old package gone with no
 * replacement if the create half fails), and throws on any failure rather than
 * swallowing it — the caller (applyDueScheduledChanges) is what records the
 * failure onto the row, this function's only job is "apply, or throw why not".
 *
 * ASSUMPTIONS:
 * 1. A PRICE_UPDATE/DELETE/REPLACE's packageId may have gone stale (the target
 *    package was deleted by an admin between scheduling and now) — checked
 *    explicitly rather than trusting the FK, so the resulting error message is
 *    "target package was deleted", not a raw Prisma constraint error.
 * 2. createData (CREATE/REPLACE) is trusted admin input, not visitor input — no
 *    additional sanitization beyond what createPackageFromData already applies
 *    (same coercions the real Add Package API route uses).
 */
async function applyOneChange(change: ScheduledPackageChange): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (change.type === "PRICE_UPDATE") {
      if (!change.packageId || change.newPrice == null) throw new Error("Missing packageId or newPrice");
      const pkg = await tx.package.findUnique({ where: { id: change.packageId } });
      if (!pkg) throw new Error("Target package was deleted before this price change could apply");
      await tx.package.update({ where: { id: change.packageId }, data: { price: change.newPrice } });
    } else if (change.type === "DELETE") {
      if (!change.packageId) throw new Error("Missing packageId");
      const pkg = await tx.package.findUnique({ where: { id: change.packageId } });
      if (!pkg) throw new Error("Target package was already deleted");
      await tx.package.delete({ where: { id: change.packageId } });
    } else if (change.type === "CREATE") {
      if (!change.createData) throw new Error("Missing createData");
      await createPackageFromData(tx, change.createData as unknown as ScheduledPackageCreateData);
    } else if (change.type === "REPLACE") {
      if (!change.packageId || !change.createData) throw new Error("Missing packageId or createData");
      const pkg = await tx.package.findUnique({ where: { id: change.packageId } });
      if (!pkg) throw new Error("Target package to replace was already deleted");
      await tx.package.delete({ where: { id: change.packageId } });
      await createPackageFromData(tx, change.createData as unknown as ScheduledPackageCreateData);
    } else {
      throw new Error(`Unknown change type: ${change.type}`);
    }
    await tx.scheduledPackageChange.update({
      where: { id: change.id },
      data: { status: "APPLIED", appliedAt: new Date(), errorMessage: null },
    });
  });
}

/**
 * Finds every SCHEDULED change whose scheduledAt has passed and applies it.
 * Called from instrumentation.ts's existing 60s tick (see that file's own
 * comment on why this self-hosted-Docker deploy has no platform cron to trigger
 * a passive /api/cron route) — NOT wired to any HTTP route of its own, since
 * nothing here needs to be triggerable from outside the running server process.
 *
 * One failing change never blocks the rest: each is applied+recorded
 * independently, so five packages scheduled together where one was since
 * deleted still lands the other four.
 */
export async function applyDueScheduledChanges(): Promise<{ applied: number; failed: number }> {
  const due = await prisma.scheduledPackageChange.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
  });
  let applied = 0;
  let failed = 0;
  for (const change of due) {
    try {
      await applyOneChange(change);
      applied++;
    } catch (err) {
      await prisma.scheduledPackageChange.update({
        where: { id: change.id },
        data: {
          status: "FAILED",
          appliedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : "Unknown error applying scheduled change",
        },
      });
      failed++;
    }
  }
  return { applied, failed };
}
