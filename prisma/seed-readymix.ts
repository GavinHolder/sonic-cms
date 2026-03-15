// @ts-nocheck
/**
 * OVERBERG READYMIX SEED
 *
 * Seeds a complete ready-mix concrete company landing page:
 *  ✓ ClientFeature: coverage-map (DISABLED by default)
 *  ✓ ClientFeature: concrete-calculator (ENABLED)
 *  ✓ Demo CoverageMap: Overberg region with 4 delivery zones
 *  ✓ 4 demo projects with images
 *  ✓ Full landing page: Hero, About (scroll-stage), Services (scroll-stage),
 *    Projects gallery, Team, Coverage Map embed, CTA, Footer
 *
 * Run: npx ts-node --skip-project prisma/seed-readymix.ts
 * Or:  npm run db:seed-readymix
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../lib/auth';

// Helper to cast complex content objects to Prisma JSON type
function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue; }

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Overberg ReadyMix seed...');

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
        enabled: false,  // DISABLED by default — enable in admin Settings → Features
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

  // Approximate Overberg delivery zones
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
      { mapId: overbergMap.id, text: 'Hermanus', lat: -34.42, lng: 19.24, fontSize: 14, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: true },
      { mapId: overbergMap.id, text: 'Stanford', lat: -34.46, lng: 19.51, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
      { mapId: overbergMap.id, text: 'Caledon', lat: -34.26, lng: 19.47, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
      { mapId: overbergMap.id, text: 'Gansbaai', lat: -34.61, lng: 19.38, fontSize: 13, fontFamily: 'Arial', color: '#fff', bgColor: null, bold: false },
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
        images: [],
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
        images: [],
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
      { key: 'companyName', value: 'Overberg ReadyMix' },
      { key: 'tagline', value: 'Quality concrete delivered to your site' },
      { key: 'email', value: 'info@overbergreadymix.co.za' },
      { key: 'phone', value: '+27 28 312 0000' },
      { key: 'address', value: '14 Industrial Road, Hermanus, 7200' },
      { key: 'facebook', value: 'https://facebook.com/overbergreadymix' },
      { key: 'instagram', value: 'https://instagram.com/overbergreadymix' },
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
  // 1. HERO — concrete imagery, green accent
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'HERO',
      enabled: true,
      order: order++,
      displayName: 'Hero',
      paddingTop: 0,
      paddingBottom: 0,
      background: 'transparent',
      content: {
        slides: [
          {
            id: 'slide-1',
            type: 'color',
            src: '',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 95, endOpacity: 70, color: '#111827' },
            },
            overlay: {
              heading: {
                text: 'Ready-Mix Concrete. Delivered.',
                fontSize: 68, fontWeight: 800, color: '#ffffff',
                animation: 'slideUp', animationDuration: 900, animationDelay: 100,
              },
              subheading: {
                text: 'Serving the Overberg region — Hermanus, Stanford, Caledon and beyond. Consistent quality, on-time delivery, expert mix design.',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.82)',
                animation: 'slideUp', animationDuration: 900, animationDelay: 300,
              },
              buttons: [
                { text: 'Get a Quote', href: '#contact', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
                { text: 'Check Coverage', href: '#coverage', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 620 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 20, betweenSubheadingButtons: 44, betweenButtons: 14 },
            },
          },
          {
            id: 'slide-2',
            type: 'color',
            src: '',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'topLeft', startOpacity: 95, endOpacity: 75, color: '#1f2937' },
            },
            overlay: {
              heading: {
                text: 'Built on Quality. Trusted by Builders.',
                fontSize: 64, fontWeight: 800, color: '#ffffff',
                animation: 'fade', animationDuration: 1000, animationDelay: 0,
              },
              subheading: {
                text: 'From footings to floor slabs — our mix designs are engineered for your application, not just from a bag.',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.82)',
                animation: 'fade', animationDuration: 1000, animationDelay: 200,
              },
              buttons: [
                { text: 'Our Projects', href: '#projects', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'fade', animationDelay: 400 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 20, betweenSubheadingButtons: 44, betweenButtons: 14 },
            },
          },
        ],
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionDuration: 800,
        showDots: true,
        showArrows: false,
      },
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ABOUT US — FLEXIBLE scroll-stage (3 zones)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'About Us',
      paddingTop: 80,
      paddingBottom: 80,
      background: '#f9fafb',
      content: {
        contentMode: 'multi',
        multiLimit: 3,
        scrollStage: {
          enabled: true,
          side: 'right',
          scrollMode: 'snap',
          zones: [
            {
              visualType: 'threejs',
              shape: 'sphere',
              color: '#4a7c59',
              emissive: '#1f2937',
              wireframe: false,
              rotationSpeed: 0.6,
              scrollSpin: 1.5,
              bgColor: '#1f2937',
              ambientIntensity: 0.5,
              pointIntensity: 2.0,
              transitionDuration: 500,
            },
            {
              visualType: 'threejs',
              shape: 'box',
              color: '#374151',
              emissive: '#111827',
              wireframe: true,
              rotationSpeed: 0.4,
              scrollSpin: 2,
              bgColor: '#111827',
              ambientIntensity: 0.4,
              pointIntensity: 1.8,
              transitionDuration: 500,
            },
            {
              visualType: 'threejs',
              shape: 'torus',
              color: '#22c55e',
              emissive: '#14532d',
              wireframe: false,
              rotationSpeed: 0.8,
              scrollSpin: 1.8,
              bgColor: '#0f2d1a',
              ambientIntensity: 0.6,
              pointIntensity: 2.5,
              transitionDuration: 500,
            },
          ],
        },
        designerData: {
          positionMode: 'grid',
          contentMode: 'multi',
          multiLimit: 3,
          blocks: [
            // Zone 0 — Who we are
            {
              id: 1, type: 'text',
              position: { row: 0, col: 0, colSpan: 12, section: 0 },
              props: {
                text: 'Who We Are',
                fontSize: 13, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12,
              },
            },
            {
              id: 2, type: 'text',
              position: { row: 1, col: 0, colSpan: 12, section: 0 },
              props: {
                text: 'Family-owned. Overberg-rooted.',
                fontSize: 36, fontWeight: 800, color: '#1f2937',
                lineHeight: 1.15, marginBottom: 20,
              },
            },
            {
              id: 3, type: 'text',
              position: { row: 2, col: 0, colSpan: 12, section: 0 },
              props: {
                text: 'Overberg ReadyMix has been supplying ready-mix concrete to the Overberg region since 2005. What started as a single transit mixer now operates a modern fleet of 8 trucks, a fully automated batching plant, and a team of 24 professionals dedicated to quality concrete, on time.',
                fontSize: 17, fontWeight: 400, color: '#4b5563', lineHeight: 1.7,
              },
            },
            // Zone 1 — Our process
            {
              id: 4, type: 'text',
              position: { row: 0, col: 0, colSpan: 12, section: 1 },
              props: {
                text: 'Our Process',
                fontSize: 13, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12,
              },
            },
            {
              id: 5, type: 'text',
              position: { row: 1, col: 0, colSpan: 12, section: 1 },
              props: {
                text: 'Precision from plant to pour.',
                fontSize: 36, fontWeight: 800, color: '#1f2937',
                lineHeight: 1.15, marginBottom: 20,
              },
            },
            {
              id: 6, type: 'text',
              position: { row: 2, col: 0, colSpan: 12, section: 1 },
              props: {
                text: 'Every batch begins with SANS-certified raw materials and a mix design matched to your project requirements. Our automated batching plant controls water-cement ratios to ±2%. Each truck is fitted with GPS and drum-speed monitoring to guarantee you receive exactly what was batched.',
                fontSize: 17, fontWeight: 400, color: '#4b5563', lineHeight: 1.7,
              },
            },
            // Zone 2 — Why us
            {
              id: 7, type: 'text',
              position: { row: 0, col: 0, colSpan: 12, section: 2 },
              props: {
                text: 'Why ReadyMix',
                fontSize: 13, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12,
              },
            },
            {
              id: 8, type: 'text',
              position: { row: 1, col: 0, colSpan: 12, section: 2 },
              props: {
                text: 'Consistent strength. Every pour.',
                fontSize: 36, fontWeight: 800, color: '#1f2937',
                lineHeight: 1.15, marginBottom: 20,
              },
            },
            {
              id: 9, type: 'text',
              position: { row: 2, col: 0, colSpan: 12, section: 2 },
              props: {
                text: 'Site-mixed concrete varies. Our plant-mixed product delivers the same water-cement ratio on pour 1 and pour 100. That consistency means fewer failed test cubes, faster construction, and a structure that meets your engineer\'s spec.',
                fontSize: 17, fontWeight: 400, color: '#4b5563', lineHeight: 1.7,
              },
            },
          ],
        },
      },
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. SERVICES — FLEXIBLE scroll-stage (5 zones)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Services',
      paddingTop: 80,
      paddingBottom: 80,
      background: '#1f2937',
      content: {
        contentMode: 'multi',
        multiLimit: 5,
        scrollStage: {
          enabled: true,
          side: 'left',
          scrollMode: 'snap',
          zones: [
            { visualType: 'threejs', shape: 'icosahedron', color: '#4a7c59', emissive: '#1a3d2b', wireframe: false, rotationSpeed: 0.5, scrollSpin: 2, bgColor: '#1f2937', ambientIntensity: 0.5, pointIntensity: 2.2, transitionDuration: 450 },
            { visualType: 'threejs', shape: 'torusKnot', color: '#6b7280', emissive: '#1f2937', wireframe: false, rotationSpeed: 0.7, scrollSpin: 1.5, bgColor: '#111827', ambientIntensity: 0.4, pointIntensity: 2.0, transitionDuration: 450 },
            { visualType: 'threejs', shape: 'box', color: '#374151', emissive: '#0f172a', wireframe: true, rotationSpeed: 0.3, scrollSpin: 3, bgColor: '#0f172a', ambientIntensity: 0.3, pointIntensity: 1.5, transitionDuration: 450 },
            { visualType: 'threejs', shape: 'sphere', color: '#22c55e', emissive: '#14532d', wireframe: false, rotationSpeed: 0.6, scrollSpin: 1.8, bgColor: '#052e16', ambientIntensity: 0.6, pointIntensity: 2.8, transitionDuration: 450 },
            { visualType: 'threejs', shape: 'torus', color: '#9ca3af', emissive: '#374151', wireframe: true, rotationSpeed: 0.4, scrollSpin: 2.2, bgColor: '#1f2937', ambientIntensity: 0.4, pointIntensity: 1.8, transitionDuration: 450 },
          ],
        },
        designerData: {
          positionMode: 'grid',
          contentMode: 'multi',
          multiLimit: 5,
          blocks: [
            // Zone 0 — Standard mixes
            { id: 10, type: 'text', position: { row: 0, col: 0, colSpan: 12, section: 0 }, props: { text: '01 — Standard Mixes', fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 } },
            { id: 11, type: 'text', position: { row: 1, col: 0, colSpan: 12, section: 0 }, props: { text: '15MPa to 40MPa', fontSize: 40, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: 20 } },
            { id: 12, type: 'text', position: { row: 2, col: 0, colSpan: 12, section: 0 }, props: { text: 'From light domestic work (15MPa) to heavy industrial floors (40MPa). All mixes are SANS 878-compliant with certified cube-test results available on request.', fontSize: 17, fontWeight: 400, color: '#d1d5db', lineHeight: 1.7 } },
            // Zone 1 — Pumpable
            { id: 13, type: 'text', position: { row: 0, col: 0, colSpan: 12, section: 1 }, props: { text: '02 — Pumpable Mixes', fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 } },
            { id: 14, type: 'text', position: { row: 1, col: 0, colSpan: 12, section: 1 }, props: { text: 'High-slump concrete for pump application', fontSize: 36, fontWeight: 800, color: '#ffffff', lineHeight: 1.15, marginBottom: 20 } },
            { id: 15, type: 'text', position: { row: 2, col: 0, colSpan: 12, section: 1 }, props: { text: 'Formulated for 100–180mm slump. Retarder and plasticiser packages available. Ideal for elevated slabs, vertical structures and restricted-access sites.', fontSize: 17, fontWeight: 400, color: '#d1d5db', lineHeight: 1.7 } },
            // Zone 2 — Fibre-reinforced
            { id: 16, type: 'text', position: { row: 0, col: 0, colSpan: 12, section: 2 }, props: { text: '03 — Fibre Reinforced', fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 } },
            { id: 17, type: 'text', position: { row: 1, col: 0, colSpan: 12, section: 2 }, props: { text: 'Steel or polypropylene fibre blends', fontSize: 36, fontWeight: 800, color: '#ffffff', lineHeight: 1.15, marginBottom: 20 } },
            { id: 18, type: 'text', position: { row: 2, col: 0, colSpan: 12, section: 2 }, props: { text: 'Added directly to the drum. No on-site dosing errors. Polypropylene fibres reduce plastic shrinkage cracking. Steel fibres provide post-crack load capacity for industrial floors.', fontSize: 17, fontWeight: 400, color: '#d1d5db', lineHeight: 1.7 } },
            // Zone 3 — Marine grade
            { id: 19, type: 'text', position: { row: 0, col: 0, colSpan: 12, section: 3 }, props: { text: '04 — Marine Grade', fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 } },
            { id: 20, type: 'text', position: { row: 1, col: 0, colSpan: 12, section: 3 }, props: { text: 'Sulphate-resistant. Sea-spray rated.', fontSize: 36, fontWeight: 800, color: '#ffffff', lineHeight: 1.15, marginBottom: 20 } },
            { id: 21, type: 'text', position: { row: 2, col: 0, colSpan: 12, section: 3 }, props: { text: 'Purpose-designed for coastal environments. Low water-to-cement ratio, blast-furnace slag additions, and penetration-resistant formulation. Extensively used at Gansbaai harbour and coastal residential projects.', fontSize: 17, fontWeight: 400, color: '#d1d5db', lineHeight: 1.7 } },
            // Zone 4 — Delivery
            { id: 22, type: 'text', position: { row: 0, col: 0, colSpan: 12, section: 4 }, props: { text: '05 — Delivery Service', fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 } },
            { id: 23, type: 'text', position: { row: 1, col: 0, colSpan: 12, section: 4 }, props: { text: '6 m³ or 8 m³ per load', fontSize: 40, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: 20 } },
            { id: 24, type: 'text', position: { row: 2, col: 0, colSpan: 12, section: 4 }, props: { text: 'GPS-tracked transit mixers. Delivery within 1 hour of pour — guaranteed. Short-load charges apply for orders under 3 m³. Same-day orders accepted before 10:00 AM.', fontSize: 17, fontWeight: 400, color: '#d1d5db', lineHeight: 1.7 } },
          ],
        },
      },
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. PROJECTS GALLERY — FLEXIBLE single-zone
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Projects',
      paddingTop: 80,
      paddingBottom: 80,
      background: '#111827',
      content: {
        contentMode: 'single',
        designerData: {
          positionMode: 'grid',
          contentMode: 'single',
          blocks: [
            {
              id: 30, type: 'text',
              position: { row: 0, col: 0, colSpan: 12 },
              props: {
                text: 'Our Work',
                fontSize: 12, fontWeight: 700, color: '#4a7c59',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 8,
              },
            },
            {
              id: 31, type: 'text',
              position: { row: 1, col: 0, colSpan: 12 },
              props: {
                text: 'Completed Projects',
                fontSize: 38, fontWeight: 800, color: '#ffffff',
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
      },
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. TEAM — FLEXIBLE grid
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Team',
      paddingTop: 80,
      paddingBottom: 80,
      background: '#f9fafb',
      content: {
        contentMode: 'single',
        designerData: {
          positionMode: 'grid',
          contentMode: 'single',
          blocks: [
            {
              id: 40, type: 'text',
              position: { row: 0, col: 0, colSpan: 12 },
              props: { text: 'Meet the Team', fontSize: 13, fontWeight: 700, color: '#4a7c59', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 },
            },
            {
              id: 41, type: 'text',
              position: { row: 1, col: 0, colSpan: 12 },
              props: { text: 'The People Behind Your Pour', fontSize: 36, fontWeight: 800, color: '#1f2937', textAlign: 'center', marginBottom: 48 },
            },
            // Team card 1
            {
              id: 42, type: 'card',
              position: { row: 2, col: 0, colSpan: 4 },
              props: {
                bgColor: '#ffffff',
                borderRadius: 12,
                padding: 28,
                textAlign: 'center',
                imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
                imageStyle: 'circle',
                heading: 'Johan van der Berg',
                headingColor: '#1f2937',
                subheading: 'Managing Director',
                subheadingColor: '#4a7c59',
                body: '20 years in the ready-mix industry. Johan oversees plant operations and key project partnerships.',
                bodyColor: '#6b7280',
              },
            },
            // Team card 2
            {
              id: 43, type: 'card',
              position: { row: 2, col: 4, colSpan: 4 },
              props: {
                bgColor: '#ffffff',
                borderRadius: 12,
                padding: 28,
                textAlign: 'center',
                imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b3a0?w=400&q=80',
                imageStyle: 'circle',
                heading: 'Anita Jansen',
                headingColor: '#1f2937',
                subheading: 'Technical Manager',
                subheadingColor: '#4a7c59',
                body: 'Pr.Eng., MSAICE. Anita designs all custom mix specifications and manages cube-test programmes.',
                bodyColor: '#6b7280',
              },
            },
            // Team card 3
            {
              id: 44, type: 'card',
              position: { row: 2, col: 8, colSpan: 4 },
              props: {
                bgColor: '#ffffff',
                borderRadius: 12,
                padding: 28,
                textAlign: 'center',
                imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
                imageStyle: 'circle',
                heading: 'Thabo Dlamini',
                headingColor: '#1f2937',
                subheading: 'Fleet & Logistics',
                subheadingColor: '#4a7c59',
                body: 'Coordinates 8 transit mixers across the Overberg. 15 years of concrete logistics experience.',
                bodyColor: '#6b7280',
              },
            },
          ],
        },
      },
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. COVERAGE MAP — FLEXIBLE embed (visible only when feature enabled)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Coverage Map',
      paddingTop: 80,
      paddingBottom: 80,
      background: '#f3f4f6',
      content: {
        contentMode: 'single',
        designerData: {
          positionMode: 'grid',
          contentMode: 'single',
          blocks: [
            {
              id: 50, type: 'text',
              position: { row: 0, col: 0, colSpan: 12 },
              props: { text: 'Delivery Coverage', fontSize: 13, fontWeight: 700, color: '#4a7c59', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 },
            },
            {
              id: 51, type: 'text',
              position: { row: 1, col: 0, colSpan: 12 },
              props: { text: 'Do We Deliver to You?', fontSize: 36, fontWeight: 800, color: '#1f2937', textAlign: 'center', marginBottom: 16 },
            },
            {
              id: 52, type: 'text',
              position: { row: 2, col: 0, colSpan: 12 },
              props: { text: 'Search your town or suburb below, or browse the map to check your delivery zone.', fontSize: 16, fontWeight: 400, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
            },
            {
              id: 53, type: 'coverage-map',
              position: { row: 3, col: 0, colSpan: 12 },
              props: { mapSlug: 'overberg', mapHeight: 500, showSearch: true, showGeolocation: true },
            },
          ],
        },
      },
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. CTA — with contact form
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'CTA',
      enabled: true,
      order: order++,
      displayName: 'Contact',
      paddingTop: 80,
      paddingBottom: 80,
      background: '#1f2937',
      content: {
        heading: 'Get a Quote Today',
        subtext: 'Tell us about your project and we\'ll be in touch within 2 hours.',
        headingColor: '#ffffff',
        subtextColor: '#9ca3af',
        showForm: true,
        formFields: [
          { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. John Smith' },
          { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
          { id: 'phone', label: 'Phone Number', type: 'tel', required: false, placeholder: '+27 82 000 0000' },
          { id: 'concrete_type', label: 'Concrete Type', type: 'select', required: false, placeholder: '', options: ['15MPa', '20MPa', '25MPa', '30MPa', '35MPa', 'Fibre reinforced', 'Other / Not sure'] },
          { id: 'volume', label: 'Estimated Volume (m³)', type: 'text', required: false, placeholder: 'e.g. 12 m³' },
          { id: 'message', label: 'Project Details', type: 'textarea', required: true, placeholder: 'Site address, pour date, access notes...' },
        ],
        submitLabel: 'Request Quote',
        submitColor: '#4a7c59',
        submitTextColor: '#ffffff',
        requireEmail: true,
        emailTo: 'info@overbergreadymix.co.za',
        emailSubject: 'Quote Request — Overberg ReadyMix',
        successMessage: 'Thank you! We\'ll be in touch within 2 hours.',
      },
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 8. FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FOOTER',
      enabled: true,
      order: order++,
      displayName: 'Footer',
      paddingTop: 0,
      paddingBottom: 0,
      background: '#111827',
      content: {
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
              { text: 'Standard Mixes', href: '#services' },
              { text: 'Pumpable Concrete', href: '#services' },
              { text: 'Fibre Reinforced', href: '#services' },
              { text: 'Marine Grade', href: '#services' },
              { text: 'Concrete Calculator', href: '/calculator' },
            ],
          },
          {
            heading: 'Contact',
            links: [
              { text: '+27 28 312 0000', href: 'tel:+27283120000' },
              { text: 'info@overbergreadymix.co.za', href: 'mailto:info@overbergreadymix.co.za' },
              { text: '14 Industrial Rd, Hermanus', href: '#' },
              { text: 'Mon–Fri 06:00–16:00', href: '#' },
              { text: 'Sat 07:00–12:00', href: '#' },
            ],
          },
          {
            heading: 'Coverage',
            links: [
              { text: 'Hermanus', href: '#coverage' },
              { text: 'Stanford', href: '#coverage' },
              { text: 'Caledon', href: '#coverage' },
              { text: 'Gansbaai', href: '#coverage' },
              { text: 'Check Your Area', href: '/coverage' },
            ],
          },
        ],
        socials: [
          { platform: 'facebook', href: 'https://facebook.com/overbergreadymix', icon: 'bi-facebook' },
          { platform: 'instagram', href: 'https://instagram.com/overbergreadymix', icon: 'bi-instagram' },
        ],
      },
    },
  });

  console.log(`✅ Landing page: 8 sections created`);
  console.log('');
  console.log('🎉 Overberg ReadyMix seed complete!');
  console.log('');
  console.log('  Admin login: http://localhost:3000/admin/login');
  console.log('  Username: admin / Password: admin2026');
  console.log('');
  console.log('  ⚠️  Coverage Map feature is DISABLED by default.');
  console.log('     To enable: Admin → Settings → Client Features → Coverage Map → toggle ON');
  console.log('     Then push schema: npx prisma db push');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
