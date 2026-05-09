-- ============================================================================
-- Migration: gallery feature
-- Adds GalleryCategory + GalleryImage tables and GALLERY PageType enum value.
-- All statements use IF NOT EXISTS / DO $$ guards — safe to re-run.
-- ============================================================================

-- ── Enum: add GALLERY to PageType ────────────────────────────────────────────
ALTER TYPE "PageType" ADD VALUE IF NOT EXISTS 'GALLERY';

-- ── gallery_categories ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gallery_categories" (
  "id"           TEXT         NOT NULL,
  "name"         TEXT         NOT NULL,
  "slug"         TEXT         NOT NULL,
  "description"  TEXT,
  "coverImageId" TEXT,
  "isActive"     BOOLEAN      NOT NULL DEFAULT true,
  "order"        INTEGER      NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gallery_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gallery_categories_slug_key"     ON "gallery_categories"("slug");
CREATE INDEX        IF NOT EXISTS "gallery_categories_isActive_idx" ON "gallery_categories"("isActive");

-- ── gallery_images ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gallery_images" (
  "id"         TEXT         NOT NULL,
  "categoryId" TEXT         NOT NULL,
  "assetId"    TEXT         NOT NULL,
  "caption"    TEXT,
  "altText"    TEXT,
  "order"      INTEGER      NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gallery_images_categoryId_order_idx" ON "gallery_images"("categoryId", "order");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'gallery_categories_coverImageId_fkey') THEN
    ALTER TABLE "gallery_categories"
      ADD CONSTRAINT "gallery_categories_coverImageId_fkey"
      FOREIGN KEY ("coverImageId") REFERENCES "media_assets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'gallery_images_categoryId_fkey') THEN
    ALTER TABLE "gallery_images"
      ADD CONSTRAINT "gallery_images_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "gallery_categories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'gallery_images_assetId_fkey') THEN
    ALTER TABLE "gallery_images"
      ADD CONSTRAINT "gallery_images_assetId_fkey"
      FOREIGN KEY ("assetId") REFERENCES "media_assets"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
