/**
 * SHOWCASE SEED
 *
 * Demonstrates every CMS feature:
 *  ✓ Multi-slide Hero carousel
 *  ✓ NORMAL sections (text-only, text+stats, cards)
 *  ✓ Animated backgrounds (floating-shapes, particle-field, moving-gradient, waves)
 *  ✓ Motion elements with parallax, entrance, idle animations
 *  ✓ Lower-third SVG shapes (wave, mountain, chevron)
 *  ✓ Triangle / Section-Into overlays
 *  ✓ Background images with parallax
 *  ✓ Gradient overlays
 *  ✓ FLEXIBLE section (canvas demo)
 *  ✓ CTA section
 *  ✓ FOOTER with social links + columns
 *  ✓ Client Feature (Concrete Calculator enabled)
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function motionEl(
  id: string,
  svg: string,
  top: string,
  left: string,
  width: string,
  idleType: 'float' | 'bob' | 'pulse' | 'rotate' | 'sway' = 'float',
  parallaxSpeed = 0,
): object {
  return {
    id,
    src: svg,
    alt: '',
    top,
    left,
    right: undefined,
    bottom: undefined,
    width,
    zIndex: 5,
    layer: 'behind',
    parallax: { enabled: parallaxSpeed !== 0, speed: parallaxSpeed },
    entrance: { enabled: true, direction: 'bottom', distance: 60, duration: 1000, delay: 200, easing: 'easeOutCubic' },
    exit: { enabled: false, direction: 'bottom', distance: 60, duration: 600 },
    idle: { enabled: true, type: idleType, speed: 1, amplitude: idleType === 'pulse' ? 10 : idleType === 'rotate' ? 360 : 14 },
  };
}

// Inline SVG data URIs — no external files needed for demo
const SVG_CIRCLE = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.4)" stroke-width="3"/></svg>')}`;
const SVG_RING   = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(251,191,36,0.5)" stroke-width="6"/><circle cx="50" cy="50" r="28" fill="none" stroke="rgba(251,191,36,0.25)" stroke-width="3"/></svg>')}`;
const SVG_DOTS   = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="20" cy="20" r="8" fill="rgba(16,185,129,0.4)"/><circle cx="60" cy="10" r="5" fill="rgba(16,185,129,0.25)"/><circle cx="100" cy="30" r="10" fill="rgba(16,185,129,0.35)"/><circle cx="10" cy="80" r="6" fill="rgba(16,185,129,0.3)"/><circle cx="80" cy="90" r="9" fill="rgba(16,185,129,0.4)"/><circle cx="110" cy="70" r="4" fill="rgba(16,185,129,0.2)"/></svg>')}`;
const SVG_DIAMOND = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="rgba(239,68,68,0.4)" stroke-width="4"/><polygon points="50,20 80,50 50,80 20,50" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.25)" stroke-width="2"/></svg>')}`;
const SVG_PLUS   = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><line x1="40" y1="5" x2="40" y2="75" stroke="rgba(59,130,246,0.45)" stroke-width="6" stroke-linecap="round"/><line x1="5" y1="40" x2="75" y2="40" stroke="rgba(59,130,246,0.45)" stroke-width="6" stroke-linecap="round"/></svg>')}`;

// ── AnimBg presets ────────────────────────────────────────────────────────────

const ANIM_BG_PARTICLES = {
  enabled: true,
  layers: [{
    id: 'l1', type: 'particle-field', enabled: true, opacity: 60,
    blendMode: 'normal', useColorPalette: false,
    colors: ['#6366f1', '#8b5cf6', '#06b6d4'],
    config: { count: 35, sizeMin: 2, sizeMax: 5, speed: 0.6, connectLines: true, connectionDistance: 130 },
  }],
  overlayColor: '#000000', overlayOpacity: 0,
};

const ANIM_BG_FLOATING_SHAPES_DARK = {
  enabled: true,
  layers: [{
    id: 'l1', type: 'floating-shapes', enabled: true, opacity: 50,
    blendMode: 'screen', useColorPalette: false,
    colors: ['#818cf8', '#c084fc', '#34d399'],
    config: { count: 10, sizeMin: 40, sizeMax: 160, speedMin: 10, speedMax: 22, blur: 18, opacityMin: 15, opacityMax: 50, shapes: ['circle', 'blob'] },
  }],
  overlayColor: '#000000', overlayOpacity: 0,
};

const ANIM_BG_WAVES = {
  enabled: true,
  layers: [{
    id: 'l1', type: 'waves', enabled: true, opacity: 70,
    blendMode: 'normal', useColorPalette: false,
    colors: ['#1e40af', '#2563eb', '#3b82f6'],
    config: { waveCount: 3, amplitude: 55, speed: 9, direction: 'left' },
  }],
  overlayColor: '#000000', overlayOpacity: 20,
};

const ANIM_BG_MOVING_GRADIENT = {
  enabled: true,
  layers: [{
    id: 'l1', type: 'moving-gradient', enabled: true, opacity: 100,
    blendMode: 'normal', useColorPalette: false,
    colors: ['#4f46e5', '#0f172a', '#065f46', '#1e3a8a'],
    config: { direction: 'diagonal', speed: 14, scale: 220 },
  }],
  overlayColor: '#000000', overlayOpacity: 10,
};

// ── Lower-third helpers ───────────────────────────────────────────────────────

function lowerThird(preset: string, color: string, height = 180): object {
  return { enabled: true, mode: 'preset', preset, presetColor: color, presetOpacity: 1, imageSrc: '', height, flipHorizontal: false, flipVertical: false };
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting SHOWCASE seed...');

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
  const admin = await prisma.user.upsert({
    where: { username: 'support' },
    update: {},
    create: {
      username: 'support',
      email: 'admin@ovbreadymix.co.za',
      passwordHash: await hashPassword('B3rryP0rtal@5'),
      firstName: 'Support',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.username}`);

  // ── Client features ────────────────────────────────────────────────────────
  await prisma.clientFeature.create({
    data: {
      slug: 'concrete-calculator',
      name: 'Concrete Calculator',
      enabled: true,
      config: {
        concreteDensity: 2400,
        currencySymbol: 'R',
        cementBagSize: 50,
        cementBagPrice: 180,
        deliveryFee: 0,
        wastagePercent: 10,
        mixRatios: {
          '15MPa': { cement: 1, sand: 3, stone: 3 },
          '20MPa': { cement: 1, sand: 2.5, stone: 2.5 },
          '25MPa': { cement: 1, sand: 2, stone: 2 },
          '30MPa': { cement: 1, sand: 1.5, stone: 1.5 },
        },
      },
    },
  });
  await prisma.clientFeature.create({
    data: { slug: 'coverage-map', name: 'Coverage Map', enabled: false, config: {} },
  });
  console.log('✅ Feature: Concrete Calculator (enabled), Coverage Map (disabled)');

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
  console.log(`✅ Page: ${landingPage.title}`);

  let order = 0;

  // ════════════════════════════════════════════════════════════════════════════
  // 1. HERO — multi-slide, gradient, animated overlay text
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'HERO',
      enabled: true,
      order: order++,
      displayName: 'Hero Carousel',
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
              preset: { direction: 'bottomRight', startOpacity: 97, endOpacity: 65, color: '#0f172a' },
            },
            overlay: {
              heading: { text: 'Built for the Way You Work', fontSize: 72, fontWeight: 800, color: '#ffffff', animation: 'slideUp', animationDuration: 900, animationDelay: 100 },
              subheading: { text: 'A powerful, flexible platform to manage content, features, and customer experience — all in one place.', fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.80)', animation: 'slideUp', animationDuration: 900, animationDelay: 300 },
              buttons: [
                { text: 'Get Started Free', href: '#about', backgroundColor: '#3b82f6', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
                { text: 'See It In Action', href: '#services', backgroundColor: 'transparent', textColor: '#ffffff', variant: 'outline', animation: 'slideUp', animationDelay: 620 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
          {
            id: 'slide-2',
            type: 'color',
            src: '',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottomLeft', startOpacity: 92, endOpacity: 55, color: '#0c4a6e' },
            },
            overlay: {
              heading: { text: 'Your Brand. Your Rules.', fontSize: 72, fontWeight: 800, color: '#ffffff', animation: 'slideUp', animationDuration: 900, animationDelay: 100 },
              subheading: { text: 'White-label everything — colours, fonts, layouts. Customise every pixel without touching code.', fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.80)', animation: 'slideUp', animationDuration: 900, animationDelay: 300 },
              buttons: [
                { text: 'Explore Features', href: '#features', backgroundColor: '#06b6d4', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
          {
            id: 'slide-3',
            type: 'color',
            src: '',
            gradient: {
              enabled: true,
              type: 'preset',
              preset: { direction: 'bottom', startOpacity: 90, endOpacity: 50, color: '#1a1a2e' },
            },
            overlay: {
              heading: { text: 'Speed. Depth. Impact.', fontSize: 72, fontWeight: 800, color: '#ffffff', animation: 'zoom', animationDuration: 900, animationDelay: 100 },
              subheading: { text: 'Parallax layers, animated backgrounds, motion elements, and scroll-driven storytelling built right in.', fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.80)', animation: 'slideUp', animationDuration: 900, animationDelay: 300 },
              buttons: [
                { text: 'See the Canvas', href: '#canvas', backgroundColor: '#8b5cf6', textColor: '#ffffff', variant: 'filled', animation: 'slideUp', animationDelay: 500 },
              ],
              position: 'center',
              spacing: { betweenHeadingSubheading: 24, betweenSubheadingButtons: 48, betweenButtons: 16 },
            },
          },
        ],
        autoPlay: true,
        autoPlayInterval: 7000,
        showDots: true,
        showArrows: true,
        transitionDuration: 900,
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ HERO — 3 slides');

  // ════════════════════════════════════════════════════════════════════════════
  // 2. ABOUT US — NORMAL, motion elements + lower-third wave
  //    SHOWCASES: Motion elements (floating circles, parallax), lower-third wave, bgParallax
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: order++,
      displayName: 'About Us',
      navLabel: 'About',
      paddingTop: 100,
      paddingBottom: 100,
      background: 'white',
      bgParallax: false,
      lowerThird: lowerThird('wave', '#f8f9fa', 160) as any,
      motionElements: [
        motionEl('me-about-1', SVG_CIRCLE,  '8%',  '3%',  '220px', 'float',  0.15),
        motionEl('me-about-2', SVG_RING,    '15%', '80%', '180px', 'bob',   -0.10),
        motionEl('me-about-3', SVG_DOTS,    '55%', '88%', '140px', 'sway',   0),
      ] as any,
      content: {
        heading: 'We Build Tools That Get Out of Your Way',
        subheading: 'Fast. Flexible. Focused on results.',
        body: `
          <div class="row g-5 align-items-center">
            <div class="col-lg-7">
              <p class="lead mb-4" style="font-size:1.2rem;line-height:1.8;">
                Your company does extraordinary work. Your website should reflect that — not hold it back.
                This CMS gives you full control without requiring a developer on speed-dial.
              </p>
              <p class="mb-5 text-muted" style="font-size:1.05rem;line-height:1.8;">
                From drag-and-drop layouts and live parallax layers to feature flags and built-in calculators,
                everything is designed so your team can move fast, launch confidently, and iterate often.
              </p>
              <div class="d-flex flex-wrap gap-3">
                <a href="/calculator" class="btn btn-primary btn-lg px-5" style="border-radius:50px;">
                  <i class="bi bi-calculator me-2"></i>Try Concrete Calculator
                </a>
                <a href="#services" class="btn btn-outline-secondary btn-lg px-5" style="border-radius:50px;">
                  Our Services
                </a>
              </div>
            </div>
            <div class="col-lg-5">
              <div class="row g-3 text-center">
                <div class="col-6">
                  <div class="p-4 rounded-4 h-100" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);">
                    <div class="fw-black mb-1" style="font-size:2.8rem;color:#2563eb;font-weight:900;">99%</div>
                    <div class="small text-muted fw-semibold text-uppercase" style="letter-spacing:.05em;">Uptime SLA</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-4 rounded-4 h-100" style="background:linear-gradient(135deg,#fffbeb,#fef3c7);">
                    <div class="fw-black mb-1" style="font-size:2.8rem;color:#d97706;font-weight:900;">&lt;1s</div>
                    <div class="small text-muted fw-semibold text-uppercase" style="letter-spacing:.05em;">Page Load</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-4 rounded-4 h-100" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);">
                    <div class="fw-black mb-1" style="font-size:2.8rem;color:#16a34a;font-weight:900;">∞</div>
                    <div class="small text-muted fw-semibold text-uppercase" style="letter-spacing:.05em;">Customisations</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-4 rounded-4 h-100" style="background:linear-gradient(135deg,#fdf4ff,#f3e8ff);">
                    <div class="fw-black mb-1" style="font-size:2.8rem;color:#9333ea;font-weight:900;">24/7</div>
                    <div class="small text-muted fw-semibold text-uppercase" style="letter-spacing:.05em;">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `,
        layout: 'text-only',
        layoutPreset: 'centered',
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ ABOUT — motion elements + lower-third wave');

  // ════════════════════════════════════════════════════════════════════════════
  // 3. SERVICES — NORMAL, animated bg (particle-field), motion diamond + plus
  //    SHOWCASES: Animated background, motion elements (sway/pulse)
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: order++,
      displayName: 'Our Services',
      navLabel: 'Services',
      paddingTop: 100,
      paddingBottom: 120,
      background: '#0f172a',
      lowerThird: lowerThird('mountain', '#f8f9fa', 200) as any,
      motionElements: [
        motionEl('me-svc-1', SVG_DIAMOND, '5%',  '90%', '160px', 'rotate',  0.2),
        motionEl('me-svc-2', SVG_PLUS,   '70%', '2%',  '120px', 'pulse',  -0.15),
        motionEl('me-svc-3', SVG_CIRCLE, '40%', '95%', '100px', 'float',   0.1),
      ] as any,
      content: {
        heading: 'Everything You Need. Nothing You Don\'t.',
        subheading: 'Modular features you switch on when you need them.',
        animBg: ANIM_BG_PARTICLES,
        body: `
          <div class="row g-4 mt-2">
            ${[
              ['🎨', 'Visual Designer', 'Drag-and-drop section builder with live preview. Build entire pages without touching code.', '#4f46e5'],
              ['🎞️', 'Multi-Layer Parallax', 'Stack background layers with independent scroll speeds for immersive, depth-driven visual effects.', '#0891b2'],
              ['🔧', 'Feature Flags', 'Enable calculators, forms, and tools on demand. Each feature is fully configurable from the admin panel.', '#059669'],
              ['⚡', 'Fast by Default', 'Next.js 16 App Router, server-side rendering, and edge caching baked in from day one.', '#d97706'],
              ['📱', 'Fully Responsive', 'Every section adapts perfectly to mobile, tablet, and desktop — no extra configuration needed.', '#dc2626'],
              ['🔒', 'Role-Based Access', 'SUPER_ADMIN, Publisher, Editor, and Viewer roles with granular permission control.', '#7c3aed'],
            ].map(([icon, title, desc, color]) => `
              <div class="col-md-4">
                <div class="card h-100 border-0 p-4" style="background:rgba(255,255,255,0.05);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08)!important;border-radius:16px;">
                  <div class="mb-3" style="font-size:2.2rem;">${icon}</div>
                  <h5 class="fw-bold mb-2 text-white">${title}</h5>
                  <p class="mb-0" style="color:rgba(255,255,255,0.65);font-size:.95rem;">${desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        `,
        layout: 'text-only',
        layoutPreset: 'centered',
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ SERVICES — dark bg + animated particles + motion elements');

  // ════════════════════════════════════════════════════════════════════════════
  // 4. PARALLAX DEMO — NORMAL, animated moving-gradient bg, heavy motion elements
  //    SHOWCASES: Moving gradient anim bg, 4 motion elements with parallax scroll
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: order++,
      displayName: 'Parallax & Animation Demo',
      navLabel: 'Animation',
      paddingTop: 100,
      paddingBottom: 100,
      background: '#1a1a2e',
      lowerThird: lowerThird('chevron', '#f0f9ff', 140) as any,
      motionElements: [
        motionEl('me-par-1', SVG_CIRCLE,  '5%',  '5%',  '300px', 'float',  0.3),
        motionEl('me-par-2', SVG_RING,    '60%', '78%', '250px', 'bob',    0.2),
        motionEl('me-par-3', SVG_DIAMOND, '10%', '70%', '180px', 'rotate', -0.25),
        motionEl('me-par-4', SVG_DOTS,    '65%', '5%',  '160px', 'sway',   0.15),
      ] as any,
      content: {
        heading: 'Depth Without Limits',
        subheading: 'Parallax layers move at independent speeds as you scroll — creating real visual depth.',
        animBg: ANIM_BG_MOVING_GRADIENT,
        body: `
          <div class="row g-4 justify-content-center text-center mt-2">
            <div class="col-md-4">
              <div class="p-5 rounded-4" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:3rem;margin-bottom:1rem;">🎞️</div>
                <h5 class="text-white fw-bold mb-2">Scroll Parallax</h5>
                <p style="color:rgba(255,255,255,0.6);font-size:.9rem;">Each motion element scrolls at its own speed — positive floats, negative counters.</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="p-5 rounded-4" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:3rem;margin-bottom:1rem;">✨</div>
                <h5 class="text-white fw-bold mb-2">Idle Animations</h5>
                <p style="color:rgba(255,255,255,0.6);font-size:.9rem;">Float, bob, pulse, rotate, and sway — each element loops its own idle animation continuously.</p>
              </div>
            </div>
            <div class="col-md-4">
              <div class="p-5 rounded-4" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:3rem;margin-bottom:1rem;">🌊</div>
                <h5 class="text-white fw-bold mb-2">Animated Backgrounds</h5>
                <p style="color:rgba(255,255,255,0.6);font-size:.9rem;">Moving gradients, floating shapes, particle fields, and waves as live background layers.</p>
              </div>
            </div>
          </div>
        `,
        layout: 'text-only',
        layoutPreset: 'centered',
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ PARALLAX DEMO — moving-gradient + 4 parallax motion elements');

  // ════════════════════════════════════════════════════════════════════════════
  // 5. WAVES SECTION — NORMAL, animated waves bg, triangle overlay
  //    SHOWCASES: Waves animated bg, triangle Section Into, bgParallax
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'NORMAL',
      enabled: true,
      order: order++,
      displayName: 'Waves Showcase',
      navLabel: 'Waves',
      paddingTop: 100,
      paddingBottom: 100,
      background: '#0c4a6e',
      triangleEnabled: true,
      triangleSide: 'right',
      triangleShape: 'classic',
      triangleHeight: 220,
      triangleGradientType: 'linear',
      triangleColor1: '#0ea5e9',
      triangleColor2: '#6366f1',
      triangleAlpha1: 90,
      triangleAlpha2: 80,
      triangleAngle: 135,
      motionElements: [
        motionEl('me-wave-1', SVG_RING,   '10%', '85%', '200px', 'float', 0.2),
        motionEl('me-wave-2', SVG_PLUS,   '60%', '5%',  '140px', 'pulse', 0.0),
      ] as any,
      content: {
        heading: 'Wave Your Way to Better UX',
        subheading: 'Animated wave backgrounds bring sections to life without distracting from content.',
        animBg: ANIM_BG_WAVES,
        body: `
          <div class="row g-4 mt-2 justify-content-center">
            <div class="col-lg-8 text-center">
              <p class="lead" style="color:rgba(255,255,255,0.85);font-size:1.2rem;line-height:1.8;">
                The animated background system supports up to 3 simultaneous layers per section —
                combine waves, particles, and floating shapes for multi-dimensional atmospheric effects.
              </p>
              <p style="color:rgba(255,255,255,0.60);font-size:1rem;line-height:1.7;">
                Every layer runs in an isolated canvas with its own opacity, blend mode, and colour palette.
                Performance is maintained through IntersectionObserver — animations only play when the section is visible.
              </p>
              <a href="#canvas" class="btn btn-light btn-lg mt-3 px-5" style="border-radius:50px;">
                Try the Canvas Designer
              </a>
            </div>
          </div>
        `,
        layout: 'text-only',
        layoutPreset: 'centered',
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ WAVES — animated waves bg + triangle Section Into');

  // ════════════════════════════════════════════════════════════════════════════
  // 6. FLEXIBLE CANVAS — FLEXIBLE section
  //    SHOWCASES: FLEXIBLE type + animBg (floating-shapes) + motion elements + lower-third
  //    Uses "multi" contentMode so content grows beyond 100vh (stats-style layout)
  // ════════════════════════════════════════════════════════════════════════════
  const ANIM_BG_FLEX_AURORA = {
    enabled: true,
    layers: [{
      id: 'l1', type: 'moving-gradient', enabled: true, opacity: 100,
      blendMode: 'normal', useColorPalette: false,
      colors: ['#0f0c29', '#302b63', '#24243e', '#1a1a2e'],
      config: { direction: 'diagonal', speed: 18, scale: 250 },
    }],
    overlayColor: '#000000', overlayOpacity: 0,
  };
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Flexible Canvas — Full Feature Demo',
      navLabel: 'Studio',
      paddingTop: 100,
      paddingBottom: 100,
      background: '#0f0c29',
      lowerThird: lowerThird('arch', '#1f2937', 120) as any,
      motionElements: [
        motionEl('me-fx-1', SVG_RING,    '8%',  '4%',  '220px', 'bob',   0.08),
        motionEl('me-fx-2', SVG_CIRCLE,  '72%', '88%', '180px', 'float', 0.12),
        motionEl('me-fx-3', SVG_PLUS,    '50%', '92%', '120px', 'pulse', 0.0),
      ] as any,
      content: {
        contentMode: 'single',
        layout: { type: 'preset', preset: 'centered' },
        animBg: ANIM_BG_FLEX_AURORA,
        elements: [
          {
            id: 'fx-label',
            type: 'heading',
            content: {
              text: '✦ FLEXIBLE SECTION',
              level: 'h6',
              fontSize: 12,
              fontWeight: 700,
              color: '#818cf8',
              textAlign: 'center',
              letterSpacing: '0.3em',
            },
            styles: {},
          },
          {
            id: 'fx-h1',
            type: 'heading',
            content: {
              text: 'Design Freely. Ship Confidently.',
              level: 'h2',
              fontSize: 56,
              fontWeight: 900,
              color: '#f8fafc',
              textAlign: 'center',
            },
            styles: {},
          },
          {
            id: 'fx-p1',
            type: 'paragraph',
            content: {
              text: 'This Flexible Section runs with an aurora animated background, 3 motion elements (ring + circle + plus), and a lower-third arch shape. Fully editable via the admin designer — add stats, cards, columns, HTML — anything.',
              fontSize: 18,
              color: '#94a3b8',
              textAlign: 'center',
            },
            styles: {},
          },
          {
            id: 'fx-btn-1',
            type: 'button',
            content: {
              text: 'Open Designer',
              href: '#',
              variant: 'primary',
              size: 'lg',
            },
            styles: {},
          },
        ],
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ FLEXIBLE CANVAS — aurora bg + motion elements + lower-third arch');

  // ════════════════════════════════════════════════════════════════════════════
  // 7. FLEXIBLE MULTI — FLEXIBLE section with contentMode: "multi"
  //    SHOWCASES: Multi-block layout, stats grid, feature cards, grows beyond 100vh
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FLEXIBLE',
      enabled: true,
      order: order++,
      displayName: 'Flexible Multi-Block: Stats & Features',
      navLabel: 'Features',
      paddingTop: 80,
      paddingBottom: 80,
      background: '#f8fafc',
      content: {
        contentMode: 'multi',
        layout: { type: 'preset', preset: '3-col' },
        elements: [
          // Section label + heading (centered, full width)
          {
            id: 'fm-label',
            type: 'heading',
            content: { text: 'WHAT\'S INCLUDED', level: 'h6', fontSize: 12, fontWeight: 700, color: '#6366f1', textAlign: 'center', letterSpacing: '0.3em' },
            styles: {},
          },
          {
            id: 'fm-h1',
            type: 'heading',
            content: { text: 'Everything You Need to Launch', level: 'h2', fontSize: 48, fontWeight: 800, color: '#0f172a', textAlign: 'center' },
            styles: {},
          },
          {
            id: 'fm-sub',
            type: 'paragraph',
            content: { text: 'A multi-block FLEXIBLE section — content flows past 100vh. Ideal for feature grids, stat rows, and rich layouts that need room to breathe.', fontSize: 18, color: '#64748b', textAlign: 'center' },
            styles: {},
          },
          // Stat cards row
          { id: 'fm-stat-1', type: 'stat', content: { value: '12+', label: 'Section Types', description: 'Hero, CTA, Flexible, Normal, Footer and more', icon: 'bi-grid', color: '#6366f1' }, styles: {} },
          { id: 'fm-stat-2', type: 'stat', content: { value: '5', label: 'Animated Backgrounds', description: 'Particles, waves, gradients, shapes, aurora', icon: 'bi-stars', color: '#0891b2' }, styles: {} },
          { id: 'fm-stat-3', type: 'stat', content: { value: '∞', label: 'Combinations', description: 'Mix motion, lower-thirds, triangles and more', icon: 'bi-infinity', color: '#059669' }, styles: {} },
          // Feature cards
          { id: 'fm-feat-1', type: 'card', content: { title: 'Motion Elements', body: 'Float, bob, pulse, rotate, and sway SVG overlays with scroll-based parallax and anime.js entrance animations.', icon: 'bi-film', variant: 'primary' }, styles: {} },
          { id: 'fm-feat-2', type: 'card', content: { title: 'Lower Thirds', body: 'Wave, mountain, chevron, ripple, arch, and more — SVG shapes that seamlessly transition between sections.', icon: 'bi-layout-bottom', variant: 'info' }, styles: {} },
          { id: 'fm-feat-3', type: 'card', content: { title: 'Section Into', body: 'Triangle overlays with gradient, image fill, and hover text — precise control over section transitions.', icon: 'bi-triangle', variant: 'success' }, styles: {} },
        ],
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ FLEXIBLE MULTI — multi-block stats + feature cards grid');

  // ════════════════════════════════════════════════════════════════════════════
  // 8. CTA — animated floating-shapes bg, motion elements, lower-third ripple
  //    SHOWCASES: CTA with animated bg + motion elements + lower-third
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'CTA',
      enabled: true,
      order: order++,
      displayName: 'CTA: Get Started',
      paddingTop: 100,
      paddingBottom: 100,
      background: '#4f46e5',
      lowerThird: lowerThird('ripple', '#1f2937', 150) as any,
      motionElements: [
        motionEl('me-cta-1', SVG_CIRCLE,  '5%',  '5%',  '250px', 'float',  0.12),
        motionEl('me-cta-2', SVG_DIAMOND, '60%', '88%', '200px', 'rotate',  0.0),
      ] as any,
      content: {
        heading: 'Ready to Launch Something Great?',
        subheading: 'Join businesses that trust this platform to power their digital presence. No lock-in. No surprises.',
        animBg: ANIM_BG_FLOATING_SHAPES_DARK,
        buttons: [
          { text: 'Start for Free', href: '#contact', variant: 'light' },
          { text: 'Book a Demo', href: '#contact', variant: 'outline-light' },
        ],
        style: 'banner',
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ CTA — floating-shapes bg + motion elements + lower-third ripple');

  // ════════════════════════════════════════════════════════════════════════════
  // 8. FOOTER
  // ════════════════════════════════════════════════════════════════════════════
  await prisma.section.create({
    data: {
      pageId: landingPage.id,
      type: 'FOOTER',
      enabled: true,
      order: 999999,
      displayName: 'Footer',
      paddingTop: 60,
      paddingBottom: 40,
      background: '#1f2937',
      content: {
        logo: '',
        tagline: 'Your Company — built for growth.',
        companyInfo: {
          name: 'Your Company (Pty) Ltd',
          address: '123 Main Road, City, 0000',
          phone: '+27 00 000 0000',
          email: 'info@yourcompany.co.za',
          position: 'top-left',
        },
        columns: [
          {
            id: 'col-product',
            title: 'Product',
            links: [
              { text: 'Features', href: '#services' },
              { text: 'Pricing', href: '/pricing' },
              { text: 'Changelog', href: '/changelog' },
            ],
          },
          {
            id: 'col-tools',
            title: 'Tools',
            links: [
              { text: 'Concrete Calculator', href: '/calculator' },
            ],
          },
          {
            id: 'col-legal',
            title: 'Legal',
            links: [
              { text: 'Terms of Service', href: '/terms' },
              { text: 'Privacy Policy', href: '/privacy' },
              { text: 'Regulatory / Compliance', href: '/regulatory' },
            ],
          },
        ],
        copyright: '© 2026 Your Company (Pty) Ltd. All rights reserved.',
        socialLinks: [
          { platform: 'facebook',  url: 'https://facebook.com/yourcompany',  icon: 'bi-facebook' },
          { platform: 'instagram', url: 'https://instagram.com/yourcompany', icon: 'bi-instagram' },
          { platform: 'linkedin',  url: 'https://linkedin.com/company/yourcompany', icon: 'bi-linkedin' },
        ],
      },
      createdBy: admin.id,
    },
  });
  console.log('  ✓ FOOTER');

  console.log('\n🎉 Showcase seed complete!');
  console.log(`   ✓ 9 sections (HERO×1, NORMAL×4, FLEXIBLE×2, CTA×1, FOOTER×1)`);
  console.log(`   ✓ Animated backgrounds: particles, moving-gradient, waves, floating-shapes, aurora`);
  console.log(`   ✓ Motion elements: 16 total with parallax, entrance, idle animations`);
  console.log(`   ✓ Lower-thirds: wave, mountain, chevron, ripple, arch`);
  console.log(`   ✓ Triangle/Section-Into overlay on Waves section`);
  console.log(`   ✓ FLEXIBLE single: aurora animBg + 3 motion elements + lower-third arch`);
  console.log(`   ✓ FLEXIBLE multi:  stats grid + feature cards (contentMode="multi", grows past 100vh)`);
  console.log(`   ✓ Concrete Calculator feature enabled`);
  console.log(`\n🔐 Login: support / B3rryP0rtal@5`);
  console.log('   URL: http://localhost:3000/admin/login');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
