import { describe, it, expect } from 'vitest'
import { BUILTIN_MANIFESTS } from '@/lib/plugins/manifests'

describe('BUILTIN_MANIFESTS', () => {
  it('has at least 15 manifests', () => {
    expect(BUILTIN_MANIFESTS.length).toBeGreaterThanOrEqual(15)
  })

  it('all manifests have unique ids', () => {
    const ids = BUILTIN_MANIFESTS.map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('core plugins have canDisable: false', () => {
    const core = BUILTIN_MANIFESTS.filter(m => m.tier === 'core')
    expect(core.length).toBeGreaterThanOrEqual(4)
    for (const m of core) {
      expect(m.canDisable).toBe(false)
    }
  })

  it('non-core plugins have canDisable: true', () => {
    const nonCore = BUILTIN_MANIFESTS.filter(m => m.tier !== 'core')
    for (const m of nonCore) {
      expect(m.canDisable).toBe(true)
    }
  })

  it('all manifests have required fields', () => {
    for (const m of BUILTIN_MANIFESTS) {
      expect(m.id).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(m.description).toBeTruthy()
      expect(m.version).toBeTruthy()
      expect(m.icon).toMatch(/^bi-/)
      expect(m.routes).toBeDefined()
      expect(m.routes.admin).toBeInstanceOf(Array)
      expect(m.routes.api).toBeInstanceOf(Array)
      expect(m.routes.public).toBeInstanceOf(Array)
      expect(m.prismaModels).toBeInstanceOf(Array)
      expect(m.dependencies).toBeInstanceOf(Array)
      expect(['core', 'free', 'pro', 'enterprise']).toContain(m.tier)
    }
  })

  it('optional plugins default to disabled', () => {
    const optional = BUILTIN_MANIFESTS.filter(m => m.tier === 'pro')
    for (const m of optional) {
      expect(m.defaultEnabled).toBe(false)
    }
  })

  it('dependencies reference valid plugin ids', () => {
    const allIds = new Set(BUILTIN_MANIFESTS.map(m => m.id))
    for (const m of BUILTIN_MANIFESTS) {
      for (const dep of m.dependencies) {
        expect(allIds.has(dep)).toBe(true)
      }
    }
  })

  it('concrete-calculator, coverage-maps, projects are included (migrated from ClientFeature)', () => {
    const slugs = BUILTIN_MANIFESTS.map(m => m.id)
    expect(slugs).toContain('concrete-calculator')
    expect(slugs).toContain('coverage-maps')
    expect(slugs).toContain('projects')
  })
})
