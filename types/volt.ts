// types/volt.ts
// All Volt Studio type definitions

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'darken' | 'lighten' | 'color-dodge' | 'color-burn'
  | 'hard-light' | 'soft-light' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity'

export type LayerType =
  | 'vector' | 'image' | 'gradient' | 'slot'
  | 'text-decoration' | 'effect' | 'group' | '3d-object'

export type LayerRole = 'background' | 'structure' | 'accent' | 'content' | 'overlay'

export type SlotType = 'title' | 'body' | 'image' | 'action' | 'badge' | 'icon' | 'custom'

export type StateName = 'rest' | 'hover' | 'focus' | 'active' | string

export type VoltTool =
  | 'select' | 'pen' | 'line' | 'rectangle'
  | 'ellipse' | 'polygon' | 'star' | 'slot' | 'object3d'
  | 'eyedropper' | 'hand'

export type VoltMood =
  | 'energetic' | 'calm' | 'bold' | 'playful' | 'minimal' | 'immersive'

export interface GradientStop {
  color: string
  opacity: number
  position: number
}

export interface VoltFill {
  id: string
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'angular-gradient' | 'image' | 'glass'
  color?: string
  opacity: number
  blendMode: BlendMode
  gradient?: {
    stops: GradientStop[]
    angle?: number
    origin?: { x: number; y: number }
  }
  imageUrl?: string
  imageMode?: 'fill' | 'fit' | 'crop' | 'tile'
  // ── Glass fill properties (type === 'glass') ───────────────────────────────
  /** backdrop-filter blur amount in px (default: 12) */
  blur?: number
  /** Glass border highlight opacity 0-1 (default: 0.3) */
  borderOpacity?: number
  /** Corner radius in px for the glass overlay (default: 12) */
  glassBorderRadius?: number
}

export interface VoltStroke {
  color: string
  opacity: number
  width: number
  align: 'inside' | 'center' | 'outside'
  cap: 'butt' | 'round' | 'square'
  join: 'miter' | 'round' | 'bevel'
  dash?: number[]
}

export interface VoltLayerAnimation {
  character: number
  speed: number
  style: number
  delay: number
  animates: {
    opacity: boolean
    scale: boolean
    position: boolean
    rotation: boolean
    fill: boolean
  }
}

export const DEFAULT_ANIMATION: VoltLayerAnimation = {
  character: 50,
  speed: 40,
  style: 60,
  delay: 0,
  animates: { opacity: true, scale: false, position: false, rotation: false, fill: false },
}

export interface VoltVectorData {
  pathData: string
  fills: VoltFill[]
  stroke?: VoltStroke
  cornerRadius?: number | number[]
  cornerSmoothing?: number
  closed: boolean
}

export interface VoltSlotData {
  slotType: SlotType
  slotLabel: string
  contentFieldHint: string
  fontFamily?: string
  fontSize?: string
  fontWeight?: number
  color?: string
  textAlign?: 'left' | 'center' | 'right'
  imageMode?: 'fill' | 'fit' | 'crop'
  buttonVariant?: 'filled' | 'outline' | 'ghost' | 'dark'
}

export interface VoltImageData {
  url: string
  alt?: string
  mode: 'fill' | 'fit' | 'crop'
  opacity: number
}

export interface VoltTextDecorationData {
  text: string
  fontFamily?: string
  fontSize?: string
  fontWeight?: number
  color?: string
  fills?: VoltFill[]
  stroke?: VoltStroke
}

export type Volt3DAnimTrigger = '3d-hover' | '3d-auto' | 'none'
export type Volt3DEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring'

export interface Volt3DPos { x: number; y: number; z: number }
export interface Volt3DRot { x: number; y: number; z: number }

