// @ts-nocheck
/**
 * SEED v6 — Full Showcase Landing Page
 *
 * Colour scheme: Grey + Green
 * Sections:
 *   1. HERO          — 2 slides: image + video
 *   2. ABOUT         — FLEXIBLE 2-col: story + 5 stats  (solid #1a1a1a)
 *   3. SERVICES      — FLEXIBLE multi 2-zone: heading + 3 Volt service cards  (solid #1b5e20)
 *   4. WHY CHOOSE US — FLEXIBLE multi 3-zone + image parallax  (gradient #1a1a1a→#1b5e20)
 *   5. PROJECTS      — FLEXIBLE 3-col Volt project cards + video parallax  (solid #2d2d2d)
 *   6. HOW IT WORKS  — FLEXIBLE 2-col: steps text + 3D wireframe slab Volt block  (gradient #1a1a1a→#2e7d32)
 *   7. CTA           — contact-form  (solid #0f1a0f)
 *   8. FOOTER        — solid #0d1117
 *
 * Volt elements created:
 *   A. "Service Card — Green"  (300×380) — used in Services (3×)
 *   B. "Project Card"          (360×420) — used in Projects (3×)
 *   C. "3D Concrete Slab"      (400×400) — 3d-object layer, used in How It Works
 *
 * Run: npx tsx prisma/seed-v6.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../lib/auth';

function j(obj: object): Prisma.InputJsonValue { return obj as Prisma.InputJsonValue; }
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

// ─── SVG path helpers (% coordinates, 0–100 space) ──────────────────────────

function circlePath(cx: number, cy: number, r: number): string {
  const k = 0.5523;
  return [
    `M${cx},${cy - r}`,
    `C${cx + r * k},${cy - r} ${cx + r},${cy - r * k} ${cx + r},${cy}`,
    `C${cx + r},${cy + r * k} ${cx + r * k},${cy + r} ${cx},${cy + r}`,
    `C${cx - r * k},${cy + r} ${cx - r},${cy + r * k} ${cx - r},${cy}`,
    `C${cx - r},${cy - r * k} ${cx - r * k},${cy - r} ${cx},${cy - r}`,
    'Z',
  ].join(' ');
}

function roundRectPath(x: number, y: number, w: number, h: number, r = 3): string {
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
  ].join(' ');
}

function defaultAnim(overrides = {}) {
  return {
    character: 50, speed: 55, style: 60, delay: 0,
    animates: { opacity: false, scale: false, position: false, rotation: false, fill: false },
    ...overrides,
  };
}

function vectorLayer({ id, name, role, x, y, w, h, zIndex, pathData, color, opacity = 1, blendMode = 'normal' }) {
  return {
    id, name, type: 'vector', role,
    x, y, width: w, height: h,
    rotation: 0, zIndex, visible: true, locked: false, opacity, blendMode,
    vectorData: {
      pathData,
      fills: [{ id: uid(), type: 'solid', color, opacity: 1, blendMode: 'normal' }],
      closed: true,
    },
    animation: defaultAnim(),
  };
}

function slotLayer({ id, name, slotType, x, y, w, h, zIndex, fontFamily = undefined, fontSize = undefined, fontWeight = undefined, color = undefined, textAlign = 'left', buttonVariant = undefined }) {
  return {
    id, name, type: 'slot', role: 'content',
    x, y, width: w, height: h,
    rotation: 0, zIndex, visible: true, locked: false, opacity: 1, blendMode: 'normal',
    slotData: {
      slotType,
      slotLabel: name,
      contentFieldHint: slotType,
      ...(fontFamily && { fontFamily }),
      ...(fontSize && { fontSize }),
      ...(fontWeight && { fontWeight }),
      ...(color && { color }),
      textAlign,
      ...(buttonVariant && { buttonVariant }),
    },
    animation: defaultAnim(),
  };
}

// ─── Volt element builders ───────────────────────────────────────────────────

/** Card A: Service Card — Green (300×380) */
function buildServiceCard() {
  const bg      = uid();
  const topBar  = uid();
  const circle  = uid();
  const dot     = uid();
  const iconS   = uid();
  const titleS  = uid();
  const bodyS   = uid();
  const actionS = uid();

  return {
    layers: [
      vectorLayer({ id: bg, name: 'Background', role: 'structure', x: 0, y: 0, w: 100, h: 100, zIndex: 0, pathData: roundRectPath(0, 0, 100, 100, 4), color: '#1a1a1a' }),
      vectorLayer({ id: topBar, name: 'Accent Bar', role: 'accent', x: 0, y: 0, w: 100, h: 3.5, zIndex: 1, pathData: 'M0,0 H100 V3.5 H0 Z', color: '#2e7d32' }),
      vectorLayer({ id: circle, name: 'Corner Circle', role: 'accent', x: 68, y: -12, w: 46, h: 42, zIndex: 1, pathData: circlePath(88, 8, 22), color: '#1b5e20', opacity: 0.45 }),
      vectorLayer({ id: dot, name: 'Bottom Dot', role: 'accent', x: -2, y: 84, w: 15, h: 15, zIndex: 1, pathData: circlePath(3, 92, 7), color: '#43a047', opacity: 0.3 }),
      slotLayer({ id: iconS, name: 'Icon', slotType: 'icon', x: 35, y: 10, w: 30, h: 16, zIndex: 10, fontSize: '2rem', color: '#4caf50', textAlign: 'center' }),
      slotLayer({ id: titleS, name: 'Title', slotType: 'title', x: 8, y: 30, w: 84, h: 14, zIndex: 10, fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', textAlign: 'center' }),
      slotLayer({ id: bodyS, name: 'Body', slotType: 'body', x: 8, y: 47, w: 84, h: 30, zIndex: 10, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', textAlign: 'center' }),
      slotLayer({ id: actionS, name: 'Action', slotType: 'action', x: 20, y: 82, w: 60, h: 12, zIndex: 10, buttonVariant: 'outline' }),
    ],
    states: [],
    canvasWidth: 300,
    canvasHeight: 380,
  };
}

/** Card B: Project Card — Image + Content (360×420) */
function buildProjectCard() {
  const bg      = uid();
  const imgZone = uid();
  const imgS    = uid();
  const bottomB = uid();
  const badgeS  = uid();
  const titleS  = uid();
  const bodyS   = uid();

  return {
    layers: [
      vectorLayer({ id: bg, name: 'Background', role: 'structure', x: 0, y: 0, w: 100, h: 100, zIndex: 0, pathData: roundRectPath(0, 0, 100, 100, 4), color: '#212121' }),
      vectorLayer({ id: imgZone, name: 'Image Zone', role: 'structure', x: 0, y: 0, w: 100, h: 42, zIndex: 1, pathData: 'M0,0 H100 V42 H0 Z', color: '#2d2d2d' }),
      slotLayer({ id: imgS, name: 'Image', slotType: 'image', x: 0, y: 0, w: 100, h: 42, zIndex: 5, textAlign: 'center' }),
      vectorLayer({ id: bottomB, name: 'Bottom Bar', role: 'accent', x: 0, y: 97.5, w: 100, h: 2.5, zIndex: 1, pathData: 'M0,97.5 H100 V100 H0 Z', color: '#2e7d32' }),
      slotLayer({ id: badgeS, name: 'Badge', slotType: 'badge', x: 5, y: 44, w: 55, h: 7, zIndex: 10, fontSize: '0.7rem', color: '#43a047' }),
      slotLayer({ id: titleS, name: 'Title', slotType: 'title', x: 5, y: 53, w: 90, h: 13, zIndex: 10, fontSize: '1rem', fontWeight: '700', color: '#ffffff' }),
      slotLayer({ id: bodyS, name: 'Body', slotType: 'body', x: 5, y: 68, w: 90, h: 24, zIndex: 10, fontSize: '0.82rem', color: 'rgba(255,255,255,0.70)' }),
    ],
    states: [],
    canvasWidth: 360,
    canvasHeight: 420,
  };
}

/** Card C: 3D Concrete Slab (400×400) — holds a single 3d-object layer */
function buildSlabVolt(assetId: string, assetUrl: string) {
  const slabId = uid();
  return {
    layers: [
      {
        id: slabId,
        name: 'Concrete Slab',
        type: '3d-object',
        role: 'overlay',
        x: 0, y: 0, width: 100, height: 100,
        rotation: 0, zIndex: 10, visible: true, locked: false, opacity: 1, blendMode: 'normal',
        object3DData: {
          assetId,
          assetUrl,
          assetName: 'Concrete Slab (Wireframe)',
          cameraAzimuth: 30,
          cameraElevation: 18,
          cameraDistance: 4.5,
          ambientIntensity: 0.5,
          keyLightIntensity: 1.2,
          keyLightAngle: 45,
          transparent: true,
          wireframe: true,
          wireframeColor: '#43a047',
          autoRotateSpeed: 1.5,
          customScale: { x: 2.5, y: 0.15, z: 1.5 },
          animationMap: {},
          availableTracks: [],
        },
        animation: defaultAnim(),
      },
    ],
    states: [],
    canvasWidth: 400,
    canvasHeight: 400,
  };
}

// ────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Starting seed v6 — showcase landing page...');

  // ── Full wipe ─────────────────────────────────────────────────────────────
  console.log('🗑  Wiping existing data...');
  await prisma.formSubmission.deleteMany();
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
  await prisma.siteConfig.deleteMany().catch(() => {});
  await prisma.user.deleteMany();
  console.log('✅  Wipe complete');

  // ── Admin user ────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@buildpro.co.za',
      passwordHash: await hashPassword('admin2026'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  // ── System settings ───────────────────────────────────────────────────────
  await prisma.systemSettings.createMany({
    data: [
      { key: 'companyName',  value: 'BuildPro Concrete' },
      { key: 'tagline',      value: 'Quality concrete delivered to your site' },
      { key: 'email',        value: 'info@buildpro.co.za' },
      { key: 'phone',        value: '+27 21 000 0000' },
      { key: 'address',      value: '12 Industrial Road, Cape Town, 7700' },
      { key: 'facebook',     value: 'https://facebook.com/buildproconcrete' },
      { key: 'instagram',    value: 'https://instagram.com/buildproconcrete' },
    ],
  });

  // ── Client features ────────────────────────────────────────────────────────
  await prisma.clientFeature.createMany({
    data: [
      {
        slug: 'concrete-calculator',
        name: 'Concrete Calculator',
        enabled: true,
        config: {
          concreteDensity: 2400, currencySymbol: 'R',
          cementBagSize: 50, cementBagPrice: 180, deliveryFee: 850, wastagePercent: 10,
          mixRatios: {
            '15MPa': { cement: 1, sand: 3, stone: 3 },
            '20MPa': { cement: 1, sand: 2.5, stone: 2.5 },
            '25MPa': { cement: 1, sand: 2, stone: 2 },
            '30MPa': { cement: 1, sand: 1.5, stone: 1.5 },
          },
        },
      },
      { slug: 'coverage-map', name: 'Coverage Map', enabled: false, config: {} },
    ],
  });
  console.log('✅  Admin + settings + features');

  // ── Volt element A: Service Card ──────────────────────────────────────────
  const serviceCardData = buildServiceCard();
  const serviceCard = await prisma.voltElement.create({
    data: {
      name: 'Service Card — Green',
      description: 'Dark card with green accent bar, icon/title/body/action slots. Use for services grid.',
      elementType: 'service-card',
      isPublic: true,
      authorId: admin.id,
      layers: serviceCardData.layers,
      states: serviceCardData.states,
      canvasWidth: serviceCardData.canvasWidth,
      canvasHeight: serviceCardData.canvasHeight,
      tags: ['card', 'service', 'green', 'dark'],
    },
  });

  // ── Volt element B: Project Card ──────────────────────────────────────────
  const projectCardData = buildProjectCard();
  const projectCard = await prisma.voltElement.create({
    data: {
      name: 'Project Card — Image + Content',
      description: 'Dark card with top image zone, badge/title/body slots and green accent. Use for project showcases.',
      elementType: 'project-card',
      isPublic: true,
      authorId: admin.id,
      layers: projectCardData.layers,
      states: projectCardData.states,
      canvasWidth: projectCardData.canvasWidth,
      canvasHeight: projectCardData.canvasHeight,
      tags: ['card', 'project', 'image', 'dark'],
    },
  });

  // ── Volt3DAsset + version (KhronosGroup Box.glb) ─────────────────────────
  const slabAsset = await prisma.volt3DAsset.create({
    data: {
      name: 'Concrete Slab (Wireframe)',
      authorId: admin.id,
    },
  });
  const GLB_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Box/glTF-Binary/Box.glb';
  const slabVersion = await prisma.volt3DVersion.create({
    data: {
      assetId: slabAsset.id,
      versionNum: 1,
      glbPath: GLB_URL,
      animClips: [],
      isConfirmed: true,
    },
  });
  await prisma.volt3DAsset.update({
    where: { id: slabAsset.id },
    data: { activeVersionId: slabVersion.id },
  });

  // ── Volt element C: 3D Concrete Slab ─────────────────────────────────────
  const slabVoltData = buildSlabVolt(slabAsset.id, GLB_URL);
  const slabVolt = await prisma.voltElement.create({
    data: {
      name: '3D Concrete Slab',
      description: 'Wireframe rotating concrete slab. Place as a volt block in a FLEXIBLE section.',
      elementType: '3d-scene',
      isPublic: true,
      authorId: admin.id,
      layers: slabVoltData.layers,
      states: slabVoltData.states,
      canvasWidth: slabVoltData.canvasWidth,
      canvasHeight: slabVoltData.canvasHeight,
      tags: ['3d', 'concrete', 'wireframe', 'slab'],
    },
  });
  console.log(`✅  Volt elements: Service Card (${serviceCard.id}), Project Card (${projectCard.id}), 3D Slab (${slabVolt.id})`);

  // ── Landing page ──────────────────────────────────────────────────────────
  const lp = await prisma.page.create({
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
  // 1. HERO — slide 1: image, slide 2: video
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'HERO', enabled: true, order: order++,
      displayName: 'Hero', paddingTop: 0, paddingBottom: 0, background: 'transparent',
      content: j({
        slides: [
          {
            id: 'slide-1',
            type: 'image',
            src: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80',
            gradient: {
              enabled: true, type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 70, endOpacity: 40, color: '#000000' },
            },
            overlay: {
              heading: { text: 'Built to Last.\nBuilt Right.', fontSize: 68, fontWeight: 800, color: '#ffffff', animation: 'slideUp', animationDuration: 900, animationDelay: 100 },
              subheading: { text: 'Premium ready-mix concrete delivered to your site. Consistent quality, engineered mixes, on-time every time.', fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.88)', animation: 'slideUp', animationDuration: 900, animationDelay: 300 },
              buttons: [
                { text: 'Get a Quote', href: '#contact', backgroundColor: '#2e7d32', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
                { text: 'Our Services', href: '#services', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 620 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
          {
            id: 'slide-2',
            type: 'video',
            src: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4',
            gradient: {
              enabled: true, type: 'preset',
              preset: { direction: 'bottomRight', startOpacity: 65, endOpacity: 35, color: '#0a1a0a' },
            },
            overlay: {
              heading: { text: 'Strength in Every Pour.', fontSize: 64, fontWeight: 800, color: '#ffffff', animation: 'fade', animationDuration: 1000, animationDelay: 0 },
              subheading: { text: 'From residential foundations to 4 500 m² industrial floor slabs — every mix engineered to your specification and certified to SANS 878.', fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.88)', animation: 'fade', animationDuration: 1000, animationDelay: 200 },
              buttons: [
                { text: 'View Projects', href: '#projects', backgroundColor: '#2e7d32', textColor: '#ffffff', variant: 'filled', animation: 'fade', animationDelay: 400 },
                { text: 'Calculate Concrete', href: '/calculator', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'fade', animationDelay: 520 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
        ],
        autoPlay: true, autoPlayInterval: 7000, transitionDuration: 800, showDots: true, showArrows: true,
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ABOUT — 2-col: story left + 5 stats right
  //    Grid: 2 cols × 5 rows | bg: solid #1a1a1a
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'FLEXIBLE', enabled: true, order: order++,
      displayName: 'About', background: '#1a1a1a',
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 2, rows: 5, gap: 20 },
          blocks: [
            {
              id: 1, type: 'text',
              position: { row: 1, col: 1, colSpan: 1, rowSpan: 5 },
              props: { paddingTop: 48, paddingBottom: 48, paddingX: 48 },
              subElements: [
                { type: 'heading', props: { text: 'ABOUT BUILDPRO', fontSize: 11, fontWeight: '700', color: '#4caf50', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'left', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Two decades of delivering concrete that performs.', fontSize: 34, fontWeight: '800', color: '#ffffff', lineHeight: 1.2, textAlign: 'left', marginBottom: 24 } },
                { type: 'paragraph', props: { text: 'Since 2004, BuildPro Concrete has supplied ready-mix concrete to builders, developers, and contractors across the Western Cape. What started as a single transit mixer has grown into a modern operation — GPS-tracked fleet, a fully automated batching plant, and a team of 26 dedicated to delivering concrete that is consistent, on-spec, and on time.', fontSize: 16, color: '#9ca3af', lineHeight: 1.75, marginBottom: 20 } },
                { type: 'paragraph', props: { text: 'Every batch begins with SANS-certified raw materials and a mix design matched to your project requirements. Our automated plant controls water-cement ratios to ±2%. You receive exactly what was batched — every time.', fontSize: 16, color: '#9ca3af', lineHeight: 1.75, marginBottom: 36 } },
                { type: 'button', props: { text: 'Get a Quote', navTarget: '#contact', bgColor: '#2e7d32', textColor: '#ffffff', paddingX: 28, paddingY: 12, borderRadius: 6 } },
                { type: 'button', props: { text: 'Concrete Calculator', navTarget: '/calculator', bgColor: 'transparent', textColor: '#4caf50', paddingX: 28, paddingY: 12, borderRadius: 6, marginTop: 10 } },
              ],
            },
            { id: 2, type: 'stats', position: { row: 1, col: 2 }, props: { icon: 'bi-calendar2-heart', number: '20+', statLabel: 'Years in business', bgColor: '#1f2937', textColor: '#4caf50', bgOpacity: 100 } },
            { id: 3, type: 'stats', position: { row: 2, col: 2 }, props: { icon: 'bi-truck', number: '10', statLabel: 'GPS-tracked trucks', bgColor: '#212121', textColor: '#ffffff', bgOpacity: 100 } },
            { id: 4, type: 'stats', position: { row: 3, col: 2 }, props: { icon: 'bi-speedometer2', number: '15–40MPa', statLabel: 'Full mix range', bgColor: '#1f2937', textColor: '#4caf50', bgOpacity: 100, animateCount: false } },
            { id: 5, type: 'stats', position: { row: 4, col: 2 }, props: { icon: 'bi-people', number: '26', statLabel: 'Team members', bgColor: '#212121', textColor: '#ffffff', bgOpacity: 100 } },
            { id: 6, type: 'stats', position: { row: 5, col: 2 }, props: { icon: 'bi-patch-check', number: 'SANS 878', statLabel: 'Certified mix designs', bgColor: '#1f2937', textColor: '#4caf50', bgOpacity: 100, animateCount: false } },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. SERVICES — multi 2-zone: heading (zone 0) + 3 Volt service cards (zone 1)
  //    bg: solid #1b5e20 (deep green)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'FLEXIBLE', enabled: true, order: order++,
      displayName: 'Services', background: '#1b5e20',
      content: j({
        contentMode: 'multi',
        designerData: {
          contentMode: 'multi', multiLimit: 2,
          layoutType: 'grid',
          grid: { cols: 3, rows: 1, gap: 24 },
          blocks: [
            // Zone 0: full-width heading
            {
              id: 10, type: 'text',
              position: { row: 1, col: 1, colSpan: 3, section: 0 },
              props: { textAlign: 'center', paddingTop: 40 },
              subElements: [
                { type: 'heading', props: { text: 'WHAT WE SUPPLY', fontSize: 11, fontWeight: '700', color: '#a5d6a7', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Six concrete solutions.\nOne reliable supplier.', fontSize: 44, fontWeight: '800', color: '#ffffff', lineHeight: 1.15, textAlign: 'center', marginBottom: 20 } },
                { type: 'paragraph', props: { text: 'Every mix is plant-batched to SANS 878 and delivered to your site by our GPS-tracked fleet. Same-day orders accepted before 10:00 AM.', fontSize: 17, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 1.65, marginBottom: 0 } },
              ],
            },
            // Zone 1: 3 Volt service cards
            {
              id: 11, type: 'volt',
              position: { row: 1, col: 1, section: 1 },
              props: { voltId: serviceCard.id, slotIcon: 'bi-layers', slotTitle: 'Standard Mixes', slotBody: 'SANS 878-compliant mixes from 15MPa to 40MPa. Cube-test certificates available for every batch.', slotActionLabel: 'Get a Quote', slotActionHref: '#contact' },
            },
            {
              id: 12, type: 'volt',
              position: { row: 1, col: 2, section: 1 },
              props: { voltId: serviceCard.id, slotIcon: 'bi-droplet', slotTitle: 'Pumpable Concrete', slotBody: '100–180mm slump for pump application. Ideal for elevated slabs, columns, and restricted-access sites.', slotActionLabel: 'Get a Quote', slotActionHref: '#contact' },
            },
            {
              id: 13, type: 'volt',
              position: { row: 1, col: 3, section: 1 },
              props: { voltId: serviceCard.id, slotIcon: 'bi-gear', slotTitle: 'Fibre Reinforced', slotBody: 'Steel or polypropylene dosed at the plant. Eliminates on-site mixing errors and reduces plastic cracking.', slotActionLabel: 'Get a Quote', slotActionHref: '#contact' },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. WHY CHOOSE US — multi 3-zone + image parallax overlay
  //    bg: gradient dark → green
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'FLEXIBLE', enabled: true, order: order++,
      displayName: 'Why Choose Us',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #1b5e20 100%)',
      motionElements: j([
        {
          id: 'me-why-img-1',
          type: 'image',
          src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
          alt: 'Construction site',
          top: '5%', right: '-4%', width: '38%',
          opacity: 18, zIndex: 5, layer: 'behind',
          parallax: { enabled: true, speed: 0.28 },
          entrance: { enabled: false, direction: 'right', distance: 60, duration: 800, delay: 0, easing: 'outCubic' },
          exit: { enabled: false, direction: 'right', distance: 60, duration: 400 },
          idle: { enabled: false, type: 'float', speed: 1, amplitude: 10 },
        },
      ]),
      content: j({
        contentMode: 'multi',
        designerData: {
          contentMode: 'multi', multiLimit: 3,
          layoutType: 'grid',
          grid: { cols: 3, rows: 1, gap: 24 },
          blocks: [
            // Zone 0: heading
            {
              id: 20, type: 'text',
              position: { row: 1, col: 1, colSpan: 3, section: 0 },
              props: { textAlign: 'center', paddingTop: 60, paddingX: 80 },
              subElements: [
                { type: 'heading', props: { text: 'WHY BUILDERS CHOOSE US', fontSize: 11, fontWeight: '700', color: '#a5d6a7', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginBottom: 20 } },
                { type: 'heading', props: { text: 'Concrete you can count on.\nEvery pour. Every time.', fontSize: 48, fontWeight: '800', color: '#ffffff', lineHeight: 1.15, textAlign: 'center', marginBottom: 28 } },
                { type: 'paragraph', props: { text: 'Twenty years of delivering to contractors across the Western Cape has taught us one thing: builders don\'t forgive bad concrete. That\'s why every batch is plant-controlled, SANS-certified, and on time.', fontSize: 18, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, textAlign: 'center', marginBottom: 0 } },
              ],
            },
            // Zone 1: 3 reason cards
            { id: 21, type: 'card', position: { row: 1, col: 1, section: 1 }, props: { bgColor: 'rgba(0,0,0,0.35)', borderRadius: 12 }, subElements: [
                { type: 'heading', props: { text: '⚗️', fontSize: 40, textAlign: 'center', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Consistent Quality', fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 12 } },
                { type: 'paragraph', props: { text: 'Automated batching controls water-cement ratio to ±2%. Every batch is cube-tested. Certificates on request.', fontSize: 15, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, textAlign: 'center' } },
            ] },
            { id: 22, type: 'card', position: { row: 1, col: 2, section: 1 }, props: { bgColor: 'rgba(46,125,50,0.35)', borderRadius: 12 }, subElements: [
                { type: 'heading', props: { text: '🚛', fontSize: 40, textAlign: 'center', marginBottom: 16 } },
                { type: 'heading', props: { text: 'On-Time Delivery', fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 12 } },
                { type: 'paragraph', props: { text: 'GPS-tracked fleet of 10 transit mixers. Real-time ETA via WhatsApp. Concrete arrives on schedule so your crew stays productive.', fontSize: 15, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, textAlign: 'center' } },
            ] },
            { id: 23, type: 'card', position: { row: 1, col: 3, section: 1 }, props: { bgColor: 'rgba(0,0,0,0.35)', borderRadius: 12 }, subElements: [
                { type: 'heading', props: { text: '🏗️', fontSize: 40, textAlign: 'center', marginBottom: 16 } },
                { type: 'heading', props: { text: 'Expert Mix Design', fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center', marginBottom: 12 } },
                { type: 'paragraph', props: { text: 'Our in-house mix engineer designs for your application. Marine grade, pumpable, fibre-reinforced, mass-pour — we have it all.', fontSize: 15, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, textAlign: 'center' } },
            ] },
            // Zone 2: stats
            { id: 24, type: 'stats', position: { row: 1, col: 1, section: 2 }, props: { icon: 'bi-calendar2-heart', number: '20+', statLabel: 'Years in business', bgColor: 'rgba(0,0,0,0.3)', textColor: '#ffffff', bgOpacity: 100 } },
            { id: 25, type: 'stats', position: { row: 1, col: 2, section: 2 }, props: { icon: 'bi-boxes', number: '60 000+', statLabel: 'Cubic metres poured', bgColor: 'rgba(46,125,50,0.35)', textColor: '#ffffff', bgOpacity: 100 } },
            { id: 26, type: 'stats', position: { row: 1, col: 3, section: 2 }, props: { icon: 'bi-people', number: '500+', statLabel: 'Satisfied contractors', bgColor: 'rgba(0,0,0,0.3)', textColor: '#ffffff', bgOpacity: 100 } },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. PROJECTS — 3-col Volt project cards + video parallax
  //    bg: solid #2d2d2d
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'FLEXIBLE', enabled: true, order: order++,
      displayName: 'Projects', background: '#2d2d2d',
      motionElements: j([
        {
          id: 'me-projects-vid-1',
          type: 'video',
          src: 'https://videos.pexels.com/video-files/4065714/4065714-uhd_2560_1440_25fps.mp4',
          alt: '',
          bottom: '0', left: '-2%', width: '36%',
          opacity: 10, zIndex: 5, layer: 'behind',
          parallax: { enabled: true, speed: 0.18 },
          entrance: { enabled: false, direction: 'left', distance: 60, duration: 800, delay: 0, easing: 'outCubic' },
          exit: { enabled: false, direction: 'left', distance: 60, duration: 400 },
          idle: { enabled: false, type: 'float', speed: 1, amplitude: 10 },
        },
      ]),
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 3, rows: 2, gap: 24 },
          blocks: [
            // Header row
            {
              id: 30, type: 'text',
              position: { row: 1, col: 1, colSpan: 3 },
              props: { textAlign: 'center', paddingTop: 40, paddingBottom: 8 },
              subElements: [
                { type: 'heading', props: { text: 'COMPLETED PROJECTS', fontSize: 11, fontWeight: '700', color: '#4caf50', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 14 } },
                { type: 'heading', props: { text: 'Concrete that performs — project after project.', fontSize: 36, fontWeight: '800', color: '#ffffff', textAlign: 'center', lineHeight: 1.2, marginBottom: 10 } },
                { type: 'paragraph', props: { text: 'From residential foundations to 4 500 m² industrial slabs — every project delivered on spec.', fontSize: 15, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 } },
              ],
            },
            // 3 Volt project cards
            {
              id: 31, type: 'volt',
              position: { row: 2, col: 1 },
              props: {
                voltId: projectCard.id,
                slotImageUrl: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800&q=80',
                slotImageAlt: 'Parking slab project',
                slotBadge: 'Cape Town — Nov 2024',
                slotTitle: 'Shopping Centre Parking Slab',
                slotBody: '2 800 m² reinforced slab. 25MPa mix, 150mm depth. Completed in 3 pours over 5 days.',
              },
            },
            {
              id: 32, type: 'volt',
              position: { row: 2, col: 2 },
              props: {
                voltId: projectCard.id,
                slotImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
                slotImageAlt: 'School foundation project',
                slotBadge: 'Stellenbosch — Aug 2024',
                slotTitle: 'Primary School Foundation',
                slotBody: 'Strip and pad footings for a new 12-classroom block. 30MPa mix, 140 m³ total volume.',
              },
            },
            {
              id: 33, type: 'volt',
              position: { row: 2, col: 3 },
              props: {
                voltId: projectCard.id,
                slotImageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
                slotImageAlt: 'Industrial floor slab project',
                slotBadge: 'Bellville — Mar 2025',
                slotTitle: 'Industrial Estate Floor Slab',
                slotBody: '4 500 m² floor slab with fibre reinforcement. 30MPa, 200mm depth. Heavy-duty forklift spec.',
              },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. HOW IT WORKS — 2-col: steps text + 3D wireframe slab Volt block
  //    bg: gradient #1a1a1a → #2e7d32
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'FLEXIBLE', enabled: true, order: order++,
      displayName: 'How It Works',
      background: 'linear-gradient(180deg, #1a1a1a 0%, #2e7d32 100%)',
      content: j({
        designerData: {
          layoutType: 'grid',
          grid: { cols: 2, rows: 1, gap: 0 },
          blocks: [
            // Left: step-by-step content
            {
              id: 40, type: 'text',
              position: { row: 1, col: 1 },
              props: { paddingTop: 80, paddingBottom: 80, paddingX: 60 },
              subElements: [
                { type: 'heading', props: { text: 'HOW IT WORKS', fontSize: 11, fontWeight: '700', color: '#a5d6a7', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'left', marginBottom: 20 } },
                { type: 'heading', props: { text: 'Three steps from order to pour.', fontSize: 36, fontWeight: '800', color: '#ffffff', lineHeight: 1.2, textAlign: 'left', marginBottom: 36 } },
                { type: 'heading', props: { text: '01 — Place Your Order', fontSize: 16, fontWeight: '700', color: '#4caf50', textAlign: 'left', marginBottom: 8 } },
                { type: 'paragraph', props: { text: 'Call or submit your quote online. Specify your mix, volume, and pour date. Same-day orders accepted before 10:00 AM.', fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, textAlign: 'left', marginBottom: 28 } },
                { type: 'heading', props: { text: '02 — We Batch Your Mix', fontSize: 16, fontWeight: '700', color: '#4caf50', textAlign: 'left', marginBottom: 8 } },
                { type: 'paragraph', props: { text: 'Your mix design is loaded into our automated batching plant. Water-cement ratio controlled to ±2%. A delivery docket is generated.', fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, textAlign: 'left', marginBottom: 28 } },
                { type: 'heading', props: { text: '03 — On-Site Delivery', fontSize: 16, fontWeight: '700', color: '#4caf50', textAlign: 'left', marginBottom: 8 } },
                { type: 'paragraph', props: { text: 'Our GPS-tracked truck arrives at your site within the agreed window. You receive your delivery docket and are ready to pour.', fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, textAlign: 'left', marginBottom: 36 } },
                { type: 'button', props: { text: 'Request a Quote', navTarget: '#contact', bgColor: '#2e7d32', textColor: '#ffffff', paddingX: 28, paddingY: 12, borderRadius: 6 } },
              ],
            },
            // Right: 3D wireframe slab Volt block
            {
              id: 41, type: 'volt',
              position: { row: 1, col: 2 },
              props: { voltId: slabVolt.id },
            },
          ],
        },
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. CTA — Contact form
  //    bg: solid #0f1a0f (very dark green)
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'CTA', enabled: true, order: order++,
      displayName: 'Contact', background: '#0f1a0f',
      content: j({
        style: 'contact-form',
        heading: 'Get a Quote Today',
        subheading: 'Tell us about your project and we\'ll be in touch within 2 hours.',
        formTitle: 'Request a Quote',
        formFields: [
          { id: 'name',          label: 'Full Name',             type: 'text',     required: true,  placeholder: 'e.g. John Smith' },
          { id: 'email',         label: 'Email Address',         type: 'email',    required: true,  placeholder: 'you@example.com' },
          { id: 'phone',         label: 'Phone Number',          type: 'tel',      required: false, placeholder: '+27 82 000 0000' },
          { id: 'concrete_type', label: 'Concrete Type',         type: 'select',   required: false, placeholder: 'Select type...', options: ['15MPa', '20MPa', '25MPa', '30MPa', '35MPa', '40MPa', 'Fibre Reinforced', 'Pumpable', 'Marine Grade', 'Other'] },
          { id: 'volume',        label: 'Estimated Volume (m³)', type: 'text',     required: false, placeholder: 'e.g. 12 m³' },
          { id: 'message',       label: 'Project Details',       type: 'textarea', required: true,  placeholder: 'Site address, pour date, access notes...' },
        ],
        formSuccessMessage: 'Thank you! We\'ll be in touch within 2 hours.',
        requireEmail: true,
        emailTo: 'info@buildpro.co.za',
        emailSubject: 'Quote Request — BuildPro Concrete',
      }),
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 8. FOOTER
  //    bg: solid #0d1117
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: lp.id, createdBy: admin.id, type: 'FOOTER', enabled: true, order: order++,
      displayName: 'Footer', background: '#0d1117',
      content: j({
        companyName: 'BuildPro Concrete',
        tagline: 'Quality concrete. On time. Every time.',
        copyright: `© ${new Date().getFullYear()} BuildPro Concrete (Pty) Ltd. All rights reserved.`,
        logoUrl: '',
        textColor: '#9ca3af',
        accentColor: '#4caf50',
        columns: [
          {
            heading: 'Services',
            links: [
              { text: 'Standard Mixes',     href: '#services' },
              { text: 'Pumpable Concrete',  href: '#services' },
              { text: 'Fibre Reinforced',   href: '#services' },
              { text: 'Marine Grade',       href: '#services' },
              { text: 'Concrete Calculator', href: '/calculator' },
            ],
          },
          {
            heading: 'Contact',
            links: [
              { text: '+27 21 000 0000',         href: 'tel:+27210000000' },
              { text: 'info@buildpro.co.za',     href: 'mailto:info@buildpro.co.za' },
              { text: '12 Industrial Rd, Cape Town', href: '#' },
              { text: 'Mon–Fri  06:00–16:00',    href: '#' },
              { text: 'Saturday 07:00–12:00',    href: '#' },
            ],
          },
          {
            heading: 'Company',
            links: [
              { text: 'About Us',   href: '#about' },
              { text: 'Projects',   href: '#projects' },
              { text: 'How It Works', href: '#how-it-works' },
              { text: 'Get a Quote', href: '#contact' },
            ],
          },
        ],
        socials: [
          { platform: 'facebook',  href: 'https://facebook.com/buildproconcrete',  icon: 'bi-facebook'  },
          { platform: 'instagram', href: 'https://instagram.com/buildproconcrete', icon: 'bi-instagram' },
        ],
      }),
    },
  });

  console.log('✅  Landing page: 8 sections created');
  console.log('');
  console.log('🎉  Seed v6 complete!');
  console.log('');
  console.log('  Admin:    http://localhost:3000/admin/login  (admin / admin2026)');
  console.log('  Homepage: http://localhost:3000/');
  console.log('');
  console.log('  Sections:');
  console.log(`    1. Hero (2 slides: image + video)`);
  console.log(`    2. About (solid #1a1a1a, story + stats)`);
  console.log(`    3. Services (solid green, multi 2-zone, Volt cards: ${serviceCard.id})`);
  console.log(`    4. Why Choose Us (gradient, multi 3-zone, image parallax)`);
  console.log(`    5. Projects (solid #2d2d2d, Volt project cards, video parallax: ${projectCard.id})`);
  console.log(`    6. How It Works (gradient, text + 3D slab Volt block: ${slabVolt.id})`);
  console.log(`    7. CTA contact form`);
  console.log(`    8. Footer`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
