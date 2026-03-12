// lib/volt/volt-defaults.ts
import { VoltLayer, VoltElementData, VoltState, DEFAULT_ANIMATION } from '@/types/volt'
import { nanoid } from 'nanoid'

export function createDefaultRestState(): VoltState {
  return {
    id: 'rest',
    name: 'rest',
    trigger: 'auto',
    layerOverrides: {},
  }
}

export function createDefaultHoverState(): VoltState {
  return {
    id: 'hover',
    name: 'hover',
    trigger: 'mouseenter',
    layerOverrides: {},
  }
}

export function createRectangleLayer(x: number, y: number, w: number, h: number): VoltLayer {
  return {
    id: nanoid(),
    name: 'Rectangle',
    type: 'vector',
    role: 'structure',
    x, y, width: w, height: h,
    rotation: 0,
    zIndex: 0,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    vectorData: {
      pathData: rectPath(x, y, w, h),
      fills: [{ id: nanoid(), type: 'solid', color: '#6366f1', opacity: 1, blendMode: 'normal' }],
      stroke: undefined,
      closed: true,
    },
    animation: { ...DEFAULT_ANIMATION },
  }
}

export function createEllipseLayer(x: number, y: number, w: number, h: number): VoltLayer {
  return {
    id: nanoid(),
    name: 'Ellipse',
    type: 'vector',
    role: 'structure',
    x, y, width: w, height: h,
    rotation: 0,
    zIndex: 0,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    vectorData: {
      pathData: ellipsePath(x, y, w, h),
      fills: [{ id: nanoid(), type: 'solid', color: '#8b5cf6', opacity: 1, blendMode: 'normal' }],
      stroke: undefined,
      closed: true,
    },
    animation: { ...DEFAULT_ANIMATION },
  }
}

export function createSlotLayer(
  slotType: 'title' | 'body' | 'image' | 'action',
  x: number, y: number, w: number, h: number
): VoltLayer {
  const labels: Record<string, string> = {
    title: 'Title', body: 'Body Text', image: 'Image', action: 'Action Button',
  }
  return {
    id: nanoid(),
    name: labels[slotType] ?? slotType,
    type: 'slot',
    role: 'content',
    x, y, width: w, height: h,
    rotation: 0,
    zIndex: 10,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    slotData: {
      slotType,
      slotLabel: labels[slotType] ?? slotType,
      contentFieldHint: slotType,
      textAlign: 'left',
    },
    animation: {
      ...DEFAULT_ANIMATION,
      animates: { opacity: false, scale: false, position: false, rotation: false, fill: false }
    },
  }
}

export function createNewVoltElement(authorId: string, name = 'New Design'): VoltElementData {
  return {
    id: '',
    name,
    mood: undefined,
    elementType: 'custom',
    isPublic: false,
    authorId,
    layers: [],
    states: [createDefaultRestState(), createDefaultHoverState()],
    canvasWidth: 800,
    canvasHeight: 500,
    has3D: false,
    tags: [],
    isPaid: false,
    downloads: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function rectPath(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`
}

export function ellipsePath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2
  const cy = y + h / 2
  const rx = w / 2
  const ry = h / 2
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
}
