-- Per-package pricing card color override (idempotent)
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "color" TEXT;
