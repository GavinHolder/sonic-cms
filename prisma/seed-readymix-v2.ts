// @ts-nocheck
/**
 * OVERBERG READY MIX — Seed v2
 *
 * Sections:
 *   1. HERO            — 3 slides, wave lower-third
 *   2. WHY CHOOSE US   — FLEXIBLE 3-col trust pillars
 *   3. CONCRETE MIXES  — FLEXIBLE 3+2 product cards, particle-field bg
 *   4. PARALLAX        — FLEXIBLE parallax bg + stats + motion element
 *   5. DELIVERY AREA   — FLEXIBLE coverage-map block
 *   6. OUR PROJECTS    — FLEXIBLE 2×2 photo-card gallery
 *   7. GET A QUOTE     — CTA contact form, ripple lower-third
 *   8. FOOTER          — 3-col links
 *
 * Run: npx tsx prisma/seed-readymix-v2.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../lib/auth';

function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue; }

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Overberg Ready Mix seed v2...');

  // ── Full wipe (foreign-key safe order) ─────────────────────────────────────
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

  // ── Admin user ──────────────────────────────────────────────────────────────
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

  // ── Site config (navbarStyle: tall) ────────────────────────────────────────
  await prisma.siteConfig.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      companyName: 'Overberg Ready Mix',
      tagline: 'Quality Concrete. Delivered on Time.',
      phone: '+27 (0)28 123 4567',
      email: 'info@overbergreadymix.co.za',
      address: 'Overberg Region, Western Cape',
      navbarStyle: 'tall',
      facebook: 'https://facebook.com/overbergreadymix',
      instagram: 'https://instagram.com/overbergreadymix',
      linkedin: 'https://linkedin.com/company/overbergreadymix',
    },
    update: {
      companyName: 'Overberg Ready Mix',
      tagline: 'Quality Concrete. Delivered on Time.',
      phone: '+27 (0)28 123 4567',
      email: 'info@overbergreadymix.co.za',
      address: 'Overberg Region, Western Cape',
      navbarStyle: 'tall',
      facebook: 'https://facebook.com/overbergreadymix',
      instagram: 'https://instagram.com/overbergreadymix',
      linkedin: 'https://linkedin.com/company/overbergreadymix',
    },
  });
  console.log('✅ Site config: Overberg Ready Mix (tall navbar)');

  // ── Client features ─────────────────────────────────────────────────────────
  // IMPORTANT: slug is 'coverage-map' (singular) — matches app/coverage/page.tsx
  await prisma.clientFeature.createMany({
    data: [
      {
        slug: 'concrete-calculator',
        name: 'Concrete Calculator',
        enabled: true,
        config: j({
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
        }),
      },
      {
        slug: 'coverage-map',
        name: 'Coverage Map',
        enabled: true,
        config: j({}),
      },
    ],
  });
  console.log('✅ Features: concrete-calculator (on), coverage-map (on)');

  // ── Overberg Coverage Map ───────────────────────────────────────────────────
  const overbergMap = await prisma.coverageMap.create({
    data: {
      name: 'Overberg Region',
      slug: 'overberg',
      description: 'Primary delivery area covering Hermanus, Stanford, Caledon and Gansbaai.',
      centerLat: -34.4187,
      centerLng: 19.2345,
      defaultZoom: 10,
      isActive: true,
    },
  });

  await prisma.coverageRegion.createMany({
    data: [
      {
        mapId: overbergMap.id, name: 'Hermanus', description: 'Full coverage — 7 days',
        color: '#22c55e', opacity: 0.38, strokeColor: '#16a34a', strokeWidth: 2,
        isActive: true, order: 0,
        polygon: j([
          { lat: -34.38, lng: 19.20 }, { lat: -34.38, lng: 19.35 },
          { lat: -34.47, lng: 19.35 }, { lat: -34.47, lng: 19.20 },
        ]),
      },
      {
        mapId: overbergMap.id, name: 'Stanford', description: 'Mon–Fri delivery',
        color: '#4a7c59', opacity: 0.38, strokeColor: '#2d5a3d', strokeWidth: 2,
        isActive: true, order: 1,
        polygon: j([
          { lat: -34.43, lng: 19.46 }, { lat: -34.43, lng: 19.56 },
          { lat: -34.50, lng: 19.56 }, { lat: -34.50, lng: 19.46 },
        ]),
      },
      {
        mapId: overbergMap.id, name: 'Caledon', description: 'Delivery Tue/Thu',
        color: '#6b7280', opacity: 0.35, strokeColor: '#4b5563', strokeWidth: 2,
        isActive: true, order: 2,
        polygon: j([
          { lat: -34.20, lng: 19.40 }, { lat: -34.20, lng: 19.55 },
          { lat: -34.32, lng: 19.55 }, { lat: -34.32, lng: 19.40 },
        ]),
      },
      {
        mapId: overbergMap.id, name: 'Gansbaai', description: 'On-request delivery',
        color: '#f59e0b', opacity: 0.30, strokeColor: '#d97706', strokeWidth: 2,
        isActive: true, order: 3,
        polygon: j([
          { lat: -34.57, lng: 19.32 }, { lat: -34.57, lng: 19.45 },
          { lat: -34.65, lng: 19.45 }, { lat: -34.65, lng: 19.32 },
        ]),
      },
    ],
  });

  await prisma.coverageLabel.createMany({
    data: [
      { mapId: overbergMap.id, text: 'Hermanus', lat: -34.42, lng: 19.24, fontSize: 14, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: true },
      { mapId: overbergMap.id, text: 'Stanford',  lat: -34.46, lng: 19.51, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
      { mapId: overbergMap.id, text: 'Caledon',   lat: -34.26, lng: 19.47, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
      { mapId: overbergMap.id, text: 'Gansbaai',  lat: -34.61, lng: 19.38, fontSize: 13, fontFamily: 'Arial', color: '#ffffff', bgColor: null, bold: false },
    ],
  });
  console.log('✅ Coverage Map: Overberg (4 regions, 4 labels)');

  // ── Reference Projects ──────────────────────────────────────────────────────
  await prisma.project.createMany({
    data: [
      {
        title: 'Hermanus Shopping Centre — Parking Slab',
        location: 'Hermanus, Western Cape',
        description: '2 800 m² reinforced concrete parking slab. 25 MPa mix, 150mm depth. 3 pours over 5 days.',
        coverImageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
        images: j(['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80']),
        completedDate: 'November 2024', isActive: true, order: 0,
      },
      {
        title: 'Stanford Primary School — Foundation',
        location: 'Stanford, Western Cape',
        description: 'Strip and pad footings for 12-classroom block. 15 MPa mix. 140 m³ total volume.',
        coverImageUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&q=80',
        images: j(['https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&q=80']),
        completedDate: 'August 2024', isActive: true, order: 1,
      },
      {
        title: 'Caledon Industrial Estate — Floor Slab',
        location: 'Caledon, Western Cape',
        description: '4 500 m² industrial floor slab with fibre reinforcement. 30 MPa mix, 200mm depth.',
        coverImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        images: j(['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80']),
        completedDate: 'March 2025', isActive: true, order: 2,
      },
      {
        title: 'Gansbaai Harbour — Retaining Wall',
        location: 'Gansbaai, Western Cape',
        description: 'Marine-grade 25 MPa retaining wall, 65 linear metres. Sea-spray environment.',
        coverImageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
        images: j(['https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80']),
        completedDate: 'January 2025', isActive: true, order: 3,
      },
    ],
  });
  console.log('✅ Projects: 4 reference projects');

  // ── Landing page ────────────────────────────────────────────────────────────
  const page = await prisma.page.create({
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
  console.log('✅ Page: / (Home, PUBLISHED)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — HERO (3 slides)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'HERO',
      enabled: true,
      order: order++,
      displayName: 'Hero',
      paddingTop: 0,
      paddingBottom: 0,
      background: 'transparent',
      lowerThird: j({
        enabled: true,
        mode: 'preset',
        preset: 'wave',
        presetColor: '#4a7c59',
        presetOpacity: 1,
        height: 80,
        flipHorizontal: false,
        flipVertical: false,
      }),
      content: j({
        slides: [
          {
            id: 'slide-1',
            type: 'image',
            src: 'https://images.unsplash.com/photo-1626885930974-4b69aa21bbf9?w=1600',
            gradient: {
              enabled: true, type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 65, endOpacity: 35, color: '#000000' },
            },
            overlay: {
              heading: {
                text: 'Quality Concrete. Delivered on Time.',
                fontSize: 72, fontWeight: 900, color: '#ffffff',
                animation: 'slideUp', animationDuration: 800, animationDelay: 200,
              },
              subheading: {
                text: 'Serving the Overberg region — Hermanus, Stanford, Caledon & Gansbaai',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.82)',
                animation: 'slideUp', animationDuration: 800, animationDelay: 400,
              },
              buttons: [
                { text: 'Get a Quote', href: '#contact', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 600 },
                { text: 'Calculate Your Concrete', href: '/calculator', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 720 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 44, betweenButtons: 16 },
            },
          },
          {
            id: 'slide-2',
            type: 'image',
            src: 'https://images.unsplash.com/photo-1581092580497-e0d23cbfbf0b?w=1600',
            gradient: {
              enabled: true, type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 70, endOpacity: 40, color: '#0f1f10' },
            },
            overlay: {
              heading: {
                text: 'Five Strength Grades. One Reliable Supplier.',
                fontSize: 68, fontWeight: 900, color: '#ffffff',
                animation: 'fade', animationDuration: 1000, animationDelay: 0,
              },
              subheading: {
                text: 'From foundations to industrial slabs — we have the right mix for every job.',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.82)',
                animation: 'fade', animationDuration: 1000, animationDelay: 200,
              },
              buttons: [
                { text: 'View Our Mixes', href: '#mixes', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'fade', animationDelay: 400 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 44, betweenButtons: 16 },
            },
          },
          {
            id: 'slide-3',
            type: 'image',
            src: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600',
            gradient: {
              enabled: true, type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 65, endOpacity: 35, color: '#111827' },
            },
            overlay: {
              heading: {
                text: 'Local Knowledge. Regional Coverage.',
                fontSize: 68, fontWeight: 900, color: '#ffffff',
                animation: 'slideUp', animationDuration: 800, animationDelay: 100,
              },
              subheading: {
                text: 'Born and based in the Overberg. We know your roads, your sites, your deadlines.',
                fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.82)',
                animation: 'slideUp', animationDuration: 800, animationDelay: 300,
              },
              buttons: [
                { text: 'Our Delivery Area', href: '#delivery', backgroundColor: '#4a7c59', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 44, betweenButtons: 16 },
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
  console.log('✅ Section 1: HERO (3 slides)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — WHY CHOOSE US
  // Grid: 3 cols × 2 rows, gap 28
  //   Row 1: heading block (colSpan 3, auto height)
  //   Row 2: 3 cards with green top border (1fr — fills remaining space)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Why Choose Us',
      navLabel: 'Benefits',
      background: '#f9fafb',
      paddingTop: 60,
      paddingBottom: 60,
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 3, rows: 2, gap: 28 },
          blocks: [
            {
              id: 1, type: 'text',
              position: { row: 1, col: 1, colSpan: 3 },
              props: { textAlign: 'left', paddingTop: 0, paddingBottom: 0 },
              subElements: [
                { type: 'heading', props: { text: 'WHY OVERBERG READY MIX', fontSize: 11, fontWeight: '700', color: '#4a7c59', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'left', marginBottom: 14 } },
                { type: 'heading', props: { text: 'Built on Reliability. Backed by Local Experience.', fontSize: 44, fontWeight: '900', color: '#1f2937', lineHeight: 1.05, textAlign: 'left', marginBottom: 14 } },
                { type: 'paragraph', props: { text: 'Three reasons contractors across the Overberg choose us for every project — from garden walls to industrial slabs.', fontSize: 17, color: '#6b7280', lineHeight: 1.65, marginBottom: 20 } },
                { type: 'button', props: { text: 'Learn More About Us →', navTarget: '/about', bgColor: 'transparent', textColor: '#4a7c59', paddingX: 0, paddingY: 0, borderRadius: 0, borderWidth: 0 } },
              ],
            },
            // Row 2: 3 cards — card type is in FILL_TYPES so row 2 gets 1fr
            {
              id: 2, type: 'card',
              position: { row: 2, col: 1 },
              props: { bgColor: '#ffffff', borderRadius: 12, borderTopColor: '#4a7c59', borderTopWidth: 4, paddingTop: 32, paddingBottom: 32, paddingX: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' },
              subElements: [
                { type: 'heading', props: { text: '🏗', fontSize: 36, textAlign: 'left', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Local Knowledge', fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 10 } },
                { type: 'paragraph', props: { text: 'Family-owned and based in the Overberg. We know the region\'s roads, weather patterns, and site demands inside out.', fontSize: 15, color: '#6b7280', lineHeight: 1.7 } },
              ],
            },
            {
              id: 3, type: 'card',
              position: { row: 2, col: 2 },
              props: { bgColor: '#ffffff', borderRadius: 12, borderTopColor: '#4a7c59', borderTopWidth: 4, paddingTop: 32, paddingBottom: 32, paddingX: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' },
              subElements: [
                { type: 'heading', props: { text: '🚛', fontSize: 36, textAlign: 'left', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Reliable Delivery', fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 10 } },
                { type: 'paragraph', props: { text: 'Punctual delivery to your site every time. We coordinate with your schedule so your crew never stands around waiting.', fontSize: 15, color: '#6b7280', lineHeight: 1.7 } },
              ],
            },
            {
              id: 4, type: 'card',
              position: { row: 2, col: 3 },
              props: { bgColor: '#ffffff', borderRadius: 12, borderTopColor: '#4a7c59', borderTopWidth: 4, paddingTop: 32, paddingBottom: 32, paddingX: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' },
              subElements: [
                { type: 'heading', props: { text: '✅', fontSize: 36, textAlign: 'left', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Quality Assured', fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 10 } },
                { type: 'paragraph', props: { text: 'SABS-compliant mixes batched to specification on every order. Consistent strength and workability, every pour.', fontSize: 15, color: '#6b7280', lineHeight: 1.7 } },
              ],
            },
          ],
        },
      }),
    },
  });
  console.log('✅ Section 2: Why Choose Us (FLEXIBLE, 3 trust pillars)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — CONCRETE MIXES (FLEXIBLE, dark bg, particle-field animation)
  // Grid: 3 cols × 3 rows
  //   Row 1: full-width heading (colSpan 3, auto)
  //   Row 2: 15, 20, 25 MPa cards (1fr — card is now fill type)
  //   Row 3: 30, 40 MPa cards in col 1+2 (1fr); col 3 empty
  // MPa number and unit are on separate lines — number very large, unit small
  // ══════════════════════════════════════════════════════════════════════════
  const mixCard = (id: number, col: number, grade: string, label: string, usecase: string, desc: string) => ({
    id,
    type: 'card',
    position: { row: col <= 3 ? 2 : 3, col: col <= 3 ? col : col - 3 },
    props: { bgColor: '#374151', borderRadius: 12, paddingTop: 28, paddingBottom: 28, paddingX: 28 },
    subElements: [
      { type: 'heading', props: { text: label.toUpperCase(), fontSize: 10, fontWeight: '700', color: '#4a7c59', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 } },
      { type: 'heading', props: { text: grade, fontSize: 64, fontWeight: '900', color: '#ffffff', lineHeight: 0.9, marginBottom: 4 } },
      { type: 'heading', props: { text: 'MPa', fontSize: 18, fontWeight: '600', color: '#86efac', marginBottom: 14 } },
      { type: 'divider', props: { dividerColor: '#4a7c59', thickness: 2, marginBottom: 14 } },
      { type: 'heading', props: { text: usecase, fontSize: 15, fontWeight: '600', color: '#e5e7eb', marginBottom: 8 } },
      { type: 'paragraph', props: { text: desc, fontSize: 13, color: '#9ca3af', lineHeight: 1.6 } },
    ],
  });

  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Concrete Mixes',
      navLabel: 'Mixes',
      background: '#1f2937',
      paddingTop: 60,
      paddingBottom: 60,
      content: j({
        animBg: {
          enabled: true,
          layers: [{ id: 'l1', type: 'particle-field', enabled: true, opacity: 15, blendMode: 'normal', useColorPalette: false, colors: ['#4a7c59'], config: {} }],
          overlayColor: '#000000',
          overlayOpacity: 0,
        },
        designerData: {
          layoutType: 'grid',
          grid: { cols: 3, rows: 3, gap: 20 },
          blocks: [
            {
              id: 10, type: 'text',
              position: { row: 1, col: 1, colSpan: 3 },
              props: { textAlign: 'center', paddingTop: 0, paddingBottom: 4 },
              subElements: [
                { type: 'heading', props: { text: 'OUR PRODUCTS', fontSize: 11, fontWeight: '700', color: '#4a7c59', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 } },
                { type: 'heading', props: { text: 'The Right Mix for Every Job.', fontSize: 40, fontWeight: '900', color: '#ffffff', textAlign: 'center', lineHeight: 1.1, marginBottom: 8 } },
                { type: 'paragraph', props: { text: 'All mixes are batched to SABS standards and delivered by our own fleet.', fontSize: 16, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 } },
              ],
            },
            // Row 2: top 3 grade cards
            mixCard(11, 1, '15', 'Light Duty',  'Residential',    'Foundations, kerbing, walkways and garden walls. Ideal for light-duty residential applications.'),
            mixCard(12, 2, '20', 'Standard',    'Floor Slabs',    'Floor slabs, driveways and residential walls. The go-to mix for most domestic construction.'),
            mixCard(13, 3, '25', 'Structural',  'Commercial',     'Structural beams, columns and commercial slabs. Meets standard structural requirements.'),
            // Row 3: bottom 2 grade cards (col 3 intentionally empty)
            mixCard(14, 4, '30', 'Heavy Load',  'Industrial Slabs','Warehouse floors and high-traffic areas requiring superior load-bearing capacity.'),
            mixCard(15, 5, '40', 'Industrial',  'High Strength',  'Precast elements, industrial floors and high-stress applications at maximum strength.'),
          ],
        },
      }),
      lowerThird: j({
        enabled: true,
        mode: 'preset',
        preset: 'diagonal',
        presetColor: '#111827',
        presetOpacity: 1,
        height: 80,
        flipHorizontal: false,
        flipVertical: false,
      }),
    },
  });
  console.log('✅ Section 3: Concrete Mixes (FLEXIBLE, particle-field, 5 grade cards)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — PARALLAX SHOWCASE
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'By the Numbers',
      navLabel: 'Numbers',
      background: '#111827',
      bgImageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
      bgImageSize: 'cover',
      bgImagePosition: 'center',
      bgImageOpacity: 30,
      motionElements: j([
        {
          id: 'me-1',
          type: 'image',
          src: 'https://images.unsplash.com/photo-1626885930974-4b69aa21bbf9?w=600&q=70',
          alt: 'Concrete truck on site',
          right: '4%',
          top: '15%',
          width: '320px',
          zIndex: 20,
          opacity: 100,
          parallax: { enabled: true, speed: 0.2 },
          entrance: { enabled: true, direction: 'right', distance: 80, duration: 900, delay: 300, easing: 'easeOutCubic' },
          exit: { enabled: false, direction: 'right', distance: 60, duration: 600 },
          idle: { enabled: true, type: 'float', speed: 1, amplitude: 12 },
        },
      ]),
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 2, rows: 4, gap: 24 },
          blocks: [
            {
              id: 20, type: 'text',
              position: { row: 1, col: 1 },
              props: { paddingTop: 16, paddingBottom: 0 },
              subElements: [
                { type: 'heading', props: { text: 'BY THE NUMBERS', fontSize: 11, fontWeight: '700', color: '#86efac', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Concrete You Can Count On.', fontSize: 48, fontWeight: '900', color: '#ffffff', lineHeight: 1.05, marginBottom: 16 } },
                { type: 'paragraph', props: { text: 'Every batch is quality-checked before it leaves our plant. On-time delivery. Every time.', fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, marginBottom: 32 } },
                { type: 'button', props: { text: '🧮 Calculate Your Concrete →', navTarget: '/calculator', bgColor: '#4a7c59', textColor: '#ffffff', paddingX: 28, paddingY: 13, borderRadius: 8 } },
              ],
            },
            { id: 21, type: 'stats', position: { row: 2, col: 1 }, props: { icon: 'bi-speedometer2', number: '5', statLabel: 'Strength grades — 15 to 40 MPa', bgColor: 'rgba(74,124,89,0.2)', textColor: '#4a7c59', bgOpacity: 100, animateCount: true, animationDuration: 1200 } },
            { id: 22, type: 'stats', position: { row: 3, col: 1 }, props: { icon: 'bi-geo-alt', number: '4', statLabel: 'Towns in delivery zone', bgColor: 'rgba(255,255,255,0.07)', textColor: '#ffffff', bgOpacity: 100, animateCount: true, animationDuration: 1000 } },
            { id: 23, type: 'stats', position: { row: 4, col: 1 }, props: { icon: 'bi-patch-check', number: '100%', statLabel: 'SABS compliant batches', bgColor: 'rgba(74,124,89,0.2)', textColor: '#4a7c59', bgOpacity: 100, animateCount: false } },
          ],
        },
      }),
    },
  });
  console.log('✅ Section 4: Parallax Showcase (FLEXIBLE, motion element, stats)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — DELIVERY AREA
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Delivery Area',
      navLabel: 'Delivery',
      background: '#f8fafc',
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 2, rows: 1, gap: 48 },
          blocks: [
            {
              id: 30, type: 'text',
              position: { row: 1, col: 1 },
              props: { paddingTop: 0, paddingBottom: 0, paddingX: 0 },
              subElements: [
                { type: 'heading', props: { text: 'DELIVERY AREA', fontSize: 11, fontWeight: '700', color: '#4a7c59', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 } },
                { type: 'heading', props: { text: 'We Deliver Across the Overberg.', fontSize: 40, fontWeight: '900', color: '#1f2937', lineHeight: 1.1, marginBottom: 16 } },
                { type: 'paragraph', props: { text: 'Our fleet covers the full Overberg district. Contact us to confirm delivery to your specific site.', fontSize: 17, color: '#6b7280', lineHeight: 1.65, marginBottom: 24 } },
                { type: 'paragraph', props: { text: '● Hermanus  ● Stanford  ● Caledon  ● Gansbaai', fontSize: 15, color: '#4a7c59', lineHeight: 2, marginBottom: 28 } },
                { type: 'button', props: { text: 'View Full Coverage Map →', navTarget: '/coverage', bgColor: 'transparent', textColor: '#4a7c59', paddingX: 24, paddingY: 11, borderRadius: 6 } },
              ],
            },
            {
              id: 31, type: 'coverage-map',
              position: { row: 1, col: 2 },
              props: { mapSlug: 'overberg', mapHeight: 500, showSearch: false, showGeolocation: false },
            },
          ],
        },
      }),
    },
  });
  console.log('✅ Section 5: Delivery Area (FLEXIBLE, coverage-map block)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — OUR PROJECTS (FLEXIBLE, dark bg, 2×2 photo-card grid)
  // Row 1: heading col 1 + "View All Projects →" button col 2 (right-aligned)
  // Rows 2–3: 4 photo-card blocks in a 2×2 grid
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Our Projects',
      navLabel: 'Projects',
      background: '#111827',
      content: j({
        animBg: {
          enabled: true,
          layers: [{ id: 'l1', type: 'moving-gradient', enabled: true, opacity: 20, blendMode: 'normal', useColorPalette: false, colors: ['#4a7c59', '#1f2937'], config: { direction: 'diagonal' } }],
          overlayColor: '#000000',
          overlayOpacity: 0,
        },
        designerData: {
          layoutType: 'grid',
          grid: { cols: 2, rows: 3, gap: 20 },
          blocks: [
            // Row 1 col 1: heading
            {
              id: 40, type: 'text',
              position: { row: 1, col: 1 },
              props: { textAlign: 'left', paddingTop: 16, paddingBottom: 8 },
              subElements: [
                { type: 'heading', props: { text: 'REFERENCE PROJECTS', fontSize: 11, fontWeight: '700', color: '#4a7c59', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 } },
                { type: 'heading', props: { text: 'Poured Into the Overberg.', fontSize: 44, fontWeight: '900', color: '#ffffff', lineHeight: 1.05, marginBottom: 0 } },
              ],
            },
            // Row 1 col 2: "View All Projects →" button, right-aligned
            {
              id: 45, type: 'text',
              position: { row: 1, col: 2 },
              props: { textAlign: 'right', paddingTop: 16, paddingBottom: 8, paddingX: 0, verticalAlign: 'bottom' },
              subElements: [
                { type: 'button', props: { text: 'View All Projects →', navTarget: '/projects', bgColor: 'transparent', textColor: '#4a7c59', paddingX: 24, paddingY: 12, borderRadius: 8, borderWidth: 1, borderColor: '#4a7c59' } },
              ],
            },
            // Rows 2–3: 4 photo-card blocks
            {
              id: 41, type: 'photo-card',
              position: { row: 2, col: 1 },
              props: {
                bgImageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
                title: 'Hermanus Shopping Centre',
                location: 'Hermanus, Western Cape',
                badge: 'CALEDON · 25 MPa',
                panelBg: 'rgba(45,90,61,0.97)',
              },
            },
            {
              id: 42, type: 'photo-card',
              position: { row: 2, col: 2 },
              props: {
                bgImageUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&q=80',
                title: 'Stanford Primary School',
                location: 'Stanford, Western Cape',
                badge: 'STANFORD · 15 MPa',
                panelBg: 'rgba(45,90,61,0.97)',
              },
            },
            {
              id: 43, type: 'photo-card',
              position: { row: 3, col: 1 },
              props: {
                bgImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
                title: 'Caledon Industrial Estate',
                location: 'Caledon, Western Cape',
                badge: 'CALEDON · 30 MPa',
                panelBg: 'rgba(45,90,61,0.97)',
              },
            },
            {
              id: 44, type: 'photo-card',
              position: { row: 3, col: 2 },
              props: {
                bgImageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
                title: 'Gansbaai Harbour',
                location: 'Gansbaai, Western Cape',
                badge: 'GANSBAAI · 25 MPa',
                panelBg: 'rgba(45,90,61,0.97)',
              },
            },
          ],
        },
      }),
      lowerThird: j({
        enabled: true,
        mode: 'preset',
        preset: 'wave',
        presetColor: '#2d5a3d',
        presetOpacity: 0.6,
        height: 70,
        flipHorizontal: false,
        flipVertical: false,
      }),
    },
  });
  console.log('✅ Section 6: Our Projects (FLEXIBLE, 4 photo-cards 2×2)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — GET A QUOTE (CTA, contact form)
  // Name + Phone are fieldWidth: 'half' for side-by-side layout
  // contactInfo shows phone/email/address on the left panel
  // submitText: 'Send Enquiry →'
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'CTA',
      enabled: true,
      order: order++,
      displayName: 'Get a Quote',
      background: '#2d5a3d',
      content: j({
        animBg: {
          enabled: true,
          layers: [{ id: 'l1', type: 'floating-shapes', enabled: true, opacity: 10, blendMode: 'normal', useColorPalette: false, colors: ['#ffffff'], config: {} }],
          overlayColor: '#000000',
          overlayOpacity: 0,
        },
        style: 'contact-form',
        heading: 'Ready to Order?',
        subheading: 'Call us or fill in the form and we\'ll get back to you within 2 hours during business hours.',
        formTitle: 'Get a Quote',
        submitText: 'Send Enquiry →',
        contactInfo: {
          phone: '+27 (0)28 123 4567',
          email: 'info@overbergreadymix.co.za',
          address: 'Overberg Region, Western Cape',
        },
        formFields: [
          { id: 'name',    label: 'Name',                   type: 'text',     required: true,  placeholder: 'Your name',                      fieldWidth: 'half' },
          { id: 'phone',   label: 'Phone',                  type: 'tel',      required: true,  placeholder: '+27 ...',                        fieldWidth: 'half' },
          { id: 'project', label: 'Project Description',    type: 'textarea', required: false, placeholder: 'Brief description of your project...' },
          { id: 'volume',  label: 'Volume Estimate (m³)',   type: 'text',     required: false, placeholder: 'e.g. 6' },
        ],
        requireEmail: false,
        emailTo: 'info@overbergreadymix.co.za',
        emailSubject: 'Quote Request — Overberg Ready Mix',
      }),
      lowerThird: j({
        enabled: true,
        mode: 'preset',
        preset: 'ripple',
        presetColor: '#111827',
        presetOpacity: 1,
        height: 70,
        flipHorizontal: false,
        flipVertical: false,
      }),
    },
  });
  console.log('✅ Section 7: Get a Quote (CTA, contact form, Send Enquiry)');

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 8 — FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: page.id,
      createdBy: admin.id,
      type: 'FOOTER',
      enabled: true,
      order: order++,
      displayName: 'Footer',
      background: '#111827',
      content: j({
        companyName: 'Overberg Ready Mix',
        tagline: 'Quality Concrete. Delivered on Time.',
        copyright: `© ${new Date().getFullYear()} Overberg Ready Mix (Pty) Ltd. All rights reserved.`,
        logoUrl: '',
        textColor: '#d1d5db',
        accentColor: '#4a7c59',
        columns: [
          {
            heading: 'Quick Links',
            links: [
              { text: 'Home',                href: '/' },
              { text: 'Concrete Mixes',      href: '/mixes' },
              { text: 'Concrete Calculator', href: '/calculator' },
              { text: 'Delivery Area',       href: '/coverage' },
              { text: 'Projects',            href: '/projects' },
              { text: 'About Us',            href: '/about' },
              { text: 'Get a Quote',         href: '#contact' },
            ],
          },
          {
            heading: 'Contact',
            links: [
              { text: '+27 (0)28 123 4567',              href: 'tel:+27281234567' },
              { text: 'info@overbergreadymix.co.za',     href: 'mailto:info@overbergreadymix.co.za' },
              { text: 'Overberg Region, Western Cape',   href: '#' },
              { text: 'Mon–Fri 06:00–16:00',            href: '#' },
            ],
          },
        ],
        socials: [
          { platform: 'facebook',  href: 'https://facebook.com/overbergreadymix',          icon: 'bi-facebook'  },
          { platform: 'instagram', href: 'https://instagram.com/overbergreadymix',         icon: 'bi-instagram' },
          { platform: 'linkedin',  href: 'https://linkedin.com/company/overbergreadymix', icon: 'bi-linkedin'  },
        ],
      }),
    },
  });
  console.log('✅ Section 8: Footer');

  console.log('');
  console.log('🎉 Overberg Ready Mix seed v2 complete!');
  console.log('   8 sections · Tall navbar · Coverage map · 4 projects · 5 mix grades');
  console.log('');
  console.log('   Admin:     http://localhost:3000/admin/login  (admin / admin2026)');
  console.log('   Site:      http://localhost:3000');
  console.log('');
}

main().catch(console.error).finally(() => prisma.$disconnect());
