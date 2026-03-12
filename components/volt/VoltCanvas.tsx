'use client'
import { useRef, useState, useCallback } from 'react'
import type { VoltLayer, VoltTool, VoltElementData } from '@/types/volt'
import { createRectangleLayer, createEllipseLayer, createSlotLayer } from '@/lib/volt/volt-defaults'
import { sortLayersByZ } from '@/lib/volt/volt-utils'
import VoltSvgLayer from './VoltSvgLayer'

interface DrawState {
  isDrawing: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface Props {
  element: VoltElementData
  activeTool: VoltTool
  selectedLayerId: string | null
  zoom: number
  panX: number
  panY: number
  onAddLayer: (layer: VoltLayer) => void
  onSelectLayer: (id: string | null) => void
  onUpdateLayer: (id: string, updates: Partial<VoltLayer>) => void
}

export default function VoltCanvas({
  element, activeTool, selectedLayerId, zoom, panX, panY,
  onAddLayer, onSelectLayer, onUpdateLayer,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draw, setDraw] = useState<DrawState | null>(null)

  const { canvasWidth, canvasHeight, layers } = element
  const sortedLayers = sortLayersByZ(layers)

  function getSvgPoint(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!
    const rect = svg.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function toPercent(x: number, y: number, w: number, h: number) {
    return {
      px: (x / canvasWidth) * 100,
      py: (y / canvasHeight) * 100,
      pw: (w / canvasWidth) * 100,
      ph: (h / canvasHeight) * 100,
    }
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (activeTool === 'select' || activeTool === 'hand') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getSvgPoint(e)
    setDraw({ isDrawing: true, startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draw?.isDrawing) return
    const pt = getSvgPoint(e)
    setDraw(d => d ? { ...d, currentX: pt.x, currentY: pt.y } : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!draw?.isDrawing) return
    const { startX, startY, currentX, currentY } = draw
    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const w = Math.abs(currentX - startX)
    const h = Math.abs(currentY - startY)

    if (w < 4 || h < 4) { setDraw(null); return }

    const { px, py, pw, ph } = toPercent(x, y, w, h)

    let layer: VoltLayer | null = null
    if (activeTool === 'rectangle') layer = createRectangleLayer(px, py, pw, ph)
    if (activeTool === 'ellipse')   layer = createEllipseLayer(px, py, pw, ph)
    if (activeTool === 'slot')      layer = createSlotLayer('title', px, py, pw, ph)

    if (layer) onAddLayer(layer)
    setDraw(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, activeTool, onAddLayer])

  const ghost = draw?.isDrawing && activeTool !== 'select' && activeTool !== 'hand' ? (() => {
    const x = Math.min(draw.startX, draw.currentX)
    const y = Math.min(draw.startY, draw.currentY)
    const w = Math.abs(draw.currentX - draw.startX)
    const h = Math.abs(draw.currentY - draw.startY)

    if (activeTool === 'ellipse') {
      return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2}
        fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth={1} strokeDasharray="4 2" />
    }
    if (activeTool === 'slot') {
      return <rect x={x} y={y} width={w} height={h}
        fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 2" />
    }
    return <rect x={x} y={y} width={w} height={h}
      fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth={1} strokeDasharray="4 2" />
  })() : null

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0f0f1a' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, #2d2d44 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`,
        transformOrigin: 'center center',
        width: canvasWidth, height: canvasHeight,
        background: '#ffffff',
        boxShadow: '0 0 0 1px #3d3d5c, 0 8px 40px rgba(0,0,0,0.6)',
      }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            position: 'absolute', inset: 0,
            cursor: activeTool === 'hand' ? 'grab'
              : activeTool === 'select' ? 'default' : 'crosshair',
            userSelect: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => onSelectLayer(null)}
        >
          {sortedLayers.map(layer =>
            layer.type === 'vector'
              ? (
                <g key={layer.id}>
                  <VoltSvgLayer layer={layer} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
                  <rect
                    x={(layer.x / 100) * canvasWidth}
                    y={(layer.y / 100) * canvasHeight}
                    width={(layer.width / 100) * canvasWidth}
                    height={(layer.height / 100) * canvasHeight}
                    fill="transparent"
                    stroke="none"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); onSelectLayer(layer.id) }}
                  />
                </g>
              )
              : layer.type === 'slot'
              ? <SlotHitTarget key={layer.id} layer={layer} canvasWidth={canvasWidth} canvasHeight={canvasHeight}
                  selected={layer.id === selectedLayerId}
                  onClick={(id) => { onSelectLayer(id) }} />
              : null
          )}

          {selectedLayerId && (() => {
            const sel = layers.find(l => l.id === selectedLayerId)
            if (!sel) return null
            const ax = (sel.x / 100) * canvasWidth
            const ay = (sel.y / 100) * canvasHeight
            const aw = (sel.width / 100) * canvasWidth
            const ah = (sel.height / 100) * canvasHeight
            return (
              <rect x={ax} y={ay} width={aw} height={ah}
                fill="none" stroke="#6366f1" strokeWidth={1.5}
                pointerEvents="none" />
            )
          })()}

          {ghost}
        </svg>

        {sortedLayers.filter(l => l.type === 'slot' && l.visible).map(layer => (
          <div key={`slot-label-${layer.id}`} style={{
            position: 'absolute',
            left: `${layer.x}%`, top: `${layer.y}%`,
            width: `${layer.width}%`, height: `${layer.height}%`,
            border: `1.5px dashed ${layer.id === selectedLayerId ? '#22c55e' : '#22c55e88'}`,
            borderRadius: 4,
            pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 600,
              padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: 1,
            }}>
              {layer.slotData?.slotLabel ?? 'Slot'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlotHitTarget({ layer, canvasWidth, canvasHeight, selected, onClick }: {
  layer: VoltLayer; canvasWidth: number; canvasHeight: number; selected: boolean; onClick: (id: string) => void
}) {
  const ax = (layer.x / 100) * canvasWidth
  const ay = (layer.y / 100) * canvasHeight
  const aw = (layer.width / 100) * canvasWidth
  const ah = (layer.height / 100) * canvasHeight
  return (
    <rect x={ax} y={ay} width={aw} height={ah}
      fill="transparent" stroke="none"
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onClick(layer.id) }}
    />
  )
}
