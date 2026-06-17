-- Coverage map: provider networks, packages, region→network link, categorized leads.
-- Idempotent (IF NOT EXISTS / guarded) to match this project's additive-migration style.

-- ── NetworkCategory enum ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "NetworkCategory" AS ENUM ('FNO', 'WISP', 'WIRELESS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── networks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "networks" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "category"    "NetworkCategory" NOT NULL DEFAULT 'FNO',
  "color"       TEXT NOT NULL DEFAULT '#22c55e',
  "logoUrl"     TEXT,
  "description" TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "networks_slug_key" ON "networks"("slug");

-- ── packages ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "packages" (
  "id"         TEXT NOT NULL,
  "networkId"  TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "speedDown"  TEXT,
  "speedUp"    TEXT,
  "price"      TEXT NOT NULL,
  "period"     TEXT DEFAULT '/month',
  "features"   JSONB NOT NULL DEFAULT '[]',
  "popular"    BOOLEAN NOT NULL DEFAULT false,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "order"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "packages_networkId_idx" ON "packages"("networkId");

-- ── coverage_regions.networkId ───────────────────────────────────────────────
ALTER TABLE "coverage_regions" ADD COLUMN IF NOT EXISTS "networkId" TEXT;
CREATE INDEX IF NOT EXISTS "coverage_regions_networkId_idx" ON "coverage_regions"("networkId");

-- ── form_submissions lead-categorization fields ──────────────────────────────
ALTER TABLE "form_submissions"
  ADD COLUMN IF NOT EXISTS "source"         TEXT,
  ADD COLUMN IF NOT EXISTS "leadCategory"   TEXT,
  ADD COLUMN IF NOT EXISTS "networkName"    TEXT,
  ADD COLUMN IF NOT EXISTS "packageName"    TEXT,
  ADD COLUMN IF NOT EXISTS "addressChecked" TEXT;

-- ── foreign keys (guarded) ────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "packages" ADD CONSTRAINT "packages_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "coverage_regions" ADD CONSTRAINT "coverage_regions_networkId_fkey"
    FOREIGN KEY ("networkId") REFERENCES "networks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
