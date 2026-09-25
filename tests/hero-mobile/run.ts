/* eslint-disable @typescript-eslint/no-explicit-any -- test tooling: stored section JSON and in-page measurements are untyped by nature */
/**
 * Hero mobile harness — real browser, real public render path (root layout, navbar, PageClient -> DynamicSection -> HeroCarousel).
 *
 * WHAT IT PROVES
 *   assert  (default fixture = synthetic, see fixture.ts) at 375x812 / 390x844 / 430x932:
 *     A1  slide 0 (freeform, NO posMobile): the logo authored at the top of the slide LEADS the mobile stack — it renders above the
 *         first heading row, horizontally centred, and inside the viewport (visible without scrolling)
 *     A2  slide 0: the visible top-to-bottom order equals the design order (ascending desktop pos.y)
 *     A3  all four heading rows resolve to the SAME real fallback generic (no bare `display` token anywhere)
 *     A4  slide 1 (posMobile authored): the logo and every row keep their per-element ABSOLUTE positions (opt-in unchanged)
 *     A5  slide 2 (nothing dragged: eyebrow, rows, subheading, button, undragged image): the old fixed order, no `order` style at all
 *     A6  slide 3 (mixed dragged / undragged): only the dragged elements permute among their own slots
 *   order   prints the visible top-to-bottom order per slide (before/after live-data audit: --fixture <hero-section.json>)
 *   shots   screenshots per viewport x slide, two kinds: `full` (what a visitor sees) and `overlay` (every background layer and the
 *           navbar hidden on a flat black plate, so only the overlay text/logo paints — used for the regression pixel diff)
 *
 * USAGE (a dev server whose DATABASE_URL names a database containing "fidelity"; default http://127.0.0.1:3100):
 *   npx tsx tests/hero-mobile/run.ts assert
 *   npx tsx tests/hero-mobile/run.ts shots --out <dir> [--fixture <hero-section.json>] [--viewport 375x812,1440x900] [--slides 0,1]
 * Env: FIDELITY_BASE_URL, FIDELITY_LIVE_URL (a real site origin — proxies /images/uploads and /uploads so a live-derived fixture shows
 * its real media; .mp4 requests are aborted, videos are never needed).
 * The seeded page slug is `hero-mobile-fixture` (never an `fx-` slug, so the responsive-fidelity seeder never deletes it). Exit 1 on failure.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assertSafeDatabase } from "../responsive-fidelity/seed";
import { heroFixtureSection } from "./fixture";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright") as typeof import("playwright");

const BASE_URL = (process.env.FIDELITY_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const LIVE = (process.env.FIDELITY_LIVE_URL ?? "").replace(/\/$/, "");
const SLUG = "hero-mobile-fixture";

const argv = process.argv.slice(2);
const mode = argv[0] ?? "assert";
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

const MOBILE_VIEWPORTS = ["375x812", "390x844", "430x932"];
const GENERICS = new Set(["sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded"]);

/** Upsert ONE page (slug `hero-mobile-fixture`) holding exactly one HERO section. Touches nothing else. */
async function seedHero(section: any) {
  assertSafeDatabase();
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { username: "fidelity-admin" },
      update: {},
      create: { username: "fidelity-admin", email: "fidelity-admin@example.invalid", passwordHash: bcrypt.hashSync("fidelity-test-password", 4), role: "SUPER_ADMIN", isActive: true },
    });
    const page = await prisma.page.upsert({
      where: { slug: SLUG },
      update: { status: "PUBLISHED", enabled: true },
      create: { slug: SLUG, title: "Hero mobile fixture", type: "FULL_PAGE", status: "PUBLISHED", enabled: true, createdBy: user.id },
    });
    const FIELDS = ["type", "enabled", "displayName", "navLabel", "paddingTop", "paddingBottom", "background", "banner", "bgImageUrl", "bgImageSize", "bgImagePosition", "bgImageRepeat", "bgImageOpacity", "bgParallax", "lowerThird", "motionElements", "paddingBottomMobile", "paddingTopMobile"];
    const data: Record<string, unknown> = {};
    for (const k of FIELDS) if (section[k] !== undefined && section[k] !== null) data[k] = section[k];
    data.content = section.content;
    data.type = "HERO";
    const existing = await prisma.section.findFirst({ where: { pageId: page.id } });
    if (existing) await prisma.section.update({ where: { id: existing.id }, data: data as never });
    else await prisma.section.create({ data: { ...(data as object), pageId: page.id, order: 0, createdBy: user.id } as never });
  } finally {
    await prisma.$disconnect();
  }
}

