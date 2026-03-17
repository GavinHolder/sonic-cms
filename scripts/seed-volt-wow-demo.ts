// @ts-nocheck
/**
 * seed-volt-wow-demo — Additive (does NOT wipe DB).
 *
 * Showcases Volt Studio's newest capabilities:
 *   1. Flip Service Card  — CSS 3D front/back hover flip, animated layers on each face
 *   2. Glass Stat Card    — backdrop-filter glass morphism overlay on a vibrant gradient bg
 *
 * Then seeds a FLEXIBLE section "Volt Studio — WOW Demo" with:
 *   • Row 1: Full-width heading block
 *   • Row 2: Three flip cards (service showcase)
 *   • Row 3: Three glass stat cards (feature highlights)
 *
 * Run: npx tsx scripts/seed-volt-wow-demo.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue }
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36) }

// ── SVG path helpers (% coordinate space, 0–100) ────────────────────────────

function roundRectPath(x: number, y: number, w: number, h: number, r = 5): string {
  return [
    `M${x + r},${y}`,
    `H${x + w - r}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `V${y + h - r}`,
    `Q${x + w},${y + h} ${x + w - r},${y + h}`,
    `H${x + r}`,
    `Q${x},${y + h} ${x},${y + h - r}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    'Z',
  ].join(' ')
}

function circlePath(cx: number, cy: number, r: number): string {
  const k = 0.5523
  return [
    `M${cx},${cy - r}`,
    `C${cx + r * k},${cy - r} ${cx + r},${cy - r * k} ${cx + r},${cy}`,
    `C${cx + r},${cy + r * k} ${cx + r * k},${cy + r} ${cx},${cy + r}`,
    `C${cx - r * k},${cy + r} ${cx - r},${cy + r * k} ${cx - r},${cy}`,
    `C${cx - r},${cy - r * k} ${cx - r * k},${cy - r} ${cx},${cy - r}`,
    'Z',
  ].join(' ')
}

function defaultAnim(overrides = {}) {
  return {
    character: 50, speed: 50, style: 60, delay: 0,
    animates: { opacity: false, scale: false, position: false, rotation: false, fill: false },
    ...overrides,
  }
}

// ── Flip Service Card ─────────────────────────────────────────────────────────
// Canvas 300×380. Front: dark indigo. Back: white reveal with CTA.

function buildFlipServiceCard() {
  // Front face layer IDs
  const frontBgId     = uid()
  const frontCircleId = uid()
  const frontDotId    = uid()
  const frontIconId   = uid()
  const frontTitleId  = uid()
  const frontBodyId   = uid()
  const frontHintId   = uid()

  // Back face layer IDs
  const backBgId      = uid()
  const backBarId     = uid()
  const backTitleId   = uid()
  const backDetailId  = uid()
  const backActionId  = uid()

  const layers = [
    // ── FRONT FACE ──────────────────────────────────────────────────────────

    // Front background — dark indigo gradient
    {
      id: frontBgId, name: 'Front BG', type: 'vector', role: 'structure', face: 'front',
      x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      vectorData: {
        pathData: roundRectPath(0, 0, 100, 100, 6),
        fills: [{
          id: uid(), type: 'linear-gradient', opacity: 1, blendMode: 'normal',
          gradient: {
            stops: [
              { color: '#1e1b4b', opacity: 1, position: 0 },
              { color: '#312e81', opacity: 1, position: 100 },
            ],
            angle: 145,
          },
        }],
        closed: true,
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: false, rotation: false, fill: false } }),
    },

    // Front accent circle — top-right decorative orb
    {
      id: frontCircleId, name: 'Front Accent Orb', type: 'vector', role: 'accent', face: 'front',
      x: 62, y: -18, width: 52, height: 44, rotation: 0, zIndex: 2,
      visible: true, locked: false, opacity: 0.55, blendMode: 'normal',
      vectorData: {
        pathData: circlePath(88, 4, 24),
        fills: [{ id: uid(), type: 'solid', color: '#a78bfa', opacity: 1, blendMode: 'normal' }],
        closed: true,
      },
      animation: defaultAnim({
        animates: { opacity: true, scale: true, position: false, rotation: false, fill: false },
        speed: 60, delay: 5,
      }),
    },

    // Front bottom-left small dot
    {
      id: frontDotId, name: 'Front Dot', type: 'vector', role: 'accent', face: 'front',
      x: -4, y: 78, width: 20, height: 17, rotation: 0, zIndex: 2,
      visible: true, locked: false, opacity: 0.35, blendMode: 'normal',
      vectorData: {
        pathData: circlePath(6, 88, 10),
        fills: [{ id: uid(), type: 'solid', color: '#c4b5fd', opacity: 1, blendMode: 'normal' }],
        closed: true,
      },
      animation: defaultAnim({ delay: 10 }),
    },

    // Front icon slot — centred
    {
      id: frontIconId, name: 'Front Icon', type: 'slot', role: 'content', face: 'front',
      x: 35, y: 14, width: 30, height: 22, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'icon', slotLabel: 'Icon', contentFieldHint: 'icon',
        fontSize: '2.4rem', color: '#c4b5fd', textAlign: 'center',
      },
      animation: defaultAnim({ animates: { opacity: true, scale: true, position: false, rotation: false, fill: false }, delay: 8 }),
    },

    // Front title slot
    {
      id: frontTitleId, name: 'Front Title', type: 'slot', role: 'content', face: 'front',
      x: 8, y: 40, width: 84, height: 11, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'title', slotLabel: 'Title', contentFieldHint: 'title',
        fontSize: '1.05rem', fontWeight: 700, color: '#f5f3ff', textAlign: 'center',
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: true, rotation: false, fill: false }, delay: 12 }),
    },

    // Front body slot
    {
      id: frontBodyId, name: 'Front Body', type: 'slot', role: 'content', face: 'front',
      x: 10, y: 54, width: 80, height: 24, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'body', slotLabel: 'Body', contentFieldHint: 'body',
        fontSize: '0.8rem', fontWeight: 400, color: '#c4b5fd', textAlign: 'center',
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: false, rotation: false, fill: false }, delay: 16 }),
    },

    // Front flip hint chevron bar
    {
      id: frontHintId, name: 'Flip Hint', type: 'vector', role: 'overlay', face: 'front',
      x: 38, y: 91, width: 24, height: 2, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 0.4, blendMode: 'normal',
      vectorData: {
        pathData: 'M38,92 H62',
        fills: [{ id: uid(), type: 'solid', color: '#a78bfa', opacity: 1, blendMode: 'normal' }],
        stroke: { color: '#a78bfa', opacity: 0.6, width: 1.5, align: 'center', cap: 'round', join: 'round' },
        closed: false,
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: false, rotation: false, fill: false }, delay: 20 }),
    },

    // ── BACK FACE ────────────────────────────────────────────────────────────

    // Back background — clean white
    {
      id: backBgId, name: 'Back BG', type: 'vector', role: 'structure', face: 'back',
      x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      vectorData: {
        pathData: roundRectPath(0, 0, 100, 100, 6),
        fills: [{ id: uid(), type: 'solid', color: '#ffffff', opacity: 1, blendMode: 'normal' }],
        closed: true,
      },
      animation: defaultAnim(),
    },

    // Back top colour bar
    {
      id: backBarId, name: 'Back Top Bar', type: 'vector', role: 'accent', face: 'back',
      x: 0, y: 0, width: 100, height: 24, rotation: 0, zIndex: 1,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      vectorData: {
        pathData: [
          `M6,0 H94 Q100,0 100,6 V24 H0 V6 Q0,0 6,0 Z`,
        ].join(' '),
        fills: [{
          id: uid(), type: 'linear-gradient', opacity: 1, blendMode: 'normal',
          gradient: {
            stops: [
              { color: '#4f46e5', opacity: 1, position: 0 },
              { color: '#7c3aed', opacity: 1, position: 100 },
            ],
            angle: 90,
          },
        }],
        closed: true,
      },
      animation: defaultAnim(),
    },

    // Back title slot
    {
      id: backTitleId, name: 'Back Title', type: 'slot', role: 'content', face: 'back',
      x: 8, y: 26, width: 84, height: 10, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'title', slotLabel: 'Title', contentFieldHint: 'title',
        fontSize: '1.05rem', fontWeight: 700, color: '#1e1b4b', textAlign: 'center',
      },
      animation: defaultAnim(),
    },

    // Back detail body slot
    {
      id: backDetailId, name: 'Back Detail', type: 'slot', role: 'content', face: 'back',
      x: 8, y: 40, width: 84, height: 36, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'body', slotLabel: 'Detail', contentFieldHint: 'body',
        fontSize: '0.8rem', fontWeight: 400, color: '#4b5563', textAlign: 'center',
      },
      animation: defaultAnim(),
    },

    // Back action slot
    {
      id: backActionId, name: 'Back Action', type: 'slot', role: 'content', face: 'back',
      x: 18, y: 82, width: 64, height: 9, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'action', slotLabel: 'Action', contentFieldHint: 'action',
        fontSize: '0.82rem', color: '#ffffff', textAlign: 'center', buttonVariant: 'filled',
      },
      animation: defaultAnim(),
    },
  ]

  // Hover state — front face orb lifts slightly (flip handles the main reveal)
  const states = [
    {
      id: uid(),
      name: 'hover',
      trigger: 'mouseenter',
      layerOverrides: {
        [frontCircleId]: { scale: 1.15, translateX: 4, translateY: -4, opacity: 0.75 },
        [frontDotId]:    { scale: 1.3, opacity: 0.55 },
        [frontIconId]:   { scale: 1.08 },
      },
    },
  ]

  const flipCard = {
    enabled: true,
    axis: 'y',
    duration: 600,
    ease: 'easeInOut',
  }

  return { layers, states, flipCard, canvasWidth: 300, canvasHeight: 380 }
}

// ── Glass Stat Card ───────────────────────────────────────────────────────────
// Canvas 300×200. Vibrant gradient bg + glass morphism panel overlay.

function buildGlassStatCard() {
  const bgId     = uid()
  const bigOrbId = uid()
  const smOrbId  = uid()
  const glassId  = uid()
  const titleId  = uid()
  const bodyId   = uid()
  const badgeId  = uid()

  const layers = [
    // Background — vibrant emerald/teal gradient
    {
      id: bgId, name: 'BG Gradient', type: 'vector', role: 'structure',
      x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      vectorData: {
        pathData: roundRectPath(0, 0, 100, 100, 6),
        fills: [{
          id: uid(), type: 'linear-gradient', opacity: 1, blendMode: 'normal',
          gradient: {
            stops: [
              { color: '#059669', opacity: 1, position: 0 },
              { color: '#0d9488', opacity: 1, position: 100 },
            ],
            angle: 135,
          },
        }],
        closed: true,
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: false, rotation: false, fill: false } }),
    },

    // Large decorative orb — top-left (off-canvas bleed)
    {
      id: bigOrbId, name: 'Big Orb', type: 'vector', role: 'accent',
      x: -20, y: -30, width: 70, height: 80, rotation: 0, zIndex: 1,
      visible: true, locked: false, opacity: 0.25, blendMode: 'normal',
      vectorData: {
        pathData: circlePath(15, 10, 36),
        fills: [{ id: uid(), type: 'solid', color: '#ffffff', opacity: 1, blendMode: 'normal' }],
        closed: true,
      },
      animation: defaultAnim({ animates: { opacity: true, scale: true, position: false, rotation: false, fill: false }, delay: 5 }),
    },

    // Small accent orb — bottom-right
    {
      id: smOrbId, name: 'Small Orb', type: 'vector', role: 'accent',
      x: 74, y: 60, width: 38, height: 50, rotation: 0, zIndex: 1,
      visible: true, locked: false, opacity: 0.2, blendMode: 'normal',
      vectorData: {
        pathData: circlePath(93, 80, 18),
        fills: [{ id: uid(), type: 'solid', color: '#ffffff', opacity: 1, blendMode: 'normal' }],
        closed: true,
      },
      animation: defaultAnim({ delay: 10 }),
    },

    // Glass morphism panel overlay — lower 52% of card
    {
      id: glassId, name: 'Glass Panel', type: 'vector', role: 'overlay',
      x: 6, y: 40, width: 88, height: 52, rotation: 0, zIndex: 2,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      vectorData: {
        pathData: roundRectPath(6, 40, 88, 52, 4),
        fills: [{
          id: uid(),
          type: 'glass',
          color: '#ffffff',
          opacity: 0.18,
          blendMode: 'normal',
          blur: 10,
          borderOpacity: 0.35,
          glassBorderRadius: 10,
        }],
        closed: true,
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: false, rotation: false, fill: false }, delay: 8 }),
    },

    // Badge slot — top-left label
    {
      id: badgeId, name: 'Badge', type: 'slot', role: 'content',
      x: 8, y: 8, width: 32, height: 10, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'badge', slotLabel: 'Badge', contentFieldHint: 'badge',
        fontSize: '0.6rem', fontWeight: 700, color: '#ffffff', textAlign: 'center',
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: false, rotation: false, fill: false } }),
    },

    // Title slot — big stat number
    {
      id: titleId, name: 'Stat Number', type: 'slot', role: 'content',
      x: 10, y: 44, width: 80, height: 18, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'title', slotLabel: 'Stat', contentFieldHint: 'title',
        fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', textAlign: 'left',
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: true, rotation: false, fill: false }, delay: 12 }),
    },

    // Body slot — stat label
    {
      id: bodyId, name: 'Stat Label', type: 'slot', role: 'content',
      x: 10, y: 65, width: 80, height: 20, rotation: 0, zIndex: 10,
      visible: true, locked: false, opacity: 1, blendMode: 'normal',
      slotData: {
        slotType: 'body', slotLabel: 'Label', contentFieldHint: 'body',
        fontSize: '0.78rem', fontWeight: 400, color: 'rgba(255,255,255,0.85)', textAlign: 'left',
      },
      animation: defaultAnim({ animates: { opacity: true, scale: false, position: false, rotation: false, fill: false }, delay: 16 }),
    },
  ]

  // Hover — orbs drift slightly
  const states = [
    {
      id: uid(),
      name: 'hover',
      trigger: 'mouseenter',
      layerOverrides: {
        [bigOrbId]: { scale: 1.1, translateX: -4, translateY: -4, opacity: 0.32 },
        [smOrbId]:  { scale: 1.2, translateX: 3, translateY: 4, opacity: 0.3 },
        [glassId]:  { opacity: 1 },
      },
    },
  ]

  return { layers, states, canvasWidth: 300, canvasHeight: 200 }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding Volt WOW demo (flip card + glass morphism)...')

  const admin = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!admin) { console.error('❌  No users found. Run the main seed first.'); process.exit(1) }

  // ── 1. Create Flip Service Card Volt element ──────────────────────────────
  const flipData = buildFlipServiceCard()
  const flipVolt = await prisma.voltElement.create({
    data: {
      name: 'Flip Service Card',
      description: 'CSS 3D hover flip card. Front: dark indigo service summary. Back: detail + CTA reveal.',
      elementType: 'service-card',
      isPublic: true,
      authorId: admin.id,
      layers:   j(flipData.layers),
      states:   j(flipData.states),
      flipCard: j(flipData.flipCard),
      canvasWidth:  flipData.canvasWidth,
      canvasHeight: flipData.canvasHeight,
      tags: ['flip', 'service', 'hover', '3d', 'demo'],
    },
  })
  console.log(`✅  Flip card created: ${flipVolt.id}`)

  // ── 2. Create Glass Stat Card Volt element ────────────────────────────────
  const glassData = buildGlassStatCard()
  const glassVolt = await prisma.voltElement.create({
    data: {
      name: 'Glass Stat Card',
      description: 'Glass morphism stat card. Vibrant gradient background with backdrop-filter glass panel overlay.',
      elementType: 'stat-card',
      isPublic: true,
      authorId: admin.id,
      layers:   j(glassData.layers),
      states:   j(glassData.states),
      canvasWidth:  glassData.canvasWidth,
      canvasHeight: glassData.canvasHeight,
      tags: ['glass', 'morphism', 'stat', 'hover', 'demo'],
    },
  })
  console.log(`✅  Glass card created: ${glassVolt.id}`)

  // ── 3. Create FLEXIBLE section ────────────────────────────────────────────
  let page = await prisma.page.findFirst({ where: { slug: '/' } })
  if (!page) {
    page = await prisma.page.create({
      data: {
        slug: '/', title: 'Home', type: 'LANDING', status: 'PUBLISHED',
        createdBy: admin.id, publishedAt: new Date(),
      },
    })
    console.log('📄  Created home page')
  }

  const lastSection = await prisma.section.findFirst({
    where: { pageId: page.id },
    orderBy: { order: 'desc' },
  })
  const nextOrder = (lastSection?.order ?? 0) + 1

  const section = await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'FLEXIBLE',
      displayName: 'Volt Studio — WOW Demo',
      order: nextOrder,
      enabled: true,
      createdBy: admin.id,
      background: '#0f172a',
      paddingTop: 80,
      paddingBottom: 96,
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 3, rows: 4, gap: 28 },
          blocks: [
            // Row 1: Section heading
            {
              id: 1, type: 'text',
              position: { row: 1, col: 1, colSpan: 3 },
              props: { textAlign: 'center', paddingTop: 16, paddingBottom: 8 },
              subElements: [
                {
                  type: 'heading',
                  props: {
                    text: 'VOLT STUDIO', fontSize: 11, fontWeight: '700',
                    color: '#818cf8', letterSpacing: 3, textTransform: 'uppercase',
                    textAlign: 'center', marginBottom: 14,
                  },
                },
                {
                  type: 'heading',
                  props: {
                    text: 'Flip cards. Glass morphism. Animated SVG layers.',
                    fontSize: 34, fontWeight: '800', color: '#f8fafc',
                    lineHeight: 1.2, textAlign: 'center', marginBottom: 12,
                  },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Hover the cards below — every effect is designed and animated directly in Volt Studio.',
                    fontSize: 16, color: '#94a3b8', textAlign: 'center',
                  },
                },
              ],
            },

            // Row 2: Three flip cards
            {
              id: 2, type: 'volt',
              position: { row: 2, col: 1 },
              props: {
                voltId: flipVolt.id,
                slots: {
                  icon: '⚡',
                  title: 'Speed & Performance',
                  body: 'Built on Next.js 16 with edge-ready rendering.',
                  actionLabel: 'Learn More',
                  actionHref: '#',
                },
              },
            },
            {
              id: 3, type: 'volt',
              position: { row: 2, col: 2 },
              props: {
                voltId: flipVolt.id,
                slots: {
                  icon: '🎨',
                  title: 'Visual Design Tools',
                  body: 'Design SVG animations, fills, and interactions visually.',
                  actionLabel: 'Explore Designer',
                  actionHref: '#',
                },
              },
            },
            {
              id: 4, type: 'volt',
              position: { row: 2, col: 3 },
              props: {
                voltId: flipVolt.id,
                slots: {
                  icon: '🔲',
                  title: '3D Layer Support',
                  body: 'Drop GLB models directly into your design canvas.',
                  actionLabel: 'See Examples',
                  actionHref: '#',
                },
              },
            },

            // Row 3: Sub-heading for glass cards
            {
              id: 5, type: 'text',
              position: { row: 3, col: 1, colSpan: 3 },
              props: { textAlign: 'center', paddingTop: 20, paddingBottom: 4 },
              subElements: [
                {
                  type: 'heading',
                  props: {
                    text: 'Glass Morphism Stats',
                    fontSize: 22, fontWeight: '700', color: '#e2e8f0',
                    textAlign: 'center',
                  },
                },
              ],
            },

            // Row 4: Three glass stat cards
            {
              id: 6, type: 'volt',
              position: { row: 4, col: 1 },
              props: {
                voltId: glassVolt.id,
                slots: {
                  badge: 'ELEMENTS',
                  title: '12+',
                  body: 'Block types available in the Flexible Designer',
                },
              },
            },
            {
              id: 7, type: 'volt',
              position: { row: 4, col: 2 },
              props: {
                voltId: glassVolt.id,
                slots: {
                  badge: 'VOLT LAYERS',
                  title: '6 Types',
                  body: 'Vector, image, slot, 3D, text-deco, effect layers',
                },
              },
            },
            {
              id: 8, type: 'volt',
              position: { row: 4, col: 3 },
              props: {
                voltId: glassVolt.id,
                slots: {
                  badge: 'ANIMATIONS',
                  title: '∞',
                  body: 'Compose any hover, entrance, or flip animation',
                },
              },
            },
          ],
        },
      }),
    },
  })

  console.log(`✅  Section created (order ${nextOrder}): ${section.id}`)
  console.log('')
  console.log('🎉  Done! Open http://localhost:3000 and scroll to "Volt Studio — WOW Demo".')
  console.log(`🔗  Edit flip card:  http://localhost:3000/admin/volt/designer?id=${flipVolt.id}`)
  console.log(`🔗  Edit glass card: http://localhost:3000/admin/volt/designer?id=${glassVolt.id}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
