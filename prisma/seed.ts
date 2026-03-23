/**
 * Minimal seed — creates the SUPER_ADMIN user only.
 * Run once after first deploy:
 *   docker exec sonic-cms-app node node_modules/prisma/build/index.js db seed
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user...');

  const admin = await prisma.user.upsert({
    where: { username: 'support' },
    update: {},
    create: {
      username: 'support',
      email: 'support@sonic.co.za',
      passwordHash: await hashPassword('B3rryP0rtal@5'),
      firstName: 'Support',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Admin user: ${admin.username} (${admin.email})`);
  console.log(`\n🔐 Login: support / B3rryP0rtal@5`);
  console.log(`   URL: /admin/login`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
