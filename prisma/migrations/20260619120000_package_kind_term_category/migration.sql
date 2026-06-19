-- Package kind/term/category + admin-managed ServiceCategory (idempotent)
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'DATA';
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "term" TEXT;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

CREATE TABLE IF NOT EXISTS "service_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "packages_categoryId_idx" ON "packages"("categoryId");

DO $$ BEGIN
  ALTER TABLE "packages"
    ADD CONSTRAINT "packages_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
