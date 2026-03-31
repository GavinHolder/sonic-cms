// @ts-nocheck
/**
 * seed-editorial-demo — Creates a FLEXIBLE section showcasing the Editorial block.
 *
 * The section uses a 2-row grid:
 *
 *   Row 1 (full width) — "Feature Article" editorial block
 *     Long-form article text with a transparent owl PNG as the obstacle.
 *     Alpha hull tracing routes text around the actual owl shape.
 *
 *   Row 2 (2 col) — Two editorial blocks side by side
 *     Left: shorter article with a circular badge-style PNG obstacle
 *     Right: pure typography — no obstacle, demonstrates fluid font + line-height freedom
 *
 * Run: npx tsx scripts/seed-editorial-demo.ts
 *
 * Uses local SVGs in /public/pretext/ — no CORS issues, always available.
 * The owl and badge SVGs have transparent backgrounds so the alpha hull tracer
 * can trace the actual shape silhouette for dramatic text-flow wrapping.
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
function j(o: object): Prisma.InputJsonValue { return o as Prisma.InputJsonValue }

// ── Article copy ──────────────────────────────────────────────────────────────

const FEATURE_ARTICLE = `The most powerful ideas in design often arrive not from adding more, but from understanding flow. When we look at the great editorial layouts of the twentieth century — the magazine spreads, the newspaper broadsheets, the typeset books — we find that the freedom of text was always constrained and shaped by the objects around it.

Text did not simply stop at an image's edge. It reached around it, navigated past it, found the narrowest passages and pushed through. The relationship between word and image was not competition but choreography.

What we have built here is that same choreography, running live in the browser at ninety microseconds per reflow. The text you are reading now knows exactly where it is. It has been measured — not guessed, not approximated — using the same font engine the browser uses to draw it. Every line break is precise. Every gap beside the obstacle is exactly as wide as it appears.

This is the freedom that text layout has been missing from the web. Not the freedom to ignore constraints, but the freedom to work beautifully within them.

The obstacle is not the enemy of the text. It is the partner that gives the text its shape. Remove the image and the words collapse back into a rectangle. Add it back and suddenly the layout has intention. It has movement. It breathes.

Design is the art of making constraints visible as elegance.`

const LEFT_ARTICLE = `Typography has always been the silent language of authority. A well-set page communicates trust before a single word is read. The weight of a serif, the tracking of a headline, the measure of a body column — each decision carries meaning that the reader feels before they consciously process it.

The web has been a poor host for typography for most of its existence. Fonts arrived late, measurement was unreliable, and layout was always a negotiation between what you intended and what the browser would allow. We accepted these limitations as the cost of the medium.

That cost has now been paid. The tools exist to do it properly. Text can be measured before it is painted. Lines can be routed around shapes. Fonts can be loaded and verified before layout begins.

The question is no longer whether good typography is possible on the web. It is whether you care enough to do it.`

const RIGHT_PURE = `There is a particular pleasure in reading text that has been set with care. You do not notice the line lengths or the leading. You simply read, and the reading is easy.

That ease is not accidental. It is the result of decisions made before you arrived — decisions about how wide each line should be, how much space should live between them, which font carries the tone of the content and which would undermine it.

Good typography is invisible. It removes itself from the experience and leaves only the ideas.

What you are seeing here is text without obstacles — pure, uninterrupted flow. The same engine that routes text around shapes also sets this column, measuring every line, breaking at the right moment, choosing the cleanest path from first word to last.

Freedom in design is not the absence of rules. It is mastery of them.

Every line you read was placed by arithmetic. Every break was chosen. Nothing here was guessed.`

// ── Image sources ─────────────────────────────────────────────────────────────
// Local SVGs with transparent backgrounds — guaranteed CORS-safe, always available.
// The alpha hull tracer reads pixel data from these to wrap text around the actual shape.

// Hand-crafted owl SVG — distinct silhouette for dramatic alpha hull wrapping
const OWL_PNG = '/pretext/owl.svg'

// Decorative circular badge SVG — irregular starburst shape for left column
const BOTANICAL_PNG = '/pretext/badge.svg'

// ── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (!admin) throw new Error('No SUPER_ADMIN user found')

  // Find the home/landing page dynamically
  const homePage = await prisma.page.findFirst({
    where: { OR: [{ slug: '/' }, { type: 'LANDING' }] },
    orderBy: { createdAt: 'asc' },
  })
  if (!homePage) throw new Error('No home page found — run db:seed first')
  const homePageId = homePage.id

  // Remove empty FLEXIBLE placeholder sections (content = {}) — left over from
  // the Designer's "New Flexible Section" default. They show as blank screens.
  const emptySections = await prisma.section.findMany({
    where: { pageId: homePageId, type: 'FLEXIBLE', displayName: 'New Flexible Section' },
  })
  for (const s of emptySections) {
    const c = s.content as Record<string, unknown>
    if (!c || Object.keys(c).length === 0) {
      await prisma.section.delete({ where: { id: s.id } })
      console.log(`🗑️  Removed empty placeholder section (${s.id})`)
    }
  }

  // Find footer if it exists; if not, insert at a high order number
  const footer = await prisma.section.findFirst({
    where: { type: 'FOOTER', pageId: homePageId },
    orderBy: { order: 'desc' },
  })

  // Find highest existing order
  const maxOrderSection = await prisma.section.findFirst({
    where: { pageId: homePageId },
    orderBy: { order: 'desc' },
  })
  const maxOrder = maxOrderSection?.order ?? 0

  const existing = await prisma.section.findFirst({
    where: { displayName: { contains: 'Editorial Demo' }, pageId: homePageId },
  })

  // Place before footer if it exists, otherwise at the end
  const targetOrder = footer ? footer.order - 0.5 : maxOrder + 1

  const sectionData = {
    displayName: 'Editorial Demo',
    type: 'FLEXIBLE' as const,
    page:          { connect: { id: homePageId } },
    createdByUser: { connect: { id: admin.id } },
    order: existing ? existing.order : targetOrder,
    background: '#faf9f6',                // warm off-white — classic editorial
    paddingTop: 80,
    paddingBottom: 80,
    content: j({
      contentMode: 'multi',
      designerData: {
        contentMode: 'multi',
        multiLimit: 1,
        layoutType: 'grid',
        gridGap: 40,
        edgePad: 60,
        grid: {
          cols: 2,
          rows: 2,
          gap: 40,

        },
        blocks: [

          // ── Row 1: Feature article — full width ────────────────────────────
          {
            id: 1,
            type: 'editorial',
            position: { row: 1, col: 1, colSpan: 2, rowSpan: 1 },
            props: {
              label: 'Feature Article',
              text: FEATURE_ARTICLE,
              fontFamily: 'Merriweather',
              fontSize: 17,
              lineHeight: 1.75,
              textColor: '#1a1a1a',
              bgColor: 'transparent',
              obstacles: [
                {
                  id: 'obs-owl',
                  src: OWL_PNG,
                  alt: 'Owl illustration',
                  // Positioned right-of-centre, near the top
                  x: 0.62,
                  y: 0.04,
                  width: 0.32,
                  height: 0.55,
                  useAlphaHull: true,
                  padding: 18,
                },
              ],
            },
          },

          // ── Row 2 Left: Short article with botanical obstacle ───────────────
          {
            id: 2,
            type: 'editorial',
            position: { row: 2, col: 1, colSpan: 1, rowSpan: 1 },
            props: {
              label: 'Typography & Trust',
              text: LEFT_ARTICLE,
              fontFamily: 'Lora',
              fontSize: 15,
              lineHeight: 1.7,
              textColor: '#2d2d2d',
              bgColor: 'transparent',
              obstacles: [
                {
                  id: 'obs-flower',
                  src: BOTANICAL_PNG,
                  alt: 'Decorative badge',
                  // Lower-right corner of the column
                  x: 0.58,
                  y: 0.55,
                  width: 0.38,
                  height: 0.4,
                  useAlphaHull: true,
                  padding: 14,
                },
              ],
            },
          },

          // ── Row 2 Right: Pure typography — no obstacles ─────────────────────
          {
            id: 3,
            type: 'editorial',
            position: { row: 2, col: 2, colSpan: 1, rowSpan: 1 },
            props: {
              label: 'Pure Typography',
              text: RIGHT_PURE,
              fontFamily: 'Playfair Display',
              fontSize: 16,
              lineHeight: 1.9,
              textColor: '#3a3a3a',
              bgColor: 'transparent',
              obstacles: [],              // no obstacles — pure flowing text
            },
          },

        ],
      },
    }),
  }

  if (existing) {
    await prisma.section.update({ where: { id: existing.id }, data: sectionData })
    console.log(`✅  Updated existing Editorial Demo section (${existing.id})`)
  } else {
    const created = await prisma.section.create({ data: sectionData })
    console.log(`✅  Created Editorial Demo section (${created.id}) at order ${targetOrder}`)
  }

  console.log(`
🗞️  Editorial Demo seeded!

Live page:    http://localhost:3000
Admin:        http://localhost:3000/admin/content/landing-page

What you'll see:
  Row 1 — Feature article: text flows around the owl image using alpha hull tracing.
           The text routes around the actual bird silhouette, not its bounding box.

  Row 2L — Typography & Trust: Lora serif, botanical obstacle in the lower-right corner.

  Row 2R — Pure flow: Playfair Display, no obstacles — just fluid, precise typography.

Note: Images are local SVGs (/public/pretext/) — no CORS issues.
      Alpha hull traces the actual owl/badge silhouette shapes.
  `)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