/** One shared disk cache for proxied third-party responses (fonts CSS/woff2, live media). Key = sha1(url). */
const CACHE_DIR = process.env.HERO_FIXTURE_CACHE ?? path.join(os.tmpdir(), "hero-mobile-cache");
type Cached = { status: number; body: Buffer; type: string };
async function cachedFetch(url: string): Promise<Cached | null> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const key = crypto.createHash("sha1").update(url).digest("hex");
  const meta = path.join(CACHE_DIR, `${key}.json`), bin = path.join(CACHE_DIR, `${key}.bin`);
  if (fs.existsSync(meta) && fs.existsSync(bin)) return { ...JSON.parse(fs.readFileSync(meta, "utf8")), body: fs.readFileSync(bin) };
  try {
    // A desktop Chrome UA so Google Fonts serves the same woff2 (unicode-range subsets) every time.
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" } });
    const body = Buffer.from(await r.arrayBuffer());
    const hit = { status: r.status, type: r.headers.get("content-type") ?? "application/octet-stream" };
    if (r.ok) { fs.writeFileSync(bin, body); fs.writeFileSync(meta, JSON.stringify(hit)); }
    return { ...hit, body };
  } catch { return null; }
}

const parseVp = (s: string) => { const [w, h] = s.split("x").map(Number); return { w, h }; };

