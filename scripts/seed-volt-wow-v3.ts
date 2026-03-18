// @ts-nocheck
/**
 * seed-volt-wow-v3 — Replaces the "Volt Studio — Animation Showcase" section.
 *
 * Three genuinely different cards — each with:
 *   • A real Unsplash photo as background (image layer)
 *   • A distinct animation type, trigger, and visual style
 *   • Layered compositions (photo → gradient overlay → glass panel → text)
 *
 *   Card A  — "Wilderness"  : Photo adventure card  · flip3d · click
 *   Card B  — "Vapor"       : Product reveal card   · swing  · hover
 *   Card C  — "Signal"      : Bold stats card       · scalefade · auto
 *
 * Run: npx tsx scripts/seed-volt-wow-v3.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
function j(o: object): Prisma.InputJsonValue { return o as Prisma.InputJsonValue }
function uid(): string { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36) }

// ── Base animation (no per-layer animation by default) ───────────────────────
function anim(overrides = {}) {
  return {
    character: 50, speed: 50, style: 60, delay: 0,
    animates: { opacity: false, scale: false, position: false, rotation: false, fill: false },
    ...overrides,
  }
}

// ── Layer builders ────────────────────────────────────────────────────────────

function imgLayer(
  id: string, name: string, face: string,
  x: number, y: number, w: number, h: number, zIndex: number, role: string,
  url: string, mode = 'fill',
) {
  return {
    id, name, type: 'image', face,
    x, y, width: w, height: h,
    rotation: 0, opacity: 1, zIndex,
    visible: true, locked: false, role,
    blendMode: 'normal',
    animation: anim(),
    imageData: { url, mode, opacity: 1, alt: name },
  }
}

function vecLayer(
  id: string, name: string, face: string,
  x: number, y: number, w: number, h: number, zIndex: number, role: string,
  pathData: string, fills: object[], stroke: object | null = null,
) {
  return {
    id, name, type: 'vector', face,
    x, y, width: w, height: h,
    rotation: 0, opacity: 1, zIndex,
    visible: true, locked: false, role,
    blendMode: 'normal',
    animation: anim(),
    vectorData: { pathData, fills, stroke, closed: true },
  }
}

function slotLayer(
  id: string, name: string, face: string,
  x: number, y: number, w: number, h: number, zIndex: number,
  slotType: string, hint: string,
  styleProps: object = {},
) {
  return {
    id, name, type: 'slot', face,
    x, y, width: w, height: h,
    rotation: 0, opacity: 1, zIndex,
    visible: true, locked: false, role: 'content',
    blendMode: 'normal',
    animation: anim(),
    slotData: {
      slotType,
      slotLabel: name,
      contentFieldHint: hint,
      color: '#ffffff',
      textAlign: 'left',
      ...styleProps,
    },
  }
}

function glassLayer(
  id: string, name: string, face: string,
  x: number, y: number, w: number, h: number, zIndex: number, role: string,
  blur = 12, opacity = 0.18, borderOpacity = 0.35, radius = 12,
) {
  const pathData = `M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z`
  return vecLayer(id, name, face, x, y, w, h, zIndex, role, pathData, [{
    id: 'gf', type: 'glass', opacity, blendMode: 'normal', color: '#ffffff',
    blur, borderOpacity, glassBorderRadius: radius,
  }])
}

// SVG path helpers (% coordinate space 0-100)
function rect(x: number, y: number, w: number, h: number): string {
  return `M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z`
}
function rrp(x: number, y: number, w: number, h: number, r = 5): string {
  return [
    `M${x+r},${y} H${x+w-r} Q${x+w},${y} ${x+w},${y+r}`,
    `V${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h}`,
    `H${x+r} Q${x},${y+h} ${x},${y+h-r}`,
    `V${y+r} Q${x},${y} ${x+r},${y} Z`,
  ].join(' ')
}
function circ(cx: number, cy: number, r: number): string {
  const k = 0.5523
  return [
    `M${cx},${cy-r}`,
    `C${cx+r*k},${cy-r} ${cx+r},${cy-r*k} ${cx+r},${cy}`,
    `C${cx+r},${cy+r*k} ${cx+r*k},${cy+r} ${cx},${cy+r}`,
    `C${cx-r*k},${cy+r} ${cx-r},${cy+r*k} ${cx-r},${cy}`,
    `C${cx-r},${cy-r*k} ${cx-r*k},${cy-r} ${cx},${cy-r} Z`,
  ].join(' ')
}

function solid(color: string, opacity = 1) {
  return [{ id: uid(), type: 'solid', color, opacity, blendMode: 'normal' }]
}
function grad(angle: number, stops: { pos: number; color: string; opacity?: number }[]) {
  return [{
    id: uid(), type: 'linear-gradient', opacity: 1, blendMode: 'normal',
    gradient: { angle, stops: stops.map(s => ({ color: s.color, opacity: s.opacity ?? 1, position: s.pos })) },
  }]
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD A: "Wilderness" — Mountain photo + flip3d + click
// Front: Full-bleed adventure photo + dark vignette + glass info panel
// Back:  Dark slate + teal accent + adventure package details
// ─────────────────────────────────────────────────────────────────────────────

function buildWildernessCard() {
  // Real mountain/adventure photo from Unsplash
  const PHOTO = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=760&fit=crop&q=85'

  const layers = [
    // ── FRONT ────────────────────────────────────────────────────────────────
    // Full-bleed adventure photo
    imgLayer(uid(), 'F: Mountain Photo', 'front', 0, 0, 100, 100, 1, 'background', PHOTO),
    // Dark gradient vignette (stronger at bottom for text legibility)
    vecLayer(uid(), 'F: Vignette', 'front', 0, 0, 100, 100, 2, 'overlay',
      rect(0, 0, 100, 100),
      grad(180, [
        { pos: 0,   color: '#000000', opacity: 0   },
        { pos: 45,  color: '#000000', opacity: 0.1 },
        { pos: 100, color: '#000000', opacity: 0.82},
      ])
    ),
    // Top-left badge chip
    vecLayer(uid(), 'F: Badge Bg', 'front', 6, 6, 32, 7, 3, 'accent',
      rrp(6, 6, 32, 7, 3.5),
      solid('#10b981', 0.9)
    ),
    slotLayer(uid(), 'Badge', 'front', 7, 6.5, 30, 6, 10, 'badge', 'ADVENTURE',
      { color: '#ffffff', fontSize: '10px', fontWeight: 700, textAlign: 'center' }),

    // Main title & tagline near bottom
    slotLayer(uid(), 'Title', 'front', 6, 68, 88, 14, 10, 'title', 'Summit Expedition',
      { color: '#ffffff', fontSize: '22px', fontWeight: 800, textAlign: 'left' }),
    slotLayer(uid(), 'Body', 'front', 6, 80, 75, 8, 10, 'body', '7 days · 4,200m elevation',
      { color: '#d1fae5', fontSize: '13px', fontWeight: 400 }),

    // Glass info chip (price) — bottom-right
    glassLayer(uid(), 'F: Price Glass', 'front', 70, 73, 24, 12, 4, 'accent', 8, 0.22, 0.4, 8),
    slotLayer(uid(), 'Price', 'front', 72, 74.5, 20, 9, 11, 'body', '$399',
      { color: '#ffffff', fontSize: '15px', fontWeight: 700, textAlign: 'center' }),

    // Click hint
    vecLayer(uid(), 'F: Hint Bg', 'front', 25, 92, 50, 5.5, 3, 'accent',
      rrp(25, 92, 50, 5.5, 3),
      solid('#ffffff', 0.12)
    ),
    slotLayer(uid(), 'Hint', 'front', 26, 92.5, 48, 4.5, 10, 'badge', 'CLICK TO REVEAL',
      { color: '#e2e8f0', fontSize: '9px', fontWeight: 600, textAlign: 'center' }),

    // ── BACK ─────────────────────────────────────────────────────────────────
    // Photo persists on back too, heavily blurred via dark overlay
    imgLayer(uid(), 'B: Photo Blur', 'back', 0, 0, 100, 100, 1, 'background', PHOTO),
    vecLayer(uid(), 'B: Dark Overlay', 'back', 0, 0, 100, 100, 2, 'overlay',
      rect(0, 0, 100, 100),
      solid('#0b1219', 0.92)
    ),
    // Teal accent strip at top
    vecLayer(uid(), 'B: Accent Strip', 'back', 0, 0, 100, 1.5, 3, 'accent',
      rect(0, 0, 100, 1.5),
      grad(90, [{ pos: 0, color: '#10b981' }, { pos: 100, color: '#06b6d4' }])
    ),
    // Thin divider line
    vecLayer(uid(), 'B: Divider', 'back', 6, 44, 88, 0.3, 3, 'structure',
      `M6,44 H94`, [], { color: '#2d4a3e', opacity: 0.8, width: 0.3, cap: 'round', join: 'round' }
    ),
    // Back face content
    slotLayer(uid(), 'B: Eyebrow', 'back', 6, 6, 88, 6, 10, 'badge', 'EXPEDITION DETAILS',
      { color: '#10b981', fontSize: '10px', fontWeight: 700, textAlign: 'left' }),
    slotLayer(uid(), 'B: Title', 'back', 6, 14, 88, 14, 10, 'title', 'Summit Expedition',
      { color: '#f8fafc', fontSize: '20px', fontWeight: 800 }),
    slotLayer(uid(), 'B: Body', 'back', 6, 32, 88, 30, 10, 'body',
      '• 7 days guided trek\n• All equipment included\n• Altitude acclimatisation\n• Summit certificate',
      { color: '#94a3b8', fontSize: '13px', lineHeight: '1.7' }),
    slotLayer(uid(), 'B: CTA', 'back', 12, 80, 76, 12, 10, 'action', 'Book This Expedition',
      { buttonVariant: 'filled', color: '#ffffff' }),
  ]

  return {
    name: 'Wilderness — Photo Flip Card',
    elementType: 'adventure-card',
    canvasWidth: 280, canvasHeight: 380,
    layers,
    flipCard: j({
      enabled: true, animType: 'flip3d', trigger: 'click',
      axis: 'y', perspective: 1200, duration: 700, ease: 'easeInOut',
    }),
    states: [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD B: "Vapor" — Product reveal · swing · hover
// Front: White card + real sneaker photo (top half) + product info
// Back:  Vibrant crimson gradient + features + CTA
// ─────────────────────────────────────────────────────────────────────────────

function buildVaporCard() {
  // Bold sneaker from Unsplash
  const SHOE = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=560&h=440&fit=crop&q=85'

  const layers = [
    // ── FRONT ────────────────────────────────────────────────────────────────
    // Clean white card background
    vecLayer(uid(), 'F: White Bg', 'front', 0, 0, 100, 100, 0, 'background',
      rrp(0, 0, 100, 100, 0), solid('#ffffff')
    ),
    // Sneaker photo fills top 58%
    imgLayer(uid(), 'F: Sneaker', 'front', 0, 0, 100, 58, 2, 'structure', SHOE),
    // Soft gradient fade at photo bottom (into white)
    vecLayer(uid(), 'F: Photo Fade', 'front', 0, 48, 100, 12, 3, 'overlay',
      rect(0, 48, 100, 12),
      grad(180, [{ pos: 0, color: '#ffffff', opacity: 0 }, { pos: 100, color: '#ffffff', opacity: 1 }])
    ),
    // Coral new-arrival pill (top-right corner)
    vecLayer(uid(), 'F: New Bg', 'front', 66, 4, 28, 6.5, 5, 'accent',
      rrp(66, 4, 28, 6.5, 3.5), solid('#ef4444', 0.95)
    ),
    slotLayer(uid(), 'Badge', 'front', 67, 4.5, 26, 5.5, 10, 'badge', 'NEW SEASON',
      { color: '#ffffff', fontSize: '9px', fontWeight: 700, textAlign: 'center' }),

    // Product info in white zone (bottom 42%)
    slotLayer(uid(), 'Brand', 'front', 6, 61, 55, 6, 10, 'badge', 'VAPOR SERIES',
      { color: '#94a3b8', fontSize: '10px', fontWeight: 600 }),
    slotLayer(uid(), 'Title', 'front', 6, 67, 88, 11, 10, 'title', 'Air Glide Pro',
      { color: '#0f172a', fontSize: '18px', fontWeight: 800 }),
    slotLayer(uid(), 'Price', 'front', 6, 78, 44, 8, 10, 'body', '$189',
      { color: '#ef4444', fontSize: '17px', fontWeight: 700 }),
    slotLayer(uid(), 'Was Price', 'front', 50, 79.5, 38, 6, 10, 'body', 'was $240',
      { color: '#cbd5e1', fontSize: '12px', fontWeight: 400 }),
    // Thin separator
    vecLayer(uid(), 'F: Sep', 'front', 6, 88.5, 88, 0.3, 3, 'structure',
      `M6,88.5 H94`, [], { color: '#e2e8f0', opacity: 1, width: 0.3, cap: 'round', join: 'round' }
    ),
    slotLayer(uid(), 'Hover Hint', 'front', 6, 91, 88, 6, 10, 'badge', '↑ Hover to explore specs',
      { color: '#94a3b8', fontSize: '10px', fontWeight: 400, textAlign: 'center' }),

    // ── BACK ─────────────────────────────────────────────────────────────────
    vecLayer(uid(), 'B: Gradient Bg', 'back', 0, 0, 100, 100, 0, 'background',
      rrp(0, 0, 100, 100, 0),
      grad(135, [{ pos: 0, color: '#7f1d1d' }, { pos: 45, color: '#dc2626' }, { pos: 100, color: '#f97316' }])
    ),
    // Abstract speed line (decorative)
    vecLayer(uid(), 'B: Line 1', 'back', -10, 30, 60, 0.5, 2, 'accent',
      `M-10,30 L50,30`, [],
      { color: '#ffffff', opacity: 0.12, width: 0.5, cap: 'round', join: 'round' }
    ),
    vecLayer(uid(), 'B: Line 2', 'back', -10, 38, 70, 0.5, 2, 'accent',
      `M-10,38 L60,38`, [],
      { color: '#ffffff', opacity: 0.08, width: 0.5, cap: 'round', join: 'round' }
    ),
    vecLayer(uid(), 'B: Line 3', 'back', -10, 46, 50, 0.5, 2, 'accent',
      `M-10,46 L40,46`, [],
      { color: '#ffffff', opacity: 0.05, width: 0.5, cap: 'round', join: 'round' }
    ),
    // Urgency pill
    vecLayer(uid(), 'B: Urgency Bg', 'back', 6, 7, 36, 6.5, 3, 'accent',
      rrp(6, 7, 36, 6.5, 3.5), solid('#ffffff', 0.15)
    ),
    slotLayer(uid(), 'B: Urgency', 'back', 7, 7.5, 34, 5.5, 10, 'badge', '🔥 ONLY 3 LEFT',
      { color: '#fef2f2', fontSize: '10px', fontWeight: 700, textAlign: 'center' }),
    slotLayer(uid(), 'B: Title', 'back', 6, 17, 88, 10, 10, 'title', 'Air Glide Pro',
      { color: '#ffffff', fontSize: '20px', fontWeight: 800 }),
    slotLayer(uid(), 'B: Features', 'back', 6, 30, 88, 40, 10, 'body',
      '✓ Responsive foam cushioning\n✓ Carbon fibre plate\n✓ Engineered mesh upper\n✓ 12mm heel-to-toe drop\n✓ Weight: 198g',
      { color: '#fecaca', fontSize: '13px', lineHeight: '1.7' }),
    slotLayer(uid(), 'B: CTA', 'back', 12, 81, 76, 12, 10, 'action', 'Add to Cart — $189',
      { buttonVariant: 'filled', color: '#dc2626' }),
  ]

  return {
    name: 'Vapor — Product Reveal Card',
    elementType: 'product-card',
    canvasWidth: 280, canvasHeight: 380,
    layers,
    flipCard: j({
      enabled: true, animType: 'swing', trigger: 'hover',
      axis: 'y', direction: 'right', perspective: 900, duration: 550, ease: 'easeInOut',
    }),
    states: [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD C: "Signal" — Neon stats · scalefade · auto (6s)
// Front: Jet black + neon magenta ring + giant stat + live indicator
// Back:  Dark purple + horizontal bar chart shapes + breakdown
// ─────────────────────────────────────────────────────────────────────────────

function buildSignalCard() {
  const layers = [
    // ── FRONT ────────────────────────────────────────────────────────────────
    // Deep space black background
    vecLayer(uid(), 'F: Black Bg', 'front', 0, 0, 100, 100, 0, 'background',
      rrp(0, 0, 100, 100, 0),
      grad(135, [{ pos: 0, color: '#050508' }, { pos: 100, color: '#0d0d1a' }])
    ),
    // Neon outer ring (large, centered, clipped)
    vecLayer(uid(), 'F: Ring Outer', 'front', 14, 12, 72, 55, 1, 'accent',
      circ(50, 38, 36),
      [], { color: '#e879f9', opacity: 0.22, width: 0.7, cap: 'round', join: 'round' }
    ),
    // Neon inner ring (slightly smaller, brighter)
    vecLayer(uid(), 'F: Ring Inner', 'front', 22, 18, 56, 43, 2, 'accent',
      circ(50, 38, 28),
      [], { color: '#e879f9', opacity: 0.45, width: 0.4, cap: 'round', join: 'round' }
    ),
    // Magenta glow fill (very subtle, inside ring)
    vecLayer(uid(), 'F: Glow', 'front', 26, 22, 48, 36, 1, 'accent',
      circ(50, 38, 22),
      [{ id: uid(), type: 'radial-gradient', opacity: 1, blendMode: 'normal',
        gradient: { stops: [
          { color: '#e879f9', opacity: 0.12, position: 0 },
          { color: '#e879f9', opacity: 0,    position: 100 },
        ], origin: { x: 50, y: 50 } }
      }]
    ),
    // Live dot
    vecLayer(uid(), 'F: Live Dot', 'front', 46, 59, 8, 4, 3, 'accent',
      circ(50, 61, 2), solid('#4ade80', 0.9)
    ),

    slotLayer(uid(), 'F: Eyebrow', 'front', 10, 6, 80, 6, 10, 'badge', 'SYSTEM HEALTH',
      { color: '#a78bfa', fontSize: '10px', fontWeight: 700, textAlign: 'center' }),
    slotLayer(uid(), 'F: BigNum', 'front', 10, 24, 80, 24, 10, 'title', '99.7%',
      { color: '#ffffff', fontSize: '34px', fontWeight: 900, textAlign: 'center' }),
    slotLayer(uid(), 'F: Metric', 'front', 10, 47, 80, 7, 10, 'body', 'Global Uptime',
      { color: '#c4b5fd', fontSize: '12px', fontWeight: 400, textAlign: 'center' }),
    // Live status label
    slotLayer(uid(), 'F: Live', 'front', 35, 60, 30, 4, 10, 'badge', '● LIVE',
      { color: '#4ade80', fontSize: '9.5px', fontWeight: 700, textAlign: 'center' }),
    // Two mini stats bottom
    slotLayer(uid(), 'F: Stat1', 'front', 6, 69, 42, 18, 10, 'body', '4.2ms\nLatency',
      { color: '#e2e8f0', fontSize: '13px', fontWeight: 700, textAlign: 'center' }),
    slotLayer(uid(), 'F: Stat2', 'front', 52, 69, 42, 18, 10, 'body', '12.4k\nReq/min',
      { color: '#e2e8f0', fontSize: '13px', fontWeight: 700, textAlign: 'center' }),
    // Vertical divider between stats
    vecLayer(uid(), 'F: V Div', 'front', 49.5, 70, 1, 16, 3, 'structure',
      `M50,70 V86`, [], { color: '#3f3f6e', opacity: 0.8, width: 0.5, cap: 'round', join: 'round' }
    ),
    slotLayer(uid(), 'F: AutoHint', 'front', 25, 91, 50, 5, 10, 'badge', '◈ AUTO-CYCLING',
      { color: '#6366f1', fontSize: '9px', fontWeight: 700, textAlign: 'center' }),

    // ── BACK ─────────────────────────────────────────────────────────────────
    vecLayer(uid(), 'B: Dark Bg', 'back', 0, 0, 100, 100, 0, 'background',
      rrp(0, 0, 100, 100, 0),
      grad(135, [{ pos: 0, color: '#12043b' }, { pos: 100, color: '#0d0d2e' }])
    ),
    // Top accent line
    vecLayer(uid(), 'B: Accent Line', 'back', 0, 0, 100, 0.8, 1, 'accent',
      rect(0, 0, 100, 0.8),
      grad(90, [{ pos: 0, color: '#7c3aed' }, { pos: 50, color: '#e879f9' }, { pos: 100, color: '#7c3aed' }])
    ),
    // Horizontal bar chart shapes
    vecLayer(uid(), 'B: Bar1 Bg', 'back', 6, 28, 88, 5, 2, 'structure',
      rrp(6, 28, 88, 5, 2.5), solid('#1e1b4b', 0.8)
    ),
    vecLayer(uid(), 'B: Bar1 Fill', 'back', 6, 28, 80, 5, 3, 'accent',
      rrp(6, 28, 80, 5, 2.5),
      grad(90, [{ pos: 0, color: '#7c3aed' }, { pos: 100, color: '#e879f9' }])
    ),
    vecLayer(uid(), 'B: Bar2 Bg', 'back', 6, 38, 88, 5, 2, 'structure',
      rrp(6, 38, 88, 5, 2.5), solid('#1e1b4b', 0.8)
    ),
    vecLayer(uid(), 'B: Bar2 Fill', 'back', 6, 38, 64, 5, 3, 'accent',
      rrp(6, 38, 64, 5, 2.5),
      grad(90, [{ pos: 0, color: '#7c3aed' }, { pos: 100, color: '#a78bfa' }])
    ),
    vecLayer(uid(), 'B: Bar3 Bg', 'back', 6, 48, 88, 5, 2, 'structure',
      rrp(6, 48, 88, 5, 2.5), solid('#1e1b4b', 0.8)
    ),
    vecLayer(uid(), 'B: Bar3 Fill', 'back', 6, 48, 92, 5, 3, 'accent',
      rrp(6, 48, 92, 5, 2.5),
      grad(90, [{ pos: 0, color: '#7c3aed' }, { pos: 100, color: '#c4b5fd' }])
    ),
    vecLayer(uid(), 'B: Bar4 Bg', 'back', 6, 58, 88, 5, 2, 'structure',
      rrp(6, 58, 88, 5, 2.5), solid('#1e1b4b', 0.8)
    ),
    vecLayer(uid(), 'B: Bar4 Fill', 'back', 6, 58, 74, 5, 3, 'accent',
      rrp(6, 58, 74, 5, 2.5),
      grad(90, [{ pos: 0, color: '#7c3aed' }, { pos: 100, color: '#818cf8' }])
    ),
    slotLayer(uid(), 'B: Title', 'back', 6, 6, 88, 8, 10, 'title', 'Performance Metrics',
      { color: '#f8fafc', fontSize: '16px', fontWeight: 700 }),
    slotLayer(uid(), 'B: Label1', 'back', 6, 19, 50, 5, 10, 'badge', 'API Response',
      { color: '#a78bfa', fontSize: '10px', fontWeight: 600 }),
    slotLayer(uid(), 'B: Pct1', 'back', 78, 19, 18, 5, 10, 'badge', '99.1%',
      { color: '#c4b5fd', fontSize: '10px', fontWeight: 700, textAlign: 'right' }),
    slotLayer(uid(), 'B: Label2', 'back', 6, 29, 50, 5, 10, 'badge', 'Edge Network',
      { color: '#a78bfa', fontSize: '10px', fontWeight: 600 }),
    slotLayer(uid(), 'B: Pct2', 'back', 78, 29, 18, 5, 10, 'badge', '98.4%',
      { color: '#c4b5fd', fontSize: '10px', fontWeight: 700, textAlign: 'right' }),
    slotLayer(uid(), 'B: Label3', 'back', 6, 39, 50, 5, 10, 'badge', 'Database',
      { color: '#a78bfa', fontSize: '10px', fontWeight: 600 }),
    slotLayer(uid(), 'B: Pct3', 'back', 78, 39, 18, 5, 10, 'badge', '99.9%',
      { color: '#c4b5fd', fontSize: '10px', fontWeight: 700, textAlign: 'right' }),
    slotLayer(uid(), 'B: Label4', 'back', 6, 49, 50, 5, 10, 'badge', 'Media CDN',
      { color: '#a78bfa', fontSize: '10px', fontWeight: 600 }),
    slotLayer(uid(), 'B: Pct4', 'back', 78, 49, 18, 5, 10, 'badge', '97.8%',
      { color: '#c4b5fd', fontSize: '10px', fontWeight: 700, textAlign: 'right' }),
    slotLayer(uid(), 'B: Footnote', 'back', 6, 68, 88, 8, 10, 'body',
      'Monitored 24 / 7 · 30-day rolling average',
      { color: '#6366f1', fontSize: '10px', textAlign: 'center' }),
    slotLayer(uid(), 'B: CTA', 'back', 14, 79, 72, 12, 10, 'action', 'Open Dashboard',
      { buttonVariant: 'outline', color: '#a78bfa' }),
  ]

  return {
    name: 'Signal — Neon Stats Card',
    elementType: 'stats-card',
    canvasWidth: 280, canvasHeight: 380,
    layers,
    flipCard: j({
      enabled: true, animType: 'scalefade', trigger: 'auto',
      duration: 600, ease: 'easeInOut', autoInterval: 5500,
    }),
    states: [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (!admin) throw new Error('No SUPER_ADMIN user found — run db:seed first')

  // ── Delete old v2 cards ───────────────────────────────────────────────────
  const oldCards = await prisma.voltElement.findMany({
    where: { name: { in: [
      'Pricing Flip Card — Click',
      'Product Reveal — Hover Swing',
      'Stats Rotator — Auto Slide',
    ] } },
  })
  if (oldCards.length > 0) {
    await prisma.voltElement.deleteMany({ where: { id: { in: oldCards.map(c => c.id) } } })
    console.log(`🗑   Deleted ${oldCards.length} old v2 cards`)
  }

  // ── Create v3 cards ───────────────────────────────────────────────────────
  console.log('🎨  Creating 3 v3 Volt card designs...')
  const cardAData = buildWildernessCard()
  const cardBData = buildVaporCard()
  const cardCData = buildSignalCard()

  const [cardA, cardB, cardC] = await Promise.all([
    prisma.voltElement.create({
      data: {
        name: cardAData.name, elementType: cardAData.elementType,
        isPublic: true, authorId: admin.id,
        canvasWidth: cardAData.canvasWidth, canvasHeight: cardAData.canvasHeight,
        layers: j(cardAData.layers), slots: j([]),
        states: j(cardAData.states), flipCard: cardAData.flipCard,
      },
    }),
    prisma.voltElement.create({
      data: {
        name: cardBData.name, elementType: cardBData.elementType,
        isPublic: true, authorId: admin.id,
        canvasWidth: cardBData.canvasWidth, canvasHeight: cardBData.canvasHeight,
        layers: j(cardBData.layers), slots: j([]),
        states: j(cardBData.states), flipCard: cardBData.flipCard,
      },
    }),
    prisma.voltElement.create({
      data: {
        name: cardCData.name, elementType: cardCData.elementType,
        isPublic: true, authorId: admin.id,
        canvasWidth: cardCData.canvasWidth, canvasHeight: cardCData.canvasHeight,
        layers: j(cardCData.layers), slots: j([]),
        states: j(cardCData.states), flipCard: cardCData.flipCard,
      },
    }),
  ])

  console.log(`  ✅ Card A: ${cardA.name} (${cardA.id})`)
  console.log(`  ✅ Card B: ${cardB.name} (${cardB.id})`)
  console.log(`  ✅ Card C: ${cardC.name} (${cardC.id})`)

  // ── Update / rename the WOW Demo section ─────────────────────────────────
  const wowSection = await prisma.section.findFirst({
    where: { displayName: { contains: 'Animation Showcase' } },
  })
  if (!wowSection) throw new Error('Animation Showcase section not found')

  const footer = await prisma.section.findFirst({
    where: { type: 'FOOTER', pageId: wowSection.pageId },
    orderBy: { order: 'desc' },
  })

  console.log(`\n📦  Updating section: "${wowSection.displayName}" (order ${wowSection.order})`)
  if (footer) console.log(`    Footer is at order ${footer.order} — safely before it ✓`)

  await prisma.section.update({
    where: { id: wowSection.id },
    data: {
      displayName: 'Volt Studio — Card Showcase',
      background: '#070711',
      content: j({
        designerData: {
          layoutType: 'flexible',
          grid: { cols: 3, rows: 4, gap: 40 },
          blocks: [
            // ── Row 1: Section heading ─────────────────────────────────────
            {
              id: 10, type: 'text',
              position: { row: 1, col: 1, colSpan: 3 },
              props: { textAlign: 'center', paddingTop: 24, paddingBottom: 8 },
              subElements: [
                {
                  type: 'heading',
                  props: {
                    text: 'VOLT STUDIO',
                    color: '#a78bfa', fontSize: 11, fontWeight: '800',
                    letterSpacing: 5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16,
                  },
                },
                {
                  type: 'heading',
                  props: {
                    text: 'Three cards. Three worlds.',
                    color: '#f8fafc', fontSize: 36, fontWeight: '900',
                    lineHeight: 1.1, textAlign: 'center', marginBottom: 14,
                  },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Each built entirely in Volt Studio. Click the first, hover the second, watch the third cycle on its own.',
                    color: '#64748b', fontSize: 16, textAlign: 'center',
                  },
                },
              ],
            },

            // ── Row 2: Three unique Volt cards ────────────────────────────
            {
              id: 21, type: 'volt',
              position: { row: 2, col: 1 },
              props: {
                voltId: cardA.id,
                slots: {
                  title: 'Summit Expedition',
                  body: '7 days · 4,200m elevation',
                  badge: 'ADVENTURE',
                  price: '$399',
                  hint: 'CLICK TO REVEAL',
                  'b: eyebrow': 'EXPEDITION DETAILS',
                  'b: title': 'Summit Expedition',
                  'b: body': '• 7 days guided trek\n• All equipment included\n• Altitude acclimatisation\n• Summit certificate',
                  'b: cta': 'Book This Expedition',
                },
              },
            },
            {
              id: 22, type: 'volt',
              position: { row: 2, col: 2 },
              props: {
                voltId: cardB.id,
                slots: {
                  badge: 'NEW SEASON',
                  brand: 'VAPOR SERIES',
                  title: 'Air Glide Pro',
                  price: '$189',
                  'was price': 'was $240',
                  'hover hint': '↑ Hover to explore specs',
                  'b: urgency': '🔥 ONLY 3 LEFT',
                  'b: title': 'Air Glide Pro',
                  'b: features': '✓ Responsive foam cushioning\n✓ Carbon fibre plate\n✓ Engineered mesh upper\n✓ 12mm heel-to-toe drop\n✓ Weight: 198g',
                  'b: cta': 'Add to Cart — $189',
                },
              },
            },
            {
              id: 23, type: 'volt',
              position: { row: 2, col: 3 },
              props: {
                voltId: cardC.id,
                slots: {
                  'f: eyebrow': 'SYSTEM HEALTH',
                  'f: bignum': '99.7%',
                  'f: metric': 'Global Uptime',
                  'f: live': '● LIVE',
                  'f: stat1': '4.2ms\nLatency',
                  'f: stat2': '12.4k\nReq/min',
                  'f: autohint': '◈ AUTO-CYCLING',
                  'b: title': 'Performance Metrics',
                  'b: label1': 'API Response',
                  'b: pct1': '99.1%',
                  'b: label2': 'Edge Network',
                  'b: pct2': '98.4%',
                  'b: label3': 'Database',
                  'b: pct3': '99.9%',
                  'b: label4': 'Media CDN',
                  'b: pct4': '97.8%',
                  'b: footnote': 'Monitored 24 / 7 · 30-day rolling average',
                  'b: cta': 'Open Dashboard',
                },
              },
            },

            // ── Row 3: Animation type captions ────────────────────────────
            {
              id: 31, type: 'text',
              position: { row: 3, col: 1 },
              props: { textAlign: 'center' },
              subElements: [
                {
                  type: 'heading',
                  props: { text: '3D Flip', color: '#f8fafc', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
                },
                {
                  type: 'paragraph',
                  props: { text: 'Click to reveal', color: '#64748b', fontSize: 13, textAlign: 'center' },
                },
              ],
            },
            {
              id: 32, type: 'text',
              position: { row: 3, col: 2 },
              props: { textAlign: 'center' },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Door Swing', color: '#f8fafc', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
                },
                {
                  type: 'paragraph',
                  props: { text: 'Hover to open', color: '#64748b', fontSize: 13, textAlign: 'center' },
                },
              ],
            },
            {
              id: 33, type: 'text',
              position: { row: 3, col: 3 },
              props: { textAlign: 'center' },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Scale Fade', color: '#f8fafc', fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
                },
                {
                  type: 'paragraph',
                  props: { text: 'Auto-cycling', color: '#64748b', fontSize: 13, textAlign: 'center' },
                },
              ],
            },
          ],
        },
      }),
    },
  })

  console.log('\n🎉  Volt Card Showcase updated!')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log(`🔗  Live:   http://localhost:3000`)
  console.log(`✏️   Card A: http://localhost:3000/admin/volt/designer?id=${cardA.id}`)
  console.log(`✏️   Card B: http://localhost:3000/admin/volt/designer?id=${cardB.id}`)
  console.log(`✏️   Card C: http://localhost:3000/admin/volt/designer?id=${cardC.id}`)
  console.log('\nCards:')
  console.log('  A: Wilderness  — Adventure photo + flip3d  + click  — dark/teal')
  console.log('  B: Vapor       — Sneaker photo  + swing    + hover  — white/crimson')
  console.log('  C: Signal      — Neon stats     + scalefade + auto  — black/magenta')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
