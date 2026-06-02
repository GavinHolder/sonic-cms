CREATE TABLE IF NOT EXISTS "seo_engine_runs" (
    "id" SERIAL NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "pagesAudited" INTEGER NOT NULL,
    "pagesAutoFilled" INTEGER NOT NULL,
    "pagesProtected" INTEGER NOT NULL,
    "pagesAlerted" INTEGER NOT NULL,
    "issues" JSONB NOT NULL,
    CONSTRAINT "seo_engine_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gbp_tokens" (
    "id" SERIAL NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "locationId" TEXT,
    "locationName" TEXT,
    CONSTRAINT "gbp_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pages"
    ADD COLUMN IF NOT EXISTS "seoUserEditedFields" TEXT,
    ADD COLUMN IF NOT EXISTS "seoProtectedReason" TEXT,
    ADD COLUMN IF NOT EXISTS "seoLastAutoFilled" TIMESTAMP(3);

ALTER TABLE "site_config"
    ADD COLUMN IF NOT EXISTS "googleClientId" TEXT,
    ADD COLUMN IF NOT EXISTS "googleClientSecret" TEXT,
    ADD COLUMN IF NOT EXISTS "googleRedirectUri" TEXT;
