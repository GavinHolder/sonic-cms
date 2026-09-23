// lib/volt/volt-utils.ts
import type { VoltLayer, VoltSlots, VoltSlotMap, VoltElementData } from '@/types/volt'
// Shared layer z-order sort — the SAME plain-JS module public/volt-designer.html
// loads via <script src="/volt-layer-order-rules.js"> (ONE SYSTEM PER CONCERN;
// mirrors volt-glass-rules.js). Hand-written volt-layer-order-rules.d.ts alongside it.
import { sortLayersByZ as sharedSortLayersByZ } from '../../public/volt-layer-order-rules.js'

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
  return sharedSortLayersByZ(layers)
}

/**
 * Returns true if `layer` is a 'vector' layer whose PRIMARY fill
 * (vectorData.fills[0]) has type 'glass' (recursing into group `children`,
 * if present).
 *
 * This is the ONE predicate for "does this layer's own render paint a real
 * `backdrop-filter: blur(...)` glass panel" — the exact condition
 * VoltRenderer.tsx's renderGlassOverlays()/vector-run split and
 * VoltSvgLayer.tsx's SVG-skip check both test. All three used to each carry
 * their own inline `fills?.[0]?.type === 'glass'` copy, which could (and,
 * for hover-only glass, did) silently disagree — see voltHasGlassLayer()
 * below. They now import and call this single exported function instead.
 *
 * Takes `unknown` (not VoltLayer) because voltHasGlassLayer() below passes
 * raw Prisma JSON — untyped at the DB boundary, legacy rows may be
 * malformed. Guarded; returns false on any unexpected shape.
 */
export function isGlassVectorLayer(layer: unknown): boolean {
  if (!layer || typeof layer !== 'object') return false
  const l = layer as { type?: unknown; vectorData?: { fills?: unknown[] }; children?: unknown[] }
  const firstFill = l.vectorData?.fills?.[0] as { type?: unknown } | undefined
  if (l.type === 'vector' && firstFill?.type === 'glass') return true
  if (Array.isArray(l.children)) return l.children.some(isGlassVectorLayer)
  return false
}

/**
 * Detects whether a Volt design contains a glass/frosted-blur fill that will
 * actually be painted — i.e. any layer (recursing into group `children`) for
 * which isGlassVectorLayer() above returns true.
 *
 * Deliberately BASE-FILL-ONLY, matching isGlassVectorLayer() exactly: it does
 * NOT also inspect `states`/`layerOverrides` (a layer becoming glass only on
 * hover/etc). VoltRenderer.tsx/VoltSvgLayer.tsx never paint a glass panel for
 * a hover-only glass override today — renderGlassOverlays() only ever checks
 * a layer's base fill — so a hover-only glass layer has nothing that needs
 * the forwarded background to blur. (An earlier version of this function DID
 * also scan `states`, which meant it could return true while nothing was
 * ever painted for that case — a real but harmless mismatch, since the only
 * consequence was an unnecessary background fetch. If hover-triggered glass
 * panels are ever implemented, extend isGlassVectorLayer() and the paint
 * logic together, so this function's answer keeps matching reality.)
 *
 * Used by GET /api/volt to compute a lightweight `hasGlassLayer` flag per
 * volt so the Flexible Designer's preview iframe only forwards the section
 * background into volts that actually consume it (see buildVoltPreviewUrl in
 * public/flexible-designer.html), instead of every volt regardless of
 * whether it has a glass layer.
 *
 * Takes `unknown` (not VoltLayer[]) because callers pass raw Prisma JSON
 * columns — untyped at the DB boundary, and legacy rows may be malformed.
 * Every access is guarded; on any unexpected shape this returns false
 * (fail-safe: background stays un-forwarded) rather than throwing.
 */
export function voltHasGlassLayer(layers: unknown): boolean {
  const layerList = Array.isArray(layers) ? layers : []
  return layerList.some(isGlassVectorLayer)
}
