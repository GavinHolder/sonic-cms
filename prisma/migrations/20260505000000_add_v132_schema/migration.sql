-- ============================================================================
-- Migration: v1.32 schema additions
-- All changes since 20260320000000_add_missing_schema.
-- Every statement uses IF NOT EXISTS / DO NOTHING guards so this is
-- idempotent and safe to re-run on partially-migrated databases.
-- ============================================================================

-- ── Enum additions ────────────────────────────────────────────────────────────

ALTER TYPE "PageType" ADD VALUE IF NOT EXISTS 'STANDALONE';

-- ── pages: new columns ────────────────────────────────────────────────────────

ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "navLabel"      TEXT,
  ADD COLUMN IF NOT EXISTS "customHtml"    TEXT,
  ADD COLUMN IF NOT EXISTS "customCss"     TEXT,
  ADD COLUMN IF NOT EXISTS "customCssUrls" TEXT;

-- ── site_config: new columns ─────────────────────────────────────────────────

ALTER TABLE "site_config"
  ADD COLUMN IF NOT EXISTS "defaultTheme" TEXT NOT NULL DEFAULT 'dark';

-- ── volt_elements: new column ─────────────────────────────────────────────────

ALTER TABLE "volt_elements"
  ADD COLUMN IF NOT EXISTS "designerData" JSONB;

-- ── section_versions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "section_versions" (
  "id"        TEXT         NOT NULL,
  "sectionId" TEXT         NOT NULL,
  "version"   INTEGER      NOT NULL,
  "config"    JSONB        NOT NULL,
  "createdBy" TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "section_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "section_versions_sectionId_version_key" UNIQUE ("sectionId", "version"),
  CONSTRAINT "section_versions_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "section_versions_sectionId_idx" ON "section_versions"("sectionId");

-- ── content_types ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "content_types" (
  "id"               TEXT         NOT NULL,
  "slug"             TEXT         NOT NULL,
  "name"             TEXT         NOT NULL,
  "pluralName"       TEXT         NOT NULL,
  "icon"             TEXT         NOT NULL DEFAULT 'bi-collection',
  "description"      TEXT,
  "hasPublicListing" BOOLEAN      NOT NULL DEFAULT true,
  "hasPublicDetail"  BOOLEAN      NOT NULL DEFAULT true,
  "listingLayout"    TEXT         NOT NULL DEFAULT 'grid',
  "detailLayout"     TEXT         NOT NULL DEFAULT 'standard',
  "sortField"        TEXT         NOT NULL DEFAULT 'publishedAt',
  "sortDirection"    TEXT         NOT NULL DEFAULT 'desc',
  "enableComments"   BOOLEAN      NOT NULL DEFAULT false,
  "enableTags"       BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_types_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "content_types_slug_key" UNIQUE ("slug")
);

-- ── content_fields ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "content_fields" (
  "id"            TEXT    NOT NULL,
  "contentTypeId" TEXT    NOT NULL,
  "name"          TEXT    NOT NULL,
  "slug"          TEXT    NOT NULL,
  "fieldType"     TEXT    NOT NULL,
  "required"      BOOLEAN NOT NULL DEFAULT false,
  "defaultValue"  TEXT,
  "options"       JSONB,
  "placeholder"   TEXT,
  "helpText"      TEXT,
  "sortOrder"     INTEGER NOT NULL DEFAULT 0,
  "validation"    JSONB,
  CONSTRAINT "content_fields_pkey"                    PRIMARY KEY ("id"),
  CONSTRAINT "content_fields_contentTypeId_slug_key"  UNIQUE ("contentTypeId", "slug"),
  CONSTRAINT "content_fields_contentTypeId_fkey"
    FOREIGN KEY ("contentTypeId") REFERENCES "content_types"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

-- ── content_entries ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "content_entries" (
  "id"            TEXT         NOT NULL,
  "contentTypeId" TEXT         NOT NULL,
  "slug"          TEXT         NOT NULL,
  "title"         TEXT         NOT NULL,
  "data"          JSONB        NOT NULL,
  "status"        TEXT         NOT NULL DEFAULT 'draft',
  "publishedAt"   TIMESTAMP(3),
  "scheduledAt"   TIMESTAMP(3),
  "authorId"      TEXT         NOT NULL,
  "tags"          TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "excerpt"       TEXT,
  "coverImage"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_entries_pkey"                          PRIMARY KEY ("id"),
  CONSTRAINT "content_entries_contentTypeId_slug_key"        UNIQUE ("contentTypeId", "slug"),
  CONSTRAINT "content_entries_contentTypeId_fkey"
    FOREIGN KEY ("contentTypeId") REFERENCES "content_types"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "content_entries_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "content_entries_contentTypeId_status_idx"
  ON "content_entries"("contentTypeId", "status");
CREATE INDEX IF NOT EXISTS "content_entries_contentTypeId_publishedAt_idx"
  ON "content_entries"("contentTypeId", "publishedAt");

-- ── content_entry_versions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "content_entry_versions" (
  "id"          TEXT         NOT NULL,
  "entryId"     TEXT         NOT NULL,
  "data"        JSONB        NOT NULL,
  "title"       TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT         NOT NULL,
  CONSTRAINT "content_entry_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_entry_versions_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "content_entries"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

-- ── audit_logs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT,
  "username"   TEXT,
  "action"     TEXT         NOT NULL,
  "resource"   TEXT         NOT NULL,
  "resourceId" TEXT,
  "details"    JSONB,
  "ipAddress"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx"    ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx"  ON "audit_logs"("resource");

-- ── redirects ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "redirects" (
  "id"         TEXT         NOT NULL,
  "fromPath"   TEXT         NOT NULL,
  "toPath"     TEXT         NOT NULL,
  "statusCode" INTEGER      NOT NULL DEFAULT 301,
  "isActive"   BOOLEAN      NOT NULL DEFAULT true,
  "hitCount"   INTEGER      NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "redirects_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "redirects_fromPath_key"  UNIQUE ("fromPath")
);

CREATE INDEX IF NOT EXISTS "redirects_fromPath_idx" ON "redirects"("fromPath");

-- ── plugins ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "plugins" (
  "id"          TEXT         NOT NULL,
  "slug"        TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "version"     TEXT         NOT NULL DEFAULT '1.0.0',
  "enabled"     BOOLEAN      NOT NULL DEFAULT true,
  "manifest"    JSONB        NOT NULL,
  "config"      JSONB        NOT NULL DEFAULT '{}',
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plugins_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "plugins_slug_key" UNIQUE ("slug")
);

-- ── cms_templates ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "cms_templates" (
  "id"           TEXT         NOT NULL,
  "name"         TEXT         NOT NULL,
  "description"  TEXT,
  "templateType" TEXT         NOT NULL,
  "sectionType"  TEXT,
  "thumbnail"    TEXT,
  "data"         JSONB        NOT NULL,
  "tags"         TEXT         NOT NULL DEFAULT '[]',
  "isBuiltIn"    BOOLEAN      NOT NULL DEFAULT false,
  "usageCount"   INTEGER      NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cms_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cms_templates_templateType_idx" ON "cms_templates"("templateType");
