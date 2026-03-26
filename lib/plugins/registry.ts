/**
 * Plugin Registry — Core CRUD + query functions for the Plugin system.
 *
 * ASSUMPTIONS:
 * 1. Prisma Plugin model exists with: id, slug, name, version, enabled, manifest (Json), config (Json), installedAt, updatedAt
 * 2. BUILTIN_MANIFESTS is the single source of truth for built-in plugin definitions
 * 3. Plugin.manifest column stores a full PluginManifest JSON object
 * 4. seedBuiltinPlugins is called once during server startup (safe to call multiple times — idempotent)
 *
 * FAILURE MODES:
 * - DB unavailable during seed → caught, logged, does not crash server
 * - Manifest mismatch (manifest removed but DB row exists) → orphan row preserved, no crash
 * - Concurrent seed calls → Prisma upsert is atomic per row, safe under concurrency
 */

import prisma from '@/lib/prisma'
import { BUILTIN_MANIFESTS } from './manifests'
import { migrateClientFeatures } from './migration'
import type { PluginManifest, PluginWithState, PluginBreakingChange, PluginSidebarItem } from './types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function dbRowToPluginWithState(row: {
  slug: string
  name: string
  version: string
  enabled: boolean
  manifest: unknown
  config: unknown
  installedAt: Date
  updatedAt: Date
}): PluginWithState {
  return {
    slug: row.slug,
    name: row.name,
    version: row.version,
    enabled: row.enabled,
    manifest: row.manifest as PluginManifest,
    config: (row.config ?? {}) as Record<string, unknown>,
    installedAt: row.installedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function sortPlugins(plugins: PluginWithState[]): PluginWithState[] {
  return [...plugins].sort((a, b) => {
    const aCore = a.manifest.tier === 'core' ? 0 : 1
    const bCore = b.manifest.tier === 'core' ? 0 : 1
    if (aCore !== bCore) return aCore - bCore
    return a.name.localeCompare(b.name)
  })
}

// ---------------------------------------------------------------------------
// seedBuiltinPlugins
// ---------------------------------------------------------------------------

/**
 * Upsert all built-in manifests into the Plugin table.
 * Preserves existing enabled/config state. Creates new plugins for new manifests.
 * Runs ClientFeature migration on first call (idempotent).
 */
export async function seedBuiltinPlugins(): Promise<void> {
  try {
    // Step 1: migrate legacy ClientFeature rows (idempotent — skips if already done)
    await migrateClientFeatures()

    // Step 2: upsert each built-in manifest
    for (const manifest of BUILTIN_MANIFESTS) {
      await prisma.plugin.upsert({
        where: { slug: manifest.id },
        update: {
          name: manifest.name,
          version: manifest.version,
          manifest: JSON.parse(JSON.stringify(manifest)),
        },
        create: {
          slug: manifest.id,
          name: manifest.name,
          version: manifest.version,
          enabled: manifest.defaultEnabled,
          manifest: JSON.parse(JSON.stringify(manifest)),
          config: {},
        },
      })
    }
  } catch (error) {
    // Seed must never crash the server
    console.error('[plugin-registry] seedBuiltinPlugins failed:', error)
  }
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Get all plugins ordered by: core first, then alphabetical by name.
 */
export async function getPlugins(): Promise<PluginWithState[]> {
  const rows = await prisma.plugin.findMany()
  const plugins = rows.map(dbRowToPluginWithState)
  return sortPlugins(plugins)
}

/**
 * Get only enabled plugins, ordered by: core first, then alphabetical.
 */
export async function getEnabledPlugins(): Promise<PluginWithState[]> {
  const rows = await prisma.plugin.findMany({ where: { enabled: true } })
  const plugins = rows.map(dbRowToPluginWithState)
  return sortPlugins(plugins)
}

/**
 * Get a single plugin by slug. Returns null if not found.
 */
export async function getPlugin(slug: string): Promise<PluginWithState | null> {
  const row = await prisma.plugin.findUnique({ where: { slug } })
  if (!row) return null
  return dbRowToPluginWithState(row)
}

// ---------------------------------------------------------------------------
// Mutation functions
// ---------------------------------------------------------------------------

/**
 * Enable or disable a plugin.
 * Throws if canDisable is false and caller tries to disable.
 * Throws if disabling would break a dependency (another enabled plugin depends on this one).
 */
export async function setPluginEnabled(slug: string, enabled: boolean): Promise<void> {
  const row = await prisma.plugin.findUnique({ where: { slug } })
  if (!row) {
    throw new Error(`Plugin "${slug}" not found`)
  }

  const manifest = row.manifest as unknown as PluginManifest

  // Guard: cannot disable a core plugin marked canDisable: false
  if (!enabled && manifest.canDisable === false) {
    throw new Error(`Plugin "${manifest.name}" cannot be disabled (core plugin)`)
  }

  // Guard: check if any OTHER enabled plugin depends on this one
  if (!enabled) {
    const allEnabled = await prisma.plugin.findMany({ where: { enabled: true } })
    const dependents: string[] = []

    for (const other of allEnabled) {
      if (other.slug === slug) continue
      const otherManifest = other.manifest as unknown as PluginManifest
      if (otherManifest.dependencies?.includes(slug)) {
        dependents.push(otherManifest.name)
      }
    }

    if (dependents.length > 0) {
      throw new Error(
        `Cannot disable "${manifest.name}" — the following enabled plugins depend on it: ${dependents.join(', ')}`
      )
    }
  }

  await prisma.plugin.update({
    where: { slug },
    data: { enabled },
  })
}

/**
 * Update plugin runtime config (merges with existing config).
 */
export async function updatePluginConfig(slug: string, config: Record<string, unknown>): Promise<void> {
  const row = await prisma.plugin.findUnique({ where: { slug } })
  if (!row) {
    throw new Error(`Plugin "${slug}" not found`)
  }

  const existingConfig = (row.config ?? {}) as Record<string, unknown>
  const mergedConfig = { ...existingConfig, ...config }

  await prisma.plugin.update({
    where: { slug },
    data: { config: JSON.parse(JSON.stringify(mergedConfig)) },
  })
}

// ---------------------------------------------------------------------------
// Sidebar aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate sidebar items from all enabled plugins.
 * Returns items grouped by parentId.
 */
export async function getPluginSidebarItems(): Promise<{ parentId: string; items: PluginSidebarItem[] }[]> {
  const enabledPlugins = await getEnabledPlugins()

  const grouped = new Map<string, PluginSidebarItem[]>()

  for (const plugin of enabledPlugins) {
    const sidebarGroups = plugin.manifest.sidebarItems ?? []
    for (const group of sidebarGroups) {
      const existing = grouped.get(group.parentId) ?? []
      grouped.set(group.parentId, [...existing, ...group.items])
    }
  }

  return Array.from(grouped.entries()).map(([parentId, items]) => ({
    parentId,
    items,
  }))
}

// ---------------------------------------------------------------------------
// Plugin section + page types for creation UIs
// ---------------------------------------------------------------------------

export interface PluginContentType {
  pluginId: string
  pluginName: string
  pluginIcon: string
  id: string
  label: string
  icon: string
  description: string
}

/**
 * Get all section types contributed by enabled plugins.
 * Used by the "Add Section" picker.
 */
export async function getPluginSectionTypes(): Promise<PluginContentType[]> {
  const plugins = await getEnabledPlugins()
  const result: PluginContentType[] = []
  for (const p of plugins) {
    for (const st of p.manifest.sectionTypes ?? []) {
      result.push({ pluginId: p.slug, pluginName: p.name, pluginIcon: p.manifest.icon, ...st })
    }
  }
  return result
}

/**
 * Get all page types contributed by enabled plugins.
 * Used by the "Create Page" picker.
 */
export async function getPluginPageTypes(): Promise<PluginContentType[]> {
  const plugins = await getEnabledPlugins()
  const result: PluginContentType[] = []
  for (const p of plugins) {
    for (const pt of p.manifest.pageTypes ?? []) {
      result.push({ pluginId: p.slug, pluginName: p.name, pluginIcon: p.manifest.icon, ...pt })
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Breaking change impact analysis
// ---------------------------------------------------------------------------

/**
 * Cross-reference breaking changes against all plugins.
 * Returns which plugins are affected, with their breaking changes and enabled status.
 */
export async function getBreakingChangeImpact(
  breakingChanges: PluginBreakingChange[]
): Promise<{ plugin: PluginWithState; changes: PluginBreakingChange[]; isEnabled: boolean }[]> {
  if (breakingChanges.length === 0) return []

  const allPlugins = await getPlugins()

  const impactMap = new Map<string, { plugin: PluginWithState; changes: PluginBreakingChange[] }>()

  for (const change of breakingChanges) {
    for (const affectedSlug of change.affects) {
      const plugin = allPlugins.find((p) => p.slug === affectedSlug)
      if (!plugin) continue

      const existing = impactMap.get(affectedSlug)
      if (existing) {
        impactMap.set(affectedSlug, {
          plugin: existing.plugin,
          changes: [...existing.changes, change],
        })
      } else {
        impactMap.set(affectedSlug, { plugin, changes: [change] })
      }
    }
  }

  return Array.from(impactMap.values()).map(({ plugin, changes }) => ({
    plugin,
    changes,
    isEnabled: plugin.enabled,
  }))
}
