import type { Prisma } from "@prisma/client";

/**
 * Enforces "at most one Popular package per rendering scope".
 *
 * Scope = networkId + productTypeId + term. This mirrors exactly how the
 * pricing-card grid groups packages for display (see CardTabsBlock.tsx):
 * Level 1 tabs group by product type, Level 2 sub-tabs by network, Level 3
 * term-tabs by term (ProductGridBlock/CardTabsBlock's groupByNetwork /
 * groupByTerm). Whatever combination of those tabs is selected is exactly
 * the set of packages rendered together in one card grid — and the pricing
 * card templates are built to highlight exactly one "Popular" card, centered.
 * Two popular packages in the same scope would both claim that slot, so at
 * most one per scope may carry the flag. Different terms (or product types,
 * or networks) render as separate grids, so they're separate scopes and may
 * each have their own popular package (this is why the Term Variants
 * quick-add, which creates sibling packages that differ only by term, does
 * not trip this constraint against each other).
 *
 * Must run in the same transaction as the write that sets `popular: true`,
 * so two admins editing concurrently in different browser tabs can't both
 * leave a package popular in the same scope.
 *
 * Returns the names of any sibling packages that were unmarked, so the
 * caller can surface that to the admin (never clear silently).
 */
export async function clearOtherPopularInScope(
  tx: Prisma.TransactionClient,
  scope: { networkId: string; productTypeId: string | null; term: string | null; excludePackageId?: string }
): Promise<string[]> {
  const siblings = await tx.package.findMany({
    where: {
      networkId: scope.networkId,
      productTypeId: scope.productTypeId,
      term: scope.term,
      popular: true,
      ...(scope.excludePackageId ? { id: { not: scope.excludePackageId } } : {}),
    },
    select: { id: true, name: true },
  });
  if (siblings.length === 0) return [];
  await tx.package.updateMany({
    where: { id: { in: siblings.map((s) => s.id) } },
    data: { popular: false },
  });
  return siblings.map((s) => s.name);
}
