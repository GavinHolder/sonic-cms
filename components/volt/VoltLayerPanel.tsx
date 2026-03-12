'use client'
import { useState } from 'react'
import type { VoltLayer } from '@/types/volt'
import { sortLayersByZ } from '@/lib/volt/volt-utils'

const ROLE_COLORS: Record<string, string> = {
  background: '#64748b',
  structure:  '#6366f1',
  accent:     '#f59e0b',
  content:    '#22c55e',
  overlay:    '#ec4899',
}

const TYPE_ICONS: Record<string, string> = {
  vector:            'bi-square',
  image:             'bi-image',
  gradient:          'bi-circle-half',
  slot:              'bi-layout-text-sidebar',
  'text-decoration': 'bi-type',
  effect:            'bi-stars',
  group:             'bi-folder',
  '3d-object':       'bi-box',
}

interface Props {
  layers: VoltLayer[]
  selectedLayerId: string | null
  onSelectLayer: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDeleteLayer: (id: string) => void
  onReorderLayers: (layers: VoltLayer[]) => void
}

export default function VoltLayerPanel({
  layers, selectedLayerId,
  onSelectLayer, onToggleVisibility, onToggleLock, onDeleteLayer, onReorderLayers,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const displayLayers = [...sortLayersByZ(layers)].reverse()

  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    setDragOver(id)
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOver(null); return }

    const newDisplay = [...displayLayers]
    const fromIdx = newDisplay.findIndex(l => l.id === dragId)
    const toIdx = newDisplay.findIndex(l => l.id === targetId)
    const [moved] = newDisplay.splice(fromIdx, 1)
    newDisplay.splice(toIdx, 0, moved)

    const reordered = [...newDisplay].reverse().map((l, i) => ({ ...l, zIndex: i }))
    onReorderLayers(reordered)
    setDragId(null); setDragOver(null)
  }

  return (
    <div style={{
      width: 220, background: '#12122a', borderRight: '1px solid #1e1e3a',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{
        padding: '10px 12px 6px', fontSize: 11, fontWeight: 700,
        color: '#64748b', textTransform: 'uppercase', letterSpacing: 1,
      }}>
        Layers
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayLayers.length === 0 && (
          <div style={{ padding: '20px 12px', color: '#3d3d5c', fontSize: 12, textAlign: 'center' }}>
            No layers yet.<br />Draw something on the canvas.
          </div>
        )}
        {displayLayers.map(layer => (
          <div
            key={layer.id}
            draggable
            onDragStart={e => onDragStart(e, layer.id)}
            onDragOver={e => onDragOver(e, layer.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => onDrop(e, layer.id)}
            onDragEnd={() => { setDragId(null); setDragOver(null) }}
            onMouseEnter={() => setHoveredId(layer.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelectLayer(layer.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
              cursor: 'pointer',
              background: layer.id === selectedLayerId ? '#1e1e4a'
                : dragOver === layer.id ? '#1e1e38' : 'transparent',
              borderLeft: layer.id === selectedLayerId
                ? '2px solid #6366f1' : '2px solid transparent',
              opacity: layer.visible ? 1 : 0.4,
            }}
          >
            <button
              onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id) }}
              title={layer.visible ? 'Hide layer' : 'Show layer'}
              style={{
                background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', padding: 0, fontSize: 12, width: 16,
              }}
            >
              <i className={`bi ${layer.visible ? 'bi-eye' : 'bi-eye-slash'}`} />
            </button>

            <button
              onClick={e => { e.stopPropagation(); onToggleLock(layer.id) }}
              title={layer.locked ? 'Unlock layer' : 'Lock layer'}
              style={{
                background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', padding: 0, fontSize: 12, width: 16,
              }}
            >
              <i className={`bi ${layer.locked ? 'bi-lock' : 'bi-unlock'}`} />
            </button>

            <i
              className={`bi ${TYPE_ICONS[layer.type] ?? 'bi-square'}`}
              style={{ color: '#94a3b8', fontSize: 12 }}
            />

            <span style={{
              flex: 1, fontSize: 12, color: '#e2e8f0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {layer.name}
            </span>

            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
              background: (ROLE_COLORS[layer.role] ?? '#64748b') + '33',
              color: ROLE_COLORS[layer.role] ?? '#64748b',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {layer.role.slice(0, 3)}
            </span>

            <button
              onClick={e => { e.stopPropagation(); onDeleteLayer(layer.id) }}
              title="Delete layer"
              style={{
                background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', padding: 0, fontSize: 13,
                opacity: hoveredId === layer.id ? 1 : 0,
              }}
            >
              <i className="bi bi-x" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
