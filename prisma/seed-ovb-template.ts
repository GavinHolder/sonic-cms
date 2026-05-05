/**
 * OVB READYMIX TEMPLATE SEED
 *
 * Creates a demo page at /ovb-demo showcasing every new advanced layout geometry
 * feature added in the feat/advanced-layout-geometry sprint:
 *
 *  ✓ Multi-row hero headings (headingRows) with per-row colour
 *  ✓ Hero eyebrow, slide counter, scroll indicator, metaLine
 *  ✓ Section header — split variant with eyebrow + lead
 *  ✓ Section footer row with [em] accent syntax
 *  ✓ Mosaic 12-col grid (mosaicPreset: s-lg, s-md, s-sm, s-tall, s-wide, s-mid)
 *  ✓ Animated counter stats (statsAnimateOnScroll, countDuration)
 *  ✓ Numbered steps block (large 64px green counter)
 *  ✓ Photo strip block (hover-brightness 4-cell strip)
 *  ✓ Silhouette motion element with horizontal parallax + mix-blend-mode
 *
 * Run: npx tsx prisma/seed-ovb-template.ts
 * Safe: additive — only deletes /ovb-demo page before recreating it.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Unsplash images from the OVB design reference ────────────────────────────

const IMG = {
  hero1:  'https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=2200&q=80',
  hero2:  'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=2200&q=80',
  hero3:  'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=2200&q=80',
  proj1:  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=80',
  proj2:  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80',
  strip1: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80',
  strip2: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=900&q=80',
  strip3: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=900&q=80',
  strip4: 'https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=900&q=80',
  silo:   'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=1400&q=80',
};

// ── Silhouette SVG — mixer truck outline for the "Why OVB" section ───────────
const SVG_TRUCK_SILHOUETTE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" fill="#ffffff"><rect x="20" y="110" width="160" height="70" rx="4"/><ellipse cx="55" cy="182" rx="22" ry="22"/><ellipse cx="145" cy="182" rx="22" ry="22"/><rect x="180" y="125" width="100" height="55" rx="4"/><ellipse cx="212" cy="182" rx="22" ry="22"/><ellipse cx="272" cy="182" rx="22" ry="22"/><path d="M40 110 L40 60 Q40 40 60 40 L150 40 Q170 40 170 60 L170 110z" opacity="0.9"/><path d="M65 75 L65 95 L145 95 L145 75z" opacity="0.5"/><path d="M95 40 L95 20 Q95 8 108 8 L132 8 Q145 8 145 20 L145 40z"/></svg>`)}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function accentGreen(opacity = 1) {
  return `rgba(34,197,94,${opacity})`;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 OVB Template seed starting...');

  // Find an existing admin (don't create or wipe users)
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) throw new Error('No SUPER_ADMIN user found — run npm run db:seed first');

  // Wipe only the OVB demo page
  // Try both slug formats to handle re-runs
  for (const trySlug of ['ovb-demo', '/ovb-demo']) {
    const ex = await prisma.page.findUnique({ where: { slug: trySlug } });
    if (ex) {
      await prisma.sectionVersion.deleteMany({ where: { section: { pageId: ex.id } } });
      await prisma.section.deleteMany({ where: { pageId: ex.id } });
      await prisma.page.delete({ where: { id: ex.id } });
      console.log(`  🗑  Removed existing ${trySlug} page`);
    }
  }

  const page = await prisma.page.create({
    data: {
      slug: 'ovb-demo',
      title: 'OVB Readymix — Template Demo',
      type: 'FULL_PAGE',
      status: 'PUBLISHED',
      createdBy: admin.id,
      publishedAt: new Date(),
    },
  });
  console.log(`  ✅ Page: ${page.title} (${page.slug})`);

  let order = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HERO — multi-row headings, eyebrow, slide counter, scroll indicator
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'HERO',
      enabled: true,
      order: order++,
      displayName: 'Hero Carousel',
      paddingTop: 0,
      paddingBottom: 0,
      background: 'transparent',
      content: {
        // ── NEW: carousel UI extras ──────────────────────────────────────
        showSlideCounter:    true,
        showScrollIndicator: true,
        controlsPosition:    'bottom-left',
        metaLine:            ['34°25′S · 19°48′E', 'CALEDON · HERMANUS · GRABOUW', 'SINCE 2001'],

        autoPlay:           true,
        autoPlayInterval:   7000,
        showDots:           true,
        showArrows:         false,
        transitionDuration: 800,

        slides: [
          {
            id: 'ovb-slide-1',
            type: 'image',
            src: IMG.hero1,
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottom', startOpacity: 85, endOpacity: 20, color: '#050505' },
            },
            overlay: {
              // ── NEW: eyebrow + multi-row heading ────────────────────────
              eyebrow: 'Overberg · Western Cape',
              headingRows: [
                { text: 'Built for the',  fontSize: 110, fontWeight: 900, color: '#ffffff', animation: 'slideUp', animationDuration: 900, animationDelay: 100 },
                { text: 'Overberg.',       fontSize: 110, fontWeight: 900, color: accentGreen(), animation: 'slideUp', animationDuration: 900, animationDelay: 250 },
              ],
              subheading: { text: 'Readymix concrete, batched fresh and delivered on time — every time, across the whole region.', fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.78)', animation: 'slideUp', animationDuration: 800, animationDelay: 420 },
              buttons: [
                { text: 'Get a Quote', href: '#contact', backgroundColor: accentGreen(), textColor: '#0a0a0a', variant: 'filled', animation: 'slideUp', animationDelay: 580 },
                { text: 'Our Coverage', href: '#coverage', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 660 },
              ],
              position: 'bottom-left',
              spacing: { betweenHeadingSubheading: 20, betweenSubheadingButtons: 40, betweenButtons: 12 },
            },
          },
          {
            id: 'ovb-slide-2',
            type: 'image',
            src: IMG.hero2,
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottom', startOpacity: 88, endOpacity: 15, color: '#050505' },
            },
            overlay: {
              eyebrow: 'Twenty-five years on',
              headingRows: [
                { text: '25 Years.',      fontSize: 110, fontWeight: 900, color: '#ffffff',      animation: 'slideUp', animationDuration: 900, animationDelay: 100 },
                { text: '10,000+ m³.',   fontSize: 110, fontWeight: 900, color: accentGreen(), animation: 'slideUp', animationDuration: 900, animationDelay: 250 },
              ],
              subheading: { text: 'From farm dams to driveways to commercial floors — proven work across the Cape.', fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.78)', animation: 'slideUp', animationDuration: 800, animationDelay: 420 },
              buttons: [
                { text: 'See Our Work', href: '#projects', backgroundColor: accentGreen(), textColor: '#0a0a0a', variant: 'filled', animation: 'slideUp', animationDelay: 580 },
                { text: 'About OVB',    href: '#about',    backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 660 },
              ],
              position: 'bottom-left',
              spacing: { betweenHeadingSubheading: 20, betweenSubheadingButtons: 40, betweenButtons: 12 },
            },
          },
          {
            id: 'ovb-slide-3',
            type: 'image',
            src: IMG.hero3,
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottom', startOpacity: 90, endOpacity: 10, color: '#050505' },
            },
            overlay: {
              eyebrow: 'On the move · daily',
              headingRows: [
                { text: 'From plant',  fontSize: 110, fontWeight: 900, color: '#ffffff',      animation: 'slideUp', animationDuration: 900, animationDelay: 100 },
                { text: 'to pour.',    fontSize: 110, fontWeight: 900, color: accentGreen(), animation: 'slideUp', animationDuration: 900, animationDelay: 250 },
              ],
              buttons: [
                { text: 'How It Works', href: '#how', backgroundColor: accentGreen(), textColor: '#0a0a0a', variant: 'filled', animation: 'slideUp', animationDelay: 420 },
              ],
              position: 'bottom-left',
              spacing: { betweenHeadingSubheading: 20, betweenSubheadingButtons: 40, betweenButtons: 12 },
            },
          },
        ],
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ HERO — 3 slides, multi-row headings, slide counter, scroll indicator');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. SERVICES — FLEXIBLE, 3-column mosaic, split section header + footer
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Services',
      navLabel: 'Services',
      paddingTop: 100,
      paddingBottom: 80,
      background: '#0a0a0a',
      content: {
        // ── NEW: section header (split variant) ─────────────────────────
        sectionEyebrow:       'What we do',
        sectionHeading:       'Three services.\nOne promise.',
        sectionHeaderVariant: 'split',
        sectionLead:          'Concrete the way it should be — consistent, timely, and exactly where you need it. Across the whole Overberg.',
        // ── NEW: section footer ─────────────────────────────────────────
        sectionFooter: {
          leftText:    'Site visits across the Overberg · No travel charge under 80km',
          rightButton: { label: 'All Services', href: '#services' },
        },

        layout: { layoutMode: 'mosaic', gridAutoRows: 260, gridGap: 14 },
        elements: [
          {
            id: 'svc-1',
            type: 'card',
            position: { colSpan: 4, rowSpan: 1 },
            style: { backgroundColor: '#111111', borderRadius: 4 },
            content: {
              eyebrow:    '01 / 03',
              heading:    'Readymix Concrete',
              subheading: 'Batched fresh, delivered to your site.',
              text:       'Precisely calibrated mixes from our Caledon plant — 15MPa to 40MPa on demand.',
            },
          },
          {
            id: 'svc-2',
            type: 'card',
            position: { colSpan: 4, rowSpan: 1 },
            style: { backgroundColor: '#111111', borderRadius: 4 },
            content: {
              eyebrow:    '02 / 03',
              heading:    'Concrete Pump Hire',
              subheading: 'Get it exactly where you need it.',
              text:       'High-reach pumping for elevated pours, tight access, and large-floor slabs.',
            },
          },
          {
            id: 'svc-3',
            type: 'card',
            position: { colSpan: 4, rowSpan: 1 },
            style: { backgroundColor: '#111111', borderRadius: 4 },
            content: {
              eyebrow:    '03 / 03',
              heading:    'On-Site Mixing',
              subheading: 'For remote or large-scale pours.',
              text:       'We bring the plant to you — ideal for farms beyond our standard radius.',
            },
          },
        ],
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ SERVICES — split header, 3-col mosaic, section footer');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. ABOUT & STATS — FLEXIBLE, animated counter stats (styleVariant counter)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'About & Stats',
      navLabel: 'About',
      paddingTop: 100,
      paddingBottom: 100,
      background: '#ffffff',
      content: {
        sectionEyebrow:       'Who we are',
        sectionHeading:       'Local hands.\nMixed right.',
        sectionHeaderVariant: 'centered',

        layout: { layoutMode: 'mosaic', gridAutoRows: 180, gridGap: 2 },
        elements: [
          // ── NEW: animated counter stats ─────────────────────────────────
          {
            id: 'stat-1',
            type: 'stats',
            position: { colSpan: 4, rowSpan: 1 },
            style: { backgroundColor: '#f8f8f6', borderRadius: 0 },
            content: {
              statsNumber:         '25',
              statsSuffix:         '+',
              statsDisplaySuffix:  'Years in the Overberg',
              statsLabel:          'Years in the Overberg',
              statsCountDuration:  1600,
              statsAnimateOnScroll: true,
              statsStyleVariant:   'counter',
              statsAccentColor:    accentGreen(),
            },
          },
          {
            id: 'stat-2',
            type: 'stats',
            position: { colSpan: 4, rowSpan: 1 },
            style: { backgroundColor: '#f0f0ee', borderRadius: 0 },
            content: {
              statsNumber:         '10000',
              statsSuffix:         '',
              statsDisplaySuffix:  'm³ Delivered to date',
              statsLabel:          'm³ Delivered to date',
              statsCountDuration:  2000,
              statsAnimateOnScroll: true,
              statsStyleVariant:   'counter',
              statsAccentColor:    accentGreen(),
            },
          },
          {
            id: 'stat-3',
            type: 'stats',
            position: { colSpan: 4, rowSpan: 1 },
            style: { backgroundColor: '#f8f8f6', borderRadius: 0 },
            content: {
              statsNumber:         '3',
              statsSuffix:         '',
              statsDisplaySuffix:  'Generations · Family-owned',
              statsLabel:          'Generations · Family-owned',
              statsCountDuration:  800,
              statsAnimateOnScroll: true,
              statsStyleVariant:   'counter',
              statsAccentColor:    accentGreen(),
            },
          },
        ],
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ ABOUT & STATS — 3 animated counter stats (dark background)');

  // ══════════════════════════════════════════════════════════════════════════
  // 4. PROJECTS MOSAIC — 12-col grid with 6 differently-sized cards
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Projects Mosaic',
      navLabel: 'Projects',
      paddingTop: 100,
      paddingBottom: 40,
      background: '#0a0a0a',
      content: {
        sectionEyebrow:       'Selected work · 2024 – 2026',
        sectionHeading:       'Work we\'re\nproud of.',
        sectionHeaderVariant: 'split',
        sectionLead:          'A portfolio shaped by farms, factories, and family homes — every pour finished, signed off, and standing.',
        sectionFooter: {
          leftText:    '/  [em]184[/em]  projects logged · 2001 – 2026',
          rightButton: { label: 'See All Projects', href: '#projects' },
        },

        // ── NEW: mosaic layout mode ──────────────────────────────────────
        layout: { layoutMode: 'mosaic', gridAutoRows: 200, gridGap: 10 },
        elements: [
          // s-lg: 6col × 2row
          {
            id: 'proj-1',
            type: 'card',
            position: { mosaicPreset: 's-lg' },
            style: { backgroundImage: IMG.proj1, backgroundColor: '#1a1a1a', borderRadius: 4 },
            content: {
              eyebrow:    'Caledon',
              heading:    'Farm Dam Slab',
              subheading: '640 m³',
              text:       'April 2026',
            },
          },
          // s-md: 4col × 2row
          {
            id: 'proj-2',
            type: 'card',
            position: { mosaicPreset: 's-md' },
            style: { backgroundImage: IMG.proj2, backgroundColor: '#1a1a1a', borderRadius: 4 },
            content: {
              eyebrow:    'Hermanus',
              heading:    'Residential Driveway',
              subheading: '120 m³',
              text:       'Feb 2026',
            },
          },
          // s-sm: 4col × 1row
          {
            id: 'proj-3',
            type: 'card',
            position: { mosaicPreset: 's-sm' },
            style: { backgroundColor: '#161616', borderRadius: 4 },
            content: {
              eyebrow:    'Grabouw',
              heading:    'Warehouse Floor',
              subheading: '1,200 m³',
              text:       '2025',
            },
          },
          // s-tall: 4col × 2row
          {
            id: 'proj-4',
            type: 'card',
            position: { mosaicPreset: 's-tall' },
            style: { backgroundImage: IMG.silo, backgroundColor: '#1a1a1a', borderRadius: 4 },
            content: {
              eyebrow:    'Bot River',
              heading:    'Wine Estate Foundation',
              subheading: '380 m³',
              text:       'Nov 2025',
            },
          },
          // s-wide: 8col × 1row
          {
            id: 'proj-5',
            type: 'card',
            position: { mosaicPreset: 's-wide' },
            style: { backgroundColor: '#161616', borderRadius: 4 },
            content: {
              eyebrow:    'Gansbaai',
              heading:    'Coastal Retaining Wall',
              subheading: '210 m³',
              text:       'Sept 2025',
            },
          },
          // s-mid: 6col × 1row
          {
            id: 'proj-6',
            type: 'card',
            position: { mosaicPreset: 's-mid' },
            style: { backgroundColor: '#131313', borderRadius: 4 },
            content: {
              eyebrow:    'Napier',
              heading:    'Silo Foundation',
              subheading: '440 m³',
              text:       '2025',
            },
          },
        ],
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ PROJECTS — mosaic grid (s-lg, s-md, s-sm, s-tall, s-wide, s-mid)');

  // ══════════════════════════════════════════════════════════════════════════
  // 5. PHOTO STRIP — 4-cell horizontal strip of construction site imagery
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Photo Strip',
      paddingTop: 0,
      paddingBottom: 0,
      background: '#0a0a0a',
      content: {
        // ── NEW: photo-strip block ───────────────────────────────────────
        layout: { layoutMode: 'mosaic', gridAutoRows: 280, gridGap: 0 },
        elements: [
          {
            id: 'strip-1',
            type: 'photo-strip',
            position: { colSpan: 12, rowSpan: 1 },
            style: {},
            content: {
              photoStripImages: [
                { src: IMG.strip1, alt: 'Wet Concrete' },
                { src: IMG.strip2, alt: 'Mixer on Route' },
                { src: IMG.strip3, alt: 'Screed Finish' },
                { src: IMG.strip4, alt: 'Plant Batching' },
              ],
              photoStripColumns:         4,
              photoStripHeight:          280,
              photoStripGap:             4,
              photoStripHoverBrightness: true,
            },
          },
        ],
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ PHOTO STRIP — 4-cell hover-brightness strip');

  // ══════════════════════════════════════════════════════════════════════════
  // 6. WHY OVB — numbered steps + silhouette motion element + horizontal parallax
  // ══════════════════════════════════════════════════════════════════════════
  const whySection = await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Why OVB',
      navLabel: 'Why OVB',
      paddingTop: 100,
      paddingBottom: 100,
      background: '#0d0d0d',
      // ── NEW: silhouette motion element with horizontal parallax ─────────
      motionElements: [
        {
          id: 'me-truck',
          src: SVG_TRUCK_SILHOUETTE,
          alt: '',
          top: '50%',
          right: '0%',
          width: '400px',
          zIndex: 5,
          layer: 'behind',
          opacity: 18,
          filterPreset: 'none',   // SVG is already white — silhouette look via low opacity
          mixBlendMode: 'screen',
          horizontalParallax:       true,
          horizontalParallaxAmount: 80,
          parallax: { enabled: true, speed: 0.08 },
          entrance: { enabled: true, direction: 'right', distance: 80, duration: 1200, delay: 300, easing: 'outCubic' },
          exit:     { enabled: false, direction: 'right', distance: 80, duration: 600 },
          idle:     { enabled: true, type: 'float', speed: 0.6, amplitude: 10 },
        },
      ] as object,
      content: {
        sectionEyebrow:       'Why OVB',
        sectionHeading:       'Three reasons it\nshows up right.',
        sectionHeaderVariant: 'split',
        sectionLead:          'No surprises at the gate. No half-cured slabs. No waiting around for a truck that won\'t arrive.',

        // ── NEW: steps block ─────────────────────────────────────────────
        layout: { layoutMode: 'mosaic', gridAutoRows: 76, gridGap: 0 },
        elements: [
          {
            id: 'why-steps',
            type: 'steps',
            position: { colSpan: 12, rowSpan: 4 },
            style: {},
            content: {
              steps: [
                { number: '01', heading: 'Consistent Quality',  subtext: 'Same mix, every batch — independently tested and guaranteed for spec.' },
                { number: '02', heading: 'On-Time Delivery',    subtext: 'We know the Overberg roads better than anyone. Your pour starts when planned.' },
                { number: '03', heading: 'Local Knowledge',     subtext: '25 years of local projects, soils, and conditions baked into every recommendation.' },
              ],
              stepsDividers:      true,
              stepsLastDivider:   true,
              stepsNumberWidth:   120,
            },
          },
        ],
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ WHY OVB — steps block + silhouette motion element (horizontal parallax)');

  // ══════════════════════════════════════════════════════════════════════════
  // 7. HOW IT WORKS — 4-step numbered process block
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'How It Works',
      paddingTop: 100,
      paddingBottom: 100,
      background: '#ffffff',
      content: {
        sectionEyebrow:       'The process',
        sectionHeading:       'Four steps.\nNo drama.',
        sectionHeaderVariant: 'split',
        sectionLead:          'From first call to clean finish — clear, predictable, on schedule.',

        layout: { layoutMode: 'mosaic', gridAutoRows: 72, gridGap: 0 },
        elements: [
          {
            id: 'how-steps',
            type: 'steps',
            position: { colSpan: 12, rowSpan: 5 },
            style: {},
            content: {
              steps: [
                { number: '01', heading: 'Request a Quote',       subtext: 'Site location, volume, mix spec, and pour date.' },
                { number: '02', heading: 'We Mix to Spec',        subtext: 'Batched fresh from the Caledon plant to your exact grade.' },
                { number: '03', heading: 'On-Time Delivery',      subtext: 'Tracked from the yard to your gate — no guessing on ETA.' },
                { number: '04', heading: 'Pour with Confidence',  subtext: 'Backed by 25 years of practice across every Overberg condition.' },
              ],
              stepsDividers:    true,
              stepsLastDivider: false,
              stepsNumberWidth: 120,
            },
          },
        ],
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ HOW IT WORKS — 4-step numbered process (light background)');

  // ══════════════════════════════════════════════════════════════════════════
  // 8. CTA — simple dark call-to-action
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      type: 'CTA',
      enabled: true,
      order: order++,
      displayName: 'Get a Quote CTA',
      paddingTop: 100,
      paddingBottom: 100,
      background: accentGreen(),
      content: {
        heading:     'Ready to build?',
        subheading:  'Get your readymix quote — no fluff, just concrete. We\'ll get back within a working day.',
        buttonText:  'Request a Quote',
        buttonUrl:   '#contact',
        buttonColor: '#0a0a0a',
        textColor:   '#0a0a0a',
      } as object,
      createdBy: admin.id,
    },
  });
  console.log('  ✓ CTA — green background, quote call-to-action');

  console.log(`\n✅ OVB Readymix template seeded at: http://localhost:3000/ovb-demo`);
;
  console.log('   Admin preview: http://localhost:3000/admin/pages');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
