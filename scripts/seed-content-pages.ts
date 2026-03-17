// @ts-nocheck
/**
 * seed-content-pages — Additive (does NOT wipe DB).
 *
 * Creates standalone content pages with FLEXIBLE sections:
 *   1. /about  — Company story, mission, stats, team overview
 *   2. /projects — Full project portfolio gallery
 *
 * Also appends a "View All Projects →" CTA button row to the
 * Projects section on the home page, and a "Learn More" row
 * to the About section (if it uses the designer blocks format).
 *
 * Run: npx tsx scripts/seed-content-pages.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue }

async function main() {
  console.log('🌱  Seeding content pages (About, Projects)...')

  const admin = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!admin) { console.error('❌  No users found. Run the main seed first.'); process.exit(1) }

  const home = await prisma.page.findFirst({ where: { slug: '/' } })
  if (!home) { console.error('❌  No home page found.'); process.exit(1) }

  // ── 1. About Page ──────────────────────────────────────────────────────────

  let aboutPage = await prisma.page.findFirst({ where: { slug: 'about' } })
  if (!aboutPage) {
    aboutPage = await prisma.page.create({
      data: {
        slug: 'about',
        title: 'About Us',
        type: 'FULL_PAGE',
        status: 'PUBLISHED',
        enabled: true,
        createdBy: admin.id,
        publishedAt: new Date(),
        metaDescription: 'Learn about our company — our story, mission, and the team behind every pour.',
      },
    })
    console.log(`✅  About page created: ${aboutPage.id}`)
  } else {
    console.log(`ℹ️   About page already exists (${aboutPage.id})`)
  }

  // Check if about page already has sections
  const existingAboutSections = await prisma.section.count({ where: { pageId: aboutPage.id } })
  if (existingAboutSections === 0) {
    await prisma.section.create({
      data: {
        pageId: aboutPage.id,
        type: 'FLEXIBLE',
        displayName: 'About — Story & Stats',
        order: 1,
        enabled: true,
        createdBy: admin.id,
        background: '#ffffff',
        paddingTop: 100,
        paddingBottom: 80,
        content: j({
          designerData: {
            layoutType: 'grid',
            grid: { cols: 2, rows: 4, gap: 32 },
            blocks: [
              // Row 1: Section eyebrow + heading (full width)
              {
                id: 1, type: 'text',
                position: { row: 1, col: 1, colSpan: 2 },
                props: { textAlign: 'center', paddingTop: 0, paddingBottom: 8 },
                subElements: [
                  {
                    type: 'heading',
                    props: {
                      text: 'WHO WE ARE', fontSize: 11, fontWeight: '700',
                      color: '#6366f1', letterSpacing: 3, textTransform: 'uppercase',
                      textAlign: 'center', marginBottom: 14,
                    },
                  },
                  {
                    type: 'heading',
                    props: {
                      text: 'Concrete you can count on — every pour, every time.',
                      fontSize: 36, fontWeight: '800', color: '#1e293b',
                      lineHeight: 1.2, textAlign: 'center', marginBottom: 16,
                    },
                  },
                  {
                    type: 'paragraph',
                    props: {
                      text: 'Founded in the Western Cape, OVB ReadyMix Concrete has been supplying contractors and developers with certified, high-performance concrete for over 15 years. Every batch is cube-tested, every delivery is on time.',
                      fontSize: 17, color: '#64748b', textAlign: 'center',
                    },
                  },
                ],
              },

              // Row 2 Left: Company story text
              {
                id: 2, type: 'text',
                position: { row: 2, col: 1 },
                props: { paddingTop: 8, paddingBottom: 8, paddingX: 8 },
                subElements: [
                  {
                    type: 'heading',
                    props: {
                      text: 'Our Story',
                      fontSize: 24, fontWeight: '700', color: '#1e293b', marginBottom: 16,
                    },
                  },
                  {
                    type: 'paragraph',
                    props: {
                      text: 'What started as a single plant and a borrowed drum mixer has grown into one of the Western Cape\'s most trusted concrete suppliers. We invested early in automated batching technology, rigorous quality control, and a team that actually answers the phone.',
                      fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16,
                    },
                  },
                  {
                    type: 'paragraph',
                    props: {
                      text: 'Today we operate two batching plants, a fleet of transit mixers, and a dedicated pump division — giving contractors the reliability they need for pours of any size, from residential slabs to major commercial projects.',
                      fontSize: 15, color: '#475569', lineHeight: 1.7,
                    },
                  },
                ],
              },

              // Row 2 Right: Site photo
              {
                id: 3, type: 'card',
                position: { row: 2, col: 2 },
                props: {
                  bgImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
                  borderRadius: 12,
                },
              },

              // Row 3: Three stat blocks
              {
                id: 4, type: 'stats',
                position: { row: 3, col: 1 },
                props: {
                  number: '15+',
                  label: 'Years in Business',
                  bgColor: '#f8fafc',
                  textColor: '#1e293b',
                  numberColor: '#4f46e5',
                  borderRadius: 12,
                  paddingTop: 24, paddingBottom: 24, paddingX: 24,
                },
              },
              {
                id: 5, type: 'stats',
                position: { row: 3, col: 2 },
                props: {
                  number: '50,000+',
                  label: 'm³ Delivered',
                  bgColor: '#f8fafc',
                  textColor: '#1e293b',
                  numberColor: '#4f46e5',
                  borderRadius: 12,
                  paddingTop: 24, paddingBottom: 24, paddingX: 24,
                },
              },

              // Row 4: Mission & Values
              {
                id: 6, type: 'text',
                position: { row: 4, col: 1, colSpan: 2 },
                props: { paddingTop: 8, paddingBottom: 8 },
                subElements: [
                  {
                    type: 'heading',
                    props: {
                      text: 'Our Mission',
                      fontSize: 22, fontWeight: '700', color: '#1e293b',
                      textAlign: 'center', marginBottom: 12,
                    },
                  },
                  {
                    type: 'paragraph',
                    props: {
                      text: 'To deliver precisely engineered concrete on time, every time — with full certification and zero excuses. We\'re not just concrete suppliers; we\'re project partners.',
                      fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 1.7,
                    },
                  },
                ],
              },
            ],
          },
        }),
      },
    })

    // FOOTER section for about page
    await prisma.section.create({
      data: {
        pageId: aboutPage.id,
        type: 'CTA',
        displayName: 'Get in Touch',
        order: 999999,
        enabled: true,
        createdBy: admin.id,
        background: '#1e1b4b',
        content: j({
          style: 'centered-cta',
          heading: 'Ready to start your project?',
          subheading: 'Get a quote in under 2 hours. All mix grades available.',
          ctaLabel: 'Request a Quote',
          ctaHref: '/#11002b15-3f14-4a0a-8e26-15748228e0e2',
        }),
      },
    })

    console.log('✅  About page sections created')
  }

  // ── 2. Projects Page ───────────────────────────────────────────────────────

  let projectsPage = await prisma.page.findFirst({ where: { slug: 'projects' } })
  if (!projectsPage) {
    projectsPage = await prisma.page.create({
      data: {
        slug: 'projects',
        title: 'Our Projects',
        type: 'FULL_PAGE',
        status: 'PUBLISHED',
        enabled: true,
        createdBy: admin.id,
        publishedAt: new Date(),
        metaDescription: 'Browse our portfolio of completed concrete projects — residential, commercial, and infrastructure.',
      },
    })
    console.log(`✅  Projects page created: ${projectsPage.id}`)
  } else {
    console.log(`ℹ️   Projects page already exists (${projectsPage.id})`)
  }

  // Get the project volt element ID from the home page projects section
  const homeProjectsSection = await prisma.section.findFirst({
    where: { pageId: home.id, displayName: 'Projects' },
    select: { content: true },
  })
  const homeProjectBlocks = homeProjectsSection?.content?.designerData?.blocks || []
  const projectVoltId = homeProjectBlocks.find((b: any) => b.type === 'volt')?.props?.voltId

  const existingProjectsSections = await prisma.section.count({ where: { pageId: projectsPage.id } })
  if (existingProjectsSections === 0) {
    await prisma.section.create({
      data: {
        pageId: projectsPage.id,
        type: 'FLEXIBLE',
        displayName: 'Projects Gallery',
        order: 1,
        enabled: true,
        createdBy: admin.id,
        background: '#f8fafc',
        paddingTop: 100,
        paddingBottom: 80,
        content: j({
          designerData: {
            layoutType: 'grid',
            grid: { cols: 3, rows: 4, gap: 28 },
            blocks: [
              // Row 1: Heading
              {
                id: 1, type: 'text',
                position: { row: 1, col: 1, colSpan: 3 },
                props: { textAlign: 'center', paddingTop: 0, paddingBottom: 8 },
                subElements: [
                  {
                    type: 'heading',
                    props: {
                      text: 'OUR PROJECTS', fontSize: 11, fontWeight: '700',
                      color: '#6366f1', letterSpacing: 3, textTransform: 'uppercase',
                      textAlign: 'center', marginBottom: 14,
                    },
                  },
                  {
                    type: 'heading',
                    props: {
                      text: 'Delivered with precision across the Western Cape.',
                      fontSize: 34, fontWeight: '800', color: '#1e293b',
                      lineHeight: 1.2, textAlign: 'center', marginBottom: 12,
                    },
                  },
                  {
                    type: 'paragraph',
                    props: {
                      text: 'From high-rise foundations to residential driveways — every project delivered on spec, on time.',
                      fontSize: 16, color: '#64748b', textAlign: 'center',
                    },
                  },
                ],
              },

              // Rows 2-3: Six project cards using the same volt element
              ...(projectVoltId ? [
                {
                  id: 2, type: 'volt',
                  position: { row: 2, col: 1 },
                  props: {
                    voltId: projectVoltId,
                    slotTitle: 'Shopping Centre Parking Slab',
                    slotBadge: 'Cape Town — Nov 2024',
                    slotBody: '2 800 m² reinforced slab. 25MPa mix, 150mm depth. Completed in 3 pours over 5 days.',
                    slotImageUrl: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800&q=80',
                    slotImageAlt: 'Shopping centre parking slab',
                  },
                },
                {
                  id: 3, type: 'volt',
                  position: { row: 2, col: 2 },
                  props: {
                    voltId: projectVoltId,
                    slotTitle: 'Residential Estate Roads',
                    slotBadge: 'Stellenbosch — Aug 2024',
                    slotBody: '4 km of concrete road pavement, 30MPa C3 mix. 3 mm tolerances throughout.',
                    slotImageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
                    slotImageAlt: 'Residential estate concrete roads',
                  },
                },
                {
                  id: 4, type: 'volt',
                  position: { row: 2, col: 3 },
                  props: {
                    voltId: projectVoltId,
                    slotTitle: 'High-Rise Tower Foundations',
                    slotBadge: 'Cape Town CBD — Jun 2024',
                    slotBody: '12-storey building. 1 200 m³ 40MPa mass pour with pump access. Zero cold joints.',
                    slotImageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
                    slotImageAlt: 'High-rise tower foundations',
                  },
                },
                {
                  id: 5, type: 'volt',
                  position: { row: 3, col: 1 },
                  props: {
                    voltId: projectVoltId,
                    slotTitle: 'Warehouse Floor Slab',
                    slotBadge: 'Somerset West — Mar 2024',
                    slotBody: 'Laser-levelled 6 000 m² industrial floor. 32MPa with hardener. FM2 flatness spec.',
                    slotImageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
                    slotImageAlt: 'Warehouse floor slab',
                  },
                },
                {
                  id: 6, type: 'volt',
                  position: { row: 3, col: 2 },
                  props: {
                    voltId: projectVoltId,
                    slotTitle: 'Stormwater Retention Basin',
                    slotBadge: 'Paarl — Jan 2024',
                    slotBody: 'Structural basin with 25MPa waterproofed mix. Integral crystalline additive.',
                    slotImageUrl: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=800&q=80',
                    slotImageAlt: 'Stormwater retention basin',
                  },
                },
                {
                  id: 7, type: 'volt',
                  position: { row: 3, col: 3 },
                  props: {
                    voltId: projectVoltId,
                    slotTitle: 'Bridge Deck Rehabilitation',
                    slotBadge: 'N2 Freeway — Dec 2023',
                    slotBody: 'Overlay pour 35MPa micro-silica mix on N2 overpass. Night work, 6-hour strikes.',
                    slotImageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
                    slotImageAlt: 'Bridge deck rehabilitation',
                  },
                },
              ] : []),

              // Row 4: CTA button row
              {
                id: 10, type: 'text',
                position: { row: 4, col: 1, colSpan: 3 },
                props: { textAlign: 'center', paddingTop: 16, paddingBottom: 8 },
                subElements: [
                  {
                    type: 'paragraph',
                    props: {
                      text: 'Have a project in mind? We\'ll have a quote to you within 2 hours.',
                      fontSize: 17, color: '#64748b', textAlign: 'center', marginBottom: 16,
                    },
                  },
                  {
                    type: 'button',
                    props: {
                      text: 'Request a Quote',
                      navTarget: '/#11002b15-3f14-4a0a-8e26-15748228e0e2',
                      bgColor: '#4f46e5',
                      textColor: '#ffffff',
                      paddingX: 32, paddingY: 14,
                      borderRadius: 8,
                    },
                  },
                ],
              },
            ],
          },
        }),
      },
    })
    console.log('✅  Projects page sections created')
  }

  // ── 3. Add "View All Projects" CTA to home page Projects section ───────────

  const homeProjectsFullSection = await prisma.section.findFirst({
    where: { pageId: home.id, displayName: 'Projects' },
  })

  if (homeProjectsFullSection) {
    const designerData = homeProjectsFullSection.content?.designerData
    if (designerData && typeof designerData === 'object') {
      const blocks = (designerData as any).blocks || []
      // Check if CTA button row already added
      const hasCta = blocks.some((b: any) => b.type === 'text' && b.position?.row >= 3)
      if (!hasCta) {
        const currentRows = (designerData as any).grid?.rows || 2
        const updatedContent = {
          ...homeProjectsFullSection.content,
          designerData: {
            ...designerData,
            grid: { ...(designerData as any).grid, rows: currentRows + 1 },
            blocks: [
              ...blocks,
              {
                id: 99, type: 'text',
                position: { row: currentRows + 1, col: 1, colSpan: (designerData as any).grid?.cols || 3 },
                props: { textAlign: 'center', paddingTop: 8, paddingBottom: 0 },
                subElements: [
                  {
                    type: 'button',
                    props: {
                      text: 'View All Projects →',
                      navTarget: '/projects',
                      bgColor: 'transparent',
                      textColor: '#4f46e5',
                      borderRadius: 8,
                      paddingX: 24, paddingY: 10,
                    },
                  },
                ],
              },
            ],
          },
        }
        await prisma.section.update({
          where: { id: homeProjectsFullSection.id },
          data: { content: j(updatedContent) },
        })
        console.log('✅  "View All Projects" button added to home page Projects section')
      } else {
        console.log('ℹ️   Projects section already has CTA row')
      }
    }
  }

  // ── 4. Add "Learn More About Us" CTA to home page About section ────────────

  const homeAboutSection = await prisma.section.findFirst({
    where: { pageId: home.id, displayName: 'About' },
  })

  if (homeAboutSection) {
    const designerData = homeAboutSection.content?.designerData
    // Only touch if it's using the grid/blocks format
    if (designerData && typeof designerData === 'object' && (designerData as any).layoutType === 'grid') {
      const blocks = (designerData as any).blocks || []
      const hasCta = blocks.some((b: any) => b.props?.subElements?.some((se: any) => se.props?.navTarget === '/about'))
      if (!hasCta) {
        const currentRows = (designerData as any).grid?.rows || 2
        const updatedContent = {
          ...homeAboutSection.content,
          designerData: {
            ...designerData,
            grid: { ...(designerData as any).grid, rows: currentRows + 1 },
            blocks: [
              ...blocks,
              {
                id: 98, type: 'text',
                position: { row: currentRows + 1, col: 1, colSpan: (designerData as any).grid?.cols || 2 },
                props: { textAlign: 'center', paddingTop: 8, paddingBottom: 0 },
                subElements: [
                  {
                    type: 'button',
                    props: {
                      text: 'Learn More About Us →',
                      navTarget: '/about',
                      bgColor: 'transparent',
                      textColor: '#4f46e5',
                      borderRadius: 8,
                      paddingX: 24, paddingY: 10,
                    },
                  },
                ],
              },
            ],
          },
        }
        await prisma.section.update({
          where: { id: homeAboutSection.id },
          data: { content: j(updatedContent) },
        })
        console.log('✅  "Learn More About Us" button added to home page About section')
      } else {
        console.log('ℹ️   About section already has CTA row')
      }
    } else {
      console.log('ℹ️   About section uses legacy format — skipping CTA injection')
    }
  }

  console.log('')
  console.log('🎉  Done!')
  console.log('🔗  About page:    http://localhost:3000/about')
  console.log('🔗  Projects page: http://localhost:3000/projects')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
