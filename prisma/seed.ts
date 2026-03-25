/**
 * Minimal seed — creates the SUPER_ADMIN user only.
 * Run once after first deploy:
 *   docker exec sonic-cms-app node node_modules/prisma/build/index.js db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pre-computed bcrypt hash for 'B3rryP0rtal@5' (rounds=12)
// Regenerate with: node -e "require('bcryptjs').hash('B3rryP0rtal@5',12).then(console.log)"
const PASSWORD_HASH = '$2b$12$3KqU1CLflNP7avN0U6J2B./h/3admfYaznTyTorMxG4Pn.WNHNd.q';

async function main() {
  console.log('🌱 Seeding admin user...');

  const admin = await prisma.user.upsert({
    where: { username: 'support' },
    update: {},
    create: {
      username: 'support',
      email: 'support@sonic.co.za',
      passwordHash: PASSWORD_HASH,
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
