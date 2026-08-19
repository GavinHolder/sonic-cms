-- Coverage towers: optional region grouping (regionId FK) + many-to-many ProductTypes
-- ("services available at this tower"). Purely additive — no existing column touched,
-- no backfill (existing towers keep regionId=NULL / zero productTypes, which the public
-- matching logic in app/api/coverage-maps/public/[slug]/check/route.ts treats as
-- "unrestricted", preserving today's behavior for every tower until an admin opts in).
-- Idempotent (IF NOT EXISTS / guarded) to match this project's additive-migration style.

-- ── coverage_towers.regionId ──────────────────────────────────────────────────
ALTER TABLE "coverage_towers" ADD COLUMN IF NOT EXISTS "regionId" TEXT;

CREATE INDEX IF NOT EXISTS "coverage_towers_regionId_idx" ON "coverage_towers"("regionId");

DO $$ BEGIN
  ALTER TABLE "coverage_towers"
    ADD CONSTRAINT "coverage_towers_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "coverage_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CoverageTower <-> ProductType (implicit Prisma m2m join table) ───────────
CREATE TABLE IF NOT EXISTS "_CoverageTowerToProductType" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_CoverageTowerToProductType_AB_unique" ON "_CoverageTowerToProductType"("A", "B");
CREATE INDEX IF NOT EXISTS "_CoverageTowerToProductType_B_index" ON "_CoverageTowerToProductType"("B");

DO $$ BEGIN
  ALTER TABLE "_CoverageTowerToProductType"
    ADD CONSTRAINT "_CoverageTowerToProductType_A_fkey"
    FOREIGN KEY ("A") REFERENCES "coverage_towers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_CoverageTowerToProductType"
    ADD CONSTRAINT "_CoverageTowerToProductType_B_fkey"
    FOREIGN KEY ("B") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
