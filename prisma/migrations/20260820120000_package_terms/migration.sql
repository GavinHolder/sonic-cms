-- Admin-managed package contract-term options (replaces the hardcoded TERMS constant
-- in NetworksManager.tsx — see PackageTerm model comment in schema.prisma). No FK to
-- Package.term (kept as a plain string) — deliberately loose coupling, matched by name
-- only, same pattern as ServiceCategory/ProductType.
-- Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING) to match this project's
-- additive-migration style.

CREATE TABLE IF NOT EXISTS "package_terms" (
  "id"           TEXT         NOT NULL,
  "name"         TEXT         NOT NULL,
  "kind"         TEXT         NOT NULL DEFAULT 'DATA',
  "billsMonthly" BOOLEAN      NOT NULL DEFAULT true,
  "order"        INTEGER      NOT NULL DEFAULT 0,
  "isActive"     BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "package_terms_pkey" PRIMARY KEY ("id")
);

-- Seed the 4 values every existing package's `term` string already depends on for
-- correct display (was hardcoded in NetworksManager.tsx's TERMS constant), plus the
-- new "12-Month" option under DATA the admin explicitly asked for. Fixed ids so this
-- INSERT is idempotent on re-run (ON CONFLICT DO NOTHING keyed on the primary key).
INSERT INTO "package_terms" ("id", "name", "kind", "billsMonthly", "order", "isActive", "updatedAt") VALUES
  ('pkgterm_data_24month',    '24-Month',        'DATA', true,  0, true, CURRENT_TIMESTAMP),
  ('pkgterm_data_prepaid',    'Prepaid',         'DATA', false, 1, true, CURRENT_TIMESTAMP),
  ('pkgterm_vas_m2m',         'Month-to-Month',  'VAS',  true,  0, true, CURRENT_TIMESTAMP),
  ('pkgterm_vas_12month',     '12-Month',        'VAS',  true,  1, true, CURRENT_TIMESTAMP),
  ('pkgterm_data_12month',    '12-Month',        'DATA', true,  2, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
