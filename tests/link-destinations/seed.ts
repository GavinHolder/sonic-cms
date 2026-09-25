/**
 * Seeds a THROWAWAY database with one of everything the link-destinations catalog lists, so the Designer's
 * "Link To" picker can be verified in a real browser (tests/link-destinations/verify.mjs).
 *
 * SAFETY: refuses to run unless DATABASE_URL names a database containing "fidelity" (same guard as
 * tests/responsive-fidelity/seed.ts) — this script deletes and recreates its own fixtures.
 *
 *   DATABASE_URL=postgresql://…/link_dest_fidelity npx tsx tests/link-destinations/seed.ts [--coverage=off] [--policies=off]
 *
 * Flags flip the two enable sources the catalog must respect, so a run can prove the "only when enabled" rule:
 *   --coverage=off   ClientFeature "coverage-maps" disabled (the /coverage route 404s)
 *   --policies=off   Plugin "policies" disabled            (the /policies* routes 404)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertSafeDatabase } from "../responsive-fidelity/seed";

export const IDS = {
  homeHero: "11111111-1111-4111-8111-111111111111",
  homeAbout: "22222222-2222-4222-8222-222222222222",
  homeContact: "33333333-3333-4333-8333-333333333333",
  aboutTeam: "44444444-4444-4444-8444-444444444444",
  homeHidden: "55555555-5555-4555-8555-555555555555",
};

const flag = (n: string) => process.argv.includes(`--${n}=off`);

async function main() {
  assertSafeDatabase();
  const db = new PrismaClient();
  try {
    const user = await db.user.upsert({
      where: { username: "ld-admin" },
      update: { isActive: true, role: "SUPER_ADMIN" },
      create: {
        username: "ld-admin",
        email: "ld-admin@example.invalid",
        passwordHash: bcrypt.hashSync("ld-test-password", 4),
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });

    // Clean slate for everything this script owns.
    await db.policy.deleteMany({});
    await db.section.deleteMany({});
    await db.page.deleteMany({});
    await db.mediaAsset.deleteMany({});
    await db.galleryCategory.deleteMany({});
    await db.contentEntry.deleteMany({});
    await db.contentType.deleteMany({});
    await db.clientFeature.deleteMany({});
    await db.plugin.deleteMany({});

    const page = (slug: string, title: string, type: any, extra: Record<string, unknown> = {}) =>
      db.page.create({ data: { slug, title, type, status: "PUBLISHED", enabled: true, createdBy: user.id, ...extra } });

    const home = await page("/", "Landing", "LANDING");
    const about = await page("about", "About Us", "FULL_PAGE");
    await page("services-2", "Draft Services", "FULL_PAGE", { status: "DRAFT" });
    await page("old-page", "Old Page", "FULL_PAGE", { enabled: false });
    await page("contact-form", "Contact Us", "FORM", { status: "DRAFT" });
    await page("price-list", "Price List Page", "PDF", { status: "DRAFT" });
    await page("tabby", "Tab Page", "TAB_PAGE");
    await page("designer-x", "Designer Page", "DESIGNER");

    const sec = (id: string, pageId: string, name: string, order: number, extra: Record<string, unknown> = {}) =>
      db.section.create({ data: { id, pageId, type: "FLEXIBLE", displayName: name, order, createdBy: user.id, enabled: true, ...extra } });
    await sec(IDS.homeHero, home.id, "Home Hero", 0, { navLabel: "Welcome" });
    await sec(IDS.homeAbout, home.id, "Home About", 1);
    await sec(IDS.homeContact, home.id, "Home Contact", 2);
    await sec(IDS.homeHidden, home.id, "Hidden Section", 3, { enabled: false });
    await sec(IDS.aboutTeam, about.id, "Meet The Team", 0);

    await db.clientFeature.create({ data: { slug: "coverage-maps", name: "Coverage Maps", enabled: !flag("coverage") } });
    await db.clientFeature.create({ data: { slug: "concrete-calculator", name: "Concrete Calculator", enabled: false } });
    // Deliberately DISAGREE with the ClientFeature row: the Plugin row must NOT open /coverage.
    await db.plugin.create({ data: { slug: "coverage-maps", name: "Coverage Maps", enabled: false, manifest: {} } });
    await db.plugin.create({ data: { slug: "policies", name: "Policies", enabled: !flag("policies"), manifest: {} } });

    const pol = (slug: string, title: string, order: number, extra: Record<string, unknown> = {}) =>
      db.policy.create({ data: { slug, title, body: "<p>x</p>", order, createdBy: user.id, enabled: true, ...extra } });
    await pol("privacy-policy", "Privacy Policy", 1);
    await pol("acceptable-use", "Acceptable Use Policy", 2, { navLabel: "AUP" });
    await pol("terms", "Terms of Service", 3, { enabled: false });

    const media = (filename: string, originalName: string, mimeType: string, n: number) =>
      db.mediaAsset.create({
        data: { filename, originalName, mimeType, fileSize: 2048 * (n + 1), url: `/uploads/${filename}`, uploadedBy: user.id, createdAt: new Date(Date.now() - n * 60000) },
      });
    await media("price-list-2026.pdf", "Price List 2026.pdf", "application/pdf", 0);
    await media("terms-conditions.pdf", "Terms & Conditions.pdf", "application/pdf", 1);
    await media("coverage-brochure.pdf", "Coverage Brochure.pdf", "application/pdf", 2);
    for (let i = 1; i <= 45; i++) await media(`photo-${String(i).padStart(2, "0")}.jpg`, `Site Photo ${String(i).padStart(2, "0")}.jpg`, "image/jpeg", i + 3);
    await media("mast-install.webp", "Mast Install.webp", "image/webp", 60);

    await db.galleryCategory.create({ data: { name: "Projects", slug: "projects", isActive: true, order: 1 } });
    await db.galleryCategory.create({ data: { name: "Archive", slug: "archive", isActive: false, order: 2 } });

    const blog = await db.contentType.create({ data: { slug: "blog", name: "Post", pluralName: "Posts" } });
    await db.contentEntry.create({ data: { contentTypeId: blog.id, slug: "hello-world", title: "Hello World", data: {}, status: "published", publishedAt: new Date(Date.now() - 86400000), authorId: user.id } });
    await db.contentEntry.create({ data: { contentTypeId: blog.id, slug: "unfinished", title: "Unfinished", data: {}, status: "draft", authorId: user.id } });

    console.log(`[link-destinations seed] done (coverage=${flag("coverage") ? "off" : "on"}, policies=${flag("policies") ? "off" : "on"})`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
