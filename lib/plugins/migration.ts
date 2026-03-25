/**
 * Plugin Migration — One-time ClientFeature → Plugin table migration.
 *
 * ASSUMPTIONS:
 * 1. ClientFeature model still exists in Prisma schema (not dropped yet)
 * 2. BUILTIN_MANIFESTS contains manifests for known ClientFeature slugs
 * 3. Plugin table may already have rows (idempotent — skips existing slugs)
 *
 * FAILURE MODES:
 * - ClientFeature table missing (already dropped) → caught, returns { migrated: 0, skipped: 0 }
 * - Plugin row already exists for slug → skipped, not duplicated
 * - No matching manifest for a ClientFeature → created with generic manifest
 */

import prisma from '@/lib/prisma'
import { BUILTIN_MANIFESTS } from './manifests'
import type { PluginManifest } from './types'

/**
 * Build a generic manifest for ClientFeatures that have no matching built-in manifest.
 * Marks the plugin as a custom/legacy feature.
 */
function buildGenericManifest(slug: string, name: string): PluginManifest {
  return {
    id: slug,
    name,
    description: `Migrated from ClientFeature: ${name}`,
    version: '0.0.0',
    author: 'Legacy Migration',
    icon: 'bi-puzzle',
    routes: { admin: [], api: [], public: [] },
    sidebarItems: [],
    settingsTabs: [],
    prismaModels: [],
    dependencies: [],
    coreMinVersion: '1.0.0',
    touchesFiles: [],
    touchesModels: ['ClientFeature'],
    touchesRoutes: [],
    tier: 'free',
    canDisable: true,
    defaultEnabled: false,
  }
}

/**
 * Migrate ClientFeature rows into the Plugin table.
 *
 * Idempotent: skips if a Plugin with that slug already exists.
 * Does NOT drop the ClientFeature table.
 *
 * @returns counts of migrated vs skipped rows
 */
export async function migrateClientFeatures(): Promise<{ migrated: number; skipped: number }> {
  let migrated = 0
  let skipped = 0

  try {
    const clientFeatures = await prisma.clientFeature.findMany()

    for (const cf of clientFeatures) {
      // Check if Plugin already exists for this slug
      const existing = await prisma.plugin.findUnique({ where: { slug: cf.slug } })
      if (existing) {
        skipped++
        continue
      }

      // Find matching built-in manifest, or create generic
      const manifest = BUILTIN_MANIFESTS.find((m) => m.id === cf.slug) ?? buildGenericManifest(cf.slug, cf.name)

      await prisma.plugin.create({
        data: {
          slug: cf.slug,
          name: cf.name,
          version: manifest.version,
          enabled: cf.enabled,
          manifest: manifest as unknown as Record<string, unknown>,
          config: (cf.config ?? {}) as Record<string, unknown>,
        },
      })

      migrated++
    }
  } catch (error) {
    // If ClientFeature table doesn't exist or any other DB error, log and return
    console.error('[plugin-migration] migrateClientFeatures failed:', error)
  }

  return { migrated, skipped }
}