async function openPage(browser: any, vp: { w: number; h: number }) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  // tsx (esbuild keepNames) wraps named arrow functions in a `__name` helper that does not exist in the page context.
  await page.addInitScript("window.__name = function (f) { return f; };");
  // Third-party fonts and (optional) live media go through ONE on-disk cache, so every run — baseline or changed code — paints
  // byte-identical font/image data and a diff can only come from the code under test, never from a flaky CDN fetch.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, async (route: any) => {
    const hit = await cachedFetch(route.request().url());
    return hit ? route.fulfill({ status: hit.status, body: hit.body, contentType: hit.type, headers: { "access-control-allow-origin": "*" } }) : route.abort();
  });
  await page.route(/\/(images\/uploads|uploads)\//, async (route: any) => {
    const url = new URL(route.request().url());
    if (!LIVE || url.origin === LIVE) return route.continue();
    if (/\.(mp4|webm)(\?|$)/i.test(url.pathname)) return route.abort();
    const hit = await cachedFetch(`${LIVE}${url.pathname}`);
    return hit ? route.fulfill({ status: hit.status, body: hit.body, contentType: hit.type }) : route.abort();
  });
  await page.goto(`${BASE_URL}/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".hero-carousel", { state: "attached", timeout: 120000 });
  // Stop autoplay so a slide never advances mid-measurement.
  await page.evaluate(() => { (document.querySelector('button[aria-label="Pause slideshow"]') as HTMLElement | null)?.click(); });
  return { ctx, page };
}

async function gotoSlide(page: any, i: number) {
  await page.evaluate((n: number) => { (document.querySelector(`button[aria-label="Go to slide ${n + 1}"]`) as HTMLElement | null)?.click(); }, i);
  // Longest entrance: delay + duration (~1.3s live) + the slide cross-fade; wait for fonts too so runs are comparable.
  await page.waitForTimeout(2600);
  // Every <img> (backgrounds are CSS, but logos are <img>) must be decoded before a shot, or a slow media fetch reads as a diff.
  await page.waitForFunction(() => Array.from(document.images).every((im) => im.complete), undefined, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(700); // entrance animation of a late image (delay + duration)
  await page.evaluate(async () => { try { await document.fonts.ready; } catch { /* ignore */ } });
  await page.waitForTimeout(150);
}

const OVERLAY_CSS = `
  .hero-carousel { background: #000 !important; }
  .hero-carousel > div[style*="z-index: 0"], .hero-carousel video { visibility: hidden !important; }
  nav, header, [class*="navbar"], [id*="navbar"] { visibility: hidden !important; }
`;

// ── assertions ──────────────────────────────────────────────────────────────
interface Check { id: string; pass: boolean; detail: string }

async function measureSlide(page: any) {
  return page.evaluate(() => {
    const hero = document.querySelector(".hero-carousel") as HTMLElement;
    const hr = hero.getBoundingClientRect();
    const r = (el: Element) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2 }; };
    const logo = hero.querySelector("img.hero-freeform-img");
    const rows = Array.from(hero.querySelectorAll("h1.hero-heading"));
    return {
      hero: { top: hr.top, height: hr.height, width: hr.width },
      logo: logo ? { ...r(logo), wrapperPosition: getComputedStyle(logo.parentElement as Element).position } : null,
      rows: rows.map((h) => ({ text: (h.textContent ?? "").trim(), ...r(h), wrapperPosition: getComputedStyle(h.parentElement as Element).position, fontFamily: getComputedStyle(h).fontFamily })),
    };
  });
}

/** Visible top-to-bottom sequence of the hero's overlay elements + whether any stacked wrapper carries an inline `order`. */
async function readSequence(page: any) {
  return page.evaluate(() => {
    const hero = document.querySelector(".hero-carousel") as HTMLElement;
    const items: { label: string; top: number; order: string }[] = [];
    const push = (el: Element, label: string) => items.push({ label, top: el.getBoundingClientRect().top, order: ((el.parentElement as HTMLElement).style.order || "") });
    hero.querySelectorAll("h1.hero-heading").forEach((h) => push(h, (h.textContent ?? "").trim()));
    hero.querySelectorAll("p.hero-subheading").forEach((h) => push(h, (h.textContent ?? "").trim()));
    hero.querySelectorAll("a.btn").forEach((h) => push(h, (h.textContent ?? "").trim()));
    hero.querySelectorAll("img.hero-freeform-img").forEach((h) => push(h, ((h as HTMLImageElement).alt || (h as HTMLImageElement).src.split("/").pop() || "").replace(/-\d{10,}\.\w+$/, "")));
    hero.querySelectorAll("p").forEach((h) => { if (!h.classList.contains("hero-subheading") && /^[A-Z ]{3,}$/.test((h.textContent ?? "").trim()) && getComputedStyle(h).textTransform === "uppercase") push(h, (h.textContent ?? "").trim()); });
    items.sort((a, b) => a.top - b.top);
    return { sequence: items.map((i) => i.label), anyOrder: items.some((i) => i.order !== "") };
  });
}

const lastToken = (ff: string) => ff.split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean).pop() ?? "";

async function runAssert() {
  await seedHero(heroFixtureSection());
  const browser = await chromium.launch();
  const checks: Check[] = [];
  const add = (id: string, pass: boolean, detail: string) => checks.push({ id, pass, detail });
  try {
    for (const vpName of MOBILE_VIEWPORTS) {
      const vp = parseVp(vpName);
      const { ctx, page } = await openPage(browser, vp);
      try {
        // slide 0 — stacked on mobile (no posMobile)
        await gotoSlide(page, 0);
        const m = await measureSlide(page);
        const L = m.logo;
        const first = m.rows[0];
        add(`${vpName} A1 logo leads the stack`, !!L && !!first && L.top < first.top, L ? `logo top ${L.top.toFixed(1)} vs first row top ${first?.top.toFixed(1)}` : "no logo rendered");
        add(`${vpName} A1 logo centred + visible`, !!L && Math.abs(L.cx - vp.w / 2) <= 2 && L.top >= 0 && L.bottom <= vp.h, L ? `cx ${L.cx.toFixed(1)} (vw/2 ${vp.w / 2}), top ${L.top.toFixed(1)}, bottom ${L.bottom.toFixed(1)}, vh ${vp.h}` : "no logo");
        const ordered = [...(L ? [{ n: "LOGO", t: L.top }] : []), ...m.rows.map((r: any) => ({ n: r.text, t: r.top }))].sort((a, b) => a.t - b.t).map((x) => x.n);
        add(`${vpName} A2 design reading order`, ordered.join(">") === "LOGO>FIRST>SECOND ROW>THIRD>FOURTH", ordered.join(" > "));
        const fam = m.rows.map((r: any) => lastToken(r.fontFamily));
        const bare = m.rows.some((r: any) => /(^|,)\s*display\s*(,|$)/i.test(r.fontFamily));
        add(`${vpName} A3 rows share one real generic`, fam.length === 4 && new Set(fam).size === 1 && GENERICS.has(fam[0]) && !bare, `${m.rows.map((r: any) => r.fontFamily).join(" | ")}`);
        // slide 1 — posMobile authored: absolute, unchanged
        await gotoSlide(page, 1);
        const n = await measureSlide(page);
        const allAbs = !!n.logo && n.logo.wrapperPosition === "absolute" && n.rows.length === 4 && n.rows.every((r: any) => r.wrapperPosition === "absolute");
        const expectY = [0.34, 0.44, 0.56, 0.68].map((f) => n.hero.top + f * n.hero.height);
        const yOk = n.rows.length === 4 && n.rows.every((r: any, i: number) => Math.abs(r.cy - expectY[i]) <= 2);
        const logoOk = !!n.logo && Math.abs(n.logo.cy - (n.hero.top + 0.14 * n.hero.height)) <= 2;
        add(`${vpName} A4 posMobile elements stay absolute at their authored y`, allAbs && yOk && logoOk, `wrappers absolute=${allAbs}; rows y ok=${yOk}; logo y ok=${logoOk}`);
        // slide 2 — nothing dragged: exactly the old fixed order, and no `order` style at all
        await gotoSlide(page, 2);
        const q = await readSequence(page);
        add(`${vpName} A5 nothing dragged -> unchanged fixed order, no inline order`, q.sequence.join(">") === "EYEBROW>ALPHA>BETA>Subheading text>Button>Logo" && !q.anyOrder, `${q.sequence.join(" > ")} (any inline order: ${q.anyOrder})`);
        // slide 3 — mixed: only dragged elements permute among their own slots; undragged eyebrow/button keep theirs
        await gotoSlide(page, 3);
        const r = await readSequence(page);
        add(`${vpName} A6 mixed dragged/undragged`, r.sequence.join(">") === "EYEBROW>Logo>BETA>ALPHA>Button>Subheading text", r.sequence.join(" > "));
      } finally { await ctx.close(); }
    }
  } finally { await browser.close(); }
  let failed = 0;
  for (const c of checks) { if (!c.pass) failed++; console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.id}  —  ${c.detail}`); }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

