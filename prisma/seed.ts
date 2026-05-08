/**
 * PRODUCTION SEED — Superuser Only
 *
 * Seeds ONLY the initial SUPER_ADMIN user.
 * Safe to run at any time — idempotent, never wipes existing data.
 *
 * For demo/showcase content, use: npx ts-node prisma/seed-showcase.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding superuser...');

  const existing = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existing) {
    console.log('✅ Superuser "admin" already exists — skipping.');
  } else {
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@cms.local',
        passwordHash: await hashPassword('admin2026'),
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Superuser "admin" created (password: admin2026)');
  }

  // ── CMS Update defaults ──────────────────────────────────────────────────
  console.log('🌱 Seeding CMS update defaults...');

  const updateDefaults: Record<string, string> = {
    cms_upstream_version_url: 'https://raw.githubusercontent.com/GavinHolder/white-label-cms/main/public/cms-version.json',
    cms_update_channel: 'stable',
    cms_update_status: 'idle',
    github_workflow_id: 'deploy.yml',
  };

  for (const [key, value] of Object.entries(updateDefaults)) {
    await prisma.systemSettings.upsert({
      where: { key },
      update: {},  // don't overwrite if already configured
      create: { key, value },
    });
  }
  console.log('✅ CMS update defaults set (upstream URL, channel, workflow)');

  // ── Brand tokens — create default if not yet configured ──────────────────────
  // Inline defaults to avoid importing lib/brand-tokens (which pulls in @/lib/prisma).
  // update: {} ensures an existing client-configured palette is NEVER overwritten.
  const defaultBrandTokens = {
    colors: { primary: '#2563eb', secondary: '#7c3aed', accent: '#f59e0b', neutral: '#64748b', background: '#ffffff', surface: '#f8fafc', text: '#0f172a', textMuted: '#64748b' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter', baseSize: 16, scaleRatio: 1.25 },
    spacing: { sectionPadding: 80, containerMax: 1320 },
    borders: { radius: 8, radiusLarge: 16 },
  };
  await prisma.systemSettings.upsert({
    where: { key: 'brand_tokens' },
    update: {},  // never overwrite client-configured brand colours
    create: { key: 'brand_tokens', value: JSON.stringify(defaultBrandTokens) },
  });
  console.log('✅ Brand tokens default ensured (skipped if already configured)');

  // ── Built-in templates ────────────────────────────────────────────────────────
  console.log('🌱 Seeding built-in templates...');

  await prisma.cmsTemplate.upsert({
    where: { id: 'builtin-blank-standalone' },
    update: {},
    create: {
      id: 'builtin-blank-standalone',
      name: 'Blank Standalone',
      description: 'Empty standalone page — full HTML/CSS control from scratch.',
      templateType: 'standalone',
      isBuiltIn: true,
      tags: JSON.stringify(['blank', 'starter']),
      data: { customHtml: '', customCss: '', customCssUrls: [] } as any,
      updatedAt: new Date(),
    },
  });

  const ovbHtmlPath = join(__dirname, 'seed-data', 'ovb-readymix-standalone.html');
  if (existsSync(ovbHtmlPath)) {
    const ovbHtml = readFileSync(ovbHtmlPath, 'utf-8');
    await prisma.cmsTemplate.upsert({
      where: { id: 'builtin-ovb-readymix' },
      update: {},
      create: {
        id: 'builtin-ovb-readymix',
        name: 'OVB Readymix Landing Page',
        description: 'Full standalone landing page for a readymix concrete supplier. Dark theme with mosaic project grid.',
        templateType: 'standalone',
        isBuiltIn: true,
        tags: JSON.stringify(['ovb', 'landing', 'readymix', 'construction', 'dark']),
        data: { customHtml: ovbHtml, customCss: '', customCssUrls: [] } as any,
        updatedAt: new Date(),
      },
    });
    console.log('✅ Built-in templates seeded (Blank Standalone + OVB Readymix Landing Page)');
  } else {
    console.log('✅ Built-in templates seeded (Blank Standalone only — OVB HTML not found at prisma/seed-data/)');
  }

  console.log('🌱 Seed complete. Site starts blank — create content via the admin panel.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
