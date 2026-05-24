-- CreateTable: seo_gsc_tokens
-- Stores encrypted Google Search Console OAuth tokens (single row per CMS instance)

CREATE TABLE IF NOT EXISTS "seo_gsc_tokens" (
    "id"           TEXT NOT NULL,
    "accessToken"  TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt"    TIMESTAMP(3) NOT NULL,
    "siteUrl"      TEXT NOT NULL DEFAULT '',
    "accountEmail" TEXT NOT NULL DEFAULT '',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_gsc_tokens_pkey" PRIMARY KEY ("id")
);
