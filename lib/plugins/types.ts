/**
 * Plugin Architecture — Type Definitions
 *
 * Every CMS feature is described by a PluginManifest.
 * The Plugin registry stores these manifests + runtime state.
 */

export interface PluginBreakingChange {
  message: string
  affects: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  migration: string
}

export interface PluginSidebarItem {
  id: string
  label: string
  icon: string
  href: string
}

export interface PluginManifest {
  id: string
  name: string
  description: string
  version: string
  author: string
  icon: string
  routes: {
    admin: string[]
    api: string[]
    public: string[]
  }
  sidebarItems: {
    parentId: string
    items: PluginSidebarItem[]
  }[]
  settingsTabs: { id: string; label: string; icon: string }[]
  prismaModels: string[]
  dependencies: string[]
  coreMinVersion: string
  touchesFiles: string[]
  touchesModels: string[]
  touchesRoutes: string[]
  tier: 'core' | 'free' | 'pro' | 'enterprise'
  canDisable: boolean
  defaultEnabled: boolean
  /** Section types this plugin contributes to the "Add Section" picker */
  sectionTypes?: {
    id: string
    label: string
    icon: string
    description: string
  }[]
  /** Page types this plugin contributes to the "Create Page" picker */
  pageTypes?: {
    id: string
    label: string
    icon: string
    description: string
  }[]
}

export interface PluginWithState {
  slug: string
  name: string
  version: string
  enabled: boolean
  manifest: PluginManifest
  config: Record<string, unknown>
  installedAt: string
  updatedAt: string
}
