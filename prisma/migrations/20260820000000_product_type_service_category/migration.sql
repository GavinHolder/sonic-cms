-- ProductType <-> ServiceCategory: optional link so the admin can group product types
-- (e.g. "AirFibre"/"Standard Wi-Fi"/"Kuluntu Connect") under a top-level service
-- category (e.g. "Wireless"). Purely additive — no existing column touched, no
-- backfill (existing product types keep serviceCategoryId=NULL / unassigned, which the
-- public grouping logic in /api/packages + CardTabsBlock/ProductGridBlock treats as
-- "use the product type itself as its own top-level group", preserving today's
-- behavior for every product type until an admin opts in).
-- Idempotent (IF NOT EXISTS / guarded) to match this project's additive-migration style.

-- ── product_types.serviceCategoryId ───────────────────────────────────────────
ALTER TABLE "product_types" ADD COLUMN IF NOT EXISTS "serviceCategoryId" TEXT;

CREATE INDEX IF NOT EXISTS "product_types_serviceCategoryId_idx" ON "product_types"("serviceCategoryId");

DO $$ BEGIN
  ALTER TABLE "product_types"
    ADD CONSTRAINT "product_types_serviceCategoryId_fkey"
    FOREIGN KEY ("serviceCategoryId") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
