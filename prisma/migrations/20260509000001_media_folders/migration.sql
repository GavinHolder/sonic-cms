-- CreateTable
CREATE TABLE IF NOT EXISTS "media_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- Self-referential FK
DO $$ BEGIN
  ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- User FK
DO $$ BEGIN
  ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Index
CREATE INDEX IF NOT EXISTS "media_folders_parentId_idx" ON "media_folders"("parentId");

-- Add folderId to media_assets
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "folderId" TEXT;

-- FK from media_assets to media_folders
DO $$ BEGIN
  ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Index
CREATE INDEX IF NOT EXISTS "media_assets_folderId_idx" ON "media_assets"("folderId");
