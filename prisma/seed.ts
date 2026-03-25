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

  console.log('🌱 Seed complete. Site starts blank — create content via the admin panel.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
