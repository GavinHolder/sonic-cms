/**
 * Seeds the LOCAL test database with one public page per fixture (slug `fx-<name>`), each
 * holding exactly one section, so the runner can load `/fx-<name>` and measure the real
 * public render path (root layout, navbar, #snap-container, DynamicSection).
 *
 * SAFETY: refuses to run unless DATABASE_URL points at a database whose name contains
 * "fidelity" — this script deletes every page whose slug starts with `fx-`.
 *
 *   npx tsx tests/responsive-fidelity/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loadFixtures } from "./fixtures/load";
import type { Fixture } from "./fixtures/synthetic";

const SECTION_FIELDS = [
  "type", "enabled", "displayName", "navLabel", "paddingTop", "paddingBottom", "background", "banner",
  "bgImageUrl", "bgImageSize", "bgImagePosition", "bgImageRepeat", "bgImageOpacity", "bgParallax",
  "lowerThird", "motionElements", "paddingBottomMobile", "paddingTopMobile",
] as const;

export function assertSafeDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/\/[^/?]*fidelity[^/?]*(\?|$)/i.test(url)) {
    throw new Error(`Refusing to seed: DATABASE_URL must name a database containing "fidelity" (got ${url.replace(/:[^:@/]*@/, ":***@")})`);
  }
}

export async function seedFixtures(fixtures: Fixture[]) {
  assertSafeDatabase();
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { username: "fidelity-admin" },
      update: {},
      create: {
        username: "fidelity-admin",
        email: "fidelity-admin@example.invalid",
        passwordHash: bcrypt.hashSync("fidelity-test-password", 4),
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    await prisma.page.deleteMany({ where: { slug: { startsWith: "fx-" } } });
    for (const fx of fixtures) {
      const data: Record<string, unknown> = {};
      for (const k of SECTION_FIELDS) {
        const v = (fx.section as unknown as Record<string, unknown>)[k];
        if (v !== undefined && v !== null) data[k] = v;
      }
      data.content = fx.section.content as object;
      const page = await prisma.page.create({
        data: {
          slug: `fx-${fx.name}`,
          title: `Fixture ${fx.name}`,
          type: "FULL_PAGE",
          status: "PUBLISHED",
          enabled: true,
          createdBy: user.id,
        },
      });
      await prisma.section.create({
        data: { ...(data as object), pageId: page.id, order: 0, createdBy: user.id } as never,
      });
    }
    return fixtures.length;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("responsive-fidelity/seed.ts")) {
  seedFixtures(loadFixtures()).then((n) => console.log(`seeded ${n} fixture page(s)`)).catch((e) => { console.error(e); process.exit(1); });
}
