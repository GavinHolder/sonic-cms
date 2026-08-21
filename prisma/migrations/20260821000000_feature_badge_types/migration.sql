-- Admin-managed feature badge types for Package.features (e.g. "Device", "Line Rental",
-- "Monthly Minutes"). No FK to Package.features (a JSON array of {badge, value} pairs) —
-- deliberately loose coupling, matched by name only, same pattern as PackageTerm/
-- Package.term. See FeatureBadgeType model comment in schema.prisma.
-- Idempotent (IF NOT EXISTS) to match this project's additive-migration style.

CREATE TABLE IF NOT EXISTS "feature_badge_types" (
  "id"        TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "helpText"  TEXT,
  "order"     INTEGER      NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feature_badge_types_pkey" PRIMARY KEY ("id")
);
