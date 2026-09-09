// lib/volt/volt-utils.ts
import type { VoltLayer, VoltSlots, VoltSlotMap, VoltElementData } from '@/types/volt'

export function extractSlotsFromSection(
  sectionData: Record<string, unknown>,
  slotMap: VoltSlotMap | null | undefined
): VoltSlots {
  if (!slotMap) return {}
  const slots: VoltSlots = {}
  for (const [slotId, fieldName] of Object.entries(slotMap)) {
    const value = sectionData[fieldName]
    if (typeof value === 'string') {
      slots[slotId] = value
    }
  }
  return slots
}

export function autoMapSlots(
  voltElement: VoltElementData,
  sectionContent: Record<string, unknown>
): VoltSlotMap {
  const slotMap: VoltSlotMap = {}
  const contentKeys = Object.keys(sectionContent)

  const HINT_MATCHES: Record<string, string[]> = {
    title:   ['heading', 'title', 'name'],
    body:    ['body', 'content', 'description', 'subheading'],
    image:   ['imageSrc', 'imageUrl', 'image', 'src'],
    action:  ['buttonText', 'ctaText', 'actionLabel'],
    badge:   ['badge', 'tag', 'label'],
  }

  const slotLayers = voltElement.layers.filter(l => l.type === 'slot')

  for (const layer of slotLayers) {
    if (!layer.slotData) continue
    const hint = layer.slotData.contentFieldHint
    const candidates = HINT_MATCHES[hint] ?? [hint]

    for (const candidate of candidates) {
      if (contentKeys.includes(candidate)) {
        slotMap[layer.id] = candidate
        break
      }
    }
  }

  return slotMap
}

export function getSlotLayers(element: VoltElementData): VoltLayer[] {
  return element.layers.filter(l => l.type === 'slot' && l.visible)
}

export function sortLayersByZ(layers: VoltLayer[]): VoltLayer[] {
  return [...layers].sort((a, b) => a.zIndex - b.zIndex)
}

/**
 * Detects whether a Volt design contains a glass/frosted-blur fill anywhere
 * in its design — base layers (recursing into group `children`), or a
 * per-state `layerOverrides` fill swap (a layer can become glass only on
 * hover/etc).
 *
 * Mirrors VoltRenderer.tsx's renderGlassOverlays() exactly: the ONLY thing
 * that ever paints a real `backdrop-filter: blur(...)` panel is a 'vector'
 * layer whose PRIMARY fill (vectorData.fills[0]) has type 'glass' — see
 * `l.type === 'vector' && l.vectorData?.fills?.[0]?.type === 'glass'` there.
 * That panel is the only place in a Volt's render that needs real content
 * (the section's actual background) behind it to blur — everything else
 * (solid/gradient/image fills, text, 3D objects) renders standalone.
 *
 * Used by GET /api/volt to compute a lightweight `hasGlassLayer` flag per
 * volt so the Flexible Designer's preview iframe only forwards the section
 * background into volts that actually consume it (see buildVoltPreviewUrl in
 * public/flexible-designer.html), instead of every volt regardless of
 * whether it has a glass layer.
 *
 * Takes `unknown` (not VoltLayer[]/VoltState[]) because callers pass raw
 * Prisma JSON columns — untyped at the DB boundary, and legacy rows may be
 * malformed. Every access is guarded; on any unexpected shape this returns
 * false (fail-safe: background stays un-forwarded) rather than throwing.
 */
export function voltHasGlassLayer(layers: unknown, states?: unknown): boolean {
  const isGlassVectorLayer = (layer: unknown): boolean => {
    if (!layer || typeof layer !== 'object') return false
    const l = layer as { type?: unknown; vectorData?: { fills?: unknown[] }; children?: unknown[] }
    const firstFill = l.vectorData?.fills?.[0] as { type?: unknown } | undefined
    if (l.type === 'vector' && firstFill?.type === 'glass') return true
    if (Array.isArray(l.children)) return l.children.some(isGlassVectorLayer)
    return false
  }

  const layerList = Array.isArray(layers) ? layers : []
  if (layerList.some(isGlassVectorLayer)) return true

  const stateList = Array.isArray(states) ? states : []
  for (const state of stateList) {
    if (!state || typeof state !== 'object') continue
    const overrides = (state as { layerOverrides?: Record<string, unknown> }).layerOverrides
    if (!overrides || typeof overrides !== 'object') continue
    for (const override of Object.values(overrides)) {
      const fills = (override as { fills?: unknown[] } | undefined)?.fills
      const firstFill = fills?.[0] as { type?: unknown } | undefined
      if (firstFill?.type === 'glass') return true
    }
  }
  return false
}
