-- AlterTable: add mediaSlots column to pages (nullable JSONB, stores {slotName: url} for standalone pages)
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "mediaSlots" JSONB;
