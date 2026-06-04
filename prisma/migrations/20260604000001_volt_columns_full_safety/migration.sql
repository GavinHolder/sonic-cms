-- Safety migration: add ALL volt_elements columns that may be missing
-- if the table was created before migration tracking began.
-- Every ADD COLUMN uses IF NOT EXISTS — safe to run on any DB state.

ALTER TABLE "volt_elements"
  ADD COLUMN IF NOT EXISTS "layers"       JSONB        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "states"       JSONB        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "slots"        JSONB        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "flipCard"     JSONB,
  ADD COLUMN IF NOT EXISTS "designerData" JSONB,
  ADD COLUMN IF NOT EXISTS "canvasWidth"  INTEGER      NOT NULL DEFAULT 800,
  ADD COLUMN IF NOT EXISTS "canvasHeight" INTEGER      NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS "has3D"        BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "thumbnail"    TEXT,
  ADD COLUMN IF NOT EXISTS "tags"         TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "isPaid"       BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "price"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "downloads"    INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "mood"         TEXT,
  ADD COLUMN IF NOT EXISTS "description"  TEXT,
  ADD COLUMN IF NOT EXISTS "elementType"  TEXT         NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS "isPublic"     BOOLEAN      NOT NULL DEFAULT false;
