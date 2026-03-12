'use client'
import type { VoltTool } from '@/types/volt'

const TOOLS: { id: VoltTool; label: string; shortcut: string; icon: string }[] = [
  { id: 'select',    label: 'Select',    shortcut: 'V', icon: 'bi-cursor' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: 'bi-square' },
  { id: 'ellipse',   label: 'Ellipse',   shortcut: 'E', icon: 'bi-circle' },
  { id: 'line',      label: 'Line',      shortcut: 'L', icon: 'bi-slash-lg' },
  { id: 'pen',       label: 'Pen',       shortcut: 'P', icon: 'bi-pen' },
  { id: 'slot',      label: 'Slot',      shortcut: 'S', icon: 'bi-layout-text-sidebar' },
  { id: 'hand',      label: 'Pan',       shortcut: 'H', icon: 'bi-hand-index' },
]

interface Props {
  activeTool: VoltTool
  onSelectTool: (tool: VoltTool) => void
}

export default function VoltToolbar({ activeTool, onSelectTool }: Props) {
  return (
    <div
      className="d-flex flex-column gap-1 p-2 rounded"
      style={{
        background: '#1a1a2e',
        border: '1px solid #2d2d44',
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
      }}
    >
      {TOOLS.map(tool => (
        <button
          key={tool.id}
          title={`${tool.label} (${tool.shortcut})`}
          onClick={() => onSelectTool(tool.id)}
          style={{
            background: activeTool === tool.id ? '#6366f1' : 'transparent',
            border: activeTool === tool.id ? '1px solid #818cf8' : '1px solid transparent',
            borderRadius: 6,
            color: activeTool === tool.id ? '#fff' : '#94a3b8',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 16,
            transition: 'all 0.15s',
          }}
        >
          <i className={`bi ${tool.icon}`} />
        </button>
      ))}
    </div>
  )
}
