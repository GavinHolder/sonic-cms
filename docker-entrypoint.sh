#!/bin/sh
# =============================================================================
# White-Label CMS — Docker Entrypoint
# Runs database migrations then starts the Next.js server.
# Set SKIP_MIGRATIONS=true to skip migrations (e.g. for read-only replicas).
# =============================================================================

set -e

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "⏳ Applying database migrations..."
  node node_modules/prisma/build/index.js migrate deploy || \
    node node_modules/prisma/build/index.js db push --skip-generate
  echo "✅ Migrations complete."

  echo "🌱 Seeding default admin user (upsert — safe to run on every boot)..."
  node node_modules/prisma/build/index.js db seed
  echo "✅ Seed complete."
fi

echo "🚀 Starting CMS..."
exec node server.js