export interface VoltObject3DData {
  assetId: string
  assetUrl: string
  assetName?: string
  cameraAzimuth: number
  cameraElevation: number
  cameraDistance: number
  ambientIntensity: number
  keyLightIntensity: number
  keyLightAngle: number
  transparent: boolean
  backgroundColor?: string
  /** Override all mesh materials with wireframe */
  wireframe?: boolean
  /** Wireframe line color (default: #43a047) */
  wireframeColor?: string
  /** OrbitControls autoRotateSpeed (0 = off, positive = clockwise) */
  autoRotateSpeed?: number
  /** Per-axis scale multiplier applied after GLB normalization */
  customScale?: { x: number; y: number; z: number }
  animationMap: Record<string, { trackName: string; loop: boolean } | undefined>
  availableTracks: Array<{ name: string; duration: number }>
  activeClip?: string
  triggerEvents?: Array<{
    on: 'animStart' | 'animEnd' | 'animLoop'
    loopCount?: number
    action: 'scrollToSection' | 'snapToSection' | 'scrollToElement' | 'highlightElement'
    targetId: string
  }>
  // ── 3D Animation System ──────────────────────────────────────────────────
  /** World-space position when at rest / trigger not active */
  positionStart?: Volt3DPos
  /** World-space position when trigger is active */
  positionEnd?: Volt3DPos
  /** Uniform scale multiplier at rest (applied on top of GLB normalisation) */
  scaleStart?: number
  /** Uniform scale multiplier when trigger is active */
  scaleEnd?: number
  /** Euler rotation (degrees) at rest */
  rotationStart?: Volt3DRot
  /** Euler rotation (degrees) when trigger is active */
  rotationEnd?: Volt3DRot
  /** What fires the animation: hover over the Volt card, continuous auto loop, or disabled */
  animTrigger?: Volt3DAnimTrigger
  /** Transition duration in milliseconds (default 600) */
  transitionDuration?: number
  /** Easing curve for the transition (default easeOut) */
  transitionEasing?: Volt3DEasing
  /** Delay before transition starts in ms (default 0) */
  transitionDelay?: number
  /** For animTrigger='3d-auto': period of one full oscillation in ms (default 2000) */
  autoPeriod?: number
}

export interface VoltLayer {
  id: string
  name: string
  type: LayerType
  role: LayerRole
  /** Flip card face assignment — which side of the card this layer belongs to (default: front) */
  face?: 'front' | 'back'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  vectorData?: VoltVectorData
  slotData?: VoltSlotData
  imageData?: VoltImageData
  textData?: VoltTextDecorationData
  object3DData?: VoltObject3DData
  children?: VoltLayer[]
  animation: VoltLayerAnimation
}

export interface VoltLayerStateOverride {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  opacity?: number
  scale?: number
  /** CSS-space translate offsets in pixels — used for hover slide/peek animations */
  translateX?: number
  translateY?: number
  fills?: VoltFill[]
  stroke?: VoltStroke
}

export interface VoltState {
  id: string
  name: StateName
  trigger: 'mouseenter' | 'mouseleave' | 'focus' | 'blur' | 'click' | 'auto'
  layerOverrides: Record<string, VoltLayerStateOverride>
}

export interface VoltFlipCard {
  enabled: boolean
  /** Flip axis: 'y' = horizontal flip (left↔right), 'x' = vertical flip (top↔bottom) */
  axis: 'x' | 'y'
  /** Flip transition duration in milliseconds (default: 600) */
  duration: number
  /** Anime.js ease string (default: 'easeInOut') */
  ease: string
}

export interface VoltElementData {
  id: string
  name: string
  description?: string
  mood?: VoltMood
  elementType: string
  isPublic: boolean
  authorId: string
  thumbnail?: string | null
  layers: VoltLayer[]
  states: VoltState[]
  canvasWidth: number
  canvasHeight: number
  has3D: boolean
  tags: string[]
  isPaid: boolean
  price?: number
  downloads: number
  createdAt: string
  updatedAt: string
  /** Hover flip card config — when enabled, the Volt card flips on hover to reveal a back face */
  flipCard?: VoltFlipCard
}

/**
 * Per-instance layer overrides for a Volt block placed in the Flexible Designer.
 * Stored in block.props.voltLayerOverrides and applied at render time
 * without modifying the master Volt design.
 */
export interface VoltLayerInstanceOverride {
  /** Hex fill color override for solid-fill vector layers */
  fill?: string
  /** Hide or show the layer for this instance */
  visible?: boolean
}

/** Map of layerId → override settings */
export type VoltInstanceOverrides = Record<string, VoltLayerInstanceOverride>

export interface VoltSlotMap {
  [slotId: string]: string
}

export interface VoltSlots {
  title?: string
  body?: string
  imageUrl?: string
  imageAlt?: string
  actionLabel?: string
  actionHref?: string
  badge?: string
  icon?: string
  [customSlot: string]: string | undefined
}

export interface VoltStudioState {
  element: VoltElementData
  selectedLayerId: string | null
  activeState: StateName
  activeTool: VoltTool
  zoom: number
  panX: number
  panY: number
  isDirty: boolean
  history: VoltElementData[]
  historyIndex: number
}

export type VoltStudioAction =
  | { type: 'SET_TOOL'; tool: VoltTool }
  | { type: 'SET_ACTIVE_STATE'; state: StateName }
  | { type: 'SELECT_LAYER'; id: string | null }
  | { type: 'ADD_LAYER'; layer: VoltLayer }
  | { type: 'UPDATE_LAYER'; id: string; updates: Partial<VoltLayer> }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'REORDER_LAYERS'; layers: VoltLayer[] }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; id: string }
  | { type: 'TOGGLE_LAYER_LOCK'; id: string }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'SET_ELEMENT_NAME'; name: string }
  | { type: 'LOAD_ELEMENT'; element: VoltElementData }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED' }
