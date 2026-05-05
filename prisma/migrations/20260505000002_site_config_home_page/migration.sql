-- AlterTable: add homePage column to site_config (nullable, no default)
ALTER TABLE "site_config" ADD COLUMN IF NOT EXISTS "homePage" TEXT;
