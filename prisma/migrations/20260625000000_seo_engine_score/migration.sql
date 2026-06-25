-- SEO score snapshot columns on seo_engine_runs.
-- All additive + nullable + IF NOT EXISTS — safe to re-run and safe on client DBs
-- that already have rows (existing runs keep NULL score fields).

ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "score" INTEGER;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "onPageScore" INTEGER;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "contentScore" INTEGER;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "performanceScore" INTEGER;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "indexedPages" INTEGER;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "avgPosition" DOUBLE PRECISION;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "impressions" INTEGER;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "clicks" INTEGER;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "ctr" DOUBLE PRECISION;
ALTER TABLE "seo_engine_runs" ADD COLUMN IF NOT EXISTS "breakdown" JSONB;