// ── screenshots ─────────────────────────────────────────────────────────────
async function runShots() {
  const out = opt("out");
  if (!out) throw new Error("shots needs --out <dir>");
  fs.mkdirSync(out, { recursive: true });
  const fx = opt("fixture");
  const section = fx ? JSON.parse(fs.readFileSync(fx, "utf8")) : heroFixtureSection();
  await seedHero(section);
  const slideCount = (section.content?.slides ?? []).length;
  const vps = (opt("viewport") ?? MOBILE_VIEWPORTS.join(",")).split(",").filter(Boolean);
  const slides = (opt("slides")?.split(",").map(Number)) ?? Array.from({ length: slideCount }, (_, i) => i);
  const kinds = (opt("kinds") ?? "full,overlay").split(",");
  const browser = await chromium.launch();
  try {
    for (const vpName of vps) {
      const vp = parseVp(vpName);
      const { ctx, page } = await openPage(browser, vp);
      try {
        for (const i of slides) {
          await gotoSlide(page, i);
          // Make sure the display face is loaded, so a diff is never "font loaded vs not".
          await page.evaluate(async () => { try { await document.fonts.load('80px "Archivo Black"'); } catch { /* ignore */ } });
          await page.waitForTimeout(200);
          if (kinds.includes("full")) await page.screenshot({ path: path.join(out, `${vpName}_s${i}_full.png`) });
          if (kinds.includes("overlay")) {
            const h = await page.addStyleTag({ content: OVERLAY_CSS });
            await page.waitForTimeout(150);
            await page.screenshot({ path: path.join(out, `${vpName}_s${i}_overlay.png`) });
            await h.evaluate((el: HTMLElement) => el.remove());
          }
          console.log(`shot ${vpName} slide ${i}`);
        }
      } finally { await ctx.close(); }
    }
  } finally { await browser.close(); }
}

/** Prints the visible top-to-bottom order of every slide at each viewport — used for the before/after live-data audit. */
async function runOrder() {
  const fx = opt("fixture");
  const section = fx ? JSON.parse(fs.readFileSync(fx, "utf8")) : heroFixtureSection();
  await seedHero(section);
  const slideCount = (section.content?.slides ?? []).length;
  const vps = (opt("viewport") ?? "390x844").split(",");
  const browser = await chromium.launch();
  try {
    for (const vpName of vps) {
      const { ctx, page } = await openPage(browser, parseVp(vpName));
      try {
        for (let i = 0; i < slideCount; i++) { await gotoSlide(page, i); const q = await readSequence(page); console.log(`${vpName} slide ${i}: ${q.sequence.join(" > ")}${q.anyOrder ? "   [order styles set]" : ""}`); }
      } finally { await ctx.close(); }
    }
  } finally { await browser.close(); }
}

(async () => {
  if (mode === "order") await runOrder();
  else if (mode === "assert") await runAssert();
  else if (mode === "shots") await runShots();
  else { console.error(`unknown mode ${mode} (assert | shots | order)`); process.exit(2); }
})().catch((e) => { console.error(e); process.exit(1); });
