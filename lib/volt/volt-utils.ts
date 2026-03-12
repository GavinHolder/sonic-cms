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
