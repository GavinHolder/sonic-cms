-- Package distance limit + tower→network link (idempotent)
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "maxDistanceM" INTEGER;

ALTER TABLE "coverage_towers" ADD COLUMN IF NOT EXISTS "networkId" TEXT;
CREATE INDEX IF NOT EXISTS "coverage_towers_networkId_idx" ON "coverage_towers"("networkId");

DO $$ BEGIN
  ALTER TABLE "coverage_towers"
    ADD CONSTRAINT "coverage_towers_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
