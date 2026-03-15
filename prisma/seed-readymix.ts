// @ts-nocheck
/**
 * OVERBERG READYMIX SEED — v3 (client-ready)
 *
 * Professional landing page for SA ready-mix concrete company.
 * Sections:
 *   1. HERO          — 3 slides with real construction photography
 *   2. ABOUT US      — Clean stats layout, NO scroll-stage
 *   3. SERVICES      — Dark card grid, 6 service types
 *   4. PROJECTS      — Projects gallery
 *   5. COVERAGE MAP  — Delivery area embed
 *   6. CTA           — Quote request form
 *   7. FOOTER
 *
 * Run: npx tsx prisma/seed-readymix.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../lib/auth';

function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue; }

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Overberg ReadyMix seed v3...');

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
                { text: 'Check Coverage', href: '#coverage', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'fade', animationDelay: 520 },
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
  // 2. ABOUT US — Clean FLEXIBLE layout, no scroll-stage
  //    Left col: company story | Right col: 4 key stats
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'About Us',
      background: '#ffffff',
      content: j({
        contentMode: 'single',
        designerData: {
          positionMode: 'grid',
          contentMode: 'single',
          blocks: [
            // ── LEFT COLUMN: company story ──────────────────────────────────
            {
              id: 1, type: 'text',
              position: { row: 0, col: 0, colSpan: 6 },
              props: {
                text: 'About Overberg ReadyMix',
                fontSize: 12, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textAlign: 'left', marginBottom: 16,
              },
            },
            {
              id: 2, type: 'text',
              position: { row: 1, col: 0, colSpan: 6 },
              props: {
                text: 'Family-owned.\nQuality-driven.\nOverberg-rooted.',
                fontSize: 38, fontWeight: 800, color: '#1f2937',
                lineHeight: 1.15, textAlign: 'left', marginBottom: 24,
              },
            },
            {
              id: 3, type: 'text',
              position: { row: 2, col: 0, colSpan: 6 },
              props: {
                text: 'Since 2005, Overberg ReadyMix has supplied ready-mix concrete to builders, developers, and contractors across the Overberg. What started as a single transit mixer has grown into a modern operation — 8 GPS-tracked trucks, a fully automated batching plant, and a team of 24 dedicated to delivering concrete that\'s consistent, on-spec, and on time.\n\nEvery batch begins with SANS-certified raw materials and a mix design matched to your project requirements. Our automated plant controls water-cement ratios to ±2%. You receive exactly what was batched — every time.',
                fontSize: 17, fontWeight: 400, color: '#4b5563',
                lineHeight: 1.8, textAlign: 'left',
              },
            },
            // ── RIGHT COLUMN: 4 stat cards ──────────────────────────────────
            {
              id: 4, type: 'card',
              position: { row: 0, col: 7, colSpan: 5 },
              props: {
                bgColor: '#f0fdf4', borderRadius: 12, padding: 28,
                textAlign: 'center',
                heading: '20+', headingColor: '#4a7c59',
                subheading: 'Years in the Overberg', subheadingColor: '#374151',
              },
            },
            {
              id: 5, type: 'card',
              position: { row: 1, col: 7, colSpan: 5 },
              props: {
                bgColor: '#f8fafc', borderRadius: 12, padding: 28,
                textAlign: 'center',
                heading: '8 Trucks', headingColor: '#1f2937',
                subheading: 'GPS-tracked fleet', subheadingColor: '#374151',
              },
            },
            {
              id: 6, type: 'card',
              position: { row: 2, col: 7, colSpan: 5 },
              props: {
                bgColor: '#f0fdf4', borderRadius: 12, padding: 28,
                textAlign: 'center',
                heading: '15–40MPa', headingColor: '#4a7c59',
                subheading: 'Full mix range', subheadingColor: '#374151',
              },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. SERVICES — Dark card grid, 6 service types, no scroll-stage
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
        contentMode: 'single',
        designerData: {
          positionMode: 'grid',
          contentMode: 'single',
          blocks: [
            // Section header
            {
              id: 10, type: 'text',
              position: { row: 0, col: 2, colSpan: 8 },
              props: {
                text: 'What We Supply',
                fontSize: 12, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 12,
              },
            },
            {
              id: 11, type: 'text',
              position: { row: 1, col: 1, colSpan: 10 },
              props: {
                text: 'Six concrete solutions. One reliable supplier.',
                fontSize: 36, fontWeight: 800, color: '#ffffff',
                textAlign: 'center', marginBottom: 48,
              },
            },
            // Row 1 of service cards
            {
              id: 12, type: 'card',
              position: { row: 2, col: 0, colSpan: 4 },
              props: {
                bgColor: '#374151', borderRadius: 10, padding: 28, textAlign: 'left',
                heading: 'Standard Mixes', headingColor: '#ffffff',
                subheading: '15MPa – 40MPa', subheadingColor: '#4a7c59',
                body: 'SANS 878-compliant mixes for domestic to heavy industrial. Cube-test certificates available on request.',
                bodyColor: '#9ca3af',
              },
            },
            {
              id: 13, type: 'card',
              position: { row: 2, col: 4, colSpan: 4 },
              props: {
                bgColor: '#374151', borderRadius: 10, padding: 28, textAlign: 'left',
                heading: 'Pumpable Concrete', headingColor: '#ffffff',
                subheading: '100–180mm slump', subheadingColor: '#4a7c59',
                body: 'High-workability mix for pump application. Ideal for elevated slabs, columns and restricted-access sites.',
                bodyColor: '#9ca3af',
              },
            },
            {
              id: 14, type: 'card',
              position: { row: 2, col: 8, colSpan: 4 },
              props: {
                bgColor: '#374151', borderRadius: 10, padding: 28, textAlign: 'left',
                heading: 'Fibre Reinforced', headingColor: '#ffffff',
                subheading: 'Steel or polypropylene', subheadingColor: '#4a7c59',
                body: 'Dosed at the plant — no on-site mixing errors. Polypropylene reduces plastic cracking; steel adds post-crack load capacity.',
                bodyColor: '#9ca3af',
              },
            },
            // Row 2 of service cards
            {
              id: 15, type: 'card',
              position: { row: 3, col: 0, colSpan: 4 },
              props: {
                bgColor: '#374151', borderRadius: 10, padding: 28, textAlign: 'left',
                heading: 'Marine Grade', headingColor: '#ffffff',
                subheading: 'Sulphate-resistant', subheadingColor: '#4a7c59',
                body: 'Low w/c ratio, blast-furnace slag additions. Purpose-built for coastal environments and sea-spray exposure.',
                bodyColor: '#9ca3af',
              },
            },
            {
              id: 16, type: 'card',
              position: { row: 3, col: 4, colSpan: 4 },
              props: {
                bgColor: '#374151', borderRadius: 10, padding: 28, textAlign: 'left',
                heading: 'Mass-Pour Mixes', headingColor: '#ffffff',
                subheading: 'Retaining walls & footings', subheadingColor: '#4a7c59',
                body: 'Optimised workability window for large-volume pours. Retarder packages available for hot-weather pouring.',
                bodyColor: '#9ca3af',
              },
            },
            {
              id: 17, type: 'card',
              position: { row: 3, col: 8, colSpan: 4 },
              props: {
                bgColor: '#374151', borderRadius: 10, padding: 28, textAlign: 'left',
                heading: 'Delivery Service', headingColor: '#ffffff',
                subheading: '6 m³ and 8 m³ loads', subheadingColor: '#4a7c59',
                body: 'GPS-tracked transit mixers. On-site within 1 hour of pour. Same-day orders accepted before 10:00 AM.',
                bodyColor: '#9ca3af',
              },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. PROJECTS GALLERY
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Projects',
      background: '#111827',
      content: j({
        contentMode: 'single',
        designerData: {
          positionMode: 'grid',
          contentMode: 'single',
          blocks: [
            {
              id: 30, type: 'text',
              position: { row: 0, col: 2, colSpan: 8 },
              props: {
                text: 'Our Work',
                fontSize: 12, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 12,
              },
            },
            {
              id: 31, type: 'text',
              position: { row: 1, col: 1, colSpan: 10 },
              props: {
                text: 'Completed Projects',
                fontSize: 36, fontWeight: 800, color: '#ffffff',
                textAlign: 'center', marginBottom: 40,
              },
            },
            {
              id: 32, type: 'projects-gallery',
              position: { row: 2, col: 0, colSpan: 12 },
              props: {
                heading: '',
                subtext: '',
                textColor: '#ffffff',
                columns: 3,
              },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. COVERAGE MAP
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
        contentMode: 'single',
        designerData: {
          positionMode: 'grid',
          contentMode: 'single',
          blocks: [
            {
              id: 50, type: 'text',
              position: { row: 0, col: 2, colSpan: 8 },
              props: {
                text: 'Delivery Coverage',
                fontSize: 12, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 12,
              },
            },
            {
              id: 51, type: 'text',
              position: { row: 1, col: 1, colSpan: 10 },
              props: {
                text: 'Do We Deliver to You?',
                fontSize: 36, fontWeight: 800, color: '#1f2937',
                textAlign: 'center', marginBottom: 12,
              },
            },
            {
              id: 52, type: 'text',
              position: { row: 2, col: 2, colSpan: 8 },
              props: {
                text: 'Search your town or suburb to check your delivery zone, or browse the map below.',
                fontSize: 17, fontWeight: 400, color: '#6b7280',
                textAlign: 'center', marginBottom: 32,
              },
            },
            {
              id: 53, type: 'coverage-map',
              position: { row: 3, col: 0, colSpan: 12 },
              props: { mapSlug: 'overberg', mapHeight: 500, showSearch: true, showGeolocation: true },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. CTA — quote request form
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
        heading: 'Get a Quote Today',
        subtext: 'Tell us about your project and we\'ll be in touch within 2 hours.',
        headingColor: '#ffffff',
        subtextColor: '#9ca3af',
        showForm: true,
        formFields: [
          { id: 'name',          label: 'Full Name',              type: 'text',     required: true,  placeholder: 'e.g. John Smith' },
          { id: 'email',         label: 'Email Address',          type: 'email',    required: true,  placeholder: 'you@example.com' },
          { id: 'phone',         label: 'Phone Number',           type: 'tel',      required: false, placeholder: '+27 82 000 0000' },
          { id: 'concrete_type', label: 'Concrete Type',          type: 'select',   required: false, placeholder: '', options: ['15MPa', '20MPa', '25MPa', '30MPa', '35MPa', '40MPa', 'Fibre reinforced', 'Marine grade', 'Other / Not sure'] },
          { id: 'volume',        label: 'Estimated Volume (m³)',  type: 'text',     required: false, placeholder: 'e.g. 12 m³' },
          { id: 'message',       label: 'Project Details',        type: 'textarea', required: true,  placeholder: 'Site address, pour date, access notes...' },
        ],
        submitLabel: 'Request Quote',
        submitColor: '#4a7c59',
        submitTextColor: '#ffffff',
        requireEmail: true,
        emailTo: 'info@overbergreadymix.co.za',
        emailSubject: 'Quote Request — Overberg ReadyMix',
        successMessage: 'Thank you! We\'ll be in touch within 2 hours.',
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
              { text: 'Hermanus',       href: '#coverage' },
              { text: 'Stanford',       href: '#coverage' },
              { text: 'Caledon',        href: '#coverage' },
              { text: 'Gansbaai',       href: '#coverage' },
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

  console.log(`✅ Landing page: 7 sections created`);
  console.log('');
  console.log('🎉 Overberg ReadyMix seed v3 complete!');
  console.log('');
  console.log('  Admin: http://localhost:3000/admin/login  (admin / admin2026)');
  console.log('  Home:  http://localhost:3000/');
  console.log('');
  console.log('  Sections: Hero (3 image slides) → About Us → Services → Projects → Coverage → CTA → Footer');
  console.log('  ⚠️  Coverage Map feature is DISABLED — enable in Admin → Settings → Client Features');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
