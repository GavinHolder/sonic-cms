-- Safety net: cms_templates may already exist on DBs that ran db push,
-- or on DBs where the v132 migration was applied before this table was added.
-- IF NOT EXISTS makes this idempotent — OVB production and any db-push DBs skip cleanly.
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
