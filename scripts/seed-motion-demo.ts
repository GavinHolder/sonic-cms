/**
 * Motion Demo Seed Script
 *
 * Creates 10 NORMAL sections demonstrating all lowerThird and motionElements
 * features on the landing page.
 *
 * Usage:
 *   npm run db:seed-motion-demo
 *
 * ASSUMPTIONS:
 * 1. Landing page with slug "/" exists (created by main seed)
 * 2. Admin user with role SUPER_ADMIN exists
 * 3. Database is running and DATABASE_URL is set in .env
 *
 * FAILURE MODES:
 * - No landing page → exits with error (run npm run db:seed first)
 * - No admin user → exits with error
 * - Demo sections already exist → deleted and recreated (idempotent)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Seeding motion/lower-third demo sections...');

  // Find landing page
  const landingPage = await prisma.page.findUnique({ where: { slug: '/' } });
  if (!landingPage) {
    throw new Error('Landing page (slug "/") not found. Run `npm run db:seed` first.');
  }
  console.log(`✅ Landing page: ${landingPage.title} (${landingPage.id})`);

  // Find admin user
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) {
    throw new Error('No SUPER_ADMIN user found. Run `npm run db:seed` first.');
  }
  console.log(`✅ Admin user: ${admin.username} (${admin.id})`);

  // Delete any existing demo sections (idempotent)
  const deleted = await prisma.section.deleteMany({
    where: {
      pageId: landingPage.id,
      displayName: { contains: 'DEMO:' },
    },
  });
  if (deleted.count > 0) {
    console.log(`🗑️  Deleted ${deleted.count} existing demo sections`);
  }

  // ============================================================
  // Section 1: Lower Third — Wave (White)
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 10,
      displayName: 'DEMO: Lower Third — Wave',
      background: 'blue',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      lowerThird: {
        enabled: true,
        mode: 'preset',
        preset: 'wave',
        presetColor: '#ffffff',
        presetOpacity: 1,
        imageSrc: '',
        height: 120,
        flipHorizontal: false,
        flipVertical: false,
      },
      content: {
        heading: 'Lower Third — Wave',
        subheading: 'White wave shape transitions to next section',
        body: 'The lower third shape overlays the bottom of this section at z-index 10, above content but below motion elements. Try all 8 presets in the admin.',
        layout: 'text-center',
      },
    },
  });

  // ============================================================
  // Section 2: Lower Third — Mountain (Dark)
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 11,
      displayName: 'DEMO: Lower Third — Mountain',
      background: 'gray',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      lowerThird: {
        enabled: true,
        mode: 'preset',
        preset: 'mountain',
        presetColor: '#1e293b',
        presetOpacity: 0.9,
        imageSrc: '',
        height: 160,
        flipHorizontal: false,
        flipVertical: false,
      },
      content: {
        heading: 'Lower Third — Mountain',
        subheading: 'Dark mountain shape at 90% opacity',
        body: '8 preset shapes available: wave, diagonal, arch, stepped, mountain, blob, chevron, ripple. All can be flipped horizontally or vertically.',
        layout: 'text-center',
      },
    },
  });

  // ============================================================
  // Section 3: Motion — Float Idle
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 12,
      displayName: 'DEMO: Motion — Float Idle',
      background: 'white',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      motionElements: [
        {
          id: 'demo-float-1',
          src: 'https://cdn-icons-png.flaticon.com/512/1165/1165086.png',
          alt: 'Floating gear',
          top: '10%',
          right: '5%',
          left: undefined,
          bottom: undefined,
          width: '120px',
          zIndex: 20,
          parallax: { enabled: false, speed: 0 },
          entrance: { enabled: true, direction: 'right', distance: 150, duration: 800, delay: 200, easing: 'easeOutBack' },
          exit: { enabled: false, direction: 'right', distance: 150, duration: 600 },
          idle: { enabled: true, type: 'float', speed: 1, amplitude: 20 },
        },
      ],
      content: {
        heading: 'Motion Element — Float Idle',
        subheading: 'Image slides in from right then floats continuously',
        body: 'Motion elements sit at z-index 20 — above content and lower-third shapes, below text animations. This element uses: Entrance from right (800ms, easeOutBack) + Float idle (20px amplitude).',
        layout: 'text-left',
      },
    },
  });

  // ============================================================
  // Section 4: Motion — Bob + Parallax
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 13,
      displayName: 'DEMO: Motion — Bob + Parallax',
      background: 'lightblue',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      motionElements: [
        {
          id: 'demo-bob-1',
          src: 'https://cdn-icons-png.flaticon.com/512/3159/3159310.png',
          alt: 'Bobbing element',
          top: '15%',
          left: '5%',
          right: undefined,
          bottom: undefined,
          width: '160px',
          zIndex: 20,
          parallax: { enabled: true, speed: 0.3 },
          entrance: { enabled: true, direction: 'left', distance: 200, duration: 1000, delay: 0, easing: 'easeOutCubic' },
          exit: { enabled: false, direction: 'left', distance: 200, duration: 600 },
          idle: { enabled: true, type: 'bob', speed: 0.8, amplitude: 25 },
        },
      ],
      content: {
        heading: 'Motion — Bob + Parallax',
        subheading: 'Slides in from left, bobs up/down, parallax depth 0.3',
        body: 'Parallax speed 0.3 means this element scrolls at 30% of the scroll speed — giving a depth effect. Bob idle moves the element up 25px and returns, looping continuously.',
        layout: 'text-right',
      },
    },
  });

  // ============================================================
  // Section 5: Motion — Sway + Entrance from Top
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 14,
      displayName: 'DEMO: Motion — Sway + Top Entrance',
      background: 'gray',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      motionElements: [
        {
          id: 'demo-sway-1',
          src: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png',
          alt: 'Swaying element',
          top: '5%',
          right: '10%',
          left: undefined,
          bottom: undefined,
          width: '100px',
          zIndex: 20,
          parallax: { enabled: false, speed: 0 },
          entrance: { enabled: true, direction: 'top', distance: 120, duration: 600, delay: 100, easing: 'easeOutQuart' },
          exit: { enabled: true, direction: 'top', distance: 100, duration: 400 },
          idle: { enabled: true, type: 'sway', speed: 1.5, amplitude: 8 },
        },
      ],
      content: {
        heading: 'Motion — Sway + Entrance/Exit',
        subheading: 'Drops from top, sways left-right, exits upward',
        body: 'This element has BOTH entrance AND exit animations enabled. It drops in from the top when you scroll to this section, sways gently, then exits back upward when you scroll away.',
        layout: 'text-center',
      },
    },
  });

  // ============================================================
  // Section 6: Motion — Pulse + Counter-Scroll Parallax
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 15,
      displayName: 'DEMO: Motion — Pulse + Counter-Parallax',
      background: 'blue',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      motionElements: [
        {
          id: 'demo-pulse-1',
          src: 'https://cdn-icons-png.flaticon.com/512/1532/1532556.png',
          alt: 'Pulsing element',
          top: '50%',
          right: '8%',
          left: undefined,
          bottom: undefined,
          width: '90px',
          zIndex: 20,
          parallax: { enabled: true, speed: -0.2 },
          entrance: { enabled: true, direction: 'bottom', distance: 100, duration: 700, delay: 0, easing: 'easeOutBack' },
          exit: { enabled: false, direction: 'bottom', distance: 100, duration: 500 },
          idle: { enabled: true, type: 'pulse', speed: 2, amplitude: 20 },
        },
      ],
      content: {
        heading: 'Motion — Pulse + Counter-Parallax',
        subheading: 'Pulses in scale, moves OPPOSITE to scroll direction',
        body: 'Negative parallax speed (-0.2) means this element moves against the scroll direction — it appears to float toward you as you scroll down. The pulse idle grows and shrinks by 20% of size.',
        layout: 'text-left',
      },
    },
  });

  // ============================================================
  // Section 7: Motion — Rotate Idle
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 16,
      displayName: 'DEMO: Motion — Rotate Idle',
      background: 'white',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      motionElements: [
        {
          id: 'demo-rotate-1',
          src: 'https://cdn-icons-png.flaticon.com/512/6295/6295417.png',
          alt: 'Rotating cog',
          top: '20%',
          right: '15%',
          left: undefined,
          bottom: undefined,
          width: '80px',
          zIndex: 20,
          parallax: { enabled: true, speed: 0.15 },
          entrance: { enabled: true, direction: 'right', distance: 80, duration: 500, delay: 0, easing: 'easeOutCubic' },
          exit: { enabled: false, direction: 'right', distance: 80, duration: 400 },
          idle: { enabled: true, type: 'rotate', speed: 1, amplitude: 360 },
        },
      ],
      content: {
        heading: 'Motion — Continuous Rotation',
        subheading: 'Element rotates continuously while section is visible',
        body: "The 'rotate' idle type continuously spins the element. Amplitude = degrees per cycle. Speed multiplier controls the rotation rate. Stops when section leaves the viewport.",
        layout: 'text-left',
      },
    },
  });

  // ============================================================
  // Section 8: Multiple Motion Elements
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 17,
      displayName: 'DEMO: Motion — Multiple Elements',
      background: 'gray',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      motionElements: [
        {
          id: 'demo-multi-1',
          src: 'https://cdn-icons-png.flaticon.com/512/3159/3159310.png',
          alt: 'Element 1',
          top: '10%',
          left: '3%',
          right: undefined,
          bottom: undefined,
          width: '80px',
          zIndex: 20,
          parallax: { enabled: true, speed: 0.2 },
          entrance: { enabled: true, direction: 'left', distance: 100, duration: 600, delay: 0, easing: 'easeOutCubic' },
          exit: { enabled: false, direction: 'left', distance: 100, duration: 400 },
          idle: { enabled: true, type: 'float', speed: 1, amplitude: 15 },
        },
        {
          id: 'demo-multi-2',
          src: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png',
          alt: 'Element 2',
          top: '30%',
          right: '5%',
          left: undefined,
          bottom: undefined,
          width: '100px',
          zIndex: 20,
          parallax: { enabled: true, speed: -0.15 },
          entrance: { enabled: true, direction: 'right', distance: 120, duration: 700, delay: 200, easing: 'easeOutBack' },
          exit: { enabled: false, direction: 'right', distance: 120, duration: 500 },
          idle: { enabled: true, type: 'sway', speed: 1.2, amplitude: 10 },
        },
        {
          id: 'demo-multi-3',
          src: 'https://cdn-icons-png.flaticon.com/512/6295/6295417.png',
          alt: 'Element 3',
          bottom: '15%',
          right: '12%',
          top: undefined,
          left: undefined,
          width: '60px',
          zIndex: 20,
          parallax: { enabled: false, speed: 0 },
          entrance: { enabled: true, direction: 'bottom', distance: 80, duration: 500, delay: 400, easing: 'easeOutQuart' },
          exit: { enabled: false, direction: 'bottom', distance: 80, duration: 400 },
          idle: { enabled: true, type: 'rotate', speed: 0.8, amplitude: 360 },
        },
      ],
      content: {
        heading: 'Multiple Motion Elements',
        subheading: 'Three independent parallax elements on one section',
        body: 'Each element has independent parallax depth, entrance timing, and idle animation. Left: float idle + parallax 0.2. Right top: sway + counter-parallax -0.15. Right bottom: rotate + staggered 400ms entrance delay.',
        layout: 'text-center',
      },
    },
  });

  // ============================================================
  // Section 9: Lower Third + Motion Combined
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 18,
      displayName: 'DEMO: Lower Third + Motion Combined',
      background: 'blue',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      lowerThird: {
        enabled: true,
        mode: 'preset',
        preset: 'chevron',
        presetColor: '#ffffff',
        presetOpacity: 0.95,
        imageSrc: '',
        height: 100,
        flipHorizontal: false,
        flipVertical: false,
      },
      motionElements: [
        {
          id: 'demo-combo-1',
          src: 'https://cdn-icons-png.flaticon.com/512/1532/1532556.png',
          alt: 'Combo element',
          top: '20%',
          right: '8%',
          left: undefined,
          bottom: undefined,
          width: '110px',
          zIndex: 20,
          parallax: { enabled: true, speed: 0.25 },
          entrance: { enabled: true, direction: 'right', distance: 150, duration: 800, delay: 0, easing: 'easeOutBack' },
          exit: { enabled: false, direction: 'right', distance: 150, duration: 600 },
          idle: { enabled: true, type: 'pulse', speed: 1.5, amplitude: 15 },
        },
      ],
      content: {
        heading: 'Lower Third + Motion Together',
        subheading: 'Chevron lower-third + pulsing parallax element',
        body: 'Both features work together seamlessly. Lower third (z-index 10) sits below motion elements (z-index 20). The chevron shape transitions to the next section while the motion element floats above.',
        layout: 'text-left',
      },
    },
  });

  // ============================================================
  // Section 10: All Lower Third Presets Reference
  // ============================================================
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: 19,
      displayName: 'DEMO: Lower Third — All Presets Reference',
      background: 'white',
      paddingTop: 80,
      paddingBottom: 80,
      createdBy: admin.id,
      lowerThird: {
        enabled: true,
        mode: 'preset',
        preset: 'blob',
        presetColor: '#6366f1',
        presetOpacity: 0.7,
        imageSrc: '',
        height: 140,
        flipHorizontal: false,
        flipVertical: false,
      },
      content: {
        heading: 'Lower Third — All Presets',
        subheading: 'Current: Blob (purple, 70% opacity). Edit in admin to try all 8.',
        body: 'Available presets:\n• wave — smooth sine curve\n• diagonal — straight cut\n• arch — single arch\n• stepped — 2-step staircase\n• mountain — double peak\n• blob — organic asymmetric\n• chevron — V-shape\n• ripple — double wave\n\nAll can be flipped horizontally and vertically.',
        layout: 'text-center',
      },
    },
  });

  console.log('✅ Created 10 demo sections (orders 10–19)');
  console.log('\n📍 View at: http://localhost:3000');
  console.log('📍 Manage at: http://localhost:3000/admin/content/landing-page');
  console.log('\n🔐 Login: admin / admin2026');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
