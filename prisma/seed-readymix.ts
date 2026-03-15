// @ts-nocheck
/**
 * OVERBERG READYMIX SEED — v4 (correct designerData format)
 *
 * Professional landing page for SA ready-mix concrete company.
 * Sections:
 *   1. HERO          — 3 slides with real construction photography
 *   2. ABOUT US      — 2-col: company story (left) + stats (right)
 *   3. SERVICES      — Dark 3-col card grid, 6 service types
 *   4. PROJECTS      — Projects gallery
 *   5. COVERAGE MAP  — Delivery area embed
 *   6. CTA           — Quote request form (style: contact-form)
 *   7. FOOTER
 *
 * Run: npx tsx prisma/seed-readymix.ts
 *
 * designerData format:
 *   - layoutType: 'grid'  (NOT positionMode: 'grid')
 *   - grid: { cols, rows, gap }
 *   - block positions are 1-BASED (col: 1 = first column)
 *   - 'text' blocks render subElements, not inline props.text
 *   - 'card' blocks render p.label + subElements
 *   - 'stats' blocks render p.number + p.statLabel + p.icon directly
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../lib/auth';

function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue; }

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Overberg ReadyMix seed v4...');

  // ── Full wipe ──────────────────────────────────────────────────────────────
  console.log('🗑  Wiping existing data...');
  await prisma.sectionVersion.deleteMany();
  await prisma.customElement.deleteMany();
  await prisma.section.deleteMany();
  await prisma.page.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.clientFeature.deleteMany();
  await prisma.coverageRegion.deleteMany();
  await prisma.coverageLabel.deleteMany();
  await prisma.coverageMap.deleteMany();
  await prisma.project.deleteMany();
  await prisma.volt3DVersion.deleteMany();
  await prisma.volt3DAsset.deleteMany();
  await prisma.voltElement.deleteMany();
  await prisma.voltAsset.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.siteConfig.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Wipe complete');

  // ── Admin user ─────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@overbergreadymix.co.za',
      passwordHash: await hashPassword('admin2026'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.username}`);

  // ── Client features ────────────────────────────────────────────────────────
  await prisma.clientFeature.createMany({
    data: [
      {
        slug: 'concrete-calculator',
        name: 'Concrete Calculator',
        enabled: true,
        config: {
          concreteDensity: 2400,
          currencySymbol: 'R',
          cementBagSize: 50,
          cementBagPrice: 180,
          deliveryFee: 850,
          wastagePercent: 10,
          mixRatios: {
            '15MPa': { cement: 1, sand: 3, stone: 3 },
            '20MPa': { cement: 1, sand: 2.5, stone: 2.5 },
            '25MPa': { cement: 1, sand: 2, stone: 2 },
            '30MPa': { cement: 1, sand: 1.5, stone: 1.5 },
          },
        },
      },
      {
        slug: 'coverage-map',
        name: 'Coverage Map',
        enabled: false,
        config: {},
      },
    ],
  });
  console.log('✅ Features: Concrete Calculator (on), Coverage Map (off)');

  // ── Demo Coverage Map: Overberg ────────────────────────────────────────────
  const overbergMap = await prisma.coverageMap.create({
    data: {
      name: 'Overberg Region',
      slug: 'overberg',
      description: 'Our primary delivery area covering Hermanus, Stanford, Caledon and surrounding towns.',
      centerLat: -34.4187,
      centerLng: 19.2345,
      defaultZoom: 10,
      isActive: true,
    },
  });

  await prisma.coverageRegion.createMany({
    data: [
      {
        mapId: overbergMap.id,
        name: 'Hermanus',
        description: 'Full delivery coverage — 7 days',
        color: '#22c55e',
        opacity: 0.38,
        strokeColor: '#16a34a',
        strokeWidth: 2,
        isActive: true,
        order: 0,
        polygon: [
          { lat: -34.38, lng: 19.20 },
          { lat: -34.38, lng: 19.35 },
          { lat: -34.47, lng: 19.35 },
          { lat: -34.47, lng: 19.20 },
        ],
      },
      {
        mapId: overbergMap.id,
        name: 'Stanford',
        description: 'Delivery Mon–Fri',
        color: '#4a7c59',
        opacity: 0.38,
        strokeColor: '#2d5a3d',
        strokeWidth: 2,
        isActive: true,
        order: 1,
        polygon: [
          { lat: -34.43, lng: 19.46 },
          { lat: -34.43, lng: 19.56 },
          { lat: -34.50, lng: 19.56 },
          { lat: -34.50, lng: 19.46 },
        ],
      },
      {
        mapId: overbergMap.id,
        name: 'Caledon',
        description: 'Delivery Tue, Thu',
        color: '#6b7280',
        opacity: 0.35,
        strokeColor: '#4b5563',
        strokeWidth: 2,
        isActive: true,
        order: 2,
        polygon: [
          { lat: -34.20, lng: 19.40 },
          { lat: -34.20, lng: 19.55 },
          { lat: -34.32, lng: 19.55 },
          { lat: -34.32, lng: 19.40 },
        ],
      },
      {
        mapId: overbergMap.id,
        name: 'Gansbaai',
        description: 'On-request delivery',
        color: '#f59e0b',
        opacity: 0.30,
        strokeColor: '#d97706',
        strokeWidth: 2,
        isActive: true,
        order: 3,
        polygon: [
          { lat: -34.57, lng: 19.32 },
          { lat: -34.57, lng: 19.45 },
          { lat: -34.65, lng: 19.45 },
          { lat: -34.65, lng: 19.32 },
        ],
      },
    ],
  });

  await prisma.coverageLabel.createMany({
    data: [
      { mapId: overbergMap.id, text: 'Hermanus',  lat: -34.42, lng: 19.24, fontSize: 14, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: true  },
      { mapId: overbergMap.id, text: 'Stanford',  lat: -34.46, lng: 19.51, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
      { mapId: overbergMap.id, text: 'Caledon',   lat: -34.26, lng: 19.47, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
      { mapId: overbergMap.id, text: 'Gansbaai',  lat: -34.61, lng: 19.38, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
    ],
  });
  console.log('✅ Coverage Map: Overberg (4 regions, 4 labels)');

  // ── Demo Projects ──────────────────────────────────────────────────────────
  await prisma.project.createMany({
    data: [
      {
        title: 'Hermanus Shopping Centre — Parking Slab',
        location: 'Hermanus, Western Cape',
        description: '2 800 m² reinforced concrete parking slab. 25MPa mix, 150mm depth. Completed in 3 pours over 5 days.',
        coverImageUrl: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800&q=80',
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
        ],
        completedDate: 'November 2024',
        isActive: true,
        order: 0,
      },
      {
        title: 'Stanford Primary School — Foundation',
        location: 'Stanford, Western Cape',
        description: 'Strip and pad footings for new 12-classroom block. 30MPa mix, engineered design. 140 m³ total volume.',
        coverImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        ],
        completedDate: 'August 2024',
        isActive: true,
        order: 1,
      },
      {
        title: 'Caledon Industrial Estate — Floor Slab',
        location: 'Caledon, Western Cape',
        description: '4 500 m² industrial floor slab with fibre reinforcement. 30MPa mix, 200mm depth. Heavy-duty forklift spec.',
        coverImageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
        ],
        completedDate: 'March 2025',
        isActive: true,
        order: 2,
      },
      {
        title: 'Gansbaai Harbour — Retaining Wall',
        location: 'Gansbaai, Western Cape',
        description: 'Marine-grade 35MPa concrete retaining wall, 65 linear metres. Sulphate-resistant additives. Sea-spray environment.',
        coverImageUrl: 'https://images.unsplash.com/photo-1510146758428-e5e4b17b8b6a?w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1510146758428-e5e4b17b8b6a?w=800&q=80',
        ],
        completedDate: 'January 2025',
        isActive: true,
        order: 3,
      },
    ],
  });
  console.log('✅ Projects: 4 demo projects created');

  // ── Site settings ──────────────────────────────────────────────────────────
  await prisma.systemSettings.createMany({
    data: [
      { key: 'companyName',  value: 'Overberg ReadyMix' },
      { key: 'tagline',      value: 'Quality concrete delivered to your site' },
      { key: 'email',        value: 'info@overbergreadymix.co.za' },
      { key: 'phone',        value: '+27 28 312 0000' },
      { key: 'address',      value: '14 Industrial Road, Hermanus, 7200' },
      { key: 'facebook',     value: 'https://facebook.com/overbergreadymix' },
      { key: 'instagram',    value: 'https://instagram.com/overbergreadymix' },
    ],
  });
  console.log('✅ System settings: Overberg ReadyMix');

  // ── Landing page ───────────────────────────────────────────────────────────
  const landingPage = await prisma.page.create({
    data: {
      slug: '/',
      title: 'Home',
      type: 'LANDING',
      status: 'PUBLISHED',
      createdBy: admin.id,
      publishedAt: new Date(),
    },
  });

  let order = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HERO — 3 slides with real construction photography
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'HERO',
      enabled: true,
      order: order++,
      displayName: 'Hero',
      paddingTop: 0,
      paddingBottom: 0,
      background: 'transparent',
      content: j({
        slides: [
          {
            id: 'slide-1',
            type: 'image',
            src: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 65, endOpacity: 40, color: '#000000' },
            },
            overlay: {
              heading: {
                text: 'Ready-Mix Concrete.\nDelivered.',
                fontSize: 68, fontWeight: 800, color: '#ffffff',
                animation: 'slideUp', animationDuration: 900, animationDelay: 100,
              },
              subheading: {
                text: 'Serving the Overberg — Hermanus, Stanford, Caledon and beyond. Consistent quality, on-time delivery, expert mix design.',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.88)',
                animation: 'slideUp', animationDuration: 900, animationDelay: 300,
              },
              buttons: [
                { text: 'Get a Quote', href: '#contact', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
                { text: 'Our Services', href: '#services', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 620 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
          {
            id: 'slide-2',
            type: 'image',
            src: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=1920&q=80',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 70, endOpacity: 45, color: '#0f1f10' },
            },
            overlay: {
              heading: {
                text: 'Built on Quality.\nTrusted by Builders.',
                fontSize: 64, fontWeight: 800, color: '#ffffff',
                animation: 'fade', animationDuration: 1000, animationDelay: 0,
              },
              subheading: {
                text: 'From strip footings to 4 500 m² industrial slabs — our mix designs are engineered for your application, certified to SANS 878.',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.88)',
                animation: 'fade', animationDuration: 1000, animationDelay: 200,
              },
              buttons: [
                { text: 'View Projects', href: '#projects', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'fade', animationDelay: 400 },
                { text: 'Check Coverage', href: '/coverage', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'fade', animationDelay: 520 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
          {
            id: 'slide-3',
            type: 'image',
            src: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=80',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 65, endOpacity: 35, color: '#111827' },
            },
            overlay: {
              heading: {
                text: '20 Years.\n8 Trucks.\n1 Standard.',
                fontSize: 62, fontWeight: 800, color: '#ffffff',
                animation: 'slideUp', animationDuration: 900, animationDelay: 100,
              },
              subheading: {
                text: 'Family-owned and Overberg-rooted since 2005. Every batch from our automated plant meets the same tight specification.',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.88)',
                animation: 'slideUp', animationDuration: 900, animationDelay: 300,
              },
              buttons: [
                { text: 'About Us', href: '#about', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
                { text: 'Concrete Calculator', href: '/calculator', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 620 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
        ],
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionDuration: 800,
        showDots: true,
        showArrows: true,
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ABOUT US — 2-col grid: company story (left) + 5 stat blocks (right)
  //
  //  Grid: 2 cols × 5 rows
  //  Col 1 spans all 5 rows — company story, body text, CTA button
  //  Col 2 rows 1–5 — stats: years, trucks, mix range, team, certification
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'About Us',
      background: '#f0fdf4',
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 2, rows: 5, gap: 20 },
          blocks: [
            // ── LEFT COLUMN: full-height story block ────────────────────────
            {
              id: 1,
              type: 'text',
              position: { row: 1, col: 1, colSpan: 1, rowSpan: 5 },
              props: { paddingTop: 48, paddingBottom: 48, paddingX: 48 },
              subElements: [
                {
                  type: 'heading',
                  props: {
                    text: 'ABOUT OVERBERG READYMIX',
                    fontSize: 11, fontWeight: '700', color: '#4a7c59',
                    letterSpacing: 2, textTransform: 'uppercase',
                    textAlign: 'left', marginBottom: 16,
                  },
                },
                {
                  type: 'heading',
                  props: {
                    text: 'Family-owned. Quality-driven. Overberg-rooted.',
                    fontSize: 34, fontWeight: '800', color: '#1f2937',
                    lineHeight: 1.2, textAlign: 'left', marginBottom: 24,
                  },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Since 2005, Overberg ReadyMix has supplied ready-mix concrete to builders, developers, and contractors across the Overberg. What started as a single transit mixer has grown into a modern operation — 8 GPS-tracked trucks, a fully automated batching plant, and a team of 24 dedicated to delivering concrete that\'s consistent, on-spec, and on time.',
                    fontSize: 16, color: '#4b5563', lineHeight: 1.75, marginBottom: 16,
                  },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Every batch begins with SANS-certified raw materials and a mix design matched to your project requirements. Our automated plant controls water-cement ratios to ±2%. You receive exactly what was batched — every time.',
                    fontSize: 16, color: '#4b5563', lineHeight: 1.75, marginBottom: 32,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Get a Quote',
                    navTarget: '#contact',
                    bgColor: '#4a7c59', textColor: '#ffffff',
                    paddingX: 28, paddingY: 12, borderRadius: 6,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Concrete Calculator',
                    navTarget: '/calculator',
                    bgColor: '#f0fdf4', textColor: '#4a7c59',
                    paddingX: 28, paddingY: 12, borderRadius: 6,
                    marginTop: 8,
                  },
                },
              ],
            },
            // ── RIGHT COLUMN: 5 stat cards ───────────────────────────────────
            {
              id: 2, type: 'stats',
              position: { row: 1, col: 2 },
              props: {
                icon: 'bi-calendar2-heart',
                number: '20+',
                statLabel: 'Years in the Overberg',
                bgColor: '#f0fdf4', textColor: '#4a7c59', bgOpacity: 100,
              },
            },
            {
              id: 3, type: 'stats',
              position: { row: 2, col: 2 },
              props: {
                icon: 'bi-truck',
                number: '8',
                statLabel: 'GPS-tracked trucks',
                bgColor: '#f8fafc', textColor: '#1f2937', bgOpacity: 100,
              },
            },
            {
              id: 4, type: 'stats',
              position: { row: 3, col: 2 },
              props: {
                icon: 'bi-speedometer2',
                number: '15–40MPa',
                statLabel: 'Full mix range',
                bgColor: '#f0fdf4', textColor: '#4a7c59', bgOpacity: 100,
              },
            },
            {
              id: 5, type: 'stats',
              position: { row: 4, col: 2 },
              props: {
                icon: 'bi-people',
                number: '24',
                statLabel: 'Team members',
                bgColor: '#f8fafc', textColor: '#1f2937', bgOpacity: 100,
              },
            },
            {
              id: 6, type: 'stats',
              position: { row: 5, col: 2 },
              props: {
                icon: 'bi-patch-check',
                number: 'SANS 878',
                statLabel: 'Certified mix designs',
                bgColor: '#f0fdf4', textColor: '#4a7c59', bgOpacity: 100,
                animateCount: false, // text value — no count-up animation
              },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. SERVICES — Dark 3-col multi-section grid: header (snap 1) + 6 cards (snap 2)
  //
  //  contentMode: 'multi', multiLimit: 2 → 200vh total (2 snap stops)
  //  Grid: 3 cols × 1 row, section-based:
  //    section:0 → header text spanning all 3 cols (100vh)
  //    section:1 → 3 cols of 2 cards each stacked (100vh, using rows within section 1)
  //
  //  NOTE: Using simple grid rows approach:
  //    - grid: { cols: 3, rows: 2 }, multiLimit: 2 → totalRows = 4
  //    - section:0 header at row 1 (sectionOffset=0, absoluteRow=1)
  //    - section:1 cards row 1 = absoluteRow 3, row 2 = absoluteRow 4
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Services',
      background: '#1f2937',
      content: j({
        contentMode: 'multi',
        designerData: {
          contentMode: 'multi',
          multiLimit: 2,
          layoutType: 'grid',
          grid: { cols: 3, rows: 2, gap: 20 },
          blocks: [
            // ── Snap stop 0 (100vh): section header ──────────────────────────
            {
              id: 10,
              type: 'text',
              // section:0, row:1 → absoluteRow = 0×2+1 = 1 (first 100vh, full 3-col width)
              position: { row: 1, col: 1, colSpan: 3, section: 0 },
              props: { textAlign: 'center', paddingTop: 40, paddingBottom: 8 },
              subElements: [
                {
                  type: 'heading',
                  props: {
                    text: 'WHAT WE SUPPLY',
                    fontSize: 11, fontWeight: '700', color: '#4a7c59',
                    letterSpacing: 2, textTransform: 'uppercase',
                    textAlign: 'center', marginBottom: 14,
                  },
                },
                {
                  type: 'heading',
                  props: {
                    text: 'Six concrete solutions. One reliable supplier.',
                    fontSize: 32, fontWeight: '800', color: '#ffffff',
                    textAlign: 'center', lineHeight: 1.2, marginBottom: 12,
                  },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Every mix is plant-batched to SANS 878 and delivered to your site by our GPS-tracked fleet.',
                    fontSize: 15, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6,
                  },
                },
              ],
            },
            // ── Snap stop 1 (100vh): service cards ──────────────────────────
            // section:1, rows:1+2 → absoluteRow = 1×2+1=3, 1×2+2=4
            {
              id: 12, type: 'card',
              position: { row: 1, col: 1, section: 1 },
              props: { bgColor: '#374151', borderRadius: 10 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Standard Mixes', fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
                },
                {
                  type: 'heading',
                  props: { text: '15MPa – 40MPa', fontSize: 13, fontWeight: '600', color: '#4a7c59', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'SANS 878-compliant mixes for domestic to heavy industrial. Cube-test certificates available on request.',
                    fontSize: 14, color: '#9ca3af', lineHeight: 1.6,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Get a Quote',
                    navTarget: '#contact',
                    bgColor: 'transparent', textColor: '#4a7c59',
                    paddingX: 0, paddingY: 4, borderRadius: 0,
                    marginTop: 12,
                  },
                },
              ],
            },
            {
              id: 13, type: 'card',
              position: { row: 1, col: 2, section: 1 },
              props: { bgColor: '#374151', borderRadius: 10 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Pumpable Concrete', fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
                },
                {
                  type: 'heading',
                  props: { text: '100–180mm slump', fontSize: 13, fontWeight: '600', color: '#4a7c59', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'High-workability mix for pump application. Ideal for elevated slabs, columns and restricted-access sites.',
                    fontSize: 14, color: '#9ca3af', lineHeight: 1.6,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Get a Quote',
                    navTarget: '#contact',
                    bgColor: 'transparent', textColor: '#4a7c59',
                    paddingX: 0, paddingY: 4, borderRadius: 0,
                    marginTop: 12,
                  },
                },
              ],
            },
            {
              id: 14, type: 'card',
              position: { row: 1, col: 3, section: 1 },
              props: { bgColor: '#374151', borderRadius: 10 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Fibre Reinforced', fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
                },
                {
                  type: 'heading',
                  props: { text: 'Steel or polypropylene', fontSize: 13, fontWeight: '600', color: '#4a7c59', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Dosed at the plant — no on-site mixing errors. Polypropylene reduces plastic cracking; steel adds post-crack load capacity.',
                    fontSize: 14, color: '#9ca3af', lineHeight: 1.6,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Get a Quote',
                    navTarget: '#contact',
                    bgColor: 'transparent', textColor: '#4a7c59',
                    paddingX: 0, paddingY: 4, borderRadius: 0,
                    marginTop: 12,
                  },
                },
              ],
            },
            {
              id: 15, type: 'card',
              position: { row: 2, col: 1, section: 1 },
              props: { bgColor: '#374151', borderRadius: 10 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Marine Grade', fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
                },
                {
                  type: 'heading',
                  props: { text: 'Sulphate-resistant', fontSize: 13, fontWeight: '600', color: '#4a7c59', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Low w/c ratio, blast-furnace slag additions. Purpose-built for coastal environments and sea-spray exposure.',
                    fontSize: 14, color: '#9ca3af', lineHeight: 1.6,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Get a Quote',
                    navTarget: '#contact',
                    bgColor: 'transparent', textColor: '#4a7c59',
                    paddingX: 0, paddingY: 4, borderRadius: 0,
                    marginTop: 12,
                  },
                },
              ],
            },
            {
              id: 16, type: 'card',
              position: { row: 2, col: 2, section: 1 },
              props: { bgColor: '#374151', borderRadius: 10 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Mass-Pour Mixes', fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
                },
                {
                  type: 'heading',
                  props: { text: 'Retaining walls & footings', fontSize: 13, fontWeight: '600', color: '#4a7c59', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Optimised workability window for large-volume pours. Retarder packages available for hot-weather pouring.',
                    fontSize: 14, color: '#9ca3af', lineHeight: 1.6,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Get a Quote',
                    navTarget: '#contact',
                    bgColor: 'transparent', textColor: '#4a7c59',
                    paddingX: 0, paddingY: 4, borderRadius: 0,
                    marginTop: 12,
                  },
                },
              ],
            },
            {
              id: 17, type: 'card',
              position: { row: 2, col: 3, section: 1 },
              props: { bgColor: '#374151', borderRadius: 10 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: 'Delivery Service', fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
                },
                {
                  type: 'heading',
                  props: { text: '6 m³ and 8 m³ loads', fontSize: 13, fontWeight: '600', color: '#4a7c59', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'GPS-tracked transit mixers. On-site within 1 hour of pour. Same-day orders accepted before 10:00 AM.',
                    fontSize: 14, color: '#9ca3af', lineHeight: 1.6,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Check Delivery Area',
                    navTarget: '/coverage',
                    bgColor: 'transparent', textColor: '#4a7c59',
                    paddingX: 0, paddingY: 4, borderRadius: 0,
                    marginTop: 12,
                  },
                },
              ],
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. WHY CHOOSE US — parallax-style multi-scroll section (3 × 100vh zones)
  //
  //  contentMode: 'multi', multiLimit: 3
  //  background: 'midnight' — built-in gradient (demonstrates gradient color scheme)
  //
  //  Grid: 3 cols × 1 row per zone → 3 snap zones
  //  Zone 0 (section:0): Centered heading + tagline spanning 3 cols
  //  Zone 1 (section:1): 3-col reason cards (Quality, Reliability, Local Knowledge)
  //  Zone 2 (section:2): 3-col stats (years, volume, clients) + CTA
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Why Choose Us',
      background: 'midnight',
      content: j({
        contentMode: 'multi',
        designerData: {
          contentMode: 'multi',
          multiLimit: 3,
          layoutType: 'grid',
          grid: { cols: 3, rows: 1, gap: 24 },
          blocks: [
            // ── Zone 0: Full-width heading ────────────────────────────────
            {
              id: 40,
              type: 'text',
              position: { row: 1, col: 1, colSpan: 3, section: 0 },
              props: { textAlign: 'center', paddingTop: 60, paddingX: 80 },
              subElements: [
                {
                  type: 'heading',
                  props: {
                    text: 'WHY BUILDERS CHOOSE US',
                    fontSize: 11, fontWeight: '700', color: '#4a7c59',
                    letterSpacing: 3, textTransform: 'uppercase',
                    textAlign: 'center', marginBottom: 20,
                  },
                },
                {
                  type: 'heading',
                  props: {
                    text: 'Concrete you can count on.\nEvery pour. Every time.',
                    fontSize: 48, fontWeight: '800', color: '#ffffff',
                    lineHeight: 1.15, textAlign: 'center', marginBottom: 28,
                  },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Twenty years of delivering to the Overberg has taught us one thing: builders don\'t forgive bad concrete. That\'s why every batch we produce is plant-controlled, SANS-certified, and delivered on time.',
                    fontSize: 18, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75,
                    textAlign: 'center', marginBottom: 48,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'Scroll to see why →',
                    bgColor: 'transparent', textColor: 'rgba(255,255,255,0.5)',
                    paddingX: 0, paddingY: 0, borderRadius: 0, marginTop: 0,
                  },
                },
              ],
            },
            // ── Zone 1: 3-col reason cards ───────────────────────────────
            {
              id: 41,
              type: 'card',
              position: { row: 1, col: 1, section: 1 },
              props: { bgColor: 'rgba(255,255,255,0.07)', borderRadius: 12 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: '⚗️', fontSize: 36, textAlign: 'center', marginBottom: 16 },
                },
                {
                  type: 'heading',
                  props: { text: 'Consistent Quality', fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Automated batching plant controls water-cement ratios to ±2%. Every batch is cube-tested. Cube certificates available on request.',
                    fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, textAlign: 'center',
                  },
                },
              ],
            },
            {
              id: 42,
              type: 'card',
              position: { row: 1, col: 2, section: 1 },
              props: { bgColor: 'rgba(74,124,89,0.25)', borderRadius: 12 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: '🚛', fontSize: 36, textAlign: 'center', marginBottom: 16 },
                },
                {
                  type: 'heading',
                  props: { text: 'On-Time Delivery', fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'GPS-tracked fleet of 8 transit mixers. Real-time ETA via WhatsApp. Concrete arrives on schedule so your crew stays productive.',
                    fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, textAlign: 'center',
                  },
                },
              ],
            },
            {
              id: 43,
              type: 'card',
              position: { row: 1, col: 3, section: 1 },
              props: { bgColor: 'rgba(255,255,255,0.07)', borderRadius: 12 },
              subElements: [
                {
                  type: 'heading',
                  props: { text: '🏡', fontSize: 36, textAlign: 'center', marginBottom: 16 },
                },
                {
                  type: 'heading',
                  props: { text: 'Locally Rooted', fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 12 },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Family-owned and based in Hermanus. We know the Overberg road conditions, the tides, and the contractors. When you call, you speak to the owner.',
                    fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, textAlign: 'center',
                  },
                },
              ],
            },
            // ── Zone 2: Stats + CTA ──────────────────────────────────────
            {
              id: 44,
              type: 'stats',
              position: { row: 1, col: 1, section: 2 },
              props: {
                icon: 'bi-calendar2-heart',
                number: '20+',
                statLabel: 'Years serving the Overberg',
                bgColor: 'rgba(255,255,255,0.08)', textColor: '#ffffff', bgOpacity: 100,
              },
            },
            {
              id: 45,
              type: 'stats',
              position: { row: 1, col: 2, section: 2 },
              props: {
                icon: 'bi-boxes',
                number: '50 000+',
                statLabel: 'Cubic metres poured',
                bgColor: 'rgba(74,124,89,0.3)', textColor: '#ffffff', bgOpacity: 100,
              },
            },
            {
              id: 46,
              type: 'stats',
              position: { row: 1, col: 3, section: 2 },
              props: {
                icon: 'bi-people',
                number: '400+',
                statLabel: 'Satisfied contractors',
                bgColor: 'rgba(255,255,255,0.08)', textColor: '#ffffff', bgOpacity: 100,
              },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. PROJECTS GALLERY
  //
  //  Grid: 1 col × 1 row — gallery fills the full 100vh.
  //  Heading and subtext are passed via projects-gallery props so there is
  //  no separate header row creating a dead-space gap.
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Projects',
      background: 'linear-gradient(135deg, #0a1628, #1a3a6b, #0d2044)',
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 1, rows: 1, gap: 0 },
          blocks: [
            {
              id: 31,
              type: 'projects-gallery',
              position: { row: 1, col: 1 },
              props: {
                heading: 'Completed Projects',
                subtext: 'From residential foundations to industrial floor slabs — concrete that performs.',
                textColor: '#ffffff',
                columns: 4,
              },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. COVERAGE MAP  (multi-section: 2 × 100vh snap stops)
  //
  //  contentMode: 'multi' (outer) → section grows to 200vh, no height cap.
  //  designerData: contentMode:'multi', multiLimit:2, grid:{rows:1} →
  //    totalRows = 1×2 = 2 rows × 100vh each.
  //
  //  Block positions use `section` field:
  //    section:0, row:1 → absoluteRow = 0×1+1 = 1 (first 100vh)
  //    section:1, row:1 → absoluteRow = 1×1+1 = 2 (second 100vh)
  //
  //  Snap stop 1 (100vh): heading, description, CTA button
  //  Snap stop 2 (100vh): interactive Leaflet coverage map
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Coverage Map',
      background: '#f3f4f6',
      content: j({
        contentMode: 'multi',
        designerData: {
          contentMode: 'multi',
          multiLimit: 2,
          layoutType: 'grid',
          grid: { cols: 1, rows: 1, gap: 0 },
          blocks: [
            // ── Snap stop 1: heading + description + button ──────────────
            {
              id: 50,
              type: 'text',
              position: { row: 1, col: 1, section: 0 },
              props: { textAlign: 'center', paddingTop: 0, paddingBottom: 0 },
              subElements: [
                {
                  type: 'heading',
                  props: {
                    text: 'DELIVERY COVERAGE',
                    fontSize: 11, fontWeight: '700', color: '#4a7c59',
                    letterSpacing: 2, textTransform: 'uppercase',
                    textAlign: 'center', marginBottom: 16,
                  },
                },
                {
                  type: 'heading',
                  props: {
                    text: 'Do We Deliver to You?',
                    fontSize: 44, fontWeight: '800', color: '#1f2937',
                    textAlign: 'center', lineHeight: 1.15, marginBottom: 20,
                  },
                },
                {
                  type: 'paragraph',
                  props: {
                    text: 'Search your town or suburb to check your delivery zone. We cover Hermanus, Stanford, Caledon, Gansbaai and surrounding areas.',
                    fontSize: 18, color: '#6b7280', textAlign: 'center', lineHeight: 1.65,
                    maxWidth: 640, marginBottom: 32,
                  },
                },
                {
                  type: 'button',
                  props: {
                    text: 'View Full Coverage Map',
                    navTarget: '/coverage',
                    bgColor: '#4a7c59', textColor: '#ffffff',
                    paddingX: 32, paddingY: 14, borderRadius: 6,
                  },
                },
              ],
            },
            // ── Snap stop 2: interactive Leaflet map ─────────────────────
            {
              id: 51,
              type: 'coverage-map',
              position: { row: 1, col: 1, section: 1 },
              props: { mapSlug: 'overberg', mapHeight: 600, showSearch: true, showGeolocation: true },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. CTA — Contact form (style: contact-form triggers CTAFooter renderer)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'CTA',
      enabled: true,
      order: order++,
      displayName: 'Contact',
      background: '#1f2937',
      content: j({
        style: 'contact-form',
        heading: 'Get a Quote Today',
        subheading: 'Tell us about your project and we\'ll be in touch within 2 hours.',
        formTitle: 'Request a Quote',
        formFields: [
          { id: 'name',          label: 'Full Name',              type: 'text',     required: true,  placeholder: 'e.g. John Smith' },
          { id: 'email',         label: 'Email Address',          type: 'email',    required: true,  placeholder: 'you@example.com' },
          { id: 'phone',         label: 'Phone Number',           type: 'tel',      required: false, placeholder: '+27 82 000 0000' },
          { id: 'concrete_type', label: 'Concrete Type',          type: 'select',   required: false, placeholder: 'Select type...', options: ['15MPa', '20MPa', '25MPa', '30MPa', '35MPa', '40MPa', 'Fibre reinforced', 'Marine grade', 'Other / Not sure'] },
          { id: 'volume',        label: 'Estimated Volume (m³)',  type: 'text',     required: false, placeholder: 'e.g. 12 m³' },
          { id: 'message',       label: 'Project Details',        type: 'textarea', required: true,  placeholder: 'Site address, pour date, access notes...' },
        ],
        formSuccessMessage: 'Thank you! We\'ll be in touch within 2 hours.',
        requireEmail: true,
        emailTo: 'info@overbergreadymix.co.za',
        emailSubject: 'Quote Request — Overberg ReadyMix',
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FOOTER',
      enabled: true,
      order: order++,
      displayName: 'Footer',
      background: '#111827',
      content: j({
        companyName: 'Overberg ReadyMix',
        tagline: 'Quality concrete. On time. Every time.',
        copyright: `© ${new Date().getFullYear()} Overberg ReadyMix (Pty) Ltd. All rights reserved.`,
        logoUrl: '',
        textColor: '#d1d5db',
        accentColor: '#4a7c59',
        columns: [
          {
            heading: 'Services',
            links: [
              { text: 'Standard Mixes',       href: '#services' },
              { text: 'Pumpable Concrete',     href: '#services' },
              { text: 'Fibre Reinforced',      href: '#services' },
              { text: 'Marine Grade',          href: '#services' },
              { text: 'Concrete Calculator',   href: '/calculator' },
            ],
          },
          {
            heading: 'Contact',
            links: [
              { text: '+27 28 312 0000',                    href: 'tel:+27283120000' },
              { text: 'info@overbergreadymix.co.za',        href: 'mailto:info@overbergreadymix.co.za' },
              { text: '14 Industrial Rd, Hermanus, 7200',   href: '#' },
              { text: 'Mon–Fri  06:00–16:00',               href: '#' },
              { text: 'Saturday 07:00–12:00',               href: '#' },
            ],
          },
          {
            heading: 'Coverage',
            links: [
              { text: 'Hermanus',        href: '#coverage' },
              { text: 'Stanford',        href: '#coverage' },
              { text: 'Caledon',         href: '#coverage' },
              { text: 'Gansbaai',        href: '#coverage' },
              { text: 'Check Your Area', href: '/coverage' },
            ],
          },
        ],
        socials: [
          { platform: 'facebook',  href: 'https://facebook.com/overbergreadymix',  icon: 'bi-facebook'  },
          { platform: 'instagram', href: 'https://instagram.com/overbergreadymix', icon: 'bi-instagram' },
        ],
      }),
    },
  });

  console.log('✅ Landing page: 8 sections created');
  console.log('');
  console.log('🎉 Overberg ReadyMix seed v5 complete!');
  console.log('');
  console.log('  Admin: http://localhost:3000/admin/login  (admin / admin2026)');
  console.log('  Home:  http://localhost:3000/');
  console.log('');
  console.log('  Sections:');
  console.log('    1. Hero (3 slides)');
  console.log('    2. About Us (solid #f0fdf4 bg)');
  console.log('    3. Services (dark solid, multi 2-zone)');
  console.log('    4. Why Choose Us (midnight gradient bg, multi 3-zone parallax)');
  console.log('    5. Projects (deep blue gradient bg)');
  console.log('    6. Coverage Map (light gray, multi 2-zone)');
  console.log('    7. CTA form');
  console.log('    8. Footer');
  console.log('  ⚠️  Coverage Map feature is DISABLED — enable in Admin → Pages → Features');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
