-- volt_elements: add columns that were missed when table was created before migration history
-- slots and flipCard were in the CREATE TABLE IF NOT EXISTS block in 20260320000000_add_missing_schema
-- but that block is skipped when the table already exists.

ALTER TABLE "volt_elements"
  ADD COLUMN IF NOT EXISTS "slots"    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "flipCard" JSONB;
